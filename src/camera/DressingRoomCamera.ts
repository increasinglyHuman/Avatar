import { Scene, ArcRotateCamera, Vector3 } from '@babylonjs/core';
import type { TransformNode } from '@babylonjs/core';

/**
 * Orbit camera for the Dressing Room.
 * ArcRotateCamera with zoom limits tuned for avatar viewing.
 */
export class DressingRoomCamera {
  private camera: ArcRotateCamera;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this.camera = new ArcRotateCamera(
      'dressingRoomCamera',
      Math.PI / 2, // alpha: front-facing
      Math.PI / 2.5, // beta: slight top-down angle
      2.5, // radius: close for avatar viewing
      new Vector3(0, 0.85, 0), // target: roughly chest height
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

    // Panning sensitivity
    this.camera.panningSensibility = 200;

    this.camera.attachControl(canvas, true);
  }

  /**
   * Focus camera on the loaded model by computing its bounding center.
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
      const height = maxY - minY;
      const centerY = minY + height * 0.45; // slightly below center (face focus)
      this.camera.setTarget(new Vector3(0, centerY, 0));
      this.camera.radius = Math.max(height * 1.2, 1.5);
    }
  }

  getCamera(): ArcRotateCamera {
    return this.camera;
  }

  dispose(): void {
    this.camera.detachControl();
    this.camera.dispose();
  }
}
