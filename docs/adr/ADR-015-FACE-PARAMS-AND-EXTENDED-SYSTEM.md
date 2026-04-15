# ADR-015: Face Parameters, Extended Shape System, and Future Expansion

**Status:** Proposed
**Date:** 2026-04-05
**Authors:** Allen Partridge, Claude Code
**Relates to:** ADR-010 (Parametric Body), ADR-008 (Ruth/Roth Stream)
**Phase:** 6

---

## Context

Phase 1 (ADR-010) implements ~20 bone-driven body parameters. This ADR covers the expansion to the full SL parameter set and future integrations that require deeper technical work:

- **Face parameters (~25):** Bento face bones enable jaw width, chin shape, nose bridge, eye spacing, lip fullness, etc. These require the 46 Bento face bones to be present in the GLB.
- **Morph targets (~80):** SL's `param_morph` parameters define vertex-level deformation stored in `.llm` binary format. Ruth2 v4 has limited shape keys; full coverage requires parsing `.llm` files and converting to glTF morph targets.
- **Driver parameters (~30):** Meta-params that combine bone + morph simultaneously (e.g., "Body Fat" drives both bone scale AND vertex displacement). Phase 1 implements the bone portion; this phase adds the morph portion.

- **VRM legacy character selector update:** Restoring VRM upload capability as a secondary pathway.

### .llm Binary Format

The Linden Lab Mesh format (`.llm`) stores base mesh geometry + embedded morph vertex offsets. The parser exists in Firestorm's `indra/llappearance/llpolymesh.cpp`. Converting these to glTF morph targets is feasible but requires:

1. Parsing the binary format (documented in open-source viewer code)
2. Extracting per-morph vertex offsets
3. Encoding as glTF morph targets in the GLB
4. Mapping SL param IDs to morph target indices

### Open-Source Viewer Reference

Firestorm, Singularity, and other open-source SL viewers implement the full shape parameter system. While their UIs are desktop-native and often kludgy, their architecture provides a verified reference for:

- Parameter definitions and ranges (`avatar_lad.xml` parsing)
- Bone transform formula (`LLPolySkeletalDistortion::apply()`)
- Morph target application (`LLPolyMorphTarget::apply()`)
- Driver parameter resolution (`LLDriverParam::setWeight()`)
- Bakes on Mesh compositing pipeline

---

## Decision

### 1. Extended Face Parameters — Morph-Driven Detail (Phase 6a)

**~15 additional face parameters** requiring .llm morph targets for fine surface detail. The bone-driven face structure sliders (~15 params: jaw, nose, eyes, brow, mouth, forehead) are already in Phase 1 (ADR-010). This phase adds the vertex-level detail that bones alone can't express:

| Category   | Parameters (morph-driven)                                      |
| ---------- | -------------------------------------------------------------- |
| **Jaw**    | Chin cleft depth, jowls, jaw taper                             |
| **Nose**   | Nostril flare, nose tip shape, nose bridge curvature           |
| **Eyes**   | Eye pop, eyelid droop, eye corner tilt                         |
| **Mouth**  | Lip fullness (upper/lower separately), lip thickness, lip curl |
| **Cheeks** | Cheek bone height, cheek fullness, dimples                     |

Implementation: these use the same ShapeParameterDef entries but with morph target indices instead of (or in addition to) BoneDrivers. Requires .llm conversion (Phase 6b) to be complete first.

### 2. Morph Target Pipeline (Phase 6b)

`.llm` → glTF morph target conversion tool:

```
tools/convert-llm-morphs.ts
  Input: Ruth2 .llm files (from OpenSim source)
  Output: Ruth2 GLB with embedded morph targets
```

Once morph targets are in the GLB, `ShapeParameterDriver` extends to handle `param_morph` parameters:

```typescript
// Existing (Phase 1):
bone.scale = base + SUM(param * delta_scale);

// New (Phase 6):
mesh.morphTargetInfluences[morphIndex] = param_value * weight;
```

### 3. Full Driver Parameters (Phase 6b)

Implement `src/avatar/DriverParameterResolver.ts`:

Driver params (e.g., "Body Fat") resolve to multiple sub-operations:

```
Body Fat (driver) →
  BELLY bone scale (param_skeleton) +
  belly_morph target (param_morph) +
  torso_morph target (param_morph) +
  leg_morph target (param_morph)
```

Phase 1's bone-only implementation gets the skeleton portion. Phase 6 adds the morph portion, making drivers fully functional.

### 4. Full Bakes on Mesh (Phase 6c)

Expand Skin Compositor from 3 layers (ADR-011) to the full 11 SL texture channels:

1. Head / Upper Body / Lower Body / Eyes / Skirt / Hair (original 6)
2. Left Arm / Left Leg / Aux 1 / Aux 2 / Aux 3 (BoM extensions)

### 5. Max/Maxine/Maxwell Integration (Phase 6d)

When the Max project stabilizes:

- Shared male/female topology (unlike Ruth2/Roth2's separate meshes)
- Potentially better morph target coverage
- Same SL skeleton and UV maps
- Drop-in replacement for Ruth2/Roth2 as a base mesh option

### 6. VRM Legacy Selector Update (Phase 6e)

Restore VRM upload as a secondary pathway:

- Move `src/legacy/vrm/` code back to active status
- "Import Custom VRM" option in character selector
- Limited editing: color changes only (no shape — VRoid bakes morphs)
- Clearly labeled as import/legacy mode

---

## Consequences

- Full 218-parameter coverage makes this a complete SL-compatible shape editor
- .llm conversion is a one-time tool — run once, embed morphs in the GLB permanently
- Driver parameters bridge the gap between user-facing sliders and internal complexity
- Max integration is a mesh swap, not an architecture change (same skeleton, same parameters)
- Face editing significantly deepens the "customization = attachment" loop
- This phase has the most technical risk (.llm parsing, morph target precision)

## Verification

- [ ] Face sliders produce visible changes to jaw, nose, eyes, mouth
- [ ] .llm conversion tool produces GLB with correct morph targets
- [ ] Morph target deformation matches reference (Firestorm viewer comparison)
- [ ] Driver parameters combine bone + morph effects correctly
- [ ] Full BoM layer stack produces correct composited textures
- [ ] Max mesh (when available) loads as alternative base with same parameter system
- [ ] VRM upload pathway functional for color-only editing
