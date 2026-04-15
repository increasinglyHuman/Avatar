/**
 * Static shape parameter definitions extracted from SL's avatar_lad.xml.
 * Phase 1: ~55 bone-driven parameters (body + face).
 *
 * Each parameter defines which bones to modify and how, using the SL formula:
 *   bone.scale = base(1,1,1) + SUM(param_value * delta_scale)
 *   bone.position = rest_position + SUM(param_value * delta_position)
 *
 * UI value range is 0–100 (mapped from SL's internal float range).
 * Default of 50 means "no change from default body".
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ShapeCategory =
  | 'body'
  | 'torso'
  | 'arms'
  | 'legs'
  | 'details'
  | 'face_structure'
  | 'face_nose'
  | 'face_eyes'
  | 'face_mouth';

export interface BoneDriver {
  /** Bone name in the Bento skeleton (e.g., "mPelvis", "CHEST", "mFaceJaw") */
  bone: string;
  /** Which transform property to modify */
  property: 'scale' | 'position';
  /** Which axis */
  axis: 'x' | 'y' | 'z';
  /**
   * Delta range: [deltaAtMin, deltaAtMax].
   * At slider 0 (min), bone gets += deltaAtMin.
   * At slider 100 (max), bone gets += deltaAtMax.
   * At slider 50 (default), bone gets += midpoint (usually 0).
   */
  range: [number, number];
}

export interface ShapeParameterDef {
  id: string;
  label: string;
  category: ShapeCategory;
  /** Default slider position (0–100). 50 = neutral for most params. */
  defaultValue: number;
  drivers: BoneDriver[];
  /** If true, shown in Simple Mode (ADR-017). All params shown in Detail Mode. */
  essential?: boolean;
  /** Alternative label when masculine avatar is active. If null/undefined, use label. */
  masculineLabel?: string | null;
  /** If true, hide this parameter entirely on masculine avatars. */
  hideOnMasculine?: boolean;
}

// ---------------------------------------------------------------------------
// Category display metadata
// ---------------------------------------------------------------------------

export type SectionId = 'body' | 'face';

export interface CategoryGroup {
  id: ShapeCategory;
  label: string;
  section: SectionId;
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  // Body section
  { id: 'body',           label: 'Body',            section: 'body' },
  { id: 'torso',          label: 'Torso',           section: 'body' },
  { id: 'arms',           label: 'Arms',            section: 'body' },
  { id: 'legs',           label: 'Legs',            section: 'body' },
  { id: 'details',        label: 'Details',         section: 'body' },
  // Face section
  { id: 'face_structure', label: 'Jaw & Chin',      section: 'face' },
  { id: 'face_nose',      label: 'Nose',            section: 'face' },
  { id: 'face_eyes',      label: 'Eyes, Brows & Forehead', section: 'face' },
  { id: 'face_mouth',     label: 'Mouth',            section: 'face' },
];

// ---------------------------------------------------------------------------
// Helper: create symmetric left/right drivers
// ---------------------------------------------------------------------------

function symmetric(
  boneBase: string,
  property: 'scale' | 'position',
  axis: 'x' | 'y' | 'z',
  range: [number, number],
): BoneDriver[] {
  return [
    { bone: `${boneBase}Left`, property, axis, range },
    { bone: `${boneBase}Right`, property, axis, range },
  ];
}

function symmetricCV(
  prefix: string,
  property: 'scale' | 'position',
  axis: 'x' | 'y' | 'z',
  range: [number, number],
): BoneDriver[] {
  return [
    { bone: `L_${prefix}`, property, axis, range },
    { bone: `R_${prefix}`, property, axis, range },
  ];
}

// ---------------------------------------------------------------------------
// Parameter definitions (~55 total)
// ---------------------------------------------------------------------------

export const SHAPE_PARAMETERS: ShapeParameterDef[] = [
  // =========================================================================
  // BODY (7 params)
  // =========================================================================
  {
    id: 'height',
    label: 'Height',
    category: 'body',
    defaultValue: 50,
    essential: true,
    drivers: [
      // SL param 33: scales bones along their length axis proportionally.
      // SL uses Z-up, our skeleton uses Y for bone length (matches leg_length/torso_length).
      // Spine chain — Y is the length axis
      { bone: 'mNeck',   property: 'scale', axis: 'y', range: [-0.046, 0.04] },
      { bone: 'mChest',  property: 'scale', axis: 'y', range: [-0.115, 0.1] },
      { bone: 'mTorso',  property: 'scale', axis: 'y', range: [-0.115, 0.1] },
      // Legs (largest contribution — 0.1 factor)
      { bone: 'mHipLeft',   property: 'scale', axis: 'y', range: [-0.23, 0.2] },
      { bone: 'mHipRight',  property: 'scale', axis: 'y', range: [-0.23, 0.2] },
      { bone: 'mKneeLeft',  property: 'scale', axis: 'y', range: [-0.23, 0.2] },
      { bone: 'mKneeRight', property: 'scale', axis: 'y', range: [-0.23, 0.2] },
      // Arms — Y is also the length axis for arm bones
      { bone: 'mShoulderLeft',  property: 'scale', axis: 'y', range: [-0.1, 0.08] },
      { bone: 'mShoulderRight', property: 'scale', axis: 'y', range: [-0.1, 0.08] },
      { bone: 'mElbowLeft',  property: 'scale', axis: 'y', range: [-0.08, 0.06] },
      { bone: 'mElbowRight', property: 'scale', axis: 'y', range: [-0.08, 0.06] },
    ],
  },
  {
    id: 'body_thickness',
    label: 'Body Thickness',
    category: 'body',
    defaultValue: 50,
    essential: true,
    drivers: [
      { bone: 'mChest', property: 'scale', axis: 'x', range: [-0.15, 0.15] },
      { bone: 'mChest', property: 'scale', axis: 'z', range: [-0.1, 0.1] },
      { bone: 'mTorso', property: 'scale', axis: 'x', range: [-0.12, 0.12] },
      { bone: 'mTorso', property: 'scale', axis: 'z', range: [-0.08, 0.08] },
    ],
  },
  {
    id: 'body_fat',
    label: 'Body Fat',
    category: 'body',
    defaultValue: 30,
    essential: true,
    drivers: [
      { bone: 'BELLY', property: 'scale', axis: 'x', range: [-0.1, 0.25] },
      { bone: 'BELLY', property: 'scale', axis: 'y', range: [-0.05, 0.15] },
      { bone: 'BELLY', property: 'scale', axis: 'z', range: [-0.1, 0.25] },
      { bone: 'PELVIS', property: 'scale', axis: 'x', range: [-0.05, 0.12] },
      { bone: 'BUTT', property: 'scale', axis: 'z', range: [-0.05, 0.15] },
      ...symmetricCV('UPPER_LEG', 'scale', 'x', [-0.03, 0.08]),
    ],
  },
  {
    id: 'shoulder_width',
    label: 'Shoulder Width',
    category: 'body',
    defaultValue: 50,
    drivers: [
      // Widened + added chest scale for more visible shoulder breadth change
      { bone: 'mCollarLeft', property: 'position', axis: 'x', range: [-0.04, 0.04] },
      { bone: 'mCollarRight', property: 'position', axis: 'x', range: [0.04, -0.04] },
      { bone: 'mChest', property: 'scale', axis: 'x', range: [-0.06, 0.06] },
    ],
  },
  {
    id: 'hip_width',
    label: 'Hip Width',
    category: 'body',
    defaultValue: 50,
    drivers: [
      // SL param 37: pelvis X-scale (width) + hip offsets
      // Widened from ±0.12 to match SL's dramatic range
      { bone: 'PELVIS', property: 'scale', axis: 'x', range: [-0.25, 0.25] },
      { bone: 'mHipLeft', property: 'position', axis: 'x', range: [0.012, -0.012] },
      { bone: 'mHipRight', property: 'position', axis: 'x', range: [-0.012, 0.012] },
    ],
  },
  {
    id: 'torso_muscle',
    label: 'Torso Muscle',
    category: 'body',
    defaultValue: 40,
    drivers: [
      { bone: 'CHEST', property: 'scale', axis: 'x', range: [-0.08, 0.12] },
      { bone: 'CHEST', property: 'scale', axis: 'z', range: [-0.05, 0.08] },
      { bone: 'UPPER_BACK', property: 'scale', axis: 'x', range: [-0.05, 0.1] },
      { bone: 'UPPER_BACK', property: 'scale', axis: 'z', range: [-0.04, 0.08] },
    ],
  },
  {
    id: 'body_taper',
    label: 'Body Taper',
    category: 'body',
    defaultValue: 50,
    drivers: [
      { bone: 'mChest', property: 'scale', axis: 'x', range: [-0.08, 0.08] },
      { bone: 'PELVIS', property: 'scale', axis: 'x', range: [0.06, -0.06] },
    ],
  },

  // =========================================================================
  // TORSO (7 params)
  // =========================================================================
  {
    id: 'torso_length',
    label: 'Torso Length',
    category: 'torso',
    defaultValue: 50,
    essential: true,
    drivers: [
      { bone: 'mTorso', property: 'scale', axis: 'y', range: [-0.1, 0.1] },
    ],
  },
  {
    id: 'breast_size',
    label: 'Breast Size',
    masculineLabel: 'Pec Size',
    category: 'torso',
    defaultValue: 40,
    essential: true,
    drivers: [
      // 50% increase over previous — matching SL's dramatic breast morph range
      { bone: 'LEFT_PEC', property: 'scale', axis: 'x', range: [-0.3, 0.9] },
      { bone: 'LEFT_PEC', property: 'scale', axis: 'y', range: [-0.3, 0.9] },
      { bone: 'LEFT_PEC', property: 'scale', axis: 'z', range: [-0.3, 1.2] },
      { bone: 'RIGHT_PEC', property: 'scale', axis: 'x', range: [-0.3, 0.9] },
      { bone: 'RIGHT_PEC', property: 'scale', axis: 'y', range: [-0.3, 0.9] },
      { bone: 'RIGHT_PEC', property: 'scale', axis: 'z', range: [-0.3, 1.2] },
    ],
  },
  {
    id: 'breast_gravity',
    label: 'Breast Gravity',
    hideOnMasculine: true,
    category: 'torso',
    defaultValue: 50,
    drivers: [
      { bone: 'LEFT_PEC', property: 'position', axis: 'y', range: [0.015, -0.015] },
      { bone: 'RIGHT_PEC', property: 'position', axis: 'y', range: [0.015, -0.015] },
    ],
  },
  {
    id: 'breast_cleavage',
    label: 'Breast Cleavage',
    hideOnMasculine: true,
    category: 'torso',
    defaultValue: 50,
    drivers: [
      { bone: 'LEFT_PEC', property: 'position', axis: 'x', range: [0.012, -0.012] },
      { bone: 'RIGHT_PEC', property: 'position', axis: 'x', range: [-0.012, 0.012] },
    ],
  },
  {
    id: 'belly_size',
    label: 'Belly Size',
    category: 'torso',
    defaultValue: 25,
    essential: true,
    drivers: [
      // Widened for more dramatic belly range
      { bone: 'BELLY', property: 'scale', axis: 'x', range: [-0.1, 0.35] },
      { bone: 'BELLY', property: 'scale', axis: 'y', range: [-0.05, 0.2] },
      { bone: 'BELLY', property: 'scale', axis: 'z', range: [-0.1, 0.4] },
    ],
  },
  {
    id: 'chest_width',
    label: 'Chest Width',
    category: 'torso',
    defaultValue: 50,
    drivers: [
      { bone: 'mChest', property: 'scale', axis: 'x', range: [-0.1, 0.1] },
    ],
  },
  {
    id: 'waist_width',
    label: 'Waist Width',
    category: 'torso',
    defaultValue: 50,
    drivers: [
      { bone: 'mTorso', property: 'scale', axis: 'x', range: [-0.08, 0.08] },
    ],
  },

  // =========================================================================
  // ARMS (5 params)
  // =========================================================================
  {
    id: 'arm_length',
    label: 'Arm Length',
    category: 'arms',
    defaultValue: 50,
    essential: true,
    drivers: [
      ...symmetric('mShoulder', 'scale', 'y', [-0.08, 0.08]),
      ...symmetric('mElbow', 'scale', 'y', [-0.08, 0.08]),
    ],
  },
  {
    id: 'upper_arm_thickness',
    label: 'Upper Arm',
    category: 'arms',
    defaultValue: 50,
    drivers: [
      ...symmetricCV('UPPER_ARM', 'scale', 'x', [-0.1, 0.1]),
      ...symmetricCV('UPPER_ARM', 'scale', 'z', [-0.1, 0.1]),
    ],
  },
  {
    id: 'forearm_thickness',
    label: 'Forearm',
    category: 'arms',
    defaultValue: 50,
    drivers: [
      ...symmetricCV('LOWER_ARM', 'scale', 'x', [-0.1, 0.1]),
      ...symmetricCV('LOWER_ARM', 'scale', 'z', [-0.1, 0.1]),
    ],
  },
  {
    id: 'hand_size',
    label: 'Hand Size',
    category: 'arms',
    defaultValue: 50,
    essential: true,
    drivers: [
      ...symmetricCV('HAND', 'scale', 'x', [-0.1, 0.1]),
      ...symmetricCV('HAND', 'scale', 'y', [-0.1, 0.1]),
      ...symmetricCV('HAND', 'scale', 'z', [-0.1, 0.1]),
    ],
  },
  {
    id: 'shoulder_angle',
    label: 'Shoulder Drop',
    category: 'arms',
    defaultValue: 50,
    drivers: [
      { bone: 'mCollarLeft', property: 'position', axis: 'y', range: [0.01, -0.01] },
      { bone: 'mCollarRight', property: 'position', axis: 'y', range: [0.01, -0.01] },
    ],
  },

  // =========================================================================
  // LEGS (7 params)
  // =========================================================================
  {
    id: 'leg_length',
    label: 'Leg Length',
    category: 'legs',
    defaultValue: 50,
    essential: true,
    drivers: [
      ...symmetric('mHip', 'scale', 'y', [-0.08, 0.08]),
      ...symmetric('mKnee', 'scale', 'y', [-0.08, 0.08]),
    ],
  },
  {
    id: 'upper_leg_thickness',
    label: 'Upper Leg',
    category: 'legs',
    defaultValue: 50,
    essential: true,
    drivers: [
      ...symmetricCV('UPPER_LEG', 'scale', 'x', [-0.1, 0.12]),
      ...symmetricCV('UPPER_LEG', 'scale', 'z', [-0.08, 0.1]),
    ],
  },
  {
    id: 'lower_leg_thickness',
    label: 'Lower Leg',
    category: 'legs',
    defaultValue: 50,
    drivers: [
      ...symmetricCV('LOWER_LEG', 'scale', 'x', [-0.08, 0.1]),
      ...symmetricCV('LOWER_LEG', 'scale', 'z', [-0.08, 0.1]),
    ],
  },
  {
    id: 'calf_size',
    label: 'Calf Size',
    category: 'legs',
    defaultValue: 50,
    drivers: [
      ...symmetricCV('LOWER_LEG', 'scale', 'z', [-0.06, 0.12]),
    ],
  },
  {
    id: 'foot_size',
    label: 'Foot Size',
    category: 'legs',
    defaultValue: 50,
    essential: true,
    drivers: [
      ...symmetricCV('FOOT', 'scale', 'x', [-0.06, 0.06]),
      ...symmetricCV('FOOT', 'scale', 'y', [-0.06, 0.06]),
      ...symmetricCV('FOOT', 'scale', 'z', [-0.06, 0.06]),
    ],
  },
  {
    id: 'knee_angle',
    label: 'Knock Knees',
    category: 'legs',
    defaultValue: 50,
    drivers: [
      { bone: 'mKneeLeft', property: 'position', axis: 'x', range: [0.01, -0.01] },
      { bone: 'mKneeRight', property: 'position', axis: 'x', range: [-0.01, 0.01] },
    ],
  },
  {
    id: 'platform_height',
    label: 'Platform Height',
    category: 'legs',
    defaultValue: 0,
    drivers: [
      ...symmetric('mAnkle', 'position', 'y', [0, 0.06]),
    ],
  },

  // =========================================================================
  // LEGS (new ADR-016 Phase 3 params)
  // =========================================================================
  {
    id: 'hip_length',
    label: 'Hip Length',
    category: 'legs',
    defaultValue: 50,
    drivers: [
      { bone: 'mPelvis', property: 'scale', axis: 'y', range: [-0.15, 0.15] },
    ],
  },
  {
    id: 'bow_legs',
    label: 'Bow Legs',
    category: 'legs',
    defaultValue: 50,
    drivers: [
      { bone: 'mKneeLeft', property: 'position', axis: 'z', range: [-0.01, 0.01] },
      { bone: 'mKneeRight', property: 'position', axis: 'z', range: [0.01, -0.01] },
    ],
  },
  {
    id: 'ankle_thickness',
    label: 'Ankle Thickness',
    category: 'legs',
    defaultValue: 50,
    drivers: [
      ...symmetricCV('LOWER_LEG', 'scale', 'x', [-0.06, 0.08]),
    ],
  },
  {
    id: 'shoe_heels',
    label: 'Shoe Heels',
    category: 'legs',
    defaultValue: 0,
    drivers: [
      ...symmetric('mFoot', 'position', 'y', [0, 0.06]),
    ],
  },
  {
    id: 'toe_thickness',
    label: 'Toe Thickness',
    category: 'legs',
    defaultValue: 50,
    drivers: [
      ...symmetricCV('FOOT', 'scale', 'z', [-0.06, 0.08]),
    ],
  },

  // =========================================================================
  // DETAILS (original 7 + new ADR-016 params)
  // =========================================================================
  {
    id: 'butt_size',
    label: 'Butt Size',
    category: 'details',
    defaultValue: 40,
    essential: true,
    drivers: [
      // BUTT CV bone has 0 weights in Ruth2 but 339 in Roth2 — include it for both.
      // PELVIS covers the entire pelvic/glute region (2732/2041 verts).
      // UPPER_LEG extends into the glute area (2034/1861 verts each).
      // Driver silently skips bones with no vertex weights.
      // Doubled ranges for more dramatic butt scaling
      { bone: 'BUTT', property: 'scale', axis: 'x', range: [-0.2, 0.6] },
      { bone: 'BUTT', property: 'scale', axis: 'z', range: [-0.2, 0.7] },
      { bone: 'PELVIS', property: 'scale', axis: 'z', range: [-0.15, 0.5] },
      ...symmetricCV('UPPER_LEG', 'scale', 'z', [-0.1, 0.3]),
      ...symmetricCV('UPPER_LEG', 'scale', 'x', [-0.06, 0.16]),
    ],
  },
  {
    id: 'love_handles',
    label: 'Love Handles',
    category: 'details',
    defaultValue: 25,
    drivers: [
      { bone: 'LEFT_HANDLE', property: 'scale', axis: 'x', range: [-0.08, 0.2] },
      { bone: 'LEFT_HANDLE', property: 'scale', axis: 'z', range: [-0.06, 0.15] },
      { bone: 'RIGHT_HANDLE', property: 'scale', axis: 'x', range: [-0.08, 0.2] },
      { bone: 'RIGHT_HANDLE', property: 'scale', axis: 'z', range: [-0.06, 0.15] },
    ],
  },
  {
    id: 'saddle_bags',
    label: 'Saddle Bags',
    category: 'details',
    defaultValue: 25,
    drivers: [
      ...symmetricCV('UPPER_LEG', 'scale', 'x', [-0.04, 0.12]),
    ],
  },
  {
    id: 'neck_length',
    label: 'Neck Length',
    category: 'details',
    defaultValue: 50,
    drivers: [
      { bone: 'mNeck', property: 'scale', axis: 'y', range: [-0.08, 0.08] },
    ],
  },
  {
    id: 'neck_thickness',
    label: 'Neck Thickness',
    category: 'details',
    defaultValue: 50,
    drivers: [
      { bone: 'NECK', property: 'scale', axis: 'x', range: [-0.1, 0.1] },
      { bone: 'NECK', property: 'scale', axis: 'z', range: [-0.1, 0.1] },
    ],
  },
  {
    id: 'head_size',
    label: 'Head Size',
    category: 'details',
    defaultValue: 50,
    essential: true,
    drivers: [
      { bone: 'mHead', property: 'scale', axis: 'x', range: [-0.08, 0.08] },
      { bone: 'mHead', property: 'scale', axis: 'y', range: [-0.08, 0.08] },
      { bone: 'mHead', property: 'scale', axis: 'z', range: [-0.08, 0.08] },
      // Eye compensation — scale eyes inversely to keep them normal size in scaled head
      { bone: 'mEyeLeft', property: 'scale', axis: 'x', range: [0.06, -0.06] },
      { bone: 'mEyeLeft', property: 'scale', axis: 'y', range: [0.06, -0.06] },
      { bone: 'mEyeLeft', property: 'scale', axis: 'z', range: [0.06, -0.06] },
      { bone: 'mEyeRight', property: 'scale', axis: 'x', range: [0.06, -0.06] },
      { bone: 'mEyeRight', property: 'scale', axis: 'y', range: [0.06, -0.06] },
      { bone: 'mEyeRight', property: 'scale', axis: 'z', range: [0.06, -0.06] },
    ],
  },
  {
    id: 'ear_size',
    label: 'Ear Size',
    category: 'details',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceEar1Left', property: 'scale', axis: 'x', range: [-0.15, 0.15] },
      { bone: 'mFaceEar1Left', property: 'scale', axis: 'y', range: [-0.15, 0.15] },
      { bone: 'mFaceEar1Right', property: 'scale', axis: 'x', range: [-0.15, 0.15] },
      { bone: 'mFaceEar1Right', property: 'scale', axis: 'y', range: [-0.15, 0.15] },
    ],
  },

  {
    id: 'male_package',
    label: 'Package',
    category: 'details',
    defaultValue: 25,
    hideOnMasculine: false,
    masculineLabel: 'Package',
    drivers: [
      { bone: 'mGroin', property: 'scale', axis: 'x', range: [-0.1, 0.5] },
      { bone: 'mGroin', property: 'scale', axis: 'y', range: [-0.05, 0.25] },
      { bone: 'mGroin', property: 'scale', axis: 'z', range: [-0.02, 0.1] },
    ],
  },

  // =========================================================================
  // FACE: HEAD SHAPE (new ADR-016 Phase 2 params)
  // =========================================================================
  {
    id: 'egg_head',
    label: 'Egg Head',
    category: 'face_structure',
    defaultValue: 50,
    essential: true,
    drivers: [
      // Face mesh deformation
      { bone: 'mFaceRoot', property: 'scale', axis: 'x', range: [-0.07, 0.07] },
      { bone: 'mFaceRoot', property: 'scale', axis: 'y', range: [0.07, -0.07] },
      // Eye compensation — keep eyeballs in sockets as face shape changes
      // SL offsets from param 30646: eyes move inward/outward with face width
      { bone: 'mEyeLeft', property: 'position', axis: 'x', range: [0.003, -0.003] },
      { bone: 'mEyeRight', property: 'position', axis: 'x', range: [-0.003, 0.003] },
      { bone: 'mEyeLeft', property: 'position', axis: 'y', range: [-0.002, 0.002] },
      { bone: 'mEyeRight', property: 'position', axis: 'y', range: [-0.002, 0.002] },
      { bone: 'mFaceEyeAltLeft', property: 'position', axis: 'x', range: [0.003, -0.003] },
      { bone: 'mFaceEyeAltRight', property: 'position', axis: 'x', range: [-0.003, 0.003] },
      { bone: 'mFaceEyeAltLeft', property: 'position', axis: 'y', range: [-0.002, 0.002] },
      { bone: 'mFaceEyeAltRight', property: 'position', axis: 'y', range: [-0.002, 0.002] },
    ],
  },
  {
    id: 'head_stretch',
    label: 'Head Stretch',
    category: 'face_structure',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceRoot', property: 'scale', axis: 'y', range: [-0.15, 0.15] },
      // Eye compensation — Z=up/down, eyes follow vertical stretch
      { bone: 'mEyeLeft', property: 'position', axis: 'z', range: [-0.004, 0.004] },
      { bone: 'mEyeRight', property: 'position', axis: 'z', range: [-0.004, 0.004] },
    ],
  },
  {
    id: 'head_length',
    label: 'Head Length',
    category: 'face_structure',
    defaultValue: 50,
    essential: true,
    drivers: [
      { bone: 'mFaceRoot', property: 'scale', axis: 'z', range: [-0.1, 0.1] },
      // Eye compensation — eyes follow depth change
      { bone: 'mEyeLeft', property: 'position', axis: 'z', range: [-0.004, 0.004] },
      { bone: 'mEyeRight', property: 'position', axis: 'z', range: [-0.004, 0.004] },
      { bone: 'mFaceEyeAltLeft', property: 'position', axis: 'z', range: [-0.004, 0.004] },
      { bone: 'mFaceEyeAltRight', property: 'position', axis: 'z', range: [-0.004, 0.004] },
    ],
  },
  {
    id: 'squash_stretch_head',
    label: 'Squash/Stretch Head',
    category: 'face_structure',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceRoot', property: 'scale', axis: 'x', range: [0.05, -0.05] },
      { bone: 'mFaceRoot', property: 'scale', axis: 'y', range: [-0.05, 0.05] },
      { bone: 'mFaceChin', property: 'position', axis: 'y', range: [0.003, -0.003] },
      // Eye compensation — narrowing pushes eyes inward (X), stretching moves up (Z)
      { bone: 'mEyeLeft', property: 'position', axis: 'x', range: [0.004, -0.004] },
      { bone: 'mEyeRight', property: 'position', axis: 'x', range: [-0.004, 0.004] },
      { bone: 'mEyeLeft', property: 'position', axis: 'z', range: [-0.003, 0.003] },
      { bone: 'mEyeRight', property: 'position', axis: 'z', range: [-0.003, 0.003] },
    ],
  },
  {
    id: 'face_shear',
    label: 'Face Shear',
    category: 'face_structure',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceRoot', property: 'position', axis: 'x', range: [-0.005, 0.005] },
    ],
  },
  {
    id: 'cheek_bones',
    label: 'Cheek Bones',
    category: 'face_structure',
    defaultValue: 50,
    essential: true,
    drivers: [
      { bone: 'mFaceCheekUpperLeft', property: 'position', axis: 'y', range: [-0.01, 0.01] },
      { bone: 'mFaceCheekUpperRight', property: 'position', axis: 'y', range: [-0.01, 0.01] },
    ],
  },
  {
    id: 'puffy_upper_cheeks',
    label: 'Puffy Upper Cheeks',
    category: 'face_structure',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceCheekUpperLeft', property: 'scale', axis: 'x', range: [-0.15, 0.3] },
      { bone: 'mFaceCheekUpperLeft', property: 'scale', axis: 'y', range: [-0.1, 0.2] },
      { bone: 'mFaceCheekUpperLeft', property: 'scale', axis: 'z', range: [-0.1, 0.2] },
      { bone: 'mFaceCheekUpperRight', property: 'scale', axis: 'x', range: [-0.15, 0.3] },
      { bone: 'mFaceCheekUpperRight', property: 'scale', axis: 'y', range: [-0.1, 0.2] },
      { bone: 'mFaceCheekUpperRight', property: 'scale', axis: 'z', range: [-0.1, 0.2] },
    ],
  },
  {
    id: 'sunken_cheeks',
    label: 'Sunken Cheeks',
    category: 'face_structure',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceCheekLowerLeft', property: 'scale', axis: 'x', range: [0.18, -0.18] },
      { bone: 'mFaceCheekLowerRight', property: 'scale', axis: 'x', range: [0.18, -0.18] },
    ],
  },
  {
    id: 'square_jaw',
    label: 'Square Jaw',
    category: 'face_structure',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceJaw', property: 'scale', axis: 'x', range: [-0.15, 0.15] },
      { bone: 'mFaceJawShaper', property: 'scale', axis: 'x', range: [-0.15, 0.15] },
    ],
  },

  // =========================================================================
  // FACE: JAW & CHIN (original 3 + new ADR-016 params)
  // =========================================================================
  {
    id: 'jaw_width',
    label: 'Jaw Width',
    category: 'face_structure',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceJaw', property: 'scale', axis: 'x', range: [-0.12, 0.12] },
    ],
  },
  {
    id: 'jaw_angle',
    label: 'Jaw Angle',
    category: 'face_structure',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceJawShaper', property: 'scale', axis: 'z', range: [-0.1, 0.1] },
    ],
  },
  {
    id: 'chin_depth',
    label: 'Chin Depth',
    category: 'face_structure',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceChin', property: 'position', axis: 'z', range: [-0.008, 0.008] },
    ],
  },

  {
    id: 'chin_cleft',
    label: 'Chin Cleft',
    category: 'face_structure',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceChin', property: 'position', axis: 'y', range: [0.005, -0.005] },
    ],
  },
  {
    id: 'double_chin',
    label: 'Double Chin',
    category: 'face_structure',
    defaultValue: 25,
    drivers: [
      { bone: 'mFaceJawShaper', property: 'scale', axis: 'x', range: [-0.06, 0.25] },
      { bone: 'mFaceJawShaper', property: 'scale', axis: 'z', range: [-0.06, 0.5] },
    ],
  },
  {
    id: 'jaw_jut',
    label: 'Jaw Jut',
    category: 'face_structure',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceChin', property: 'position', axis: 'z', range: [-0.01, 0.01] },
      { bone: 'mFaceTeethLower', property: 'position', axis: 'z', range: [-0.008, 0.008] },
    ],
  },
  {
    id: 'weak_chin',
    label: 'Weak Chin',
    category: 'face_structure',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceChin', property: 'position', axis: 'z', range: [0.015, -0.015] },
      { bone: 'mFaceChin', property: 'position', axis: 'y', range: [-0.005, 0.005] },
    ],
  },
  {
    id: 'ear_angle',
    label: 'Ears Out',
    category: 'face_structure',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceEar1Left', property: 'position', axis: 'x', range: [0.005, -0.005] },
      { bone: 'mFaceEar1Right', property: 'position', axis: 'x', range: [-0.005, 0.005] },
    ],
  },
  {
    id: 'pointy_ears',
    label: 'Pointy Ears',
    category: 'face_structure',
    defaultValue: 25,
    drivers: [
      { bone: 'mFaceEar2Left', property: 'position', axis: 'y', range: [0, 0.04] },
      { bone: 'mFaceEar2Left', property: 'position', axis: 'z', range: [0, -0.03] },
      { bone: 'mFaceEar2Right', property: 'position', axis: 'y', range: [0, 0.04] },
      { bone: 'mFaceEar2Right', property: 'position', axis: 'z', range: [0, -0.03] },
    ],
  },

  // =========================================================================
  // FACE: NOSE (original 3 + new ADR-016 params)
  // =========================================================================
  {
    id: 'nose_width',
    label: 'Nose Width',
    category: 'face_nose',
    defaultValue: 50,
    essential: true,
    drivers: [
      { bone: 'mFaceNoseLeft', property: 'position', axis: 'x', range: [0.004, -0.004] },
      { bone: 'mFaceNoseRight', property: 'position', axis: 'x', range: [-0.004, 0.004] },
    ],
  },
  {
    id: 'nose_bridge',
    label: 'Nose Bridge',
    category: 'face_nose',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceNoseBridge', property: 'position', axis: 'z', range: [-0.005, 0.005] },
    ],
  },
  {
    id: 'nose_length',
    label: 'Nose Length',
    category: 'face_nose',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceNoseBase', property: 'position', axis: 'y', range: [0.004, -0.004] },
    ],
  },

  {
    id: 'nose_size',
    label: 'Nose Size',
    category: 'face_nose',
    defaultValue: 50,
    essential: true,
    drivers: [
      { bone: 'mFaceNoseCenter', property: 'scale', axis: 'x', range: [-0.2, 0.4] },
      { bone: 'mFaceNoseCenter', property: 'scale', axis: 'y', range: [-0.15, 0.3] },
      { bone: 'mFaceNoseCenter', property: 'scale', axis: 'z', range: [-0.1, 0.2] },
      { bone: 'mFaceNoseLeft', property: 'scale', axis: 'y', range: [-0.1, 0.2] },
      { bone: 'mFaceNoseRight', property: 'scale', axis: 'y', range: [-0.1, 0.2] },
      { bone: 'mFaceNoseBridge', property: 'scale', axis: 'x', range: [-0.05, 0.1] },
    ],
  },
  {
    id: 'nostril_width',
    label: 'Nostril Width',
    category: 'face_nose',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceNoseLeft', property: 'position', axis: 'x', range: [0.006, -0.006] },
      { bone: 'mFaceNoseRight', property: 'position', axis: 'x', range: [-0.006, 0.006] },
    ],
  },
  {
    id: 'nose_tip_angle',
    label: 'Upturned Nose',
    category: 'face_nose',
    defaultValue: 50,
    essential: true,
    drivers: [
      { bone: 'mFaceNoseBase', property: 'position', axis: 'y', range: [-0.003, 0.003] },
      { bone: 'mFaceNoseCenter', property: 'position', axis: 'z', range: [-0.004, 0.004] },
    ],
  },
  {
    id: 'nose_bridge_width',
    label: 'Nose Bridge Width',
    category: 'face_nose',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceNoseBridge', property: 'scale', axis: 'x', range: [-0.15, 0.3] },
    ],
  },
  {
    id: 'nose_thickness',
    label: 'Nose Thickness',
    category: 'face_nose',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceNoseBridge', property: 'scale', axis: 'z', range: [-0.2, 0.35] },
      { bone: 'mFaceNoseBridge', property: 'position', axis: 'z', range: [-0.004, 0.004] },
    ],
  },
  {
    id: 'crooked_nose',
    label: 'Crooked Nose',
    category: 'face_nose',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceNoseCenter', property: 'position', axis: 'x', range: [-0.006, 0.006] },
      { bone: 'mFaceNoseBase', property: 'position', axis: 'x', range: [-0.005, 0.005] },
      { bone: 'mFaceNoseBridge', property: 'position', axis: 'x', range: [-0.004, 0.004] },
    ],
  },
  {
    id: 'bulbous_nose',
    label: 'Bulbous Nose',
    category: 'face_nose',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceNoseCenter', property: 'scale', axis: 'x', range: [-0.05, 0.15] },
      { bone: 'mFaceNoseCenter', property: 'scale', axis: 'y', range: [-0.05, 0.2] },
      { bone: 'mFaceNoseCenter', property: 'scale', axis: 'z', range: [-0.05, 0.15] },
    ],
  },
  {
    id: 'low_septum',
    label: 'Low Septum',
    category: 'face_nose',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceNoseBase', property: 'position', axis: 'y', range: [0.004, -0.004] },
    ],
  },

  // =========================================================================
  // FACE: EYES & BROWS — axis mapping: X=left/right, Y=forward/back, Z=up/down
  // mFaceEyeAlt* have ZERO vertex weights — use mEyeLeft/Right + lid bones instead
  // =========================================================================
  {
    id: 'eye_spacing',
    label: 'Eye Spacing',
    category: 'face_eyes',
    defaultValue: 50,
    essential: true,
    drivers: [
      // mEyeLeft/Right have 145 verts each — use these, not mFaceEyeAlt (0 verts)
      // Eyeball range reduced vs lid/corner bones to prevent clipping through face
      { bone: 'mEyeLeft', property: 'position', axis: 'x', range: [-0.003, 0.003] },
      { bone: 'mEyeRight', property: 'position', axis: 'x', range: [0.003, -0.003] },
      { bone: 'mFaceEyeLidUpperLeft', property: 'position', axis: 'x', range: [-0.005, 0.005] },
      { bone: 'mFaceEyeLidUpperRight', property: 'position', axis: 'x', range: [0.005, -0.005] },
      { bone: 'mFaceEyeLidLowerLeft', property: 'position', axis: 'x', range: [-0.005, 0.005] },
      { bone: 'mFaceEyeLidLowerRight', property: 'position', axis: 'x', range: [0.005, -0.005] },
      { bone: 'mFaceEyecornerInnerLeft', property: 'position', axis: 'x', range: [-0.003, 0.003] },
      { bone: 'mFaceEyecornerInnerRight', property: 'position', axis: 'x', range: [0.003, -0.003] },
    ],
  },
  {
    id: 'eye_size',
    label: 'Eye Size',
    category: 'face_eyes',
    defaultValue: 50,
    essential: true,
    drivers: [
      // Scale eye and lid bones uniformly
      { bone: 'mEyeLeft', property: 'scale', axis: 'x', range: [-0.15, 0.15] },
      { bone: 'mEyeLeft', property: 'scale', axis: 'y', range: [-0.15, 0.15] },
      { bone: 'mEyeLeft', property: 'scale', axis: 'z', range: [-0.15, 0.15] },
      { bone: 'mEyeRight', property: 'scale', axis: 'x', range: [-0.15, 0.15] },
      { bone: 'mEyeRight', property: 'scale', axis: 'y', range: [-0.15, 0.15] },
      { bone: 'mEyeRight', property: 'scale', axis: 'z', range: [-0.15, 0.15] },
      { bone: 'mFaceEyeLidUpperLeft', property: 'scale', axis: 'x', range: [-0.1, 0.1] },
      { bone: 'mFaceEyeLidUpperLeft', property: 'scale', axis: 'z', range: [-0.1, 0.1] },
      { bone: 'mFaceEyeLidUpperRight', property: 'scale', axis: 'x', range: [-0.1, 0.1] },
      { bone: 'mFaceEyeLidUpperRight', property: 'scale', axis: 'z', range: [-0.1, 0.1] },
      { bone: 'mFaceEyeLidLowerLeft', property: 'scale', axis: 'x', range: [-0.1, 0.1] },
      { bone: 'mFaceEyeLidLowerLeft', property: 'scale', axis: 'z', range: [-0.1, 0.1] },
      { bone: 'mFaceEyeLidLowerRight', property: 'scale', axis: 'x', range: [-0.1, 0.1] },
      { bone: 'mFaceEyeLidLowerRight', property: 'scale', axis: 'z', range: [-0.1, 0.1] },
    ],
  },
  {
    id: 'eye_depth',
    label: 'Eye Depth',
    category: 'face_eyes',
    defaultValue: 50,
    essential: true,
    drivers: [
      // Y = forward/back
      { bone: 'mEyeLeft', property: 'position', axis: 'y', range: [-0.006, 0.006] },
      { bone: 'mEyeRight', property: 'position', axis: 'y', range: [-0.006, 0.006] },
      { bone: 'mFaceEyeLidUpperLeft', property: 'position', axis: 'y', range: [-0.004, 0.004] },
      { bone: 'mFaceEyeLidUpperRight', property: 'position', axis: 'y', range: [-0.004, 0.004] },
      { bone: 'mFaceEyeLidLowerLeft', property: 'position', axis: 'y', range: [-0.004, 0.004] },
      { bone: 'mFaceEyeLidLowerRight', property: 'position', axis: 'y', range: [-0.004, 0.004] },
    ],
  },
  {
    id: 'brow_height',
    label: 'Brow Height',
    category: 'face_eyes',
    defaultValue: 50,
    essential: true,
    drivers: [
      // Z = up/down (was incorrectly Y before)
      { bone: 'mFaceEyebrowCenterLeft', property: 'position', axis: 'z', range: [-0.006, 0.006] },
      { bone: 'mFaceEyebrowCenterRight', property: 'position', axis: 'z', range: [-0.006, 0.006] },
      { bone: 'mFaceEyebrowInnerLeft', property: 'position', axis: 'z', range: [-0.006, 0.006] },
      { bone: 'mFaceEyebrowInnerRight', property: 'position', axis: 'z', range: [-0.006, 0.006] },
      { bone: 'mFaceEyebrowOuterLeft', property: 'position', axis: 'z', range: [-0.005, 0.005] },
      { bone: 'mFaceEyebrowOuterRight', property: 'position', axis: 'z', range: [-0.005, 0.005] },
    ],
  },
  {
    id: 'brow_ridge',
    label: 'Brow Ridge',
    category: 'face_eyes',
    defaultValue: 50,
    drivers: [
      // Y = forward/back protrusion of brow ridge
      { bone: 'mFaceForeheadCenter', property: 'position', axis: 'y', range: [-0.006, 0.006] },
      { bone: 'mFaceForeheadLeft', property: 'position', axis: 'y', range: [-0.005, 0.005] },
      { bone: 'mFaceForeheadRight', property: 'position', axis: 'y', range: [-0.005, 0.005] },
    ],
  },

  {
    id: 'wide_eyes',
    label: 'Wide Eyes',
    category: 'face_eyes',
    defaultValue: 50,
    drivers: [
      // Scale lids on X (width) and Z (height) with wider range
      { bone: 'mFaceEyeLidUpperLeft', property: 'scale', axis: 'x', range: [-0.15, 0.3] },
      { bone: 'mFaceEyeLidUpperLeft', property: 'scale', axis: 'z', range: [-0.15, 0.3] },
      { bone: 'mFaceEyeLidUpperRight', property: 'scale', axis: 'x', range: [-0.15, 0.3] },
      { bone: 'mFaceEyeLidUpperRight', property: 'scale', axis: 'z', range: [-0.15, 0.3] },
      { bone: 'mFaceEyeLidLowerLeft', property: 'scale', axis: 'x', range: [-0.15, 0.3] },
      { bone: 'mFaceEyeLidLowerLeft', property: 'scale', axis: 'z', range: [-0.15, 0.3] },
      { bone: 'mFaceEyeLidLowerRight', property: 'scale', axis: 'x', range: [-0.15, 0.3] },
      { bone: 'mFaceEyeLidLowerRight', property: 'scale', axis: 'z', range: [-0.15, 0.3] },
    ],
  },
  {
    id: 'eyelid_corner_up',
    label: 'Eyelid Corner Up',
    category: 'face_eyes',
    defaultValue: 50,
    drivers: [
      // Z = up/down
      { bone: 'mFaceEyebrowOuterLeft', property: 'position', axis: 'z', range: [-0.006, 0.006] },
      { bone: 'mFaceEyebrowOuterRight', property: 'position', axis: 'z', range: [-0.006, 0.006] },
    ],
  },
  {
    id: 'eyelid_inner_corner_up',
    label: 'Inner Corner Up',
    category: 'face_eyes',
    defaultValue: 50,
    drivers: [
      // Z = up/down
      { bone: 'mFaceEyecornerInnerLeft', property: 'position', axis: 'z', range: [-0.006, 0.006] },
      { bone: 'mFaceEyecornerInnerRight', property: 'position', axis: 'z', range: [-0.006, 0.006] },
    ],
  },
  {
    id: 'upper_eyelid_fold',
    label: 'Upper Eyelid Fold',
    category: 'face_eyes',
    defaultValue: 50,
    drivers: [
      // Z = up/down — lid drops down
      { bone: 'mFaceEyeLidUpperLeft', property: 'position', axis: 'z', range: [0.006, -0.006] },
      { bone: 'mFaceEyeLidUpperRight', property: 'position', axis: 'z', range: [0.006, -0.006] },
    ],
  },
  {
    id: 'baggy_eyes',
    label: 'Baggy Eyes',
    category: 'face_eyes',
    defaultValue: 25,
    drivers: [
      { bone: 'mFaceEyeLidLowerLeft', property: 'scale', axis: 'z', range: [-0.1, 0.5] },
      { bone: 'mFaceEyeLidLowerLeft', property: 'position', axis: 'z', range: [0.002, -0.002] },
      { bone: 'mFaceEyeLidLowerRight', property: 'scale', axis: 'z', range: [-0.1, 0.5] },
      { bone: 'mFaceEyeLidLowerRight', property: 'position', axis: 'z', range: [0.002, -0.002] },
    ],
  },
  {
    id: 'puffy_lower_lids',
    label: 'Puffy Lower Lids',
    category: 'face_eyes',
    defaultValue: 25,
    drivers: [
      { bone: 'mFaceEyeLidLowerLeft', property: 'scale', axis: 'x', range: [-0.08, 0.15] },
      { bone: 'mFaceEyeLidLowerLeft', property: 'scale', axis: 'y', range: [-0.08, 0.15] },
      { bone: 'mFaceEyeLidLowerLeft', property: 'scale', axis: 'z', range: [-0.08, 0.15] },
      { bone: 'mFaceEyeLidLowerRight', property: 'scale', axis: 'x', range: [-0.08, 0.15] },
      { bone: 'mFaceEyeLidLowerRight', property: 'scale', axis: 'y', range: [-0.08, 0.15] },
      { bone: 'mFaceEyeLidLowerRight', property: 'scale', axis: 'z', range: [-0.08, 0.15] },
      { bone: 'mFaceEyecornerInnerLeft', property: 'scale', axis: 'x', range: [-0.05, 0.1] },
      { bone: 'mFaceEyecornerInnerLeft', property: 'scale', axis: 'z', range: [-0.05, 0.1] },
      { bone: 'mFaceEyecornerInnerRight', property: 'scale', axis: 'x', range: [-0.05, 0.1] },
      { bone: 'mFaceEyecornerInnerRight', property: 'scale', axis: 'z', range: [-0.05, 0.1] },
    ],
  },
  {
    id: 'pop_eye',
    label: 'Pop Eye',
    category: 'face_eyes',
    defaultValue: 50,
    drivers: [
      // Eyeball protrusion — Y = forward/back
      { bone: 'mEyeLeft', property: 'position', axis: 'y', range: [-0.006, 0.008] },
      { bone: 'mEyeRight', property: 'position', axis: 'y', range: [-0.006, 0.008] },
      { bone: 'mEyeLeft', property: 'scale', axis: 'x', range: [-0.12, 0.15] },
      { bone: 'mEyeLeft', property: 'scale', axis: 'y', range: [-0.12, 0.15] },
      { bone: 'mEyeLeft', property: 'scale', axis: 'z', range: [-0.12, 0.15] },
      { bone: 'mEyeRight', property: 'scale', axis: 'x', range: [-0.12, 0.15] },
      { bone: 'mEyeRight', property: 'scale', axis: 'y', range: [-0.12, 0.15] },
      { bone: 'mEyeRight', property: 'scale', axis: 'z', range: [-0.12, 0.15] },
    ],
  },
  {
    id: 'eyebrow_size',
    label: 'Eyebrow Size',
    category: 'face_eyes',
    defaultValue: 50,
    drivers: [
      // Scale on Y (forward protrusion) for visible brow thickening
      { bone: 'mFaceEyebrowOuterLeft', property: 'scale', axis: 'y', range: [-0.2, 0.4] },
      { bone: 'mFaceEyebrowCenterLeft', property: 'scale', axis: 'y', range: [-0.2, 0.4] },
      { bone: 'mFaceEyebrowInnerLeft', property: 'scale', axis: 'y', range: [-0.2, 0.4] },
      { bone: 'mFaceEyebrowOuterRight', property: 'scale', axis: 'y', range: [-0.2, 0.4] },
      { bone: 'mFaceEyebrowCenterRight', property: 'scale', axis: 'y', range: [-0.2, 0.4] },
      { bone: 'mFaceEyebrowInnerRight', property: 'scale', axis: 'y', range: [-0.2, 0.4] },
    ],
  },
  {
    id: 'brow_arch',
    label: 'Arched Eyebrows',
    category: 'face_eyes',
    defaultValue: 50,
    drivers: [
      // Z = up/down — center goes up, inner stays lower = arch shape
      { bone: 'mFaceEyebrowCenterLeft', property: 'position', axis: 'z', range: [-0.005, 0.005] },
      { bone: 'mFaceEyebrowCenterRight', property: 'position', axis: 'z', range: [-0.005, 0.005] },
      { bone: 'mFaceEyebrowInnerLeft', property: 'position', axis: 'z', range: [-0.001, 0.001] },
      { bone: 'mFaceEyebrowInnerRight', property: 'position', axis: 'z', range: [-0.001, 0.001] },
    ],
  },

  // =========================================================================
  // FACE: MOUTH & FOREHEAD (original 4 + new ADR-016 params)
  // =========================================================================
  {
    id: 'lip_width',
    label: 'Lip Width',
    category: 'face_mouth',
    defaultValue: 50,
    essential: true,
    drivers: [
      { bone: 'mFaceLipCornerLeft', property: 'position', axis: 'x', range: [0.004, -0.004] },
      { bone: 'mFaceLipCornerRight', property: 'position', axis: 'x', range: [-0.004, 0.004] },
    ],
  },
  {
    id: 'mouth_position',
    label: 'Mouth Height',
    category: 'face_mouth',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceTeethLower', property: 'position', axis: 'y', range: [0.003, -0.003] },
      { bone: 'mFaceLipLowerCenter', property: 'position', axis: 'y', range: [0.003, -0.003] },
      { bone: 'mFaceLipUpperCenter', property: 'position', axis: 'y', range: [0.003, -0.003] },
    ],
  },
  {
    id: 'forehead_height',
    label: 'Forehead Height',
    category: 'face_eyes',
    defaultValue: 50,
    drivers: [
      // Scale Z (up/down) for forehead height
      { bone: 'mFaceForeheadCenter', property: 'scale', axis: 'z', range: [-0.15, 0.15] },
      { bone: 'mFaceForeheadLeft', property: 'scale', axis: 'z', range: [-0.15, 0.15] },
      { bone: 'mFaceForeheadRight', property: 'scale', axis: 'z', range: [-0.15, 0.15] },
    ],
  },
  {
    id: 'forehead_slope',
    label: 'Forehead Slope',
    category: 'face_eyes',
    defaultValue: 50,
    drivers: [
      // Y = forward/back slope
      { bone: 'mFaceForeheadCenter', property: 'position', axis: 'y', range: [-0.006, 0.006] },
    ],
  },
  {
    id: 'lip_fullness_upper',
    label: 'Upper Lip Fullness',
    category: 'face_mouth',
    defaultValue: 50,
    essential: true,
    drivers: [
      { bone: 'mFaceLipUpperLeft', property: 'scale', axis: 'z', range: [-0.15, 0.45] },
      { bone: 'mFaceLipUpperCenter', property: 'scale', axis: 'z', range: [-0.1, 0.3] },
      { bone: 'mFaceLipUpperRight', property: 'scale', axis: 'z', range: [-0.15, 0.45] },
      { bone: 'mFaceLipUpperLeft', property: 'position', axis: 'z', range: [-0.003, 0.006] },
      { bone: 'mFaceLipUpperCenter', property: 'position', axis: 'z', range: [-0.002, 0.003] },
      { bone: 'mFaceLipUpperRight', property: 'position', axis: 'z', range: [-0.003, 0.006] },
    ],
  },
  {
    id: 'lip_fullness_lower',
    label: 'Lower Lip Fullness',
    category: 'face_mouth',
    defaultValue: 50,
    essential: true,
    drivers: [
      { bone: 'mFaceLipLowerLeft', property: 'scale', axis: 'z', range: [-0.1, 0.25] },
      { bone: 'mFaceLipLowerCenter', property: 'scale', axis: 'z', range: [-0.1, 0.25] },
      { bone: 'mFaceLipLowerRight', property: 'scale', axis: 'z', range: [-0.1, 0.25] },
      { bone: 'mFaceLipLowerLeft', property: 'position', axis: 'z', range: [0.003, -0.004] },
      { bone: 'mFaceLipLowerCenter', property: 'position', axis: 'z', range: [0.003, -0.004] },
      { bone: 'mFaceLipLowerRight', property: 'position', axis: 'z', range: [0.003, -0.004] },
    ],
  },
  {
    id: 'lip_thickness',
    label: 'Lip Thickness',
    category: 'face_mouth',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceLipUpperLeft', property: 'scale', axis: 'z', range: [-0.2, 0.3] },
      { bone: 'mFaceLipUpperCenter', property: 'scale', axis: 'z', range: [-0.2, 0.3] },
      { bone: 'mFaceLipUpperRight', property: 'scale', axis: 'z', range: [-0.2, 0.3] },
      { bone: 'mFaceLipLowerLeft', property: 'scale', axis: 'z', range: [-0.2, 0.3] },
      { bone: 'mFaceLipLowerCenter', property: 'scale', axis: 'z', range: [-0.2, 0.3] },
      { bone: 'mFaceLipLowerRight', property: 'scale', axis: 'z', range: [-0.2, 0.3] },
    ],
  },
  {
    id: 'lip_cleft',
    label: 'Lip Cleft',
    category: 'face_mouth',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceLipUpperLeft', property: 'position', axis: 'z', range: [-0.002, 0.003] },
      { bone: 'mFaceLipUpperCenter', property: 'position', axis: 'z', range: [0.001, -0.001] },
      { bone: 'mFaceLipUpperRight', property: 'position', axis: 'z', range: [-0.002, 0.003] },
    ],
  },
  {
    id: 'smile_frown',
    label: 'Smile / Frown',
    category: 'face_mouth',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceLipCornerLeft', property: 'position', axis: 'y', range: [-0.004, 0.004] },
      { bone: 'mFaceLipCornerRight', property: 'position', axis: 'y', range: [-0.004, 0.004] },
      { bone: 'mFaceLipCornerLeft', property: 'position', axis: 'x', range: [-0.002, 0.003] },
      { bone: 'mFaceLipCornerRight', property: 'position', axis: 'x', range: [0.002, -0.003] },
    ],
  },
  {
    id: 'shift_mouth',
    label: 'Shift Mouth',
    category: 'face_mouth',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceTeethUpper', property: 'position', axis: 'x', range: [-0.006, 0.006] },
      { bone: 'mFaceTeethLower', property: 'position', axis: 'x', range: [-0.006, 0.006] },
      { bone: 'mFaceNoseBase', property: 'position', axis: 'x', range: [-0.003, 0.003] },
    ],
  },
  {
    id: 'forehead_angle',
    label: 'Forehead Angle',
    category: 'face_eyes',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceForeheadLeft', property: 'scale', axis: 'z', range: [-0.05, 0.1] },
      { bone: 'mFaceForeheadCenter', property: 'scale', axis: 'z', range: [-0.05, 0.1] },
      { bone: 'mFaceForeheadRight', property: 'scale', axis: 'z', range: [-0.05, 0.1] },
      { bone: 'mFaceForeheadLeft', property: 'position', axis: 'z', range: [-0.01, 0.01] },
      { bone: 'mFaceForeheadRight', property: 'position', axis: 'z', range: [-0.01, 0.01] },
    ],
  },
  {
    id: 'brow_size',
    label: 'Brow Size',
    category: 'face_eyes',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceForeheadCenter', property: 'position', axis: 'z', range: [-0.003, 0.007] },
      { bone: 'mFaceEyebrowInnerLeft', property: 'scale', axis: 'x', range: [-0.05, 0.1] },
      { bone: 'mFaceEyebrowInnerLeft', property: 'position', axis: 'z', range: [-0.002, 0.004] },
      { bone: 'mFaceEyebrowInnerRight', property: 'scale', axis: 'x', range: [-0.05, 0.1] },
      { bone: 'mFaceEyebrowInnerRight', property: 'position', axis: 'z', range: [-0.002, 0.004] },
      { bone: 'mFaceEyebrowCenterLeft', property: 'scale', axis: 'x', range: [-0.05, 0.1] },
      { bone: 'mFaceEyebrowCenterLeft', property: 'position', axis: 'z', range: [-0.002, 0.004] },
      { bone: 'mFaceEyebrowCenterRight', property: 'scale', axis: 'x', range: [-0.05, 0.1] },
      { bone: 'mFaceEyebrowCenterRight', property: 'position', axis: 'z', range: [-0.002, 0.004] },
    ],
  },
];

// ---------------------------------------------------------------------------
// Body presets
// ---------------------------------------------------------------------------

export interface ShapePreset {
  id: string;
  label: string;
  section: SectionId;
  /** Map of parameter id → slider value (0–100). Unlisted params stay at default. */
  values: Record<string, number>;
}

export const SHAPE_PRESETS: ShapePreset[] = [
  // Body presets
  {
    id: 'default', label: 'Default', section: 'body',
    values: {},  // all defaults
  },
  {
    id: 'athletic', label: 'Athletic', section: 'body',
    values: {
      shoulder_width: 65, torso_muscle: 70, body_fat: 15, body_thickness: 55,
      hip_width: 40, breast_size: 25, belly_size: 10, upper_arm_thickness: 60,
      upper_leg_thickness: 55, butt_size: 35,
    },
  },
  {
    id: 'curvy', label: 'Curvy', section: 'body',
    values: {
      hip_width: 70, breast_size: 65, butt_size: 65, waist_width: 40,
      body_taper: 35, body_fat: 40, belly_size: 30, upper_leg_thickness: 60,
      love_handles: 35,
    },
  },
  {
    id: 'slim', label: 'Slim', section: 'body',
    values: {
      body_thickness: 35, body_fat: 10, shoulder_width: 42, hip_width: 40,
      breast_size: 20, belly_size: 10, upper_leg_thickness: 38, lower_leg_thickness: 40,
      butt_size: 25, love_handles: 10, saddle_bags: 10,
    },
  },
  {
    id: 'heavy', label: 'Heavy', section: 'body',
    values: {
      body_thickness: 72, body_fat: 70, belly_size: 65, hip_width: 65,
      butt_size: 60, love_handles: 60, saddle_bags: 55, upper_leg_thickness: 70,
      lower_leg_thickness: 60, upper_arm_thickness: 65, forearm_thickness: 60,
      breast_size: 55, neck_thickness: 62,
    },
  },
  // Face presets
  {
    id: 'face_default', label: 'Default', section: 'face',
    values: {},
  },
  {
    id: 'face_angular', label: 'Angular', section: 'face',
    values: {
      jaw_width: 62, brow_ridge: 65, nose_bridge: 60, chin_depth: 58,
      forehead_slope: 40,
    },
  },
  {
    id: 'face_soft', label: 'Soft', section: 'face',
    values: {
      jaw_width: 38, eye_size: 58, lip_width: 55, brow_height: 55,
      nose_width: 45, chin_depth: 42,
    },
  },
  {
    id: 'face_distinct', label: 'Distinct', section: 'face',
    values: {
      nose_bridge: 65, nose_length: 58, lip_width: 60, jaw_angle: 58,
      brow_ridge: 60, chin_depth: 60,
    },
  },
];
