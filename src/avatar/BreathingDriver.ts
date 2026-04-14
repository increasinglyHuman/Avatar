import type { Scene, Skeleton, TransformNode, Observer } from '@babylonjs/core';

/**
 * Procedural breathing — subtle chest rise/fall independent of idle animations.
 *
 * Drives mChest bone Y-scale with a sine wave. Runs on the post-animation
 * observable so it layers on top of idle animation without fighting it.
 * The effect is additive: we store the base scale at init and oscillate around it.
 */
export class BreathingDriver {
  private scene: Scene;
  private chestNode: TransformNode | null = null;
  private baseScaleY = 1;
  private enabled = true;
  private time = 0;
  private observer: Observer<Scene> | null = null;

  /** Breathing cycle period in seconds */
  cyclePeriod = 4.0;
  /** Scale amplitude (fraction of base scale) */
  amplitude = 0.006;

  constructor(scene: Scene, skeleton: Skeleton) {
    this.scene = scene;

    for (const bone of skeleton.bones) {
      if (bone.name === 'mChest') {
        this.chestNode = bone.getTransformNode() ?? null;
        break;
      }
    }

    if (this.chestNode) {
      this.baseScaleY = this.chestNode.scaling.y;
    }

    this.observer = this.scene.onAfterAnimationsObservable.add(() => this.update());
  }

  private update(): void {
    if (!this.enabled || !this.chestNode) return;

    const dt = this.scene.getEngine().getDeltaTime() / 1000;
    if (dt <= 0 || dt > 0.1) return;

    this.time += dt;

    // Sine wave: range [0, amplitude] (always expanding, never compressing below base)
    const breath = (Math.sin((this.time * 2 * Math.PI) / this.cyclePeriod) + 1) * 0.5;
    this.chestNode.scaling.y = this.baseScaleY + breath * this.amplitude;
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on && this.chestNode) {
      this.chestNode.scaling.y = this.baseScaleY;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  dispose(): void {
    if (this.observer) {
      this.scene.onAfterAnimationsObservable.remove(this.observer);
      this.observer = null;
    }
    if (this.chestNode) {
      this.chestNode.scaling.y = this.baseScaleY;
    }
  }
}
