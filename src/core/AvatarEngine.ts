import { Engine, Scene, Color4, WebGPUEngine } from '@babylonjs/core';

/**
 * Babylon.js engine initialization for Avatar.
 * WebGPU-first with WebGL2 fallback.
 * Pattern from GlitchEngine.ts.
 */
export class AvatarEngine {
  private canvas: HTMLCanvasElement;
  private engine: Engine | WebGPUEngine | null = null;
  private scene: Scene | null = null;
  private webgpu = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async initialize(): Promise<void> {
    try {
      const webGPUEngine = new WebGPUEngine(this.canvas, {
        adaptToDeviceRatio: true,
        powerPreference: 'high-performance',
      });
      await webGPUEngine.initAsync();
      this.engine = webGPUEngine;
      this.webgpu = true;
    } catch {
      this.engine = new Engine(this.canvas, true, {
        adaptToDeviceRatio: true,
        powerPreference: 'high-performance',
      });
      this.webgpu = false;
    }

    if (!this.engine) {
      throw new Error('Failed to initialize any rendering engine');
    }

    this.createScene();

    window.addEventListener('resize', () => {
      this.engine?.resize();
    });

    console.log(`[Avatar] Engine ready: ${this.webgpu ? 'WebGPU' : 'WebGL2'}`);
  }

  private createScene(): void {
    if (!this.engine) throw new Error('Engine not initialized');

    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.12, 0.12, 0.14, 1);
    this.scene.autoClear = true;
    this.scene.autoClearDepthAndStencil = true;
  }

  startRenderLoop(): void {
    if (!this.engine || !this.scene) {
      throw new Error('Engine or scene not initialized');
    }
    this.engine.runRenderLoop(() => {
      this.scene!.render();
    });
  }

  stopRenderLoop(): void {
    this.engine?.stopRenderLoop();
  }

  getScene(): Scene {
    if (!this.scene) throw new Error('Scene not initialized');
    return this.scene;
  }

  getEngine(): Engine | WebGPUEngine {
    if (!this.engine) throw new Error('Engine not initialized');
    return this.engine;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getFPS(): number {
    return this.engine?.getFps() ?? 0;
  }

  isWebGPU(): boolean {
    return this.webgpu;
  }

  dispose(): void {
    this.engine?.stopRenderLoop();
    this.scene?.dispose();
    this.engine?.dispose();
    this.scene = null;
    this.engine = null;
    console.log('[Avatar] Engine disposed');
  }
}
