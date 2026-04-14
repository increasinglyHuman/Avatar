# ADR-016: Shape Parameter Parity with Second Life

**Status:** Proposed  
**Date:** 2026-04-14  
**Author:** Allen Partridge / Claude  

## Context

BlackBox Avatar currently implements 43 shape parameters (bone-driven sliders) covering body, torso, arms, legs, and basic face features. Second Life defines ~119 shape parameters in `avatar_lad.xml` (the authoritative avatar definition). Our coverage is ~39%, with significant gaps in face detail, head shape, and range calibration.

Key pain points observed:
- **Height** slider barely moves the avatar (pelvis Y-offset only, SL scales 35 bones)
- **Butt/Breast/Hip** ranges feel weak compared to SL's dramatic range
- Face sliders are sparse — mouth, chin, and head shape categories have <20% coverage
- Roth2 (male) is missing `mFaceEyeAltLeft/Right` bones (5 fewer than Ruth2's 128)

## Decision

Implement full SL shape parameter parity by porting all bone-driven shape parameters from `avatar_lad.xml` to `ShapeParameterDefinitions.ts`, organized into the same editing groups SL uses.

## Reference Files

| File | Location | Purpose |
|------|----------|---------|
| `avatar_lad.xml` | `/home/p0qp0q/openSimClient/phoenix-firestorm/indra/newview/character/avatar_lad.xml` | Authoritative SL avatar definition — ALL shape params, bone drivers, ranges |
| `llphysicsmotion.cpp` | `/home/p0qp0q/openSimClient/phoenix-firestorm/indra/newview/llphysicsmotion.cpp` | CV bounce physics reference |
| `ShapeParameterDefinitions.ts` | `src/avatar/ShapeParameterDefinitions.ts` | Our current 43 params |
| `ShapeParameterDriver.ts` | `src/avatar/ShapeParameterDriver.ts` | Runtime engine (bone manipulation) |

## Current Coverage (43/119 = 39%)

| Category | SL Count | BB Count | Coverage | Priority |
|----------|----------|----------|----------|----------|
| Body | 10 | 7 | 70% | HIGH — height is broken |
| Torso | 9 | 7 | 78% | MEDIUM — range tuning |
| Arms | 7 | 5 | 71% | LOW — adequate |
| Legs | 15 | 9 | 60% | MEDIUM |
| Head Shape | 12 | 1 | 8% | HIGH |
| Eyes | 18 | 5 | 28% | HIGH |
| Nose | 11 | 3 | 27% | MEDIUM |
| Mouth | 13 | 2 | 15% | HIGH |
| Ears | 4 | 1 | 25% | LOW |
| Chin | 6 | 2 | 33% | MEDIUM |

## Critical Fixes

### 1. Height (BROKEN — Priority P0)

**Current:** Moves mPelvis Y-position by ±0.05. Barely visible.

**SL Implementation (param ID 33):** Scales Z-axis on 35 bones proportionally:
- Spine chain: mPelvis, mTorso, mChest, mNeck, mHead
- Legs: mHipLeft/Right, mKneeLeft/Right, mAnkleLeft/Right, mFootLeft/Right
- Arms: mCollarLeft/Right, mShoulderLeft/Right, mElbowLeft/Right, mWristLeft/Right  
- Range: [-2.3, 2.0] (massive range)

**Fix:** Replace single pelvis offset with multi-bone Z-scaling. Each bone gets a fraction of the total height delta, preserving proportions.

### 2. Range Calibration (Priority P1)

Many sliders have conservative ranges that don't match SL's visual impact. Key examples:

| Parameter | Our Range | SL Equivalent Range | Notes |
|-----------|-----------|-------------------|-------|
| butt_size | [-0.06, 0.20] | [0, 1] morph | Needs wider bone scale range |
| breast_size | [-0.08, 0.15] | [0, 1] morph | Same — visible but underwhelming |
| hip_width | [-0.06, 0.06] | [-2.3, 2.0] bone scale | Dramatically under-ranged |
| belly_size | [-0.03, 0.15] | [0, 1] morph | Could go larger |

**Approach:** For each parameter, compare our bone scale/offset range against the visual effect at SL min/max. Multiply ranges by 2-4x where SL shows more dramatic change. Test visually, not numerically — SL's morph-based system and our bone-based system produce different visual effects at the same numeric values.

### 3. Missing Parameters (Priority P2)

#### Head Shape (11 missing)
- Egg Head (head X/Z scale ratio)
- Head Stretch (head Y scale)
- Head Length (head Z scale)  
- Face Shear (head X offset)
- Forehead Angle (forehead bone rotation)
- Cheek Bones (cheek bone scale)
- Puffy Upper Cheeks / Sunken Cheeks
- Brow Size (brow bone scale)
- Squash/Stretch Head
- Shear Face / Shift Mouth

#### Mouth (11 missing)
- Lip Fullness Upper/Lower (lip bone Y-scale)
- Lip Thickness (lip bone Z-scale)
- Lip Width (already have, but SL has more nuance)
- Lip Cleft (lip center bone Y-offset)
- Smile / Frown Corners (lip corner Y-offset)
- Mouth Position (mouth bone Y-offset)
- Crooked Smile (asymmetric lip corner)
- Shift Mouth Left/Right

#### Eyes (13 missing)
- Wide Eyes / Squint
- Eyelid Corner Up/Down (inner/outer)
- Pop Eye / Bug Eye (eye bone Z-offset)
- Puffy Eyelids (lid bone scale)
- Baggy Eyes (lower lid offset)
- Eye Opening (lid separation)
- Eyelash Length (lash bone scale — Ruth2 only)

#### Nose (8 missing)
- Nose Size (overall scale)
- Nostril Width (nostril bone X-scale)
- Nose Tip Angle (tip bone rotation)
- Nose Thickness (bridge Z-scale)
- Crooked Nose (bridge X-offset)
- Upturned Nose (tip Y-offset)
- Broad Nose (overall X-scale)
- Bulbous Nose (tip scale)

#### Chin (4 missing)
- Chin Cleft (chin bone Y-offset, negative)
- Double Chin (chin bone Y-scale)
- Jowls (jaw shaper bone scale)
- Weak Chin / Underbite (chin Z-offset variants)

## Gender-Adaptive Naming

Some parameters should display different labels based on avatar gender:

| Parameter | Feminine Label | Masculine Label |
|-----------|---------------|----------------|
| breast_size | Breast Size | Pec Size |
| breast_gravity | Breast Gravity | — (hide) |
| breast_cleavage | Breast Cleavage | — (hide) |

**Implementation:** Add optional `feminineLabel` / `masculineLabel` fields to `ShapeParameterDef`. The `ShapeSliderPanel` receives the current gender and uses the appropriate label. Parameters with no masculine label are hidden on Roth2.

## Bone Name Differences (Ruth2 vs Roth2)

| Bone | Ruth2 | Roth2 | Impact |
|------|-------|-------|--------|
| mFaceEyeAltLeft | YES | NO | Eye spacing/size/depth sliders skip |
| mFaceEyeAltRight | YES | NO | Same |
| Total bones | 128 | 123 | 5 bones missing |

All other animation, CV, face, and finger bones are present in both. Shape sliders targeting `mFaceEyeAlt*` should gracefully skip on Roth2 (driver already handles missing bones silently).

## Implementation Strategy

### Phase 1: Range Calibration + Height Fix
1. Rework `height` to scale 35 bones on Z-axis (matching SL)
2. Widen ranges on butt, breast, hip, belly, shoulder parameters
3. Visual test at min/max vs SL reference screenshots
4. Add gender-adaptive labels

### Phase 2: Head & Face Completion
1. Add all head shape parameters (egg head, cheek bones, etc.)
2. Add all mouth parameters (lip fullness, cleft, corners, etc.)
3. Add remaining eye parameters (wide eyes, pop eye, lid corners)
4. Add remaining nose parameters (nostril width, tip angle, etc.)
5. Add remaining chin parameters (cleft, double chin, jowls)

### Phase 3: Body Completion
1. Add missing body/leg parameters
2. Add toe/foot shape parameters
3. Final visual parity testing against SL viewer

## Verification

- Compare min/max slider positions against SL viewer screenshots
- Test all sliders on both Ruth2 (feminine) and Roth2 (masculine)
- Verify graceful skip for mFaceEyeAlt* on Roth2
- Ensure preset system still works with expanded parameter set
- Performance: confirm no frame drops with ~119 parameters (all bone-based, no morphs)

## References

- SL Wiki: Avatar Shape Parameters
- Firestorm Source: `avatar_lad.xml` (param definitions), `llvoavatar.cpp` (application)
- OpenSim: Uses identical parameter IDs and ranges
- Current implementation: `ShapeParameterDefinitions.ts` (43 params)
