import { Color3 } from '@babylonjs/core';
import type {
  VRMStructure,
  MaterialSnapshot,
  MaterialColorSnapshot,
} from '../types/index.js';
import type { PBRMaterial } from '@babylonjs/core';

/**
 * Stateless material color editor for VRM avatars.
 * All methods take VRMStructure as parameter — no stored refs.
 */
export class MaterialEditor {
  setSkinTone(structure: VRMStructure, hex: string): void {
    const color = Color3.FromHexString(hex);
    this.applyColor(structure.materialRefs.bodySkin, color);
    this.applyColor(structure.materialRefs.faceSkin, color);
  }

  setEyeColor(structure: VRMStructure, hex: string): void {
    this.applyColor(structure.materialRefs.eyeIris, Color3.FromHexString(hex));
  }

  setHairColor(structure: VRMStructure, hex: string): void {
    this.applyColor(structure.materialRefs.hair, Color3.FromHexString(hex));
  }

  setLipColor(structure: VRMStructure, hex: string): void {
    this.applyColor(structure.materialRefs.mouth, Color3.FromHexString(hex));
  }

  getSkinTone(structure: VRMStructure): string | null {
    return this.readColor(structure.materialRefs.bodySkin);
  }

  getEyeColor(structure: VRMStructure): string | null {
    return this.readColor(structure.materialRefs.eyeIris);
  }

  getHairColor(structure: VRMStructure): string | null {
    return this.readColor(structure.materialRefs.hair);
  }

  getLipColor(structure: VRMStructure): string | null {
    return this.readColor(structure.materialRefs.mouth);
  }

  snapshot(structure: VRMStructure): MaterialSnapshot {
    return {
      skin: this.snapshotSlot(structure.materialRefs.bodySkin)
        .concat(this.snapshotSlot(structure.materialRefs.faceSkin)),
      eyes: this.snapshotSlot(structure.materialRefs.eyeIris),
      hair: this.snapshotSlot(structure.materialRefs.hair),
      lips: this.snapshotSlot(structure.materialRefs.mouth),
      timestamp: Date.now(),
    };
  }

  restore(structure: VRMStructure, snap: MaterialSnapshot): void {
    this.restoreSlot(
      [...structure.materialRefs.bodySkin, ...structure.materialRefs.faceSkin],
      snap.skin,
    );
    this.restoreSlot(structure.materialRefs.eyeIris, snap.eyes);
    this.restoreSlot(structure.materialRefs.hair, snap.hair);
    this.restoreSlot(structure.materialRefs.mouth, snap.lips);
  }

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
