# Ruth/Roth Technical Research

**Date:** 2026-03-09
**Purpose:** Technical reference for ADR-008 implementation

---

## 1. SL/OpenSim Skeleton Anatomy

### Pre-Bento (Classic) — 26 Body Bones

```
mPelvis
├── mTorso
│   ├── mChest
│   │   ├── mNeck
│   │   │   └── mHead
│   │   │       ├── mEyeLeft
│   │   │       └── mEyeRight
│   │   ├── mCollarLeft
│   │   │   └── mShoulderLeft (= upper arm!)
│   │   │       └── mElbowLeft (= forearm!)
│   │   │           └── mWristLeft (= hand!)
│   │   └── mCollarRight
│   │       └── mShoulderRight
│   │           └── mElbowRight
│   │               └── mWristRight
│   └── (empty — no hip bones on torso)
├── mHipLeft (= thigh!)
│   └── mKneeLeft (= shin!)
│       └── mAnkleLeft (= foot!)
│           └── mToeLeft
└── mHipRight
    └── mKneeRight
        └── mAnkleRight
            └── mToeRight
```

### Bento Extensions (+106 bones)

Added in SL 2016, optional for OpenSim:

- **Spine extensions:** mSpine1, mSpine2, mSpine3, mSpine4 (between mTorso and mChest)
- **Finger bones (30):** mHandThumb1-3, mHandIndex1-3, mHandMiddle1-3, mHandRing1-3, mHandPinky1-3 (Left/Right)
- **Face bones (40+):** mFaceForeheadLeft/Right/Center, mFaceEyebrowOuter/Inner/Center Left/Right, mFaceEyeLid Upper/Lower Left/Right, mFaceNose Left/Right/Center/Bridge, mFaceLip Upper/Lower Left/Right, mFaceCheek Upper/Lower Left/Right, mFaceJaw, mFaceChin, mFaceTeethUpper/Lower, mFaceTongueBase/Tip
- **Wing bones (6):** mWing1-4 Left/Right, mWingRoot
- **Tail bones (6):** mTail1-6
- **Hind limb bones (8):** mHindLimb1-4 Left/Right

### Collision Volume Bones (24)

ALL_CAPS naming. Used for **fitted mesh** soft-body deformation:

```
PELVIS, BUTT, BELLY, CHEST, LEFT_PEC, RIGHT_PEC, NECK, HEAD,
L_UPPER_ARM, R_UPPER_ARM, L_LOWER_ARM, R_LOWER_ARM,
L_HAND, R_HAND,
L_UPPER_LEG, R_UPPER_LEG, L_LOWER_LEG, R_LOWER_LEG,
L_CLAVICLE, R_CLAVICLE, L_FOOT, R_FOOT
```

---

## 2. SL Naming Gotchas

The SL bone naming is **notoriously confusing** because the names describe the joint, not the bone segment:

| SL Name | What It Actually Is | Why It's Confusing |
|---------|--------------------|--------------------|
| mShoulder | Upper arm bone | "Shoulder" usually means clavicle |
| mElbow | Forearm bone | "Elbow" is a joint, not a bone |
| mWrist | Hand bone | "Wrist" is a joint, not a bone |
| mHip | Thigh bone | "Hip" usually means pelvis area |
| mKnee | Shin/lower leg bone | "Knee" is a joint |
| mAnkle | Foot bone | "Ankle" is a joint |
| mCollar | Clavicle/shoulder bone | Only one that's kinda right |

**The BoneMapper must translate these correctly.** Our `opensim` platform definition handles this.

---

## 3. Shape Parameter System — The Full Picture

SL's 218 visual parameters fall into **five types** (not just bone transforms):

| Type | Count | Mechanism | Example |
|------|-------|-----------|---------|
| `param_morph` | ~80 | Vertex deformation (blend shapes) | Big_Belly_Torso, Muscular_Legs |
| `param_skeleton` | ~60 | Bone scale/offset transforms | Height, Arm Length, Head Size |
| `param_color` | ~30 | Skin/hair/eye color channels | Skin tone, eye color |
| `param_driver` | ~30 | Meta-params that drive combos | Body Fat drives belly+torso+legs |
| `param_alpha` | ~18 | Alpha mask visibility | Clothing alpha layers |

**Critical insight:** Many user-facing sliders are `param_driver` types that drive **both** morphs and bone transforms simultaneously. For example, "Body Fat" drives `param_morph` targets (belly shape, torso shape) AND `param_skeleton` transforms (collision volume scales). This is NOT purely bone-driven.

### Parameter Encoding

- **Internal:** Float values with per-param min/max/default
- **Network:** Packed to single U8 byte (0-255): `byte = (float - min) / (max - min) * 255`
- **UI:** Displayed as 0-100 slider
- **File format:** Text-based `.xml` shape files with `param_id value` pairs

### Parameter Categories (User-Visible)

| Category | ~Slider Count | Mix of Types |
|----------|--------------|-------------|
| Body | ~15 | skeleton + driver + morph |
| Head | ~12 | morph + skeleton |
| Eyes | ~8 | morph + color |
| Nose | ~8 | morph |
| Mouth | ~8 | morph |
| Chin | ~6 | morph |
| Torso | ~10 | skeleton + morph |
| Legs | ~8 | skeleton + morph |
| Hair | ~12 | morph (hair mesh) |
| Skin | ~6 | color + texture |

**Total user-facing:** ~80-90 sliders. Remaining ~130 are animation-driven (emotes, hand poses, eye blinks), internal system params.

### Bone-Driven Parameters (param_skeleton)

### Body Proportions (~20 parameters)

| Parameter | Default | Range | Bones | Transform |
|-----------|---------|-------|-------|-----------|
| Height | 50 | 0-100 | mPelvis | Y translate (root offset) |
| Body Thickness | 50 | 0-100 | PELVIS, BELLY, CHEST | X/Z scale |
| Body Fat | 50 | 0-100 | BELLY, PELVIS, BUTT | XYZ scale |
| Shoulder Width | 50 | 0-100 | mCollarLeft/Right | X translate |
| Hip Width | 50 | 0-100 | PELVIS, mHipLeft/Right | X translate/scale |
| Arm Length | 50 | 0-100 | mShoulderLeft/Right, mElbowLeft/Right | Y scale |
| Leg Length | 50 | 0-100 | mHipLeft/Right, mKneeLeft/Right | Y scale |
| Torso Length | 50 | 0-100 | mTorso, mChest | Y scale |
| Neck Length | 50 | 0-100 | mNeck | Y scale |
| Neck Thickness | 50 | 0-100 | NECK | XZ scale |
| Breast Size | 50 | 0-100 | CHEST, LEFT_PEC, RIGHT_PEC | Scale |
| Breast Gravity | 50 | 0-100 | LEFT_PEC, RIGHT_PEC | Y translate |
| Breast Cleavage | 50 | 0-100 | LEFT_PEC, RIGHT_PEC | X translate |
| Belly Size | 50 | 0-100 | BELLY | Z scale |
| Butt Size | 50 | 0-100 | BUTT | Scale |
| Love Handles | 50 | 0-100 | PELVIS | X scale (lower) |
| Saddle Bags | 50 | 0-100 | L_UPPER_LEG, R_UPPER_LEG | X scale (upper) |
| Hand Size | 50 | 0-100 | mWristLeft/Right | Uniform scale |
| Foot Size | 50 | 0-100 | mAnkleLeft/Right | Uniform scale |
| Head Size | 50 | 0-100 | mHead | Uniform scale |

### Face Proportions (~25 bone-driven parameters)

Requires Bento face bones. Deferred to Phase 2.5c.

| Category | Count | Examples |
|----------|-------|---------|
| Forehead | 3 | Height, angle, width |
| Brow | 3 | Height, depth, width |
| Eye | 6 | Size, spacing, depth, angle, height, inner corner |
| Nose | 5 | Width, length, tip angle, bridge width, nostril width |
| Mouth | 5 | Width, lip fullness upper/lower, lip thickness, corner angle |
| Chin | 4 | Depth, width, cleft, angle |
| Jaw | 3 | Width, angle, jowls |
| Ears | 3 | Size, angle, tip attachment |

### Texture-Only Parameters (~78)

Not bone-driven. Handled by MaterialEditor:
- Skin tone (RGB base color)
- Eye color
- Hair color
- Lip color
- Makeup layers (blush, eyeshadow, eyeliner)
- Nail polish
- Freckles, moles, age spots (texture overlays)

---

## 4. avatar_lad.xml Structure

The canonical SL appearance definition file. Key elements:

```xml
<linden_avatar version="2.0">
  <skeleton>
    <bone name="mPelvis" pos="0 0 1.067" rot="0 0 0" scale="1 1 1" pivot="0 0 0">
      <bone name="mTorso" pos="0 0.084 0" rot="0 0 0" ...>
        <!-- hierarchy continues -->
      </bone>
      <collision_volume name="PELVIS" pos="0 0.015 -0.01" scale="0.124 0.08 0.115"/>
    </bone>
  </skeleton>

  <param id="33" group="shape" name="Height" wearable="shape"
         label="Height" min="0" max="100" value_default="50">
    <param_driver>
      <driven id="bone:mPelvis" property="offset" axis="z"
              min="-0.05" max="0.05"/>
    </param_driver>
  </param>
</linden_avatar>
```

Each parameter specifies:
- **ID** (integer, unique across all 218 params)
- **Group** (shape, skin, hair, eyes, etc.)
- **Wearable** (which clothing layer it belongs to)
- **Drivers** (which bones/textures/morphs it affects)
- **Range** (min/max in internal units, mapped from 0-100 slider)

**Full structure has 5 major sections:**
1. `<skeleton>` — Bone hierarchy + attachment points
2. `<mesh>` — References to `.llm` binary mesh files (head, upper_body, lower_body, eyes, hair, skirt) with 4 LOD levels each
3. `<global_color>` — Skin, hair, eye color parameter definitions
4. `<layer_set>` — Texture compositing layer definitions (this IS the Bakes on Mesh foundation)
5. `<driver_parameters>` — Meta-parameters that drive combinations of other params

**`edit_group` attribute** determines UI tab placement: `shape_head`, `shape_eyes`, `shape_nose`, `shape_mouth`, `shape_chin`, `shape_body`, `shape_legs`, `shape_torso`, `hair_style`, `skin_color`, etc.

**Implementation note:** We don't need to parse `avatar_lad.xml` at runtime. We extract the parameter→bone mappings into a static TypeScript definition file (`ShapeParameterDefinitions.ts`).

**Key source locations:**
- SL viewer: `indra/newview/character/avatar_lad.xml` ([GitHub](https://github.com/secondlife/viewer/blob/main/indra/newview/character/avatar_lad.xml))
- Appearance code: `indra/llappearance/` (morph application, texture compositing)
- libOpenMetaverse: `_VisualParam_.cs` (C# equivalent of all 218 params with IDs, ranges, categories)

---

## 4b. SL Morph Target System (.llm Format)

The original SL morph targets are stored in proprietary `.llm` (Linden Lab Mesh) binary files:

- Each `.llm` contains base mesh geometry + embedded morph targets as vertex offset arrays
- Morph names match `avatar_lad.xml` param names: `Big_Belly_Torso`, `Muscular_Legs`, `Hands_Point`, etc.
- Multiple morphs blend additively, weighted by their parameter value (0.0-1.0)
- Separate `.llm` per body region: `avatar_head.llm`, `avatar_upper_body.llm`, `avatar_lower_body.llm`, `avatar_eye.llm`, `avatar_hair.llm`, `avatar_skirt.llm`
- Each has 4 LOD variants (e.g., `avatar_head_1.llm` through `avatar_head_4.llm`)

**Parser source:** `indra/llappearance/llpolymesh.cpp` (mesh loading), `indra/llappearance/llpolymorph.cpp` (morph application)

### Potential .llm → glTF Conversion Pipeline

No existing tool converts SL morph data to glTF blend shapes. The gap:

1. Parse `avatar_lad.xml` for parameter definitions
2. Read `.llm` binary meshes → extract base geometry + morph vertex offsets
3. Convert each morph to a glTF morph target (position deltas)
4. Map `param_skeleton` parameters to bone transforms separately
5. Export as glTF with morph targets + skeleton

**This is a significant engineering effort** but would give us the "real" SL morph system in the browser. For Phase 2.5a, we start with bone-driven parameters only (which are simpler and work without morph targets). Full morph support is Phase 2.5c.

---

## 4c. Bakes on Mesh (BoM)

SL's texture compositing system, defined in `avatar_lad.xml` `<layer_set>` sections:

### Bake Regions (11 channels)

| Region | Original 6 | BoM Extension |
|--------|-----------|---------------|
| HEAD | Yes | |
| UPPER_BODY | Yes | |
| LOWER_BODY | Yes | |
| EYES | Yes | |
| HAIR | Yes | |
| SKIRT | Yes | |
| LEFT_ARM | | Yes |
| LEFT_LEG | | Yes |
| AUX1 | | Yes |
| AUX2 | | Yes |
| AUX3 | | Yes |

### Layer Stack (example: UPPER_BODY)

```
7. Alpha mask layer (top)
6. Jacket (outer) layer
5. Jacket (inner) layer
4. Shirt layer
3. Undershirt layer
2. Tattoo layer
1. Skin texture (from skin wearable)
0. Skin base color (from color params) (bottom)
```

### Implementation in Babylon.js

BoM is essentially multi-layer texture compositing — maps to:
- `DynamicTexture` or `ProceduralTexture` as compositing target
- Render fullscreen quads per layer with texture + color tint + blend mode
- One render target per bake region (2048×2048 body, 1024×1024 head)
- Our existing 6-layer compositor (DRESSING_ROOM_SPEC) covers the basics
- Full BoM compatibility (11 channels) needed for importing SL textures directly

### BoM Special Texture UUIDs

Each bake channel has a reserved UUID. When a mesh face references this UUID, the viewer substitutes the composited bake result. For our system, we use a similar signal: a material property flag indicating "use composited texture here."

---

## 4d. Existing Tools and Libraries

| Tool | Type | License | What It Does |
|------|------|---------|-------------|
| **Avastar** | Blender plugin | Commercial | Full SL appearance system in Blender (reads avatar_lad.xml, shape sliders as shape keys + bone transforms) |
| **Ruth2/Roth2** | Blender files | CC-BY-4.0 | Base meshes with SL-compatible rig and limited shape keys |
| **libOpenMetaverse** | C# library | BSD | Complete 218-param definitions in `_VisualParam_.cs`, appearance packet encoding |
| **SL Viewer source** | C++ | LGPL | Canonical implementation: morph application, texture compositing, `.llm` parser |
| **Max** | Blender files | CC-BY-4.0 | Successor to Ruth/Roth with improved morphing (Maxine/Maxwell) |

**No existing tool converts SL appearance → glTF blend shapes.** We'd be building this.

---

## 5. Ruth2 v4 Specifics

### Mesh Topology
- **Single mesh body** (not segmented like SuperMesh)
- **UV mapped** for standard SL texture baking (upper body / lower body / head channels)
- **Vertex count:** ~8,000-12,000 (low-poly by modern standards, suitable for real-time)
- **LOD variants:** Usually 4 levels exported from Blender

### Skeleton
- Full Bento skeleton when exported with Bento rig
- Pre-Bento versions have only 26 body bones
- **Our target:** Bento version (fingers, face bones, extended spine)

### Known Export Issues
- Z-up (Blender native) → must convert to Y-up for Babylon.js at export time
- glTF exporter handles axis conversion automatically
- Weight painting quality varies — some community exports have artifacts at shoulders/hips
- **Multi-height feet:** Ruth2 has separate foot meshes for flat/mid/high heel heights (seen in test import)

### Shape Keys (Blender)
- Ruth2 v4 has **limited** shape keys — mostly basic body proportion variants
- Not a full implementation of SL's `param_morph` system
- SL appearance sliders use a **combination** of shape keys + bone transforms — not purely one-to-one
- Some sliders → single shape key (e.g., `Big_Belly_Torso`)
- Others → bone scale/offset only (e.g., Height, Arm Length)
- Driver params → multiple morphs + bone transforms simultaneously
- **Known unsupported sliders in Ruth2** (mesh topology constraints): Head Shape, Eyelash Length, Eye Pop, Ear Angle, Attached Earlobe, Jowls, Chin Cleft, Upper Chin Cleft
- Max project aims to add more shape keys and fill these gaps

---

## 6. Roth2 v2 Specifics

### Differences from Ruth2
- Male proportions (wider shoulders, narrower hips, no breast geometry)
- Same skeleton (SL Bento)
- Same UV layout conventions
- Same export pipeline (Blender → GLB)

### Import Test Results (March 2026)
- Roth2 imported cleanly into Animator as GLB
- BoneMapper detected `opensim` platform after adding the definition
- **Before BoneMapper fix:** Catastrophic fuzzy matching — hips→mHipRight, leftFoot→mFootRight
- **After BoneMapper fix:** Correct mapping via explicit `opensim` platform bones

---

## 7. Comparison: Ruth/Roth vs SuperMesh

| Feature | Ruth/Roth | SuperMesh (ADR-003) |
|---------|-----------|-------------------|
| Skeleton | 132+ SL Bento bones | 72 bones (Mixamo superset) |
| Body deformation | Bone-driven (collision volumes) | Blend shapes (15 channels) |
| Face deformation | Bone-driven (Bento face) + limited morphs | Blend shapes (52 ARKit + 16 structural) |
| Mesh segments | 1 (whole body) | 4 (torso, head, hands, feet) |
| Vertex count | ~8K-12K | ~22K-36K (hero) |
| LOD support | 4 levels (manual) | 5 levels (automatic) |
| Clothing approach | SL-rigged clothing (Bento skeleton) | MD pipeline (J_Bip skeleton) |
| Corrective shapes | None (bone-only) | 25-40 corrective blend shapes |
| Expression system | Bento face bones | ARKit blend shapes |
| Content ecosystem | Large (OpenSim community) | From scratch |
| License | CC-BY-4.0 | Custom (our creation) |
| Web editor exists? | **No — we'd be first** | No (also our creation) |

---

## 8. Implementation Priority

### Start With (Phase 2.5a)
1. Ruth2 v4 GLB import into Babylon.js viewport
2. `ShapeParameterDriver` with 20 body proportion sliders
3. Collision volume bone scaling for soft-body parameters
4. Mixamo animation playback via BoneMapper
5. Basic PBR material editing (skin, eyes, hair)

### Then (Phase 2.5b)
6. Roth2 v2 import + same slider system
7. First batch of SL-rigged clothing (tops, bottoms, shoes)
8. Alpha masking for clothing (hide body under clothes)
9. Outfit save/load via Character Manifest v2

### Later (Phase 2.5c)
10. Face bone sliders (Bento face)
11. Max/Maxine/Maxwell mesh integration
12. Extended parameter set (full ~60 bone + face)
13. Bakes on Mesh texture compositing

---

_Last Updated: 2026-03-09_
