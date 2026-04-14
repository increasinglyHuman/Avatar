import type { Scene, Skeleton, TransformNode, Observer } from '@babylonjs/core';

/**
 * Autonomous blinking — random interval eye close/open cycle.
 *
 * Drives upper eyelid bones (mFaceEyeLidUpperLeft/Right) via Y-scale to simulate
 * a blink. Falls back to mFaceEyeAltLeft/Right Y-scale if eyelid bones are absent.
 *
 * Blink cadence: random interval between minInterval and maxInterval seconds,
 * with occasional double-blinks. Each blink is a quick close→open (~150ms total).
 */
export class BlinkDriver {
  private scene: Scene;
  private enabled = true;
  private observer: Observer<Scene> | null = null;

  private leftNode: TransformNode | null = null;
  private rightNode: TransformNode | null = null;
  private baseScaleYLeft = 1;
  private baseScaleYRight = 1;

  /** Whether we're using eyelid bones (true) or eye alt bones as fallback */
  private usingEyelids = false;

  // Timing
  private timer = 0;
  private nextBlinkAt = 0;
  private blinkPhase: 'waiting' | 'closing' | 'opening' = 'waiting';
  private blinkT = 0;

  /** Seconds for one blink (close + open) */
  blinkDuration = 0.15;
  /** Min seconds between blinks */
  minInterval = 2.0;
  /** Max seconds between blinks */
  maxInterval = 6.0;
  /** How far to scale the eyelid Y for a full close (0 = fully closed) */
  closedScaleY = 0.05;

  constructor(scene: Scene, skeleton: Skeleton) {
    this.scene = scene;

    // Try eyelid bones first (Bento standard)
    const boneMap = new Map<string, TransformNode>();
    for (const bone of skeleton.bones) {
      const tn = bone.getTransformNode();
      if (tn) boneMap.set(bone.name, tn);
    }

    // Primary: upper eyelid bones
    this.leftNode = boneMap.get('mFaceEyeLidUpperLeft') ?? null;
    this.rightNode = boneMap.get('mFaceEyeLidUpperRight') ?? null;

    if (this.leftNode && this.rightNode) {
      this.usingEyelids = true;
      this.baseScaleYLeft = this.leftNode.scaling.y;
      this.baseScaleYRight = this.rightNode.scaling.y;
      console.log('[Blink] Using mFaceEyeLidUpper bones');
    } else {
      // Fallback: mFaceEyeAlt bones (scale Y toward 0 to squish eye shut)
      this.leftNode = boneMap.get('mFaceEyeAltLeft') ?? null;
      this.rightNode = boneMap.get('mFaceEyeAltRight') ?? null;
      if (this.leftNode && this.rightNode) {
        this.baseScaleYLeft = this.leftNode.scaling.y;
        this.baseScaleYRight = this.rightNode.scaling.y;
        console.log('[Blink] Using mFaceEyeAlt bones (fallback)');
      } else {
        console.warn('[Blink] No eyelid or eye alt bones found — blinking disabled');
        this.enabled = false;
      }
    }

    this.scheduleNextBlink();
    this.observer = this.scene.onAfterAnimationsObservable.add(() => this.update());
  }

  private scheduleNextBlink(): void {
    this.nextBlinkAt = this.timer + this.minInterval +
      Math.random() * (this.maxInterval - this.minInterval);
  }

  private update(): void {
    if (!this.enabled || !this.leftNode || !this.rightNode) return;

    const dt = this.scene.getEngine().getDeltaTime() / 1000;
    if (dt <= 0 || dt > 0.1) return;

    this.timer += dt;

    switch (this.blinkPhase) {
      case 'waiting':
        if (this.timer >= this.nextBlinkAt) {
          this.blinkPhase = 'closing';
          this.blinkT = 0;
        }
        break;

      case 'closing': {
        this.blinkT += dt;
        const halfDur = this.blinkDuration * 0.5;
        const t = Math.min(this.blinkT / halfDur, 1.0);
        // Ease-in for close
        const eased = t * t;
        this.applyBlink(eased);
        if (t >= 1.0) {
          this.blinkPhase = 'opening';
          this.blinkT = 0;
        }
        break;
      }

      case 'opening': {
        this.blinkT += dt;
        const halfDur = this.blinkDuration * 0.5;
        const t = Math.min(this.blinkT / halfDur, 1.0);
        // Ease-out for open
        const eased = 1.0 - t * t;
        this.applyBlink(eased);
        if (t >= 1.0) {
          this.blinkPhase = 'waiting';
          this.applyBlink(0);
          this.scheduleNextBlink();
        }
        break;
      }
    }
  }

  /** Apply blink at given intensity (0 = open, 1 = fully closed) */
  private applyBlink(intensity: number): void {
    if (!this.leftNode || !this.rightNode) return;

    if (this.usingEyelids) {
      // Scale eyelid Y down toward closedScaleY
      const leftY = this.baseScaleYLeft + (this.closedScaleY - this.baseScaleYLeft) * intensity;
      const rightY = this.baseScaleYRight + (this.closedScaleY - this.baseScaleYRight) * intensity;
      this.leftNode.scaling.y = leftY;
      this.rightNode.scaling.y = rightY;
    } else {
      // Fallback: scale eye alt Y down
      const leftY = this.baseScaleYLeft * (1.0 - intensity * 0.9);
      const rightY = this.baseScaleYRight * (1.0 - intensity * 0.9);
      this.leftNode.scaling.y = leftY;
      this.rightNode.scaling.y = rightY;
    }
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) {
      this.applyBlink(0);
      this.blinkPhase = 'waiting';
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
    this.applyBlink(0);
  }
}
