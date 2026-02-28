import type { AvatarConfig, AvatarState, VRMStructure } from '../types/index.js';
import { AvatarEngine } from './AvatarEngine.js';
import { LightingSetup } from '../scene/LightingSetup.js';
import { Background } from '../scene/Background.js';
import { DressingRoomCamera } from '../camera/DressingRoomCamera.js';
import { Sidebar } from '../hud/Sidebar.js';
import { VRMAnalyzer } from '../avatar/VRMAnalyzer.js';
import { MaterialEditor } from '../avatar/MaterialEditor.js';
import type { PostMessageBridge } from '../bridge/PostMessageBridge.js';
import { SceneLoader, TransformNode, Vector3 } from '@babylonjs/core';
import type { AbstractMesh } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

/**
 * Orchestrates the Avatar lifecycle: spawn → run → dispose.
 * Simplified from GlitchLifecycle (no mannequin/physics/animation).
 */
export class AvatarLifecycle {
  private state: AvatarState = 'idle';

  private avatarEngine: AvatarEngine | null = null;
  private lighting: LightingSetup | null = null;
  private background: Background | null = null;
  private camera: DressingRoomCamera | null = null;
  private sidebar: Sidebar | null = null;

  private modelRoot: TransformNode | null = null;
  private modelMeshes: AbstractMesh[] = [];
  private vrmStructure: VRMStructure | null = null;
  private materialEditor: MaterialEditor | null = null;

  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private bridge: PostMessageBridge | null = null;
  private debugKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private wireframeOn = false;

  constructor(container: HTMLElement, canvas: HTMLCanvasElement) {
    this.container = container;
    this.canvas = canvas;
  }

  setPostMessageBridge(bridge: PostMessageBridge): void {
    this.bridge = bridge;
  }

  getPostMessageBridge(): PostMessageBridge | null {
    return this.bridge;
  }

  async spawn(config: AvatarConfig): Promise<void> {
    if (this.state !== 'idle') {
      throw new Error(`Cannot spawn in state "${this.state}"`);
    }

    this.state = 'loading';

    try {
      // 1. Engine
      this.avatarEngine = new AvatarEngine(this.canvas);
      await this.avatarEngine.initialize();
      const scene = this.avatarEngine.getScene();

      // 2. Lighting (studio 3-point)
      this.lighting = new LightingSetup(scene);

      // 3. Background (neutral gradient)
      this.background = new Background(scene);

      // 4. Load VRM/GLB model
      await this.loadModel(config.modelPath);

      // 4a. Analyze VRM structure
      const analyzer = new VRMAnalyzer();
      this.vrmStructure = analyzer.analyze(this.modelMeshes);
      console.log(
        `[Avatar] VRM analyzed: mode=${this.vrmStructure.clothingMode}, gender=${this.vrmStructure.gender}, ` +
          `body=${this.vrmStructure.bodyPrimitives.length}, face=${this.vrmStructure.facePrimitives.length}, ` +
          `hair=${this.vrmStructure.hairPrimitives.length}, cloth=${this.vrmStructure.clothPrimitives.length}`,
      );

      // 4b. Material editor + texture cache for HSL remapping
      this.materialEditor = new MaterialEditor();
      await this.materialEditor.initTextureCache(this.vrmStructure, scene);

      // 5. Camera (orbit around loaded model)
      this.camera = new DressingRoomCamera(scene, this.canvas);
      this.camera.focusOnModel(this.modelRoot);

      // 6. Sidebar
      this.sidebar = new Sidebar(this.container);
      if (!config.showSidebar) {
        this.sidebar.setVisible(false);
      }
      if (this.vrmStructure && this.materialEditor) {
        this.sidebar.connectAvatar(this.materialEditor, this.vrmStructure);
      }

      // 7. Per-frame updates
      scene.registerBeforeRender(() => {
        if (!this.sidebar || !this.avatarEngine) return;
        this.sidebar.setFPS(this.avatarEngine.getFPS());
      });

      // 8. Debug keys (F1 = dump state, F2 = wireframe, F3 = inspector)
      this.debugKeyHandler = (e: KeyboardEvent): void => {
        if (e.code === 'F1') {
          e.preventDefault();
          this.dumpSceneState();
        } else if (e.code === 'F2') {
          e.preventDefault();
          this.toggleWireframe();
        } else if (e.code === 'F3') {
          e.preventDefault();
          this.toggleInspector();
        }
      };
      window.addEventListener('keydown', this.debugKeyHandler);

      // 9. Start rendering
      this.avatarEngine.startRenderLoop();

      this.state = 'running';
      console.log(`[Avatar] Running: "${config.label}"`);
      console.log('[Avatar] Debug keys: F1=dump state, F2=wireframe, F3=inspector');
    } catch (error) {
      this.state = 'disposed';
      throw error;
    }
  }

  private async loadModel(modelPath: string): Promise<void> {
    const scene = this.avatarEngine!.getScene();

    const lastSlash = modelPath.lastIndexOf('/');
    const rootUrl = lastSlash >= 0 ? modelPath.substring(0, lastSlash + 1) : '';
    const fileName = lastSlash >= 0 ? modelPath.substring(lastSlash + 1) : modelPath;

    // VRM files are GLB format — force the glTF loader via pluginExtension
    const isVRM = fileName.toLowerCase().endsWith('.vrm');

    const result = await SceneLoader.ImportMeshAsync(
      '',
      rootUrl,
      fileName,
      scene,
      undefined,
      isVRM ? '.glb' : undefined,
    );

    // Parent all root meshes under a single transform node
    this.modelRoot = new TransformNode('avatarRoot', scene);
    for (const mesh of result.meshes) {
      if (!mesh.parent) {
        mesh.parent = this.modelRoot;
      }
    }
    this.modelMeshes = result.meshes;

    this.modelRoot.position = Vector3.Zero();

    console.log(
      `[Avatar] Model loaded: ${fileName} (${result.meshes.length} meshes, ${result.skeletons.length} skeletons)`,
    );
  }

  getSidebar(): Sidebar | null {
    return this.sidebar;
  }

  getState(): AvatarState {
    return this.state;
  }

  private dumpSceneState(): void {
    const scene = this.avatarEngine?.getScene();
    if (!scene) return;
    const cam = scene.activeCamera;
    console.log('===== [Avatar] SCENE STATE DUMP (F1) =====');
    console.log(`activeCamera: ${cam?.name ?? 'null'}`);
    console.log(`meshes (${scene.meshes.length}):`);
    for (const m of scene.meshes) {
      console.log(
        `  "${m.name}" visible=${m.isVisible} vertices=${m.getTotalVertices()}`,
      );
    }
    console.log(
      `lights (${scene.lights.length}): [${scene.lights.map((l) => l.name).join(', ')}]`,
    );
    console.log(
      `skeletons (${scene.skeletons.length}): [${scene.skeletons.map((s) => s.name).join(', ')}]`,
    );
    if (cam) {
      console.log(
        `cam position: (${cam.position.x.toFixed(2)}, ${cam.position.y.toFixed(2)}, ${cam.position.z.toFixed(2)})`,
      );
    }
    if (this.modelRoot) {
      const p = this.modelRoot.position;
      console.log(`model pos: (${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)})`);
    }
    if (this.vrmStructure) {
      const s = this.vrmStructure;
      console.log(`VRM: mode=${s.clothingMode} gender=${s.gender}`);
      console.log(`  body=${s.bodyPrimitives.length} face=${s.facePrimitives.length} hair=${s.hairPrimitives.length} cloth=${s.clothPrimitives.length}`);
      console.log(`  morphs=${s.morphTargetNames.length} materialRefs: skin=${s.materialRefs.bodySkin.length} eyes=${s.materialRefs.eyeIris.length} hair=${s.materialRefs.hair.length} mouth=${s.materialRefs.mouth.length}`);
    }
    console.log('===== END DUMP =====');
  }

  private toggleWireframe(): void {
    const scene = this.avatarEngine?.getScene();
    if (!scene) return;
    this.wireframeOn = !this.wireframeOn;
    for (const mesh of scene.meshes) {
      if (mesh.material) {
        mesh.material.wireframe = this.wireframeOn;
      }
    }
    console.log(`[Avatar] Wireframe: ${this.wireframeOn ? 'ON' : 'OFF'}`);
  }

  private async toggleInspector(): Promise<void> {
    const scene = this.avatarEngine?.getScene();
    if (!scene) return;

    if (!scene.debugLayer.isVisible()) {
      if (!document.querySelector('script[data-babylon-inspector]')) {
        console.log('[Avatar] Loading inspector from CDN...');
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.babylonjs.com/inspector/babylon.inspector.bundle.js';
          script.setAttribute('data-babylon-inspector', '1');
          script.onload = (): void => resolve();
          script.onerror = (): void => reject(new Error('Failed to load inspector'));
          document.head.appendChild(script);
        });
      }
      await scene.debugLayer.show({ overlay: true });
      console.log('[Avatar] Inspector: ON');
    } else {
      scene.debugLayer.hide();
      console.log('[Avatar] Inspector: OFF');
    }
  }

  dispose(): void {
    if (this.state === 'disposed') return;

    if (this.debugKeyHandler) {
      window.removeEventListener('keydown', this.debugKeyHandler);
    }

    // Dispose in reverse order
    this.materialEditor?.dispose();
    this.materialEditor = null;
    this.vrmStructure = null;
    this.sidebar?.dispose();

    for (const mesh of this.modelMeshes) {
      mesh.dispose();
    }
    this.modelMeshes = [];
    this.modelRoot?.dispose();
    this.modelRoot = null;

    this.camera?.dispose();
    this.background?.dispose();
    this.lighting?.dispose();
    this.avatarEngine?.dispose();

    this.sidebar = null;
    this.camera = null;
    this.background = null;
    this.lighting = null;
    this.avatarEngine = null;

    this.state = 'disposed';
    console.log('[Avatar] Disposed');
  }
}
