# ADR-002: Meshy-Mixamo Avatar Pipeline

**Status:** Accepted
**Date:** 2026-02-26
**Authors:** Allen Partridge, Claude Code
**Relates to:** AVATAR_STRATEGY.md Phase 2
**Timeline:** Summer 2026

---

## Context

AI-generated 3D meshes (Meshy3D, and aspirationally Tripo) provide unique one-of-a-kind avatar appearances. Animator's retargeting engine (BoneMapper, RetargetEngine) has proven Meshy → Mixamo retargeting works beautifully for same-model retargeting. Cross-character retargeting is ~70% working with known timing issues. This ADR defines the full pipeline from AI generation through World integration.

AI mesh avatars serve players who want a unique look quickly — not the depth of SuperMesh, but distinctiveness that VRM prebuilts can't offer.

---

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────┐
│  1. GENERATION                                          │
│  Meshy3D (text/image → 3D mesh)                        │
│  └── Outputs: GLB with Meshy bone naming                │
│      └── Spine01 (with zero), LeftUpLeg, etc.           │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  2. IMPORT + PLATFORM DETECTION                         │
│  BoneMapper.js auto-detects Meshy3D platform            │
│  └── Detection: LeftUpLeg + Spine + Spine01 (with zero) │
│  └── Maps 22-24 bones to standard Mixamo names          │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  3. QUALITY GATE (new)                                  │
│  Validate mesh meets minimum quality thresholds         │
│  └── Poly count, bone count, scale, bind pose           │
│  └── Reject or warn if thresholds not met               │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  4. RETARGET                                            │
│  RetargetEngine.js applies animations to target skeleton│
│  └── Bind pose capture (BEFORE animation loads)         │
│  └── Force identity quaternions for Meshy models        │
│  └── World-arm corrections for cross-platform poses     │
│  └── Root position correction if parent frames differ   │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  5. MATERIAL ASSIGNMENT                                 │
│  Basic PBR material from AI textures                    │
│  └── Preserve original AI textures where usable         │
│  └── Auto-assign PBR properties (roughness, metallic)   │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│  6. EXPORT + UPLOAD                                     │
│  GLB with Mixamo bone names → S3 → avatar_url           │
│  └── World loads via VRMAvatarDriver (handles GLB)      │
└─────────────────────────────────────────────────────────┘
```

---

## Retargeting Engine (Proven)

### BoneMapper Platform Detection

Located at `blackBoxIKAnimator/src/retargeting/BoneMapper.js:99-129`.

Meshy3D detection uses three bone presence checks:
- `LeftUpLeg` (hip joint naming)
- `Spine` (root spine)
- `Spine01` (with zero — distinguishes from Ready Player Me's `Spine1`)

**Critical ordering:** RPM must be checked BEFORE Meshy3D since both use similar bone names.

### Bone Mapping (22-24 bones)

```
Meshy Name          → Standard Name
─────────────────────────────────────
Hips                → hips
Spine               → spine
Spine01             → spine1
Spine02             → spine2
neck                → neck
Head                → head
LeftShoulder        → leftShoulder
LeftArm             → leftUpperArm
LeftForeArm         → leftLowerArm
LeftHand            → leftHand
RightShoulder       → rightShoulder
RightArm            → rightUpperArm
RightForeArm        → rightLowerArm
RightHand           → rightHand
LeftUpLeg           → leftUpperLeg
LeftLeg             → leftLowerLeg
LeftFoot            → leftFoot
LeftToeBase         → leftToeBase
RightUpLeg          → rightUpperLeg
RightLeg            → rightLowerLeg
RightFoot           → rightFoot
RightToeBase        → rightToeBase
```

No finger bones. No twist bones. This is the fundamental limitation — AI meshes get body animation but not hand/finger expressiveness.

### RetargetEngine Configuration for Meshy

```javascript
{
  preserveRootMotion: true,
  scaleToTarget: false,       // Meshy has 0.01 Armature scale wrapper
  sourceFacing: "+Z",
  targetFacing: "+Z",
  sourceUpAxis: "+Y",
  targetUpAxis: "+Y",
  useRPMTPose: false,
  ignoreBoneReorientation: false
}
```

### Known Meshy-Specific Issues

| Issue | Severity | Status | Workaround |
|-------|----------|--------|------------|
| Non-identity bind poses | HIGH | Solved | Force identity `(0,0,0,1)` in `computeBindPoses()` |
| 0.01 Armature scale collapse | HIGH | Solved | Never call `skeleton.pose()` on Meshy models |
| Cross-character animation unwinding | MEDIUM | 70% working | Animations drift toward T-pose; deferred to Phase 2 |
| Bind pose capture timing | HIGH | Solved | Capture BEFORE animations load |

---

## Quality Gates

### Decision: Where Does Retargeting Happen?

**Answer: In Animator.** The retargeting pipeline is proven, tested, and maintained in Animator. Avatar app should NOT duplicate this engine. Instead:

1. User generates mesh in Meshy3D
2. User imports into Animator for retarget + animation preview
3. User exports retargeted GLB from Animator
4. User imports GLB into Avatar app for material/texture touchup
5. Avatar app uploads to World

**Future (Phase 2.5):** Consider embedding a lightweight retarget preview in Avatar app's import wizard, using Animator's engine as a shared library. But don't build this until the basic pipeline is validated end-to-end.

### Mesh Quality Thresholds

| Property | Minimum | Recommended | Reject |
|----------|---------|-------------|--------|
| Triangle count | 2,000 | 5,000-15,000 | >50,000 |
| Bone count | 20 | 22-24 | <15 |
| Material count | 1 | 1-4 | >8 |
| Texture resolution | 512x512 | 1024x1024 | >4096x4096 |
| File size | — | <10MB | >50MB |
| Armature scale | 0.01 or 1.0 | — | 0 |

### Validation Checklist (Post-Retarget)

1. All 22 mapped bones present and correctly named
2. Bind pose produces standing T-pose
3. Root (Hips) positioned at approximate world origin
4. No inverted normals on visible surfaces
5. At least one material with valid texture
6. Animation playback shows correct limb movement (spot-check idle + walk)

---

## Material Assignment for AI Meshes

AI mesh textures are unpredictable. Meshy3D outputs vary from painterly to photorealistic to stylized.

### Strategy: Preserve + Enhance

1. **Preserve original AI textures** as albedo/diffuse
2. **Auto-generate** roughness (0.7 default) and metallic (0.0 default) if not present
3. **Offer simple overrides** in Avatar app:
   - Roughness slider (matte ↔ glossy)
   - Tint/color shift
   - Emissive toggle (for glowing effects)
4. **Do NOT attempt** MToon or complex shader assignment — keep it PBR simple

---

## Tripo Status

| Aspect | Current State | Action |
|--------|--------------|--------|
| Import/load | Works | ✅ |
| Bone naming | Non-standard | Partial BoneMapper support |
| Retargeting | Fails frequently | Aspirational — investigate in Phase 2.5 |
| Quality | Inconsistent | Lower than Meshy on average |

**Decision:** Tripo remains aspirational. Do not promise Tripo support. Do not block Phase 2 on Tripo. If Tripo improves their bone naming consistency, revisit.

---

## Bento Hand Augmentation

**Status: Deferred indefinitely.**

Concept: Add finger bones to AI meshes that lack them, enabling hand animation and finger posing.

**Why deferred:**
- Requires automatic hand detection and bone insertion into arbitrary mesh topology
- Weight painting on unknown topology is unsolved
- The payoff is marginal (AI mesh hands are typically blocky/stylized anyway)
- SuperMesh has proper finger bones from day 1

**Revisit when:** AI mesh generators reliably output finger bones, or someone contributes an automatic hand rigging solution.

---

## Avatar App Integration (Phase 2)

### Import Wizard UI

```
┌─────────────────────────────────────────┐
│  Import AI Avatar                       │
│                                         │
│  [Drop GLB here or Browse]              │
│                                         │
│  ✅ Detected: Meshy3D                   │
│  ✅ 22 bones mapped                     │
│  ✅ 8,432 triangles                     │
│  ✅ 2 materials                         │
│  ⚠️ No finger bones (expected for AI)   │
│                                         │
│  Preview: [3D viewport with idle anim]  │
│                                         │
│  Material Adjustments:                  │
│  Roughness: [────●────] 0.7             │
│  Tint: [color picker]                   │
│  Emissive: [ ] off                      │
│                                         │
│  [Cancel]              [Save to World]  │
└─────────────────────────────────────────┘
```

### What We Will NOT Do for AI Mesh

1. **No attachment system** — defer to SuperMesh
2. **No morph targets** — AI meshes have none, we can't add them
3. **No clothing swap** — unknown topology prevents reliable clothing fitting
4. **No skin tone modification** — AI textures are baked, not material-separated like VRM
5. **No finger animation** — no finger bones available
6. **No face expressions** — no face blend shapes

AI mesh avatars are "what you see is what you get" with minor material tuning.

---

## World Integration

No World-side changes required. World's existing pipeline handles this:

- `AvatarDriverFactory.ts` detects GLB format
- `VRMAvatarDriver.ts` loads GLB (not just VRM — name is historical)
- Animation playback works via standard skeleton
- `avatar_url` stores the S3 path identically to VRM avatars

The only World consideration: AI mesh avatars won't have facial expressions or lip sync. World's expression/viseme systems should gracefully degrade (already designed to handle missing morph targets).

---

## Testing Strategy

1. **Import test:** Load Meshy3D GLB, verify BoneMapper detects platform correctly
2. **Retarget test:** Apply idle + walk Mixamo animations, verify limbs move correctly
3. **Scale test:** Verify 0.01 Armature scale is handled without model collapse
4. **Quality gate test:** Feed meshes below minimum thresholds, verify rejection/warning
5. **Material test:** Apply roughness/tint overrides, verify visual change
6. **Export roundtrip:** Export from Avatar app as GLB, load in World, verify animation plays
7. **Graceful degradation test:** Load AI mesh in World, trigger expression/viseme events, verify no errors

---

## References

- Animator retargeting engine: `blackBoxIKAnimator/src/retargeting/`
- BoneMapper platform detection: `blackBoxIKAnimator/src/retargeting/BoneMapper.js:99-129`
- RetargetEngine: `blackBoxIKAnimator/src/retargeting/RetargetEngine.js`
- Meshy test notes: `blackBoxIKAnimator/public/test-assets/meshy3d/notes.md`
- Animation library plan: `blackBoxIKAnimator/docs/ANIMATION_LIBRARY_PLAN.md`
- Retargeting usage guide: `blackBoxIKAnimator/docs/RETARGETING_USAGE_GUIDE.md`
- Integration strategy: `blackBoxIKAnimator/docs/RETARGETING_INTEGRATION_STRATEGY.md`

---

_Last Updated: 2026-02-26_
