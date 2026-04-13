import { SceneLoader } from '@babylonjs/core';
import type { Scene, AbstractMesh, Skeleton, TransformNode } from '@babylonjs/core';
import type { ClothingItem, ClothingSlot, EquippedClothing } from '../types/clothing.js';
import { createEmptyEquipped } from '../types/clothing.js';
import type { TextureCompositor } from './TextureCompositor.js';

/**
 * Manages OpenSim clothing: loading GLBs, equipping/unequipping,
 * and tracking what's currently worn per slot.
 *
 * Supports three clothing types:
 * - texture: composited onto body via TextureCompositor (layered baking)
 * - rigged: separate GLB sharing the SL skeleton
 * - fitted: rigged mesh weighted to collision volumes (auto-deforms with shape)
 *
 * For rigged/fitted mesh clothing, the GLB is loaded and parented to the
 * avatar root. The clothing shares the same skeleton, so shape parameter
 * changes automatically deform fitted mesh items.
 */
export class OpenSimClothingManager {
  private scene: Scene;
  private avatarRoot: TransformNode;
  private skeleton: Skeleton;
  private equipped: EquippedClothing = createEmptyEquipped();

  /** Loaded clothing meshes indexed by item ID */
  private loadedMeshes: Map<string, AbstractMesh[]> = new Map();

  /** Track which items are texture-type (for unequip routing) */
  private textureItems: Map<string, ClothingSlot> = new Map();

  /** Texture compositor for layered texture clothing */
  private compositor: TextureCompositor | null = null;

  /** Callback when equipped state changes */
  private onEquipChange: (() => void) | null = null;

  constructor(scene: Scene, avatarRoot: TransformNode, skeleton: Skeleton) {
    this.scene = scene;
    this.avatarRoot = avatarRoot;
    this.skeleton = skeleton;
    console.log('[ClothingMgr] Initialized');
  }

  setCompositor(compositor: TextureCompositor): void {
    this.compositor = compositor;
  }

  setOnEquipChange(cb: () => void): void {
    this.onEquipChange = cb;
  }

  getEquipped(): EquippedClothing {
    return { ...this.equipped };
  }

  getEquippedInSlot(slot: ClothingSlot): string | null {
    return this.equipped[slot];
  }

  /**
   * Equip a clothing item. Unequips whatever is currently in that slot first.
   */
  async equip(item: ClothingItem): Promise<boolean> {
    // Unequip current item in this slot
    if (this.equipped[item.slot]) {
      this.unequip(item.slot);
    }

    if (item.type === 'texture') {
      if (!this.compositor) {
        console.warn(`[ClothingMgr] TextureCompositor not connected`);
        return false;
      }
      try {
        await this.compositor.equipClothing(item.slot, item.asset);
        this.textureItems.set(item.id, item.slot);
        this.equipped[item.slot] = item.id;
        this.onEquipChange?.();
        return true;
      } catch (err) {
        console.error(`[ClothingMgr] Failed to composite "${item.name}":`, err);
        return false;
      }
    }

    // Load rigged/fitted mesh clothing GLB
    try {
      const result = await SceneLoader.ImportMeshAsync('', '', item.asset, this.scene);

      const meshes: AbstractMesh[] = [];
      for (const mesh of result.meshes) {
        if (mesh.name === '__root__') continue;

        // Parent to avatar root so it moves with the avatar
        mesh.parent = this.avatarRoot;

        // Bind to the avatar's skeleton for bone-driven deformation
        if (mesh.skeleton) {
          mesh.skeleton = this.skeleton;
        }

        meshes.push(mesh);
      }

      // Dispose the clothing's own skeleton (we're using the avatar's)
      for (const skel of result.skeletons) {
        if (skel !== this.skeleton) {
          skel.dispose();
        }
      }

      this.loadedMeshes.set(item.id, meshes);
      this.equipped[item.slot] = item.id;
      this.onEquipChange?.();

      console.log(
        `[ClothingMgr] Equipped "${item.name}" in ${item.slot} (${meshes.length} meshes)`,
      );
      return true;
    } catch (err) {
      console.error(`[ClothingMgr] Failed to load "${item.name}":`, err);
      return false;
    }
  }

  /**
   * Unequip the item in a given slot.
   */
  unequip(slot: ClothingSlot): void {
    const itemId = this.equipped[slot];
    if (!itemId) return;

    // Check if this was a texture-type item
    const texSlot = this.textureItems.get(itemId);
    if (texSlot !== undefined && this.compositor) {
      this.compositor.unequipClothing(texSlot);
      this.textureItems.delete(itemId);
    } else {
      // Mesh-type item
      const meshes = this.loadedMeshes.get(itemId);
      if (meshes) {
        for (const mesh of meshes) {
          mesh.dispose();
        }
        this.loadedMeshes.delete(itemId);
      }
    }

    this.equipped[slot] = null;
    this.onEquipChange?.();
    console.log(`[ClothingMgr] Unequipped ${slot}`);
  }

  /**
   * Unequip all slots.
   */
  unequipAll(): void {
    for (const slot of Object.keys(this.equipped) as ClothingSlot[]) {
      this.unequip(slot);
    }
  }

  dispose(): void {
    this.unequipAll();
    this.onEquipChange = null;
  }
}
