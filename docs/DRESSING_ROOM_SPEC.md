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

#### Skin Layers (Texture Compositing)

The skin is not a single texture — it's a **compositing stack**. Multiple translucent layers blend together at runtime to produce the final skin appearance. This is the same technique VRoid uses internally for socks and underwear (painted onto body skin rather than separate geometry), extended to support creative expression.

**The Skin Layer Stack:**

```
┌─────────────────────────────────────────┐
│  Layer 5: Temporary Effects (top)       │  mud, paint splatter, zombie rot
│  Layer 4: Tattoos                       │  persistent body art, multiple allowed
│  Layer 3: Makeup / Face Paint           │  lipstick, eyeshadow, face paint
│  Layer 2: Nail Polish                   │  hand/foot UV region tint
│  Layer 1: Clothing Paint                │  socks, underwear (texture-only items)
│  Layer 0: Base Skin (bottom)            │  Body_00_SKIN / Face_00_SKIN
└─────────────────────────────────────────┘
         ↓ composited at runtime ↓
    Final DynamicTexture → GPU upload
```

Each layer is an RGBA image (or procedural tint) alpha-blended onto the one below. The base skin is always opaque; all layers above use alpha to show through.

**Implementation (Babylon.js):**

```
// Conceptual — actual API in implementation phase
const skinCompositor = new SkinCompositor(bodyMesh, faceMesh);
skinCompositor.setBaseSkin(skinTonePreset);         // Layer 0
skinCompositor.addClothingPaint('socks', sokTex);   // Layer 1
skinCompositor.setNailColor('#CC0033');              // Layer 2
skinCompositor.addMakeup('lips', lipTex, '#CC4455');  // Layer 3
skinCompositor.addTattoo('sleeve-left', tattooTex);   // Layer 4
skinCompositor.addTempEffect('mud-splash', mudTex);    // Layer 5
skinCompositor.compose();  // → DynamicTexture on GPU
```

**Performance:** Compositing happens on an OffscreenCanvas (2048×2048 for body, 1024×1024 for face). Only recomposites when a layer changes — not per-frame. Cost: ~2-5ms per recomposite.

**Layer Types:**

| Layer | Persistence | Stacking | UV Target | Examples |
|-------|------------|----------|-----------|---------|
| Base Skin | Permanent | 1 only | Body + Face | Skin tone presets, custom color |
| Clothing Paint | Per-outfit | 1 per sub-slot | Body regions | Socks, underwear, undershirts |
| Nail Polish | Per-outfit | 1 only | Hand/foot UV | Color tint on nail vertices |
| Makeup | Per-outfit | Multiple | Face UV | Lipstick, eyeshadow, blush, eyeliner |
| Tattoos | Persistent | Multiple (up to 8) | Body + Face | Arm sleeve, back piece, face tattoo |
| Temp Effects | Session-only | Multiple | Body + Face | Mud, paint, zombie skin, glow |

**Tattoo System:**
- Tattoos are **persistent** — saved in the character manifest, survive outfit changes
- Each tattoo: texture asset + UV placement + opacity + optional color tint
- Up to 8 simultaneous tattoos (performance limit on compositing layers)
- Tattoo catalog: pre-made designs (tribal, geometric, floral) + eventually user-uploaded
- UV-region aware: arm sleeve, chest, back, leg, face regions with proper projection

**Makeup System:**
- Applied to Face_00_SKIN texture region
- Pre-made styles (thumbnail grid selector): natural, dramatic, goth, fantasy
- Adjustable: lipstick color, eyeshadow color, intensity slider
- Saved per-outfit (different looks for different outfits)

**Temporary Effects (World Integration):**
- Applied by World events, not the dressing room
- Examples: fell in mud, paint balloon fight, zombie infection, magic glow
- Decay over time or removed by "wash" action
- Fun social interactions: paint/splash other players' avatars
- NOT saved to character manifest — session/event lifetime only

**Creative Skins (Full Override):**
- Special "zombie," "robot," "crystal," "shadow" skin replacements
- Replace the entire base skin texture with a themed alternative
- Still compositable: zombie skin + tattoos + mud = undead biker in a swamp fight

#### Body Attachments (Deferred to SuperMesh)
- Horns, tails, piercings, wings, antennae — mesh attachment system
- Requires attachment bone points not present in VRM skeleton
- SuperMesh (Phase 3) adds dedicated attachment bones

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

### 3.4 Catalog Size (Verified — Feb 2026)

Complete VRM collection exported and fingerprinted. Unique mesh count verified via MD5 hash of vertex position buffer data.

| Category | VRM Files | Unique Meshes | Mesh Type | Notes |
|----------|:---------:|:-------------:|-----------|-------|
| Tops | 38 | 72 | CLOTH geometry | Many VRMs contain multi-layer garment prims |
| Bottoms (Pants) | 49 | 31 | CLOTH geometry | Includes skirts; some share mesh across color variants |
| Dresses/Onepiece | 26 | 38 | CLOTH geometry | Full-body garments, overrides tops+bottoms |
| Shoes | 48 | 45 | CLOTH geometry | Wide variety — sandals to boots |
| Accessories | 25 | 11 | CLOTH geometry | 8 neck + 15 wrist + 2 belt |
| Socks | 25 | ~1 CLOTH, 25 textures | Texture-only | Painted on body skin, no separate geometry |
| Inner Tops | 7 | 0 CLOTH, 7 textures | Texture-only | Painted on body skin |
| Inner Bottoms | 2 | 0 CLOTH, 2 textures | Texture-only | Painted on body skin |
| Hair | 16 | 16 | Mesh swap | Each hair is unique geometry |
| **Total** | **236** | **197 meshes + ~34 textures** | | |

Key finding: **socks, undershirts, and underpants are texture-only** — VRoid composites them onto the body skin material rather than creating separate geometry. This is the same compositing technique we use for tattoos and makeup (see Section 2.2: Skin Layers).

Each unique mesh × color tinting = 3-8x effective variety. **Conservative catalog: 600-1,500 visually distinct items.**

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

### 5.1 Two Ways to Change Clothes

**Quick Swap (stays in World):**
```
World → Appearance tab → Outfits sub-tab → click thumbnail → done
```
No transition, no iframe. Avatar updates in-place. Everyone sees it.

**Full Dressing Room (private Glitch session):**
```
World → Appearance tab → Dressing Room sub-tab → "Enter Dressing Room"
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

Most daily use will be Quick Swap. The full Dressing Room is for building new outfits, body tweaking, and browsing the wardrobe.

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
  },
  "makeup": {
    "lips": { "style": "natural-02", "color": "#CC4455", "opacity": 0.8 },
    "eyeshadow": { "style": "smoky-01", "color": "#4A3B5C", "opacity": 0.6 },
    "blush": null,
    "eyeliner": null
  },
  "tattoos": [
    { "id": "sleeve-tribal-01", "region": "arm-left", "opacity": 0.9, "tint": null },
    { "id": "back-wings-02", "region": "back", "opacity": 0.7, "tint": "#1A1A2E" }
  ],
  "creativeSkin": null
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

Replace the current stub (`AppearancePanel.ts`) with a two-tab panel plus an avatar chooser button:

```
+------------------------------------------+
| [Outfits]  [Dressing Room]               |
+------------------------------------------+
|                                          |
|  (tab content — see below)               |
|                                          |
+------------------------------------------+
| [Choose Avatar...]                       |
+------------------------------------------+
```

#### Tab: Outfits (Default — Quick Swap)

A thumbnail gallery of saved outfits **rendered directly in the shelf panel**. This is the fast path — you never leave the World.

- 2-column thumbnail grid of all saved outfits
- Click a thumbnail → avatar swaps **in-place** in the World scene
- Other players see the change immediately (broadcast via WebSocket)
- Currently worn outfit shows "(worn)" badge
- No privacy, no Glitch iframe, no transition — just a quick costume change
- Context menu on each outfit: "Wear", "Rename", "Delete"
- "Save Current Look" button at bottom → snapshots current avatar → adds to gallery

This mirrors the Phoenix Viewer outfit gallery: always accessible, one click to swap, minimal friction. The "I'm running late, need to change" flow.

#### Tab: Dressing Room (Full Experience)

A launch button + brief description:

- **"Enter Dressing Room"** button → launches the full Glitch-based private environment
- Below the button: mini-summary of what you'll find inside (outfit building, wardrobe browsing, body/vanity tweaking)
- When dressing room is active, tab shows "Currently in Dressing Room..." with a "Return to World" option
- The dressing room is the full three-pillar experience (Outfits + Body + Wardrobe) as described in Sections 2-6

Why a separate launch? Privacy. In the dressing room you can strip nude, try on underwear, experiment freely. The quick swap tab just does atomic outfit changes — no nudity, no experimentation.

#### Bottom: Choose Avatar

- Not a tab — a standalone button at the bottom of the panel
- Opens a modal overlay with prebuilt avatar selection (like SL's avatar chooser)
- Separate concern from outfit management — this changes your entire base model

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

### 9.1 Input (Complete Collection)
- 38 top VRMs (`avatar-preserved/assets/vRoidModels/clothing/tops/`)
- 49 pant/skirt VRMs (`avatar-preserved/assets/vRoidModels/clothing/pants/`)
- 26 dress VRMs (`avatar-preserved/assets/vRoidModels/clothing/dresses/`)
- 48 shoe VRMs (`avatar-preserved/assets/vRoidModels/clothing/shoes/`)
- 25 sock VRMs (`avatar-preserved/assets/vRoidModels/clothing/socks/`)
- 25 accessory VRMs (`avatar-preserved/assets/vRoidModels/clothing/accessories/`)
- 7 inner top VRMs (`avatar-preserved/assets/vRoidModels/clothing/inner_tops/`)
- 2 inner bottom VRMs (`avatar-preserved/assets/vRoidModels/clothing/inner_bottoms/`)
- 16 hair VRMs (`avatar-preserved/assets/vRoidModels/hair/`)
- 6 base VRMs (`avatar-preserved/assets/vRoidModels/bases/`)

### 9.2 Process

**For CLOTH geometry items** (tops, bottoms, dresses, shoes, accessories):
1. Load VRM with GLB loader
2. Identify CLOTH primitives by material name pattern
3. Extract each CLOTH primitive as standalone GLB (mesh + material + skeleton bindings)
4. Render 256×256 thumbnail (front view, on neutral mannequin)
5. Record metadata (vert count, material name, slot, tags)

**For texture-only items** (socks, inner tops, inner bottoms):
1. Load VRM, extract Body_00_SKIN texture
2. Diff against nude base texture to isolate the garment paint region
3. Save garment texture as alpha-masked PNG (compositing layer)
4. Render thumbnail showing the garment on body
5. Record metadata — these are compositing layers, not mesh swaps

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
2. ~~**Actual unique mesh count**~~ — **RESOLVED**: 197 unique CLOTH meshes + ~34 texture-only garments. See Section 3.4.
3. **Extraction format** — GLB (most portable) vs mini-VRM (preserves MToon metadata)?
4. **Thumbnail generation** — Transparent background, solid color, or gradient? Front view only or 3/4 angle?
5. **Starter wardrobe** — How many items does a new player get for free? All? A subset? Unlock more via quests/marketplace?
6. **Avatar persistence** — **PARTIALLY RESOLVED**: Dual persistence (manifest JSON + baked GLB). See CHARACTER_MANIFEST_SPEC.md.
7. **Marvelous Designer compatibility** — Can VRoid body mesh serve as MD avatar for custom clothing creation? Body OBJ extracted for testing. Pipeline: MD → FBX → Blender (rig to J_Bip) → GLB → system. See CHARACTER_MANIFEST_SPEC.md §9.
8. **Tattoo/compositing asset format** — What resolution for tattoo textures? How to handle UV seams across body/face boundary? Pre-positioned tattoo regions vs free placement?
9. **Temporary effects authority** — Who authorizes temp effects (mud, paint) on another player's avatar? Consent model needed for "splash" interactions.

---

*This specification defines the VRM Dressing Room for poqpoq World Phase 1. SuperMesh (Phase 3) will add full parametric body/face editing, but the outfit system, UI patterns, and infrastructure built here carry forward unchanged.*
