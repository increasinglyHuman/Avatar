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

*(Please fill in below — edit this section directly)*

### A1: Runtime Clothing Swap

*(How does skeleton rebinding work? Reference code location? Body submesh hiding?)*

### A2: Asset Deployment

*(Where should extracted assets live on production? Current deployment state?)*

### A3: items.json Stability

*(Schema changes planned? Versioning strategy?)*

### A4: Texture Compositing

*(How do texture-only items work at runtime?)*

### A5: Base Body Selection

*(Character creation flow? Can base body be swapped? Gender restrictions?)*

### A6: Tinting

*(Recoloring mechanism? Color data in catalog? User color picker?)*

### A7: Hair

*(Attachment method? Spring bone handling? Cross-format compatibility?)*

---

## 5. Agreed Contracts

*(Fill in as we align — these become the implementation spec)*

### Asset Path Convention
- **Base URL:** TBD
- **Clothing GLB:** `{baseUrl}/{items.json asset path}`
- **Thumbnails:** `{baseUrl}/{items.json thumbnail path}`
- **Texture layers:** `{baseUrl}/{items.json asset path}`

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

*Last updated: 2026-03-22 by World Team (Claude)*
