# Phase 1 Technical Specification: VRM Avatar System

**Version:** 2.0
**Date:** 2026-02-27
**Authors:** Allen Partridge, Claude Code
**Implements:** AVATAR_STRATEGY.md Phase 1, ADR-001, ADR-004, ADR-005, ADR-006
**References:** DRESSING_ROOM_SPEC.md, CHARACTER_MANIFEST_SPEC.md

---

## 1. Scope

### What Phase 1 Ships

A player can:
1. Enter a private Dressing Room (Babylon.js 3D environment)
2. Browse and equip clothing from a VRoid-sourced catalog (197 mesh items + 34 texture items)
3. Swap hairstyles (16 styles)
4. Adjust body proportions (height, shoulders, limbs, head)
5. Change skin tone, eye color, hair color, lip color, nail color
6. Apply makeup and tattoo compositing layers
7. Save and load outfits (one-click swap from gallery)
8. Return to World — changes broadcast to other players

### What Phase 1 Does NOT Include

- SuperMesh parametric body (Phase 3)
- AI Mesh / Meshy3D pipeline (Phase 2)
- Marketplace / user-uploaded content
- Face structure editing (VRM has 0 structural face morphs)

### Success Criteria

End-to-end: Player opens Appearance tab in World → enters Dressing Room → builds an outfit → saves it → returns to World → other players see the change.

---

## 2. Technology Stack

| Component | Choice | Notes |
|-----------|--------|-------|
| 3D Runtime | Babylon.js 8.x | WebGPU-first, WebGL2 fallback |
| Language | TypeScript (strict) | ES2022 target |
| Build | Vite | Manual chunks for Babylon vendor split |
| UI | DOM-based overlays | No React, no Babylon GUI |
| Communication | PostMessageBridge | iframe ↔ parent (Glitch pattern) |
| State | Vanilla TS classes | No Zustand, no Redux |
| VRM Loading | @babylonjs/loaders (GLB) | VRM = GLB with extensions |
| Export | @babylonjs/serializers | Baked GLB for World consumption |

### Architecture Reference

The Glitch repo at `/home/p0qp0q/blackbox/glitch/` defines our architectural DNA. Avatar follows the same patterns: engine initialization, lifecycle management, DOM HUD, PostMessageBridge, debug keys, reverse-order disposal.

---

## 3. Project Structure

```
BlackBoxAvatar/
├── src/
│   ├── index.ts                    # Entry point & bootstrap
│   ├── core/
│   │   ├── AvatarEngine.ts         # Babylon init (WebGPU → WebGL2 fallback)
│   │   └── AvatarLifecycle.ts      # Orchestrator: spawn → run → dispose
│   ├── avatar/
│   │   ├── VRMAnalyzer.ts          # Structure detection from material naming
│   │   ├── MaterialEditor.ts       # Skin, eye, hair, lip, nail, clothing color
│   │   ├── ClothingManager.ts      # Extract, apply, remove, toggle CLOTH prims
│   │   ├── HairSwapper.ts          # Hair mesh transplant between models
│   │   ├── BoneEditor.ts           # Proportion adjustment (±30% bone translation)
│   │   ├── SkinCompositor.ts       # 6-layer texture compositing
│   │   └── ManifestAssembler.ts    # Build avatar from CHARACTER_MANIFEST JSON
│   ├── scene/
│   │   ├── LightingSetup.ts        # Studio 3-point lighting
│   │   └── Background.ts           # Neutral gradient or room
│   ├── camera/
│   │   └── DressingRoomCamera.ts   # ArcRotateCamera with zoom limits + auto-focus
│   ├── hud/
│   │   ├── Sidebar.ts              # 320px sidebar container + tab management
│   │   ├── OutfitsTab.ts           # Thumbnail gallery, save/load outfits
│   │   ├── BodyTab.ts              # Proportions, skin, face, nails, tattoos, makeup
│   │   ├── WardrobeTab.ts          # Category sub-tabs, item grid, equip/remove
│   │   └── components/
│   │       ├── ThumbnailGrid.ts    # Reusable grid of clickable thumbnails
│   │       ├── ColorPicker.ts      # Swatch presets + custom color input
│   │       └── SliderControl.ts    # Labeled range slider with endpoints
│   ├── bridge/
│   │   ├── PostMessageBridge.ts    # iframe communication (from Glitch)
│   │   └── EmbedDetection.ts       # isEmbedded() check (from Glitch)
│   ├── catalog/
│   │   ├── CatalogLoader.ts        # Fetch + cache items.json
│   │   └── ThumbnailManager.ts     # Lazy-load thumbnails on scroll
│   └── types/
│       ├── index.ts                # All type exports
│       ├── VRMStructure.ts         # VRM analysis result types
│       ├── Manifest.ts             # Character manifest types (from spec)
│       └── Catalog.ts              # Item catalog types
├── public/
│   └── assets/                     # Deployed extracted items (GLB + thumbnails)
├── tools/
│   ├── extract-clothing.mjs        # Node.js: VRM → individual GLB pieces
│   ├── extract-textures.mjs        # Node.js: texture-only items → compositing PNGs
│   ├── generate-thumbnails.mjs     # Node.js: render 256×256 per item
│   └── build-catalog.mjs           # Node.js: generate items.json manifest
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. Core Engine (`core/`)

### AvatarEngine.ts

Direct adaptation of Glitch's `GlitchEngine.ts`. WebGPU-first with WebGL2 fallback:

```typescript
export class AvatarEngine {
  private engine: Engine | WebGPUEngine | null = null;
  private scene: Scene | null = null;

  async initialize(): Promise<void> {
    try {
      const gpu = new WebGPUEngine(canvas, {
        adaptToDeviceRatio: true,
        powerPreference: 'high-performance',
      });
      await gpu.initAsync();
      this.engine = gpu;
    } catch {
      this.engine = new Engine(canvas, true, {
        adaptToDeviceRatio: true,
        powerPreference: 'high-performance',
        audioEngine: false,
      });
    }
    this.createScene();
  }
  // ... same dispose/render/resize pattern as GlitchEngine
}
```

### AvatarLifecycle.ts

Orchestrator following Glitch's `GlitchLifecycle.ts` pattern:

```typescript
export class AvatarLifecycle {
  private state: AvatarState = 'idle';  // 'idle' | 'loading' | 'running' | 'disposed'

  // Subsystems (initialized in spawn order, disposed in reverse)
  private avatarEngine: AvatarEngine | null = null;
  private lighting: LightingSetup | null = null;
  private background: Background | null = null;
  private camera: DressingRoomCamera | null = null;
  private sidebar: Sidebar | null = null;
  private catalogLoader: CatalogLoader | null = null;

  // Avatar-specific subsystems
  private vrmAnalyzer: VRMAnalyzer | null = null;
  private materialEditor: MaterialEditor | null = null;
  private clothingManager: ClothingManager | null = null;
  private skinCompositor: SkinCompositor | null = null;
  private manifestAssembler: ManifestAssembler | null = null;

  async spawn(config: AvatarConfig): Promise<void> {
    this.state = 'loading';

    // 1. Engine + scene
    this.avatarEngine = new AvatarEngine(this.canvas);
    await this.avatarEngine.initialize();
    const scene = this.avatarEngine.getScene();

    // 2. Scene setup
    this.lighting = new LightingSetup(scene);
    this.background = new Background(scene);
    this.camera = new DressingRoomCamera(scene, this.canvas);

    // 3. Catalog
    this.catalogLoader = new CatalogLoader();
    await this.catalogLoader.load();

    // 4. Avatar systems
    this.vrmAnalyzer = new VRMAnalyzer();
    this.materialEditor = new MaterialEditor();
    this.clothingManager = new ClothingManager(scene, this.catalogLoader);
    this.skinCompositor = new SkinCompositor();
    this.manifestAssembler = new ManifestAssembler(
      scene, this.vrmAnalyzer, this.materialEditor,
      this.clothingManager, this.skinCompositor
    );

    // 5. Load avatar from manifest
    await this.manifestAssembler.assemble(config.manifest);

    // 6. UI
    this.sidebar = new Sidebar(this.container, {
      manifestAssembler: this.manifestAssembler,
      catalogLoader: this.catalogLoader,
      materialEditor: this.materialEditor,
      clothingManager: this.clothingManager,
      skinCompositor: this.skinCompositor,
    });

    // 7. Render loop
    this.avatarEngine.startRenderLoop();
    this.state = 'running';
  }

  dispose(): void {
    // Reverse order disposal (Glitch pattern)
    this.sidebar?.dispose();
    this.manifestAssembler?.dispose();
    this.skinCompositor?.dispose();
    this.clothingManager?.dispose();
    this.materialEditor?.dispose();
    this.vrmAnalyzer?.dispose();
    this.catalogLoader?.dispose();
    this.camera?.dispose();
    this.background?.dispose();
    this.lighting?.dispose();
    this.avatarEngine?.dispose();
    this.state = 'disposed';
  }
}
```

---

## 5. VRM Analysis (`avatar/VRMAnalyzer.ts`)

Detects VRM internal structure by material naming convention. Port of `vrmMaterialEditor.js → analyzeVRM()`.

### VRMStructure Type

```typescript
interface VRMStructure {
  clothingMode: 'A' | 'B' | 'nude';
  bodyPrimitives: PrimInfo[];
  facePrimitives: PrimInfo[];
  hairMesh: Mesh | null;
  morphTargets: string[];           // 57 Fcl_* expression morph names
  skeleton: Skeleton;               // 52 J_Bip bones
  springBoneChains: string[];       // J_Sec chain names
  gender: 'masculine' | 'feminine';
}

interface PrimInfo {
  name: string;                     // e.g. 'Body_00_SKIN', 'Shoes_01_CLOTH'
  type: 'skin' | 'cloth' | 'hair' | 'eye' | 'mouth' | 'brow' | 'lash' | 'line';
  material: Material;
  mesh: Mesh;
  vertexCount: number;
}
```

### Detection Logic

```typescript
// Classify each mesh/submesh by material name:
//   *_CLOTH → type: 'cloth'
//   *_SKIN  → type: 'skin'
//   *_HAIR  → type: 'hair'
//   *_EYE   → type: 'eye'
//   FaceMouth* → type: 'mouth'
//   FaceBrow*  → type: 'brow'

// Determine clothingMode:
//   has CLOTH prims → 'A'
//   SKIN tri count > 9000, no CLOTH → 'B' (baked)
//   SKIN tri count < 9000, no CLOTH → 'nude'

// Infer gender from eyelash presence + spring bone count
```

### Babylon.js vs Three.js Mapping

| Three.js | Babylon.js | Notes |
|----------|-----------|-------|
| `THREE.SkinnedMesh` | `BABYLON.Mesh` with `skeleton` | Babylon meshes optionally have skeletons |
| `mesh.geometry.groups` | `mesh.subMeshes` | SubMesh = glTF primitive |
| `THREE.Skeleton` | `BABYLON.Skeleton` | Same concept, different API |
| `mesh.material[i]` | `MultiMaterial.subMaterials[i]` | Babylon uses MultiMaterial for multi-prim meshes |
| `material.uniforms.litFactor` | `material.albedoColor` (PBR) | Direct property access on PBRMaterial |

---

## 6. Material Modification (`avatar/MaterialEditor.ts`)

Port of `vrmMaterialEditor.js`. Same API surface, Babylon.js internals.

### API

```typescript
class MaterialEditor {
  // Tier 1: Material Color
  setSkinTone(structure: VRMStructure, hex: string): void;
  setEyeColor(structure: VRMStructure, hex: string): void;
  setHairColor(structure: VRMStructure, hex: string): void;
  setLipColor(structure: VRMStructure, hex: string): void;
  setEyebrowColor(structure: VRMStructure, hex: string): void;
  setNailColor(structure: VRMStructure, hex: string): void;
  setClothingColor(structure: VRMStructure, primName: string, hex: string): void;

  // Texture swap
  swapTexture(prim: PrimInfo, texture: Texture): void;

  // Getters
  getSkinTone(structure: VRMStructure): Color3;
  getEyeColor(structure: VRMStructure): Color3;
  getHairColor(structure: VRMStructure): Color3;
  getLipColor(structure: VRMStructure): Color3;

  // Snapshot for undo/restore
  snapshotMaterials(structure: VRMStructure): MaterialSnapshot;
  restoreMaterials(structure: VRMStructure, snapshot: MaterialSnapshot): void;
}
```

### MToon Shader Handling

VRoid uses MToon with `litFactor` (main color) and `shadeColorFactor` (shadow tint):

**Option A (preferred):** Use community `babylon-vrm-loader` if it supports MToon
**Option B:** Convert to PBRMaterial on load, preserving shade ratio: `shade ≈ base × 0.8`

### Linked Materials

Skin tone must apply to both body and face simultaneously:
- `Body_00_SKIN` + `Face_00_SKIN` → always set together

Hair color applies to all HAIR materials:
- `Hair001` mesh + `HairBack_00_HAIR` in body mesh

---

## 7. Clothing System (`avatar/ClothingManager.ts`)

Port of `vrmClothingManager.js`. Mesh-level clothing operations.

### API

```typescript
class ClothingManager {
  // Extraction (from source VRM)
  extractClothingPieces(structure: VRMStructure): ClothingPiece[];

  // Application (to target avatar)
  applyClothingPiece(targetSkeleton: Skeleton, piece: ClothingPiece): boolean;
  removeClothingPiece(scene: Scene, pieceName: string): boolean;
  toggleClothingVisibility(pieceName: string, visible: boolean): boolean;
  getEquippedClothing(): EquippedItem[];

  // Catalog-based loading
  equipFromCatalog(itemId: string, targetSkeleton: Skeleton): Promise<boolean>;
  unequipSlot(slot: ClothingSlot): boolean;

  // Slot management (DRESSING_ROOM_SPEC §3.2)
  handleOnepieceOverride(): void;  // Auto-unequip tops+bottoms when onepiece equipped
}
```

### Skeleton Rebinding

The critical algorithm that enables cross-avatar clothing (ADR-006):

```typescript
function rebindToSkeleton(clothMesh: Mesh, targetSkeleton: Skeleton): void {
  // 1. Get bone indices from clothing mesh's original skeleton
  // 2. For each bone index, look up the bone NAME from original skeleton
  // 3. Find the bone with the same NAME in the target skeleton
  // 4. Remap bone indices to target skeleton's indices
  // 5. Reassign mesh.skeleton = targetSkeleton
  //
  // Works because ALL VRoid exports use identical 52 J_Bip bone names.
  // Vertex weights reference bones by name — we just redirect which
  // skeleton object provides each named bone.
}
```

### ClothingPiece Type

```typescript
interface ClothingPiece {
  name: string;          // 'Shoes_01_CLOTH'
  slot: ClothingSlot;    // Inferred from material name
  mesh: Mesh;            // Detached mesh with skinning data
  material: Material;
  vertexCount: number;
  sourceFile: string;    // Catalog reference
}

type ClothingSlot =
  | 'underpants' | 'undershirt' | 'socks'
  | 'bottoms' | 'tops' | 'onepiece'
  | 'shoes' | 'accessory_neck' | 'accessory_arm';
```

---

## 8. Hair Swap (`avatar/HairSwapper.ts`)

```typescript
class HairSwapper {
  extractHair(donorContainer: AssetContainer): HairData;
  applyHair(target: VRMStructure, hair: HairData): void;
  swapFromCatalog(hairId: string, target: VRMStructure): Promise<void>;
}

interface HairData {
  frontMesh: Mesh;          // Hair001 mesh
  backMesh: Mesh | null;    // HairBack prim from Body mesh
  materials: Material[];
  springBoneConfig: object; // J_Sec parameters for physics
}
```

---

## 9. Bone Proportions (`avatar/BoneEditor.ts`)

```typescript
class BoneEditor {
  setHeight(skeleton: Skeleton, value: number): void;          // 0.7–1.3
  setShoulderWidth(skeleton: Skeleton, value: number): void;   // 0.7–1.3
  setArmLength(skeleton: Skeleton, value: number): void;       // 0.7–1.3
  setLegLength(skeleton: Skeleton, value: number): void;       // 0.7–1.3
  setNeckLength(skeleton: Skeleton, value: number): void;      // 0.7–1.3
  setHeadScale(skeleton: Skeleton, value: number): void;       // 0.8–1.2

  applyProportions(skeleton: Skeleton, proportions: Proportions): void;
  extractProportions(skeleton: Skeleton): Proportions;
}
```

### Bone → Property Mapping

| Property | Bone(s) | Axis | Range |
|----------|---------|------|-------|
| Height | J_Bip_C_Hips | Y translation | 0.7 – 1.3 |
| Shoulder Width | J_Bip_L/R_UpperArm | X translation | 0.7 – 1.3 |
| Arm Length | J_Bip_L/R_LowerArm | Y translation | 0.7 – 1.3 |
| Leg Length | J_Bip_L/R_LowerLeg | Y translation | 0.7 – 1.3 |
| Neck Length | J_Bip_C_Neck | Y translation | 0.7 – 1.3 |
| Head Scale | J_Bip_C_Head | Uniform scale | 0.8 – 1.2 |

---

## 10. Texture Compositing (`avatar/SkinCompositor.ts`)

6-layer compositing stack (DRESSING_ROOM_SPEC §2.2).

### Layer Stack

```
Layer 5: Temporary Effects    (mud, paint, zombie — session-only)
Layer 4: Tattoos              (persistent, up to 8 simultaneous)
Layer 3: Makeup               (lipstick, eyeshadow — per-outfit)
Layer 2: Nail Polish          (color tint — per-outfit)
Layer 1: Clothing Paint       (socks, underwear — texture-only items)
Layer 0: Base Skin            (Body_00_SKIN / Face_00_SKIN)
```

### API

```typescript
class SkinCompositor {
  setBaseSkin(preset: SkinPreset | Color3): void;
  addClothingPaint(slot: string, texture: HTMLImageElement): void;
  removeClothingPaint(slot: string): void;
  setNailColor(hex: string): void;
  addMakeup(region: MakeupRegion, style: string, color: string, opacity: number): void;
  removeMakeup(region: MakeupRegion): void;
  addTattoo(id: string, region: TattooRegion, texture: HTMLImageElement, opacity: number): void;
  removeTattoo(id: string): void;
  addTempEffect(id: string, texture: HTMLImageElement): void;
  clearTempEffects(): void;
  setCreativeSkin(skinId: string): void;

  compose(): { bodyTexture: DynamicTexture; faceTexture: DynamicTexture };
}
```

### Implementation

OffscreenCanvas (2048×2048 body, 1024×1024 face). Alpha-blend layers bottom-to-top. Upload to GPU as DynamicTexture. Recomposite only on layer change (~2-5ms).

---

## 11. Manifest Assembly (`avatar/ManifestAssembler.ts`)

Central orchestrator. Takes CHARACTER_MANIFEST JSON → builds live avatar.

### Assembly Pipeline

```typescript
async assemble(manifest: CharacterManifest): Promise<void> {
  // 1. Load nude base (nude-feminine.glb or nude-masculine.glb)
  // 2. Apply proportions (BoneEditor)
  // 3. Apply material colors (MaterialEditor)
  // 4. Compose skin layers — tattoos, makeup, socks (SkinCompositor)
  // 5. Swap hair (HairSwapper)
  // 6. Equip clothing in slot order (ClothingManager)
  // 7. Start idle animation + blink controller
}

// Serialize current state back to manifest
extractManifest(): CharacterManifest;

// Export assembled avatar as baked GLB
async exportGLB(): Promise<ArrayBuffer>;
```

---

## 12. 3D Viewport

### DressingRoomCamera.ts

ArcRotateCamera with orbit controls, zoom limits (1.5m–5m), vertical constraints. Panning disabled. Auto-focus methods for face/body/feet when switching UI sections.

### LightingSetup.ts

Studio lighting: hemisphere fill (cool blue-grey) + directional key (warm white, 45° front-right) + soft shadow on floor plane.

### Background.ts

Neutral gradient (dark bottom, lighter top) or simple room. Not the grid floor from Glitch.

---

## 13. UI Overlay (`hud/`)

DOM-based sidebar, 320px wide. Same pattern as Glitch's HUD: inline CSS injection, pointer-events management, vanilla TypeScript.

Three tabs: **Outfits** (default) | **Body** | **Wardrobe**

See DRESSING_ROOM_SPEC.md §2 for detailed tab content specifications.

### Reusable Components

| Component | Purpose |
|-----------|---------|
| ThumbnailGrid | Outfit gallery, wardrobe items, hair selector |
| ColorPicker | Preset swatches + custom `<input type="color">` |
| SliderControl | Proportions with descriptive endpoints |
| TabBar | Main tab switching |

---

## 14. World Integration (`bridge/`)

### PostMessageBridge

8 message types per DRESSING_ROOM_SPEC §7.2. Same implementation pattern as Glitch's PostMessageBridge.

### Bootstrap

```typescript
if (isEmbedded()) {
  bridge.onSpawn(async (payload) => {
    await lifecycle.spawn(payload);
    bridge.sendReady();
  });
} else {
  await lifecycle.spawn(DEFAULT_MANIFEST);  // Standalone dev mode
}
```

### AppearancePanel.ts (World)

Two-tab panel: Outfits (inline quick swap) + Dressing Room (launch button). See DRESSING_ROOM_SPEC §7.1.

---

## 15. Asset Extraction Pipeline (`tools/`)

Build-time Node.js scripts processing 220 VRM source files:

```
220 VRMs (3.5GB) → tools/ → 197 GLBs + 34 PNGs + 231 thumbnails + items.json
```

| Script | Input | Output |
|--------|-------|--------|
| `extract-clothing.mjs` | VRMs with CLOTH prims | Individual GLB per clothing piece |
| `extract-textures.mjs` | Texture-only VRMs (socks, underwear) | Alpha-masked compositing PNGs |
| `generate-thumbnails.mjs` | All items | 256×256 JPG per item |
| `build-catalog.mjs` | All outputs above | `items.json` catalog manifest |

Deploy to `/var/www/avatar/assets/` (Phase 1, static) or S3+CDN (Phase 2).

---

## 16. GLB Export

Baked avatar for World consumption:

1. `ManifestAssembler.exportGLB()` → ArrayBuffer (via @babylonjs/serializers)
2. Generate thumbnail via `scene.tools.CreateScreenshot()`
3. POST to `/nexus/avatars/upload` (multipart: GLB + thumbnail + manifest JSON)
4. Server stores to S3, updates `users.avatar_url` + `users.avatar_config`
5. WebSocket broadcast → all players in zone reload the avatar

---

## 17. Build Configuration

### vite.config.ts

```typescript
export default defineConfig({
  base: '/avatar/',
  resolve: { alias: { '@avatar': resolve(__dirname, 'src') } },
  server: { port: 3002, host: true },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          babylonjs: ['@babylonjs/core', '@babylonjs/loaders', '@babylonjs/serializers'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['@babylonjs/core', '@babylonjs/loaders', '@babylonjs/serializers'],
  },
  assetsInclude: ['**/*.glb', '**/*.vrm'],
});
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "paths": { "@avatar/*": ["./src/*"] }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tools"]
}
```

### Core Dependencies

```
@babylonjs/core ^8.0.0
@babylonjs/loaders ^8.0.0
@babylonjs/serializers ^8.0.0
typescript ^5.4.0
vite ^6.0.0
```

---

## 18. Implementation Sprints

### Sprint 0: Project Scaffold
Vite + Babylon + TS. Load and display a VRM. Orbit camera. Studio lighting.
**Deliverable:** VRM mannequin visible, orbit works, dev server at localhost:3002.

### Sprint 1: VRM Analysis + Material Editing
VRMAnalyzer + MaterialEditor. Minimal sidebar with color pickers.
**Deliverable:** Change avatar skin/eye/hair/lip color via sidebar controls.

### Sprint 2: Clothing System + Hair Swap
ClothingManager + HairSwapper + skeleton rebinding. WardrobeTab.
**Deliverable:** Click clothing thumbnail → equips. Click hair → swaps.

### Sprint 3: Texture Compositing + Bone Proportions
SkinCompositor + BoneEditor. BodyTab with sliders and tattoo/makeup UI.
**Deliverable:** Tattoo + height adjust + socks = all visible simultaneously.

### Sprint 4: Manifest Assembly + Outfit Save/Load
ManifestAssembler + CatalogLoader. OutfitsTab with gallery.
**Deliverable:** Save outfit → reload → restores from manifest.

### Sprint 5: World Integration
PostMessageBridge + EmbedDetection + AppearancePanel. GLB export.
**Deliverable:** Enter Dressing Room from World → customize → return → others see change.

### Sprint 6: Asset Extraction + Catalog Deploy
Build-time tools: extract 220 VRMs → GLBs + PNGs + thumbnails + items.json.
**Deliverable:** Full clothing catalog browsable in WardrobeTab.

### Sprint 7: Polish + Production
Debug keys, error handling, performance profiling, production deploy to poqpoq.com/avatar/.

---

## 19. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| MToon shader unavailable in Babylon.js 8.x | PBR conversion with shade ratio; investigate community VRM loader |
| VRM spring bones (hair physics) | Custom spring solver or accept static hair Phase 1 |
| Texture compositing slow on mobile | Smaller canvas fallback (1024); batch layer changes |
| Cross-gender clothing clipping | Gender tag on items; allow but warn |
| GLB export breaks material appearance | Test export pipeline early; preserve material properties |

---

## 20. References

### Specifications
- [DRESSING_ROOM_SPEC.md](DRESSING_ROOM_SPEC.md) — Feature spec, UX, slot system, compositing
- [CHARACTER_MANIFEST_SPEC.md](CHARACTER_MANIFEST_SPEC.md) — JSON format, NEXUS integration, assembly
- [ADR-001](adr/ADR-001-VRM-POST-IMPORT-MODIFICATION.md) — VRM modification tiers
- [ADR-004](adr/ADR-004-APPEARANCE-TAB-INTEGRATION.md) — World shelf integration
- [ADR-005](adr/ADR-005-AVATAR-STORAGE-AND-IDENTITY.md) — Storage strategy
- [ADR-006](adr/ADR-006-UNIFIED-SKELETON-CONTRACT.md) — Skeleton contract, bone mapping

### Architecture Reference
- Glitch repo: `../glitch/` — Babylon.js patterns (engine, lifecycle, HUD, bridge)
- World repo: `../../World/` — AppearancePanel stub, AvatarDriverFactory

### Preserved Code (Port Targets)
- `avatar-preserved/library/vrmMaterialEditor.js` — Material modification API (Three.js → port)
- `avatar-preserved/library/vrmClothingManager.js` — Clothing system API (Three.js → port)

### Assets
- `avatar-preserved/assets/vRoidModels/` — 220 VRM source files (complete collection)
- 197 unique CLOTH meshes + 34 texture-only garments (verified via fingerprinting)

---

_Last Updated: 2026-02-27_
