import { Texture, Color3 } from '@babylonjs/core';
import type { Scene, PBRMaterial, AbstractMesh } from '@babylonjs/core';
import type { OpenSimStructure } from '../types/opensim.js';

/**
 * Manages Ruth2/Roth2 skin materials: texture swaps, color tinting,
 * eye/nail/lip color adjustments.
 *
 * Material layout (auto-detects Ruth2 or Roth2 naming):
 *   Ruth2: mat_neck/mat_tank/mat_sleeves/mat_hands, mat_shorts/mat_stockings/mat_feet, mat_head, mat_eyeball
 *   Roth2: Neck/Vest/Sleeves/Gloves, Trousers/Feet, Ears/Mouth/Lips/HighNeck/SkiMask, Eyeball
 */
export class SkinMaterialManager {
  private scene: Scene;
  private materials: Map<string, PBRMaterial> = new Map();

  /** Grouped material references by body region */
  private upperBodyMats: PBRMaterial[] = [];
  private lowerBodyMats: PBRMaterial[] = [];
  private headMats: PBRMaterial[] = [];
  private eyeMats: PBRMaterial[] = [];
  private nailMainMats: PBRMaterial[] = [];
  private nailTipMats: PBRMaterial[] = [];
  private nailSkinMats: PBRMaterial[] = [];

  /** Current state tracking */
  private currentSkinTint: Color3 = Color3.White();
  private currentEyeColor = '#4A7DB5';
  private currentNailColor = '#DDB8A0';
  private activeUpperSkin: string | null = null;
  private activeLowerSkin: string | null = null;
  private activeHeadSkin: string | null = null;
  private activeEyeTexture: string | null = null;

  constructor(scene: Scene, structure: OpenSimStructure) {
    this.scene = scene;

    // Collect all PBR materials from visible meshes
    for (const [, part] of structure.meshParts) {
      this.collectMaterials(part.mesh);
    }

    // Classify by name — try Ruth2 names first, then Roth2 names
    // Ruth2: mat_neck, mat_tank, mat_sleeves, mat_hands, mat_shorts, mat_stockings, mat_feet, mat_head, mat_eyeball
    // Roth2: Neck, Vest, Sleeves, Gloves, Trousers, Feet, Ears, Mouth, Lips, HighNeck, SkiMask, Eyeball
    const RUTH2_UPPER = new Set(['mat_neck', 'mat_tank', 'mat_sleeves', 'mat_hands']);
    const RUTH2_LOWER = new Set(['mat_shorts', 'mat_stockings', 'mat_feet']);
    const RUTH2_HEAD = new Set(['mat_head']);
    const RUTH2_EYE = new Set(['mat_eyeball']);

    const ROTH2_UPPER = new Set(['Neck', 'Vest', 'Sleeves', 'Gloves']);
    const ROTH2_LOWER = new Set(['Trousers', 'Feet']);
    const ROTH2_HEAD = new Set(['Ears', 'Mouth', 'Lips', 'HighNeck', 'SkiMask']);
    const ROTH2_EYE = new Set(['Eyeball', 'Eyes']);

    for (const [name, mat] of this.materials) {
      // Ruth2 names
      if (RUTH2_UPPER.has(name)) { this.upperBodyMats.push(mat); }
      else if (RUTH2_LOWER.has(name)) { this.lowerBodyMats.push(mat); }
      else if (RUTH2_HEAD.has(name)) { this.headMats.push(mat); }
      else if (RUTH2_EYE.has(name)) { this.eyeMats.push(mat); }
      else if (name.startsWith('mat_nail_main')) { this.nailMainMats.push(mat); }
      else if (name.startsWith('mat_nail_tip')) { this.nailTipMats.push(mat); }
      else if (name.startsWith('mat_nail_skinmatch')) { this.nailSkinMats.push(mat); }
      // Roth2 names
      else if (ROTH2_UPPER.has(name)) { this.upperBodyMats.push(mat); }
      else if (ROTH2_LOWER.has(name)) { this.lowerBodyMats.push(mat); }
      else if (ROTH2_HEAD.has(name)) { this.headMats.push(mat); }
      else if (ROTH2_EYE.has(name)) { this.eyeMats.push(mat); }
    }

    console.log(
      `[SkinMaterial] Classified: ${this.upperBodyMats.length} upper, ` +
      `${this.lowerBodyMats.length} lower, ${this.headMats.length} head, ` +
      `${this.eyeMats.length} eye, ${this.nailMainMats.length + this.nailTipMats.length} nail`,
    );

    // Diagnostic: compare PBR properties across all skin materials
    const allSkin = [...this.upperBodyMats, ...this.lowerBodyMats, ...this.headMats];
    console.log('[SkinMaterial] === PBR PROPERTY COMPARISON ===');
    for (const mat of allSkin) {
      console.log(
        `  "${mat.name}" — metallic=${mat.metallic} roughness=${mat.roughness} ` +
        `albedoColor=${mat.albedoColor?.toString()} ` +
        `reflectivityColor=${mat.reflectivityColor?.toString()} ` +
        `emissiveColor=${mat.emissiveColor?.toString()} ` +
        `ambientColor=${mat.ambientColor?.toString()} ` +
        `alpha=${mat.alpha} backFaceCulling=${mat.backFaceCulling} ` +
        `hasTexture=${!!mat.albedoTexture}`,
      );
    }
    console.log('[SkinMaterial] === END PBR COMPARISON ===');

    // Apply default skin set (Pleiades)
    this.setUpperBodySkin('assets/upper-drafts/pleiades_upperBody.png');
    this.setLowerBodySkin('assets/lower-drafts/pleiades_lower.png');
    this.setHeadSkin('assets/heads-draft/pleiades_face04.png');

    // Clear the GLB's default eye texture so color tinting works cleanly
    for (const mat of this.eyeMats) {
      mat.albedoTexture = null;
    }
    this.setEyeColor(this.currentEyeColor);

    // Hide eyelash mesh (renders white with no texture assigned)
    for (const [, part] of structure.meshParts) {
      if (part.mesh.name.toLowerCase().includes('eyelash')) {
        part.mesh.isVisible = false;
      }
    }

    console.log('[SkinMaterial] Default skin applied: Pleiades set');
  }

  /**
   * Swap the upper body skin texture across all upper body materials.
   * @param texturePath Path to the new skin texture (relative to base URL)
   */
  setUpperBodySkin(texturePath: string): void {
    const tex = new Texture(texturePath, this.scene, false, false);
    for (const mat of this.upperBodyMats) {
      mat.albedoTexture = tex;
    }
    this.activeUpperSkin = texturePath;
    console.log(`[SkinMaterial] Upper body skin → ${texturePath}`);
  }

  /**
   * Swap the lower body skin texture.
   */
  setLowerBodySkin(texturePath: string): void {
    const tex = new Texture(texturePath, this.scene, false, false);
    for (const mat of this.lowerBodyMats) {
      mat.albedoTexture = tex;
    }
    this.activeLowerSkin = texturePath;
    console.log(`[SkinMaterial] Lower body skin → ${texturePath}`);
  }

  /**
   * Swap the head skin texture.
   */
  setHeadSkin(texturePath: string): void {
    const tex = new Texture(texturePath, this.scene, false, false);
    for (const mat of this.headMats) {
      mat.albedoTexture = tex;
    }
    this.activeHeadSkin = texturePath;
    console.log(`[SkinMaterial] Head skin → ${texturePath}`);
  }

  /**
   * Apply a color tint to all body skin materials (upper + lower + head).
   * White = no tint (original texture). Colored = multiply blend.
   */
  setSkinTint(hex: string): void {
    const color = Color3.FromHexString(hex);
    this.currentSkinTint = color;
    const allSkin = [...this.upperBodyMats, ...this.lowerBodyMats, ...this.headMats];
    for (const mat of allSkin) {
      mat.albedoColor = color;
    }
  }

  getSkinTint(): string {
    return this.currentSkinTint.toHexString();
  }

  /**
   * Set eye iris color. Tints the eyeball material.
   */
  setEyeColor(hex: string): void {
    const color = Color3.FromHexString(hex);
    this.currentEyeColor = hex;
    for (const mat of this.eyeMats) {
      mat.albedoColor = color;
    }
  }

  getEyeColor(): string { return this.currentEyeColor; }

  /**
   * Set eye iris texture (replaces the eyeball texture with an iris map).
   * Resets eye color tint to white so the texture shows true colors.
   */
  setEyeTexture(texturePath: string): void {
    const tex = new Texture(texturePath, this.scene, false, false);
    for (const mat of this.eyeMats) {
      mat.albedoTexture = tex;
      mat.albedoColor = Color3.White(); // Don't tint over the texture
    }
    this.activeEyeTexture = texturePath;
    console.log(`[SkinMaterial] Eye texture → ${texturePath}`);
  }

  /**
   * Clear eye texture, reverting to color-tint mode.
   */
  clearEyeTexture(): void {
    for (const mat of this.eyeMats) {
      mat.albedoTexture = null;
    }
    this.activeEyeTexture = null;
    this.setEyeColor(this.currentEyeColor);
  }

  getActiveEyeTexture(): string | null { return this.activeEyeTexture; }

  /**
   * Set nail polish color (main nail body).
   */
  setNailColor(hex: string): void {
    const color = Color3.FromHexString(hex);
    this.currentNailColor = hex;
    for (const mat of this.nailMainMats) {
      mat.albedoColor = color;
    }
  }

  getNailColor(): string { return this.currentNailColor; }

  getActiveUpperSkin(): string | null { return this.activeUpperSkin; }
  getActiveLowerSkin(): string | null { return this.activeLowerSkin; }
  getActiveHeadSkin(): string | null { return this.activeHeadSkin; }

  /**
   * Set nail tip color (for French manicure style).
   */
  setNailTipColor(hex: string): void {
    const color = Color3.FromHexString(hex);
    for (const mat of this.nailTipMats) {
      mat.albedoColor = color;
    }
  }

  /**
   * Match nail skin-match material to current skin tint.
   * This is the nail bed area that should blend with skin.
   */
  matchNailsToSkin(): void {
    for (const mat of this.nailSkinMats) {
      mat.albedoColor = this.currentSkinTint.clone();
    }
  }

  private collectMaterials(mesh: AbstractMesh): void {
    if (!mesh.material) return;

    if ('subMaterials' in mesh.material) {
      // MultiMaterial — iterate sub-materials
      const multi = mesh.material as { subMaterials: (PBRMaterial | null)[] };
      for (const sub of multi.subMaterials) {
        if (sub && 'albedoColor' in sub) {
          this.materials.set(sub.name, sub);
        }
      }
    } else if ('albedoColor' in mesh.material) {
      this.materials.set(mesh.material.name, mesh.material as PBRMaterial);
    }
  }

  dispose(): void {
    this.materials.clear();
    this.upperBodyMats = [];
    this.lowerBodyMats = [];
    this.headMats = [];
    this.eyeMats = [];
    this.nailMainMats = [];
    this.nailTipMats = [];
    this.nailSkinMats = [];
  }
}
