import type { AbstractMesh, Bone, Skeleton, TransformNode } from '@babylonjs/core';

// ---------------------------------------------------------------------------
// OpenSim skeleton classification
// ---------------------------------------------------------------------------

/** Bone categories in the SL Bento skeleton */
export type BoneCategory = 'animation' | 'collision_volume' | 'face' | 'finger' | 'other';

/** Classification of a single bone */
export interface BoneInfo {
  bone: Bone;
  name: string;
  category: BoneCategory;
}

// ---------------------------------------------------------------------------
// Mesh part classification
// ---------------------------------------------------------------------------

/** Body region categories for Ruth2/Roth2 sub-meshes */
export type MeshPartCategory =
  | 'body'
  | 'head'
  | 'eyes'
  | 'hands'
  | 'feet'
  | 'nails'
  | 'hair'
  | 'other';

/** A classified sub-mesh of the OpenSim avatar */
export interface OpenSimMeshPart {
  name: string;
  mesh: AbstractMesh;
  category: MeshPartCategory;
}

// ---------------------------------------------------------------------------
// OpenSim structure (returned by OpenSimLoader)
// ---------------------------------------------------------------------------

/** Complete structural analysis of a loaded OpenSim avatar */
export interface OpenSimStructure {
  /** Root transform node parenting all meshes */
  root: TransformNode;
  /** The Bento skeleton */
  skeleton: Skeleton;
  /** All meshes in the loaded model */
  meshes: AbstractMesh[];
  /** Classified sub-meshes by name */
  meshParts: Map<string, OpenSimMeshPart>;
  /** Animation bones (mPelvis, mTorso, etc.) */
  animationBones: Map<string, Bone>;
  /** Collision volume bones (PELVIS, CHEST, BELLY, etc.) */
  collisionVolumes: Map<string, Bone>;
  /** Bento face bones (mFaceRoot, mFaceJaw, etc.) */
  faceBones: Map<string, Bone>;
  /** Finger bones (mHandThumb1Left, etc.) */
  fingerBones: Map<string, Bone>;
  /** Total bone count */
  boneCount: number;
}

// ---------------------------------------------------------------------------
// Collision volume names (ALL_CAPS convention)
// ---------------------------------------------------------------------------

/** The 26 standard SL collision volume bone names */
export const COLLISION_VOLUME_NAMES = new Set([
  'PELVIS', 'BUTT', 'BELLY', 'CHEST', 'LEFT_PEC', 'RIGHT_PEC',
  'UPPER_BACK', 'LOWER_BACK', 'NECK', 'HEAD',
  'L_CLAVICLE', 'L_UPPER_ARM', 'L_LOWER_ARM', 'L_HAND',
  'R_CLAVICLE', 'R_UPPER_ARM', 'R_LOWER_ARM', 'R_HAND',
  'L_UPPER_LEG', 'L_LOWER_LEG', 'L_FOOT',
  'R_UPPER_LEG', 'R_LOWER_LEG', 'R_FOOT',
  'LEFT_HANDLE', 'RIGHT_HANDLE',
]);

// ---------------------------------------------------------------------------
// Default shape parameters (from avatar_lad.xml)
// ---------------------------------------------------------------------------

/** Shape parameters that must be applied at load time.
 *  Without these, the mesh misaligns with the skeleton by ~6.7cm at the wrists.
 *  Values from Firestorm's implementation (ADR-010 in Animator). */
export const DEFAULT_SHAPE_PARAMS = {
  /** SL param 693 — default 0.6 */
  armLength: {
    default: 0.6,
    /** Multiplier for mElbow position: 1.0 + (default * 0.2) = 1.12 */
    elbowExtend: 1.12,
    /** Multiplier for mWrist position: 1.0 + (default * 0.3) = 1.18 */
    wristExtend: 1.18,
  },
  /** SL param 36 — default -0.5 */
  shoulders: {
    default: -0.5,
    /** Y offset for mCollar bones: default * 0.02 = -0.01 */
    collarOffsetY: -0.01,
  },
} as const;
