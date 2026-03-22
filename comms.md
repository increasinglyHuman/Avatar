# Avatar ↔ World/NEXUS Integration — Communications Document

**Date:** 2026-03-22
**Parties:** Avatar Team (BlackBox Avatar) ↔ World Team (BBWorlds/NEXUS)
**Purpose:** Align on how extracted VRoid clothing catalog integrates with the inventory system and NEXUS appearance record
**Related ADRs:** ADR-069 (Inventory System), ADR-070 (Wardrobe & Equipment), ADR-050 (Equipment & Appearance Split)

---

## 1. Context

The Avatar tool has extracted a complete VRoid clothing catalog:
- 6 base bodies, 16 hair styles, 39 tops, 38 bottoms, 25 onepieces, 42 shoes, 23 accessories
- 34 texture-only items (socks, undershirts, underpants)
- 184 texture variants tracked as duplicates with `isDuplicate` / `duplicateOf`
- Master catalog: `extracted-assets/catalog/items.json`
- Thumbnail generator ready: `tools/generate-thumbnails.html`

The World team has built an inventory system (ADR-069/070) with folder hierarchy, worn state, outfit management, and a NEXUS persistence layer. We need to connect these two systems.

**Goal:** A user opens their inventory, sees clothing items from the Avatar catalog in their Library, clicks "Wear" on a shirt, and it appears on their avatar — synced to other players via NEXUS.

---

## 2. Questions for Avatar Team

### Q1: Runtime Clothing Swap Mechanism

The extracted catalog contains standalone GLB files per clothing piece. At runtime, how do we put a shirt on an avatar?

**Our assumption:**
```
1. Load shirt GLB (standalone mesh)
2. Find matching bone names between shirt skeleton and avatar skeleton
3. Rebind shirt's skin weights to avatar's skeleton nodes
4. Parent shirt mesh to avatar root
5. Optionally hide body submeshes that are covered (e.g., arms under sleeves)
```

**Questions:**
- Is this the correct flow? Does the Avatar tool have reference code for skeleton rebinding?
- Do we need to dispose/remove the old shirt mesh before adding a new one, or is it just show/hide?
- For body cutout management — does items.json (or could it) specify which body submeshes to hide when a garment is worn?
- Is there a `clothe(avatarRoot, glbPath)` style utility function, or does World need to build this?

### Q2: Asset Deployment

Where should the extracted assets live on production?

**Options we see:**
- A) `/var/www/world/clothing/` alongside other world assets (rsync deploy)
- B) `/var/www/avatar/extracted-assets/` keeping Avatar's directory structure
- C) S3/CDN for large asset collections
- D) Other?

**Current state:** Are extracted GLBs deployed anywhere on production already, or only local?

**Related:** The `asset` paths in items.json are relative (e.g., `clothing/tops/top01-N00_010_01_...glb`). What base URL should World prepend at runtime?

### Q3: items.json Schema Stability

Is the current items.json schema stable for us to build a migration against?

**Fields we plan to use:**
- `id` → inventory asset reference
- `slot` → clothing slot (tops, bottoms, shoes, etc.)
- `asset` → GLB path for loading
- `thumbnail` → inventory thumbnail
- `gender` → filter/compatibility
- `isDuplicate` / `duplicateOf` → runtime tinting instead of loading duplicate GLBs
- `tintable` → show color picker in inventory UI
- `vertexCount` / `triangleCount` → performance badge
- `skeleton` → compatibility check

**Questions:**
- Any planned schema changes we should wait for?
- Should we treat items.json as the canonical source and generate NEXUS migrations from it?
- Is there a versioning strategy? (current `"version": 1`)

### Q4: Texture-Only Items (Socks, Underwear)

The 34 texture-only items have a different schema with `blendMode`, `compositingLayer`, `targetMesh`, `uvLayout`.

**Questions:**
- How does compositing work at runtime? Canvas 2D texture merge → upload to GPU as new material texture?
- Can multiple texture layers stack? (e.g., underwear + socks both composited onto body)
- What's the compositing order? (`compositingLayer: 1` — does higher = on top?)
- Is there reference code for this in the Avatar tool?

### Q5: Base Body Selection

There are 6 base bodies (feminine + masculine variants).

**Questions:**
- Does the user pick a base body at character creation, or can they switch anytime?
- Are the feminine/masculine variants interchangeable at runtime (swap base body, clothing refits automatically)?
- Are all 6 truly distinct, or are some just texture variants of the same mesh?
- Does the base body choice affect which clothing items are compatible? (e.g., feminine tops only on feminine bases?)

### Q6: Runtime Tinting / Recoloring

For the 184 duplicate-geometry items (same mesh, different texture), the plan is to load the base mesh once and tint at runtime.

**Questions:**
- What's the recoloring mechanism? Material `diffuseColor` property? Texture tint? Shader uniform?
- Does items.json have (or could it have) the target color for each duplicate? Currently we see `duplicateOf` but not the color delta.
- Can the user pick arbitrary colors (color picker), or are there preset palettes per item?

### Q7: Hair Swapping

Hair is extracted as standalone GLBs with spring bone data.

**Questions:**
- Same skeleton rebinding as clothing, or different attachment method?
- Spring bones (J_Sec) — do these need special handling at runtime, or does Babylon.js VRM extension handle them?
- Can VRM hair be used on Ruth/Roth avatars (cross-format hair swap)?

---

## 3. What World/NEXUS Is Building

### 3.1 NEXUS Appearance Record (Proposed)

We want NEXUS to store the complete appearance state per user:

```typescript
interface AvatarAppearance {
    // Base identity
    avatarType: 'vrm' | 'prebuilt' | 'genMesh' | 'hypergrid';
    baseBodyId: string;              // Which base body (e.g., "DefaultFemale")

    // Clothing overlays (from catalog)
    clothing: Array<{
        slot: string;                // 'tops', 'bottoms', 'shoes', etc.
        itemId: string;              // items.json id (e.g., "tops-top01-0")
        tint?: string;               // Hex color override for tintable items
    }>;

    // Texture layers (socks, underwear)
    textureLayers: Array<{
        slot: string;
        itemId: string;
        compositingLayer: number;
    }>;

    // Hair
    hairId: string;                  // items.json hair id

    // Bone-attached equipment (existing AttachmentSystem)
    attachments: Array<{
        slotId: string;              // Bone attachment point
        glbPath: string;
        itemId: string;              // inventory_items id
    }>;

    // Customization
    skinTint?: string;               // Hex color
    tattoos?: Array<{ region: string; textureUrl: string }>;
}
```

This record would be:
- **Stored** in NEXUS (users table JSONB or separate table)
- **Sent** to other players on `user_joined`
- **Updated** on every clothing/equipment change
- **Restored** on login (so you look the same as when you left)

### 3.2 Inventory Library Seed

We plan to import items.json as Library items in the inventory system:
- System user owns all items (read-only Library)
- Users "Copy to Inventory" to get their own instance
- Clothing items show in inventory with thumbnails from the catalog
- "Wear" action loads the GLB and updates the NEXUS appearance record

### 3.3 Clothing Swap Flow (Proposed)

```
User clicks "Wear" on shirt in inventory
  → Client sends to NEXUS: { action: 'wear_clothing', slot: 'tops', itemId: 'tops-top01-0' }
  → NEXUS updates appearance record
  → NEXUS confirms to client
  → Client loads shirt GLB, rebinds skeleton, shows on avatar
  → NEXUS broadcasts appearance_changed to instance
  → Other clients update remote avatar
```

---

## 4. Avatar Team Responses

*Filled 2026-03-22 by Avatar Team*

### A1: Runtime Clothing Swap

**Your assumption is correct.** The flow is: load GLB → rebind skeleton → parent to avatar root.

**Reference code:** `avatar-preserved/library/vrmClothingManager.js` — Three.js implementation, lines 86–113 (`applyClothingPiece`) and 413–451 (`rebindToSkeleton`). The Babylon.js port follows the same algorithm:

```typescript
// Skeleton rebinding — bone name matching
function rebindToSkeleton(clothMesh: Mesh, targetSkeleton: Skeleton) {
  const boneMap = new Map<string, Bone>();
  targetSkeleton.bones.forEach(bone => boneMap.set(bone.name, bone));

  const newBones = clothMesh.skeleton.bones.map(srcBone =>
    boneMap.get(srcBone.name) ?? srcBone  // fallback keeps spring bones
  );
  // Rebuild skeleton with remapped bones, recalculate inverses
}
```

**Dispose vs show/hide:** Dispose the old mesh when swapping within a slot (tops replaces tops). Each slot has at most one active garment. Reason: GLBs carry their own materials/textures — hiding wastes GPU memory. Accessories are the exception (stackable, max 2 per sub-slot).

**Body cutout management:** Not needed for VRoid clothing. VRoid garments are designed to fully cover the body regions they overlay — there's no clipping because the clothing geometry sits slightly outside the body mesh. The body skin renders underneath but is occluded naturally. No items.json field needed for this.

**Utility function:** Avatar will provide a `ClothingManager.ts` module (Sprint 2) with:
- `equipItem(avatarRoot, glbUrl, slot)` → load, rebind, parent, return mesh ref
- `unequipSlot(avatarRoot, slot)` → dispose mesh, clean up
- `getEquipped(avatarRoot)` → list current items per slot

World can call these directly or we can expose them via PostMessageBridge commands.

### A2: Asset Deployment

**Option B — `/var/www/avatar/extracted-assets/`** — keeping the directory structure from the extraction tool.

**Current state:** Local only. Not yet deployed to production.

**Deployment plan:**
```bash
# From local machine
rsync -avz --delete \
  -e "ssh -i ~/.ssh/poqpoq-new.pem" \
  ./extracted-assets/ ubuntu@poqpoq.com:/var/www/avatar/extracted-assets/
```

Apache already has `Alias /avatar /var/www/avatar` configured, so assets will be available at:
- **Base URL:** `https://poqpoq.com/avatar/extracted-assets/`
- **Example:** `https://poqpoq.com/avatar/extracted-assets/clothing/tops/top01-N00_010_01_Onepiece_00_CLOTH_01__Instance_.glb`
- **Catalog:** `https://poqpoq.com/avatar/extracted-assets/catalog/items.json`
- **Thumbnails:** `https://poqpoq.com/avatar/extracted-assets/thumbnails/` (once generated)

S3/CDN migration can happen later when we need global edge caching. For now, 236 MB on the server is fine.

### A3: items.json Stability

**Schema is stable enough to build against.** Version 1 fields are final. Planned additions (non-breaking):

- `displayName` — human-readable item name (e.g., "Cropped Denim Jacket" instead of the material name)
- `tags` — searchable tags (e.g., `["casual", "denim", "cropped"]`)
- `defaultTint` — hex color for the item's original color (needed for duplicates — see A6)
- `coverageRegion` — body region hint for future LOD optimization (not for cutouts)

**None of these break existing fields.** The `version` field will stay at 1 until we make a breaking change.

**Yes, treat items.json as canonical source.** The recommended flow:
1. Avatar runs extraction → generates items.json
2. World reads items.json → generates NEXUS migration / Library seed
3. If Avatar re-extracts (new assets added), World re-runs its migration

**Versioning:** `generated` timestamp + `version` integer. Bump version only on breaking schema changes.

### A4: Texture Compositing

**Yes, Canvas 2D → GPU upload.** The `SkinCompositor` (planned for Sprint 3) works like this:

```typescript
class SkinCompositor {
  private canvas: OffscreenCanvas;  // 2048×2048
  private ctx: OffscreenCanvasRenderingContext2D;

  compose(layers: TextureLayer[]): DynamicTexture {
    // Layer 0: base body skin texture (always)
    ctx.drawImage(baseSkinImage, 0, 0);

    // Layers 1+: sorted by compositingLayer ascending
    for (const layer of layers.sort((a, b) => a.compositingLayer - b.compositingLayer)) {
      ctx.globalCompositeOperation = layer.blendMode;  // 'source-over' for alpha
      ctx.drawImage(layerImage, 0, 0);
    }

    // Upload composited result to GPU
    const dynamicTex = new DynamicTexture("composed-skin", 2048, scene);
    dynamicTex.getContext().drawImage(canvas, 0, 0);
    dynamicTex.update();
    return dynamicTex;
  }
}
```

**Yes, multiple layers stack.** Underwear (layer 1) + socks (layer 1) both composite onto the body. They don't overlap in UV space, so the order between same-layer items doesn't matter.

**Compositing order:** Higher `compositingLayer` = on top. The full layer stack from the Dressing Room spec:
- Layer 0: Base skin
- Layer 1: Clothing paint (socks, underwear, undershirts)
- Layer 2: Nail polish
- Layer 3: Makeup (lipstick, eyeshadow)
- Layer 4: Tattoos (persistent, up to 8)
- Layer 5: Temporary effects (mud, paint — session-only)

**Reference code:** Not yet implemented. Sprint 3 deliverable. The spec is in `avatar-preserved/docs/DRESSING_ROOM_SPEC.md` Section "Skin Layers". Cost: ~2–5ms per recomposite (only on layer change, not per-frame).

### A5: Base Body Selection

**Character creation picks a base body.** The user chooses feminine or masculine at the start. This can be changed later in the Dressing Room (it's a full re-load, not a hot swap, since clothing fit is gender-specific).

**The 6 bases break down as:**
- `nude-feminine` — canonical feminine base (use this)
- `nude-masculine` — canonical masculine base (use this)
- `DefaultFemale` — same mesh as nude-feminine with default hair/face (prebuilt)
- `defaultMale` — same mesh as nude-masculine with default hair/face (prebuilt)
- `baseMale` / `baseMale2` — older masculine exports (59 bones, no spring bones). **Deprecated — use nude-masculine instead.**

**For World's purposes: 2 base bodies** — `nude-feminine` and `nude-masculine`. The other 4 are variants or legacy.

**Gender affects clothing compatibility:** All 350 extracted clothing items are feminine. Masculine clothing is not yet in the catalog (VRoid masculine exports weren't included in the initial collection). Cross-gender equipping would technically work (same skeleton) but garments are shaped for feminine proportions — they'd look wrong on masculine bodies. We should enforce gender filtering in the inventory UI.

### A6: Tinting

**Mechanism: HSL texture remapping** — the same system already working in `MaterialEditor.ts` + `TextureRecolorizer.ts`.

The flow:
1. Read the material's base color texture pixels
2. Convert each pixel RGB → HSL
3. Replace H and S with the target color's H and S
4. Remap L using a tint offset (darken/lighten)
5. Write result as a new RawTexture, assign to material

This preserves texture detail (folds, stitching, shading) while changing the color. It's more sophisticated than a flat `diffuseColor` tint.

**items.json enhancement needed:** We'll add `defaultTint: "#hex"` to each clothing item recording its original color. For duplicates, the `duplicateOf` reference + both items' `defaultTint` values tell you the color delta. But in practice, the user just picks a color and we remap — we don't need to know what the "original" was.

**User gets a color picker.** Both preset swatches (per item category) and a free-form HSL picker. The intensity slider (0–100%) controls how much recoloring is applied — at 0% you see the original texture, at 100% it's fully remapped.

### A7: Hair

**Same skeleton rebinding as clothing.** Hair meshes are skinned to J_Bip bones (head, neck) just like clothing. The `extractHair` function in `vrmClothingManager.js` (lines 210–240) handles both the top-level Hair001 mesh and the HairBack primitive in the Body mesh — both must be swapped together.

**Spring bones (J_Sec):** These are physics simulation bones for hair sway. In the extracted GLBs, the spring bone data is in the skeleton but the VRMC_springBone extension was stripped (since we strip all VRM extensions during extraction). **Two options:**
1. Re-add spring bone config as a sidecar JSON per hair style (preferred)
2. Use Babylon.js physics constraints to approximate spring behavior

For MVP, hair will be static (no physics). Spring bone support is a polish item.

**Cross-format (VRM hair on Ruth/Roth):** Not directly compatible. VRM hair uses J_Bip_C_Head as the attachment bone; Ruth/Roth uses mHead. The BoneMapper can translate between them, but the hair mesh vertex weights would need remapping — this is a non-trivial operation. **Recommendation:** Separate hair catalogs per avatar pipeline. Hair is cheap to model, and the visual style should match the avatar body anyway.

---

## 5. Agreed Contracts

*(Fill in as we align — these become the implementation spec)*

### Asset Path Convention
- **Base URL:** `https://poqpoq.com/avatar/extracted-assets/`
- **Clothing GLB:** `{baseUrl}/{items.json asset path}`
- **Thumbnails:** `{baseUrl}/{items.json thumbnail path}`
- **Texture layers:** `{baseUrl}/{items.json asset path}`
- **Catalog:** `{baseUrl}/catalog/items.json`

### NEXUS Events
| Event | Direction | Payload |
|-------|-----------|---------|
| `appearance_sync` | C→S | `{ userId }` |
| `appearance_full` | S→C | `{ appearance: AvatarAppearance }` |
| `appearance_change` | C→S | `{ slot, itemId, action: 'wear'\|'remove' }` |
| `appearance_changed` | S→C (broadcast) | `{ userId, appearance: AvatarAppearance }` |

### Skeleton Contract
- **Bone naming:** J_Bip_* (VRoid standard)
- **Bone count:** 52 body bones (mandatory), J_Sec_* spring bones (optional)
- **Rest pose:** T-pose
- **Scale:** VRoid default (1 unit ≈ 1 meter)

---

## 6. Timeline

| Milestone | Owner | Target |
|-----------|-------|--------|
| Answer Q1-Q7 | Avatar Team | — |
| Deploy extracted assets to production | Avatar Team | — |
| NEXUS appearance record schema | World Team | After Q1-Q7 answered |
| Library seed migration (items.json → inventory) | World Team | After schema agreed |
| Runtime clothing swap implementation | World Team + Avatar Team | After deployment + answers |
| Multi-user appearance sync | World Team | After clothing swap works |

---

*Last updated: 2026-03-22 — Section 4 filled by Avatar Team*
