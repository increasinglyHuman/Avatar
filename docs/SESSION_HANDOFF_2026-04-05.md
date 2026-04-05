# Session Handoff — April 5, 2026

## What Shipped Today

**12 commits, ~3,800 lines of new code, 5 phases delivered:**

| Phase | Status | Key Files |
|-------|--------|-----------|
| ADRs 009-015 | Done | `docs/adr/ADR-009` through `ADR-015` |
| Phase 0: Foundation | Done | `OpenSimLoader.ts`, `types/opensim.ts` |
| Phase 1: Shape Sliders | Done | `ShapeParameterDefinitions.ts`, `ShapeParameterDriver.ts`, `ShapeSliderPanel.ts` |
| Phase 2: Skin/Materials | Done | `SkinMaterialManager.ts`, `SkinTab.ts` |
| Phase 3: Wardrobe Scaffold | Done | `OpenSimClothingManager.ts`, `AlphaMaskManager.ts`, `OpenSimCatalog.ts`, `WardrobeTab.ts` |
| Phase 4: Outfit Save/Load | Done | `ManifestSerializer.ts`, `OutfitStore.ts`, `OutfitsTab.ts` |

**Production:** https://poqpoq.com/avatar/

## Key Technical Decisions Made

1. **Babylon.js bone gotcha**: GPU bone computation overrides CPU bone properties each frame. Must use `bone.getTransformNode()` for GLB models. (World GOTCHA_BOOK)
2. **Ruth2 correct GLB**: `Ruth2v4Dev_PartialLindenSkeleton.glb` (4.9 MB, WITH skeleton). NOT `Ruth2v4Dev.glb` (mesh only).
3. **Default shape params**: Arm length ×1.12/1.18 + shoulder offset -0.01 applied at load time.
4. **Texture invertY=false**: GLB textures use invertY=false (not true).
5. **Screenshot method**: `CreateScreenshotUsingRenderTargetAsync` for correct portrait aspect ratio.
6. **Skin as first-class item**: Design decision to show skin as equipped item (not hidden texture), with modify permissions.

## Architecture Overview

```
AvatarLifecycle (orchestrator)
├── AvatarEngine (Babylon.js init)
├── OpenSimLoader (GLB → skeleton detection → default shape params → mesh visibility)
├── ShapeParameterDriver (~40 params → bone TransformNode manipulation)
├── SkinMaterialManager (texture swap per UV channel + color tinting)
├── OpenSimClothingManager (load/equip/unequip rigged mesh GLBs)
├── AlphaMaskManager (hide body regions under clothing)
├── OpenSimCatalog (clothing item registry)
├── ManifestSerializer (capture/restore full avatar state)
├── OutfitStore (localStorage persistence)
└── Sidebar
    ├── OutfitsTab (gallery + save with portrait screenshots)
    ├── BodyTab → ShapeSliderPanel (9 collapsible groups + presets)
    ├── SkinTab (3 texture channels + color pickers)
    └── WardrobeTab (10 slot categories + card grid)
```

## Next Session Action Items

### Priority 1: First Real Clothing GLB
- Export a garment from Marvelous Designer → Blender → rig to SL skeleton → GLB
- OR export from Theroniya's Blender files (clothes.blend, casual-cloth.blend.gz)
- Add entry to `BUILT_IN_CATALOG` in `OpenSimCatalog.ts`
- Test equip/unequip + alpha masking on Ruth2
- **This validates the entire Phase 3 pipeline end-to-end**

### Priority 2: OAR Clothing Mining
- Legacy OAR files contain SL-compatible clothing meshes and textures
- Agent dispatched to investigate feasibility (results pending)
- If viable: build extraction pipeline OAR → mesh assets → GLB catalog
- License audit needed per asset (OpenSim content varies widely)

### Priority 3: Attachment System
- World repo has `AttachmentSystem.ts` with typed points + GLB loading
- Port to OpenSim bone names (mWristLeft instead of J_Bip_L_Hand)
- Add attachment categories to WardrobeTab (below clothing slots)
- Points: hands, head_top, ears, nose, chest, back, hips, tail

### Priority 4: UX Refinements
- **Shared color widget**: Replace 4 repeated color pickers with one contextual picker + icon buttons (eye/nail/lip selector)
- **Skin as equipped item**: Show active skin set in Outfits tab as a card alongside clothing
- **Skin modify permissions**: `modifiable` flag gates tint/adjust controls
- **3-stack skin sets**: Browse as trio (upper+lower+head) or mix-and-match

### Priority 5: NEXUS Integration
- PostMessageBridge extensions: `avatar_save_config`, `avatar_load_config`, `avatar_appearance_changed`
- Same AvatarManifest JSON format → NEXUS `users.avatar_config` JSONB
- `avatar_wardrobe` table for multiple saved outfits
- Dual persistence: localStorage (standalone) + NEXUS (embedded in World)

### Priority 6: Character Selector (ADR-014)
- 3 default starter avatars: feminine, agender, masculine
- Each = manifest JSON preset (shape params + Pleiades skin + basic clothing)
- First-time user flow: pick body type → enter dressing room
- Roth2 (male) as second base mesh

## Clothing Wish List

### Essentials (First 10 garments for MVP wardrobe)
1. **Basic T-shirt** — fitted mesh, covers upper body, neutral colors
2. **Tank top** — sleeveless, fitted mesh
3. **Simple pants** — straight leg, fitted mesh, covers lower body + feet region
4. **Shorts** — knee-length, fitted mesh
5. **Simple dress** — A-line, covers upper + lower body
6. **Sneakers/flats** — replaces feet mesh
7. **Hoodie/jacket** — layered over shirt slot
8. **Skirt** — knee-length, fitted mesh
9. **Underwear set** — texture-layer type (composited onto body)
10. **Socks** — texture-layer type

### Extended (Next 10 for variety)
11. **Jeans** — fitted mesh with belt detail
12. **Blazer** — structured jacket
13. **Crop top** — short fitted mesh
14. **Maxi dress** — floor-length
15. **Boots** — ankle or knee-high
16. **Cardigan** — open front layer
17. **Swimsuit** — one-piece, fitted mesh
18. **Athletic wear** — leggings + sports bra
19. **Formal dress** — evening wear
20. **Sandals** — open-toe footwear

### Accessories (Attachment-based)
21. **Earrings** (stud + dangle variants) — ear attachment points
22. **Necklace** — chest attachment point
23. **Bracelet** — wrist attachment points
24. **Glasses** — nose/face attachment
25. **Hat/cap** — head_top attachment
26. **Backpack** — back attachment
27. **Belt** — hip attachment
28. **Watch** — wrist attachment
29. **Hair accessories** (clips, bands) — head attachment
30. **Scarf** — neck attachment

### From OAR Mining (Potential)
- Legacy OAR files may contain SL-rigged clothing meshes
- Need: extraction pipeline + license audit
- Agent investigating feasibility (results pending)
- If viable, could rapidly seed the catalog with dozens of items

## Files Modified (Full List)

### Created
- `src/avatar/OpenSimLoader.ts`
- `src/avatar/ShapeParameterDefinitions.ts`
- `src/avatar/ShapeParameterDriver.ts`
- `src/avatar/SkinMaterialManager.ts`
- `src/avatar/OpenSimClothingManager.ts`
- `src/avatar/AlphaMaskManager.ts`
- `src/avatar/OpenSimCatalog.ts`
- `src/avatar/ManifestSerializer.ts`
- `src/avatar/OutfitStore.ts`
- `src/hud/ShapeSliderPanel.ts`
- `src/hud/SkinTab.ts`
- `src/types/opensim.ts`
- `src/types/clothing.ts`
- `src/types/manifest.ts`
- `docs/adr/ADR-009` through `ADR-015` (7 ADRs)
- `public/assets/ruth2-feminine.glb`

### Modified
- `src/core/AvatarLifecycle.ts` — full rewrite for OpenSim pipeline
- `src/hud/Sidebar.ts` — 4 tabs, subsystem connections
- `src/hud/BodyTab.ts` — shape slider panel host
- `src/hud/WardrobeTab.ts` — slot-based wardrobe UI
- `src/hud/OutfitsTab.ts` — outfit gallery with screenshots
- `src/hud/TabBar.ts` — added Skin tab
- `src/types/index.ts` — OpenSim type exports, default model path
- `vite.config.ts` — ignore extracted-assets in watcher
- `.gitignore` — exception for base avatar GLBs

### Retired to `src/legacy/vrm/`
- VRMAnalyzer.ts, ClothingManager.ts, HairSwapper.ts, CatalogLoader.ts
