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
      const sliderValue = this.values.get(param.id) ?? param.defaultValue;
      const t = sliderValue / 100;

      for (const driver of param.drivers) {
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

function getCategorySection(param: ShapeParameterDef): string {
  if (param.category.startsWith('face_')) return 'face';
  return 'body';
}

// Re-export for convenience
export { SHAPE_PARAMETERS, SHAPE_PRESETS, CATEGORY_GROUPS };
export type { ShapeParameterDef, ShapePreset, ShapeCategory };
