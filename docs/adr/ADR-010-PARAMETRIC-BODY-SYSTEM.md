# ADR-010: Parametric Body and Face System

**Status:** Proposed
**Date:** 2026-04-05 (revised)
**Authors:** Allen Partridge, Claude Code
**Relates to:** ADR-008 (Ruth/Roth Stream), ADR-009 (Foundation Reset), ADR-015 (Extended System)
**Phase:** 1

---

## Context

No web-based OpenSim shape editor exists. The open-source viewers (Firestorm, Singularity, etc.) provide shape editing but with desktop-native UIs that are functional but architecturally kludgy. They do, however, provide a proven architectural foundation — particularly `LLPolySkeletalDistortion::apply()` in the Firestorm/Indra codebase, which documents the exact bone transform formula.

Second Life's `avatar_lad.xml` defines 218 visual parameters across 5 types:
- **param_skeleton (~60):** Bone scale/position transforms — height, arm length, shoulder width, etc.
- **param_morph (~80):** Vertex deformation (blend shapes) — requires .llm binary data
- **param_color (~30):** Skin, hair, eye color channels
- **param_driver (~30):** Meta-parameters combining bone + morph + color
- **param_alpha (~18):** Visibility masks

For Phase 1, we target **~55 bone-driven parameters** (body + face) that work without morph targets. These produce visible, dramatic shape changes using only skeleton manipulation. This covers ~40 body proportion parameters and ~15 bone-driven face structure parameters — a serious shape editor at launch.

Note: SL face editing uses **two mechanisms simultaneously** — Bento face bones (~46 bones) for structural positioning, and param_morph vertex offsets for fine surface detail (nostril curvature, lip shape, chin cleft depth). Phase 1 implements the bone-driven portion; ADR-015 adds the vertex-level detail via .llm morph target conversion. The bone-driven face params alone provide meaningful face customization (jaw shape, eye spacing, brow position, nose bridge, etc.).

### The SL Bone Transform Formula

From Firestorm's implementation:
```
bone.scale = base(1,1,1) + SUM(param_value * delta_scale)
bone.position = rest_position + SUM(param_value * delta_position)
```

Where `param_value` is a float in the parameter's `[min, max]` range, and `delta_scale`/`delta_position` are per-bone, per-axis multipliers defined in `avatar_lad.xml`.

**Collision volume bones** (PELVIS, CHEST, BELLY, BUTT, LEFT_PEC, RIGHT_PEC, etc.) are the primary targets for soft-body deformation. They are children of animation bones and deform fitted mesh clothing automatically.

### Research Reference

The architectural foundation from open-source viewers is documented in:
- `docs/research/OPENSIM-AVATAR-ARCHITECTURE.md` — bone transform formula, default values, CV architecture
- `docs/research/RUTH_ROTH_TECHNICAL_RESEARCH.md` — parameter encoding, avatar_lad.xml structure
- `docs/research/ROTH2_OPENSIM_DEEP_RESEARCH.md` — import test results, bone mapping diagnosis

---

## Decision

### 1. Shape Parameter Data Model

Create `src/avatar/ShapeParameterDefinitions.ts` as a static data file encoding ~55 body + face parameters extracted from `avatar_lad.xml`:

```typescript
interface ShapeParameterDef {
  id: string;              // e.g., "height"
  label: string;           // e.g., "Height"
  category: 'body' | 'torso' | 'arms' | 'legs' | 'details' | 'face_structure' | 'face_nose' | 'face_mouth' | 'face_eyes';
  default: number;         // SL default value (float)
  min: number;
  max: number;
  uiDefault: number;       // 0-100 slider position for SL default
  drivers: BoneDriver[];   // Which bones to modify and how
  needsMorph?: boolean;    // true = bone portion only until Phase 6 adds .llm morphs
}

interface BoneDriver {
  bone: string;            // e.g., "mPelvis", "CHEST", "mFaceJaw"
  property: 'scale' | 'position';
  axis: 'x' | 'y' | 'z';
  range: [number, number]; // Delta at [min, max] param values
}
```

### 2. Target Parameters (Phase 1 — ~55 sliders across 9 subgroups)

#### Body Parameters (~40 sliders)

| Subgroup | Parameter | Primary Bones Affected |
|----------|-----------|----------------------|
| **Body** | Height | mPelvis (Y translate) |
| | Body Thickness | mChest, mTorso, mHipRight/Left (X/Z scale) |
| | Body Fat | BELLY, PELVIS, BUTT, L_UPPER_LEG, R_UPPER_LEG (scale) |
| | Shoulder Width | mCollarLeft/Right (X translate) |
| | Hip Width | PELVIS, mHipLeft/Right (X scale/translate) |
| | Torso Muscle | mChest, mTorso (X/Z scale) |
| | Body Taper | mChest vs mHipLeft/Right (relative X scale) |
| **Torso** | Torso Length | mTorso (Y scale) |
| | Breast Size | LEFT_PEC, RIGHT_PEC (scale) |
| | Breast Gravity | LEFT_PEC, RIGHT_PEC (Y position) |
| | Breast Cleavage | LEFT_PEC, RIGHT_PEC (X position) |
| | Belly Size | BELLY (scale) |
| | Chest Width | mChest (X scale) |
| | Waist Width | mTorso (X scale at waist) |
| **Arms** | Arm Length | mUpperArmLeft/Right, mForearmLeft/Right (Y scale) |
| | Upper Arm Thickness | mUpperArmLeft/Right (X/Z scale) |
| | Forearm Thickness | mForearmLeft/Right (X/Z scale) |
| | Hand Size | mHandLeft/Right (uniform scale) |
| | Shoulder Angle | mCollarLeft/Right (Z rotation offset) |
| **Legs** | Leg Length | mHipLeft/Right, mKneeLeft/Right (Y scale) |
| | Upper Leg Thickness | mHipLeft/Right (X/Z scale) |
| | Lower Leg Thickness | mKneeLeft/Right (X/Z scale) |
| | Calf Size | L_LOWER_LEG, R_LOWER_LEG (scale) |
| | Foot Size | mAnkleLeft/Right (uniform scale) |
| | Knee Angle | mKneeLeft/Right (rotation offset) |
| | Platform Height | mAnkleLeft/Right (Y position — heel height) |
| **Details** | Butt Size | BUTT (scale) |
| | Love Handles | L_HANDLE, R_HANDLE (scale) |
| | Saddle Bags | L_UPPER_LEG, R_UPPER_LEG (X scale) |
| | Neck Length | mNeck (Y scale) |
| | Neck Thickness | mNeck (X/Z scale) |
| | Head Size | mHead (uniform scale) |
| | Ear Size | mFaceEarLeft/Right (uniform scale) |

#### Face Structure Parameters (~15 bone-driven sliders)

These use the 46 Bento face bones. Fine surface detail (nostril curvature, lip contour, chin cleft depth) requires .llm morph targets and is deferred to ADR-015 Phase 6. The bone-driven portion alone provides meaningful face customization.

| Subgroup | Parameter | Primary Bones Affected |
|----------|-----------|----------------------|
| **Jaw & Chin** | Jaw Width | mFaceJaw (X scale) |
| | Jaw Angle | mFaceJaw (Z rotation) |
| | Chin Depth | mFaceChin (Z position) |
| **Nose** | Nose Width | mFaceNoseLeft/Right (X position) |
| | Nose Bridge | mFaceNoseBridge (Y/Z position) |
| | Nose Length | mFaceNoseBase (Y position) |
| **Eyes** | Eye Spacing | mFaceEyeLeft/Right (X position) |
| | Eye Size | mFaceEyeLeft/Right (uniform scale) |
| | Eye Depth | mFaceEyeLeft/Right (Z position) |
| | Brow Height | mFaceBrowLeft/Right (Y position) |
| | Brow Ridge Depth | mFaceBrowCenter (Z position) |
| **Mouth** | Lip Width | mFaceLipCornerLeft/Right (X position) |
| | Mouth Position | mFaceTeethLower, mFaceLipLower (Y position) |
| **Forehead** | Forehead Height | mFaceForehead (Y scale) |
| | Forehead Slope | mFaceForehead (Z rotation) |

**Total: ~55 sliders** (40 body + 15 face) across 9 collapsible subgroups.

### 3. Runtime Driver

Create `src/avatar/ShapeParameterDriver.ts`:

- Receives skeleton reference from OpenSimLoader
- Maintains current parameter values (Map<string, number>)
- On slider change: iterates all BoneDrivers for that parameter, applies cumulative deltas
- Handles collision volume bones (children of animation bones, same transform approach)
- Applies all parameters cumulatively (multiple params can affect the same bone)

### 4. UI: Shape Slider Panel

Create `src/hud/ShapeSliderPanel.ts`:

- 9 collapsible subgroups: Body, Torso, Arms, Legs, Details, Jaw & Chin, Nose, Eyes & Brows, Mouth & Forehead
- Two top-level sections: **Body** and **Face** (visually separated, each with their own subgroups)
- Each parameter: labeled slider, 0-100 range, current value display
- Reuses existing `SliderControl` component
- Real-time: every `input` event triggers driver update
- Camera auto-focus: selecting a Face subgroup zooms the camera to head; selecting a Body subgroup zooms to full body or relevant region

### 5. Body Presets

4-5 curated starting points at the top of the Shape tab:

**Body presets:**

| Preset | Description | Strategy |
|--------|-------------|----------|
| Default | SL default proportions | All sliders at SL defaults |
| Athletic | Broad shoulders, narrow hips, defined | Higher shoulder width, torso muscle, lower body fat |
| Curvy | Fuller figure, wider hips | Higher breast/hip/butt size, waist taper |
| Slim | Lean, elongated | Lower body thickness/fat, longer limbs |
| Heavy | Larger overall build | Higher body thickness/fat/belly |

**Face presets:**

| Preset | Description | Strategy |
|--------|-------------|----------|
| Default | SL default face | All face sliders at SL defaults |
| Angular | Strong jaw, prominent brow | Wider jaw, deeper brow ridge, narrower nose |
| Soft | Rounded features | Smaller jaw angle, higher cheeks, wider eyes |
| Distinct | Pronounced features | Larger nose bridge, wider lip, deeper chin |

Presets set all slider values simultaneously with a smooth interpolation (lerp over ~300ms). Body and face presets are independent — users can mix any body with any face.

### 6. Refactor BodyTab → ShapeTab

The current `src/hud/BodyTab.ts` (4 ColorSlotWidgets for skin/hair/eyes/lips) is renamed and restructured. Color editing moves to the new SkinTab (ADR-011).

---

## Consequences

- This is the flagship differentiator — no competitor offers web-based OpenSim shape editing
- ~55 sliders (body + face) is a serious shape editor at launch, even without clothing
- Collision volume bone transforms enable automatic fitted mesh clothing deformation in later phases
- The open-source viewer codebases provide verified reference implementations for the bone math
- Phase 1 is bone-only; morph targets (~80 more for fine detail) deferred to ADR-015 Phase 6
- param_driver meta-parameters that combine bone + morph are partially functional (bone portion works, morph portion is no-op until Phase 6)
- Face bone params alone give meaningful face customization; .llm morphs add fine surface detail later
- Camera auto-focus on face editing creates an intuitive "zoom to what you're editing" UX
- Body and face presets are independently mixable — combinatorial variety from a small number of presets

## Verification

- [ ] All ~55 sliders render in 9 collapsible subgroups under Body and Face sections
- [ ] Each body slider produces visible, real-time bone deformation
- [ ] Each face slider produces visible deformation of face structure
- [ ] Body presets and face presets apply independently
- [ ] Extreme slider positions (0 and 100) don't break the mesh
- [ ] Collision volume bones (CHEST, PELVIS, BELLY) respond to relevant parameters
- [ ] Bento face bones (mFaceJaw, mFaceNose*, mFaceEye*, mFaceBrow*) respond to face sliders
- [ ] Default preset matches SL's default body and face appearance
- [ ] Multiple parameters affecting the same bone accumulate correctly
- [ ] Camera auto-focuses to head when a face subgroup is selected
- [ ] Camera auto-focuses to full body when a body subgroup is selected
