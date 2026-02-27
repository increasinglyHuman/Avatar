# The Dressing Room — VRM Avatar Customization Specification

**Version:** 1.0
**Date:** 2026-02-26
**Status:** Draft
**Phase:** 1 (VRM Pipeline)

---

## 1. Vision

The Dressing Room is a **private 3D space** where poqpoq World players customize their avatar's appearance. It's an outfit gallery + vanity mirror — not a slider-heavy appearance editor. Players should feel comfortable stripping down, trying on clothes, adjusting makeup, and experimenting with looks in complete privacy.

### Design Principles

1. **Outfits first** — The primary interaction is browsing and swapping saved looks, not tweaking individual sliders
2. **Visual selectors over numbers** — Thumbnail grids and named swatches, not 0-100 ranges
3. **Simple over complex** — Present what matters, hide what doesn't. No feature creep
4. **Private and comfortable** — Nobody in the World can see you while you're in the Dressing Room
5. **One-click satisfaction** — Save a look, load a look, done

### Reference Design Language

| Source | What We Borrow |
|--------|---------------|
| Phoenix/Firestorm Outfit Gallery | Thumbnail grid of saved outfits, one-click swap, Replace/Add/Remove |
| Cyberpunk 2077 | Face presets as thumbnail strip, discrete selectors (Eyes 12, Nose 05), color swatches |
| Monster Hunter: World | Category sidebar + thumbnail grid selectors, clean left nav |
| Code Vein | Named skin tone swatches, Save/Load Appearance workflow |
| TERA | Descriptive slider endpoints (lower/higher, min/max) for the few sliders we have |
| Age of Wonders | Simple < > arrow selectors + Randomize button |
| SL Makeup HUDs | Lipstick style grid, nail color palette, tabbed body regions |

---

## 2. Three Pillars

The Dressing Room is organized around three distinct interaction modes:

### 2.1 Outfits (Primary — Default Tab)

**"What am I wearing?"**

This is the star feature. An outfit is a saved snapshot of everything equipped on your avatar — clothing, hair, colors, proportions. Outfits are stored as inventory folders and displayed as a thumbnail gallery.

**Core Operations:**
| Operation | Trigger | Effect |
|-----------|---------|--------|
| Browse outfits | Open Outfits tab | See thumbnail gallery of all saved looks |
| Wear outfit | Click thumbnail | Atomic swap — replace everything currently worn |
| Add to current | Context menu → "Add to Current" | Wear items from this outfit on top of current |
| Remove from current | Context menu → "Remove" | Strip items from this outfit off current |
| Save current look | "Save" button | Snapshot + name → new entry in gallery |
| Delete outfit | Context menu → "Delete" | Remove from gallery (items return to wardrobe) |
| Rename outfit | Context menu → "Rename" | Edit the display name |

**Gallery UI:**
- 2-3 column thumbnail grid (responsive to panel width)
- Each thumbnail: auto-captured snapshot of avatar wearing that outfit
- Currently worn outfit shows "(worn)" badge
- Sort: Recent / Alphabetical / Favorites
- Search bar (filters by name)

**What an outfit saves:**
- All equipped slot items (tops, bottoms, shoes, etc.)
- All color customizations (hair, skin, eyes, lips, clothing tints)
- Proportion adjustments (height, shoulders, etc.)
- Hair style selection

### 2.2 Body / Vanity

**"What do I look like underneath?"**

The things that stay when you strip naked. Done once, tweaked occasionally. Organized into focused sections, not a wall of sliders.

**Sections:**

#### Proportions
Adjusts the avatar's bone structure within a ±30% safe range.

| Property | Bones | UI Control | Default |
|----------|-------|-----------|---------|
| Height | J_Bip_C_Hips (Y translation) | < slider > | 1.0 |
| Shoulder Width | J_Bip_L/R_UpperArm (X) | < slider > | 1.0 |
| Arm Length | J_Bip_L/R_LowerArm (Y) | < slider > | 1.0 |
| Leg Length | J_Bip_L/R_LowerLeg (Y) | < slider > | 1.0 |
| Neck Length | J_Bip_C_Neck (Y) | < slider > | 1.0 |
| Head Scale | J_Bip_C_Head (uniform) | < slider > | 1.0 |

Sliders use descriptive endpoints: "Shorter ← → Taller", "Narrower ← → Broader"

#### Skin
Named preset swatches (Code Vein style) plus a custom color picker:

| Preset | Base Color | Shade Color |
|--------|-----------|-------------|
| Porcelain | #FCE4D8 | #CAB6AD |
| Light Cool | #F0D0C0 | #C0A898 |
| Light Warm | #F5D0B0 | #C4A68C |
| Medium | #D4A574 | #A8845D |
| Medium Olive | #C49A6C | #9D7B56 |
| Tan | #B07848 | #8C603A |
| Dark | #8B5E3C | #6F4B30 |
| Deep | #6B4226 | #56351E |

Click a swatch → instant preview on avatar body + face. Custom picker for exact matching.

#### Face Details
| Control | Target Material | UI |
|---------|----------------|-----|
| Eye color | EyeIris_00_EYE | Color picker with preset swatches (brown, blue, green, hazel, grey, violet) |
| Eye highlight | EyeHighlight_00_EYE | Thumbnail grid (4-6 highlight styles) |
| Lip color | FaceMouth region | Color picker with presets (natural, red, pink, berry, nude, bold) |
| Eyebrow style | FaceBrow_00_FACE | Thumbnail grid + color tint |
| Eyelash style | FaceEyelash (when present) | Thumbnail grid (if multiple available) |

#### Nails
Color swatches for fingernail tinting (reference: SL nails HUD):
- Natural, Red, Pink, Coral, Berry, Plum, Nude, Black, White, French tip
- Custom color picker for exact match

#### Future: Tattoos, Makeup, Piercings
- **Tattoos**: Texture compositing overlay on Body_00_SKIN (not implemented Phase 1)
- **Makeup**: UV-aware face painting on Face_00_SKIN (not implemented Phase 1)
- **Body attachments**: Horns, tails, piercings, wings (mesh attachment system — deferred to SuperMesh)

### 2.3 Wardrobe (Clothing Inventory)

**"What do I own?"**

Browse and equip individual clothing items from your inventory. Items come from: default starter pack, marketplace purchases, quest rewards, gifts from other players, or self-created items.

**Category Sub-Tabs:**

| Tab | Slot | Description |
|-----|------|-------------|
| Tops | `tops` | Shirts, jackets, vests, blouses |
| Bottoms | `bottoms` | Pants, shorts, skirts |
| Dresses | `onepiece` | Full-body garments (auto-unequips top+bottom when worn) |
| Shoes | `shoes` | All footwear |
| Underwear | `undershirt` + `underpants` | Bras, undershirts, underwear |
| Socks | `socks` | All lengths (ankle, crew, knee-high, thigh-high) |
| Accessories | `accessory_neck` + `accessory_arm` | Necklaces, ties, bowties, gloves, bracelets, watches |
| Hair | (mesh swap) | Hair style selector — uni-gender, works on any base |

**Per-Tab UI:**
- Thumbnail grid of all owned items in that category
- Click → equip on avatar (real-time preview)
- Click again or click empty → unequip
- Color tint button per equipped item (opens color picker to recolor)
- "(worn)" indicator on currently equipped item

---

## 3. VRM Clothing Slot System

### 3.1 Layer Order

Clothing layers stack in a fixed order. Higher layers render on top of lower layers. The onepiece slot is special — it overrides both tops and bottoms when worn.

```
Layer 9: accessory_arm    (gloves, bracelets, watches)
Layer 8: accessory_neck   (necklaces, ties, bowties, scarves)
Layer 7: shoes            (all footwear)
Layer 6: onepiece         (dresses, robes — OVERRIDES layers 4+5)
Layer 5: tops             (shirts, jackets, vests)
Layer 4: bottoms          (pants, shorts, skirts)
Layer 3: socks            (ankle to thigh-high)
Layer 2: undershirt       (bras, undershirts, tank tops)
Layer 1: underpants       (underwear, boxer briefs)
Layer 0: body             (Body_00_SKIN — always present, never removed)
```

### 3.2 Slot Rules

| Slot | Max Equipped | Override Behavior |
|------|-------------|-------------------|
| `underpants` | 1 | — |
| `undershirt` | 1 | — |
| `socks` | 1 | — |
| `bottoms` | 1 | Auto-unequipped when `onepiece` is worn |
| `tops` | 1 | Auto-unequipped when `onepiece` is worn |
| `onepiece` | 1 | Auto-unequips `tops` + `bottoms` |
| `shoes` | 1 | — |
| `accessory_neck` | 2 | Stackable (e.g., necklace + tie) |
| `accessory_arm` | 2 | Stackable (e.g., gloves + bracelet) |
| `hair` | 1 | Mesh swap (replaces Hair001 mesh entirely) |

### 3.3 VRoid Material Naming → Slot Mapping

Items are identified by their VRM material name pattern:

| Material Pattern | Slot |
|-----------------|------|
| `*_Tops_*_CLOTH` | `tops` |
| `*_Bottoms_*_CLOTH` | `bottoms` |
| `*_Shoes_*_CLOTH` | `shoes` |
| `*_Onepiece_*_CLOTH` | `onepiece` |
| `*_Socks_*_CLOTH` | `socks` |
| `*_InnerTop_*_CLOTH` | `undershirt` |
| `*_InnerBottom_*_CLOTH` | `underpants` |
| `*_Accessory_Tie_*_CLOTH` | `accessory_neck` |
| `*_Accessory_Glove_*_CLOTH` | `accessory_arm` |
| `*_HAIR` (in Hair001 mesh) | `hair` |

### 3.4 Catalog Size Estimates

These are VRoid Studio's built-in style counts. Actual unique mesh count per category is lower (many styles share geometry with different textures):

| Category | VRoid Styles | Est. Unique Meshes | Exported So Far |
|----------|-------------|-------------------|-----------------|
| Tops (Shirts) | ~30 | ~10 | 38 VRMs |
| Bottoms (Pants) | ~45 | ~6 | 5 VRMs |
| Dresses/Robes | ~33 | ~14 | 2 (mixed in tops) |
| Inner Tops | ~7 | ~3 | 0 |
| Inner Bottoms | ~2 | ~2 | 0 |
| Socks | ~14 | ~4 (length variants) | 0 |
| Shoes | ~60 | ~15 | 0 |
| Neck Accessories | ~16 | ~8 | 0 |
| Arm Accessories | ~16 | ~6 | 0 |
| Hair Styles | 16+ | 16 | 16 VRMs |
| **Total** | **~239** | **~84** | **61** |

Each base mesh × color tinting = 5-8x variety. Conservative catalog: **400-700 distinct items**.

---

## 4. Body Modification Matrix

### 4.1 What We CAN Change at Runtime

#### Tier 1: Material Color/Texture (High Confidence)

| Modification | VRM Target | Method | UI Control |
|-------------|-----------|--------|-----------|
| Skin tone | Body_00_SKIN + Face_00_SKIN | `setSkinTone()` — linked base + shade colors | Named swatches + picker |
| Eye iris color | EyeIris_00_EYE | `setEyeColor()` — material tint | Color picker + presets |
| Eye highlight | EyeHighlight_00_EYE | `swapTexture()` — replace texture | Thumbnail grid |
| Hair color | All *_HAIR materials | `setHairColor()` — material tint | Color picker |
| Lip color | FaceMouth region | `setLipColor()` — material tint | Color picker + presets |
| Eyebrow color | FaceBrow_00_FACE | `setEyebrowColor()` — tint + texture swap | Grid + picker |
| Clothing recolor | Any *_CLOTH material | `setClothingColor()` — per-garment tint | Color picker per item |
| Nail color | Hand UV region | Texture tint on hand vertices | Color swatches |

#### Tier 2: Bone Proportions (Medium Confidence, ±30% Range)

| Modification | Bones | Range | UI |
|-------------|-------|-------|-----|
| Height | J_Bip_C_Hips Y | 0.7 – 1.3 | "Shorter ← → Taller" slider |
| Shoulder width | J_Bip_L/R_UpperArm X | 0.7 – 1.3 | "Narrower ← → Broader" slider |
| Arm length | J_Bip_L/R_LowerArm Y | 0.7 – 1.3 | "Shorter ← → Longer" slider |
| Leg length | J_Bip_L/R_LowerLeg Y | 0.7 – 1.3 | "Shorter ← → Longer" slider |
| Neck length | J_Bip_C_Neck Y | 0.7 – 1.3 | "Shorter ← → Longer" slider |
| Head scale | J_Bip_C_Head uniform | 0.8 – 1.2 | "Smaller ← → Larger" slider |

Note: These adjust bone translations, not morphs. Moderate changes look acceptable; extreme changes (>±30%) cause mesh distortion.

#### Tier 3: Mesh Operations (Implemented in Reference Code)

| Operation | Status | Notes |
|-----------|--------|-------|
| Hair swap | Complete | Replace Hair001 mesh from donor VRM |
| Clothing equip | Complete | Clone CLOTH primitive, rebind to skeleton via J_Bip name matching |
| Clothing remove | Complete | Remove CLOTH primitive from Body mesh |
| Clothing toggle | Complete | Show/hide individual CLOTH primitives |

### 4.2 What We CANNOT Change on VRM

| Limitation | Why | Future Solution |
|-----------|-----|-----------------|
| Body shape (fat, muscle, bust, waist) | VRoid exports 0 body morph targets | SuperMesh (Phase 3): 15 body blend shapes |
| Face structure (jaw, cheekbones, nose) | 57 expression morphs only, no structural | SuperMesh: 16+ structural face morphs |
| Extreme proportions (>±30%) | Bone translation distorts skinned mesh | SuperMesh: proper morph-based scaling |
| Clothing fit across body types | Clothing rigged to specific body | Body reconstruction pipeline (Tier 3.5) |

### 4.3 Expression System (Face Morphs)

VRM provides 57 face morph targets for runtime expressions (NOT for shape editing):

| Category | Count | Purpose |
|----------|-------|---------|
| Full-face emotions | 6 | Joy, Angry, Sorrow, Fun, Surprised, Neutral |
| Eyebrow control | 5 | Raise, lower, angry, sad |
| Eye states | 12 | Blink, close L/R, spread, highlight toggle |
| Mouth visemes | 16 | A, I, U, E, O + expression variants |
| Teeth/fangs | 9 | Grin, frown, smile variants |

Used for: lip sync, emotes, idle blink animation. NOT used for structural face customization.

---

## 5. The Private Dressing Room Environment

### 5.1 Entry Flow

```
World (3D scene) → Left shelf → Appearance tab → "Enter Dressing Room"
        │
        ▼
World pauses player visibility (other players see you vanish)
        │
        ▼
Dressing Room launches (Glitch-based Babylon.js environment)
  - iframe overlay OR full-screen transition
  - Avatar loaded with current equipped state
  - Orbit camera focused on avatar
  - UI sidebar with three tabs (Outfits / Body / Wardrobe)
        │
        ▼
Player customizes freely (nude, try on, experiment)
        │
        ▼
"Return to World" → sends appearance_update via PostMessageBridge
        │
        ▼
World receives update → applies to player avatar → broadcasts to zone
```

### 5.2 3D Environment

Built on Glitch architecture (Babylon.js, TypeScript, WebGPU-first):

- **Camera**: OrbitCamera (ArcRotateCamera) — click-drag to rotate around avatar, scroll to zoom
  - Auto-focus on relevant body region when switching Body tab sections
  - Optional slow auto-rotate (turntable) when idle
  - Zoom limits: 1.5m (close-up face) to 5m (full body)
- **Lighting**: Hemisphere fill (cool blue-grey) + directional sun (warm white) — same as Glitch
- **Background**: Clean gradient or simple neutral room (not the grid floor from Glitch)
- **Avatar**: Loaded VRM, default idle pose, idle blink animation
- **Floor**: Subtle reflective surface or shadow catcher

### 5.3 UI Overlay

DOM-based sidebar (same pattern as Glitch HUD — no Babylon GUI dependency):

```
+------------------+--------------------------------+
|                  |                                |
| [Outfits] [Body] |                                |
| [Wardrobe]       |        3D VIEWPORT             |
|                  |                                |
| +--------------+ |     Avatar standing in          |
| |              | |     neutral room, orbit         |
| | Tab content  | |     camera around them          |
| | (scrollable) | |                                |
| |              | |                                |
| |              | |                                |
| |              | |                                |
| |              | |                                |
| +--------------+ |                                |
|                  |                                |
| [Save Look]     |                   [Return to   |
| [Undo]          |                    World]       |
+------------------+--------------------------------+
```

Sidebar: ~320px wide, dark semi-transparent background, scrollable content area.
Tabs at top. Action buttons at bottom.

---

## 6. Outfit Data Format

### 6.1 Outfit Preset (JSON)

```json
{
  "version": 1,
  "name": "Cyberpunk Street",
  "thumbnail": "outfits/cyberpunk-street-thumb.jpg",
  "createdAt": "2026-02-26T12:00:00Z",
  "updatedAt": "2026-02-26T12:00:00Z",
  "tags": ["modern", "urban"],
  "base": "nude-feminine",
  "equipped": {
    "hair": "hf-14",
    "tops": "top-23",
    "bottoms": "pant-02",
    "onepiece": null,
    "shoes": null,
    "socks": null,
    "undershirt": null,
    "underpants": null,
    "accessory_neck": null,
    "accessory_arm": null
  },
  "colors": {
    "hair": "#1A0A2E",
    "skin": { "base": "#D4A574", "shade": "#A8845D" },
    "eyes": "#7B3F00",
    "lips": "#CC4455",
    "eyebrows": "#2C1810",
    "nails": "#CC0033",
    "clothing": {
      "tops": "#FF1493",
      "bottoms": "#1C1C1C"
    }
  },
  "proportions": {
    "height": 1.0,
    "shoulderWidth": 1.0,
    "armLength": 1.0,
    "legLength": 1.0,
    "neckLength": 1.0,
    "headScale": 1.0
  }
}
```

### 6.2 Avatar Config (Database — users.avatar_config)

The current outfit — the "COF" (Current Outfit Folder) equivalent. Same format as outfit preset but without name/thumbnail/tags. Persisted to `users.avatar_config` JSONB column. Loaded on login, broadcast to other players.

### 6.3 Item Catalog Entry (items.json)

```json
{
  "id": "top-23",
  "type": "clothing",
  "slot": "tops",
  "name": "Cropped Denim Jacket",
  "thumbnail": "thumbnails/top-23.jpg",
  "asset": "clothing/tops/top-23.glb",
  "gender": "feminine",
  "tags": ["casual", "denim", "cropped"],
  "metadata": {
    "vertCount": 1250,
    "materialName": "N01_023_01_Tops_01_CLOTH",
    "vroidStyleId": 23
  }
}
```

---

## 7. Integration with poqpoq World

### 7.1 Appearance Panel (World Shelf)

Replace the current stub (`AppearancePanel.ts`) with three entry points:

| Button | Action | Scope |
|--------|--------|-------|
| "Enter Dressing Room" | Launch Glitch iframe with full customization UI | Full experience |
| "Quick Outfit Swap" | Inline outfit gallery in the shelf panel itself | Fast outfit change without leaving World |
| "Choose Avatar" | Modal for selecting a different base VRM | Sidecar — separate from dress-up |

### 7.2 PostMessage Protocol (Dressing Room ↔ World)

| Message | Direction | Payload | Purpose |
|---------|-----------|---------|---------|
| `dressing_room_spawn` | World → DR | `{ avatarConfig, inventory }` | Initialize with current state |
| `dressing_room_ready` | DR → World | `{}` | Environment loaded, ready |
| `appearance_update` | DR → World | `{ avatarConfig }` | Apply changes to World avatar |
| `outfit_save` | DR → World | `{ outfit }` | Save outfit to inventory |
| `outfit_delete` | DR → World | `{ outfitId }` | Delete outfit from inventory |
| `inventory_request` | DR → World | `{ slot, filter }` | Request items for a category |
| `inventory_response` | World → DR | `{ items[] }` | Returned item list |
| `dressing_room_close` | DR → World | `{ avatarConfig }` | Exit + final state |
| `snapshot_request` | DR → World | `{ imageData }` | Save outfit thumbnail |

### 7.3 Database Integration

Uses existing World tables:

| Table | Usage |
|-------|-------|
| `users.avatar_config` | Current outfit JSON (JSONB column, add if not exists) |
| `inventory_items` | Individual clothing items (`asset_type='clothing'`, `asset_subtype` per slot) |
| `inventory_folders` | Outfit folders (`folder_type='outfit'`) |
| `user_characters` | Saved base avatar configurations |

### 7.4 File Serving

**Phase 1 (static):**
```
/var/www/avatar/assets/
├── catalog/items.json
├── clothing/tops/top-01.glb ... top-38.glb
├── clothing/bottoms/pant-01.glb ... pant-05.glb
├── hair/hf-02.glb ... hf-17.glb
├── bases/nude-feminine.glb, nude-masculine.glb
└── thumbnails/top-01.jpg ... (all items)
```

**Phase 2 (S3 + CDN):**
```
s3://poqpoq-avatars/ → CloudFront CDN
├── catalog/items.json
├── items/{itemId}.glb
├── thumbnails/{itemId}.jpg
└── user-outfits/{userId}/{outfitId}.json
```

---

## 8. Technology Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| 3D Runtime | Babylon.js 8.x (WebGPU-first, WebGL2 fallback) | Same as Glitch |
| Language | TypeScript (strict) | Same as Glitch |
| Build | Vite | Same as Glitch |
| UI Overlay | DOM-based (no React, no Babylon GUI) | CSS + vanilla TS, same as Glitch HUD |
| VRM Loading | @babylonjs/loaders (GLB) | VRM = GLB with extensions |
| Communication | PostMessageBridge (iframe ↔ parent) | Existing Glitch pattern |
| State | Vanilla TS classes (no Zustand, no Redux) | Keep it simple |

---

## 9. Pre-Work: Asset Extraction Pipeline

Before the Dressing Room can function, raw VRM exports must be processed into individual GLB pieces:

### 9.1 Input
- 38 top VRMs (`avatar-preserved/assets/vRoidModels/clothing/tops/`)
- 5 pant VRMs (`avatar-preserved/assets/vRoidModels/clothing/pants/`)
- 16 hair VRMs (`avatar-preserved/assets/vRoidModels/hair/`)
- 2+ nude bases (`avatar-preserved/assets/vRoidModels/bases/`)

### 9.2 Process
For each clothing VRM:
1. Load with VRM/GLB loader
2. Identify CLOTH primitives by material name pattern
3. Extract each CLOTH primitive as standalone GLB (mesh + material + skeleton bindings)
4. Render 256×256 thumbnail (front view, on neutral mannequin)
5. Record metadata (vert count, material name, slot, tags)

### 9.3 Output
- Individual `.glb` files per clothing piece
- Individual `.jpg` thumbnails per piece
- `items.json` catalog manifest
- Deployed to `/var/www/avatar/assets/`

### 9.4 Tooling
Port `vrmClothingManager.js` extraction logic to a Node.js script using Babylon.js headless rendering (or use Three.js for extraction only, Babylon.js for runtime).

---

## 10. Open Questions

1. **Cross-gender clothing** — Do feminine tops fit on masculine bases? (Same J_Bip skeleton but different body proportions — likely clips. May need separate masc/fem clothing catalogs.)
2. **Actual unique mesh count** — The 223 VRoid styles include texture-only variants. Need to deconstruct VRMs to get true mesh count per category.
3. **Extraction format** — GLB (most portable) vs mini-VRM (preserves MToon metadata)?
4. **Thumbnail generation** — Transparent background, solid color, or gradient? Front view only or 3/4 angle?
5. **Starter wardrobe** — How many items does a new player get for free? All? A subset? Unlock more via quests/marketplace?
6. **Avatar persistence** — Does the dressing room bake a single GLB and upload (simple, expensive), or does the World client assemble from parts at runtime (complex, efficient)?

---

*This specification defines the VRM Dressing Room for poqpoq World Phase 1. SuperMesh (Phase 3) will add full parametric body/face editing, but the outfit system, UI patterns, and infrastructure built here carry forward unchanged.*
