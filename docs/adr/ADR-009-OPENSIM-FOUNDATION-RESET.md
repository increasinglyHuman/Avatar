# ADR-009: OpenSim Foundation Reset

**Status:** Proposed
**Date:** 2026-04-05
**Authors:** Allen Partridge, Claude Code
**Relates to:** ADR-008 (Ruth/Roth Stream), ADR-006 (Unified Skeleton Contract)
**Phase:** 0

---

## Context

The VRoid clothing extraction pipeline is legally blocked (VRoid usage agreement prohibits deconstruction of clothing layers). ADR-008 introduced Ruth2/Roth2 as a parallel stream; this ADR promotes OpenSim to the **primary avatar system** and resets the application foundation accordingly.

The existing codebase (24 TypeScript files) is VRM-centric: VRMAnalyzer, ClothingManager, HairSwapper, and CatalogLoader all assume VRoid naming conventions and mesh structure. However, the infrastructure layer (AvatarEngine, LightingSetup, Background, DressingRoomCamera, PostMessageBridge, ColorPicker, SliderControl) is model-agnostic and fully reusable.

Ruth2 and Roth2 GLB files already exist in the project ecosystem:
- `blackBoxIKAnimator/public/models/opensim/ruth2/Ruth2v4Dev.glb`
- `blackBoxIKAnimator/public/models/opensim/roth2/Roth2V2DevWithArmature.glb`
- `World/Ruth2v4Dev_PartialLindenSkeleton.glb`

### Critical Default Shape Parameters

Ruth2 was modeled with SL default shape parameters already applied. Two parameters have non-zero defaults in `avatar_lad.xml`:
- **Arm Length:** default 0.6 (extends arms by 12-18%)
- **Shoulders:** default -0.5 (narrower than bone rest pose)

Without applying these at load time, the mesh will visually misalign by ~6.7cm at the hands.

---

## Decision

### 1. Promote OpenSim to Primary

Ruth2/Roth2 becomes the default avatar system. VRM support moves to `src/legacy/vrm/` for potential future restoration but is no longer on the critical path.

### 2. Code Disposition

**KEEP (model-agnostic):**
- `src/core/AvatarEngine.ts` — Babylon.js init, render loop
- `src/scene/LightingSetup.ts`, `src/scene/Background.ts`
- `src/camera/DressingRoomCamera.ts`
- `src/bridge/PostMessageBridge.ts`, `src/bridge/EmbedDetection.ts`
- `src/hud/ColorPicker.ts`, `src/hud/ColorSlotWidget.ts`, `src/hud/SliderControl.ts`
- `src/hud/TabBar.ts`, `src/hud/Sidebar.ts` (adapt tab list)
- `src/avatar/MaterialEditor.ts` (decouple from VRM types)
- `src/avatar/TextureRecolorizer.ts`

**RETIRE to `src/legacy/vrm/`:**
- `src/avatar/VRMAnalyzer.ts`
- `src/avatar/ClothingManager.ts`
- `src/avatar/HairSwapper.ts`
- `src/avatar/CatalogLoader.ts`
- `src/hud/OutfitsTab.ts`

**BUILD NEW:**
- `src/avatar/OpenSimLoader.ts` — Load GLB, detect Bento skeleton (128+ bones), enumerate 44 sub-meshes by name/role, apply default shape parameters, return `OpenSimStructure` descriptor
- `src/types/opensim.ts` — `OpenSimStructure`, `OpenSimMeshPart`, `BentoSkeleton`, `ShapeParameterValue`

### 3. Boot Sequence Change

`AvatarLifecycle.spawn()` replaces VRMAnalyzer with OpenSimLoader. The boot sequence becomes:

```
AvatarEngine.init() → Load GLB → OpenSimLoader.analyze()
  → Apply default shape params → LightingSetup → Background
  → DressingRoomCamera.focusOnModel() → Sidebar (empty tabs)
```

### 4. Asset Deployment

Copy Ruth2 v4 GLB to `public/assets/ruth2-feminine.glb`. Update `AVATAR_DEFAULTS.modelPath` from `assets/nude-feminine.vrm` to `assets/ruth2-feminine.glb`.

---

## Consequences

- VRM character selector (8 prebuilt characters + upload) becomes unavailable until replaced (see ADR-014)
- All VRM-specific Sprint 2 work (clothing equip/unequip, hair swap) is archived, not lost
- Existing production deployment at `poqpoq.com/avatar/` will show Ruth2 instead of VRM character
- The Animator team's BoneMapper `opensim` platform work (ADR-010) directly supports this foundation

## Verification

- [ ] Ruth2 GLB loads and renders in viewport
- [ ] 128+ Bento skeleton bones detected and enumerable
- [ ] Default shape parameters applied (arms at correct length)
- [ ] Orbit camera, 3-point lighting functional
- [ ] Sidebar shell renders with tab placeholders
- [ ] No VRM-specific code in the boot path
