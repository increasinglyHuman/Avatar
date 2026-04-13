import { SceneLoader, AnimationGroup } from '@babylonjs/core';
import type { Scene, Skeleton } from '@babylonjs/core';

/**
 * Loads animation-only GLBs exported from BlackBox Animator
 * and plays them on the avatar skeleton.
 *
 * Animations are retargeted onto Ruth2/Roth2 in Animator,
 * exported as animation-only GLB (no mesh, just skeleton + keyframes).
 */
export class IdleAnimationManager {
  private scene: Scene;
  private skeleton: Skeleton;
  private animationGroups: AnimationGroup[] = [];
  private currentIndex = -1;
  private crossfadeMs = 500;

  constructor(scene: Scene, skeleton: Skeleton) {
    this.scene = scene;
    this.skeleton = skeleton;
  }

  /**
   * Load an animation-only GLB and merge its animation groups into the scene.
   * The GLB must contain a skeleton with matching bone names (mPelvis, etc.).
   */
  async loadAnimation(path: string): Promise<AnimationGroup | null> {
    const lastSlash = path.lastIndexOf('/');
    const rootUrl = lastSlash >= 0 ? path.substring(0, lastSlash + 1) : '';
    const fileName = lastSlash >= 0 ? path.substring(lastSlash + 1) : path;

    try {
      const result = await SceneLoader.ImportMeshAsync('', rootUrl, fileName, this.scene);

      // Animation-only GLBs still create nodes for the skeleton hierarchy.
      // We need to find the animation groups that were added to the scene.
      const newGroups = result.animationGroups;

      if (newGroups.length === 0) {
        console.warn(`[IdleAnim] No animation groups found in ${fileName}`);
        return null;
      }

      // Retarget: the loaded animation targets bones in the imported skeleton nodes,
      // but we need it to target bones in our existing avatar skeleton.
      // Since bone names match, we remap by name.
      for (const group of newGroups) {
        this.remapToSkeleton(group);
        group.stop();
        this.animationGroups.push(group);
        console.log(
          `[IdleAnim] Loaded "${group.name}" (${group.targetedAnimations.length} targets)`,
        );
      }

      // Clean up the imported skeleton nodes (we only need the animation data)
      for (const mesh of result.meshes) {
        mesh.dispose();
      }

      return newGroups[0];
    } catch (err) {
      console.error(`[IdleAnim] Failed to load ${fileName}:`, err);
      return null;
    }
  }

  /**
   * Remap animation targets from the imported skeleton nodes to our avatar skeleton bones.
   * Matches by bone name since both use the SL naming convention.
   * Skips finger bones — retargeting produces squiggly fingers due to weight map
   * bleed and bone orientation mismatches. A relaxed default pose looks better.
   */
  private remapToSkeleton(group: AnimationGroup): void {
    const boneMap = new Map<string, unknown>();
    for (const bone of this.skeleton.bones) {
      const tn = bone.getTransformNode();
      if (tn) {
        boneMap.set(bone.name, tn);
      }
    }

    let remapped = 0;
    let skippedFingers = 0;
    const toRemove: number[] = [];

    for (let i = 0; i < group.targetedAnimations.length; i++) {
      const ta = group.targetedAnimations[i];
      const targetName = ta.target?.name as string | undefined;

      // Skip finger bones (mHandThumb1Left, mHandIndex2Right, etc.)
      if (targetName && /^mHand(Thumb|Index|Middle|Ring|Pinky)\d/.test(targetName)) {
        toRemove.push(i);
        skippedFingers++;
        continue;
      }

      if (targetName && boneMap.has(targetName)) {
        ta.target = boneMap.get(targetName);
        remapped++;
      }
    }

    // Remove finger channels in reverse order to preserve indices
    for (let i = toRemove.length - 1; i >= 0; i--) {
      group.targetedAnimations.splice(toRemove[i], 1);
    }

    console.log(
      `[IdleAnim] Remapped "${group.name}": ${remapped} targets, ${skippedFingers} finger channels skipped`,
    );
  }

  /**
   * Play a specific animation by index, crossfading from current.
   */
  play(index: number, loop = true): void {
    if (index < 0 || index >= this.animationGroups.length) return;

    const next = this.animationGroups[index];

    if (this.currentIndex >= 0 && this.currentIndex !== index) {
      const current = this.animationGroups[this.currentIndex];
      this.crossfade(current, next, loop);
    } else {
      next.start(loop, 1.0);
      next.setWeightForAllAnimatables(1.0);
    }

    this.currentIndex = index;
    console.log(`[IdleAnim] Playing "${next.name}" (loop=${loop})`);
  }

  /**
   * Play the first loaded animation.
   */
  playDefault(loop = true): void {
    if (this.animationGroups.length > 0) {
      this.play(0, loop);
    }
  }

  /**
   * Crossfade between two animation groups over crossfadeMs.
   */
  private crossfade(from: AnimationGroup, to: AnimationGroup, loop: boolean): void {
    to.start(loop, 1.0);
    to.setWeightForAllAnimatables(0);

    const startTime = performance.now();
    const duration = this.crossfadeMs;

    const step = (): void => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1.0);

      from.setWeightForAllAnimatables(1.0 - t);
      to.setWeightForAllAnimatables(t);

      if (t < 1.0) {
        requestAnimationFrame(step);
      } else {
        from.stop();
      }
    };

    requestAnimationFrame(step);
  }

  /**
   * Stop all animations.
   */
  stop(): void {
    for (const group of this.animationGroups) {
      group.stop();
    }
    this.currentIndex = -1;
  }

  /**
   * Get list of loaded animation names.
   */
  getAnimationNames(): string[] {
    return this.animationGroups.map((g) => g.name);
  }

  /**
   * Get current animation count.
   */
  getCount(): number {
    return this.animationGroups.length;
  }

  setCrossfadeTime(ms: number): void {
    this.crossfadeMs = ms;
  }

  dispose(): void {
    this.stop();
    for (const group of this.animationGroups) {
      group.dispose();
    }
    this.animationGroups = [];
    this.currentIndex = -1;
  }
}
