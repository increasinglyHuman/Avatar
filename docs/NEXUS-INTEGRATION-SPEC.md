# Avatar ↔ NEXUS Integration Specification

**Status:** v2 — Updated for modular NEXUS  
**Date:** 2026-04-15 (updated from v1)  
**Author:** Avatar Team (Allen Partridge / Claude)  
**Audience:** World Team, NEXUS maintainers  
**Relates to:** ADR-017 (Shape UI), ADR-018 (Appearance Panel), ADR-019 (Wardrobe UX), World ADR-070 (Wardrobe/Equipment), ADR-074 (NEXUS Modular Architecture)

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

## 2. Module Placement in NEXUS

### Recommendation: Extend the existing `inventory` module

Avatar's integration is inventory CRUD with type-specific semantics. It does not warrant a new module. The work is:

1. **Add `upsert_bodypart` action** to `InventoryModule.js` — follows the `upsert_script` pattern already in place (find-or-create by name + asset_subtype, update properties JSONB)
2. **Add `upsert_clothing` action** — same pattern
3. **Add `wear_exclusive` action** — wears an item and unwears all other items of the same `asset_subtype` (see Section 5)

The existing `inventory_sync` and `inventory_action` socket events are the transport. No new events needed.

### Manifest Update

The inventory module manifest (`modules/inventory/manifest.json`) should update:

```json
{
  "depended_on_by": {
    "modules": [],
    "clients": ["World", "Avatar"]
  },
  "socket_events": {
    "inbound": [
      { "event": "inventory_sync", "description": "..." },
      { "event": "inventory_action", "description": "..., upsert_bodypart, upsert_clothing, wear_exclusive" }
    ]
  }
}
```

---

## 3. Asset Schemas (properties JSONB)

### 3.1 Shape

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

### 3.2 Skin (SkinSet)

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

### 3.3 Clothing Item

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

### 3.4 Outfit

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

## 4. Required Inventory Actions (NEXUS Implementation)

These are the new `inventory_action` cases the World team needs to add to `InventoryModule.js`. They follow the existing `upsert_script` pattern — which already calls `db.createInventoryItem()`.

### 4.1 `upsert_bodypart` — Create or update a shape/skin

```javascript
// Client sends:
socket.emit('inventory_action', {
  action: 'upsert_bodypart',
  itemId: null,              // null = create new, UUID = update existing
  data: {
    name: 'My Athletic Shape',
    assetSubtype: 'shape',   // 'shape' | 'skin'
    properties: { ... }      // Schema from Section 3.1 or 3.2
  }
}, (response) => { /* { action, item } or { error } */ });
```

**Server behavior:**
- If `itemId` is provided: update `name` and `properties` on existing item (same as rename + properties update)
- If `itemId` is null: call `db.createInventoryItem(userId, { assetType: 'bodypart', assetSubtype, name, properties, creatorId: userId, acquiredFrom: 'avatar_editor' })`
- Return the created/updated item via ack

### 4.2 `upsert_clothing` — Create or update a clothing item

```javascript
socket.emit('inventory_action', {
  action: 'upsert_clothing',
  itemId: null,
  data: {
    name: 'Blue Henley Tee',
    assetSubtype: 'shirt',
    properties: { ... }      // Schema from Section 3.3
  }
}, (response) => { /* { action, item } or { error } */ });
```

**Server behavior:** Same create/update pattern as `upsert_bodypart` but with `assetType: 'clothing'`.

### 4.3 `wear_exclusive` — Wear with slot exclusivity

```javascript
socket.emit('inventory_action', {
  action: 'wear_exclusive',
  itemId: 'uuid-of-shape',
  data: {
    exclusiveSubtype: 'shape'  // Unwear all other 'shape' items before wearing this one
  }
}, (response) => { /* { action, item, unworn: ['uuid1', 'uuid2'] } */ });
```

**Server behavior:**
1. Query: `SELECT id FROM inventory_items WHERE user_id = $1 AND asset_subtype = $2 AND is_worn = true`
2. For each result: `UPDATE inventory_items SET is_worn = false WHERE id = $1`
3. Set `is_worn = true` on the target item
4. Return the worn item + array of unworn item IDs (so client can update UI)

**Why server-side exclusivity matters:** The existing `wear` action is a simple toggle with no constraints. For bodyparts (shape, skin, eyes, hair), only ONE of each subtype can be active at a time. Without server enforcement, two clients could race to wear different shapes, leaving the database in an inconsistent state. The `wear_exclusive` action makes the unset-then-set atomic within a single query transaction.

**Exclusivity rules:**

| Subtype | Max Worn | Rationale |
|---------|----------|-----------|
| `shape` | 1 | One body shape at a time |
| `skin` | 1 | One skin set at a time |
| `eyes` | 1 | One eye texture at a time |
| `hair` | 1 | One hairstyle at a time |
| `shirt` | 1 per slot | One per clothing slot (upper_body, lower_body, etc.) |

For clothing, exclusivity is per `properties.slot` rather than per `asset_subtype`. The client sends `exclusiveSlot: 'upper_body'` instead of `exclusiveSubtype`.

---

## 5. Avatar's Integration Manifest

This is what Avatar registers as its contract with NEXUS. It follows the NEXUS module manifest format for cross-project visibility, even though Avatar is a client (not a server module).

```json
{
  "name": "avatar-client",
  "version": "1.0.0",
  "description": "BlackBox Avatar character creation tool — consumes NEXUS inventory for shape/skin/clothing persistence",
  "domain": "avatar",

  "consumes": {
    "nexus_module": "inventory",
    "socket_events": {
      "emits": [
        {
          "event": "inventory_sync",
          "payload": "{}",
          "description": "Fetch all bodypart + clothing items on connect"
        },
        {
          "event": "inventory_action",
          "actions": ["upsert_bodypart", "upsert_clothing", "wear_exclusive", "rename", "delete", "favorite"],
          "description": "Shape/skin/clothing CRUD and wear management"
        }
      ],
      "listens": [
        {
          "event": "inventory_full",
          "description": "Full inventory snapshot — Avatar filters for asset_type bodypart + clothing"
        },
        {
          "event": "inventory_update",
          "description": "Single-item update confirmation (fallback when ack unavailable)"
        },
        {
          "event": "inventory_error",
          "description": "Error responses"
        }
      ]
    },
    "rest_endpoints": [
      {
        "method": "POST",
        "path": "/nexus/assets/images/upload",
        "description": "Upload skin/clothing textures (3 images per skin set, 1-3 per clothing item)"
      }
    ]
  },

  "auth": {
    "mechanism": "OAuth UUID via postMessage from World",
    "session": "Socket.IO connection + user_register event with { username: userId } (same as World client)",
    "fallback": "Standalone mode — localStorage only, no NEXUS connection"
  },

  "contract": {
    "invariants": [
      "Avatar only creates items with asset_type 'bodypart' or 'clothing'",
      "Shape items have asset_subtype 'shape', no binary asset (asset_id = null, glb_path = null)",
      "Skin items have asset_subtype 'skin', binary assets uploaded via /nexus/assets/images/upload",
      "All properties JSONB include version:1 for schema evolution",
      "Sparse param encoding: omitted params = default value (Avatar resolves on read)",
      "wear_exclusive enforces one active shape and one active skin at a time"
    ],
    "failure_modes": [
      "No JWT available → offline mode (localStorage only, no data loss)",
      "NEXUS connection lost → queued mutations replayed on reconnect (future)",
      "Upload quota exceeded → user notified, skin not saved"
    ],
    "performance": [
      "inventory_sync filtered client-side (Avatar only renders bodypart + clothing items)",
      "Shape saves are ~2KB JSONB (103 sparse params), no binary upload"
    ]
  }
}
```

---

## 6. Auth Bridge — OAuth UUID via postMessage

Avatar currently runs standalone. To connect to NEXUS, it needs the user's OAuth UUID.

**No JWT infrastructure needed.** NEXUS auth is session-based — the `user_register` socket event creates a session from an OAuth UUID. This matches the existing World client pattern and works today without server changes. The `user_register` handler already supports multiple simultaneous connections from the same userId.

### Connection flow

```
World shelf → opens Avatar (iframe or new tab)
  → World sends postMessage: { type: 'auth', userId: 'oauth-uuid', username: 'display-name' }
  → Avatar connects Socket.IO to wss://poqpoq.com/nexus (port 3020)
  → Avatar emits 'user_register' with { username: userId } (same as World client)
  → Session created — all socket events now authenticated
  → Avatar emits 'inventory_sync' to fetch user's items
  → On save: Avatar emits 'inventory_action' with upsert_bodypart/upsert_clothing
  → On close: Avatar sends postMessage to World: { type: 'appearance_updated' }
```

### Standalone mode

When no userId is available (direct navigation to `/avatar/`), Avatar operates in offline mode:
- All saves go to localStorage (existing ShapeStore)
- No NEXUS connection attempted
- Items sync to NEXUS on next authenticated session (reconciliation TBD)

---

## 7. Required NEXUS/World Changes (Checklist)

### Inventory Module (`InventoryModule.js`) — DONE

- [x] Add `upsert_bodypart` action case — **deployed v1.1.0, commit 3b7101a**
- [x] Add `upsert_clothing` action case — **deployed**
- [x] Add `wear_exclusive` action case — **deployed**
- [x] Update manifest.json to list new actions and Avatar as a client

### Inventory Types (`World/src/inventory/InventoryTypes.ts`)

- [ ] Add `'shape'` and `'skin'` to subtype recognition (TYPE_SUFFIX_MAP)
- [ ] Ensure `'bodypart'` maps to `'clothing'` category (already does)

### Library Starter Shapes (Freebie Seeding)

- [ ] Avatar provides starter shape JSON files (Section 3.1 format)
- [ ] Add to `grant_freebie_inventory()` in DatabaseManager — seeded as system-owned items
- [ ] Starter shapes: Default Female, Default Male, Athletic, Curvy, Slim, Heavy

### Texture Upload — RESOLVED

- [x] No allow-list changes needed. Use `asset_type: 'texture'`, pass `asset_subtype` in body (stored, not validated)

### CORS — NO ACTION NEEDED

- [x] Same origin (`https://poqpoq.com/avatar/`)

---

## 8. What Avatar Implements (Our Side)

### Already Done (Phase 1)
- [x] Shape serializer with NEXUS-compatible JSONB schema (ShapeStore)
- [x] localStorage persistence (sparse param encoding, version field)
- [x] Shape gallery UI (save/load/delete/update)
- [x] PostMessageBridge module exists (needs JWT extension)

### Phase 2: NEXUS Wire-Up
- [ ] NexusInventoryAdapter: thin Socket.IO wrapper (connect, sync, upsert, wear)
- [ ] Auth bridge: receive JWT via postMessage, connect to NEXUS
- [ ] Bidirectional cache: localStorage ↔ NEXUS (NEXUS is source of truth)
- [ ] Shape gallery fetches from NEXUS on connect, falls back to localStorage

### Phase 3: Full Integration
- [ ] Skin save/load as inventory items (texture upload + properties)
- [ ] Clothing save/load as inventory items
- [ ] Outfit composition (folder + links via NEXUS)
- [ ] Marketplace support (shapes/skins/clothing tradeable)

---

## 9. Resolved Questions (World Team Answers — April 15, 2026)

All questions resolved. Actions deployed in inventory module v1.1.0 (commit 3b7101a).

1. **Create action:** `upsert_bodypart` and `upsert_clothing` are live in production. Pass `itemId: null` to create, UUID to update. Follows `upsert_script` pattern.

2. **Texture upload subtypes:** No changes needed. Use `asset_type: 'texture'` for all skin/clothing textures. The `asset_subtype` (e.g., `skin_head`) is passed in the request body and stored — not validated server-side.

3. **Outfit folder creation:** Needs new actions (Phase 3, not blocking Phase 2). Will add: `create_folder` (folder_type='outfit'), `create_link` (inventory_link), `delete_link`. Straightforward additions to inventory_action.

4. **Inventory links CRUD:** Not yet exposed via socket events. Phase 3 work, same as Q3. The `inventory_links` table schema is ready (id, folder_id, target_item_id, link_name, created_at).

5. **Auth handoff:** OAuth UUID via postMessage — **no JWT needed**. Avatar connects Socket.IO, emits `user_register` with `{ username: userId }`. Session created, all events authenticated. `user_register` already supports multiple simultaneous connections from same userId.

---

## 10. Compatibility Notes

### OpenSim/SL Interop
- Shape param IDs map to SL's `avatar_lad.xml` param numbers
- The `sl_params` field in the shape schema enables round-trip import/export
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

*This document is the contract between Avatar and World/NEXUS teams. Changes to the JSONB schemas or socket event signatures should be coordinated. The Avatar team will maintain this spec as implementation progresses.*
