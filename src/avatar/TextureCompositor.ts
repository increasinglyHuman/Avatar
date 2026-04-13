import { DynamicTexture } from '@babylonjs/core';
import type { Scene, PBRMaterial } from '@babylonjs/core';
import type { OpenSimStructure } from '../types/opensim.js';
import type { SkinMaterialManager } from './SkinMaterialManager.js';
import type { TextureTarget } from './TextureClothingCatalog.js';
import type { ClothingSlot } from '../types/clothing.js';

/**
 * Composites multiple texture layers (skin → underwear → shirt → jacket)
 * into a single baked texture per body region using an offscreen canvas.
 *
 * This mirrors the SL viewer's baked texture system:
 * - Each body region (upper, lower, head) gets one composited texture
 * - Layers are drawn bottom-to-top with alpha blending
 * - The final baked result is uploaded to the GPU as a single texture
 *
 * Layer order (bottom to top):
 *   skin → tattoo → underwear/undershirt → shirt/pants → jacket/skirt → socks/gloves
 */

/** Layer ordering — lower number = drawn first (behind) */
const LAYER_ORDER: Record<string, number> = {
  skin: 0,
  tattoo: 1,
  underwear: 2,
  undershirt: 2,
  socks: 3,
  shirt: 4,
  pants: 4,
  shoes: 4,
  gloves: 5,
  skirt: 5,
  jacket: 6,
};

/** Which body region each clothing slot targets */
const SLOT_TO_TARGET: Partial<Record<ClothingSlot, TextureTarget>> = {
  shirt: 'upper',
  jacket: 'upper',
  undershirt: 'upper',
  gloves: 'upper',
  pants: 'lower',
  skirt: 'lower',
  underwear: 'lower',
  socks: 'lower',
  shoes: 'lower',
};

/** Resolution for the composited baked texture */
const BAKE_RESOLUTION = 1024;

interface TextureLayer {
  slot: string;          // 'skin', 'shirt', 'jacket', etc.
  imagePath: string;     // URL/path to the texture PNG
  order: number;         // Draw order (lower = behind)
  image: HTMLImageElement | null;  // Loaded image (null until loaded)
}

export class TextureCompositor {
  private scene: Scene;
  private skinManager: SkinMaterialManager;

  /** Material groups per body region */
  private regionMats: Map<TextureTarget, PBRMaterial[]> = new Map();

  /** Active layers per body region, sorted by draw order */
  private layers: Map<TextureTarget, TextureLayer[]> = new Map([
    ['upper', []],
    ['lower', []],
    ['head', []],
  ]);

  /** Offscreen canvases for compositing (one per region) */
  private canvases: Map<TextureTarget, HTMLCanvasElement> = new Map();

  /** DynamicTextures applied to materials */
  private dynamicTextures: Map<TextureTarget, DynamicTexture> = new Map();

  constructor(scene: Scene, structure: OpenSimStructure, skinManager: SkinMaterialManager) {
    this.scene = scene;
    this.skinManager = skinManager;

    // Collect materials by region (same as TextureLayerManager)
    const materials = new Map<string, PBRMaterial>();
    for (const [, part] of structure.meshParts) {
      this.collectMaterials(part.mesh, materials);
    }

    const upper: PBRMaterial[] = [];
    const lower: PBRMaterial[] = [];
    const head: PBRMaterial[] = [];

    for (const [name, mat] of materials) {
      if (['mat_neck', 'mat_tank', 'mat_sleeves', 'mat_hands'].includes(name)) {
        upper.push(mat);
      } else if (['mat_shorts', 'mat_stockings', 'mat_feet'].includes(name)) {
        lower.push(mat);
      } else if (name === 'mat_head') {
        head.push(mat);
      }
    }

    this.regionMats.set('upper', upper);
    this.regionMats.set('lower', lower);
    this.regionMats.set('head', head);

    // Create offscreen canvases
    for (const region of ['upper', 'lower', 'head'] as TextureTarget[]) {
      const canvas = document.createElement('canvas');
      canvas.width = BAKE_RESOLUTION;
      canvas.height = BAKE_RESOLUTION;
      this.canvases.set(region, canvas);
    }

    // Set up initial skin layers
    this.initSkinLayers();

    console.log(
      `[Compositor] Ready: ${upper.length} upper, ${lower.length} lower, ${head.length} head mats`,
    );
  }

  /**
   * Initialize skin as the base layer for each region.
   */
  private initSkinLayers(): void {
    const upperSkin = this.skinManager.getActiveUpperSkin();
    const lowerSkin = this.skinManager.getActiveLowerSkin();
    const headSkin = this.skinManager.getActiveHeadSkin();

    if (upperSkin) this.setLayer('upper', 'skin', upperSkin);
    if (lowerSkin) this.setLayer('lower', 'skin', lowerSkin);
    if (headSkin) this.setLayer('head', 'skin', headSkin);
  }

  /**
   * Add or update a texture layer on a body region.
   */
  async setLayer(target: TextureTarget, slot: string, imagePath: string): Promise<void> {
    const layers = this.layers.get(target)!;
    const order = LAYER_ORDER[slot] ?? 10;

    // Remove existing layer for this slot
    const idx = layers.findIndex((l) => l.slot === slot);
    if (idx >= 0) layers.splice(idx, 1);

    // Load the image
    const image = await this.loadImage(imagePath);

    // Insert in order
    const layer: TextureLayer = { slot, imagePath, order, image };
    layers.push(layer);
    layers.sort((a, b) => a.order - b.order);

    // Re-composite
    this.composite(target);
  }

  /**
   * Remove a texture layer from a body region.
   */
  removeLayer(target: TextureTarget, slot: string): void {
    const layers = this.layers.get(target)!;
    const idx = layers.findIndex((l) => l.slot === slot);
    if (idx < 0) return;

    layers.splice(idx, 1);
    this.composite(target);
  }

  /**
   * Equip a clothing texture into the compositor.
   */
  async equipClothing(slot: ClothingSlot, imagePath: string): Promise<void> {
    const target = SLOT_TO_TARGET[slot];
    if (!target) {
      console.warn(`[Compositor] No target region for slot "${slot}"`);
      return;
    }
    await this.setLayer(target, slot, imagePath);
    console.log(`[Compositor] Equipped ${slot} on ${target}`);
  }

  /**
   * Unequip a clothing texture from the compositor.
   */
  unequipClothing(slot: ClothingSlot): void {
    const target = SLOT_TO_TARGET[slot];
    if (!target) return;
    this.removeLayer(target, slot);
    console.log(`[Compositor] Unequipped ${slot} from ${target}`);
  }

  /**
   * Update the skin base layer (called when skin changes in SkinTab).
   */
  async updateSkin(target: TextureTarget, skinPath: string): Promise<void> {
    await this.setLayer(target, 'skin', skinPath);
  }

  /**
   * Composite all layers for a region and apply to materials.
   */
  private composite(target: TextureTarget): void {
    const canvas = this.canvases.get(target)!;
    const ctx = canvas.getContext('2d')!;
    const layers = this.layers.get(target)!;

    // Clear to transparent
    ctx.clearRect(0, 0, BAKE_RESOLUTION, BAKE_RESOLUTION);

    // Draw layers bottom-to-top
    for (const layer of layers) {
      if (!layer.image) continue;
      ctx.drawImage(layer.image, 0, 0, BAKE_RESOLUTION, BAKE_RESOLUTION);
    }

    // Upload to GPU via DynamicTexture
    let dynTex = this.dynamicTextures.get(target);
    if (!dynTex) {
      dynTex = new DynamicTexture(
        `baked_${target}`,
        { width: BAKE_RESOLUTION, height: BAKE_RESOLUTION },
        this.scene,
        false, // no mip maps for now
      );
      this.dynamicTextures.set(target, dynTex);
    }

    // Copy our composited canvas to the DynamicTexture's canvas
    const dynCtx = dynTex.getContext();
    dynCtx.clearRect(0, 0, BAKE_RESOLUTION, BAKE_RESOLUTION);
    dynCtx.drawImage(canvas, 0, 0);
    dynTex.update(false); // invertY=false for GLB

    // Apply to all materials in this region
    const mats = this.regionMats.get(target) ?? [];
    for (const mat of mats) {
      mat.albedoTexture = dynTex;
    }
  }

  /**
   * Get the current layer stack for a region (for debugging/UI).
   */
  getLayerStack(target: TextureTarget): { slot: string; imagePath: string }[] {
    return (this.layers.get(target) ?? []).map((l) => ({
      slot: l.slot,
      imagePath: l.imagePath,
    }));
  }

  /**
   * Check which clothing slots are currently composited on a target.
   */
  getEquippedOnTarget(target: TextureTarget): string[] {
    return (this.layers.get(target) ?? [])
      .filter((l) => l.slot !== 'skin' && l.slot !== 'tattoo')
      .map((l) => l.slot);
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn(`[Compositor] Failed to load image: ${src}`);
        reject(new Error(`Failed to load: ${src}`));
      };
      img.src = src;
    });
  }

  private collectMaterials(
    mesh: import('@babylonjs/core').AbstractMesh,
    materials: Map<string, PBRMaterial>,
  ): void {
    if (!mesh.material) return;
    if ('subMaterials' in mesh.material) {
      const multi = mesh.material as { subMaterials: (PBRMaterial | null)[] };
      for (const sub of multi.subMaterials) {
        if (sub && 'albedoColor' in sub) materials.set(sub.name, sub);
      }
    } else if ('albedoColor' in mesh.material) {
      materials.set(mesh.material.name, mesh.material as PBRMaterial);
    }
  }

  dispose(): void {
    for (const tex of this.dynamicTextures.values()) {
      tex.dispose();
    }
    this.dynamicTextures.clear();
    this.canvases.clear();
    this.layers.clear();
    this.regionMats.clear();
  }
}
