import * as BABYLON from '@babylonjs/core';
import type { AvatarConfig, AvatarState } from '../types/index.js';
import type { OpenSimStructure } from '../types/opensim.js';
import { AvatarEngine } from './AvatarEngine.js';
import { LightingSetup } from '../scene/LightingSetup.js';
import { Background } from '../scene/Background.js';
import { DressingRoomCamera } from '../camera/DressingRoomCamera.js';
import { Sidebar } from '../hud/Sidebar.js';
import { OpenSimLoader } from '../avatar/OpenSimLoader.js';
import { ShapeParameterDriver } from '../avatar/ShapeParameterDriver.js';
import { SkinMaterialManager } from '../avatar/SkinMaterialManager.js';
import { OpenSimClothingManager } from '../avatar/OpenSimClothingManager.js';
import { TextureCompositor } from '../avatar/TextureCompositor.js';
import { AlphaMaskManager } from '../avatar/AlphaMaskManager.js';
import { OpenSimCatalog } from '../avatar/OpenSimCatalog.js';
import { ManifestSerializer } from '../avatar/ManifestSerializer.js';
import { OutfitStore } from '../avatar/OutfitStore.js';
import { IdleAnimationManager } from '../avatar/IdleAnimationManager.js';
import { CVBounceDriver } from '../avatar/CVBounceDriver.js';
import { BreathingDriver } from '../avatar/BreathingDriver.js';
import { BlinkDriver } from '../avatar/BlinkDriver.js';
import { SpringBoneSystem } from '../avatar/SpringBoneSystem.js';
import type { PostMessageBridge } from '../bridge/PostMessageBridge.js';
import type { AbstractMesh, TransformNode } from '@babylonjs/core';
import type { AvatarGender } from '../types/index.js';
import '@babylonjs/loaders/glTF';

/**
 * Orchestrates the Avatar lifecycle: spawn → run → dispose.
 * Phase 0: OpenSim pipeline (Ruth2/Roth2).
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
  private opensimStructure: OpenSimStructure | null = null;
  private shapeDriver: ShapeParameterDriver | null = null;
  private skinManager: SkinMaterialManager | null = null;
  private clothingManager: OpenSimClothingManager | null = null;
  private compositor: TextureCompositor | null = null;
  private alphaMaskManager: AlphaMaskManager | null = null;
  private catalog: OpenSimCatalog | null = null;
  private manifestSerializer: ManifestSerializer | null = null;
  private outfitStore: OutfitStore | null = null;
  private idleAnimManager: IdleAnimationManager | null = null;
  private cvBounce: CVBounceDriver | null = null;
  private breathing: BreathingDriver | null = null;
  private blink: BlinkDriver | null = null;
  private springBones: SpringBoneSystem | null = null;

  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private bridge: PostMessageBridge | null = null;
  private debugKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private wireframeOn = false;
  private currentConfig: AvatarConfig | null = null;
  private currentGender: AvatarGender = 'feminine';

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
    this.currentConfig = config;

    try {
      // 1. Engine
      this.avatarEngine = new AvatarEngine(this.canvas);
      await this.avatarEngine.initialize();
      const scene = this.avatarEngine.getScene();

      // 2. Lighting (studio 3-point)
      this.lighting = new LightingSetup(scene);

      // 3. Background (radial glow over black)
      this.background = new Background(scene);

      // 4. Load OpenSim model + detect skeleton + apply default shape params
      const loader = new OpenSimLoader();
      const result = await loader.load(config.modelPath, scene);

      this.modelRoot = result.root;
      this.modelMeshes = result.meshes;
      this.opensimStructure = result.structure;

      console.log(
        `[Avatar] OpenSim avatar ready: ${result.structure.boneCount} bones, ` +
        `${result.structure.meshParts.size} mesh parts, ` +
        `${result.structure.animationBones.size} animation bones, ` +
        `${result.structure.collisionVolumes.size} CVs, ` +
        `${result.structure.faceBones.size} face bones`,
      );

      // 5. Camera (orbit around loaded model)
      this.camera = new DressingRoomCamera(scene, this.canvas);
      this.camera.focusOnModel(this.modelRoot);

      // 6. Shape parameter driver (the flagship feature)
      this.shapeDriver = new ShapeParameterDriver(result.structure.skeleton);
      console.log(`[Avatar] Shape parameter driver initialized`);

      // 7. Skin material manager (gender-aware defaults)
      this.currentGender = config.modelPath.includes('roth2') ? 'masculine' : 'feminine';
      this.skinManager = new SkinMaterialManager(scene, result.structure, this.currentGender);

      // 8. Wardrobe system (clothing manager + texture layers + alpha masking + catalog)
      this.clothingManager = new OpenSimClothingManager(
        scene, result.root, result.structure.skeleton,
      );
      this.compositor = new TextureCompositor(
        scene, result.structure, this.skinManager,
      );
      this.clothingManager.setCompositor(this.compositor);
      this.alphaMaskManager = new AlphaMaskManager(result.structure);
      this.catalog = new OpenSimCatalog();
      await this.catalog.load();

      // 9. Outfit system (manifest serialization + localStorage persistence)
      this.manifestSerializer = new ManifestSerializer(
        this.shapeDriver, this.skinManager, this.clothingManager, this.catalog,
      );
      this.outfitStore = new OutfitStore();

      // 10. Sidebar + connect all subsystems
      this.sidebar = new Sidebar(this.container);
      if (!config.showSidebar) {
        this.sidebar.setVisible(false);
      }
      this.sidebar.connectShapeDriver(this.shapeDriver);
      this.sidebar.connectSkinManager(this.skinManager);
      this.sidebar.connectWardrobe(this.catalog, this.clothingManager, this.alphaMaskManager);
      this.sidebar.connectOutfits(
        this.manifestSerializer, this.outfitStore, this.avatarEngine.getEngine(),
      );

      // 10b. Camera + animation connections for auto-focus
      this.sidebar.connectCamera(this.camera);

      // 10c. Gender swap callback
      this.sidebar.onModelSwap(async (isFeminine: boolean) => {
        const path = isFeminine ? 'assets/ruth2-feminine.glb' : 'assets/roth2-simplified.glb';
        await this.swapModel(path);
      });

      // 11. Idle animations (retargeted in Animator, exported as animation-only GLB)
      if (result.structure.skeleton) {
        this.idleAnimManager = new IdleAnimationManager(scene, result.structure.skeleton);
        await this.idleAnimManager.loadAnimation('assets/Happy_Idle_1__anim_2026-04-13.glb');
        await this.idleAnimManager.loadAnimation('assets/Ruth_Thoughtful_Head_Shake_anim_2026-04-13.glb');
        if (this.idleAnimManager.getCount() > 0) {
          this.idleAnimManager.playDefault(true);
          this.sidebar.connectIdleAnimations(this.idleAnimManager);
          console.log(`[Avatar] Idle animations: ${this.idleAnimManager.getAnimationNames().join(', ')}`);
        }
      }

      // 12. CV bounce physics (SL-compatible breast/belly/butt spring-damper)
      if (result.structure.skeleton && this.modelRoot) {
        this.cvBounce = new CVBounceDriver(scene, result.structure.skeleton, this.modelRoot);
        this.sidebar.connectCVBounce(this.cvBounce);
      }

      // 13. Breathing & blinking (procedural, post-animation)
      if (result.structure.skeleton) {
        this.breathing = new BreathingDriver(scene, result.structure.skeleton);
        this.blink = new BlinkDriver(scene, result.structure.skeleton);
        this.sidebar.connectBreathingAndBlink(this.breathing, this.blink);
      }

      // 14. Spring bone system (hair/cloth physics — no-op on bare Ruth2/Roth2)
      if (this.modelRoot) {
        this.springBones = new SpringBoneSystem(this.modelRoot, scene);
      }

      // 15. Per-frame updates
      scene.registerBeforeRender(() => {
        if (!this.sidebar || !this.avatarEngine) return;
        this.sidebar.setFPS(this.avatarEngine.getFPS());
      });

      // 9. Debug keys (F1 = dump state, F2 = wireframe, F3 = inspector)
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

      // 10. Start rendering
      this.avatarEngine.startRenderLoop();

      this.state = 'running';
      console.log(`[Avatar] Running: "${config.label}"`);
      console.log('[Avatar] Debug keys: F1=dump state, F2=wireframe, F3=inspector');
    } catch (error) {
      this.state = 'disposed';
      throw error;
    }
  }

  /**
   * Hot-swap the avatar model (Ruth2 ↔ Roth2).
   * Disposes model-specific subsystems and reloads with a new GLB path,
   * keeping engine, lighting, background, camera, and sidebar alive.
   */
  async swapModel(modelPath: string): Promise<void> {
    if (this.state !== 'running' || !this.avatarEngine || !this.sidebar) return;
    const scene = this.avatarEngine.getScene();

    console.log(`[Avatar] Swapping model to: ${modelPath}`);

    // Dispose model-specific subsystems (reverse init order)
    this.springBones?.dispose();
    this.springBones = null;
    this.blink?.dispose();
    this.blink = null;
    this.breathing?.dispose();
    this.breathing = null;
    this.cvBounce?.dispose();
    this.cvBounce = null;
    this.idleAnimManager?.dispose();
    this.idleAnimManager = null;
    this.manifestSerializer = null;
    this.outfitStore = null;
    this.clothingManager?.dispose();
    this.clothingManager = null;
    this.compositor?.dispose();
    this.compositor = null;
    this.alphaMaskManager?.dispose();
    this.alphaMaskManager = null;
    this.catalog = null;
    this.skinManager?.dispose();
    this.skinManager = null;
    this.shapeDriver = null;
    this.opensimStructure = null;

    for (const mesh of this.modelMeshes) mesh.dispose();
    this.modelMeshes = [];
    this.modelRoot?.dispose();
    this.modelRoot = null;

    // Load new model
    const loader = new OpenSimLoader();
    const result = await loader.load(modelPath, scene);
    this.modelRoot = result.root;
    this.modelMeshes = result.meshes;
    this.opensimStructure = result.structure;

    // Rebuild camera focus
    this.camera?.focusOnModel(this.modelRoot);

    // Rebuild subsystems
    this.currentGender = modelPath.includes('roth2') ? 'masculine' : 'feminine';
    this.shapeDriver = new ShapeParameterDriver(result.structure.skeleton);
    this.skinManager = new SkinMaterialManager(scene, result.structure, this.currentGender);
    this.clothingManager = new OpenSimClothingManager(scene, result.root, result.structure.skeleton);
    this.compositor = new TextureCompositor(scene, result.structure, this.skinManager);
    this.clothingManager.setCompositor(this.compositor);
    this.alphaMaskManager = new AlphaMaskManager(result.structure);
    this.catalog = new OpenSimCatalog();
    await this.catalog.load();
    this.manifestSerializer = new ManifestSerializer(
      this.shapeDriver, this.skinManager, this.clothingManager, this.catalog,
    );
    this.outfitStore = new OutfitStore();

    // Reconnect sidebar
    this.sidebar.connectShapeDriver(this.shapeDriver);
    this.sidebar.connectSkinManager(this.skinManager);
    this.sidebar.connectWardrobe(this.catalog, this.clothingManager, this.alphaMaskManager);
    this.sidebar.connectOutfits(
      this.manifestSerializer, this.outfitStore, this.avatarEngine.getEngine(),
    );

    // Animations
    if (result.structure.skeleton) {
      this.idleAnimManager = new IdleAnimationManager(scene, result.structure.skeleton);
      await this.idleAnimManager.loadAnimation('assets/Happy_Idle_1__anim_2026-04-13.glb');
      await this.idleAnimManager.loadAnimation('assets/Ruth_Thoughtful_Head_Shake_anim_2026-04-13.glb');
      if (this.idleAnimManager.getCount() > 0) {
        this.idleAnimManager.playDefault(true);
        this.sidebar.connectIdleAnimations(this.idleAnimManager);
      }
    }

    // Physics + procedural
    if (result.structure.skeleton && this.modelRoot) {
      this.cvBounce = new CVBounceDriver(scene, result.structure.skeleton, this.modelRoot);
      this.sidebar.connectCVBounce(this.cvBounce);
    }
    if (result.structure.skeleton) {
      this.breathing = new BreathingDriver(scene, result.structure.skeleton);
      this.blink = new BlinkDriver(scene, result.structure.skeleton);
      this.sidebar.connectBreathingAndBlink(this.breathing, this.blink);
    }

    // Spring bones (hair/cloth physics)
    if (this.modelRoot) {
      this.springBones = new SpringBoneSystem(this.modelRoot, scene);
    }

    // Update stored config
    if (this.currentConfig) this.currentConfig.modelPath = modelPath;

    console.log(`[Avatar] Model swap complete: ${modelPath}`);
  }

  getCurrentModelPath(): string {
    return this.currentConfig?.modelPath ?? '';
  }

  getSidebar(): Sidebar | null {
    return this.sidebar;
  }

  getState(): AvatarState {
    return this.state;
  }

  getSpringBoneSystem(): SpringBoneSystem | null {
    return this.springBones;
  }

  getOpenSimStructure(): OpenSimStructure | null {
    return this.opensimStructure;
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
    if (this.opensimStructure) {
      const s = this.opensimStructure;
      console.log(`OpenSim: ${s.boneCount} bones total`);
      console.log(`  animation=${s.animationBones.size} CVs=${s.collisionVolumes.size} face=${s.faceBones.size} finger=${s.fingerBones.size}`);
      console.log(`  meshParts=${s.meshParts.size}`);
      for (const [, part] of s.meshParts) {
        console.log(`    "${part.name}" → ${part.category}`);
      }
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
      // The Babylon.js inspector requires React and is loaded via CDN.
      // We must load React first, then the inspector bundle.
      const loadScript = (src: string): Promise<void> =>
        new Promise((resolve, reject) => {
          if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
          }
          const s = document.createElement('script');
          s.src = src;
          s.onload = (): void => resolve();
          s.onerror = (): void => reject(new Error(`Failed to load ${src}`));
          document.head.appendChild(s);
        });

      console.log('[Avatar] Loading inspector...');
      // The CDN inspector expects a mutable BABYLON global.
      // ES module exports are frozen, so we wrap in a mutable proxy.
      const win = window as unknown as Record<string, unknown>;
      if (!win.BABYLON) {
        const mutableBABYLON: Record<string, unknown> = {};
        for (const key of Object.keys(BABYLON)) {
          mutableBABYLON[key] = (BABYLON as unknown as Record<string, unknown>)[key];
        }
        win.BABYLON = mutableBABYLON;
      }
      await loadScript('https://unpkg.com/react@18/umd/react.production.min.js');
      await loadScript('https://unpkg.com/react-dom@18/umd/react-dom.production.min.js');
      await loadScript('https://cdn.babylonjs.com/inspector/babylon.inspector.bundle.js');
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

    this.opensimStructure = null;
    this.shapeDriver = null;
    this.skinManager?.dispose();
    this.skinManager = null;
    this.clothingManager?.dispose();
    this.clothingManager = null;
    this.compositor?.dispose();
    this.compositor = null;
    this.alphaMaskManager?.dispose();
    this.alphaMaskManager = null;
    this.catalog = null;
    this.manifestSerializer = null;
    this.outfitStore = null;
    this.idleAnimManager?.dispose();
    this.idleAnimManager = null;
    this.cvBounce?.dispose();
    this.cvBounce = null;
    this.breathing?.dispose();
    this.breathing = null;
    this.blink?.dispose();
    this.blink = null;
    this.springBones?.dispose();
    this.springBones = null;
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
