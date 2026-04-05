# OpenSim/Second Life Clothing & Attachment System Research

**Date:** 2026-03-24
**Purpose:** Comprehensive research on the SL/OpenSim clothing system for implementing clothing on Ruth2/Roth2 base models in BlackBox Avatar.
**Relates to:** ADR-008, DUAL_PIPELINE_ARCHITECTURE, SKIN_COMPOSITOR_SPEC

---

## 1. System Clothing (Baked Textures)

### How It Works

System clothing is the original SL clothing mechanism, predating mesh. It works entirely through **texture compositing** (called "baking") -- no geometry is involved.

**The process:**
1. Each clothing wearable (shirt, pants, jacket, etc.) is a flat 2D texture painted to the SL standard UV map
2. Multiple wearable textures are composited into a single "baked" texture per body region
3. The baked texture is applied to the avatar mesh's material
4. Originally done server-side by the "Bake Service"; with Bakes on Mesh (BoM), applied to mesh bodies too

### UV Map Structure

The SL avatar body is divided into **three UV regions**, each filling the full [0,1] UV space:

| Region | Covers | Standard Resolution |
|--------|--------|-------------------|
| **HEAD** | Face, ears, back of head, neck | 512x512 (upgradeable to 1024/2048) |
| **UPPER_BODY** | Torso front/back, upper arms, hands | 512x512 (upgradeable to 1024/2048) |
| **LOWER_BODY** | Legs, feet, hips, groin | 512x512 (upgradeable to 1024/2048) |

As long as one layer in a bake stack is 2048x2048, the entire stack renders at that resolution.

**Standard UV Templates:**
- **Robin Wood templates** -- the gold standard since 2009, available with labeled body regions, subdivision lines for seam matching, color-coded edges. Originally at robinwood.com
- **Chip Midnight templates** -- the original, later adopted by Linden Lab as official
- Both available as layered PSD/PNG with UV wireframe overlays

### Bake Layer Stack (per region)

The compositing order from bottom to top for UPPER_BODY:

```
Layer 6: Alpha mask (top) -- creates transparent holes to hide body
Layer 5: Jacket (outer)
Layer 4: Jacket (inner)
Layer 3: Shirt
Layer 2: Undershirt
Layer 1: Tattoo (BoM addition)
Layer 0: Skin texture (from skin wearable) -- always present
```

For LOWER_BODY:
```
Layer 5: Alpha mask
Layer 4: Pants
Layer 3: Underpants
Layer 2: Socks/Stockings
Layer 1: Tattoo
Layer 0: Skin texture
```

For HEAD:
```
Layer 4: Alpha mask
Layer 3: Makeup / face detail
Layer 2: Tattoo
Layer 1: Universal
Layer 0: Skin texture
```

### Bakes on Mesh (BoM) -- 11 Channels

The expanded BoM system provides 11 compositing channels:

| Channel | Purpose | Original/Extended |
|---------|---------|-------------------|
| BAKE_HEAD | Head/face textures | Original 6 |
| BAKE_UPPER | Upper body textures | Original 6 |
| BAKE_LOWER | Lower body textures | Original 6 |
| BAKE_EYES | Eye textures | Original 6 |
| BAKE_SKIRT | Skirt textures | Original 6 |
| BAKE_HAIR | Hair textures | Original 6 |
| LEFT_ARM_BAKED | Left arm (asymmetric skins) | Extended |
| LEFT_LEG_BAKED | Left leg (asymmetric skins) | Extended |
| AUX1_BAKED | General purpose (wings, etc.) | Extended |
| AUX2_BAKED | General purpose | Extended |
| AUX3_BAKED | General purpose | Extended |

Each channel has a **reserved texture UUID**. When a mesh face references this UUID, the viewer substitutes the composited bake result. "Universal" wearables can write to all 11 channels.

### Relevance to Our Implementation

Our **SkinCompositor** (SKIN_COMPOSITOR_SPEC) already implements a similar layer-based compositing system. The key differences:

- We use **OffscreenCanvas** instead of a server-side bake service
- Our Layer 0 is a flat color fill (not a skin texture) -- cleaner for tinting
- We support 8 layer types vs SL's wearable-type-based stacking
- Ruth2 uses the **same standard SL UV maps** -- so SL system clothing textures work on Ruth2 directly

**Action item:** Ruth2's UV maps (in `Mesh/Ruth2_v4/UV/`) match the SL standard. System clothing textures designed for SL will composite correctly onto Ruth2.

---

## 2. Mesh Clothing (Rigged Attachments)

### How Rigged Mesh Clothing Works

Mesh clothing in SL/OpenSim is a separate 3D mesh object that:
1. Is rigged (skinned) to the **same skeleton** as the avatar
2. Moves with the avatar because it shares bone weights
3. Is worn as an **attachment** to an attachment point

**Two rigging approaches:**

#### Standard Rigging (Classic)
- Clothing mesh weighted to the 26 classic body bones (mPelvis, mTorso, mChest, etc.)
- Moves and bends with the avatar
- Does NOT respond to shape sliders -- stays at a fixed shape
- Simpler to create, but one-size-fits-all

#### Fitted Mesh Rigging
- Clothing mesh weighted to **both** classic bones AND collision volume bones
- Collision volume bones respond to shape sliders
- Allows clothing to deform when the user changes body shape
- More complex to create, requires careful weight distribution

### Skeleton Compatibility

Mesh clothing MUST be rigged to the SL/OpenSim skeleton to work:
- Pre-Bento: 26 body bones
- Bento: 132+ bones (26 body + 30 fingers + 46 face + tail/wing/hind)
- Collision volumes: 26 volumes (for fitted mesh)

**Critical constraint:** Meshes may be rigged to a maximum of 110 joints, and a maximum of 4 bone weights per vertex.

### Weight Painting for Clothing

The standard workflow:
1. Model clothing in Blender around the Ruth2/Roth2 body mesh
2. Bind clothing mesh to the same armature as the body
3. Use **Transfer Weights** from body mesh to clothing mesh as starting point
4. Manually adjust weights via weight painting (clothing hangs differently than skin)
5. Typical weight distribution:
   - Sleeve cuff: 100% to upper arm bone
   - Sleeve-to-body seam: blended between upper arm and torso
   - Belt area: mostly pelvis, some hip blending
   - Pant legs: blended between hip and knee bones

### Fitted Mesh Technical Details

Collision volume bones work as **paired bones** with their corresponding standard bones:

| Standard Bone | Collision Volume | Shape Sliders |
|--------------|-----------------|---------------|
| mPelvis | PELVIS, BUTT | Hip Width, Butt Size, Body Fat |
| mTorso | BELLY, LEFT_HANDLE, RIGHT_HANDLE, LOWER_BACK | Belly Size, Love Handles, Torso Muscles |
| mChest | CHEST, LEFT_PEC, RIGHT_PEC, UPPER_BACK | Breast Size, Pectorals, Body Fat |
| mNeck | NECK | Neck Thickness |
| mHead | HEAD | Head Size, Head Stretch |
| mCollarLeft/Right | L/R_CLAVICLE | Shoulder Width |
| mShoulderLeft/Right | L/R_UPPER_ARM | Arm Length, Torso Muscles |
| mElbowLeft/Right | L/R_LOWER_ARM | Arm Length |
| mWristLeft/Right | L/R_HAND | Hand Size |
| mHipLeft/Right | L/R_UPPER_LEG | Leg Muscles, Hip Width, Saddle Bags |
| mKneeLeft/Right | L/R_LOWER_LEG | Leg Muscles |
| mAnkleLeft/Right | L/R_FOOT | Foot Size |

**Weight transfer mechanism:**
- For each vertex, the sum of weights on the collision volume bone + standard bone is constant
- Fitting sliders (0.0-1.0) control the distribution:
  - 0.0 = all weight on standard bone (classic rigging behavior)
  - 0.5 = equal distribution
  - 1.0 = all weight on collision volume (fully fitted)
- The collision volume weight alone determines how much shape sliders affect that vertex
- Physics-affected bones: BELLY, BUTT, LEFT_PEC, RIGHT_PEC (can jiggle)

**Practical note:** Clothing creators don't need ALL collision volumes -- only the ones relevant to the garment. A shirt needs CHEST, LEFT_PEC, RIGHT_PEC, BELLY, etc. Pants need PELVIS, BUTT, L/R_UPPER_LEG, etc.

---

## 3. Alpha Layers/Masks

### Purpose

Alpha layers hide body parts underneath clothing to prevent the body mesh from poking through (clipping). This is essential because clothing meshes never perfectly match the body surface.

### Three Alpha Mechanisms

#### 3a. System Alpha Wearables (Texture-Based)

The original approach, used with system avatars and BoM-enabled mesh bodies:

1. Create a texture where **solid areas show the body** and **transparent areas hide the body**
2. Paint onto the standard SL UV template (upper body, lower body, head)
3. Wear as an "Alpha" wearable in SL
4. The bake service composites the alpha into the baked texture

**Creating an alpha texture:**
- Download SL UV template (Robin Wood or Chip Midnight)
- Paint solid white where body should be visible
- Leave transparent where body should be hidden (under clothing)
- Save as RGBA PNG
- Upload to SL/OpenSim as a texture, create Alpha wearable

**Key detail:** These alpha textures are black-and-white masks -- binary visibility per pixel, based on the alpha channel of the composited bake result. Cutoff threshold is typically 128 (alpha < 128 = invisible).

#### 3b. Alpha HUD (Mesh Body Zones)

Used by commercial mesh bodies (Maitreya, Slink, etc.) before BoM:

1. The mesh body is split into multiple submeshes (zones)
2. An in-world HUD lets users toggle visibility of each zone
3. Zones correspond to body areas: upper arms, lower arms, torso, upper legs, etc.
4. Uses `llSetAlpha()` or material alpha to hide/show zones

**Ruth2 v4's approach:** Ruth2 uses a **single mesh** with a combination HUD (by Serie Sumei) that controls:
- Alpha masking mode (cutoff=128) vs Alpha blending mode
- Per-zone visibility without splitting the mesh into parts
- The HUD modifies material alpha properties on different face groups of the single mesh

#### 3c. Per-Material Alpha (Our Implementation)

For our web-based system, we have direct control:

```typescript
// Option A: Per-material alpha (simple zones)
bodyMesh.subMeshes[torsoIndex].material.alpha = 0.0;  // hide torso

// Option B: Alpha texture mask (fine-grained)
bodyMaterial.opacityTexture = alphaMapTexture;  // per-pixel control

// Option C: Discard shader (binary cutoff)
bodyMaterial.alphaCutOff = 0.5;  // pixels below 50% alpha = invisible
```

**Recommended approach for BlackBox Avatar:**
- Use **face groups** (submeshes) on the body for coarse hiding (arms, legs, torso, feet)
- Use **alpha map textures** for fine-grained hiding where needed
- Alpha maps can be auto-generated from clothing coverage or hand-authored per garment
- Store alpha configuration per clothing item in the clothing catalog

---

## 4. Attachment Points

### Standard SL Attachment Points (38 Total)

#### Body Attachment Points (30)

| ID | Constant | Name | Bone |
|----|----------|------|------|
| 1 | ATTACH_CHEST | Chest | mChest |
| 2 | ATTACH_HEAD | Skull | mHead |
| 3 | ATTACH_LSHOULDER | Left Shoulder | mCollarLeft |
| 4 | ATTACH_RSHOULDER | Right Shoulder | mCollarRight |
| 5 | ATTACH_LHAND | Left Hand | mWristLeft |
| 6 | ATTACH_RHAND | Right Hand | mWristRight |
| 7 | ATTACH_LFOOT | Left Foot | mAnkleLeft |
| 8 | ATTACH_RFOOT | Right Foot | mAnkleRight |
| 9 | ATTACH_BACK | Spine | mTorso |
| 10 | ATTACH_PELVIS | Pelvis | mPelvis |
| 11 | ATTACH_MOUTH | Mouth | mHead |
| 12 | ATTACH_CHIN | Chin | mHead |
| 13 | ATTACH_LEAR | Left Ear | mHead |
| 14 | ATTACH_REAR | Right Ear | mHead |
| 15 | ATTACH_LEYE | Left Eyeball | mEyeLeft |
| 16 | ATTACH_REYE | Right Eyeball | mEyeRight |
| 17 | ATTACH_NOSE | Nose | mHead |
| 18 | ATTACH_RUARM | Right Upper Arm | mShoulderRight |
| 19 | ATTACH_RLARM | Right Lower Arm | mElbowRight |
| 20 | ATTACH_LUARM | Left Upper Arm | mShoulderLeft |
| 21 | ATTACH_LLARM | Left Lower Arm | mElbowLeft |
| 22 | ATTACH_RHIP | Right Hip | mHipRight |
| 23 | ATTACH_RULEG | Right Upper Leg | mHipRight |
| 24 | ATTACH_RLLEG | Right Lower Leg | mKneeRight |
| 25 | ATTACH_LHIP | Left Hip | mHipLeft |
| 26 | ATTACH_LULEG | Left Upper Leg | mHipLeft |
| 27 | ATTACH_LLLEG | Left Lower Leg | mKneeLeft |
| 28 | ATTACH_BELLY | Stomach | mPelvis |
| 29 | ATTACH_LPEC | Left Pec | mTorso |
| 30 | ATTACH_RPEC | Right Pec | mTorso |

#### HUD Attachment Points (8)

| ID | Constant | Name |
|----|----------|------|
| 31 | ATTACH_HUD_CENTER_2 | HUD Center 2 |
| 32 | ATTACH_HUD_TOP_RIGHT | HUD Top Right |
| 33 | ATTACH_HUD_TOP_CENTER | HUD Top Center |
| 34 | ATTACH_HUD_TOP_LEFT | HUD Top Left |
| 35 | ATTACH_HUD_CENTER_1 | HUD Center 1 |
| 36 | ATTACH_HUD_BOTTOM_LEFT | HUD Bottom Left |
| 37 | ATTACH_HUD_BOTTOM | HUD Bottom |
| 38 | ATTACH_HUD_BOTTOM_RIGHT | HUD Bottom Right |

#### Bento Extension Attachment Points

Added with Project Bento (2016):

| Name | Bone | Purpose |
|------|------|---------|
| Jaw | mFaceJaw | Mouth attachments |
| Alt Left Ear | mFaceEarLeft | Earring variant |
| Alt Right Ear | mFaceEarRight | Earring variant |
| Alt Left Eye | mFaceEyeAltLeft | Eye variant |
| Alt Right Eye | mFaceEyeAltRight | Eye variant |
| Tongue | mFaceTongueTip | Tongue attachments |
| Groin | mGroin | Lower body attachments |
| Tail Base | mTail1 | Tail root |
| Tail Tip | mTail6 | Tail end |
| Left Wing | mWing4Left | Wing tip |
| Right Wing | mWing4Right | Wing tip |
| Left Hind Foot | mHindLimb4Left | Hind limb |
| Right Hind Foot | mHindLimb4Right | Hind limb |
| Left Ring Finger | mHandRing1Left | Ring |
| Right Ring Finger | mHandRing1Right | Ring |

**OpenSim difference:** OpenSim allows up to 5 items attached to the same attachment point. SL limits vary by viewer.

### Relevance to Our Implementation

For BlackBox Avatar, we don't need the full attachment point system. Clothing is handled as rigged mesh children of the skeleton, not as positioned attachments. However, the attachment point list is useful for:
- **Accessory positioning** -- knowing where to place jewelry, glasses, etc.
- **Compatibility** -- if importing SL clothing items that reference attachment points

---

## 5. Clothing Templates for Ruth2/Roth2

### Available UV Templates

Ruth2 v4 provides UV maps in the GitHub repository at `Mesh/Ruth2_v4/UV/`:

| File | Region | Purpose |
|------|--------|---------|
| `Ruth2v4UV_Upper.png` | Upper body | Torso, arms, hands |
| `Ruth2v4UV_Lower.png` | Lower body | Legs, feet, hips |
| `Ruth2v4UV_Head.png` | Head | Face, ears, neck |
| `Ruth2v4UV_EyeBall.png` | Eyes | Eyeball texture |
| `Ruth2v4UV_Eyelashes.png` | Eyelashes | Eyelash texture |
| `Ruth2v4UV_FeetFlat.png` | Feet (flat) | Flat foot variant |
| `Ruth2v4UV_FeetMedium.png` | Feet (medium) | Medium heel variant |
| `Ruth2v4UV_FeetHigh.png` | Feet (high) | High heel variant |
| `Ruth2v4UV_FingernailsLong.png` | Nails | Long fingernails |
| `Ruth2v4UV_FingernailsMed.png` | Nails | Medium fingernails |
| `Ruth2v4UV_FingernailsOval.png` | Nails | Oval fingernails |
| `Ruth2v4UV_FingernailsPointed.png` | Nails | Pointed fingernails |
| `Ruth2v4UV_FingernailsShort.png` | Nails | Short fingernails |
| `Ruth2v4UV_Toenails.png` | Nails | Toenails |

### Standard SL Skin Textures

Ruth2 v4 also includes standard SL skin textures in `Mesh/Ruth2_v4/textures/`:

| File | Resolution |
|------|-----------|
| `SL-Avatar-Head-1024.png` | 1024x1024 |
| `SL-Avatar-Upper-1024.png` | 1024x1024 |
| `SL-Avatar-Lower-1024.png` | 1024x1024 |

### Max Project UV Resources

The Max project includes additional UV templates in `Contrib/Ada Radius/Blend_file_textures/`:
- Robin Wood templates at 4096x4096 (Head, Upper, Lower)
- Linden standard UV maps (Head, Upper, Lower, Eyeball)
- Starlight skin textures (face, upper, lower)
- Sylvia skin textures (head, upper, lower)

### Key Compatibility Fact

Ruth2 and Roth2 are **explicitly built to use the legacy 2005 Second Life avatar UV map island edges**. This means:
- Standard SL skin textures work directly on Ruth2/Roth2
- System clothing textures (shirts, pants, etc.) designed for SL map to Ruth2/Roth2 correctly
- Our SkinCompositor can use the same UV space for both VRM (with VRoid UV) and Ruth/Roth (with SL UV)
- Artists familiar with SL texture creation can make content for our system immediately

---

## 6. Existing Ruth2/Roth2 Clothing Libraries

### What Exists

The clothing ecosystem for Ruth2/Roth2 is **small but growing**, primarily distributed through OpenSim in-world rather than as downloadable files.

#### In-World Sources (OpenSim)

| Source | Grid | What's Available |
|--------|------|-----------------|
| **RuthAndRoth Region** | OSGrid | Ruth2 v4 avatars, preselected clothing items, alpha masks |
| **Taarna Welles' ReBoot** | Bubblesz.nl Grid | Clothing from original Ruth2 dev team member |
| **Sara Payne's Covey Stores** | Fire and Ice Grid | Ruth2 mesh outfits, shoes, animations |
| **Alternate Metaverse (AMV)** | AMV | Starter mesh clothing packages, hair, AOs |
| **Bastion R&R Refined** | Continuum Grid | Free items for Ruth and Roth bodies |
| **Clutterfly Redux** | Kitely | CC0 licensed content for any use |

#### GitHub / Downloadable Sources

| Source | License | Format | Notes |
|--------|---------|--------|-------|
| **Ruth2 repo** (RuthAndRoth/Ruth2) | AGPL | Blender, DAE | Body mesh + UV templates only, no clothing |
| **Roth2 repo** (RuthAndRoth/Roth2) | AGPL | Blender, DAE | Body mesh only |
| **Max repo** (RuthAndRoth/Max) | CC-BY-4.0 | Blender, DAE | Body mesh + Maxine/Maxwell variants, no clothing |
| **OutWorldz Free Mesh** | Mixed (CC0, CC-BY) | DAE, OBJ, ZIP | 1824 items, very few rigged clothing. Linda Kellie rigged summer dress is one of the few |
| **OSAvatar** (technotherion/OSAvatar) | CC BY-NC | Various | Archived. Basic avatar bodies, minimal clothing |

#### Jupiter Rowland's Catalog

Jupiter Rowland has compiled a list of Ruth2-compatible clothing available across OpenSim grids, referenced on the OpenSim wiki. This is the most comprehensive catalog but requires in-world access to obtain items.

### Gap Analysis

**The harsh reality:** There is NO substantial downloadable library of Ruth2/Roth2-rigged clothing in Blender/DAE/GLB format on the open web. Clothing exists primarily as in-world objects on OpenSim grids, which cannot be easily extracted as files.

**What this means for us:**
1. We will need to **create our own initial clothing library** -- starting with basic garments
2. Blender workflow: model around Ruth2 body, copy weights, export as GLB
3. SL system clothing textures (2D) can be used via BoM/compositing -- these ARE plentiful
4. The Marvelous Designer pipeline (from CHARACTER_MANIFEST_SPEC) works for creating custom garments
5. Community contribution will be essential for building the catalog over time

---

## 7. Clothing and Shape Parameters

### How Clothing Deforms with Body Shape Changes

#### Standard Rigged Mesh (Does NOT Deform)

Clothing rigged only to the standard 26 bones will:
- Move with the skeleton (animations work)
- NOT respond to shape sliders
- Maintain its original shape regardless of body adjustments
- Potentially clip badly if avatar shape differs significantly from the shape used when creating the clothing

This is why "standard sizing" existed -- clothing creators made items in S, M, L, XL variants.

#### Fitted Mesh (DOES Deform)

Clothing rigged to collision volume bones WILL respond to shape sliders:

**How it works at the bone level:**
1. Avatar shape slider changes (e.g., Breast Size = 75)
2. The viewer reads the parameter definition from `avatar_lad.xml`
3. For bone-driven params: applies scale/position changes to affected bones
4. Collision volumes (LEFT_PEC, RIGHT_PEC) scale larger
5. Vertices weighted to those collision volumes move outward
6. Both the body mesh AND the clothing mesh deform identically (because they share the same bone weights)

**Critical insight for our implementation:**
```
Shape slider → bone transform → BOTH body AND clothing vertices move
```

If clothing is weighted to the same collision volumes as the body, it automatically follows shape changes. This is the same mechanism -- there's no separate "clothing deformation" system. The skeleton IS the deformation system.

#### Our Implementation Strategy

For Phase 2.5b (Ruth/Roth Clothing):

```typescript
// When a shape slider changes:
shapeParameterDriver.applySlider("breast_size", 75);
// This modifies bone transforms on the skeleton
// BOTH body mesh and ALL clothing meshes bound to that skeleton
// automatically deform -- no additional clothing code needed

// The only requirement: clothing must be rigged to collision volumes
// not just standard bones
```

**Clothing must be rigged correctly.** If a shirt only has weights on mChest (standard bone) and not on CHEST/LEFT_PEC/RIGHT_PEC (collision volumes), it won't deform with breast size changes. This is a content creation requirement, not a runtime code requirement.

---

## 8. SL vs OpenSim Clothing Differences

### Technical Compatibility

| Aspect | Second Life | OpenSim | Difference |
|--------|-------------|---------|-----------|
| Skeleton | Bento (132+ bones) | Same Bento skeleton | Compatible |
| Rigged mesh upload | DAE (Collada) | DAE (Collada) + glTF (2025+) | OpenSim adds glTF |
| Max weights/vertex | 4 | 4 | Same |
| Max joints/mesh | 110 | 110 | Same |
| Collision volumes | 26 | 26 | Same |
| Fitted mesh | Yes | Yes | Same behavior |
| Bakes on Mesh | Yes | Yes (viewer dependent) | Same |
| Alpha layers | Yes | Yes | Same |
| UV maps | Standard SL UV | Same | Same |
| Attachment points | 38 | 38 (up to 5 per point) | OpenSim more flexible |
| System clothing | Yes | Yes | Same |

### Practical Differences

1. **Content availability:** SL has vastly more commercial clothing. OpenSim has less, but much of it is free/open source
2. **Mesh upload format:** OpenSim now supports glTF (.glb) in addition to Collada (.dae) since Firestorm 7.2.0 (2025). SL added glTF support in August 2025
3. **Commercial restrictions:** SL clothing is typically no-transfer/no-copy. OpenSim clothing is typically CC or similar open licenses
4. **No-mod flags:** SL creators can lock items as no-modify. OpenSim items are typically modifiable
5. **Export restrictions:** Getting mesh OUT of SL is restricted. OpenSim items can typically be exported as IAR (Inventory Archive) files

### What This Means for Us

- Clothing rigged for SL works identically in OpenSim (same skeleton, same fitted mesh system)
- We should use **glTF/GLB** as our target format (modern, web-native, now supported by both platforms)
- DAE files from Ruth2 repo can be converted to GLB via Blender (import DAE, export glTF)
- The rigging and weight data transfers correctly between formats
- **Critical Blender export setting:** When exporting rigged mesh to DAE, MUST tick "Keep Bind Info" -- otherwise mesh deforms catastrophically

---

## 9. Web-Based Approaches

### Has Anyone Put Ruth2/Roth2 in a Web 3D Engine?

**No.** Based on exhaustive searching:

- No existing web-based Ruth2/Roth2 viewer or editor
- No Three.js or Babylon.js implementation of the SL avatar system
- No web-based implementation of SL shape sliders on any mesh
- **We would be first** (as noted in ADR-008)

### Related Web Projects

| Project | Engine | What It Did | Status |
|---------|--------|------------|--------|
| **MOSES (US Army)** | Babylon.js | Attempted browser-based OpenSim viewer | Abandoned |
| **PixieViewer** | WebGL (custom) | Browser-based OpenSim scene viewer | Defunct, basic mesh only |
| **3D Vista Pro** | WebGL | Panoramic SL scene viewer | Not avatar-focused |

### Technical Challenges for Web

1. **Bone count:** SL Bento has 132+ bones. WebGL/WebGPU can handle this, but some mobile GPUs have limited uniform count for GPU-based skinning. May need CPU fallback for full Bento (especially fingers + face)
2. **glTF compatibility:** Ruth2 is distributed as .blend and .dae. Must convert to .glb for web use. Blender handles this automatically
3. **Fitted mesh in Babylon.js:** Babylon.js supports standard skinned mesh. Collision volume bones are just regular bones -- they transform the same way. No special "fitted mesh" code needed; just ensure the collision volume bones exist in the GLB skeleton
4. **Shape sliders:** Must recreate the parameter-to-bone mapping from `avatar_lad.xml`. Our `ShapeParameterDriver` handles this
5. **Texture compositing:** OffscreenCanvas/DynamicTexture for bake-style layer compositing. Our `SkinCompositor` handles this

### Architecture for Babylon.js

```
Ruth2/Roth2 GLB (converted from Blender)
  → Babylon.js SceneLoader.ImportMeshAsync()
    → Skeleton with all bones (standard + collision volumes + Bento)
    → ShapeParameterDriver maps sliders to bone transforms
    → Clothing GLBs attached to same skeleton
    → SkinCompositor for texture-based clothing (system clothing equivalent)
    → MaterialEditor for PBR properties (skin, eyes, hair)
```

No special SL-specific rendering is needed. The SL clothing system is "just" skinned mesh + texture compositing, both of which Babylon.js handles natively.

---

## 10. The Collada/DAE Workflow

### Standard Ruth2 Clothing Creation Pipeline

#### Step 1: Setup (Blender)

```
1. Open Blender (2.83+ required for Ruth2v4Dev.blend)
2. File > Append > select Ruth2v4Dev.blend (or Ruth2v4Dev_PartialLindenSkeleton.blend)
3. Append the Object container (brings body mesh + UV data + images)
4. Add armature: use OSSLFemaleCustVolBones armature
   (available at Mesh/Ruth2_v4/Ruth2v4Dev_PartialLindenSkeleton.blend)
   OR add via Avastar/BentoBuddy plugin
5. Rotate +90 degrees on Z-axis (face forward)
6. Apply all transforms
```

#### Step 2: Model Clothing

```
1. Model clothing mesh around the Ruth2 body
2. Ensure clothing follows the body contour closely (but not TOO close -- offset slightly)
3. UV unwrap the clothing mesh
   - Can use standard SL UV if making texture-based clothing
   - Can use custom UV for mesh-specific textures
```

#### Step 3: Rig the Clothing

```
1. Parent clothing mesh to the same armature as body
2. Use Automatic Weights OR:
   a. Select clothing mesh
   b. Select body mesh (as source)
   c. Transfer Weights (Data Transfer modifier)
   d. This copies body weights to nearby clothing vertices
3. Weight paint adjustments:
   - Areas close to body: should closely match body weights
   - Areas away from body (flowing fabric): may need custom weights
   - For fitted mesh: include collision volume bone vertex groups
4. Max 4 weights per vertex (SL/OpenSim requirement)
```

#### Step 4: Export to DAE

```
Critical export settings (SL+OpenSim Rigged preset):

Main tab:
  - Selection Only: ON
  - Global Orientation Apply: ON
  - Include Armatures: ON

Geometry tab:
  - Triangulate: ON
  - Apply Modifiers Viewport: ON

Armature tab:
  - Deform Bones Only: ON
  - Export to SL/OpenSim: ON

Extra tab:
  - Keep Bind Info: ON  ← CRITICAL! Without this, mesh deforms horribly
```

#### Step 5: Upload to SL/OpenSim

```
In viewer mesh uploader:
  - Include Skin Weight: YES
  - Include Joint Positions: NO (unless custom joint offsets needed)
  - LOD: provide 4 LOD levels (or let viewer generate)
```

### Our Modified Pipeline (DAE/Blender to GLB for Web)

Since we're targeting the web, our pipeline diverges at Step 4:

```
Step 4 (modified): Export to GLB

1. In Blender: File > Export > glTF 2.0 (.glb)
2. Export settings:
   - Format: glTF Binary (.glb)
   - Include: Selected Objects
   - Transform: +Y Up (Blender converts Z-up to Y-up automatically)
   - Mesh: Apply Modifiers
   - Armature: Export Deformation Bones Only
   - Skinning: Include All Bone Influences
   - Animation: Include if animation is embedded, otherwise skip

3. Result: clothing.glb with:
   - Mesh geometry
   - UV coordinates
   - Material/texture references
   - Bone weights (up to 4 per vertex)
   - Skeleton reference (matches Ruth2/Roth2 armature)
```

**Blender DAE-to-GLB conversion (for existing SL clothing):**
```
1. File > Import > Collada (.dae)
2. Verify mesh and armature imported correctly
3. Check bone names match SL convention (mPelvis, mTorso, etc.)
4. File > Export > glTF 2.0 (.glb)
5. Verify in Babylon.js sandbox viewer
```

### Automated Batch Conversion

For converting multiple DAE clothing items:

```python
# Blender Python script for batch DAE-to-GLB conversion
import bpy
import os
import glob

input_dir = "/path/to/dae/files/"
output_dir = "/path/to/glb/output/"

for dae_file in glob.glob(os.path.join(input_dir, "*.dae")):
    bpy.ops.wm.read_factory_settings()
    bpy.ops.wm.collada_import(filepath=dae_file)

    glb_name = os.path.splitext(os.path.basename(dae_file))[0] + ".glb"
    glb_path = os.path.join(output_dir, glb_name)

    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        use_selection=False,
        export_yup=True,
        export_apply=True,
        export_skins=True,
        export_all_influences=True
    )
```

---

## Summary: Implementation Decisions for BlackBox Avatar

### What We Now Know

1. **System clothing = texture compositing.** Our SkinCompositor already handles this. Ruth2 uses standard SL UVs, so existing SL skin/clothing textures work.

2. **Mesh clothing = rigged mesh sharing the avatar skeleton.** No special clothing code -- Babylon.js skinned mesh handles this natively. Clothing GLBs are added to the scene and bound to the same skeleton.

3. **Fitted mesh = collision volume bone weighting.** As long as clothing GLBs include collision volume bones in their rig, shape sliders automatically deform clothing. Same ShapeParameterDriver works for body AND clothing.

4. **Alpha masking = material alpha + face groups.** We use per-submesh material alpha to hide body parts. Each clothing item specifies which body zones to hide.

5. **No existing web Ruth2 clothing system.** We're building the first one.

6. **Clothing library is thin.** We need to create our own initial garments or convert from SL DAE files.

7. **DAE-to-GLB pipeline is straightforward.** Blender handles the conversion. Rigging and weights transfer correctly.

### Priority Actions

1. **Convert Ruth2 body mesh from Blender to GLB** -- validate in Babylon.js viewport
2. **Create 5-10 starter clothing items** in Blender, rigged with both standard and collision volume bones
3. **Implement per-item alpha zone specification** in clothing catalog
4. **Test shape slider deformation** on fitted mesh clothing
5. **Download SL UV templates** (Robin Wood) and provide as artist resources
6. **Build DAE-to-GLB batch conversion script** for future community content

---

## Sources

### Official Documentation
- [SL Wiki: Attachment Points](https://wiki.secondlife.com/wiki/Attachment)
- [SL Wiki: Fitted Mesh Rigging](https://wiki.secondlife.com/wiki/Mesh/Rigging_Fitted_Mesh)
- [SL Wiki: Appearance Editor and Affected Bones](https://wiki.secondlife.com/wiki/Appearance_Editor_and_affected_bones)
- [SL Wiki: Clothing Tutorials](https://wiki.secondlife.com/wiki/Clothing_Tutorials)
- [SL Knowledge Base: Bakes on Mesh](https://community.secondlife.com/knowledgebase/english/bakes-on-mesh-r1512/)
- [SL Knowledge Base: Enhanced Skeleton (Project Bento)](https://community.secondlife.com/knowledgebase/english/enhanced-skeleton-project-bento-r773/)

### Ruth2/Roth2/Max Project
- [Ruth2 GitHub Repository](https://github.com/RuthAndRoth/Ruth2)
- [Roth2 GitHub Repository](https://github.com/RuthAndRoth/Roth2)
- [Max GitHub Repository](https://github.com/RuthAndRoth/Max)
- [Ruth2 Clothing Creator Guide](https://github.com/RuthAndRoth/Ruth2/wiki/Clothing-Creator-Guide)
- [Ruth2 Blender and Rigging Guide](https://github.com/RuthAndRoth/Ruth2/wiki/Blender-and-Rigging)
- [Ruth2 User Guide](https://github.com/RuthAndRoth/Ruth2/wiki/User-Guide)

### Austin Tate / Ai Austin Blog (Key Community Researcher)
- [Ruth2 v4](https://blog.inf.ed.ac.uk/atate/2020/08/30/ruth2-v4/)
- [Ruth2 v4 Rigging in Blender](https://blog.inf.ed.ac.uk/atate/2022/05/16/ruth2-v4-rigging-in-blender/)
- [Ruth2 Mesh Clothing in OpenSim](https://blog.inf.ed.ac.uk/atate/2020/10/12/ruth2-mesh-clothing-in-opensim/)
- [Roth2 v2](https://blog.inf.ed.ac.uk/atate/2020/05/24/roth2-v2/)
- [Max Resources](https://blog.inf.ed.ac.uk/atate/2023/09/13/max-resources/)
- [Bakes on Mesh Resources](https://blog.inf.ed.ac.uk/atate/2019/08/28/bakes-on-mesh-resources/)
- [Using glTF Mesh in OpenSim](https://aiaustin.wordpress.com/2025/12/06/using-gltf-mesh-in-opensim/)

### Avastar/Avalab (Blender Plugin Documentation)
- [The SL Skeleton](https://avalab.org/avastar/279/knowledge/the-sl-skeleton/)
- [Fitted Mesh Technical Reference](https://avalab.org/avastar/279/avastar-2/reference/advanced/fitted-mesh/)
- [Creating Attachments](https://avalab.org/avastar/279/avastar-2/reference/attachments/)

### UV Templates
- [Robin Wood UV Templates](https://www.robinwood.com/Catalog/Technical/SL-Tuts/SLPages/AVUVTemplates.html)
- [Chip Midnight Templates (Behance)](https://www.behance.net/gallery/27972479/Second-Life-Avatar-Templates)
- [Trendy Templates Designer Portal](https://ttdesignersportal.wordpress.com/grin/clothing/avatar-body-clothing-templates/)

### Clothing and Alpha Guides
- [Alpha Masks: Secrets Revealed](https://sldesigner.wordpress.com/2013/11/11/alpha-masks-secrets-revealed/)
- [Making an Alpha (MOoH)](https://moohfashion.weebly.com/making-an-alpha.html)
- [Bakes on Mesh Primer](https://modemworld.me/2019/08/27/bakes-on-mesh-a-basic-primer/)
- [All About Alphas (Regeneration)](https://digitalregeneration.com/all-about-alphas/)

### Free Asset Libraries
- [OutWorldz Free Sculpts/Mesh (1824 items)](https://outworldz.com/cgi/freesculpts.plx)
- [OutWorldz Free Mesh Avatars](https://outworldz.com/OpenAvatar/)
- [OpenSim Free Assets Wiki](http://opensimulator.org/wiki/Free_Assets)
- [OSAvatar (Archived)](https://github.com/technotherion/OSAvatar)

### OpenSim Rigging Guides
- [IlBowmany OpenSim/SecondLife Rigging Guide](https://github.com/IlBowmany/OpenSim-SecondLife-Rigging-Guide)
- [Austin Tate's Blender Avatar Rigging Guide](https://blog.inf.ed.ac.uk/atate/2020/11/05/blender-avatar-rigging-simple-guide/)

---

_Last Updated: 2026-03-24_
