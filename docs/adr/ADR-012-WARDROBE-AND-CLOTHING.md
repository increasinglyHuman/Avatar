# ADR-012: OpenSim Wardrobe and Clothing System

**Status:** Proposed
**Date:** 2026-04-05
**Authors:** Allen Partridge, Claude Code
**Relates to:** ADR-009 (Foundation Reset), ADR-010 (Parametric Body), ADR-011 (Skin/Materials)
**Phase:** 3

---

## Context

OpenSim/SL clothing operates fundamentally differently from VRM clothing. Three distinct clothing types coexist:

1. **System/texture layers** — Painted onto the body texture via Bakes on Mesh compositing. No geometry change. This is how underwear, socks, undershirts, and basic clothing work in SL.
2. **Rigged mesh** — Separate GLB geometry rigged to the SL Bento skeleton. Standard bone weights.
3. **Fitted mesh** — Rigged mesh additionally weighted to collision volume bones (PELVIS, CHEST, BELLY, BUTT, LEFT_PEC, RIGHT_PEC, etc.). Auto-deforms when shape parameters change because the ShapeParameterDriver (ADR-010) already drives these bones.

SL defines 12+ clothing slots (vs VRM's 9). Alpha masking hides body parts under opaque clothing to prevent z-fighting.

Our clothing catalog starts small and hand-curated. Allen is an award-winning costume designer with a Marvelous Designer license — the pipeline is: MD mannequin export → garment design → Blender rigging to SL skeleton → weight painting → GLB export.

Research reference: `docs/research/SL_OPENSIM_CLOTHING_SYSTEM_RESEARCH.md`

---

## Decision

### 1. Three Clothing Types

`src/avatar/OpenSimClothingManager.ts` handles all three:

| Type | How it works | Example items |
|------|-------------|---------------|
| **Texture layer** | Composited via Skin Compositor (ADR-011) as a layer | Underwear, socks, undershirts, body paint |
| **Rigged mesh** | Separate GLB, parented to avatar, shares skeleton | T-shirts, jackets, skirts, shoes |
| **Fitted mesh** | Rigged mesh + collision volume weights | Form-fitting dresses, pants, corsets |

### 2. Clothing Slot System (12+ slots)

| Slot | Type(s) | Layering |
|------|---------|----------|
| Underwear | Texture | Layer 1 (under everything) |
| Undershirt | Texture | Layer 2 |
| Socks | Texture | Layer 1 |
| Shirt | Rigged/Fitted | Over undershirt |
| Jacket | Rigged/Fitted | Over shirt |
| Pants | Rigged/Fitted | Standard |
| Skirt | Rigged/Fitted | Alternative to pants (can coexist) |
| Shoes | Rigged | Foot replacement mesh |
| Gloves | Rigged/Fitted | Hand cover |
| Hair | Rigged | Head attachment |
| Accessory (head) | Rigged | Hats, glasses, earrings |
| Accessory (body) | Rigged | Necklaces, belts, bags |

### 3. Alpha Masking

`src/avatar/AlphaMaskManager.ts`:

When opaque mesh clothing is equipped, hide body mesh regions underneath to prevent z-fighting. SL uses per-region alpha masks:
- Upper body (torso)
- Lower body (legs)
- Head
- Hands
- Feet

Implementation: toggle mesh sub-part visibility or apply alpha mask textures to body material regions.

### 4. Fitted Mesh Deformation

Fitted mesh clothing weighted to collision volume bones (CHEST, PELVIS, BELLY, BUTT, LEFT_PEC, RIGHT_PEC, L_UPPER_LEG, R_UPPER_LEG, etc.) deforms automatically when shape parameters change — no additional code needed beyond what ShapeParameterDriver already provides.

This is the key architectural win of the OpenSim approach: clothing and body share the same deformation system.

### 5. Clothing Catalog

`src/avatar/OpenSimCatalog.ts` with schema:

```typescript
interface OpenSimClothingItem {
  id: string;
  name: string;
  slot: ClothingSlot;
  type: 'texture' | 'rigged' | 'fitted';
  asset: string;           // Path to GLB or texture
  thumbnail: string;       // 256x256 preview
  alphaRegions: string[];  // Body regions to hide
  compatibleBases: string[]; // ['ruth2', 'roth2', 'both']
  tags: string[];
}
```

Initial catalog: 10-20 hand-curated items created in Marvelous Designer, covering basic wardrobe (shirt, pants, dress, shoes, jacket).

### 6. Expanded WardrobeTab

Adapt existing `src/hud/WardrobeTab.ts`:
- Category bar with SL's 12+ slots
- Visual card grid with thumbnails (research confirms visual >> text)
- Equipped state indicator per slot
- One-click equip/unequip per item
- Filter by compatible base mesh (Ruth2/Roth2/both)

---

## Consequences

- Fitted mesh auto-deformation is "free" — it falls out of the shape parameter system
- Texture-layer clothing requires Skin Compositor (ADR-011) to be complete
- Initial catalog is small but grows as Allen creates garments in MD
- Clothing is NOT cross-compatible between VRM and OpenSim (different skeletons)
- Alpha masking adds complexity but prevents the z-fighting that ruins immersion
- Standard SL UV maps + rigging means community-created OpenSim clothing is theoretically importable

## Verification

- [ ] Rigged mesh clothing loads, parents to avatar, shares skeleton animation
- [ ] Fitted mesh clothing deforms when shape sliders change
- [ ] Texture-layer clothing composites onto body via Skin Compositor
- [ ] Alpha masking hides body under opaque clothing
- [ ] Equip/unequip is instantaneous and clean (no orphaned meshes)
- [ ] Clothing catalog loads, filters by slot, displays thumbnails
- [ ] Slot conflicts resolve correctly (e.g., equipping pants unequips skirt if exclusive)
