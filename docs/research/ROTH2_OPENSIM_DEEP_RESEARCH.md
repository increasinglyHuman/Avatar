# Roth2 & OpenSim Avatar System -- Deep Research

**Date:** 2026-03-24
**Purpose:** Comprehensive technical reference for BlackBox Avatar Ruth/Roth implementation (ADR-008)
**Builds on:** `RUTH_ROTH_TECHNICAL_RESEARCH.md` (2026-03-09)

---

## 1. Roth2 Project Overview

### Repository
- **URL:** https://github.com/RuthAndRoth/Roth2
- **Description:** Virtual World Mesh Male Avatar
- **Current version:** Roth2 v2 (released 2020-05-24)
- **Last commit:** 2023-10-17 (box art update; mesh itself stable since 2020)
- **License:** AGPL-3.0-or-later for body mesh; mixed licenses per component (see below)
- **Original creator:** Shin Ingen (ZBrush, 2017-2018)
- **Rigging/weights:** Ada Radius (Blender 2.8)

### Design Philosophy
Roth2 is a **low-poly mesh body** designed specifically for OpenSimulator (also works in Second Life). It uses standard SL UV maps and is built as a single-layer mesh optimized for **Bakes on Mesh** (BoM). The single-layer design eliminates the need for separate mesh alpha sections -- system-layer alpha masks provide body-part hiding instead.

---

## 2. Roth2 Mesh Structure

### Mesh Statistics (from Ai Austin blog, Firestorm viewer measurements)

| Component | Vertices | Triangles | Complexity |
|-----------|----------|-----------|------------|
| Body (Upper + Lower) | 9,772 | 18,038 | 7,344 |
| Hands | 3,328 | 5,918 | 5,256 |
| Fingernails | 1,552 | 2,328 | 1,290 |
| Feet (Flat) | 2,792 | 5,016 | 528 |
| Toenails | 1,400 | 1,904 | 390 |
| Head | 1,112 | 1,844 | 480 |
| Eyeballs | 296 | 544 | 414 |
| **Total (incl. base avatar)** | **~20,252** | **~35,592** | **17,702** |

**Note:** Complexity includes base avatar with shape, skin (3x 512x512 textures), hair, and eyes (128x128 texture) = 2,000 base. The hand complexity (5,256) is notably higher than Ruth2's hands (1,224).

### Comparison: Roth2 vs Ruth2

| Metric | Ruth2 v4 (Female) | Roth2 v2 (Male) |
|--------|-------------------|-----------------|
| Body vertices | 6,300 | 9,772 |
| Body triangles | 11,410 | 18,038 |
| Hand vertices | 3,320 | 3,328 |
| Total complexity | 8,096 | 17,702 |
| Body design | Single mesh | Single mesh |
| BoM support | Yes | Yes |
| Foot variants | 3 (flat/mid/high) | 1 (flat) |
| Fingernail variants | 5 | Unknown |
| Elf ears | Yes | Unknown |

Roth2 has **significantly higher polygon density** than Ruth2, particularly in the body mesh (55% more vertices, 58% more triangles).

### Available DAE Export Files

```
Roth2-v2-Body.dae              -- Torso, arms, legs only (no feet/hands/head)
Roth2-v2-Eyes.dae              -- Rigged eyes
Roth2-v2-Feet.dae              -- Feet only
Roth2-v2-Full_Body-Feet-Hands-Head.dae  -- Complete avatar
Roth2-v2-Hands.dae             -- Hands with minimal arm geometry
Roth2-v2-Head.dae              -- Head with face mappings
Roth2-v2-Head-Vneck.dae        -- Head + neck + torso (V-neck seam)
Roth2-v2-Headless_Body-Feet-Hands.dae  -- Full body minus head
Roth2-v2-Physics-Outline.dae   -- Simplified physics collision
Physics-TriPlane.dae           -- Single triangle for physics
```

### Blender Source Files
- `Roth2V2Dev.blend` -- development mesh without armature
- `Roth2V2DevWithArmature.blend` -- mesh with armature (re-added 2023-04)

---

## 3. Roth2 vs Ruth2 -- Key Differences

### Mesh Topology
- **Ruth2:** Female proportions (narrower shoulders, wider hips, breast geometry, more foot variants)
- **Roth2:** Male proportions (wider shoulders, narrower hips, no breast geometry, flat feet only)
- Both use the **same SL UV layout** (CC-BY Linden Lab)
- Both are **single-layer** meshes for BoM compatibility

### Skeleton
- **Identical skeleton:** Both use the SL Bento skeleton (26 classic body bones + Bento extensions)
- Same bone names, same hierarchy, same collision volumes
- Same rigging approach: up to 4 weights per vertex

### Shape Slider Compatibility
Both Ruth2 and Roth2 share the same shape slider limitations:

**Unsupported sliders (morph-only, no effect on mesh avatars):**
- Head Shape, Eyelash Length, Eye Pop
- Ear Angle, Attached Earlobe
- Jowls, Chin Cleft, Upper Chin Cleft

**Limited effect on headless body:**
- Body Fat (collision volume scaling only, no morph)
- Neck Length/Thickness extremes (neck seam artifacts)

**Full bone-driven sliders work correctly on both:**
- Height, Body Thickness, Shoulder Width
- Arm Length, Leg Length, Torso Length
- Head Size, Hand Size, Foot Size
- Hip Width, Breast Size (Ruth2), Pectorals (Roth2)
- All collision volume parameters (Belly, Butt, Love Handles, etc.)

### Clothing Compatibility
- Ruth2 and Roth2 clothing is **NOT cross-compatible** in general
- SL-rigged clothing made for the system body has mixed results on both
- Clothing specifically rigged to Ruth2/Roth2 dev kit meshes fits better
- Both use the same alpha masking system for hiding body under clothing
- Both support Bakes on Mesh for texture-layer clothing

---

## 4. Licensing (Roth2 Detailed)

Roth2 uses a **multi-license structure** by component type:

| Component | License | Author |
|-----------|---------|--------|
| Body mesh (upper/lower) | AGPL-3.0-or-later | Shin Ingen (2018) |
| Hands mesh | AGPL-3.0-or-later | Shin Ingen |
| Feet mesh | AGPL-3.0-or-later | Shin Ingen |
| Head mesh | CC-BY | Linden Lab |
| Fingernails/toenails | Virtual World Licence | Sundance Haiku |
| UV map | CC-BY | Linden Lab |
| Avastar rig components | CC-BY-3.0 | Machinimatrix.org |
| R2 Logo | CC-BY | Serie Sumei |

**AGPL implications:** The AGPL license on the body mesh means derivative works must also be AGPL. This is more restrictive than Ruth2's effective licensing and the Max project's CC-BY-4.0.

**For BlackBox Avatar:** We should track which license applies to which component. The head mesh (CC-BY Linden Lab) and UV maps (CC-BY) are the most permissive. The body mesh AGPL may require careful handling if we modify the mesh itself (bone-driven deformation at runtime is not a derivative work of the mesh; it's using it as-is).

---

## 5. The OpenSim Shape Parameter System -- Full Technical Deep Dive

### 5.1 Overview: avatar_lad.xml

The **Linden Avatar Definition** file (`avatar_lad.xml`) is the canonical specification for the SL/OpenSim avatar system. Located at `indra/newview/character/avatar_lad.xml` in the SL viewer source. It contains:

1. **`<skeleton>`** -- Bone hierarchy + 32 attachment points
2. **`<mesh>`** -- References to `.llm` binary mesh files (6 body regions x 4 LODs each)
3. **`<global_color>`** -- Skin, hair, eye color parameter definitions
4. **`<layer_set>`** -- Texture compositing layers (the foundation of Bakes on Mesh)
5. **`<driver_parameters>`** -- Meta-parameters that chain multiple params together

### 5.2 The 5 Parameter Types

There are **218 VisualParam blocks** total, split across 5 types:

#### param_skeleton (~60 parameters)
**Mechanism:** Modify bone position, scale, and/or offset at runtime.

Each `param_skeleton` entry specifies one or more `<bone>` child elements with:
- `bone` -- which skeleton bone to modify
- `scale` -- multiply by parameter value for scale change (XYZ vector)
- `offset` -- multiply by parameter value for position offset (XYZ vector)

**Example (Height):**
```xml
<param id="33" group="shape" name="Height" wearable="shape"
       label="Height" min="0" max="100" value_default="50">
  <param_skeleton>
    <bone name="mPelvis" scale="0 0 0" offset="0 0 0.05"/>
    <!-- Also affects mTorso, mChest, mNeck, collar/shoulder/hip/knee chains -->
  </param_skeleton>
</param>
```

**Key bone-driven parameters:**

| Parameter | Bones Affected | Transform Type |
|-----------|---------------|----------------|
| Height | mPelvis + all chain bones | offset (Z translate) |
| Body Thickness | PELVIS, BELLY, CHEST, clavicles | scale (XZ) |
| Body Fat | BELLY, PELVIS, BUTT, pecs, arms, NECK, HEAD | scale (XYZ) |
| Head Size | mSkull, mHead, mEyeLeft/Right | scale (uniform) |
| Head Stretch | HEAD | scale (Y) |
| Head Length | HEAD, mEyeLeft/Right | scale + offset |
| Eye Size | mEyeLeft/Right | scale |
| Eye Spacing | mEyeLeft/Right | offset (X) |
| Eye Depth | mEyeLeft/Right | offset (Z) |
| Face Shear | mEyeLeft/Right | offset |
| Neck Thickness | mNeck | scale (XZ) |
| Neck Length | mNeck | scale (Y) |
| Shoulders | mNeck, mCollarLeft/Right, mChest | scale + offset |
| Breast Size | LEFT_PEC, RIGHT_PEC (female) | scale |
| Breast Buoyancy | LEFT_PEC, RIGHT_PEC | offset (Y) |
| Breast Cleavage | LEFT_PEC, RIGHT_PEC | offset (X) |
| Pectorals | LEFT_PEC, RIGHT_PEC (male) | scale |
| Arm Length | mShoulderLeft/Right, mElbowLeft/Right | scale (Y) |
| Hand Size | mWristLeft/Right | scale (uniform) |
| Torso Length | mTorso, mPelvis, mHipL/R, mKneeL/R | scale (Y) |
| Torso Muscles | BELLY, UPPER_BACK, CHEST, clavicles, arms | scale |
| Love Handles | BELLY, LOWER_BACK, LEFT/RIGHT_HANDLE | scale |
| Belly Size | BELLY, PELVIS | scale (Z) |
| Leg Muscles | L/R_UPPER_LEG, L/R_LOWER_LEG | scale |
| Leg Length | mHipLeft/Right, mKneeLeft/Right | scale (Y) |
| Hip Width | mPelvis, mHipLeft/Right | scale (X) + offset |
| Hip Length | mPelvis | scale (Y) |
| Butt Size | PELVIS, BUTT | scale |
| Saddle Bags | PELVIS | scale (X, lower) |
| Knee Angle | L/R_UPPER_LEG, L/R_LOWER_LEG | rotation |
| Foot Size | L/R_FOOT | scale (uniform) |

#### param_morph (~80 parameters)
**Mechanism:** Vertex displacement (blend shapes) stored in `.llm` binary mesh files.

Each morph is a sparse array of vertex deltas:
- Only stores affected vertices (not all vertices)
- Per-vertex: index (U32) + position delta (3x F32) + normal delta (3x F32) + binormal delta (3x F32) + texcoord delta (2x F32)
- Multiple morphs blend **additively**, weighted by parameter value (0.0-1.0)

**Examples:** Big_Belly_Torso, Muscular_Legs, Squash_Stretch_Head, Wide_Nose, Cleft_Chin, Baggy_Eyes, Puffy_Eyelids, Lip_Width, etc.

These are the **morph-only** sliders -- they deform the legacy system avatar mesh but have **no effect on custom mesh avatars** like Ruth2/Roth2. This is why those avatars have unsupported sliders.

#### param_driver (~30 parameters)
**Mechanism:** Meta-parameters that chain multiple other parameters together.

A driver param has `<driven>` child elements that reference other param IDs:
```xml
<param_driver>
  <driven id="other_param_id" min1="0" max1="0.5" min2="0.5" max2="1.0"/>
</param_driver>
```

**Critical insight:** Many user-facing sliders are actually drivers. For example:
- **"Body Fat"** drives both `param_morph` targets (belly shape, torso contour) AND `param_skeleton` transforms (BELLY/PELVIS/BUTT collision volume scaling)
- **"Torso Muscles"** drives morph targets for muscle definition AND collision volume bone scaling

This is why the SL appearance system produces a **hybrid** deformation -- it is literally using both bone transforms and mesh morphs simultaneously, orchestrated by driver params.

#### param_color (~30 parameters)
**Mechanism:** Color channel modification via `<value>` child elements with vector color attributes.

Used within `<global_color>` sections:
- `skin_color` -- base skin tone (RGB multiplier)
- `hair_color` -- hair color channels
- `eye_color` -- iris color

Also used in `<layer>` definitions for per-layer color tinting.

#### param_alpha (~18 parameters)
**Mechanism:** Alpha mask visibility control.

Each param_alpha has a `domain` attribute specifying which body region it affects. Used in `<layer>` definitions within `<layer_set>` sections. These control the alpha masking channels in the Bakes on Mesh system.

### 5.3 Parameter Encoding

**Internal representation:**
- Float values with per-parameter min/max/default defined in avatar_lad.xml
- Slider range: typically 0-100 in the UI

**Network transmission (AgentSetAppearance message):**
- 218 parameters packed as single U8 bytes (0-255)
- Conversion: `byte = (value - min) / (max - min) * 255`
- Reverse: `value = (byte / 255) * (max - min) + min`

**File format (shape XML):**
```xml
<linden_genepool version="1.0">
  <archetype name="MyShape">
    <param id="33" name="Height" value="0.620"/>
    <param id="682" name="torso muscles" value="0.500"/>
    <!-- ... 218 total params -->
  </archetype>
</linden_genepool>
```

Extended SSA (Server Side Appearance) format adds:
- `u8` attribute: normalized 0-255 byte value
- `type` attribute: param_morph | param_driver | param_skeleton | param_color | param_alpha
- `wearable` attribute: shape | hair | skin | eyes | pants | shirt | shoes | socks | jacket | gloves | underpants | undershirt | skirt | tattoo | physics

### 5.4 Parameter Categories (User-Visible Sliders)

**77 shape controls total**, grouped as:

| Section | Count | Primarily |
|---------|-------|-----------|
| Body | 3 | skeleton + driver |
| Head | 11 | skeleton + morph |
| Eyes | 11 | skeleton + morph |
| Ears | 4 | morph only |
| Nose | 10 | morph only |
| Mouth | 9 | morph only |
| Chin | 9 | morph only |
| Torso | 12 | skeleton + morph + driver |
| Legs | 8 | skeleton + morph |

The remaining ~141 parameters (218 - 77 shape) include: skin color/texture params, hair style params, eye color params, clothing morph params, animation-driven params (emotes, hand poses, eye blinks), and system params.

### 5.5 Bone-Only vs Morph-Only vs Hybrid Sliders

This distinction is **critical** for our implementation:

**Bone-only (work on Ruth2/Roth2):**
Height, Body Thickness, Head Size, Eye Size, Eye Spacing, Eye Depth, Face Shear, Neck Thickness, Neck Length, Shoulders, Breast Size/Buoyancy/Cleavage, Pectorals, Arm Length, Hand Size, Torso Length, Leg Length, Hip Width, Hip Length, Foot Size, Knee Angle

**Morph-only (do NOT work on Ruth2/Roth2):**
Head Shape, Egg Head, Forehead Angle, Brow Size, Upper/Lower Cheeks, Cheek Bones, Eye Opening, Outer/Inner Eye Corner, Upper Eyelid Fold, Eye Bags, Puffy Eyelids, Eyelash Length, Eye Pop, all Ear sliders, all Nose sliders, all Mouth sliders, all Chin sliders, Package (male)

**Hybrid (driver -- partial effect on Ruth2/Roth2):**
Body Fat, Torso Muscles, Belly Size, Butt Size, Love Handles, Saddle Bags, Leg Muscles

For hybrid sliders, only the bone/collision volume component takes effect on custom mesh avatars. The morph component is lost.

---

## 6. The .llm Binary Mesh Format

### 6.1 File Structure

The `.llm` (Linden Lab Mesh) format stores the avatar's base mesh geometry plus embedded morph targets. There are 6 body regions, each with 4 LOD levels:

```
avatar_head.llm        avatar_head_1.llm ... avatar_head_4.llm
avatar_upper_body.llm  avatar_upper_body_1.llm ... avatar_upper_body_4.llm
avatar_lower_body.llm  avatar_lower_body_1.llm ... avatar_lower_body_4.llm
avatar_eye.llm         avatar_eye_1.llm ... avatar_eye_4.llm
avatar_hair.llm        avatar_hair_1.llm ... avatar_hair_4.llm
avatar_skirt.llm       avatar_skirt_1.llm ... avatar_skirt_4.llm
```

### 6.2 Binary Layout (from llpolymesh.cpp)

```
HEADER (24 bytes):
  Magic: "Linden Binary Mesh 1.0" (null-terminated, 24 bytes)

FLAGS AND TRANSFORM:
  HasWeights:        U8    (1 byte)
  HasDetailTexCoords: U8   (1 byte)
  Position:          3x F32 (12 bytes)
  RotationAngles:    3x F32 (12 bytes)
  RotationOrder:     U8    (1 byte)
  Scale:             3x F32 (12 bytes)

VERTEX DATA (base mesh only, not LOD):
  NumVertices:       U16   (2 bytes)
  Coordinates:       NumVertices x 3x F32 (position XYZ per vertex)
  Normals:           NumVertices x 3x F32
  Binormals:         NumVertices x 3x F32
  TexCoords:         NumVertices x 2x F32 (UV)
  [DetailTexCoords]: NumVertices x 2x F32 (conditional on flag)
  [Weights]:         NumVertices x F32    (conditional on flag)

FACE DATA:
  NumFaces:          U16   (2 bytes)
  FaceIndices:       NumFaces x 3x U16   (triangle indices)

JOINT DATA (base mesh only):
  NumSkinJoints:     U16   (2 bytes)
  JointNames:        NumSkinJoints x 64-byte strings (null-terminated)

MORPH TARGET SECTION:
  Loop {
    MorphName:       64-byte string (null-terminated)
    if MorphName == "End Morphs": break
    MorphData:       (see LLPolyMorphData::loadBinary below)
  }

VERTEX REMAPPING (optional):
  NumRemaps:         S32   (4 bytes)
  RemapPairs:        NumRemaps x 2x S32  (source, destination vertex indices)
```

All multi-byte values use **endian swizzling** (`llendianswizzle()`).
Vertex data uses **16-byte aligned** `LLVector4a` (SIMD-optimized) in memory.

### 6.3 Morph Target Binary Format (from llpolymorph.cpp)

Each morph target within an `.llm` file:

```
MORPH HEADER:
  NumVertices:       S32   (4 bytes) -- number of affected vertices

PER-VERTEX DATA (repeated NumVertices times):
  VertexIndex:       U32   (4 bytes) -- index into base mesh
  CoordDelta:        3x F32 (12 bytes) -- XYZ position displacement
  NormalDelta:       3x F32 (12 bytes) -- normal modification
  BinormalDelta:     3x F32 (12 bytes) -- binormal modification
  TexCoordDelta:     2x F32 (8 bytes)  -- UV coordinate shift
```

**Total per vertex:** 4 + 12 + 12 + 12 + 8 = **48 bytes per affected vertex**
**Validation:** vertex indices must not exceed 10,000 (corruption check)

### 6.4 Runtime Morph Application (from llpolymorph.cpp apply())

The viewer applies morphs **incrementally** using delta weights:

```
delta_weight = (sex_match) ? (current_weight - last_weight) : (default_weight - last_weight)

For each affected vertex:
  position += coord_delta * delta_weight * mask_weight
  normal += normal_delta * delta_weight * mask_weight * 0.65  // softening factor
  binormal = recomputed via cross product (position x normal)
  texcoord += texcoord_delta * delta_weight * mask_weight
```

Key details:
- **Mask system:** `LLPolyVertexMask` allows selective application via grayscale textures (per-vertex weight 0.0-1.0 from texture alpha channel)
- **Incremental:** Only delta from last applied weight is computed, not full recalculation
- **Normal softening:** Factor of 0.65 applied to normal deltas
- **Sex filtering:** Morphs can be sex-specific; non-matching sex uses default weight

### 6.5 .llm to glTF Conversion Pipeline (Theoretical)

No existing tool performs this conversion. The pipeline would be:

1. Parse `avatar_lad.xml` for parameter definitions and morph name mappings
2. Read `.llm` binary files -- extract base geometry + all morph vertex offsets
3. Convert base mesh to glTF geometry (positions, normals, UVs, joint weights)
4. Convert each morph to a **glTF morph target** (position deltas, normal deltas)
5. Map `param_skeleton` parameters to bone transform metadata (separate from morph targets)
6. Export as glTF with morph targets + skeleton

**Effort estimate:** Significant (2-4 weeks of focused work). The .llm format is well-documented now, but converting the morph coordinate spaces, handling the masking system, and testing all ~80 morphs across 6 body regions is substantial.

**For BlackBox Avatar Phase 2.5a-b:** We skip this entirely and use bone-driven parameters only. Phase 2.5c would evaluate whether the conversion is worth the effort vs. relying on Max's shape keys.

---

## 7. How Viewers Apply Shape Parameters to Mesh

### 7.1 The Deformation Pipeline

When a user adjusts a shape slider in Firestorm/SL viewer:

```
1. User moves slider
2. Viewer calculates internal float value from slider position
3. For param_driver: resolve driver → get all driven param IDs
4. For each driven/direct param:
   a. param_skeleton → modify bone position/scale/rotation
   b. param_morph → apply vertex delta to system avatar mesh
   c. param_color → modify texture compositing colors
   d. param_alpha → modify alpha mask layers
5. Re-render avatar
6. Pack all 218 params as U8 bytes
7. Send AgentSetAppearance packet to server
8. Server broadcasts to other viewers (they repeat steps 3-5)
```

### 7.2 Bone vs Morph Deformation on Custom Mesh

**Critical distinction for our implementation:**

**System avatar mesh:** Both param_skeleton (bone transforms) and param_morph (vertex deltas) are applied. The system mesh has embedded morph targets in its .llm files.

**Custom mesh avatars (Ruth2, Roth2, any uploaded mesh):**
- **param_skeleton** -- YES, works. The viewer modifies bone positions/scales, and the custom mesh follows via skinning weights.
- **param_morph** -- NO effect. Custom meshes do not have the SL morph target data. The vertex deltas have nowhere to go.
- **Collision volume bones** -- YES, if the custom mesh is weighted to them (fitted mesh). The viewer scales collision volume bones, and weighted vertices follow.

This is why Ruth2/Roth2 support ~20-30 bone-driven sliders but not the ~50 morph-only sliders (nose shape, lip width, etc.).

### 7.3 Fitted Mesh and Collision Volumes

The **fitted mesh** system extends shape slider responsiveness to custom meshes:

- 24 collision volume bones (UPPERCASE names) can be scaled by shape sliders
- Custom meshes can be weight-painted to these bones
- When a slider like "Belly Size" fires, it scales the BELLY collision volume
- Vertices weighted to BELLY move accordingly

**Weight distribution:** Avastar (Blender plugin) provides "fitting sliders" that blend vertex weights between deform bones (mBones) and collision volume bones:
- Slider at 0.0: all weight on deform bone (no fitted mesh response)
- Slider at 1.0: all weight on collision volume (maximum fitted mesh response)
- Intermediate: blended response

Ruth2 v4 and Roth2 v2 are weighted to collision volumes, so they respond to fitted mesh sliders (Body Fat, Belly Size, Butt Size, Love Handles, Saddle Bags, Leg Muscles, Torso Muscles, Breast Size/Pectorals).

### 7.4 The 120 Shape Parameters Detail (from Avastar docs)

The Avastar documentation provides the most precise breakdown:

- **120 total shape parameters** control character appearance
- **20 shape keys** influence bone length (param_skeleton on deform bones)
- **23 shape keys** affect collision volumes (param_skeleton on fitted mesh bones)
- **Remaining ~77** are morph-only (system avatar mesh deformation)

Slider icon classification:
- **Blue bone icon** = affects basic SL deform bones (bone sliders)
- **Orange bone icon** = affects fitted mesh / collision volume bones
- **Purple bone icon** = affects extended (Bento) deform bones
- **No icon** = morph-only, no effect on custom mesh

---

## 8. The SL/OpenSim Skeleton (Complete Reference)

### 8.1 Base Skeleton Hierarchy (from avatar_skeleton.xml)

```
mPelvis (root) — pos: 0.000 0.000 1.067
├── mTorso — pos: 0.000 0.000 0.084
│   └── mChest — pos: -0.015 0.000 0.205
│       ├── mNeck — pos: -0.010 0.000 0.251
│       │   └── mHead — pos: 0.000 0.000 0.076
│       │       ├── mSkull — pos: 0.000 0.000 0.079
│       │       ├── mEyeRight — pos: 0.098 -0.036 0.079
│       │       └── mEyeLeft — pos: 0.098 0.036 0.079
│       ├── mCollarLeft — pos: -0.021 0.085 0.165
│       │   └── mShoulderLeft — pos: 0.000 0.079 0.000
│       │       └── mElbowLeft — pos: 0.000 0.248 0.000
│       │           └── mWristLeft — pos: 0.000 0.205 0.000
│       └── mCollarRight — pos: -0.021 -0.085 0.165
│           └── mShoulderRight — pos: 0.000 -0.079 0.000
│               └── mElbowRight — pos: 0.000 -0.248 0.000
│                   └── mWristRight — pos: 0.000 -0.205 0.000
├── mHipLeft — pos: 0.034 0.127 -0.041
│   └── mKneeLeft — pos: -0.001 -0.046 -0.491
│       └── mAnkleLeft — pos: -0.029 0.001 -0.468
│           └── mFootLeft — pos: 0.112 0.000 -0.061
│               └── mToeLeft — pos: 0.109 0.000 0.000
└── mHipRight — pos: 0.034 -0.129 -0.041
    └── mKneeRight — pos: -0.001 0.049 -0.491
        └── mAnkleRight — pos: -0.029 0.000 -0.468
            └── mFootRight — pos: 0.112 0.000 -0.061
                └── mToeRight — pos: 0.109 0.000 0.000
```

**Total classic bones:** 26 (21 actively weighted for system avatar skinning + 5 unused but available)

### 8.2 Collision Volume Bones (24 total)

```
PELVIS, BUTT, BELLY, CHEST, LEFT_PEC, RIGHT_PEC,
NECK, HEAD, UPPER_BACK, LOWER_BACK,
L_CLAVICLE, R_CLAVICLE,
L_UPPER_ARM, R_UPPER_ARM, L_LOWER_ARM, R_LOWER_ARM,
L_HAND, R_HAND,
L_UPPER_LEG, R_UPPER_LEG, L_LOWER_LEG, R_LOWER_LEG,
L_FOOT, R_FOOT
```

These are octahedron-shaped volumes that respond to shape sliders and are used for fitted mesh vertex weighting.

### 8.3 Bento Extensions (+104-106 bones)

| Category | Count | Names |
|----------|-------|-------|
| Hand bones | 30 | mHandThumb/Index/Middle/Ring/Pinky 1-3 Left/Right |
| Face bones | 46+ | mFaceForeheadL/C/R, mFaceEyebrow*, mFaceEyelid*, mFaceEyeAlt*, mFaceEar*, mFaceNose*, mFaceCheek*, mFaceJaw, mFaceChin, mFaceTeeth*, mFaceTongue*, mFaceLip* |
| Spine extensions | 4 | mSpine1, mSpine2, mSpine3, mSpine4 |
| Wing bones | 11 | mWingsRoot, mWing1-4 Left/Right, mWing4FanLeft/Right |
| Tail bones | 6 | mTail1-6 |
| Hind limb bones | 9 | mHindLimbsRoot, mHindLimb1-4 Left/Right |
| Other | 1 | mGroin |

**Total with Bento:** 26 classic + ~106 Bento + 24 collision volumes + 32 attachment points = **~188 bones**

### 8.4 Vertex Weight Constraint

**Maximum 4 weights per vertex** in SL/OpenSim. All mesh must be weighted to all 21 classic skeleton bones (even if some weights are zero). Unweighted vertices cause upload rejection.

---

## 9. Max / Maxine / Maxwell (Successor Project)

### 9.1 Overview

- **Repository:** https://github.com/RuthAndRoth/Max
- **Description:** "The New Kids" -- next-generation open-source mesh avatar
- **License:** CC-BY-4.0 (more permissive than Ruth2/Roth2's AGPL)
- **Status:** Active development, most recent commit 2026-02-22

### 9.2 Key Technical Differences from Ruth2/Roth2

| Feature | Ruth2/Roth2 | Max/Maxine/Maxwell |
|---------|-------------|-------------------|
| Modeling tool | ZBrush (Shin Ingen) | Blender (Ada Radius) |
| Topology | Separate male/female meshes | **Shared topology**, morphed to male/female |
| License | AGPL-3.0 | CC-BY-4.0 |
| Dev kit status | Frozen (Blender 2.8 era) | Active development |
| Shape keys | Limited | More planned |
| Armature source | Research on SL viewer character folder |
| Named variants | Ruth2 (F), Roth2 (M) | Maxine (F), Maxwell (M), Max (base) |

### 9.3 Maxine Mesh Statistics (from OSCC 2023 presentation Blender screenshots)

**Max_upper_body (from slide 2):**
- Objects: 1/2
- Vertices: 12,808 (or 2,808 -- partially visible in screenshot)
- Edges: 9/3,560
- Faces: 0/2,753
- Triangles: 3,506

**Maxine full scene (from slide 8):**
- Objects: 6/7
- Vertices: 18,659
- Edges: 37,106
- Faces: 18,474
- Triangles: 36,344

**Scene objects visible:**
- EyeLeft, EyeRight, MaxEyelas[hes], MaxHead[...], MaxineFe[et?], MaxineFin[gernails?]
- Plus the upper/lower body

### 9.4 Shared Topology Approach

Max's most significant architectural decision: **female and male share the same mesh topology**. This means:
- Same vertex count, same edge connectivity, same face structure
- Male/female difference is achieved via **shape keys** (morph targets) that move vertices between masculine and feminine positions
- Clothing made for one variant can potentially fit the other (same UV, same topology)
- This solves the cross-gender clothing problem that plagues Ruth2/Roth2

### 9.5 Development Timeline

- **2017:** Shin Ingen creates original Ruth 2.0 and Roth 2.0 in ZBrush
- **2019:** Fred Beckhusen creates GitHub RuthAndRoth organization. Ada Radius, Ai Austin, Serie Sumei as admins. Ruth2 v4 and Roth2 v2 released.
- **2020:** R3 project proposed (additional system avatar for OpenSim)
- **2022:** Ada Radius, Kayaker Magic, Tom Ernst explore viewer character data as basis for new project. Reference: https://github.com/New-Media-Arts/New-Viewer-Avatar
- **2023:** Max project commences. Initial Maxine draft available Nov 2023. OSCC presentation Dec 2023.
- **2024:** Expected inworld release (Feb/Mar 2024, per OSCC presentation)
- **2026:** Still in development. Most recent commit: HUD maker script update (2026-02-22)

### 9.6 Contributors

**Ruth2 v4 / Roth2 v2 (18 contributors):**
Ada Radius, Ai Austin, Chimera Firecaster, Duck Girl, Elenia Boucher, Fred Beckhusen, Fritigern Gothly, Joe Builder, Kayaker Magic, Lelani Carver, Leona Morro, Linden Lab, Mike Dickson, Noxluna Nightfire, Sean Heavy, Serie Sumei, Shin Ingen, Sundance Haiku

**Max (8 contributors):**
Ada Radius, Ai Austin, Curious Creator, Kayaker Magic, Linden Lab, Serie Sumei, Sundance Haiku, Tom Ernst (aka Owl Eyes)

---

## 10. Related Projects and Resources

### 10.1 RuthAndRoth GitHub Organization

| Repository | Description | License | Last Updated |
|------------|-------------|---------|-------------|
| Ruth2 | Virtual World Mesh Female Avatar | AGPL (mixed) | 2026-03-22 |
| Roth2 | Virtual World Mesh Male Avatar | AGPL (mixed) | 2025-09-27 |
| Max | The New Kids (successor) | CC-BY-4.0 | 2026-02-22 |
| Ruth | Archive (RC#1-3, original) | -- | 2026-03-22 |
| Reference | SL/OpenSim reference files | CC-BY-3.0 | 2025-07-07 |
| Skins | Open Source Skins | -- | 2024-08-02 |
| Extras | Additional bits | -- | 2023-09-16 |
| R3 | System avatar proposal | -- | 2022-08-22 |

### 10.2 Key External References

- **SL Viewer Source:** https://github.com/secondlife/viewer (LGPL, `indra/llappearance/` for morph/mesh code)
- **avatar_lad.xml:** `indra/newview/character/avatar_lad.xml` in SL viewer
- **avatar_skeleton.xml:** `indra/newview/character/avatar_skeleton.xml`
- **libOpenMetaverse:** C# library with complete 218-param definitions (`_VisualParam_.cs`)
- **Avastar:** Commercial Blender plugin -- full SL appearance system (reads avatar_lad.xml)
- **Avalab docs:** https://avalab.org/avastar/ -- best public documentation of bone/slider relationships

### 10.3 Community Resources

- **Discord:** https://discord.gg/UMyaZkc (RuthAndRoth, #max channel)
- **SL Groups:** "RuthAndRoth" and "Ruth and Roth Community"
- **SL Marketplace:** RuthAndRoth store (free items, L$0)
- **OSGrid region:** RuthAndRoth (hop://hg.osgrid.org:80/RuthAndRoth/134/124/26)
- **Ai Austin Blog:** https://blog.inf.ed.ac.uk/atate/ (Ai Austin / Austin Tate, project chronicler)

---

## 11. Implications for BlackBox Avatar Architecture

### 11.1 What This Research Confirms

1. **Roth2 uses the same skeleton, same UV, same shape system as Ruth2.** Our `ShapeParameterDriver` implementation works identically for both -- just swap the base mesh.

2. **~30 bone-driven sliders work on both Ruth2 and Roth2.** The remaining ~47 shape sliders are morph-only and have no effect. This is a known limitation shared by all custom mesh avatars in SL/OpenSim.

3. **The .llm morph format is now fully documented.** If we ever want to implement the morph-only sliders, the binary format is straightforward (48 bytes per affected vertex per morph). The bigger challenge is converting the coordinate space and integrating with glTF morph targets.

4. **Max is the future but not ready yet.** Its shared-topology approach is architecturally superior. We should start with Ruth2/Roth2 and migrate to Max when it stabilizes.

5. **Roth2's AGPL license needs attention.** The body mesh is AGPL-3.0. Runtime bone deformation does not create a derivative work, but if we modify the mesh itself (e.g., re-topologize, merge parts), we need AGPL compliance. Max's CC-BY-4.0 is simpler.

6. **Collision volume bones are key for soft-body sliders.** Body Fat, Belly Size, Butt Size, Love Handles, Saddle Bags, Breast Size, Pectorals, Torso Muscles, Leg Muscles all work through collision volume bone scaling. Our implementation must preserve these bones in the GLB export.

### 11.2 Updated Implementation Notes

**For ShapeParameterDefinitions.ts:**
- Implement all ~30 bone-driven parameters from Section 5.5
- Include both deform bone and collision volume bone transforms
- Use the exact bone names and transform types from the avatar_lad.xml mappings
- Support sex-specific parameters (Breast Size = female, Pectorals = male)

**For RuthRothLoader.ts:**
- Validate presence of collision volume bones (UPPERCASE names) on import
- Roth2 has 9,772 body vertices vs Ruth2's 6,300 -- no special handling needed
- Both export as Collada (.dae) from Blender; convert to GLB for our system

**For the future (.llm morph integration):**
- The binary format is well-understood (Section 6)
- Each morph stores sparse vertex deltas (only affected vertices)
- Conversion to glTF morph targets is mechanically straightforward
- The masking system (texture-based per-vertex weights) would need recreation
- Phase 2.5c decision: build .llm converter vs. wait for Max's native shape keys

---

## Sources

- [RuthAndRoth/Roth2 GitHub](https://github.com/RuthAndRoth/Roth2)
- [RuthAndRoth/Ruth2 GitHub](https://github.com/RuthAndRoth/Ruth2)
- [RuthAndRoth/Max GitHub](https://github.com/RuthAndRoth/Max)
- [Ruth2 and Roth2 Statistics (Ai Austin)](https://blog.inf.ed.ac.uk/atate/2019/10/21/ruth-and-roth-statistics/)
- [Roth2 v2 Announcement (Ai Austin)](https://blog.inf.ed.ac.uk/atate/2020/05/24/roth2-v2/)
- [Ruth2 v4 Announcement (Ai Austin)](https://blog.inf.ed.ac.uk/atate/2020/08/30/ruth2-v4/)
- [History of Max Development (Ai Austin)](https://aiaustin.wordpress.com/2023/10/15/max-history/)
- [Max OSCC 2023 Presentation PDF](https://www.aiai.ed.ac.uk/~ai/resources/2023-12-10-OSCC23-Max-Panel/2023-12-10-OSCC23-Max-Panel.pdf)
- [Ruth2 User Guide Wiki](https://github.com/RuthAndRoth/Ruth2/wiki/User-Guide)
- [Ruth2 Blender and Rigging Wiki](https://github.com/RuthAndRoth/Ruth2/wiki/Blender-and-Rigging)
- [Avatar_lad.xml (SL Wiki)](https://wiki.secondlife.com/wiki/Avatar_lad.xml)
- [Avatar Shape XML Format (SL Wiki)](https://wiki.secondlife.com/wiki/Mesh/Avatar_Shape_XML_Format)
- [Avatar Appearance (SL Wiki)](https://wiki.secondlife.com/wiki/Avatar_Appearance)
- [Avatar Deformation (SL Wiki)](https://wiki.secondlife.com/wiki/Avatar_deformation)
- [Appearance Editor and Affected Bones (SL Wiki)](https://wiki.secondlife.com/wiki/Appearance_Editor_and_affected_bones)
- [Project Bento Skeleton Guide (SL Wiki)](https://wiki.secondlife.com/wiki/Project_Bento_Skeleton_Guide)
- [Morph Target Community Proposal (SL Wiki)](https://wiki.secondlife.com/wiki/Morph_Target_Community_Proposal)
- [The SL Skeleton (Avalab/Avastar)](https://avalab.org/avastar/279/knowledge/the-sl-skeleton/)
- [Fitted Mesh Sliders (Avalab/Avastar)](https://avalab.org/avastar/293/help/n-panel/avastar/the-fitting-panel/sliders/)
- [SL Viewer Source - llpolymesh.cpp](https://github.com/secondlife/viewer/blob/develop/indra/llappearance/llpolymesh.cpp)
- [SL Viewer Source - llpolymorph.cpp](https://github.com/secondlife/viewer/blob/develop/indra/llappearance/llpolymorph.cpp)
- [OpenSim avatar_skeleton.xml (libopenmetaverse)](https://github.com/openmetaversefoundation/libopenmetaverse/blob/master/bin/openmetaverse_data/avatar_skeleton.xml)
- [RuthAndRoth/R3 Issues (avatar_lad.xml analysis)](https://github.com/RuthAndRoth/R3/issues/1)
- [RuthAndRoth/R3 Issues (character files)](https://github.com/RuthAndRoth/R3/issues/2)
- [RuthAndRoth/Reference GitHub](https://github.com/RuthAndRoth/Reference)
- [Roth2 LICENSE.md](https://github.com/RuthAndRoth/Roth2/blob/master/LICENSE.md)

---

_Last Updated: 2026-03-24_
