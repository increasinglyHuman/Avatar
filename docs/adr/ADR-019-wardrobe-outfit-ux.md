# ADR-019: Enhanced Wardrobe and Outfit UX -- Preview, Search, and Comparison

**Status:** Proposed
**Date:** 2026-04-15
**Authors:** Allen Partridge, Claude Code
**Relates to:** ADR-012 (Wardrobe/Clothing), ADR-013 (Outfits/Persistence), ADR-004 (Appearance Tab)
**Phase:** 4-5

---

## Context

The wardrobe catalog has grown to approximately 1,400+ texture clothing items across 9 slot types (533 shirts, 497 pants, 362 jackets, and more). At this scale, the current UI -- a flat 3-column grid of texture thumbnails filtered only by slot category -- breaks down in several ways:

1. **Discovery is painful.** Scrolling through 500+ shirts with tiny UV-map thumbnails gives users no sense of what the item looks like worn. UV map textures are meaningless to non-technical users -- a flattened shirt texture looks nothing like a shirt on a body.

2. **No search or filtering.** Every item currently carries only generic tags (`["shirt", "texture-layer", "cc0"]`). There is no text search, no style filtering, no sort order beyond catalog load order.

3. **No preview before commitment.** Clicking an item immediately equips it (triggering a texture compositor bake cycle). There is no way to browse speculatively. Users who want to compare three shirts must equip/unequip/re-equip repeatedly.

4. **Outfit gallery lacks organization.** The OutfitsTab shows saved outfits sorted by date with no search, no tags, no favorites. As users accumulate outfits, finding a specific look becomes scroll-heavy.

5. **No outfit comparison.** There is no way to see what changed between two outfits or quickly A/B between saved looks.

### Industry Precedents

- **Sims 4 CAS**: Hover preview instantly shows clothing on the 3D model; category filters plus style/color swatches; outfit slots with easy switching.
- **VRChat**: Favorites system, search by name, recently-used sorting.
- **Second Life Viewer**: Outfit folders with search, "wear" vs "add" distinction, outfit snapshot thumbnails.
- **IMVU**: Catalog grid with hover zoom, style tags, color filtering.

What the Sims 4 CAS gets right (and we should emulate): hover-to-preview is near-instantaneous because the clothing is texture-based -- no mesh loading required. Our texture clothing has the same property. A texture layer bake takes under 50ms. This is our primary advantage.

---

## Decision

### 1. Hover Preview System (Wardrobe Tab)

**Core interaction:** Hovering over a clothing card temporarily equips that item on the 3D avatar. Moving the mouse away reverts to the previously equipped state. Clicking confirms the selection.

**Implementation approach:**

```
User hovers card
  -> Save current slot state (snapshot equipped item ID)
  -> Call TextureCompositor.equipClothing() with hovered item
  -> Show "PREVIEW" badge on card + subtle pulse border
  -> 200ms debounce to prevent rapid-fire bakes during fast mouse movement

User leaves card (mouseout)
  -> Restore saved slot state
  -> If previous item was equipped, re-equip it
  -> If slot was empty, unequip

User clicks card
  -> Commit: clear saved state, item stays equipped
  -> Card transitions from "PREVIEW" to "EQUIPPED" indicator
```

**Camera zoom on hover (optional, phase 5):**

`DressingRoomCamera` already has `focusOnModel()` which computes bounding boxes. Add region-specific focus presets:

| Slot Category | Camera Target Y | Camera Radius | Shows |
|---------------|----------------|---------------|-------|
| Tops (shirt/jacket/undershirt) | 1.2 | 1.4 | Chest to waist |
| Bottoms (pants/skirt) | 0.6 | 1.6 | Waist to ankles |
| Shoes | 0.1 | 0.8 | Feet close-up |
| Hats/Hair | 1.5 | 0.9 | Head close-up |
| Full body (gloves/accessories) | 0.85 | 2.5 | Full figure |

Camera smoothly lerps to the region preset on hover (300ms ease-out), returns to the user's previous camera position on mouseout. This uses `ArcRotateCamera` animation via Babylon's built-in `camera.setTarget()` and radius property animation.

**Performance guard:** For texture items (the bulk of the catalog), the TextureCompositor already bakes in a single canvas draw pass -- this is fast enough for hover preview. For rigged/fitted mesh items (future GLB garments), hover preview should NOT attempt to load a GLB. Instead, show a static rendered-on-avatar thumbnail in a tooltip overlay. GLB loading is too slow (100-500ms) for hover preview.

**Wireframe -- Wardrobe card with hover state:**

```
+---------------------------+
| [Preview badge: "TRYING"] |
|                           |
|   [256x256 thumbnail]     |    <- Still shows UV texture in grid
|                           |    <- But avatar in viewport shows it WORN
|                           |
+---------------------------+
|  Gypsy Shirt              |
|  [equipped indicator dot] |
+---------------------------+
     ^                 ^
     |                 |
  Border pulses       Name row shows
  blue on hover       slot + equip state
```

### 2. Searchable Wardrobe

**Search bar** added above the category bar in WardrobeTab:

```
+------------------------------------------+
| [magnifying glass icon] Search clothing... |  <- Input field
+------------------------------------------+
| Tops  Bottoms  Skirts  Jackets  ...      |  <- Existing slot category bar
+------------------------------------------+
| [Sort: A-Z v]  [Color: All v]            |  <- New filter row
+------------------------------------------+
| [card] [card] [card]                     |
| [card] [card] [card]                     |  <- Filtered results
+------------------------------------------+
```

**Search logic** (all client-side, no server needed at current catalog scale):

- **Text search**: Fuzzy match against `item.name` and `item.tags[]`. Use simple substring matching first (no library dependency). Case-insensitive. Debounce input at 150ms.
- **Slot filter**: Existing category bar already does this. Enhance with "All" option to search across all slots.
- **Sort options**: Dropdown with: `A-Z`, `Z-A`, `Recently Equipped`, `Slot Default` (original catalog order).
- **Color filter**: Future enhancement -- requires enriched metadata (see section 5). For now, omit.

**Implementation in `WardrobeTab.ts`:**

Add a `private searchQuery: string = ''` field. Modify `renderGrid()` to filter items:

```typescript
private getFilteredItems(): ClothingItem[] {
  let items = this.activeSlot === 'all'
    ? this.catalog.getAll()
    : this.catalog.getBySlot(this.activeSlot);

  if (this.searchQuery) {
    const q = this.searchQuery.toLowerCase();
    items = items.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }

  return this.applySortOrder(items);
}
```

**Add "All" to slot categories:** Insert `{ key: 'all', label: 'All', icon: '' }` at position 0. This is a UI-only concept, not a new `ClothingSlot` type.

**Virtual scrolling consideration:** With 500+ items in a single slot, rendering all DOM cards at once will cause jank. Implement a simple intersection-observer-based lazy rendering: render only the first 30 cards, observe a sentinel element at the bottom, append 30 more when it enters the viewport.

### 3. Searchable Outfits

**Search and organization for the Outfits gallery:**

```
+------------------------------------------+
| [magnifying glass] Search outfits...      |
+------------------------------------------+
| [star icon] Favorites | All | Recent      |  <- Filter tabs
+------------------------------------------+
| [Save Current Look]                       |
+------------------------------------------+
| 3 saved outfits                           |
+------------------------------------------+
| [outfit card]  [outfit card]              |
| [outfit card]  [outfit card]              |
+------------------------------------------+
```

**New outfit metadata** -- extend `ManifestMetadata`:

```typescript
export interface ManifestMetadata {
  name: string;
  created: string;
  modified: string;
  thumbnail: string | null;
  tags: string[];          // NEW: user-assigned tags
  favorite: boolean;       // NEW: pinned to top
}
```

**Outfit search**: Simple substring match on `metadata.name` and `metadata.tags`.

**Favorite/pin**: Toggle star icon on outfit cards. Favorited outfits always appear first regardless of sort order.

**Filter tabs**: "Favorites" (only starred), "All" (everything), "Recent" (last 7 days modified).

**Tagging UI**: When saving an outfit, the save dialog gains an optional tags field below the name input. Comma-separated text input, converted to string array. Also allow adding/editing tags on existing outfits via a long-press or context menu on the card.

**Wireframe -- Enhanced outfit card:**

```
+---------------------------+
|                           |
|   [512x680 portrait]      |
|                           |
|              [star icon]  |  <- Favorite toggle (top-right overlay)
+---------------------------+
| Casual Friday      [x]   |  <- Name + delete button
| Apr 12, 3:42 PM          |  <- Date
| [casual] [blue]           |  <- Tag chips (if any)
+---------------------------+
```

### 4. Outfit Comparison

**A/B toggle approach** (simplest, most Sims-like):

Add a "Compare" mode toggle to the OutfitsTab. When active, clicking two outfit cards enters comparison mode:

```
+------------------------------------------+
| [Compare Mode: ON]                        |
+------------------------------------------+
| Outfit A: "Casual Friday"                 |
| Outfit B: "Night Out"                     |
|                                           |
| [< A]  [SWITCH]  [B >]                   |  <- Toggle buttons
|                                           |
| Changes:                                  |
|   Shirt: Gypsy Shirt -> Silk Blouse       |
|   Pants: (same)                           |
|   Shoes: Sneakers -> Heels                |
+------------------------------------------+
```

**Interaction flow:**

1. User taps "Compare" button (new button in outfit actions area).
2. First outfit card click sets "Outfit A" (highlighted with blue border).
3. Second outfit card click sets "Outfit B" (highlighted with orange border).
4. The 3D viewport shows Outfit A. Toggle buttons or keyboard shortcut (left/right arrow) swap between A and B instantly.
5. A "Changes" diff panel shows which slots differ between the two manifests.
6. Click "Exit Compare" or press Escape to return to normal mode.

**Diff computation** -- compare `manifest.equipped` records:

```typescript
function diffOutfits(a: AvatarManifest, b: AvatarManifest): SlotDiff[] {
  const diffs: SlotDiff[] = [];
  for (const slot of Object.keys(a.equipped) as ClothingSlot[]) {
    if (a.equipped[slot] !== b.equipped[slot]) {
      diffs.push({ slot, itemA: a.equipped[slot], itemB: b.equipped[slot] });
    }
  }
  // Also diff shape parameters, skin, colors if desired
  return diffs;
}
```

**Quick-swap shortcut**: Even outside Compare mode, add keyboard shortcut support. When the Outfits tab is active, number keys 1-9 could quick-load the corresponding outfit (by display order).

### 5. Enriched Clothing Item Metadata

The current `ClothingItem` interface has `tags: string[]` but every item carries the same generic tags. This metadata needs to become useful.

**Extended ClothingItem interface:**

```typescript
export interface ClothingItem {
  id: string;
  name: string;
  slot: ClothingSlot;
  type: ClothingType;
  asset: string;
  thumbnail: string;               // Existing: UV texture path
  previewThumbnail?: string;       // NEW: rendered-on-avatar preview (256x256)
  alphaRegions: AlphaRegion[];
  compatibleBases: ('ruth2' | 'roth2' | 'both')[];
  tags: string[];
  modifiable: boolean;

  // NEW metadata fields
  styleTags?: string[];            // ['casual', 'formal', 'fantasy', 'punk', etc.]
  colorTags?: string[];            // ['red', 'blue', 'black', 'multicolor', etc.]
  patternTags?: string[];          // ['solid', 'striped', 'plaid', 'floral', etc.]
  genderHint?: 'feminine' | 'masculine' | 'neutral';
  lastEquippedAt?: number;         // Timestamp, for "recently used" sort (client-side)
}
```

**Populating style/color/pattern tags:**

Two approaches:

1. **Manual pass**: Allen reviews items and adds tags to catalog.json. Most accurate but labor-intensive for 1,400 items.
2. **Automated heuristic**: Extend `scripts/curate_texture_catalog.py` to:
   - Extract dominant color from the texture image (PIL/Pillow average pixel analysis) and map to color tag.
   - Parse item name for style hints (e.g., "Gypsy" -> `bohemian`, "Priest" -> `formal`, "Punk" -> `punk`).
   - Default `genderHint` based on name keywords ("Girl", "Guy", "Men's", "Women's").
   
   This gets 60-70% accuracy for free. Allen can correct outliers.

**Rendered-on-avatar thumbnails (`previewThumbnail`):**

Generate these offline via a build script that:
1. Loads the avatar in a headless Babylon.js context (or uses the existing app with a batch mode).
2. Equips each item one at a time.
3. Captures a 256x256 screenshot of the relevant body region.
4. Saves to `public/assets/clothing/{slot}/{id}-preview.png`.

This is a significant pipeline task but transforms the browsing experience. Mark as Phase 5.

**Recently-used tracking:**

Store `lastEquippedAt` timestamps in localStorage (separate from the catalog JSON):

```
localStorage key: 'bbavatar_recently_equipped'
value: { "tex-shirt-gypsy": 1713100000000, ... }
```

### 6. Gender-Aware Filtering

Once the male wardrobe bug is fixed:

- Items with `compatibleBases: ['both']` appear for either gender.
- Items with `['ruth2']` appear only when the feminine base is active.
- Items with `['roth2']` appear only when the masculine base is active.
- The `genderHint` field provides a softer signal: items tagged `masculine` still appear for feminine avatars but sort lower.

`WardrobeTab` receives the current base mesh identifier from `Sidebar`'s gender state and passes it to the filter logic.

### 7. Touch/Mobile Considerations

No `mouseenter` event on touch devices. Fallback options:

- **Long-press to preview**: 500ms press-and-hold triggers preview mode, release reverts. Tap to equip.
- **Explicit "Preview" button**: Each card gets a small eye icon button. Tapping the icon previews; tapping the card equips.
- **Swipe gallery**: On mobile, the clothing grid could become a horizontal swipe carousel per category, with the currently-centered card auto-previewing.

---

## Wireframe: Complete Enhanced Wardrobe Tab

```
+============================================+
|  AVATAR                    [F icon] [M icon]|  <- Header with gender swap
+--------------------------------------------+
| Outfits | Shape | Skin | Wardrobe          |  <- Tab bar (existing)
+============================================+
|                                            |
| [magnifying glass] Search clothing...      |  <- NEW: search input
|                                            |
| [All] Tops Bottoms Skirts Jackets Under... |  <- Category bar (enhanced)
|                                            |
| Sort: [Recently Used v]    42 items        |  <- NEW: sort + count
|                                            |
| +--------+ +--------+ +--------+          |
| |TRYING  | |        | |        |          |
| |[thumb] | |[thumb] | |[thumb] |          |
| |        | |[equip  | |        |          |
| |        | |  dot]  | |        |          |
| +--------+ +--------+ +--------+          |
| |Gypsy   | |Silk    | |Polo   |          |
| |Shirt   | |Blouse  | |Shirt  |          |
| +--------+ +--------+ +--------+          |
|                                            |
| ... (lazy-loaded as user scrolls) ...      |
|                                            |
+--------------------------------------------+
| [Unequip Slot]    [Unequip All]            |
+============================================+
```

## Wireframe: Complete Enhanced Outfits Tab

```
+============================================+
| Outfits | Shape | Skin | Wardrobe          |
+============================================+
|                                            |
| [magnifying glass] Search outfits...       |  <- NEW
|                                            |
| [star Favorites]  [All]  [Recent]          |  <- NEW: filter tabs
|                                            |
| [Save Current Look]   [Compare]            |  <- NEW: compare button
|                                            |
| 5 saved outfits                            |
|                                            |
| +-----------+ +-----------+               |
| |           | |           |               |
| |  [portrait| |  [portrait|               |
| |   512x680]| |   512x680]|               |
| |       [*] | |       [ ] |               |  <- Star = favorited
| +-----------+ +-----------+               |
| |Casual Fri | |Night Out  |               |
| |Apr 12 3pm | |Apr 10 8pm |               |
| |[casual]   | |[formal]   |               |  <- Tag chips
| +-----------+ +-----------+               |
|                                            |
+============================================+
```

---

## Implementation Phases

### Phase 4a: Search and Filter (immediate, no new dependencies)
1. Add search input to `WardrobeTab` -- text field, debounced substring filter.
2. Add "All" option to slot category bar.
3. Add sort dropdown (A-Z, Z-A, catalog default).
4. Add lazy rendering (intersection observer) to handle 500+ item slots.
5. Add search input to `OutfitsTab`.
6. Add favorite toggle to outfit cards and `ManifestMetadata`.
7. Add filter tabs (Favorites / All / Recent) to OutfitsTab.

### Phase 4b: Hover Preview (requires careful state management)
1. Add `mouseenter`/`mouseleave` handlers to wardrobe cards.
2. Implement snapshot/restore of current slot state in `WardrobeTab`.
3. Add debounce (200ms) to prevent rapid-fire compositor bakes.
4. Add visual "TRYING" / "PREVIEW" badge CSS.
5. Track `lastEquippedAt` in localStorage for recently-used sort.

### Phase 5a: Outfit Comparison
1. Add Compare mode toggle to `OutfitsTab`.
2. Implement A/B outfit selection UI.
3. Implement manifest diff computation and display.
4. Add keyboard shortcut (arrow keys) for A/B toggle.

### Phase 5b: Enriched Metadata and Rendered Previews
1. Extend `curate_texture_catalog.py` with automated color/style extraction.
2. Add `styleTags`, `colorTags`, `genderHint` to catalog schema.
3. Add color/style filter dropdowns to WardrobeTab.
4. Build offline preview-thumbnail generation pipeline.
5. Camera region-zoom on hover.

---

## Consequences

- **Search makes 1,400 items manageable** -- without it, the wardrobe is unusable at scale. This is the highest-priority improvement.
- **Hover preview is the signature UX win** -- it transforms browsing from "guess and click" to "try before you buy." Texture clothing bakes fast enough to make this feel instant.
- **No new dependencies** -- all search, filter, and sort logic is vanilla TypeScript operating on the in-memory catalog array.
- **Lazy rendering prevents DOM bloat** -- intersection observer pattern keeps the DOM lean even with 500+ items per slot.
- **Metadata enrichment is a pipeline investment** -- automated tagging gets us 60-70% of the way; manual curation fills the rest.
- **Outfit comparison is lower priority but high delight** -- it is a "wow" feature that differentiates from competitors.
- **localStorage for recently-used and favorites is fine for now** -- NEXUS sync will eventually replicate this server-side.
- **Gender filtering resolves the known male-avatar bug** at the UX level -- items incompatible with the active base mesh simply do not appear.

## Risks

- **Hover preview on mobile/touch**: No `mouseenter` event on touch devices. Fallback: long-press to preview, tap to equip.
- **TextureCompositor bake cost during rapid hovering**: The 200ms debounce should prevent thrashing, but if bake times exceed 100ms on low-end devices, consider showing the UV thumbnail in a tooltip instead.
- **Automated metadata tagging accuracy**: Heuristic tagging will produce errors. Need a simple override mechanism in the curation pipeline.
- **localStorage quota**: With 50+ outfits each containing a 512x680 base64 thumbnail, localStorage (typically 5-10MB) could fill up. Consider compressing thumbnails to 256x340 JPEG at quality 0.6, or storing thumbnails as blob URLs with IndexedDB.

## Verification

- [ ] Search input filters wardrobe items by name substring, updates grid in real-time
- [ ] "All" category shows items across all slots, filterable by search
- [ ] Sort dropdown changes item order (A-Z, Z-A, recently used)
- [ ] Lazy rendering keeps DOM under 50 nodes when scrolling through 500+ items
- [ ] Hover preview temporarily equips item on avatar, reverts on mouseout
- [ ] Click during hover commits the item (equips permanently)
- [ ] 200ms debounce prevents compositor thrashing during fast mouse movement
- [ ] Outfit search filters by name and tags
- [ ] Favorite toggle persists across sessions (localStorage)
- [ ] Filter tabs (Favorites/All/Recent) work correctly
- [ ] Compare mode allows A/B switching between two outfits
- [ ] Manifest diff correctly identifies changed slots
- [ ] Gender-incompatible items are hidden when base mesh changes
- [ ] Performance: wardrobe tab renders in under 100ms with 500+ items (lazy loaded)
- [ ] Touch fallback works on mobile (long-press or preview button)
