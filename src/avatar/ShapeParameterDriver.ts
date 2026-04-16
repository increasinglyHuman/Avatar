/**
 * ShapeParameterDriver — Runtime engine for OpenSim shape parameters.
 * Depends on: Babylon.js Skeleton/TransformNode, ShapeParameterDefinitions (param data)
 * Depended on by: ShapeSliderPanel (UI), ManifestSerializer (outfit save/load),
 *   ShapeStore (shape persistence), BodyTab (gender switching)
 *
 * Maps slider values (0–100) to bone scale/position deltas using the SL formula:
 *   bone.scale = base(1,1,1) + SUM(param_value * delta_scale)
 *   bone.position = rest_position + SUM(param_value * delta_position)
 *
 * Symmetry split system: symmetric params (those with Left/Right or L_/R_ bone pairs)
 * can be split into independent L/R values for asymmetric editing. Split state lives
 * in-memory only — serialization (ShapeStore, ManifestSerializer) saves unified values.
 */
import type { Skeleton, TransformNode } from '@babylonjs/core';
import { Vector3 } from '@babylonjs/core';
import {
  SHAPE_PARAMETERS,
  SHAPE_PRESETS,
  CATEGORY_GROUPS,
} from './ShapeParameterDefinitions.js';
import type { ShapeParameterDef, ShapePreset, ShapeCategory } from './ShapeParameterDefinitions.js';

/**
 * Runtime engine for OpenSim shape parameters.
 * Maps slider values (0–100) to bone scale/position deltas.
 *
 * CRITICAL BABYLON.JS GOTCHA (from World GOTCHA_BOOK G-031+):
 * GLB bones have linked TransformNodes. GPU bone computation overrides
 * CPU-side bone.position/scaling changes each frame. You MUST manipulate
 * the linked TransformNode via bone.getTransformNode(), not the bone directly.
 */
export class ShapeParameterDriver {
  private skeleton: Skeleton;
  private values: Map<string, number> = new Map();

  /** Linked TransformNodes for each bone (the actual thing we manipulate) */
  private boneNodes: Map<string, TransformNode> = new Map();

  /** Rest-pose positions captured from TransformNodes at init */
  private restPositions: Map<string, Vector3> = new Map();

  /**
   * Symmetry splits: when a param is unlinked, its L/R sides get independent values.
   * Key = original param id, Value = { left, right } slider values (0-100).
   * When a param is in this map, its entry in `values` is ignored during applyAll().
   */
  private splits: Map<string, { left: number; right: number }> = new Map();

  /** Callback fired when any parameter changes */
  private onChange: (() => void) | null = null;

  constructor(skeleton: Skeleton) {
    this.skeleton = skeleton;

    // Cache linked TransformNodes and capture rest positions
    let linked = 0;
    for (const bone of skeleton.bones) {
      const node = bone.getTransformNode();
      if (node) {
        this.boneNodes.set(bone.name, node);
        this.restPositions.set(bone.name, node.position.clone());
        linked++;
      }
    }

    console.log(
      `[ShapeDriver] Initialized: ${linked}/${skeleton.bones.length} bones have linked TransformNodes`,
    );

    // Initialize all parameters to their default values
    for (const param of SHAPE_PARAMETERS) {
      this.values.set(param.id, param.defaultValue);
    }
  }

  /** Register a callback for when parameters change */
  setOnChange(cb: () => void): void {
    this.onChange = cb;
  }

  /** Get current value of a parameter (0–100) */
  getValue(paramId: string): number {
    return this.values.get(paramId) ?? 50;
  }

  /** Get all current values */
  getAllValues(): Map<string, number> {
    return new Map(this.values);
  }

  /**
   * Set a single parameter value and recompute all bone transforms.
   */
  setValue(paramId: string, value: number): void {
    const clamped = Math.max(0, Math.min(100, value));
    this.values.set(paramId, clamped);
    this.applyAll();
    this.onChange?.();
  }

  /**
   * Set multiple parameter values at once (e.g., for presets).
   */
  setValues(values: Record<string, number>): void {
    for (const [id, value] of Object.entries(values)) {
      this.values.set(id, Math.max(0, Math.min(100, value)));
    }
    this.applyAll();
    this.onChange?.();
  }

  /**
   * Apply a named preset. Resets all parameters in the preset's section
   * to their defaults first, then applies preset values.
   */
  applyPreset(preset: ShapePreset): void {
    for (const param of SHAPE_PARAMETERS) {
      const section = getCategorySection(param);
      if (section === preset.section) {
        this.values.set(param.id, param.defaultValue);
      }
    }
    for (const [id, value] of Object.entries(preset.values)) {
      this.values.set(id, value);
    }
    this.applyAll();
    this.onChange?.();
  }

  /** Reset all parameters to defaults */
  resetAll(): void {
    for (const param of SHAPE_PARAMETERS) {
      this.values.set(param.id, param.defaultValue);
    }
    this.splits.clear();
    this.applyAll();
    this.onChange?.();
  }

  // ---------------------------------------------------------------------------
  // Symmetry split API
  // ---------------------------------------------------------------------------

  /** Check if a parameter has L/R paired drivers (and thus can be split) */
  isSymmetric(paramId: string): boolean {
    const param = SHAPE_PARAMETERS.find((p) => p.id === paramId);
    if (!param) return false;
    const hasLeft = param.drivers.some((d) => isLeftBone(d.bone));
    const hasRight = param.drivers.some((d) => isRightBone(d.bone));
    return hasLeft && hasRight;
  }

  /** Split a symmetric param into independent L/R values. */
  splitParam(paramId: string): void {
    if (this.splits.has(paramId)) return;
    const currentVal = this.values.get(paramId) ?? 50;
    this.splits.set(paramId, { left: currentVal, right: currentVal });
    this.applyAll();
    this.onChange?.();
  }

  /** Re-link a split param. Uses the average of L/R as the new unified value. */
  unsplitParam(paramId: string): void {
    const split = this.splits.get(paramId);
    if (!split) return;
    const avg = Math.round((split.left + split.right) / 2);
    this.values.set(paramId, avg);
    this.splits.delete(paramId);
    this.applyAll();
    this.onChange?.();
  }

  /** Check if a param is currently split */
  isSplit(paramId: string): boolean {
    return this.splits.has(paramId);
  }

  /** Get the L/R values for a split param */
  getSplitValues(paramId: string): { left: number; right: number } | null {
    return this.splits.get(paramId) ?? null;
  }

  /** Set one side of a split param */
  setSplitValue(paramId: string, side: 'left' | 'right', value: number): void {
    const split = this.splits.get(paramId);
    if (!split) return;
    split[side] = Math.max(0, Math.min(100, value));
    this.applyAll();
    this.onChange?.();
  }

  /**
   * Core: recompute all bone transforms from current parameter values.
   *
   * Applies to linked TransformNodes (NOT bones directly) because
   * Babylon.js GPU bone computation overwrites CPU bone properties each frame.
   */
  private applyAll(): void {
    // 1. Accumulate deltas per bone name
    const scaleDeltas = new Map<string, Vector3>();
    const positionDeltas = new Map<string, Vector3>();

    for (const param of SHAPE_PARAMETERS) {
      const split = this.splits.get(param.id);

      for (const driver of param.drivers) {
        // Determine slider value: split params use per-side values
        let sliderValue: number;
        if (split) {
          const boneIsLeft = isLeftBone(driver.bone);
          const boneIsRight = isRightBone(driver.bone);
          if (boneIsLeft) {
            sliderValue = split.left;
          } else if (boneIsRight) {
            sliderValue = split.right;
          } else {
            // Center bone in a split param — use average
            sliderValue = (split.left + split.right) / 2;
          }
        } else {
          sliderValue = this.values.get(param.id) ?? param.defaultValue;
        }

        const t = sliderValue / 100;
        const delta = lerp(driver.range[0], driver.range[1], t);
        if (Math.abs(delta) < 0.0001) continue;

        if (driver.property === 'scale') {
          const acc = getOrCreate(scaleDeltas, driver.bone);
          addToAxis(acc, driver.axis, delta);
        } else {
          const acc = getOrCreate(positionDeltas, driver.bone);
          addToAxis(acc, driver.axis, delta);
        }
      }
    }

    // 2. Apply to linked TransformNodes
    for (const bone of this.skeleton.bones) {
      const name = bone.name;
      const node = this.boneNodes.get(name);
      if (!node) continue;

      // Scale: base (1,1,1) + accumulated deltas
      const sd = scaleDeltas.get(name);
      if (sd) {
        node.scaling.x = 1 + sd.x;
        node.scaling.y = 1 + sd.y;
        node.scaling.z = 1 + sd.z;
      } else {
        // Reset to identity if previously modified
        const s = node.scaling;
        if (Math.abs(s.x - 1) > 0.001 || Math.abs(s.y - 1) > 0.001 || Math.abs(s.z - 1) > 0.001) {
          node.scaling.x = 1;
          node.scaling.y = 1;
          node.scaling.z = 1;
        }
      }

      // Position: rest position + accumulated deltas
      const pd = positionDeltas.get(name);
      const rest = this.restPositions.get(name);
      if (pd && rest) {
        node.position.x = rest.x + pd.x;
        node.position.y = rest.y + pd.y;
        node.position.z = rest.z + pd.z;
      } else if (rest) {
        const p = node.position;
        if (Math.abs(p.x - rest.x) > 0.0001 || Math.abs(p.y - rest.y) > 0.0001 || Math.abs(p.z - rest.z) > 0.0001) {
          node.position.copyFrom(rest);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getOrCreate(map: Map<string, Vector3>, key: string): Vector3 {
  let v = map.get(key);
  if (!v) {
    v = Vector3.Zero();
    map.set(key, v);
  }
  return v;
}

function addToAxis(vec: Vector3, axis: 'x' | 'y' | 'z', value: number): void {
  if (axis === 'x') vec.x += value;
  else if (axis === 'y') vec.y += value;
  else vec.z += value;
}

/**
 * Bone-side detection for symmetry splitting.
 * Two naming conventions in the Bento skeleton:
 *   - Animation bones: suffix 'Left'/'Right' (e.g., mEyeLeft, mFaceEyebrowOuterRight)
 *   - CV (Collision Volume) bones: prefix 'L_'/'R_' (e.g., L_UPPER_ARM, R_FOOT)
 * Bones matching neither pattern are center bones (mFaceRoot, BELLY, mChest).
 * When a param is split, center bones use the average of L/R values.
 */
function isLeftBone(name: string): boolean {
  return name.endsWith('Left') || name.startsWith('L_');
}

function isRightBone(name: string): boolean {
  return name.endsWith('Right') || name.startsWith('R_');
}

function getCategorySection(param: ShapeParameterDef): string {
  if (param.category.startsWith('face_')) return 'face';
  return 'body';
}

// Re-export for convenience
export { SHAPE_PARAMETERS, SHAPE_PRESETS, CATEGORY_GROUPS };
export type { ShapeParameterDef, ShapePreset, ShapeCategory };
