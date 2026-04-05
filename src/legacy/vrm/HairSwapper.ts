import { SceneLoader, Skeleton, Bone } from '@babylonjs/core';
import type { AbstractMesh, Scene, TransformNode, Observer } from '@babylonjs/core';
import type { CatalogHairItem } from '../../types/index.js';
import type { CatalogLoader } from './CatalogLoader.js';
import type { VRMStructure } from '../../types/index.js';
import '@babylonjs/loaders/glTF';

/**
 * Manages hair mesh swapping using extracted hair GLBs from the catalog.
 *
 * The original VRM's hair exists as:
 * - Hair001 mesh (top-level, separate from Body)
 * - HairBack primitive inside the Body mesh (a _HAIR sub-material)
 *
 * On swap, we hide the original hair and add the new hair GLB.
 */
export class HairSwapper {
  private scene: Scene;
  private avatarRoot: TransformNode;
  private avatarSkeleton: Skeleton;

  private currentHairId: string | null = null;
  private currentHairMeshes: AbstractMesh[] = [];
  private currentSkeleton: Skeleton | null = null;
  private syncObserver: Observer<Scene> | null = null;
  private originalHairHidden = false;

  /** References to the original VRM hair primitives (for hide/show) */
  private originalHairPrims: AbstractMesh[] = [];

  constructor(scene: Scene, avatarRoot: TransformNode, avatarSkeleton: Skeleton) {
    this.scene = scene;
    this.avatarRoot = avatarRoot;
    this.avatarSkeleton = avatarSkeleton;
  }

  /**
   * Register the original VRM hair primitives so we can hide them on swap.
   * Called after VRM analysis.
   */
  setOriginalHair(structure: VRMStructure): void {
    this.originalHairPrims = structure.hairPrimitives.map(p => p.mesh);
  }

  /**
   * Swap to a new hair style from the catalog.
   */
  async swap(hairItem: CatalogHairItem, catalog: CatalogLoader): Promise<boolean> {
    const url = catalog.resolveAssetUrl(hairItem.asset);
    console.log(`[Hair] Swapping to ${hairItem.id} from ${url}`);

    try {
      // Remove current swapped hair (if any)
      this.removeSwappedHair();

      // Hide original VRM hair
      this.hideOriginalHair();

      // Load hair GLB
      const result = await SceneLoader.ImportMeshAsync('', '', url, this.scene);

      const meshes = result.meshes.filter(m => m.getTotalVertices() > 0);
      const skeleton = result.skeletons.length > 0 ? result.skeletons[0] : null;

      // Parent under avatar root
      for (const mesh of result.meshes) {
        if (!mesh.parent || mesh.parent.name === '__root__') {
          mesh.parent = this.avatarRoot;
        }
      }

      const importRoot = result.meshes.find(m => m.name === '__root__');
      if (importRoot && importRoot.getChildMeshes().length === 0) {
        importRoot.dispose();
      }

      // Skeleton sync
      if (skeleton) {
        this.syncObserver = this.setupSkeletonSync(skeleton);
      }

      this.currentHairId = hairItem.id;
      this.currentHairMeshes = result.meshes;
      this.currentSkeleton = skeleton;

      console.log(`[Hair] Swapped to ${hairItem.id} (${meshes.length} meshes)`);
      return true;
    } catch (err) {
      console.error(`[Hair] Failed to swap to ${hairItem.id}:`, err);
      return false;
    }
  }

  /**
   * Restore original VRM hair, remove any swapped hair.
   */
  restoreOriginal(): void {
    this.removeSwappedHair();
    this.showOriginalHair();
    this.currentHairId = null;
  }

  getCurrentHairId(): string | null {
    return this.currentHairId;
  }

  private hideOriginalHair(): void {
    if (this.originalHairHidden) return;
    for (const mesh of this.originalHairPrims) {
      mesh.isVisible = false;
    }
    // Also hide any top-level mesh named "Hair" or "Hair001"
    for (const mesh of this.scene.meshes) {
      if (/^hair/i.test(mesh.name) && mesh.getTotalVertices() > 0) {
        mesh.isVisible = false;
      }
    }
    this.originalHairHidden = true;
  }

  private showOriginalHair(): void {
    if (!this.originalHairHidden) return;
    for (const mesh of this.originalHairPrims) {
      mesh.isVisible = true;
    }
    for (const mesh of this.scene.meshes) {
      if (/^hair/i.test(mesh.name) && mesh.getTotalVertices() > 0) {
        mesh.isVisible = true;
      }
    }
    this.originalHairHidden = false;
  }

  private removeSwappedHair(): void {
    if (this.syncObserver) {
      this.scene.onBeforeRenderObservable.remove(this.syncObserver);
      this.syncObserver = null;
    }
    if (this.currentSkeleton) {
      this.currentSkeleton.dispose();
      this.currentSkeleton = null;
    }
    for (const mesh of this.currentHairMeshes) {
      mesh.dispose(false, true);
    }
    this.currentHairMeshes = [];
  }

  private setupSkeletonSync(hairSkeleton: Skeleton): Observer<Scene> {
    const avatarBoneMap = new Map<string, Bone>();
    for (const bone of this.avatarSkeleton.bones) {
      avatarBoneMap.set(bone.name, bone);
    }

    const pairs: Array<[Bone, Bone]> = [];
    for (const hBone of hairSkeleton.bones) {
      const aBone = avatarBoneMap.get(hBone.name);
      if (aBone) {
        pairs.push([hBone, aBone]);
      }
    }

    console.log(`[Hair] Skeleton sync: ${pairs.length}/${hairSkeleton.bones.length} bones matched`);

    return this.scene.onBeforeRenderObservable.add(() => {
      for (const [hair, avatar] of pairs) {
        hair.getLocalMatrix().copyFrom(avatar.getLocalMatrix());
      }
    });
  }

  dispose(): void {
    this.removeSwappedHair();
    this.currentHairId = null;
  }
}
