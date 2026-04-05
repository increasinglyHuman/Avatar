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
  { id: 'face_eyes',      label: 'Eyes & Brows',    section: 'face' },
  { id: 'face_mouth',     label: 'Mouth & Forehead', section: 'face' },
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
    drivers: [
      { bone: 'mPelvis', property: 'position', axis: 'y', range: [-0.05, 0.05] },
    ],
  },
  {
    id: 'body_thickness',
    label: 'Body Thickness',
    category: 'body',
    defaultValue: 50,
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
      { bone: 'mCollarLeft', property: 'position', axis: 'x', range: [-0.02, 0.02] },
      { bone: 'mCollarRight', property: 'position', axis: 'x', range: [0.02, -0.02] },
    ],
  },
  {
    id: 'hip_width',
    label: 'Hip Width',
    category: 'body',
    defaultValue: 50,
    drivers: [
      { bone: 'PELVIS', property: 'scale', axis: 'x', range: [-0.12, 0.12] },
      { bone: 'mHipLeft', property: 'position', axis: 'x', range: [0.01, -0.01] },
      { bone: 'mHipRight', property: 'position', axis: 'x', range: [-0.01, 0.01] },
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
    drivers: [
      { bone: 'mTorso', property: 'scale', axis: 'y', range: [-0.1, 0.1] },
    ],
  },
  {
    id: 'breast_size',
    label: 'Breast Size',
    category: 'torso',
    defaultValue: 40,
    drivers: [
      { bone: 'LEFT_PEC', property: 'scale', axis: 'x', range: [-0.1, 0.2] },
      { bone: 'LEFT_PEC', property: 'scale', axis: 'y', range: [-0.1, 0.2] },
      { bone: 'LEFT_PEC', property: 'scale', axis: 'z', range: [-0.1, 0.3] },
      { bone: 'RIGHT_PEC', property: 'scale', axis: 'x', range: [-0.1, 0.2] },
      { bone: 'RIGHT_PEC', property: 'scale', axis: 'y', range: [-0.1, 0.2] },
      { bone: 'RIGHT_PEC', property: 'scale', axis: 'z', range: [-0.1, 0.3] },
    ],
  },
  {
    id: 'breast_gravity',
    label: 'Breast Gravity',
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
    drivers: [
      { bone: 'BELLY', property: 'scale', axis: 'x', range: [-0.08, 0.2] },
      { bone: 'BELLY', property: 'scale', axis: 'z', range: [-0.08, 0.25] },
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
  // DETAILS (7 params)
  // =========================================================================
  {
    id: 'butt_size',
    label: 'Butt Size',
    category: 'details',
    defaultValue: 40,
    drivers: [
      { bone: 'BUTT', property: 'scale', axis: 'x', range: [-0.06, 0.15] },
      { bone: 'BUTT', property: 'scale', axis: 'y', range: [-0.04, 0.1] },
      { bone: 'BUTT', property: 'scale', axis: 'z', range: [-0.06, 0.2] },
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
    drivers: [
      { bone: 'mHead', property: 'scale', axis: 'x', range: [-0.08, 0.08] },
      { bone: 'mHead', property: 'scale', axis: 'y', range: [-0.08, 0.08] },
      { bone: 'mHead', property: 'scale', axis: 'z', range: [-0.08, 0.08] },
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

  // =========================================================================
  // FACE: JAW & CHIN (3 params)
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

  // =========================================================================
  // FACE: NOSE (3 params)
  // =========================================================================
  {
    id: 'nose_width',
    label: 'Nose Width',
    category: 'face_nose',
    defaultValue: 50,
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

  // =========================================================================
  // FACE: EYES & BROWS (5 params)
  // =========================================================================
  {
    id: 'eye_spacing',
    label: 'Eye Spacing',
    category: 'face_eyes',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceEyeAltLeft', property: 'position', axis: 'x', range: [0.005, -0.005] },
      { bone: 'mFaceEyeAltRight', property: 'position', axis: 'x', range: [-0.005, 0.005] },
    ],
  },
  {
    id: 'eye_size',
    label: 'Eye Size',
    category: 'face_eyes',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceEyeAltLeft', property: 'scale', axis: 'x', range: [-0.12, 0.12] },
      { bone: 'mFaceEyeAltLeft', property: 'scale', axis: 'y', range: [-0.12, 0.12] },
      { bone: 'mFaceEyeAltRight', property: 'scale', axis: 'x', range: [-0.12, 0.12] },
      { bone: 'mFaceEyeAltRight', property: 'scale', axis: 'y', range: [-0.12, 0.12] },
    ],
  },
  {
    id: 'eye_depth',
    label: 'Eye Depth',
    category: 'face_eyes',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceEyeAltLeft', property: 'position', axis: 'z', range: [-0.004, 0.004] },
      { bone: 'mFaceEyeAltRight', property: 'position', axis: 'z', range: [-0.004, 0.004] },
    ],
  },
  {
    id: 'brow_height',
    label: 'Brow Height',
    category: 'face_eyes',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceEyebrowCenterLeft', property: 'position', axis: 'y', range: [-0.004, 0.004] },
      { bone: 'mFaceEyebrowCenterRight', property: 'position', axis: 'y', range: [-0.004, 0.004] },
      { bone: 'mFaceEyebrowInnerLeft', property: 'position', axis: 'y', range: [-0.004, 0.004] },
      { bone: 'mFaceEyebrowInnerRight', property: 'position', axis: 'y', range: [-0.004, 0.004] },
      { bone: 'mFaceEyebrowOuterLeft', property: 'position', axis: 'y', range: [-0.003, 0.003] },
      { bone: 'mFaceEyebrowOuterRight', property: 'position', axis: 'y', range: [-0.003, 0.003] },
    ],
  },
  {
    id: 'brow_ridge',
    label: 'Brow Ridge',
    category: 'face_eyes',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceForeheadCenter', property: 'position', axis: 'z', range: [-0.004, 0.004] },
      { bone: 'mFaceForeheadLeft', property: 'position', axis: 'z', range: [-0.003, 0.003] },
      { bone: 'mFaceForeheadRight', property: 'position', axis: 'z', range: [-0.003, 0.003] },
    ],
  },

  // =========================================================================
  // FACE: MOUTH & FOREHEAD (4 params)
  // =========================================================================
  {
    id: 'lip_width',
    label: 'Lip Width',
    category: 'face_mouth',
    defaultValue: 50,
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
    category: 'face_mouth',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceForeheadCenter', property: 'scale', axis: 'y', range: [-0.1, 0.1] },
      { bone: 'mFaceForeheadLeft', property: 'scale', axis: 'y', range: [-0.1, 0.1] },
      { bone: 'mFaceForeheadRight', property: 'scale', axis: 'y', range: [-0.1, 0.1] },
    ],
  },
  {
    id: 'forehead_slope',
    label: 'Forehead Slope',
    category: 'face_mouth',
    defaultValue: 50,
    drivers: [
      { bone: 'mFaceForeheadCenter', property: 'position', axis: 'y', range: [-0.004, 0.004] },
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
