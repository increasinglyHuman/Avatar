import type { PBRMaterial, AbstractMesh } from '@babylonjs/core';

// ---------------------------------------------------------------------------
// Core app types (Sprint 0)
// ---------------------------------------------------------------------------

export type AvatarState = 'idle' | 'loading' | 'running' | 'disposed';

export interface AvatarConfig {
  label: string;
  modelPath: string;
  showSidebar: boolean;
}

export interface AvatarSpawnPayload {
  modelPath?: string;
  label?: string;
  manifest?: Record<string, unknown>;
}

export const AVATAR_DEFAULTS: AvatarConfig = {
  label: 'Avatar Dev',
  modelPath: 'assets/nude-feminine.vrm',
  showSidebar: true,
};

// ---------------------------------------------------------------------------
// VRM structure types (Sprint 1)
// ---------------------------------------------------------------------------

/** Primitive type classification from VRoid material naming convention */
export type PrimType =
  | 'skin'
  | 'face_skin'
  | 'eye_iris'
  | 'eye_highlight'
  | 'eye_white'
  | 'mouth'
  | 'brow'
  | 'lash'
  | 'eyeline'
  | 'hair'
  | 'cloth'
  | 'unknown';

export type ClothingMode = 'A' | 'B' | 'nude';
export type AvatarGender = 'feminine' | 'masculine';

/** Information about a single mesh primitive */
export interface PrimInfo {
  name: string;
  type: PrimType;
  material: PBRMaterial;
  mesh: AbstractMesh;
  vertexCount: number;
}

/** Pre-resolved material references for fast color access */
export interface MaterialRefs {
  bodySkin: PBRMaterial[];
  faceSkin: PBRMaterial[];
  eyeIris: PBRMaterial[];
  hair: PBRMaterial[];
  mouth: PBRMaterial[];
}

/** Result of VRM structural analysis */
export interface VRMStructure {
  clothingMode: ClothingMode;
  gender: AvatarGender;
  bodyPrimitives: PrimInfo[];
  facePrimitives: PrimInfo[];
  hairPrimitives: PrimInfo[];
  clothPrimitives: PrimInfo[];
  morphTargetNames: string[];
  materialRefs: MaterialRefs;
}

/** Snapshot of a single material's color state */
export interface MaterialColorSnapshot {
  name: string;
  albedoHex: string;
}

/** Full snapshot of all editable material colors for undo/restore */
export interface MaterialSnapshot {
  skin: MaterialColorSnapshot[];
  eyes: MaterialColorSnapshot[];
  hair: MaterialColorSnapshot[];
  lips: MaterialColorSnapshot[];
  /** Hex used for HSL texture remapping (skin). */
  skinSourceHex?: string;
  /** Hex used for HSL texture remapping (hair). */
  hairSourceHex?: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Color presets (from DRESSING_ROOM_SPEC)
// ---------------------------------------------------------------------------

export interface ColorPreset {
  name: string;
  color: string;
}

export interface SkinPreset {
  name: string;
  baseColor: string;
  shadeColor: string;
}

export const SKIN_PRESETS: SkinPreset[] = [
  { name: 'Porcelain', baseColor: '#FCE4D8', shadeColor: '#CAB6AD' },
  { name: 'Light Cool', baseColor: '#F0D0C0', shadeColor: '#C0A898' },
  { name: 'Light Warm', baseColor: '#F5D0B0', shadeColor: '#C4A68C' },
  { name: 'Medium', baseColor: '#D4A574', shadeColor: '#A8845D' },
  { name: 'Medium Olive', baseColor: '#C49A6C', shadeColor: '#9D7B56' },
  { name: 'Tan', baseColor: '#B07848', shadeColor: '#8C603A' },
  { name: 'Dark', baseColor: '#8B5E3C', shadeColor: '#6F4B30' },
  { name: 'Deep', baseColor: '#6B4226', shadeColor: '#56351E' },
];

export const EYE_PRESETS: ColorPreset[] = [
  { name: 'Brown', color: '#6B4226' },
  { name: 'Blue', color: '#4A90D9' },
  { name: 'Green', color: '#5B8C5A' },
  { name: 'Hazel', color: '#8B7355' },
  { name: 'Grey', color: '#8B8B8B' },
  { name: 'Violet', color: '#8B5DAA' },
];

export const HAIR_PRESETS: ColorPreset[] = [
  { name: 'Black', color: '#1A1A1A' },
  { name: 'Dark Brown', color: '#3B2214' },
  { name: 'Brown', color: '#6B4226' },
  { name: 'Auburn', color: '#8B3A1A' },
  { name: 'Blonde', color: '#C8A862' },
  { name: 'Platinum', color: '#E8DCC8' },
  { name: 'Red', color: '#A02020' },
  { name: 'Pink', color: '#D4608A' },
];

export const LIP_PRESETS: ColorPreset[] = [
  { name: 'Natural', color: '#C08070' },
  { name: 'Red', color: '#B02020' },
  { name: 'Pink', color: '#D06080' },
  { name: 'Berry', color: '#803050' },
  { name: 'Nude', color: '#C4A088' },
  { name: 'Bold', color: '#800030' },
];
