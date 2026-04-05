# ADR-011: Skin and Materials System

**Status:** Proposed
**Date:** 2026-04-05
**Authors:** Allen Partridge, Claude Code
**Relates to:** ADR-009 (Foundation Reset), ADR-007 (Unified Entity Control), SKIN_COMPOSITOR_SPEC
**Phase:** 2

---

## Context

Ruth2/Roth2 uses standard PBR materials (not VRoid's MToon), which simplifies the material pipeline — no MToon-to-PBR conversion needed. The existing `MaterialEditor.ts` and `TextureRecolorizer.ts` handle color/texture modification but are coupled to VRM types (VRMStructure, VRM naming conventions).

The `SKIN_COMPOSITOR_SPEC.md` defines a 6-layer texture compositing system that maps directly to SL's Bakes on Mesh layer concept. This phase implements the first 3 layers.

Ruth2's standard SL UV mapping means 20 years of compatible skin textures exist in the OpenSim ecosystem, though we start with our own base layers.

---

## Decision

### 1. Decouple MaterialEditor from VRM Types

Replace VRMStructure dependency with a generic material-ref interface:

```typescript
interface AvatarMaterialMap {
  body: Material[];      // Body skin materials
  head: Material[];      // Head/face materials
  eyes: Material[];      // Iris + sclera materials
  hair: Material[];      // Hair materials (if mesh hair)
  nails: Material[];     // Fingernail/toenail materials
}
```

OpenSimLoader provides this map by identifying Ruth2's named sub-meshes (Body_1, Ruth2v4Head, eyes, fingernails, etc.) rather than VRM naming conventions (N00_000_00_*).

### 2. SkinTab

New `src/hud/SkinTab.ts` absorbing the color editing currently in BodyTab:

**Color Slots:**
- Skin tone (applies to body + head materials)
- Eye color (iris material)
- Hair color (hair materials — mesh or texture)
- Lip color (lip region of head material)
- Nail color (fingernail/toenail materials)
- Eyebrow color/style (texture layer)

Each slot uses the existing `ColorSlotWidget` component with preset swatches + continuous picker.

### 3. Skin Compositor v1

Implement the first 3 layers from `SKIN_COMPOSITOR_SPEC.md`:

| Layer | Content | Implementation |
|-------|---------|---------------|
| 0 | Flat color fill | `OffscreenCanvas` fill with skin tone color |
| 1 | Anatomy detail | Alpha-masked PNG (belly button, nipple variant, or none) |
| 2 | Nail polish | Nail material color override |

Output: composited texture uploaded as Babylon.js `DynamicTexture` on the body material.

Layers 3-5 (makeup, tattoos, temporary effects) are deferred to later phases but the compositor architecture supports them from the start.

### 4. Skin Tone System

Rather than a simple color picker, provide a skin tone foundation:

- **8-10 preset tones** spanning the full human range (Fitzpatrick scale as starting reference)
- **Warm/cool undertone adjustment** (shift toward yellow-olive or pink-blue)
- **Continuous picker** for full freedom beyond presets
- Applies uniformly to body + head + hands + feet materials

---

## Consequences

- MaterialEditor becomes pipeline-agnostic (works for any future avatar type)
- SL UV compatibility means community skin textures can be imported later
- Skin Compositor architecture supports future layers (tattoos, makeup, clothing paint) without refactoring
- BodyTab is freed to become the pure Shape tab (ADR-010)

## Verification

- [ ] Skin tone changes reflect on body, head, hands, and feet simultaneously
- [ ] Eye, hair, lip, nail color changes are independent and real-time
- [ ] Skin Compositor produces correct flat color + anatomy overlay
- [ ] DynamicTexture updates without visible flicker or delay
- [ ] Preset skin tones cover diverse range
- [ ] ColorSlotWidget "recent colors" history persists within session
