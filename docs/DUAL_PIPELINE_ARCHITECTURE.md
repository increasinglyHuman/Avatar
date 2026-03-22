# Dual Pipeline Architecture — VRM + Ruth/Roth Coexistence

**Version:** 1.0
**Date:** 2026-03-09
**Status:** Draft
**Implements:** ADR-008 (Ruth/Roth Stream), ADR-001 (VRM), DRESSING_ROOM_SPEC
**References:** ADR-006 (Skeleton Contract), CHARACTER_MANIFEST_SPEC

---

## 1. Overview

The BlackBox Avatar dressing room supports **two avatar pipelines** sharing a single application:

```
┌─────────────────────────────────────────────────┐
│              DRESSING ROOM APPLICATION           │
│                                                  │
│  ┌──────────────────┐  ┌──────────────────────┐  │
│  │   VRM Pipeline   │  │  Ruth/Roth Pipeline  │  │
│  │                  │  │                      │  │
│  │  VRoid imports   │  │  OpenSim base meshes │  │
│  │  J_Bip skeleton  │  │  SL Bento skeleton   │  │
│  │  MToon→PBR mats  │  │  Native PBR mats     │  │
│  │  6 prop sliders  │  │  60+ shape sliders   │  │
│  │  VRoid clothing  │  │  SL-rigged clothing  │  │
│  └────────┬─────────┘  └──────────┬───────────┘  │
│           │                       │               │
│           └───────────┬───────────┘               │
│                       ▼                           │
│            ┌──────────────────┐                   │
│            │  Character       │                   │
│            │  Manifest JSON   │                   │
│            │  + Baked GLB     │                   │
│            └────────┬─────────┘                   │
│                     │                             │
└─────────────────────┼─────────────────────────────┘
                      ▼
              poqpoq World (GLB consumer)
```

Both pipelines produce the same output: a **Character Manifest JSON** + **baked GLB**. The World doesn't care which pipeline created the avatar — it just loads GLB and plays Mixamo animations via the appropriate BoneMapper platform.

---

## 2. Shared Systems

These systems are **identical** across both pipelines:

### 2.1 Babylon.js Viewport
- Same scene, camera, lighting, backdrop
- Same orbit controls, zoom, pan
- Same animation preview system

### 2.2 MaterialEditor
Both VRM and Ruth/Roth share the same material editing interface:

| Property | VRM Behavior | Ruth/Roth Behavior |
|----------|-------------|-------------------|
| Skin tone | HSL remap on MToon→PBR | Direct PBR albedo modification |
| Eye color | EyeIris material | Eye material (standard PBR) |
| Hair color | All *_HAIR materials | Hair material (standard PBR) |
| Lip color | Composited texture layer | Composited texture layer |

The `MaterialEditor` class accepts any `AbstractMesh` material — no pipeline-specific code needed.

### 2.3 Texture Compositing
The 6-layer compositing stack (DRESSING_ROOM_SPEC §4) works for both:

```
Layer 6: Temporary effects (both)
Layer 5: Tattoos (both)
Layer 4: Makeup (both)
Layer 3: Nail polish (both)
Layer 2: Clothing paint (VRM: socks/underwear textures | Ruth: Bakes on Mesh)
Layer 1: Base skin (both)
```

### 2.4 Outfit System
Save/load outfits via Character Manifest:

```jsonc
// VRM outfit
{ "base": "nude-feminine", "equipped": { "tops": { "item": "top12" } } }

// Ruth/Roth outfit
{ "base": "ruth2-feminine", "shapeParameters": { "height": 62 }, "equipped": { "tops": { "item": "sl-blouse-01" } } }
```

### 2.5 PostMessage Bridge
World ↔ Dressing Room communication is pipeline-agnostic:
- `ENTER_DRESSING_ROOM` — carries current manifest (either type)
- `AVATAR_UPDATED` — returns updated manifest (either type)
- `EXIT_DRESSING_ROOM` — returns to World with baked GLB

### 2.6 GLB Export
Both pipelines bake to GLB for World consumption:
- VRM: Strip VRM extensions, convert MToon→PBR, merge meshes → GLB
- Ruth/Roth: Apply bone transforms, merge meshes → GLB
- Both produce: skeleton + mesh + materials + animations

---

## 3. Pipeline-Specific Systems

### 3.1 VRM Pipeline (Existing — Phase 1)

```
VRM Upload → VRMAnalyzer → detect structure
  → MaterialEditor (MToon→PBR conversion)
  → ClothingManager (VRoid slot system)
  → HairSwapper (Hair001 mesh replacement)
  → BoneEditor (6 proportion sliders, ±30%)
  → SkinCompositor (6-layer stack)
  → ManifestAssembler → JSON + GLB
```

**Key classes:**
- `VRMAnalyzer` — detects mesh structure, material types, clothing primitives
- `ClothingManager` — VRoid 9-slot system, equip/unequip by primitive visibility
- `HairSwapper` — replaces Hair001 mesh from catalog
- `BoneEditor` — 6 sliders modifying J_Bip bone translations

### 3.2 Ruth/Roth Pipeline (New — Phase 2.5)

```
Base Selection (ruth2-feminine | roth2-masculine)
  → RuthRothLoader → import GLB, detect SL skeleton
  → ShapeParameterDriver (60+ sliders → bone transforms)
  → MaterialEditor (native PBR, no conversion needed)
  → SLClothingManager (SL slot system)
  → SkinCompositor (6-layer stack, SL UV layout)
  → ManifestAssembler → JSON + GLB
```

**Key classes (TO CREATE):**
- `RuthRothLoader` — loads base GLB, validates SL skeleton, sets up collision volumes
- `ShapeParameterDriver` — maps 60+ slider values to bone position/scale transforms
- `ShapeParameterDefinitions` — static catalog of all parameters with bone driver specs
- `SLClothingManager` — SL slot system (12+ slots), clothing rigged to Bento skeleton
- `ShapeSliderPanel` — UI with categorized sliders (body, face, legs, torso)

---

## 4. Dressing Room UI Adaptation

The three-pillar sidebar adapts based on `manifest.base`:

### Tab 1: Outfits (Same for Both)
```
┌─────────────────────┐
│ ★ Outfits           │
│                     │
│ [Current Look]      │
│                     │
│ ┌───┐ ┌───┐ ┌───┐  │
│ │ 1 │ │ 2 │ │ 3 │  │ ← Saved outfit thumbnails
│ └───┘ └───┘ └───┘  │
│ ┌───┐ ┌───┐ ┌───┐  │
│ │ 4 │ │ 5 │ │ + │  │
│ └───┘ └───┘ └───┘  │
│                     │
│ [Save Current]      │
└─────────────────────┘
```

### Tab 2: Body (Adapts per Pipeline)

**VRM Mode:**
```
┌─────────────────────┐
│ ♦ Body              │
│                     │
│ Proportions         │
│ Height    [====|==] │
│ Shoulders [===|===] │
│ Arms      [====|==] │
│ Legs      [===|===] │
│ Neck      [====|==] │
│ Head      [===|===] │
│                     │
│ Skin                │
│ Tone      [■■■□□□] │
│ Eyes      [■■□□□□] │
│ Hair      [■■■■□□] │
│ Lips      [■■□□□□] │
└─────────────────────┘
```

**Ruth/Roth Mode:**
```
┌─────────────────────┐
│ ♦ Body              │
│                     │
│ ▸ Body Shape        │
│   Height    [==|==] │
│   Thickness [==|==] │
│   Body Fat  [==|==] │
│   Muscle    [==|==] │
│                     │
│ ▸ Torso             │
│   Torso Len [==|==] │
│   Shoulders [==|==] │
│   Breast    [==|==] │
│   Belly     [==|==] │
│                     │
│ ▸ Legs              │
│   Leg Length[==|==] │
│   Hip Width [==|==] │
│   Butt Size [==|==] │
│                     │
│ ▸ Head & Neck       │
│   Head Size [==|==] │
│   Neck Len  [==|==] │
│                     │
│ ▸ Hands & Feet      │
│   Hand Size [==|==] │
│   Foot Size [==|==] │
│                     │
│ ▸ Skin & Colors     │
│   Tone      [■■□□] │
│   Eyes      [■■□□] │
│   Hair      [■■□□] │
│                     │
│ ▸ Face (Bento)      │
│   [Expand for 25+   │
│    face sliders]    │
└─────────────────────┘
```

### Tab 3: Wardrobe (Separate Catalogs)

Same UI structure, different catalog:

```
┌─────────────────────┐
│ ♣ Wardrobe          │
│                     │
│ [Tops] [Bottoms]    │
│ [Shoes] [Acc]       │
│                     │
│ ┌───┐ ┌───┐ ┌───┐  │
│ │   │ │   │ │   │  │ ← Items from correct catalog
│ └───┘ └───┘ └───┘  │  (VRM or SL, based on base type)
└─────────────────────┘
```

---

## 5. Avatar Type Switching

Users can switch between VRM and Ruth/Roth base types. This is a **destructive operation** (equipped clothing doesn't transfer):

```
User clicks "Change Avatar Type"
  → Warning dialog: "Switching base type will reset your outfit. Continue?"
  → If confirmed:
    1. Save current manifest as backup
    2. Unload current avatar
    3. Load new base mesh
    4. Apply default manifest for new type
    5. Reset all sliders to defaults
    6. Show appropriate UI panels
```

### Entry Points

**From World:**
- Player opens dressing room → loads their current manifest → pipeline auto-detected from `base`

**From Dressing Room:**
- "New Avatar" button → choose type: "VRM (Upload)" or "Ruth/Roth (Customize)"
- VRM: file picker for .vrm upload
- Ruth/Roth: gender selection → loads ruth2-feminine or roth2-masculine

---

## 6. Animation System

Both pipelines play from the **same animation library** (ADR-006):

```
Animation Library (Mixamo bone names)
         │
         ├──→ BoneMapper "vrm_vroid" platform → J_Bip bones → VRM avatar
         │
         └──→ BoneMapper "opensim" platform → mBone names → Ruth/Roth avatar
```

### Runtime Binding

```typescript
// Pseudocode — same for both pipelines
const animGlb = await loadAnimationGlb("idle.glb");  // Mixamo bones
const platform = BoneMapper.detectPlatform(avatar.skeleton);
const mapping = BoneMapper.getMapping(platform);

for (const track of animGlb.tracks) {
  const avatarBone = mapping[track.boneName];
  if (avatarBone) {
    avatar.skeleton.getBone(avatarBone).applyTrack(track);
  }
  // Missing bones: silently skip (graceful degradation)
}
```

### Ruth/Roth Specifics
- Collision volume bones are **not animated** (skip patterns exclude them)
- Face bones (mFace*) are not in Mixamo animations — hold rest pose
- Wing/tail/hind limb bones — not animated unless SL-specific animation loaded

---

## 7. Database Schema Impact

The existing NEXUS schema accommodates both pipelines:

```sql
-- users.avatar_config (JSONB) — stores current live manifest
-- Works for both VRM and Ruth/Roth: "base" field distinguishes type

-- inventory_items — clothing items
-- Add: source_pipeline ENUM('vrm', 'opensim', 'supermesh') DEFAULT 'vrm'
-- Clothing is pipeline-specific; source_pipeline prevents cross-equipping

-- user_characters — saved character presets
-- manifest JSONB works for both pipeline types
```

### New Inventory Source

```sql
ALTER TABLE inventory_items
  ADD COLUMN source_pipeline VARCHAR(20) DEFAULT 'vrm'
  CHECK (source_pipeline IN ('vrm', 'opensim', 'supermesh'));
```

---

## 8. Asset Organization

```
public/assets/
├── bases/
│   ├── nude-feminine.glb          # VRM base
│   ├── nude-masculine.glb         # VRM base
│   ├── ruth2-feminine.glb         # Ruth2 v4 base
│   └── roth2-masculine.glb        # Roth2 v2 base
│
├── clothing/
│   ├── vrm/                       # VRoid-extracted clothing (J_Bip rig)
│   │   ├── tops/
│   │   ├── bottoms/
│   │   └── ...
│   └── opensim/                   # SL-rigged clothing (Bento rig)
│       ├── tops/
│       ├── bottoms/
│       └── ...
│
├── hair/
│   ├── vrm/                       # VRoid hair meshes
│   └── opensim/                   # SL hair meshes
│
└── textures/
    ├── skin/                      # Shared skin textures
    ├── eyes/                      # Shared eye textures
    └── clothing/                  # Clothing textures (both pipelines)
```

---

## 9. Class Architecture

```
src/
├── core/
│   ├── AvatarEngine.ts            # Babylon.js scene, camera, lights
│   ├── AvatarLifecycle.ts         # Startup/shutdown/state management
│   └── PostMessageBridge.ts       # World ↔ Dressing Room communication
│
├── avatar/
│   ├── MaterialEditor.ts          # SHARED — material property editing
│   ├── TextureRecolorizer.ts      # SHARED — HSL texture remapping
│   ├── SkinCompositor.ts          # SHARED — 6-layer texture compositing
│   ├── ManifestAssembler.ts       # SHARED — JSON + GLB export
│   │
│   ├── vrm/                       # VRM-SPECIFIC
│   │   ├── VRMAnalyzer.ts
│   │   ├── VRMClothingManager.ts
│   │   ├── VRMHairSwapper.ts
│   │   └── VRMBoneEditor.ts       # 6 proportion sliders
│   │
│   └── opensim/                   # RUTH/ROTH-SPECIFIC
│       ├── RuthRothLoader.ts
│       ├── ShapeParameterDriver.ts
│       ├── ShapeParameterDefinitions.ts
│       └── SLClothingManager.ts
│
├── ui/
│   ├── Sidebar.ts                 # SHARED — 3-tab container
│   ├── OutfitPanel.ts             # SHARED — Tab 1
│   ├── WardrobePanel.ts           # SHARED (filters by pipeline)
│   │
│   ├── VRMBodyPanel.ts            # VRM — Tab 2 (6 sliders + colors)
│   └── ShapeSliderPanel.ts        # Ruth/Roth — Tab 2 (60+ sliders, categorized)
│
└── data/
    ├── vrm-clothing-catalog.json  # VRoid clothing metadata
    └── opensim-clothing-catalog.json # SL clothing metadata
```

---

## 10. Implementation Sequence

### Sprint A: Ruth/Roth Base Import (parallel with VRM work)
1. Export Ruth2 v4 + Roth2 v2 from Blender as GLB (Y-up)
2. Create `RuthRothLoader.ts` — load GLB, validate skeleton, identify collision volumes
3. Test in existing viewport — avatar should display correctly
4. Verify BoneMapper `opensim` platform detects and maps correctly
5. Test Mixamo animation playback

### Sprint B: Shape Parameter System
1. Create `ShapeParameterDefinitions.ts` — 20 body proportion parameters
2. Create `ShapeParameterDriver.ts` — reads definitions, applies bone transforms
3. Create `ShapeSliderPanel.ts` — categorized slider UI
4. Wire sliders to driver → see real-time deformation

### Sprint C: Pipeline Abstraction
1. Refactor sidebar to detect `base` type and show correct panels
2. Add avatar type selection to "New Avatar" flow
3. Ensure ManifestAssembler handles both manifest formats
4. Test save/load cycle for Ruth/Roth manifests

### Sprint D: Ruth/Roth Clothing
1. Import first batch of SL-rigged clothing GLBs
2. Create `SLClothingManager.ts` — SL slot system
3. Implement alpha masking (hide body under clothing)
4. Build opensim clothing catalog

### Sprint E: Extended Parameters
1. Add remaining body parameters (40 more)
2. Add Bento face parameters (if face bones present)
3. Integrate Max meshes when available
4. Full outfit save/load with shapeParameters

---

## 11. Open Questions

1. **Clothing rigging quality?** Will generic SL-rigged clothing deform correctly when shape parameters are extreme? May need per-item testing.

2. **High-heel foot variants?** Ruth2 has multi-height feet. Do we swap foot meshes per shoe type, or use a single foot with bone adjustment?

3. **Bakes on Mesh?** SL's BoM composites 5-11 texture channels. Our 6-layer compositor covers the basics, but full BoM compatibility may be needed for importing SL textures.

4. **Max timeline?** When will Max/Maxine/Maxwell be stable enough to replace Ruth2/Roth2 as our base meshes?

5. **Cross-pipeline outfits?** Should users be able to save "mixed" outfits that reference both VRM and SL items? (Current answer: no — base type determines catalog.)

---

_This specification defines the dual-pipeline architecture for poqpoq World's avatar system. Phase 1 (VRM) ships first. Phase 2.5 (Ruth/Roth) runs in parallel, sharing the dressing room application while maintaining separate asset pipelines and skeleton contracts._
