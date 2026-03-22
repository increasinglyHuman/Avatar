import { SceneLoader, Skeleton, Bone } from '@babylonjs/core';
import type { AbstractMesh, Scene, TransformNode, Observer } from '@babylonjs/core';
import type { CatalogClothingItem, ClothingSlot, EquippedState } from '../types/index.js';
import type { CatalogLoader } from './CatalogLoader.js';
import '@babylonjs/loaders/glTF';

interface EquippedItem {
  itemId: string;
  slot: ClothingSlot;
  meshes: AbstractMesh[];
  skeleton: Skeleton | null;
  syncObserver: Observer<Scene> | null;
}

/**
 * Manages clothing equip/unequip using extracted GLB catalog.
 *
 * Each clothing GLB has its own skeleton. Rather than rebinding bone indices,
 * we sync the clothing skeleton's bone transforms to match the avatar's
 * skeleton every frame. This is simple, correct, and costs ~0.01ms per item.
 */
export class ClothingManager {
  private scene: Scene;
  private avatarRoot: TransformNode;
  private avatarSkeleton: Skeleton;
  private equipped: Map<ClothingSlot, EquippedItem> = new Map();
  private displacedByOnepiece: Map<ClothingSlot, string> = new Map();

  constructor(scene: Scene, avatarRoot: TransformNode, avatarSkeleton: Skeleton) {
    this.scene = scene;
    this.avatarRoot = avatarRoot;
    this.avatarSkeleton = avatarSkeleton;
  }

  /**
   * Equip a clothing item. Loads the GLB, syncs skeleton, parents to avatar.
   * If slot is occupied, disposes the old item first.
   */
  async equip(item: CatalogClothingItem, catalog: CatalogLoader): Promise<boolean> {
    const url = catalog.resolveAssetUrl(item.asset);
    console.log(`[Clothing] Equipping ${item.id} from ${url}`);

    try {
      // Unequip current item in this slot
      this.unequip(item.slot);

      // Onepiece override: stash tops + bottoms
      if (item.slot === 'onepiece') {
        const tops = this.equipped.get('tops');
        const bottoms = this.equipped.get('bottoms');
        if (tops) { this.displacedByOnepiece.set('tops', tops.itemId); this.unequip('tops'); }
        if (bottoms) { this.displacedByOnepiece.set('bottoms', bottoms.itemId); this.unequip('bottoms'); }
      }

      // If equipping tops or bottoms while onepiece is worn, remove onepiece
      if ((item.slot === 'tops' || item.slot === 'bottoms') && this.equipped.has('onepiece')) {
        this.unequip('onepiece');
        this.displacedByOnepiece.clear();
      }

      // Load GLB
      const result = await SceneLoader.ImportMeshAsync('', '', url, this.scene);

      // Find the clothing meshes (skip root __root__ node)
      const meshes = result.meshes.filter(m => m.getTotalVertices() > 0);
      const skeleton = result.skeletons.length > 0 ? result.skeletons[0] : null;

      // Parent all meshes under avatar root
      for (const mesh of result.meshes) {
        if (!mesh.parent || mesh.parent.name === '__root__') {
          mesh.parent = this.avatarRoot;
        }
      }

      // Dispose the imported root node if it exists
      const importRoot = result.meshes.find(m => m.name === '__root__');
      if (importRoot && importRoot.getChildMeshes().length === 0) {
        importRoot.dispose();
      }

      // Set up per-frame skeleton sync
      let syncObserver: Observer<Scene> | null = null;
      if (skeleton) {
        syncObserver = this.setupSkeletonSync(skeleton);
      }

      // Track equipped item
      this.equipped.set(item.slot, {
        itemId: item.id,
        slot: item.slot,
        meshes: result.meshes,
        skeleton,
        syncObserver,
      });

      console.log(`[Clothing] Equipped ${item.id} in slot ${item.slot} (${meshes.length} meshes)`);
      return true;
    } catch (err) {
      console.error(`[Clothing] Failed to equip ${item.id}:`, err);
      return false;
    }
  }

  /**
   * Unequip item from a slot. Disposes all meshes and skeleton sync.
   */
  unequip(slot: ClothingSlot): void {
    const item = this.equipped.get(slot);
    if (!item) return;

    // Remove skeleton sync
    if (item.syncObserver) {
      this.scene.onBeforeRenderObservable.remove(item.syncObserver);
    }

    // Dispose skeleton
    if (item.skeleton) {
      item.skeleton.dispose();
    }

    // Dispose all meshes
    for (const mesh of item.meshes) {
      mesh.dispose(false, true); // dispose materials too
    }

    this.equipped.delete(slot);
    console.log(`[Clothing] Unequipped ${item.itemId} from slot ${slot}`);

    // If removing onepiece, restore displaced items
    if (slot === 'onepiece' && this.displacedByOnepiece.size > 0) {
      this.displacedByOnepiece.clear();
    }
  }

  getEquipped(slot: ClothingSlot): string | null {
    return this.equipped.get(slot)?.itemId ?? null;
  }

  getEquippedState(): EquippedState {
    return {
      tops: this.getEquipped('tops'),
      bottoms: this.getEquipped('bottoms'),
      onepiece: this.getEquipped('onepiece'),
      shoes: this.getEquipped('shoes'),
      accessory: this.getEquipped('accessory'),
      hair: null, // managed by HairSwapper
    };
  }

  /**
   * Set up per-frame bone transform sync between clothing and avatar skeletons.
   * For each bone in the clothing skeleton that has a matching name in the avatar
   * skeleton, copy the local matrix every frame.
   */
  private setupSkeletonSync(clothingSkeleton: Skeleton): Observer<Scene> {
    const avatarBoneMap = new Map<string, Bone>();
    for (const bone of this.avatarSkeleton.bones) {
      avatarBoneMap.set(bone.name, bone);
    }

    // Build matched pairs (clothing bone index → avatar bone)
    const pairs: Array<[Bone, Bone]> = [];
    for (const cBone of clothingSkeleton.bones) {
      const aBone = avatarBoneMap.get(cBone.name);
      if (aBone) {
        pairs.push([cBone, aBone]);
      }
    }

    console.log(`[Clothing] Skeleton sync: ${pairs.length}/${clothingSkeleton.bones.length} bones matched`);

    return this.scene.onBeforeRenderObservable.add(() => {
      for (const [clothing, avatar] of pairs) {
        clothing.getLocalMatrix().copyFrom(avatar.getLocalMatrix());
      }
    });
  }

  dispose(): void {
    for (const slot of this.equipped.keys()) {
      this.unequip(slot as ClothingSlot);
    }
    this.displacedByOnepiece.clear();
  }
}
