/**
 * OpenSim clothing slot and catalog types (Phase 3).
 */

/** Clothing slot categories matching SL/OpenSim system */
export type ClothingSlot =
  | 'underwear'
  | 'undershirt'
  | 'shirt'
  | 'jacket'
  | 'pants'
  | 'skirt'
  | 'socks'
  | 'shoes'
  | 'gloves'
  | 'hair'
  | 'hat'
  | 'accessory';

/** How the clothing item is applied */
export type ClothingType =
  | 'texture'    // Composited onto body texture (underwear, socks, body paint)
  | 'rigged'     // Separate GLB rigged to SL skeleton
  | 'fitted';    // Rigged mesh weighted to collision volumes (auto-deforms with shape)

/** Body regions that can be alpha-masked when clothing covers them */
export type AlphaRegion =
  | 'upper_body'
  | 'lower_body'
  | 'head'
  | 'hands'
  | 'feet';

/** A single clothing item in the catalog */
export interface ClothingItem {
  id: string;
  name: string;
  slot: ClothingSlot;
  type: ClothingType;
  /** Path to GLB (rigged/fitted) or texture PNG (texture type) */
  asset: string;
  /** 256×256 preview thumbnail */
  thumbnail: string;
  /** Body regions to hide when this item is equipped */
  alphaRegions: AlphaRegion[];
  /** Compatible base meshes */
  compatibleBases: ('ruth2' | 'roth2' | 'both')[];
  /** Tags for filtering/search */
  tags: string[];
  /** Whether the user can modify colors/tint */
  modifiable: boolean;
}

/** The full clothing catalog */
export interface ClothingCatalog {
  version: number;
  generated: string;
  items: ClothingItem[];
}

/** Current equipped state — one item per slot (null = empty) */
export type EquippedClothing = Record<ClothingSlot, string | null>;

/** Create an empty equipped state */
export function createEmptyEquipped(): EquippedClothing {
  return {
    underwear: null,
    undershirt: null,
    shirt: null,
    jacket: null,
    pants: null,
    skirt: null,
    socks: null,
    shoes: null,
    gloves: null,
    hair: null,
    hat: null,
    accessory: null,
  };
}
