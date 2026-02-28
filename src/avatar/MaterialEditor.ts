import { Color3 } from '@babylonjs/core';
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
 * Skin and hair use HSL texture remapping (TextureRecolorizer) for
 * dramatic color changes that preserve baked detail.
 * Eyes and lips use simple albedoColor multiplication.
 */
export class MaterialEditor {
  private recolorizer = new TextureRecolorizer();
  private scene: Scene | null = null;

  private currentSkinHex: string | null = null;
  private currentHairHex: string | null = null;

  /**
   * Pre-cache original texture pixels for skin and hair materials.
   * Must be called after VRM load, before any color editing.
   */
  async initTextureCache(
    structure: VRMStructure,
    scene: Scene,
  ): Promise<void> {
    this.scene = scene;

    const skinMats = [
      ...structure.materialRefs.bodySkin,
      ...structure.materialRefs.faceSkin,
    ];
    const hairMats = structure.materialRefs.hair;

    for (const mat of skinMats) {
      if (mat.albedoTexture) {
        await this.recolorizer.cacheOriginalTexture(mat.name, mat.albedoTexture);
      }
    }
    for (const mat of hairMats) {
      if (mat.albedoTexture) {
        await this.recolorizer.cacheOriginalTexture(mat.name, mat.albedoTexture);
      }
    }

    const cached = skinMats.filter((m) => this.recolorizer.hasCached(m.name)).length
      + hairMats.filter((m) => this.recolorizer.hasCached(m.name)).length;
    console.log(`[MaterialEditor] Texture cache: ${cached} materials ready for HSL remapping`);
  }

  // ---------------------------------------------------------------------------
  // Skin — HSL texture remapping
  // ---------------------------------------------------------------------------

  async setSkinTone(structure: VRMStructure, hex: string): Promise<void> {
    this.currentSkinHex = hex;
    const target = TextureRecolorizer.hexToHSLTarget(hex);
    const mats = [
      ...structure.materialRefs.bodySkin,
      ...structure.materialRefs.faceSkin,
    ];

    for (const mat of mats) {
      if (this.recolorizer.hasCached(mat.name) && this.scene) {
        const tex = this.recolorizer.recolor(mat.name, target, this.scene);
        if (tex) {
          mat.albedoTexture = tex;
          mat.albedoColor = Color3.White();
        }
      } else {
        // Fallback for untextured materials
        mat.albedoColor.copyFrom(Color3.FromHexString(hex));
      }
    }
  }

  getSkinTone(): string | null {
    return this.currentSkinHex;
  }

  // ---------------------------------------------------------------------------
  // Hair — HSL texture remapping
  // ---------------------------------------------------------------------------

  async setHairColor(structure: VRMStructure, hex: string): Promise<void> {
    this.currentHairHex = hex;
    const target = TextureRecolorizer.hexToHSLTarget(hex);

    for (const mat of structure.materialRefs.hair) {
      if (this.recolorizer.hasCached(mat.name) && this.scene) {
        const tex = this.recolorizer.recolor(mat.name, target, this.scene);
        if (tex) {
          mat.albedoTexture = tex;
          mat.albedoColor = Color3.White();
        }
      } else {
        mat.albedoColor.copyFrom(Color3.FromHexString(hex));
      }
    }
  }

  getHairColor(): string | null {
    return this.currentHairHex;
  }

  // ---------------------------------------------------------------------------
  // Eyes & Lips — albedoColor multiplication (works fine for small areas)
  // ---------------------------------------------------------------------------

  setEyeColor(structure: VRMStructure, hex: string): void {
    this.applyColor(structure.materialRefs.eyeIris, Color3.FromHexString(hex));
  }

  setLipColor(structure: VRMStructure, hex: string): void {
    this.applyColor(structure.materialRefs.mouth, Color3.FromHexString(hex));
  }

  getEyeColor(structure: VRMStructure): string | null {
    return this.readColor(structure.materialRefs.eyeIris);
  }

  getLipColor(structure: VRMStructure): string | null {
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
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private applyColor(materials: PBRMaterial[], color: Color3): void {
    for (const mat of materials) {
      mat.albedoColor.copyFrom(color);
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
