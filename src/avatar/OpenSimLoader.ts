import { SceneLoader, TransformNode, Vector3 } from '@babylonjs/core';
import type { AbstractMesh, Scene, Skeleton, Bone } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import type { OpenSimStructure, OpenSimMeshPart, MeshPartCategory } from '../types/opensim.js';
import { COLLISION_VOLUME_NAMES, DEFAULT_SHAPE_PARAMS } from '../types/opensim.js';

/**
 * Loads Ruth2/Roth2 OpenSim GLB models, detects the Bento skeleton,
 * classifies bones and meshes, and applies default shape parameters.
 *
 * Replaces VRMAnalyzer for the OpenSim pipeline.
 */
export class OpenSimLoader {
  /**
   * Load and analyze an OpenSim avatar GLB.
   * Applies default shape parameters so the mesh aligns with the skeleton.
   */
  async load(modelPath: string, scene: Scene): Promise<{
    structure: OpenSimStructure;
    meshes: AbstractMesh[];
    skeleton: Skeleton | null;
    root: TransformNode;
  }> {
    // 1. Load GLB
    const lastSlash = modelPath.lastIndexOf('/');
    const rootUrl = lastSlash >= 0 ? modelPath.substring(0, lastSlash + 1) : '';
    const fileName = lastSlash >= 0 ? modelPath.substring(lastSlash + 1) : modelPath;

    const result = await SceneLoader.ImportMeshAsync('', rootUrl, fileName, scene);

    // 2. Parent all root meshes under a single transform
    const root = new TransformNode('avatarRoot', scene);
    for (const mesh of result.meshes) {
      if (!mesh.parent) {
        mesh.parent = root;
      }
    }
    root.position = Vector3.Zero();

    const skeleton = result.skeletons.length > 0 ? result.skeletons[0] : null;

    console.log(
      `[OpenSim] Model loaded: ${fileName} (${result.meshes.length} meshes, ${result.skeletons.length} skeletons)`,
    );

    // 3. Validate this is an OpenSim skeleton
    if (!skeleton) {
      throw new Error('[OpenSim] No skeleton found in GLB — cannot proceed');
    }
    if (!this.isOpenSimSkeleton(skeleton)) {
      throw new Error('[OpenSim] Skeleton does not appear to be OpenSim/SL (missing mPelvis/mTorso/mChest)');
    }

    // 4. Classify bones
    const animationBones = new Map<string, Bone>();
    const collisionVolumes = new Map<string, Bone>();
    const faceBones = new Map<string, Bone>();
    const fingerBones = new Map<string, Bone>();

    for (const bone of skeleton.bones) {
      const name = bone.name;

      if (COLLISION_VOLUME_NAMES.has(name)) {
        collisionVolumes.set(name, bone);
      } else if (name.startsWith('mFace')) {
        faceBones.set(name, bone);
      } else if (this.isFingerBone(name)) {
        fingerBones.set(name, bone);
        animationBones.set(name, bone); // fingers are also animation bones
      } else if (name.startsWith('m') && name[1] === name[1]?.toUpperCase()) {
        // m-prefix with uppercase second char = animation bone (mPelvis, mTorso, etc.)
        animationBones.set(name, bone);
      }
      // Skip eye bones (mEyeLeft/Right), skull, groin, etc. — they're in 'other'
    }

    console.log(
      `[OpenSim] Bones classified: ${animationBones.size} animation, ` +
      `${collisionVolumes.size} collision volumes, ${faceBones.size} face, ` +
      `${fingerBones.size} finger (${skeleton.bones.length} total)`,
    );

    // 5. Apply default shape parameters
    this.applyDefaultShapeParams(skeleton);

    // 6. Classify meshes
    const meshParts = new Map<string, OpenSimMeshPart>();
    for (const mesh of result.meshes) {
      if (mesh.name === '__root__') continue; // skip the glTF root node
      const category = this.classifyMesh(mesh.name);
      meshParts.set(mesh.name, { name: mesh.name, mesh, category });
    }

    // 7. Set default visibility (hide variant meshes)
    this.applyDefaultVisibility(meshParts);

    console.log(`[OpenSim] Mesh parts: ${meshParts.size} classified`);
    for (const [, part] of meshParts) {
      const vis = part.mesh.isVisible ? '' : ' [hidden]';
      console.log(`  "${part.name}" → ${part.category} (${part.mesh.getTotalVertices()} verts)${vis}`);
    }

    // 8. Build structure
    const structure: OpenSimStructure = {
      root,
      skeleton,
      meshes: result.meshes,
      meshParts,
      animationBones,
      collisionVolumes,
      faceBones,
      fingerBones,
      boneCount: skeleton.bones.length,
    };

    return { structure, meshes: result.meshes, skeleton, root };
  }

  /**
   * Detect OpenSim skeleton by presence of key SL bone names.
   * Matches Animator's BoneMapper detection: at least 2 of mPelvis/mTorso/mChest/mCollarLeft/mNeck.
   */
  private isOpenSimSkeleton(skeleton: Skeleton): boolean {
    const boneNames = new Set(skeleton.bones.map((b) => b.name));
    const slBones = ['mPelvis', 'mTorso', 'mChest', 'mCollarLeft', 'mNeck'];
    const matches = slBones.filter((name) => boneNames.has(name));
    return matches.length >= 2;
  }

  /**
   * Check if a bone name is a finger bone.
   * Pattern: mHandThumb1Left, mHandIndex2Right, etc.
   */
  private isFingerBone(name: string): boolean {
    return /^mHand(Thumb|Index|Middle|Ring|Pinky)\d(Left|Right)$/.test(name);
  }

  /**
   * Classify a mesh into a body region based on its name.
   * Ruth2/Roth2 use descriptive mesh names (Body, Head, Eyes, etc.)
   */
  private classifyMesh(name: string): MeshPartCategory {
    const lower = name.toLowerCase();

    if (lower.includes('eye')) return 'eyes';
    if (lower.includes('head') || lower.includes('face')) return 'head';
    if (lower.includes('nail') || lower.includes('fingernail') || lower.includes('toenail')) return 'nails';
    if (lower.includes('hand')) return 'hands';
    if (lower.includes('feet') || lower.includes('foot')) return 'feet';
    if (lower.includes('hair')) return 'hair';
    if (lower.includes('body') || lower.includes('torso') || lower.includes('upper') || lower.includes('lower')) return 'body';

    return 'other';
  }

  /**
   * Hide variant meshes, showing only the default set.
   * Ruth2 ships with multiple foot heights, fingernail styles, and body variants.
   * Only one of each should be visible at a time.
   */
  private applyDefaultVisibility(meshParts: Map<string, OpenSimMeshPart>): void {
    // Meshes to show by default (prefixes). Everything else in the same category gets hidden.
    const defaultMeshes = new Set([
      'Ruth2v4Body',         // main body (not BusinessBody)
      'Ruth2v4Head',
      'Ruth2v4Hands',
      'Ruth2v4FeetFlat',     // flat feet (not High/Medium)
      'Ruth2v4FeetFlatToenails',
      'Ruth2v4FingernailsShort', // short nails (not Long/Med/Oval/Pointed)
      'Ruth2v4EyeBall',
      'Ruth2v4Eyeball',      // case varies between L/R in the GLB
      'Ruth2v4Eyelashes',
      // Roth2 equivalents (same pattern when we add male)
      'Roth2',
    ]);

    let hidden = 0;
    for (const [, part] of meshParts) {
      const baseName = part.name.replace(/_primitive\d+$/, '');
      const isDefault = [...defaultMeshes].some((prefix) => baseName.startsWith(prefix));

      if (!isDefault) {
        part.mesh.isVisible = false;
        hidden++;
      }
    }

    console.log(`[OpenSim] Visibility: ${meshParts.size - hidden} visible, ${hidden} hidden (variants)`);
  }

  /**
   * Apply SL default shape parameters to the skeleton.
   *
   * Ruth2/Roth2 were modeled with these defaults already applied to the mesh,
   * but the raw skeleton in the GLB doesn't have them. Without this adjustment,
   * the arms are ~6.7cm too short at the wrists.
   *
   * From Firestorm's LLPolySkeletalDistortion::apply() and Animator's ADR-010.
   */
  private applyDefaultShapeParams(skeleton: Skeleton): void {
    const { armLength, shoulders } = DEFAULT_SHAPE_PARAMS;
    let adjustments = 0;

    // Arm length: extend elbow and wrist positions
    for (const side of ['Left', 'Right'] as const) {
      const elbow = skeleton.bones.find((b) => b.name === `mElbow${side}`);
      const wrist = skeleton.bones.find((b) => b.name === `mWrist${side}`);
      const collar = skeleton.bones.find((b) => b.name === `mCollar${side}`);

      if (elbow) {
        const pos = elbow.getPosition(0); // local space
        pos.scaleInPlace(armLength.elbowExtend);
        elbow.setPosition(pos, 0);
        adjustments++;
      }

      if (wrist) {
        const pos = wrist.getPosition(0);
        pos.scaleInPlace(armLength.wristExtend);
        wrist.setPosition(pos, 0);
        adjustments++;
      }

      // Shoulders: offset collar Y position
      if (collar) {
        const pos = collar.getPosition(0);
        pos.y += shoulders.collarOffsetY;
        collar.setPosition(pos, 0);
        adjustments++;
      }
    }

    // Force Babylon.js to recompute world matrices with new bone positions.
    // In Babylon.js, bones compute their world matrices from local transforms,
    // so we need to force a full refresh.
    for (const bone of skeleton.bones) {
      bone.computeWorldMatrix(true);
    }

    console.log(
      `[OpenSim] Default shape params applied (${adjustments} bone adjustments): ` +
      `arm length ×${armLength.elbowExtend}/${armLength.wristExtend}, ` +
      `shoulder offset ${shoulders.collarOffsetY}`,
    );
  }
}
