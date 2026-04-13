import type { ShapeParameterDriver } from './ShapeParameterDriver.js';
import type { SkinMaterialManager } from './SkinMaterialManager.js';
import type { OpenSimClothingManager } from './OpenSimClothingManager.js';
import type { OpenSimCatalog } from './OpenSimCatalog.js';
import type { AvatarManifest, SkinState, ColorState } from '../types/manifest.js';
import type { ClothingSlot } from '../types/clothing.js';
import { SHAPE_PARAMETERS } from './ShapeParameterDefinitions.js';

/**
 * Serializes and deserializes the complete avatar state to/from a manifest.
 * Used for outfit save/load, NEXUS sync, and PostMessage communication.
 *
 * Capture: reads current state from all subsystems → AvatarManifest JSON
 * Restore: applies AvatarManifest JSON → updates all subsystems
 */
export class ManifestSerializer {
  private shapeDriver: ShapeParameterDriver;
  private skinManager: SkinMaterialManager;
  private clothingManager: OpenSimClothingManager;
  private catalog: OpenSimCatalog;

  constructor(
    shapeDriver: ShapeParameterDriver,
    skinManager: SkinMaterialManager,
    clothingManager: OpenSimClothingManager,
    catalog: OpenSimCatalog,
  ) {
    this.shapeDriver = shapeDriver;
    this.skinManager = skinManager;
    this.clothingManager = clothingManager;
    this.catalog = catalog;
  }

  /**
   * Capture the current avatar state as a manifest.
   */
  capture(name: string = 'Untitled'): AvatarManifest {
    // Shape parameters
    const shapeParameters: Record<string, number> = {};
    const allValues = this.shapeDriver.getAllValues();
    for (const [id, value] of allValues) {
      shapeParameters[id] = value;
    }

    // Skin state
    const skin: SkinState = {
      upperBody: this.skinManager.getActiveUpperSkin(),
      lowerBody: this.skinManager.getActiveLowerSkin(),
      head: this.skinManager.getActiveHeadSkin(),
      tint: this.skinManager.getSkinTint(),
    };

    // Colors
    const colors: ColorState = {
      eyeColor: this.skinManager.getEyeColor(),
      nailColor: this.skinManager.getNailColor(),
    };

    // Equipped clothing
    const equipped = this.clothingManager.getEquipped() as Record<ClothingSlot, string | null>;

    const now = new Date().toISOString();

    return {
      version: 2,
      base: 'ruth2-feminine',
      shapeParameters,
      skin,
      colors,
      equipped,
      metadata: {
        name,
        created: now,
        modified: now,
        thumbnail: null,
      },
    };
  }

  /**
   * Restore avatar state from a manifest.
   * Applies shape, skin, colors, and clothing.
   */
  async restore(manifest: AvatarManifest): Promise<void> {
    // 1. Shape parameters — set all at once for efficiency
    const shapeValues: Record<string, number> = {};
    for (const param of SHAPE_PARAMETERS) {
      shapeValues[param.id] = manifest.shapeParameters[param.id] ?? param.defaultValue;
    }
    this.shapeDriver.setValues(shapeValues);

    // 2. Skin textures
    if (manifest.skin.upperBody) {
      this.skinManager.setUpperBodySkin(manifest.skin.upperBody);
    }
    if (manifest.skin.lowerBody) {
      this.skinManager.setLowerBodySkin(manifest.skin.lowerBody);
    }
    if (manifest.skin.head) {
      this.skinManager.setHeadSkin(manifest.skin.head);
    }
    if (manifest.skin.tint) {
      this.skinManager.setSkinTint(manifest.skin.tint);
    }

    // 3. Colors
    if (manifest.colors.eyeColor) {
      this.skinManager.setEyeColor(manifest.colors.eyeColor);
    }
    if (manifest.colors.nailColor) {
      this.skinManager.setNailColor(manifest.colors.nailColor);
    }

    // 4. Clothing — unequip all first, then re-equip from manifest
    this.clothingManager.unequipAll();

    if (manifest.equipped) {
      for (const [slot, itemId] of Object.entries(manifest.equipped)) {
        if (!itemId) continue;
        const item = this.catalog.getById(itemId);
        if (item) {
          await this.clothingManager.equip(item);
        } else {
          console.warn(`[Manifest] Clothing item not found in catalog: ${itemId} (${slot})`);
        }
      }
    }

    console.log(`[Manifest] Restored: "${manifest.metadata.name}"`);
  }
}
