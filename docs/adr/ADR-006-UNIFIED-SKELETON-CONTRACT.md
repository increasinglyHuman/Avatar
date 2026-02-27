# ADR-006: Unified Skeleton Contract

**Status:** Accepted
**Date:** 2026-02-26
**Authors:** Allen Partridge, Claude Code
**Relates to:** AVATAR_STRATEGY.md Cross-Cutting

---

## Context

All three avatar modalities must play animations from the same library. This requires a skeleton contract that defines bone naming, hierarchy, and mapping across VRM, Mixamo, SuperMesh, and AI Mesh (Meshy3D). The animation library targets Mixamo naming as the canonical format — every avatar type maps Mixamo names to its own bone names at load time or retarget time.

---

## The Compatibility Chain

```
Meshy3D (22 bones, Mixamo-like naming)
  ≈ retargets to ↓

Mixamo (65 bones with fingers, standard animation source)
  ↓ maps to ↓

VRM J_Bip (52 bones, VRM humanoid standard)
  ⊂ contained within ↓

SuperMesh (72 bones, Mixamo-compatible superset)
  adds: twist bones, helper bones, corrective drivers
```

**Core principle:** Animations are authored/retargeted to Mixamo naming. Each avatar type maps Mixamo names to its own bone names. Missing bones hold rest pose. Extra bones are driven procedurally.

---

## Bone Name Mapping Tables

### VRM ↔ Mixamo (Existing)

Canonical mapping lives at `src/library/VRMRigMapMixamo.js` (57 entries). Core bones:

| Mixamo | VRM | Notes |
|--------|-----|-------|
| mixamorigHips | J_Bip_C_Hips | Root |
| mixamorigSpine | J_Bip_C_Spine | |
| mixamorigSpine1 | J_Bip_C_Chest | |
| mixamorigSpine2 | J_Bip_C_UpperChest | |
| mixamorigNeck | J_Bip_C_Neck | |
| mixamorigHead | J_Bip_C_Head | |
| mixamorigLeftShoulder | J_Bip_L_Shoulder | |
| mixamorigLeftArm | J_Bip_L_UpperArm | |
| mixamorigLeftForeArm | J_Bip_L_LowerArm | |
| mixamorigLeftHand | J_Bip_L_Hand | |
| mixamorigLeftUpLeg | J_Bip_L_UpperLeg | |
| mixamorigLeftLeg | J_Bip_L_LowerLeg | |
| mixamorigLeftFoot | J_Bip_L_Foot | |
| mixamorigLeftToeBase | J_Bip_L_ToeBase | |
| (+ right side mirrors) | | |
| (+ 30 finger bones) | J_Bip_L/R_Thumb/Index/Middle/Ring/Little 1-3 | Full finger support |

### SuperMesh ↔ Mixamo (New — Decision Required)

**Decision: SuperMesh uses its own names with a mapping table.**

Rationale: SuperMesh has 20 bones that Mixamo doesn't (twist, helper, corrective). Using Mixamo names for the shared 52 would create confusion when twist/helper bones have a different naming convention. Consistent naming within SuperMesh is more important than avoiding a mapping table.

| Mixamo | SuperMesh | Notes |
|--------|-----------|-------|
| mixamorigHips | hips | |
| mixamorigSpine | spine_01 | |
| mixamorigSpine1 | spine_02 | |
| mixamorigSpine2 | spine_03 | |
| mixamorigNeck | neck | |
| mixamorigHead | head | |
| mixamorigLeftShoulder | clavicle_L | |
| mixamorigLeftArm | upperarm_L | |
| mixamorigLeftForeArm | forearm_L | |
| mixamorigLeftHand | hand_L | |
| mixamorigLeftUpLeg | upperleg_L | |
| mixamorigLeftLeg | lowerleg_L | |
| mixamorigLeftFoot | foot_L | |
| mixamorigLeftToeBase | toe_L | |
| (+ right side mirrors) | | |
| (+ finger bones) | thumb_01-03_L, index_01-03_L, etc. | |
| — | shoulder_helper_L | SuperMesh only (driven) |
| — | upperarm_twist_L | SuperMesh only (driven) |
| — | elbow_helper_L | SuperMesh only (driven) |
| — | forearm_twist_L | SuperMesh only (driven) |
| — | hip_adjust_L | SuperMesh only (driven) |
| — | upperleg_twist_L | SuperMesh only (driven) |
| — | knee_helper_L | SuperMesh only (driven) |
| — | lowerleg_twist_L | SuperMesh only (driven) |
| — | eye_L, eye_R | SuperMesh only (look-at) |
| — | jaw | SuperMesh only (viseme) |

### Meshy3D ↔ Mixamo

Handled by Animator's BoneMapper at retarget time. After retargeting, the output GLB uses Mixamo bone names. No separate runtime mapping needed — it's baked into the exported animation.

| Meshy3D | Mixamo (after retarget) |
|---------|------------------------|
| Hips | mixamorigHips |
| Spine | mixamorigSpine |
| Spine01 | mixamorigSpine1 |
| Spine02 | mixamorigSpine2 |
| LeftArm | mixamorigLeftArm |
| LeftForeArm | mixamorigLeftForeArm |
| ... | ... |

No finger bones in Meshy output. Finger animation tracks are silently ignored.

---

## Missing Bone Behavior

When an animation drives a bone that the avatar doesn't have:

| Scenario | Behavior |
|----------|----------|
| Mixamo animation drives finger bones → VRM | VRM has fingers (J_Bip_L/R_Thumb/Index/Middle/Ring/Little) — works |
| Mixamo animation drives finger bones → Meshy3D | No fingers — tracks silently ignored, hand holds rest pose |
| SuperMesh-enhanced animation drives twist bones → VRM | VRM has no twist bones — tracks ignored, rest pose |
| SuperMesh-enhanced animation drives twist bones → Meshy3D | No twist bones — tracks ignored |
| Any animation → SuperMesh helper/corrective bones | Not keyframed — procedurally driven from parent bone rotation |

**Graceful degradation principle:** Missing bones never cause errors. The avatar simply doesn't express that part of the animation. Lower-fidelity avatars (Meshy) degrade gracefully. Higher-fidelity avatars (SuperMesh) add quality that simpler formats can't show.

---

## Bind Pose

**Decision: T-pose for all modalities.**

| Modality | Bind Pose | Source |
|----------|-----------|--------|
| VRM (VRoid) | T-pose | VRoid Studio default |
| Meshy3D | T-pose | Meshy default output |
| SuperMesh | T-pose | Spec requirement |
| Mixamo animations | T-pose reference | Mixamo standard |

A-pose was considered (better shoulder deformation at rest) but rejected because:
- Mixamo animations reference T-pose
- VRM standard is T-pose
- Meshy3D exports T-pose
- Retargeting T↔A adds unnecessary complexity

---

## Body Variation via Bone Transforms

VRoid uses bone translation (not morph targets or scale) for body variation. This is specific to VRM and handled by Avatar app's Tier 2.5 modifications (ADR-001). It does NOT affect the skeleton contract — the bone hierarchy and names remain constant. Only rest positions change.

SuperMesh uses morph targets (blend shapes) for body variation. Bones remain at canonical positions. The skeleton contract is unaffected by body morphs.

AI mesh avatars have fixed proportions. No post-import body modification.

---

## Animation Library Architecture

From Animator's `ANIMATION_LIBRARY_PLAN.md`:

```
1,076 FBX sources → Retarget → Animation-Only GLB → CDN
  689 MB              Engine    ~110 MB total
                               + manifest.json
```

Each animation is exported as an **animation-only GLB** (skeleton + tracks, no mesh/texture). Size: 50-200 KB per animation. One animation per file for lazy loading.

The manifest tracks metadata:
```jsonc
{
  "id": "locomotion_fast_run",
  "name": "Fast Run",
  "file": "locomotion/fast_run.glb",
  "category": "locomotion",
  "duration": 1.2,
  "boneCount": 52,
  "loop": true,
  "source": { "platform": "meshy", "originalFile": "Fast Run.fbx" },
  "tags": ["run", "fast", "sprint"]
}
```

All animations in the library use Mixamo bone naming. Runtime mapping happens per-avatar-type when applying the animation.

---

## World Runtime Animation Binding

World's `VRMAvatarDriver.ts` handles the runtime side:

1. Load avatar (VRM, GLB, or SuperMesh)
2. Detect skeleton type from bone naming convention
3. Load animation-only GLB from CDN
4. Map animation track bone names to avatar bone names using appropriate mapping table
5. Apply animation via Babylon.js AnimationGroup

For SuperMesh specifically, also:
6. Compute helper bone transforms from parent rotations (per-frame)
7. Compute corrective blend shape weights from joint angles (per-frame)

---

## Implementation Files

| File | Status | Purpose |
|------|--------|---------|
| `src/library/VRMRigMapMixamo.js` | EXISTS | VRM ↔ Mixamo mapping (57 entries) |
| `src/library/superMeshRigMap.js` | TO CREATE | SuperMesh ↔ Mixamo mapping (~52 entries + 20 SuperMesh-only) |
| `blackBoxIKAnimator/src/retargeting/BoneMapper.js` | EXISTS | Meshy/RPM/Tripo detection + mapping |
| `World/src/avatars/VRMAvatarDriver.ts` | EXISTS | Runtime animation binding |
| `World/src/avatars/SuperMeshDriver.ts` | TO CREATE | SuperMesh-specific: helper bones, corrective morphs |

---

## References

- VRM bone map: `src/library/VRMRigMapMixamo.js`
- Animator retargeting: `blackBoxIKAnimator/src/retargeting/`
- BoneMapper: `blackBoxIKAnimator/src/retargeting/BoneMapper.js`
- RetargetEngine: `blackBoxIKAnimator/src/retargeting/RetargetEngine.js`
- Animation library plan: `blackBoxIKAnimator/docs/ANIMATION_LIBRARY_PLAN.md`
- World animation binding: `World/src/avatars/VRMAvatarDriver.ts`
- World driver factory: `World/src/avatars/AvatarDriverFactory.ts`
- SuperMesh skeleton spec: `Marketplace/poqpoq_avatar_system_requirements_v1.1.md`

---

_Last Updated: 2026-02-26_
