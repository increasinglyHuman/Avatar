# OpenSim/SL Avatar Architecture for BlackBox Integration

**Date:** 2026-04-04
**Author:** Allen Partridge / Claude
**Source:** ADR-010 investigation (BlackBox Animator repo), Firestorm viewer source analysis, Ruth2/Roth2 repo research

---

## Overview

This document captures everything learned about the OpenSim/Second Life avatar system during the ADR-010 retargeting alignment investigation. It is intended to inform the BlackBox Avatar app's implementation of wardrobe, body deformation, and animation systems for SL/OSSL-compatible avatars.

---

## 1. Skeleton Architecture

### The Linden Skeleton (avatar_skeleton.xml)

- **133 animation bones** (m-prefix: mPelvis, mTorso, mShoulderLeft, etc.)
- **26 collision volumes** (ALL_CAPS: PELVIS, L_UPPER_ARM, CHEST, etc.)
- **Total: 159 joints** in a single hierarchy
- **Coordinate system:** Z-up, X-forward, Y-left (right-handed)
- **Scale:** 1 unit = 1 meter
- **Root bone:** mPelvis at position (0, 0, 1.067)

### Bone Categories

| Category | Count | Examples | Purpose |
|----------|-------|---------|---------|
| Base body | 26 | mPelvis, mTorso, mChest, mNeck, mHead | Core animation |
| Bento face | 46 | mFaceRoot, mFaceJaw, mFaceEyeLidUpperLeft | Facial animation |
| Bento fingers | 30 | mHandIndex1Left (×3 joints × 5 fingers × 2 hands) | Hand animation |
| Bento wings | 11 | mWingsRoot, mWing1Left | Optional wings |
| Bento tail | 6 | mTail1–mTail6 | Optional tail |
| Bento hind limbs | 9 | mHindLimbsRoot, mHindLimb1Left | Optional quad legs |
| Extended spine | 4 | mSpine1–mSpine4 | Additional spine articulation |
| Collision volumes | 26 | PELVIS, CHEST, L_UPPER_ARM, L_HAND | Shape deformation |

### Collision Volume System

CVs are **children of animation bones** in the hierarchy:

| CV | Parent mBone | Purpose |
|----|-------------|---------|
| PELVIS | mPelvis | Hip width/shape |
| BELLY | mTorso | Belly size |
| CHEST | mChest | Chest depth |
| LEFT_PEC / RIGHT_PEC | mChest | Breast size (also receives physics) |
| L_UPPER_ARM / R_UPPER_ARM | mShoulderLeft/Right | Upper arm thickness |
| L_LOWER_ARM / R_LOWER_ARM | mElbowLeft/Right | Forearm thickness |
| L_HAND / R_HAND | mWristLeft/Right | Hand size |
| L_UPPER_LEG / R_UPPER_LEG | mHipLeft/Right | Thigh thickness |
| L_LOWER_LEG / R_LOWER_LEG | mKneeLeft/Right | Calf thickness |
| L_FOOT / R_FOOT | mAnkleLeft/Right | Foot size |
| BUTT | mPelvis | Buttock size (receives physics) |

CVs are valid skinning targets — fitted mesh can weight vertices to CVs AND mBones simultaneously. CVs respond to shape slider parameters (scale/position changes), enabling body proportion customization.

---

## 2. Shape Parameter System (avatar_lad.xml)

### How Shape Sliders Work

Each shape parameter defines:
- Which bones/CVs it affects
- Scale and position deltas per slider weight
- A default weight value

Formula: `bone.scale = base(1,1,1) + SUM(param_value × delta_scale)`

### Critical Default Values

**Most params default to 0.0 (no effect). Two have non-zero defaults:**

| Param | ID | Default | Effect |
|-------|-----|---------|--------|
| **Arm Length** | 693 | **0.6** | mShoulderL/R scale Y +0.12, mElbowL/R scale Y +0.18 |
| **Shoulders** | 36 | **-0.5** | mCollarL/R offset Y -0.01, mChest scale Y ×0.96 |

**This means every SL avatar has arms 12-18% longer than the raw skeleton.**

### Other Shape Parameters (default 0.0)

| Param | ID | Affects |
|-------|-----|---------|
| Height | 33 | Arms (scale Y +0.08/+0.06), Legs (scale Z +0.1/+0.1) |
| Leg Length | 692 | mHipL/R (scale Z +0.2), mKneeL/R (scale Z +0.2) |
| Hip Width | 37 | mHipL/R (offset Y ±0.004) |
| Torso Length | 38 | mHipL/R (scale Z -0.1), mKneeL/R (scale Z -0.05) |
| Hand Size | 675 | mWristL/R + all 30 finger bones (uniform scale) |
| Foot Size | 515 | L_FOOT/R_FOOT CVs (volume morph) |
| Thickness | 34 | Arms (scale XZ +0.1), Legs (scale XY +0.13) |
| Male_Skeleton | 32 | Shoulders (Y +0.35), Elbows (Y +0.1), Hips/Knees |
| Shoe Heels | 197 | mFootL/R offset Z -0.08 |
| Shoe Platform | 502 | mFootL/R offset Z -0.07 |

### Implementation in Firestorm Viewer

```cpp
// LLPolySkeletalDistortion::apply() — drives CVs and bones per frame
void apply(ESex avatar_sex) {
    F32 effective_weight = (getSex() & avatar_sex) ? mCurWeight : getDefaultWeight();
    for (auto& [joint, scaleDelta] : mJointScales) {
        newScale = joint->getScale() + (effective_weight - mLastWeight) * scaleDelta;
        joint->setScale(newScale);
    }
    for (auto& [joint, offsetDelta] : mJointOffsets) {
        newPos = joint->getPosition() + (effective_weight * offsetDelta) - (mLastWeight * offsetDelta);
        joint->setPosition(newPos);
    }
}
```

---

## 3. Ruth2/Roth2 Mesh Architecture

### Modular Wardrobe System

Ruth2 v4 is **44 SkinnedMeshes** sharing one 128-bone skeleton:

| Category | Count | Examples |
|----------|-------|---------|
| Body variants | 10 | Body_1-5 (skin tones), BusinessBody_1-5 |
| Feet variants | 12 | FeetFlat, FeetMedium, FeetHigh + toenails×3 |
| Fingernails | 15 | Long, Med, Oval, Pointed, Short × 3 materials |
| Hands | 1 | Ruth2v4Hands |
| Head | 1 | Ruth2v4Head |
| Eyes/lashes | 3 | EyeBall_L, Eyeball_R, Eyelashes |

### Key Properties

- **UV mapping:** Legacy 2005 SL UV map — standard SL textures work
- **Coordinate system:** Z-up converted to Y-up via Blender GLB export
- **Scale:** 1 unit = 1 meter (Linden standard)
- **Skinning:** Identity at bind pose (bone × boneInverse = I)
- **All meshes share ONE skeleton instance** (verified — 1 unique skeleton across 42 meshes)
- **All bindMatrices are identity**

### Vertex Weighting Strategy

From Ruth2 repo documentation:
> "Most of the vertex weighting is to the (red) volume bones"

- Body/limb vertices: weighted primarily to **collision volumes** (fitted mesh style)
- Finger vertices: weighted to **mBone finger joints** (no CV involvement)
- L_HAND has **zero weight** on finger vertices (verified by diagnostic)

### Rigging Provenance

- Ruth2 v4: weighted using **Avastar beta 2.81.35** in Blender 2.83
- Roth2 v2: weighted using **Avastar 2.81.24** + Male_2016-05Rebuilt armature
- Uploaded to SL/OpenSim **WITHOUT** joint position overrides
- Dev .blend files stripped of armatures (users add via Avastar/Bento Buddy)

### Source Repositories

- Ruth2: `github.com/RuthAndRoth/Ruth2` (AGPL, 6,300 verts)
- Roth2: `github.com/RuthAndRoth/Roth2` (AGPL, 9,772 verts)

---

## 4. Animation Retargeting: Lessons Learned (ADR-010)

### The Alignment Problem

Mixamo animations retargeted onto Ruth2 showed progressive misalignment from hips outward — elbows offset, wrists missed by 6.7cm, fingers twisted absurdly.

### Root Cause

The raw `avatar_skeleton.xml` bone positions are **shorter than what Ruth2 was modeled for**. The default shape parameter "Arm Length = 0.6" extends arms by 12-18%, and the mesh was modeled for this extended skeleton. Without applying the default shape, bones fall 6.7cm short of the mesh wrist.

### The Fix

At load time for OpenSim models, extend arm bone positions:
```javascript
elbow.position.multiplyScalar(1.12);  // Upper arm +12%
wrist.position.multiplyScalar(1.18);  // Forearm +18%
collar.position.y += -0.01;           // Shoulders narrowed
skeleton.calculateInverses();          // Recompute bind matrices
```

### Finger Animation

- **Swing-twist decomposition is critical** — without it, fingers twist extremely
- **Curl normalization and biomechanical clamping** showed no visible effect in A/B testing
- Remaining issue: ~11° orientation difference causes minor finger splay

### What We Proved Doesn't Work

| Approach | Why |
|----------|-----|
| CV weight transfer to parent mBones | `CV.boneMatrix = parent.boneMatrix` — local offset cancels |
| CV weight preservation | Same math — no effect on deformation |
| `skeleton.pose()` | No rest/bind divergence exists |
| Armature scaling | Mesh under armature — both scale together |
| Geometry vertex scaling | Based on single sub-mesh, not full body |

---

## 5. Implications for BlackBox Avatar

### Wardrobe System

Ruth2's modular sub-mesh architecture maps directly to a wardrobe system:
- Toggle mesh visibility per body part
- Support multiple body variants (skin tones, clothing)
- Swap feet (flat/medium/high heels)
- Swap fingernails (style variants)
- Standard SL UV mapping supports texture-based clothing

### Body Deformation (Shape Sliders)

To implement SL-style body customization:
1. Parse `avatar_lad.xml` shape parameter definitions
2. Implement `LLPolySkeletalDistortion::apply()` equivalent
3. Apply bone scale/position deltas based on slider values
4. CV bones respond to parent scale changes (`inheritScale = true`)
5. The CollisionVolumeResolver already stashes original weights for this

### Animation Pipeline

For Mixamo → SL/OSSL retargeting:
1. Apply default shape parameters at load time (arm length 0.6, shoulders -0.5)
2. Use E4 world-limb path for ALL bones (bypasses conjugation issues)
3. Keep swing-twist decomposition for finger bones
4. Position tracks: auto-detect cm→m scale + root position correction

### Babylon.js Compatibility

The fix translates to Babylon.js because:
- Bone hierarchies work the same (CVs are child bones)
- Skinning equation is standard (bone × boneInverse × vertex)
- Shape parameter application is just bone position/scale changes
- No engine-specific hacks needed

### Open Source Viewer References

- **Firestorm:** `github.com/FirestormViewer/phoenix-firestorm`
  - `indra/newview/character/avatar_skeleton.xml` — skeleton definition
  - `indra/newview/character/avatar_lad.xml` — shape parameters
  - `indra/llappearance/llpolyskeletaldistortion.cpp` — shape slider driver
  - `indra/newview/llskinningutil.cpp` — skinning matrix palette
  - `indra/newview/llvoavatar.cpp` — avatar rendering + joint position overrides
- **SL Viewer:** `github.com/secondlife/viewer` (same codebase, different branding)

---

*Cross-reference: BlackBox Animator `docs/ADR-010-OPENSIM-BONE-ALIGNMENT-DIAGNOSIS.md`*
