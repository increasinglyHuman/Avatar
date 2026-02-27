# ADR-003: SuperMesh Architecture

**Status:** Accepted
**Date:** 2026-02-26
**Authors:** Allen Partridge, Claude Code
**Relates to:** AVATAR_STRATEGY.md Phase 3
**Timeline:** Late 2026 (Fall base meshes, Winter clothing + attachments)

---

## Context

SuperMesh is poqpoq's proprietary avatar standard — the long-term answer to character creation. Binary masculine/feminine base meshes with comprehensive parametric controls, Marvelous Designer clothing pipeline, a full attachment system, and web delivery at 60fps with 20+ simultaneous avatars.

VRM gets us running. AI mesh gives uniqueness. SuperMesh gives us **everything**: body customization, face sculpting, clothing, accessories, expressions, lip sync, and a creator economy.

A detailed specification exists at `Marketplace/poqpoq_avatar_system_requirements_v1.1.md`. This ADR translates that spec into architectural decisions for Avatar app integration.

---

## Why Binary (Not Unified Cross-Gender)

Cross-gender unified meshes fail at extremes — masculine forms look soft, feminine forms look blocky. We use two topologically distinct meshes that share an identical interface contract:

| Shared | Different |
|--------|-----------|
| Skeleton hierarchy (72 bones) | Mesh topology (body proportions, edge flow) |
| UV layout (identical islands) | Blend shape sculpts (same names, different targets) |
| Blend shape channel names | Material detail (skin texture, face geometry) |
| Attachment points | Triangle distribution (varies by region) |
| Material slot names | Spring bone placement (bust, hair, clothing) |
| LOD level structure | |
| Animation compatibility | |

**Key principle:** Any tool, clothing item, animation, or attachment that works on one base works on the other. The interface contract is the product; the mesh is the implementation.

---

## Skeleton (72 Bones)

### Hierarchy

```
root
└── hips
    ├── spine_01 (lumbar)
    │   └── spine_02 (thoracic)
    │       └── spine_03 / chest
    │           ├── neck → head → eye_L, eye_R, jaw
    │           ├── clavicle_L → shoulder_helper_L → upperarm_L
    │           │   ├── upperarm_twist_L
    │           │   ├── elbow_helper_L
    │           │   └── forearm_L → forearm_twist_L → hand_L
    │           │       └── [thumb/index/middle/ring/pinky]_01-03_L
    │           └── (mirror for _R)
    ├── upperleg_L
    │   ├── upperleg_twist_L
    │   ├── hip_adjust_L
    │   └── lowerleg_L → knee_helper_L → lowerleg_twist_L → foot_L → toe_L
    └── (mirror for _R)
```

### Bone Breakdown

| Region | Count | Notes |
|--------|-------|-------|
| Root/Hips/Spine | 5 | root, hips, spine_01-03 |
| Head/Neck | 5 | neck, head, eye_L, eye_R, jaw |
| Per arm (×2) | 8 | clavicle, shoulder_helper, upperarm, upperarm_twist, elbow_helper, forearm, forearm_twist, hand |
| Per hand (×2) | 15 | 5 fingers × 3 joints |
| Per leg (×2) | 8 | upperleg, upperleg_twist, hip_adjust, lowerleg, knee_helper, lowerleg_twist, foot, toe |
| **Total** | **72** | |

### Helper Bones (Procedurally Driven)

These are NOT keyframed — they're driven at runtime by parent bone rotation:

| Helper | Driver | Damping | Purpose |
|--------|--------|---------|---------|
| `shoulder_helper` | upperarm rotation | ~50% | Distributes deltoid deformation |
| `upperarm_twist` | forearm pronation | proportional | Prevents candy-wrapper on upper arm |
| `forearm_twist` | hand rotation | proportional | Prevents candy-wrapper on forearm |
| `elbow_helper` | forearm flexion | ~50% | Smooths inner elbow crease |
| `knee_helper` | lowerleg flexion | ~50% | Smooths popliteal (back of knee) |
| `hip_adjust` | upperleg rotation | driven | Manages gluteal fold and groin crease |
| `upperleg_twist` | foot rotation | proportional | Distributes twist along thigh |
| `lowerleg_twist` | foot rotation | proportional | Distributes twist along shin |

**Babylon.js implementation:** Helper bone drivers must be computed per-frame in JavaScript before the skeleton matrix update. This is lightweight (quaternion slerp operations) but must be integrated into World's animation loop.

### Mixamo Compatibility

SuperMesh skeleton is a **superset** of Mixamo. The core 52 bones map 1:1. The additional ~20 bones (twist, helper, corrective) enhance deformation but are invisible to Mixamo animations — they simply hold rest pose when not driven.

```
VRM J_Bip (52 bones)  ⊂  SuperMesh (72 bones)  ↔  Mixamo mapping (via name table)

Animations authored for Mixamo work on SuperMesh with no modification.
SuperMesh-specific animations can drive twist/helper bones for enhanced quality.
```

### Bind Pose Decision

**T-pose.** Mixamo standard, Meshy standard, VRM standard. A-pose creates retargeting complexity for zero gain in our pipeline. Vinnie should model and rig in T-pose from day one.

---

## Mesh Segmentation (4 Pieces)

The avatar is NOT monolithic. It's segmented for independent LOD, material assignment, and attachment hiding:

### Torso Core
- **Coverage:** Hips to neck, upper arms to above elbow, upper legs to above knee
- **Budget:** 4,000-6,000 quads (8K-12K tris at LOD 0)
- **Contains:** Most body morph targets, primary masc/fem topology divergence
- **Seam locations:** Neck ring, wrist rings, ankle rings (edge count must match connecting segments)

### Head
- **Coverage:** Full head including ears, neck-seam attachment
- **Budget:** 3,000-5,000 quads (6K-10K tris at LOD 0)
- **Highest polygon density** relative to surface area — immersion lives here
- **Includes:** Separate eyeball meshes (for look-at tracking), interior mouth geometry (for visemes), teeth, tongue placeholder
- **Edge flow:** Must follow facial musculature (orbicularis oculi, orbicularis oris, zygomaticus)

### Hands (Pair)
- **Budget:** 1,500-2,000 quads (3K-4K tris) for the pair
- **Features:** Individual finger bone chains, fingernail geometry (separate material slot), ring/bracelet attachment topology
- **Wrist seam:** Edge count matches torso arm-end exactly

### Feet (Pair)
- **Budget:** 750-1,000 quads (1.5K-2K tris) for the pair
- **Features:** Toe splay, arch deformation, toenail geometry (separate material slot)
- **Ankle seam:** Hidden by virtually any footwear

---

## Blend Shapes (~123-138 per mesh)

### Body Morphs (15 channels)

| Channel | Range | Description |
|---------|-------|-------------|
| `muscularity` | 0–1 | Muscle definition (lean → bodybuilder / soft → athletic) |
| `body_fat` | 0–1 | Fat distribution, interacts with muscularity |
| `height_proportion` | -1 to 1 | Torso-to-leg ratio (NOT actual height) |
| `torso_length` | -1 to 1 | Torso length independent of legs |
| `leg_length` | -1 to 1 | Leg length independent of torso |
| `shoulder_width` | -1 to 1 | Broader/narrower shoulders |
| `hip_width` | -1 to 1 | Broader/narrower hips |
| `chest_size` | 0–1 | Pectoral mass (masc) / breast size A-DD+ (fem) |
| `waist` | -1 to 1 | Waist circumference |
| `belly` | 0–1 | Belly protrusion |
| `neck_thickness` | -1 to 1 | Neck circumference |
| `arm_mass` | -1 to 1 | Arm thickness |
| `leg_mass` | -1 to 1 | Leg thickness |
| `glute_size` | 0–1 | Gluteal mass |
| `aging` | 0–1 | Skin sag, mass redistribution |

### Face Morphs (52 ARKit + 16+ Structural)

**52 ARKit-compatible shapes** for real-time facial tracking (LiveLink Face, iOS). These enable motion capture directly from phone cameras.

**16+ structural morphs** for face customization:

`jaw_width`, `cheekbone_prominence`, `nose_bridge_width`, `nose_tip_shape`, `brow_depth`, `lip_fullness`, `lip_width`, `eye_size`, `eye_spacing`, `eye_tilt`, `face_length`, `face_width`, `forehead_height`, `chin_projection`, `ear_size`, `ear_angle`

### Visemes (15 channels)

Standard set for lip sync: `sil, PP, FF, TH, DD, kk, CH, SS, nn, RR, aa, E, ih, oh, ou`

Compatible with VRM viseme spec and standard TTS/speech-to-viseme pipelines.

### Corrective Blend Shapes (25-40)

Procedurally driven at runtime by bone rotation angles — not keyframed:

| Region | Count (per side) | Shapes |
|--------|-----------------|--------|
| Shoulder | 4-6 | up, fwd, back, diagonals |
| Elbow | 1-2 | flex, flex_twist |
| Wrist | 2-3 | flex, extend, twist |
| Hip | 3-4 | flex, spread, flex_spread, back |
| Knee | 1-2 | flex, flex_twist |
| Spine | 2-3 | bend_fwd, bend_side, twist |

**Babylon.js consideration:** Morph target weights must be updated per-frame based on bone rotation angles. This is the same driver loop as helper bones — lightweight but must be in the animation pipeline.

---

## LOD Chain (5 Levels)

| LOD | Quads | Runtime Tris | Distance | Blend Shapes | Use Case |
|-----|-------|-------------|----------|-------------|----------|
| 0 (Hero) | 11K-18K | 22K-36K | <5m | Full (all 123-138) | Own avatar, close partners |
| 1 (Near) | 6K-9K | 12K-18K | 5-15m | Body + basic facial | Nearby avatars |
| 2 (Mid) | 2.5K-4K | 5K-8K | 15-40m | Body only | Room distance |
| 3 (Far) | 1K-1.5K | 2K-3K | 40m+ | None (silhouette) | Distant avatars |
| 4 (Thumbnail) | 400-600 | 800-1.2K | N/A | None | Mobile portraits, minimap |

**Performance target:** 60fps with 20+ simultaneous avatars on mid-range hardware (GTX 1060 / M1 equivalent) in Babylon.js.

---

## Attachment System

This is the killer feature that VRM and AI mesh can't offer.

### Standard Attachment Points

| Point | Bone | Examples |
|-------|------|----------|
| `head_top` | head | Hats, crowns, antennae, horns |
| `ear_L` / `ear_R` | head | Earrings, headsets, ear accessories |
| `neck` | neck | Collars, necklaces, chokers |
| `chest` | spine_03 | Badges, jewelry, chest plates |
| `waist` | hips | Belts, hip accessories, tool belts |
| `wrist_L` / `wrist_R` | hand_L/R | Watches, bracelets, gauntlets |
| `finger_*_L/R` | finger joints | Rings (5 slots per hand) |
| `back` | spine_02 | Capes, wings, backpacks, quivers |
| `hip_L` / `hip_R` | hips | Holsters, pouches, side weapons |

### Attachment Mechanism

1. Attachments are separate GLB meshes rigged to the shared skeleton
2. Attachment is parented to the specified bone with a local offset transform
3. Clothing items define **alpha masks** that hide body mesh underneath (prevents Z-fighting)
4. Attachments respond to body morph changes via shared blend shape channel names
5. Spring bone / secondary motion compatible with VRM specification for physics (capes, dangly bits)

### Clothing as Attachments

Clothing in SuperMesh is fundamentally an attachment with extra capabilities:
- Rigged to shared skeleton (same weight painting reference)
- Responds to body morphs (chest_size changes → clothing deforms to match)
- Hides covered body regions via alpha mask
- Multiple clothing items can layer (undershirt → jacket → coat)

---

## Marvelous Designer Clothing Pipeline

This is the creator economy enabler — fashion designers and cosplayers can create for our marketplace without learning Blender.

### Pipeline Steps

```
1. EXPORT MANNEQUIN
   SuperMesh base → OBJ with smooth surface + accurate proportions
   └── Must be physically accurate for MD's cloth simulation draping

2. DESIGN IN MARVELOUS DESIGNER
   Creator designs garment using standard pattern-making
   └── MD produces clean quad mesh with UVs
   └── Physical cloth simulation ensures realistic fit

3. AUTO-RIG TO SKELETON
   System auto-rigs garment via proximity-based weight transfer from body mesh
   └── No manual weight painting required
   └── Creator never needs to touch bone weights

4. GENERATE BLEND SHAPE ADAPTATIONS
   System auto-generates morph responses for each body channel
   └── Shirt responds to chest_size, shoulder_width, etc.
   └── Must be automated — can't expect MD creators to hand-sculpt 15 morph variants

5. ALPHA MASK GENERATION
   Determine which body regions the garment covers
   └── Generate mask to hide covered body mesh
   └── Must handle varying morph states (shirt covers more belly when belly=1)

6. PACKAGE + UPLOAD
   Garment GLB + alpha mask + metadata → marketplace
   └── Auto-fits both masculine and feminine bases
   └── Single design works across both body types (shared UV layout)
```

### Minimum Clothing Set for Phase 3a Launch

| Category | Count | Examples |
|----------|-------|---------|
| Tops | 4-6 | T-shirt, hoodie, button-down, tank, jacket |
| Bottoms | 3-4 | Jeans, shorts, skirt, sweatpants |
| Shoes | 3-4 | Sneakers, boots, sandals, dress shoes |
| Full body | 1-2 | Jumpsuit, dress |
| Underwear | 2 | Basic masc, basic fem |

**Total minimum:** ~15-20 garments to feel like a viable wardrobe.

---

## Material System

Layered compositing approach inspired by Second Life's Bakes on Mesh:

### Layer Stack

```
1. BASE SKIN (PBR)
   └── Albedo + Normal + Roughness + Subsurface scattering
   └── Multiple skin tone presets + full color customization

2. OVERLAY LAYERS (composited as texture operations)
   └── Tattoos, body paint, freckles, scars, body hair
   └── Blend modes: multiply, overlay, alpha blend

3. MAKEUP (head only)
   └── Eye shadow, lipstick, blush, eyeliner
   └── Separate texture channel composited onto face region

4. FINAL COMPOSITE
   └── All layers baked to single material pass per segment
   └── Keeps draw calls manageable for web delivery
```

### Material Slots

| Segment | Slots |
|---------|-------|
| Torso | `skin` |
| Head | `skin_face`, `eye_L`, `eye_R`, `teeth`, `tongue`, `eyelash` |
| Hands | `skin_hands`, `nails` |
| Feet | `skin_feet`, `toenails` |

---

## Avatar App Integration (Phase 3)

### SuperMesh Creator UI

The full parametric creator — "the vanity mirror":

```
┌─────────────────────────────────────────────────────────┐
│  Create Avatar                              [M] [F]     │
│                                                         │
│  ┌──────────┐  ┌───────────────────────────────────┐   │
│  │ Body     │  │                                   │   │
│  │ Face     │  │        3D Preview Viewport        │   │
│  │ Skin     │  │                                   │   │
│  │ Hair     │  │     (rotate, zoom, expression      │   │
│  │ Eyes     │  │      preview, animation preview)   │   │
│  │ Makeup   │  │                                   │   │
│  │ Clothing │  │                                   │   │
│  │ Attach.  │  │                                   │   │
│  └──────────┘  └───────────────────────────────────┘   │
│                                                         │
│  Body ─────────────────────────────────────────────     │
│  Muscularity:    [────●────] 0.4                       │
│  Body Fat:       [──●──────] 0.2                       │
│  Chest Size:     [─────●───] 0.6                       │
│  Shoulder Width: [───────●─] 0.8                       │
│  ...                                                    │
│                                                         │
│  [Save Draft]  [Preview in World]  [Save to World]     │
└─────────────────────────────────────────────────────────┘
```

### Files to Create

| File | Purpose |
|------|---------|
| `src/library/superMeshManager.js` | SuperMesh loading, morph control, material compositing |
| `src/library/superMeshAttachments.js` | Attachment system (load, parent, alpha mask) |
| `src/library/clothingPipeline.js` | Auto-rig, morph adaptation, marketplace integration |
| `src/pages/SuperMeshCreator.jsx` | Full parametric creation UI |
| `src/components/MorphSliderPanel.jsx` | Reusable morph target slider UI |
| `src/components/AttachmentBrowser.jsx` | Browse/equip attachments from marketplace |

---

## Unity Pipeline Considerations (Vinnie)

Vinnie Argentina has requested deeper exploration of Unity pipeline variations for skeleton alignment. Key points:

1. **Blender → Unity → back to Blender** may introduce bone rotation offsets
2. **FBX export from Blender** uses different axis conventions than Unity expects
3. **Humanoid rig mapping** in Unity's Avatar system has specific bone naming expectations
4. **Recommendation:** Author in Blender 4.x, test FBX round-trip through Unity early, document any rotation corrections needed. Don't discover these at delivery time.

---

## Phased Delivery

### Phase 3a: Base Meshes (Fall 2026)
- Masculine + feminine torso, head, hands, feet at LOD 0
- 15 body morph channels working
- 72-bone skeleton with helper bone drivers
- Basic skin material (PBR, 3-4 skin tone presets)
- T-pose validated against Mixamo retargeting
- Import into Avatar app, preview, export GLB
- World integration via AvatarDriverFactory `case 'supermesh'`

### Phase 3b: Face + Clothing (Late 2026)
- 52 ARKit face shapes + 16+ structural morphs
- 15 visemes
- Corrective blend shapes (25-40)
- Marvelous Designer pipeline functional
- First clothing set (15-20 garments)
- Makeup/tattoo layer compositing

### Phase 3c: Attachments + Marketplace (Early 2027)
- Full attachment system (all standard points)
- Attachment alpha masking
- LOD chain (all 5 levels)
- Marketplace integration (upload, browse, equip)
- Creator documentation for MD pipeline

---

## Open Questions

1. **Correctives in Babylon.js:** Babylon's morph target system supports additive blending, but driving morph weights from bone rotations per-frame needs performance profiling with 20+ avatars.
2. **Clothing morph auto-generation:** The spec says "automatically generates blend shape adaptations." The actual algorithm for this needs R&D. Delta Mush? Laplacian deformation? Shrinkwrap + smooth?
3. **Alpha mask at varying morphs:** When belly=1, a shirt covers more area. Does the alpha mask need to be morph-responsive, or can we use conservative (maximum coverage) masks?
4. **Hair system:** Spec mentions spring bone physics mesh. VRM J_Sec approach? Custom physics? How many spring chains can Babylon.js handle at 60fps with 20+ avatars?

---

## References

- SuperMesh specification: `Marketplace/poqpoq_avatar_system_requirements_v1.1.md`
- World driver stub: `World/src/avatars/AvatarDriverFactory.ts` (case 'supermesh')
- Marketplace types: `Marketplace/src/types/marketplace.ts` (AvatarBodyType)
- Animator skeleton plan: `blackBoxIKAnimator/docs/ANIMATION_LIBRARY_PLAN.md`
- Bone mapping: `src/library/VRMRigMapMixamo.js`
- Animator retargeting: `blackBoxIKAnimator/src/retargeting/`

---

_Last Updated: 2026-02-26_
