import { Scene, ArcRotateCamera, Vector3, Animation, EasingFunction, CubicEase } from '@babylonjs/core';
import type { TransformNode } from '@babylonjs/core';

/** Focus region for camera targeting */
export type CameraFocusRegion = 'full' | 'head' | 'torso' | 'legs';

/**
 * Orbit camera for the Dressing Room.
 * ArcRotateCamera with zoom limits tuned for avatar viewing
 * and smooth animated focus transitions.
 */
export class DressingRoomCamera {
  private camera: ArcRotateCamera;
  private scene: Scene;
  /** Cached model bounds for focus calculations */
  private modelMinY = 0;
  private modelMaxY = 1.7;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.scene = scene;
    this.camera = new ArcRotateCamera(
      'dressingRoomCamera',
      Math.PI / 2, // alpha: front-facing
      Math.PI / 2.2, // beta: near eye-level with slight downward angle
      3.0, // radius: pulled back enough for full body + headroom
      new Vector3(0, 0.85, 0), // target: roughly chest height (updated by focusOnModel)
      scene,
    );

    // Zoom limits
    this.camera.wheelPrecision = 50;
    this.camera.lowerRadiusLimit = 0.5;
    this.camera.upperRadiusLimit = 5.0;

    // Prevent flipping upside down
    this.camera.lowerBetaLimit = 0.2;
    this.camera.upperBetaLimit = Math.PI - 0.2;

    // Clipping
    this.camera.minZ = 0.01;
    this.camera.maxZ = 100;

    // Right-mouse panning — higher value = less sensitive (Babylon convention)
    this.camera.panningSensibility = 800;

    this.camera.attachControl(canvas, true);
  }

  /**
   * Focus camera on the loaded model by computing its bounding center.
   * Targets true vertical center with enough radius for full body + headroom.
   */
  focusOnModel(root: TransformNode | null): void {
    if (!root) return;

    const children = root.getChildMeshes();
    if (children.length === 0) return;

    let minY = Infinity;
    let maxY = -Infinity;

    for (const mesh of children) {
      mesh.computeWorldMatrix(true);
      const bounds = mesh.getBoundingInfo();
      if (bounds) {
        const min = bounds.boundingBox.minimumWorld;
        const max = bounds.boundingBox.maximumWorld;
        if (min.y < minY) minY = min.y;
        if (max.y > maxY) maxY = max.y;
      }
    }

    if (minY !== Infinity) {
      this.modelMinY = minY;
      this.modelMaxY = maxY;
      const height = maxY - minY;
      // Target slightly above true center — keeps head in frame without zooming out too far
      const centerY = minY + height * 0.55;
      this.camera.setTarget(new Vector3(0, centerY, 0));
      // Keep model large — viewport will narrow with side panels
      this.camera.radius = Math.max(height * 1.3, 1.8);
    }
  }

  /**
   * Smoothly animate camera to focus on a body region.
   * Uses cached model bounds from last focusOnModel() call.
   */
  focusOnRegion(region: CameraFocusRegion): void {
    const height = this.modelMaxY - this.modelMinY;
    if (height <= 0) return;

    let targetY: number;
    let radius: number;
    let beta: number;

    switch (region) {
      case 'head':
        // Focus on head — high target, close zoom, slight upward angle
        targetY = this.modelMinY + height * 0.88;
        radius = Math.max(height * 0.45, 0.6);
        beta = Math.PI / 2.05;
        break;
      case 'torso':
        // Focus on upper body — chest height, medium zoom
        targetY = this.modelMinY + height * 0.65;
        radius = Math.max(height * 0.8, 1.2);
        beta = Math.PI / 2.15;
        break;
      case 'legs':
        // Focus on lower body — hip/thigh area, medium zoom
        targetY = this.modelMinY + height * 0.35;
        radius = Math.max(height * 0.9, 1.4);
        beta = Math.PI / 2.3;
        break;
      case 'full':
      default:
        targetY = this.modelMinY + height * 0.55;
        radius = Math.max(height * 1.3, 1.8);
        beta = Math.PI / 2.2;
        break;
    }

    this.animateTo(new Vector3(0, targetY, 0), radius, beta);
  }

  /** Smooth 400ms animation to target position, radius, and beta */
  private animateTo(target: Vector3, radius: number, beta: number): void {
    const fps = 60;
    const frames = 24; // 400ms at 60fps
    const ease = new CubicEase();
    ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);

    // Animate target Y
    const targetAnim = new Animation(
      'camTarget', 'target.y', fps,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
    targetAnim.setKeys([
      { frame: 0, value: this.camera.target.y },
      { frame: frames, value: target.y },
    ]);
    targetAnim.setEasingFunction(ease);

    // Animate radius
    const radiusAnim = new Animation(
      'camRadius', 'radius', fps,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
    radiusAnim.setKeys([
      { frame: 0, value: this.camera.radius },
      { frame: frames, value: radius },
    ]);
    radiusAnim.setEasingFunction(ease);

    // Animate beta (vertical angle)
    const betaAnim = new Animation(
      'camBeta', 'beta', fps,
      Animation.ANIMATIONTYPE_FLOAT,
      Animation.ANIMATIONLOOPMODE_CONSTANT,
    );
    betaAnim.setKeys([
      { frame: 0, value: this.camera.beta },
      { frame: frames, value: beta },
    ]);
    betaAnim.setEasingFunction(ease);

    this.camera.animations = [targetAnim, radiusAnim, betaAnim];
    this.scene.beginAnimation(this.camera, 0, frames, false);
  }

  getCamera(): ArcRotateCamera {
    return this.camera;
  }

  dispose(): void {
    this.camera.detachControl();
    this.camera.dispose();
  }
}
