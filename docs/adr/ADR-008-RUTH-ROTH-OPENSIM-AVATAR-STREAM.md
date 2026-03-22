# ADR-008: Ruth/Roth OpenSim Avatar Stream

**Status:** Accepted
**Date:** 2026-03-09
**Authors:** Allen Partridge, Claude Code
**Relates to:** ADR-003 (SuperMesh), ADR-006 (Unified Skeleton Contract), DRESSING_ROOM_SPEC

---

## Context

BlackBox Avatar was designed around a three-phase strategy: VRM (Phase 1), AI Mesh (Phase 2), SuperMesh (Phase 3). During Phase 3 planning, a parallel opportunity emerged: the **Ruth2/Roth2 open-source avatar ecosystem** from OpenSim/Second Life offers a battle-tested parametric avatar system with:

- **218 visual parameters** defined in SL's `avatar_lad.xml`
- **~80-90 user-visible sliders** for body/face customization
- **Hybrid deformation** — bone transforms (param_skeleton) + morph targets (param_morph) + driver params that combine both
- **Open-source base meshes** (Ruth2 v4 female, Roth2 v2 male, Max unified successor)
- **CC-BY-4.0 licensing** (Max project, Feb 2026)
- **Decades of proven content ecosystem** (clothing, animations, accessories)

No web-based Ruth/Roth editor exists. Building one would be novel.

### Why Not Just SuperMesh?

SuperMesh (ADR-003) is a **from-scratch** parametric system: custom skeleton, custom blend shapes, custom pipeline. It's the long-term answer but requires:
- Modeling 123-138 blend shapes per mesh
- Building a corrective blend shape system
- Creating an entire clothing pipeline from scratch

Ruth/Roth offers an **existing parametric system** that can ship sooner by leveraging the OpenSim ecosystem's proven designs. The two streams complement rather than compete:

| Aspect | Ruth/Roth Stream | SuperMesh Stream |
|--------|-----------------|-----------------|
| **Timeline** | Near-term (existing meshes) | Long-term (meshes TBD) |
| **Customization** | Bone-driven (SL parameters) | Blend shape-driven |
| **Content** | OpenSim clothing ecosystem | Marvelous Designer pipeline |
| **Skeleton** | SL Bento (132+ bones) | Custom 72-bone (Mixamo superset) |
| **Fidelity** | Good (proven) | Best (modern techniques) |
| **Novelty** | First web-based SL editor | Custom system |

---

## Decision 1: Add Ruth/Roth as a Fourth Avatar Modality

The avatar strategy becomes **four modalities**, not three:

```
Phase 1: VRM (VRoid imports) ← CURRENT
Phase 2: AI Mesh (Meshy3D + retarget) ← PLANNED
Phase 2.5: Ruth/Roth (OpenSim parametric) ← NEW
Phase 3: SuperMesh (full custom parametric) ← FUTURE
```

Phase 2.5 runs **in parallel** with Phase 2, not sequentially. It's a separate stream that can be developed independently.

### Rationale

- Ruth/Roth provides parametric body customization **before** SuperMesh is ready
- The SL appearance slider system is well-documented and proven at massive scale
- Bone-driven deformation is simpler to implement than blend shape systems
- OpenSim community provides free base meshes under permissive licenses
- The BoneMapper already has an `opensim` platform definition (added March 2026)

---

## Decision 2: SL Bento Skeleton Mapping

The SL Bento skeleton (132+ bones) maps into ADR-006's compatibility chain:

```
Meshy3D (22 bones)
  ⊂ Mixamo (65 bones)
  ⊂ VRM J_Bip (52 bones)
  ⊂ SuperMesh (72 bones)
  ⊄ SL Bento (132+ bones) ← parallel, not superset
```

SL Bento is **not a superset** of Mixamo — it's a different naming convention with a different hierarchy. The mapping is handled by BoneMapper's `opensim` platform:

| Canonical (Mixamo) | SL/OpenSim | Notes |
|-------------------|------------|-------|
| hips | mPelvis | Root bone |
| spine | mTorso | |
| spine1 | mSpine3 | Bento extension (may not exist in pre-Bento exports) |
| spine2 | mSpine4 | Bento extension (may not exist in pre-Bento exports) |
| chest | mChest | |
| neck | mNeck | |
| head | mHead | |
| leftShoulder | mCollarLeft | SL "collar" = shoulder |
| leftUpperArm | mShoulderLeft | SL "shoulder" = upper arm (confusing!) |
| leftLowerArm | mElbowLeft | SL "elbow" = forearm |
| leftHand | mWristLeft | SL "wrist" = hand |
| leftUpperLeg | mHipLeft | SL "hip" = thigh |
| leftLowerLeg | mKneeLeft | SL "knee" = shin |
| leftFoot | mAnkleLeft | SL "ankle" = foot |
| (+ mirrors) | (+ Right variants) | |
| (+ 30 fingers) | mHandThumb/Index/Middle/Ring/Pinky 1-3 Left/Right | Bento fingers |
| leftEye | mEyeLeft | Bento eye bones |

### Bones Unique to SL (Skipped for Mixamo Animation)

- **Collision volumes** (24): PELVIS, CHEST, L_UPPER_ARM, R_LOWER_LEG, etc. (ALL_CAPS names)
- **Face bones** (40+): mFaceForeheadLeft, mFaceEyebrowOuterLeft, etc.
- **Wing/tail/hind limb** (26): mWingRoot, mTail1-6, mHindLimb1-4, etc.
- **Extra spine**: mSpine1, mSpine2, mSpine3, mSpine4 (Bento extensions)

Skip patterns in BoneMapper: `/^[A-Z][A-Z_]+$/`, `/^mFace/`, `/^mWing/`, `/^mTail/`, `/^mHindLimb/`

### Animation Compatibility

Animations from the shared Mixamo library play on Ruth/Roth via BoneMapper:
1. Load animation-only GLB (Mixamo bone names)
2. Map via BoneMapper `opensim` platform → SL bone names
3. Apply to Ruth/Roth skeleton
4. Missing bones (face, wing, tail) hold rest pose — graceful degradation per ADR-006

---

## Decision 3: Bone-Driven Shape Parameters

SL's 218 visual parameters are defined in `avatar_lad.xml`. They fall into three categories:

### 3a. Bone Transform Parameters (~60)

These modify bone **translation and scale** to change body proportions. Examples:

| Parameter | Bones Affected | Transform |
|-----------|---------------|-----------|
| Height | mPelvis (root translation) | Y translate |
| Shoulder Width | mCollarLeft/Right | X translate |
| Arm Length | mShoulderLeft/Right, mElbowLeft/Right | Scale |
| Leg Length | mHipLeft/Right, mKneeLeft/Right | Scale |
| Torso Length | mTorso, mChest | Scale |
| Head Size | mHead | Uniform scale |
| Breast Size | CHEST collision volume | Scale (fitted mesh) |
| Hip Width | PELVIS collision volume | X scale |
| Neck Length | mNeck | Y scale |
| Hand Size | mWristLeft/Right | Uniform scale |
| Foot Size | mAnkleLeft/Right | Uniform scale |

**Implementation:** Modify bone `position` and `scaling` properties on the Babylon.js skeleton at runtime. Each slider maps to one or more bone transforms with min/max ranges.

### 3b. Morph Target Parameters (~80 param_morph)

In SL, these deform mesh vertices directly via `.llm` morph targets (e.g., `Big_Belly_Torso`, `Muscular_Legs`). Many "driver" params combine morph + bone transforms simultaneously.

For **Ruth/Roth in our system**, morph support depends on the base mesh:
- **Ruth2 v4:** Limited shape keys — covers some body morphs but has gaps (Head Shape, Eyelash Length, Eye Pop, Jowls, Chin Cleft unsupported)
- **Max/Maxine:** More shape keys, aiming to fill Ruth2's gaps
- **Full SL morphs:** Would require parsing `.llm` binary format → glTF morph targets (significant effort)

**Decision:** Phase 2.5a uses bone-driven parameters only (works without morph targets). Phase 2.5b adds whatever shape keys Ruth2's GLB export includes. Phase 2.5c investigates `.llm` → glTF morph target conversion for full SL parameter fidelity.

### 3c. Texture/Material Parameters (~78)

Skin tone, eye color, hair color, lip color, nail color, makeup. These overlap with VRM's Tier 1 material modifications (ADR-001).

**Decision:** Reuse the existing MaterialEditor system. Ruth/Roth materials use standard PBR (not MToon), so no conversion needed.

---

## Decision 4: Collision Volume Bones for Fitted Mesh

SL's **fitted mesh** system uses collision volume bones (UPPERCASE names) for soft-body deformation:

```
PELVIS, BUTT, BELLY, CHEST, LEFT_PEC, RIGHT_PEC,
NECK, HEAD, L_UPPER_ARM, R_UPPER_ARM, L_LOWER_ARM, R_LOWER_ARM,
L_HAND, R_HAND, L_UPPER_LEG, R_UPPER_LEG, L_LOWER_LEG, R_LOWER_LEG
```

These bones **scale** (not translate) to deform the mesh. Breast Size scales CHEST/LEFT_PEC/RIGHT_PEC. Hip Width scales PELVIS. Belly Size scales BELLY.

**Decision:** Import collision volume bones but don't map them for Mixamo animation. Use them only for shape parameter application. The BoneMapper's `skipPatterns` already excludes them from animation retargeting.

**Implementation:** A `ShapeParameterDriver` system reads slider values and applies bone transforms:
```typescript
// Pseudocode
interface ShapeParameter {
  id: string;           // e.g., "breast_size"
  label: string;        // "Breast Size"
  category: "body" | "face" | "legs" | "torso";
  min: number;          // 0
  max: number;          // 100
  default: number;      // 50
  drivers: BoneDriver[];
}

interface BoneDriver {
  bone: string;         // "CHEST" or "mChest"
  property: "position" | "scaling" | "rotation";
  axis: "x" | "y" | "z";
  range: [number, number]; // maps [min..max] → [range[0]..range[1]]
}
```

---

## Decision 5: Base Meshes

### Ruth2 v4 (Female)

- **Source:** OpenSim community, Blender files available
- **License:** CC-BY-4.0 (via Max project lineage)
- **Skeleton:** SL Bento (body bones + collision volumes + Bento fingers)
- **Export format:** GLB (converted from Blender, Z-up → Y-up at export)
- **Known variants:** Standard feet, high-heel feet (multi-height)
- **Shape keys:** Limited body shapes in Ruth2 v4; Max/Maxine adds more

### Roth2 v2 (Male)

- **Source:** OpenSim community, Blender files available
- **License:** CC-BY-4.0 (via Max project lineage)
- **Skeleton:** Same as Ruth2 (SL Bento)
- **Export format:** GLB
- **Shape keys:** Limited; Max/Maxwell adds more

### Max (Unified Successor — Future)

- **Source:** Active development, Feb 2026
- **License:** CC-BY-4.0
- **Features:** Maxine (female) and Maxwell (male) with improved morphing
- **Status:** Monitor for integration when stable

**Decision:** Start with Ruth2 v4 + Roth2 v2 GLB exports. Migrate to Max meshes when available and stable.

---

## Decision 6: Manifest Integration

The Character Manifest (CHARACTER_MANIFEST_SPEC) gains a new base type and shape data:

```jsonc
{
  "version": 2,
  "base": "ruth2-feminine",  // NEW: "ruth2-feminine" | "roth2-masculine"
  "identity": { /* same as v1 */ },
  "proportions": { /* VRM-style, IGNORED for Ruth/Roth */ },
  "shapeParameters": {       // NEW: Ruth/Roth specific
    "height": 62,
    "breast_size": 45,
    "shoulder_width": 55,
    "hip_width": 60,
    "torso_length": 50,
    "arm_length": 50,
    "leg_length": 50,
    "head_size": 50,
    "neck_length": 50,
    // ... up to ~60 bone-driven parameters
  },
  "materials": { /* same structure, PBR values */ },
  "equipped": { /* clothing slots — uses SL slot conventions */ }
}
```

**Decision:** `shapeParameters` replaces `proportions` for Ruth/Roth avatars. VRM avatars continue using `proportions` (bone translation ±30%). The dressing room UI detects the `base` type and shows the appropriate editor.

---

## Decision 7: Clothing Slot Compatibility

SL and VRoid use different clothing slot systems:

| VRoid Slots (9) | SL Slots (12+) | Mapping |
|-----------------|----------------|---------|
| underpants | underwear | Direct |
| undershirt | undershirt | Direct |
| socks | socks | Direct |
| bottoms | pants | Direct |
| tops | shirt / jacket | shirt = tops, jacket = overlay |
| onepiece | — | VRoid-only |
| shoes | shoes | Direct |
| accessory_neck | — | VRoid-only |
| accessory_arm | — | VRoid-only |
| — | gloves | SL-only |
| — | skirt | SL-only (separate from pants) |
| — | alpha | SL-only (body visibility mask) |
| — | tattoo | SL-only (Bakes on Mesh layer) |

**Decision:** Use a **unified slot system** that's a superset of both. The dressing room UI shows only slots relevant to the current avatar type. Ruth/Roth clothing must be rigged to the SL Bento skeleton (standard for OpenSim content).

---

## Decision 8: Dressing Room Coexistence

Both VRM and Ruth/Roth avatars use the **same dressing room application** (DRESSING_ROOM_SPEC). The three-pillar structure adapts per avatar type:

### Outfits Pillar (Same for All)
- Thumbnail gallery, one-click swap, save/load
- Manifest format carries the `base` type — outfit loads the correct base mesh

### Body/Vanity Pillar (Different per Type)

| Feature | VRM | Ruth/Roth |
|---------|-----|-----------|
| Proportions | 6 bone-translation sliders (±30%) | ~60 shape parameter sliders |
| Skin tone | MaterialEditor (MToon→PBR) | MaterialEditor (native PBR) |
| Eye color | MaterialEditor | MaterialEditor |
| Face shape | Not available (0 morphs) | Bone-driven (limited) + blend shapes (future) |
| Body shape | Not available | Bone + collision volume driven |

### Wardrobe Pillar (Separate Catalogs)
- VRM clothing: Extracted from VRoid VRMs (197 meshes, J_Bip skeleton)
- Ruth/Roth clothing: Rigged to SL Bento skeleton (separate catalog)
- **Clothing is NOT cross-compatible** between VRM and Ruth/Roth (different skeletons)

**Decision:** The dressing room detects `base` type from the manifest and shows the appropriate UI. Switching base types (VRM ↔ Ruth/Roth) is a major operation that resets equipped clothing.

---

## Implementation Plan

### Phase 2.5a: Ruth/Roth Base Import + Shape Sliders
1. Import Ruth2 v4 and Roth2 v2 GLBs into Babylon.js
2. Implement `ShapeParameterDriver` for bone-driven parameters
3. Build slider UI (reuse Body/Vanity pillar layout)
4. Wire up ~20 most impactful sliders (height, proportions, breast/hip/shoulder)
5. Verify Mixamo animation playback via BoneMapper `opensim` platform

### Phase 2.5b: Materials + Clothing
1. Implement PBR material editing for Ruth/Roth (skin, eyes, hair)
2. Import first batch of OpenSim-compatible clothing GLBs
3. Implement clothing equip/unequip with alpha masking
4. Add clothing catalog for Ruth/Roth items

### Phase 2.5c: Full Parameter Set + Max Integration
1. Expand to full ~60 bone-driven parameter set
2. Integrate Max/Maxine/Maxwell meshes when stable
3. Add face blend shape parameters
4. Body detail blend shapes (muscle, fat)

---

## Implementation Files

| File | Status | Purpose |
|------|--------|---------|
| `src/avatar/ShapeParameterDriver.ts` | TO CREATE | Maps sliders → bone transforms |
| `src/avatar/ShapeParameterDefinitions.ts` | TO CREATE | Parameter catalog (id, label, bones, ranges) |
| `src/avatar/RuthRothLoader.ts` | TO CREATE | GLB import + skeleton detection |
| `src/ui/ShapeSliderPanel.ts` | TO CREATE | Slider UI for body/face parameters |
| `public/assets/ruth2-feminine.glb` | TO ADD | Ruth2 v4 base mesh |
| `public/assets/roth2-masculine.glb` | TO ADD | Roth2 v2 base mesh |
| `blackBoxIKAnimator/src/retargeting/BoneMapper.js` | EXISTS | `opensim` platform (lines 459-550) |

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Ruth2 GLB quality varies by exporter | Test multiple Blender export settings; document known-good pipeline |
| SL bone naming confusion (mShoulder=upperArm) | BoneMapper handles translation; document the "gotcha" names |
| Collision volume bones break animation | Skip patterns already exclude ALL_CAPS bones |
| Shape parameters need avatar_lad.xml parsing | Start with manually-curated subset; automate later |
| Clothing cross-compatibility expectations | Clear UI: clothing catalog is per-avatar-type |
| Z-up vs Y-up axis confusion | Convert at Blender export time (glTF handles automatically) |
| mSpine3/mSpine4 may not exist in all exports | Fallback: map spine1→mChest if Bento spine bones missing |

---

## References

- BoneMapper opensim platform: `blackBoxIKAnimator/src/retargeting/BoneMapper.js` (lines 459-550)
- SL appearance research: `docs/research/SL_APPEARANCE_OUTFITS_RESEARCH.md`
- SuperMesh comparison: `docs/adr/ADR-003-SUPERMESH-ARCHITECTURE.md`
- Skeleton contract: `docs/adr/ADR-006-UNIFIED-SKELETON-CONTRACT.md`
- Character manifest: `docs/CHARACTER_MANIFEST_SPEC.md`
- Dressing room: `docs/DRESSING_ROOM_SPEC.md`
- Ruth2 project: https://github.com/RuthAndRoth/Ruth2
- Max project: https://github.com/RuthAndRoth/Max

---

_Last Updated: 2026-03-09_
