import {
  Scene,
  HemisphericLight,
  DirectionalLight,
  PointLight,
  Vector3,
  Color3,
} from '@babylonjs/core';

/**
 * Studio 3-point lighting for avatar viewing.
 * Key (front-right), Fill (front-left, softer), Rim (behind, edge highlight).
 */
export class LightingSetup {
  private hemisphere: HemisphericLight;
  private key: DirectionalLight;
  private fill: DirectionalLight;
  private rim: PointLight;

  constructor(scene: Scene) {
    // Warm ambient fill
    this.hemisphere = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
    this.hemisphere.intensity = 0.4;
    this.hemisphere.diffuse = new Color3(0.9, 0.88, 0.85);
    this.hemisphere.groundColor = new Color3(0.25, 0.25, 0.28);

    // Key light: front-right, warm white
    this.key = new DirectionalLight(
      'key',
      new Vector3(-0.5, -0.8, -0.6).normalize(),
      scene,
    );
    this.key.intensity = 1.0;
    this.key.diffuse = new Color3(1.0, 0.97, 0.93);

    // Fill light: front-left, cooler and softer
    this.fill = new DirectionalLight(
      'fill',
      new Vector3(0.6, -0.4, -0.5).normalize(),
      scene,
    );
    this.fill.intensity = 0.5;
    this.fill.diffuse = new Color3(0.85, 0.9, 0.98);

    // Rim light: behind avatar, warm edge highlight
    this.rim = new PointLight('rim', new Vector3(0, 2.0, 1.5), scene);
    this.rim.intensity = 0.6;
    this.rim.diffuse = new Color3(1.0, 0.95, 0.88);
  }

  dispose(): void {
    this.hemisphere.dispose();
    this.key.dispose();
    this.fill.dispose();
    this.rim.dispose();
  }
}
