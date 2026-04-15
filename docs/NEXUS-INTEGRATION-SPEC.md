# Avatar ↔ NEXUS Integration Specification

**Status:** Draft  
**Date:** 2026-04-15  
**Author:** Avatar Team (Allen Partridge / Claude)  
**Audience:** World Team, NEXUS maintainers  
**Relates to:** ADR-017 (Shape UI), ADR-018 (Appearance Panel), ADR-019 (Wardrobe UX), World ADR-070 (Wardrobe/Equipment)

---

## 1. Overview

BlackBox Avatar is a standalone character creation tool that produces four types of inventory-grade assets:

| Asset | Type | Description |
|-------|------|-------------|
| **Shape** | `bodypart` / `shape` | 103 bone-driven slider values defining body/face proportions |
| **Skin** | `bodypart` / `skin` | Matched set of head + upper + lower body textures |
| **Clothing** | `clothing` / varies | Texture-based garments applied to avatar mesh |
| **Outfit** | `outfit` / `outfit` | Named collection linking one shape + one skin + N clothing items |

All four types must flow into the NEXUS inventory system as first-class items that users can save, load, trade, sell on marketplace, and include in outfits.

This document defines the shared contract: what Avatar produces, what NEXUS stores, and what each team implements.

---

## 2. Asset Schemas (properties JSONB)

### 2.1 Shape

A shape is a lightweight data record (no binary asset). It stores the slider state for all 103 parameters, keyed by both internal ID and SL param ID for import/export compatibility.

```jsonc
{
  "asset_type": "bodypart",
  "asset_subtype": "shape",
  "name": "My Athletic Shape",
  "properties": {
    // Format version (for future schema evolution)
    "version": 1,

    // Which skeleton family this shape targets
    "skeleton_type": "bento",

    // Gender this shape was authored for (affects which params are present)
    "gender": "feminine",  // "feminine" | "masculine"

    // The slider values — internal param ID → 0-100 integer
    "params": {
      "height": 65,
      "body_thickness": 55,
      "body_fat": 15,
      "shoulder_width": 65,
      "breast_size": 25,
      "egg_head": 50,
      "nose_width": 45,
      "eye_spacing": 50
      // ... all 103 params (omitted params assume defaultValue from definitions)
    },

    // SL param ID mapping for OpenSim/SL import-export interop
    // Key = SL param ID (from avatar_lad.xml), Value = 0-100 slider value
    // Only populated when shape is exported or imported from SL/OpenSim
    "sl_params": {
      "33": 65,   // Height
      "682": 55,  // Body Thickness
      "693": 15   // Body Fat
      // ... etc
    },

    // Total param count (for quick validation)
    "param_count": 103
  }
}
```

**Key design decisions:**
- Params that match their `defaultValue` MAY be omitted (sparse storage). Avatar applies defaults for missing keys.
- `sl_params` is optional — only needed for OpenSim/SL interop. Avatar maintains the bidirectional mapping.
- No binary asset required. `asset_id` and `glb_path` are NULL for shapes.
- `is_worn` = true means this shape is the user's currently active shape.

### 2.2 Skin (SkinSet)

A skin is a matched set of three texture images (head, upper body, lower body) that map to the SL UV layout. Unlike shapes, skins have binary assets (the texture images).

```jsonc
{
  "asset_type": "bodypart",
  "asset_subtype": "skin",
  "name": "Pleiades Natural",
  "properties": {
    "version": 1,
    "gender": "feminine",
    "skeleton_type": "bento",

    // The three texture URLs (uploaded to NEXUS user_assets)
    "textures": {
      "head": "/assets/user/{userId}/{uuid-head}.webp",
      "upper": "/assets/user/{userId}/{uuid-upper}.webp",
      "lower": "/assets/user/{userId}/{uuid-lower}.webp"
    },

    // Optional tint overrides (applied on top of textures at runtime)
    "tint": {
      "skin": "#FFFFFF",     // Overall skin tint (default white = no tint)
      "eye_color": "#4A7C59",
      "nail_color": "#E8C4B8"
    },

    // Creator metadata (for marketplace)
    "tone_label": "Light",   // Human-readable tone description
    "style_tags": ["natural", "freckles", "subtle-makeup"]
  }
}
```

**Upload flow:**
1. User imports/creates skin textures in Avatar's Appearance panel
2. Avatar uploads each texture to NEXUS: `POST /nexus/assets/images/upload`
3. NEXUS returns URLs (stored in `user_assets` table)
4. Avatar creates inventory item via `inventory_action` with URLs in properties

### 2.3 Clothing Item

Clothing in the current system is texture-based (painted onto avatar mesh regions, not separate 3D garments). Each clothing item targets one or more body regions.

```jsonc
{
  "asset_type": "clothing",
  "asset_subtype": "shirt",  // "shirt", "pants", "shoes", "jacket", "underwear", etc.
  "name": "Blue Henley Tee",
  "properties": {
    "version": 1,
    "gender": "unisex",      // "feminine" | "masculine" | "unisex"
    "skeleton_type": "bento",

    // Texture per body region (same upload flow as skins)
    "textures": {
      "upper": "/assets/user/{userId}/{uuid-upper}.webp"
    },

    // Which avatar mesh regions this clothing covers (for alpha masking)
    "alpha_regions": ["tank", "sleeves"],

    // Clothing slot (for outfit composition — one item per slot)
    "slot": "upper_body",    // "upper_body", "lower_body", "shoes", "socks",
                             // "undershirt", "underpants", "jacket", "gloves"

    // Layer order (lower = closer to skin, for texture compositing)
    "layer": 1,

    // Creator metadata
    "style_tags": ["casual", "male", "cotton"]
  }
}
```

### 2.4 Outfit

An outfit is NOT a standalone item with binary data. It is a named folder (folder_type='outfit') containing **inventory_links** that reference the user's actual shape, skin, and clothing items. This matches the existing NEXUS outfit/link system from Migration 010.

```jsonc
// Outfit folder
{
  "folder_type": "outfit",
  "name": "Beach Day Look"
}

// Links inside the outfit folder (inventory_links table)
[
  { "target_item_id": "uuid-of-shape",       "link_name": "My Athletic Shape" },
  { "target_item_id": "uuid-of-skin",        "link_name": "Pleiades Natural" },
  { "target_item_id": "uuid-of-shirt",       "link_name": "Blue Henley Tee" },
  { "target_item_id": "uuid-of-pants",       "link_name": "Khaki Shorts" },
  { "target_item_id": "uuid-of-shoes",       "link_name": "Sandals" }
]
```

**Wearing an outfit:**
1. NEXUS sets `is_worn=false` on all currently worn bodypart/clothing items
2. NEXUS sets `is_worn=true` on each linked item
3. Avatar receives updated inventory state and applies shape + skin + clothing

---

## 3. Required NEXUS/World Changes

### 3.1 Inventory Type Registration (World Team — InventoryTypes.ts)

Add shape and skin subtypes to the type-to-category mapping:

```typescript
// In TYPE_TO_CATEGORY or equivalent mapping:
'bodypart' → 'clothing' category  // Already exists

// In TYPE_SUFFIX_MAP (icon suffixes):
'shape' → 'shp'
'skin'  → 'skn'
```

Shapes and skins should appear in the **Body Parts** system folder and in the **Clothing** category accordion (consistent with OpenSim convention where shapes and skins are bodyparts).

### 3.2 Library Starter Shapes (NEXUS — Freebie Seeding)

Avatar will provide a set of starter shapes as JSON files. NEXUS should seed these as library items (owned by system user `00000000-0000-0000-0000-000000000001`) and copy to new users via `grant_freebie_inventory()`.

**Starter shapes (Avatar provides):**
- Default Female, Default Male
- Athletic, Curvy, Slim, Heavy (body presets)
- Angular Face, Soft Face, Distinct Face (face presets)

Format: One JSON file per shape, same schema as section 2.1.

### 3.3 Avatar → NEXUS Auth Bridge

Avatar currently runs standalone (no auth, no NEXUS connection). To save inventory items, Avatar needs:

1. **JWT token** — When Avatar is launched from World's shelf system, World should pass the user's JWT via URL parameter or postMessage.
2. **NEXUS Socket.IO connection** — Avatar connects to `wss://poqpoq.com/nexus` (or port 3020) with the JWT.
3. **Inventory operations** — Avatar uses `inventory_sync` and `inventory_action` events (same protocol World uses).

**Proposed launch flow:**
```
World shelf → opens Avatar (iframe or new tab)
  → passes JWT + userId via postMessage
  → Avatar connects to NEXUS with JWT
  → Avatar fetches user's shapes/skins/clothing via inventory_sync
  → User creates/edits in Avatar
  → Avatar saves to NEXUS via inventory_action
  → On close, Avatar sends postMessage to World with updated appearance
```

**Fallback (standalone mode):**
When Avatar is opened directly (not from World), it operates in offline mode with localStorage only. Items sync to NEXUS on next authenticated session.

### 3.4 Texture Upload Endpoint

Avatar needs to upload skin/clothing textures. The existing `/nexus/assets/images/upload` endpoint should work if it:
- Accepts `asset_type: 'texture'` with `asset_subtype: 'skin_head' | 'skin_upper' | 'skin_lower' | 'clothing_upper' | 'clothing_lower'`
- Returns the stored URL path
- Respects user quota (skin sets = 3 images, clothing = 1-3 images)

**Question for World team:** Does the current upload endpoint support these subtypes, or does it need an allow-list update?

### 3.5 CORS Configuration

Avatar is served from `https://poqpoq.com/avatar/`. NEXUS CORS already allows `https://poqpoq.com` — no change needed if Avatar is on the same origin. If Avatar is ever served from a different origin, it must be added to the CORS allow list in NexusServer.js.

---

## 4. What Avatar Implements (Our Side)

### 4.1 Shape Serializer

Converts current slider state to/from the JSONB schema in section 2.1. Handles:
- Sparse encoding (omit default values)
- SL param ID mapping (for future import/export)
- Version migration (if schema evolves)

### 4.2 localStorage Cache Layer

All shapes/skins/outfits are cached locally for instant load. Cache is the primary store in standalone mode, secondary when NEXUS is connected.

```typescript
// Cache key pattern:
'bb-shapes'    → ShapeItem[]    // Array of saved shapes
'bb-skins'     → SkinItem[]     // Array of saved skins
'bb-outfits'   → OutfitItem[]   // Array of saved outfits
'bb-shape-active' → string      // ID of currently worn shape
```

### 4.3 NEXUS Client Adapter

Thin wrapper that connects to NEXUS Socket.IO when JWT is available:
- On connect: `inventory_sync` to fetch all bodypart/clothing/outfit items
- On save: `inventory_action` with `action: 'create'` or `action: 'update'`
- On delete: `inventory_action` with `action: 'delete'` (soft delete)
- Bidirectional sync: local cache ↔ NEXUS (NEXUS is source of truth when connected)

### 4.4 Save/Load UI

- **Shape tab:** "Save Shape" button creates a new shape item from current sliders. Shape gallery shows all saved shapes (local + NEXUS). Click to apply.
- **Skin tab:** "Save Skin" button packages current head/upper/lower textures + tint as a skin item.
- **Outfit tab:** "Save Outfit" button snapshots current shape + skin + clothing as an outfit.

### 4.5 postMessage Bridge

Avatar already has a PostMessageBridge module. We extend it to:
- Receive JWT + userId from World on launch
- Send appearance updates to World on save/close
- Receive outfit-load commands from World (e.g., "apply this outfit")

---

## 5. Migration Path

### Phase 1: localStorage Only (Current Sprint)
- Shape save/load with localStorage
- Shape gallery in the Shape tab
- No NEXUS dependency
- Shapes stored in the format defined in section 2.1 (future-proof)

### Phase 2: NEXUS Connection (Next Sprint)
- Auth bridge (JWT from World)
- Socket.IO inventory sync
- Shapes flow to/from NEXUS
- localStorage becomes cache layer

### Phase 3: Full Inventory Integration
- Skins as inventory items (texture upload + properties)
- Clothing as inventory items
- Outfit composition (folder + links)
- Library starter shapes/skins seeded by NEXUS
- Marketplace support (shapes/skins tradeable)

---

## 6. Open Questions for World Team

1. **Upload subtypes:** Does `/nexus/assets/images/upload` need an allow-list update for skin/clothing texture subtypes?
2. **Outfit folder creation:** Can `inventory_action` create folders (folder_type='outfit'), or does that need a new action type?
3. **inventory_action 'create':** The current handler supports rename/delete/restore/favorite/wear/move/empty_trash/upsert_script. Is there a `create` or `insert` action for new items? Or does that go through a different endpoint?
4. **Inventory links:** The `inventory_links` table exists in schema but — is the link CRUD exposed via socket events?
5. **Auth handoff:** What's the preferred mechanism for passing JWT to Avatar? postMessage, URL fragment, or shared cookie?

---

## 7. Compatibility Notes

### OpenSim/SL Interop
- Shape param IDs map to SL's `avatar_lad.xml` param numbers
- The `sl_params` field in the shape schema enables round-trip import/export
- Shapes exported from SL viewers (as XML or binary) can be converted to our format
- This is not required for Phase 1-2 but the schema supports it from day one

### Gender Handling
- Shapes are authored for a specific gender (affects which params are present)
- Some params are gender-specific: `breast_size` → `pec_size` on masculine
- Some params are hidden on masculine: `breast_gravity`, `breast_cleavage`
- The `gender` field in properties enables correct param interpretation

### Forward Compatibility
- `version: 1` in all schemas enables non-breaking evolution
- Unknown properties are preserved (Avatar ignores keys it doesn't recognize)
- Param IDs are stable strings (not array indices) — safe to add new params

---

*This document is the contract between Avatar and World/NEXUS teams. Changes to the JSONB schemas should be coordinated. The Avatar team will maintain this spec as implementation progresses.*
