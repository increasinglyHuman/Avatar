import { Color3, Texture } from '@babylonjs/core';
import type { PBRMaterial, Scene } from '@babylonjs/core';
import type {
  VRMStructure,
  MaterialSnapshot,
  MaterialColorSnapshot,
} from '../types/index.js';
import { TextureRecolorizer } from './TextureRecolorizer.js';

/**
 * Material color editor for VRM avatars.
 *
 * All slots use HSL texture remapping with intensity and tint controls.
 * Falls back to albedoColor for untextured materials.
 */
export class MaterialEditor {
  private recolorizer = new TextureRecolorizer();
  private scene: Scene | null = null;

  private currentSkinHex: string | null = null;
  private currentHairHex: string | null = null;
  private currentEyeHex: string | null = null;
  private currentLipHex: string | null = null;

  /**
   * Pre-cache original texture pixels for all editable materials.
   * Must be called after VRM load, before any color editing.
   */
  async initTextureCache(
    structure: VRMStructure,
    scene: Scene,
  ): Promise<void> {
    this.scene = scene;

    const allMats: PBRMaterial[] = [
      ...structure.materialRefs.bodySkin,
      ...structure.materialRefs.faceSkin,
      ...structure.materialRefs.hair,
      ...structure.materialRefs.eyeIris,
      ...structure.materialRefs.mouth,
    ];

    for (const mat of allMats) {
      if (mat.albedoTexture instanceof Texture) {
        await this.recolorizer.cacheOriginalTexture(mat.name, mat.albedoTexture);
      }
    }

    const cached = allMats.filter((m) => this.recolorizer.hasCached(m.name)).length;
    console.log(`[MaterialEditor] Texture cache: ${cached}/${allMats.length} materials ready for HSL remapping`);
  }

  // ---------------------------------------------------------------------------
  // Skin
  // ---------------------------------------------------------------------------

  async setSkinTone(
    structure: VRMStructure, hex: string,
    intensity = 1.0, tint = 0,
  ): Promise<void> {
    this.currentSkinHex = hex;
    const mats = [
      ...structure.materialRefs.bodySkin,
      ...structure.materialRefs.faceSkin,
    ];
    await this.hslRecolorSlot(mats, hex, intensity, tint);
  }

  getSkinTone(): string | null {
    return this.currentSkinHex;
  }

  // ---------------------------------------------------------------------------
  // Hair
  // ---------------------------------------------------------------------------

  async setHairColor(
    structure: VRMStructure, hex: string,
    intensity = 1.0, tint = 0,
  ): Promise<void> {
    this.currentHairHex = hex;
    await this.hslRecolorSlot(structure.materialRefs.hair, hex, intensity, tint);
  }

  getHairColor(): string | null {
    return this.currentHairHex;
  }

  // ---------------------------------------------------------------------------
  // Eyes
  // ---------------------------------------------------------------------------

  async setEyeColor(
    structure: VRMStructure, hex: string,
    intensity = 1.0, tint = 0,
  ): Promise<void> {
    this.currentEyeHex = hex;
    await this.hslRecolorSlot(structure.materialRefs.eyeIris, hex, intensity, tint);
  }

  getEyeColor(structure: VRMStructure): string | null {
    if (this.currentEyeHex) return this.currentEyeHex;
    return this.readColor(structure.materialRefs.eyeIris);
  }

  // ---------------------------------------------------------------------------
  // Lips
  // ---------------------------------------------------------------------------

  async setLipColor(
    structure: VRMStructure, hex: string,
    intensity = 1.0, tint = 0,
  ): Promise<void> {
    this.currentLipHex = hex;
    await this.hslRecolorSlot(structure.materialRefs.mouth, hex, intensity, tint);
  }

  getLipColor(structure: VRMStructure): string | null {
    if (this.currentLipHex) return this.currentLipHex;
    return this.readColor(structure.materialRefs.mouth);
  }

  // ---------------------------------------------------------------------------
  // Snapshot / Restore
  // ---------------------------------------------------------------------------

  snapshot(structure: VRMStructure): MaterialSnapshot {
    return {
      skin: this.snapshotSlot(structure.materialRefs.bodySkin)
        .concat(this.snapshotSlot(structure.materialRefs.faceSkin)),
      eyes: this.snapshotSlot(structure.materialRefs.eyeIris),
      hair: this.snapshotSlot(structure.materialRefs.hair),
      lips: this.snapshotSlot(structure.materialRefs.mouth),
      skinSourceHex: this.currentSkinHex ?? undefined,
      hairSourceHex: this.currentHairHex ?? undefined,
      timestamp: Date.now(),
    };
  }

  async restore(
    structure: VRMStructure,
    snap: MaterialSnapshot,
  ): Promise<void> {
    if (snap.skinSourceHex) {
      await this.setSkinTone(structure, snap.skinSourceHex);
    } else {
      this.restoreSlot(
        [...structure.materialRefs.bodySkin, ...structure.materialRefs.faceSkin],
        snap.skin,
      );
    }

    if (snap.hairSourceHex) {
      await this.setHairColor(structure, snap.hairSourceHex);
    } else {
      this.restoreSlot(structure.materialRefs.hair, snap.hair);
    }

    this.restoreSlot(structure.materialRefs.eyeIris, snap.eyes);
    this.restoreSlot(structure.materialRefs.mouth, snap.lips);
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  dispose(): void {
    this.recolorizer.dispose();
    this.scene = null;
    this.currentSkinHex = null;
    this.currentHairHex = null;
    this.currentEyeHex = null;
    this.currentLipHex = null;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async hslRecolorSlot(
    materials: PBRMaterial[], hex: string,
    intensity: number, tint: number,
  ): Promise<void> {
    const target = TextureRecolorizer.hexToHSLTarget(hex);

    for (const mat of materials) {
      if (this.recolorizer.hasCached(mat.name) && this.scene) {
        const tex = this.recolorizer.recolor(mat.name, target, this.scene, intensity, tint);
        if (tex) {
          mat.albedoTexture = tex;
          mat.albedoColor = Color3.White();
        }
      } else {
        mat.albedoColor.copyFrom(Color3.FromHexString(hex));
      }
    }
  }

  private readColor(materials: PBRMaterial[]): string | null {
    if (materials.length === 0) return null;
    return materials[0].albedoColor.toHexString();
  }

  private snapshotSlot(materials: PBRMaterial[]): MaterialColorSnapshot[] {
    return materials.map((mat) => ({
      name: mat.name,
      albedoHex: mat.albedoColor.toHexString(),
    }));
  }

  private restoreSlot(
    materials: PBRMaterial[],
    snapshots: MaterialColorSnapshot[],
  ): void {
    for (const snap of snapshots) {
      const mat = materials.find((m) => m.name === snap.name);
      if (mat) {
        mat.albedoColor.copyFrom(Color3.FromHexString(snap.albedoHex));
      }
    }
  }
}
