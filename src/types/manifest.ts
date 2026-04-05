/**
 * Character Manifest v2 — complete serializable avatar state.
 * Used for outfit save/load, NEXUS persistence, and PostMessage communication.
 */

import type { ClothingSlot } from './clothing.js';

/** The full manifest representing a saved avatar appearance */
export interface AvatarManifest {
  version: 2;
  /** Base mesh identifier */
  base: 'ruth2-feminine' | 'roth2-masculine';
  /** Shape parameter values (param id → 0-100 slider value) */
  shapeParameters: Record<string, number>;
  /** Skin configuration */
  skin: SkinState;
  /** Material colors */
  colors: ColorState;
  /** Equipped clothing items (slot → item id, null = empty) */
  equipped: Record<ClothingSlot, string | null>;
  /** Outfit metadata */
  metadata: ManifestMetadata;
}

export interface SkinState {
  /** Active skin texture for each channel (path or null for default) */
  upperBody: string | null;
  lowerBody: string | null;
  head: string | null;
  /** Skin tint color (hex, #FFFFFF = no tint) */
  tint: string;
}

export interface ColorState {
  eyeColor: string;
  nailColor: string;
}

export interface ManifestMetadata {
  name: string;
  created: string;   // ISO date
  modified: string;  // ISO date
  /** Base64 data URL or asset path for thumbnail */
  thumbnail: string | null;
}

/** A saved outfit in the outfit gallery */
export interface SavedOutfit {
  id: string;
  manifest: AvatarManifest;
}
