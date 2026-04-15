# ADR-018: Appearance Panel Redesign (Skin Tab to Body/Appearance)

**Status:** Proposed
**Date:** 2026-04-15
**Authors:** Allen Partridge, Claude Code (UX Consultation)
**Relates to:** ADR-011 (Skin and Materials), ADR-014 (Character Selector), ADR-010 (Parametric Body), ADR-012 (Wardrobe)
**Phase:** 3

---

## Context

The current "Skin" tab in the sidebar (`src/hud/SkinTab.ts`) has several UX problems:

1. **UV map thumbnails are unreadable.** Each skin texture card shows the raw UV-unwrapped texture PNG (e.g., `pleiades_upper.png`) as its thumbnail. These look like flattened body maps -- distorted skin regions laid out in Second Life's UV layout. Users cannot tell what a skin will look like on their avatar from these thumbnails. This is the single biggest usability issue in the current UI.

2. **Three separate grids for one skin.** Users must independently select an upper body, lower body, and head texture. There is no concept of a "matched set" -- a user can accidentally pair a light-toned head with a dark-toned body. The code in `SkinTab.ts` renders three independent `renderTextureSection()` calls. Meanwhile, the asset folder structure at `public/assets/*/male/` already organizes skins by character name and tone (e.g., `cash_upper_bronze.png`, `cash_lower_bronze.png`, `cash_head_bronze.png`), confirming that skins are designed as matched sets.

3. **Flat, unlabeled list.** Skins named with Meshy AI hashes (`Meshy_AI_7ff094...`) give users zero information. Named skins (Cash, Dean, Pleiades) are mixed in with unnamed ones. There is no grouping by tone or character.

4. **Narrow scope.** The tab handles skin textures, skin tint, eye color/texture, and nail color, but excludes related appearance features: eyelashes (Ruth2 has eyelash mesh, currently hidden), nails (Ruth2 has 5 nail mesh variants), body hair, makeup layers, and tattoos.

5. **106 eye iris textures in a single scrolling grid.** The eye texture section renders all 106 iris PNGs in a 6-column grid. This is overwhelming and lacks any categorization by color family.

### Industry precedents

- **The Sims 4:** Skin tone is a gradient slider (light-to-dark) plus warm/cool toggle. Separate panels for makeup, tattoos, body details. Previews always show the feature on the body.
- **Second Life viewers (Firestorm, Alchemy):** Bake-on-mesh layers stack skin + tattoo + underwear. Skin picker shows small bust-up preview rendered with the skin applied. Tones organized by creator.
- **VRChat:** Avatar thumbnail is always a rendered portrait, never a raw texture.
- **IMVU:** Skin shown as full-body preview with skin applied. Grid of options with swatches indicating tone.
- **Ready Player Me:** Two-step flow: pick skin tone from swatches first, then details.

---

## Decision

### 1. Rename Tab: "Skin" becomes "Appearance"

Update `TabBar.ts` to change the label from `'Skin'` to `'Appearance'`. The tab ID remains `'skin'` internally for backward compatibility. This tab becomes the single location for all body surface customization that is not clothing.

### 2. Skin Set Picker (replacing three separate grids)

**Problem:** Users currently pick upper, lower, and head textures independently, risking mismatched combinations.

**Solution:** Introduce a "Skin Set" concept -- a single selectable unit that applies all three textures together.

#### 2a. Data model: `SkinSet`

```typescript
interface SkinSet {
  id: string;                  // e.g., 'cash-bronze'
  character: string;           // e.g., 'Cash'
  tone: SkinTone;              // e.g., 'Bronze'
  gender: AvatarGender | 'both';
  variant?: string;            // e.g., 'stubble', 'vanDyke' (facial hair variant)
  textures: {
    upper: string;             // path to upper body texture
    lower: string;             // path to lower body texture
    head: string;              // path to head texture
  };
  previewThumbnail: string;    // path to pre-rendered headshot
  toneSwatch: string;          // hex color for the tone swatch dot
}

type SkinTone = 'Ivory' | 'Light' | 'Tan' | 'Bronze' | 'DarkTan' | 'Dark';
```

This replaces the three separate `UPPER_BODY_SKINS`, `LOWER_BODY_SKINS`, and `HEAD_SKINS` arrays currently hardcoded in `SkinTab.ts`. A single `SKIN_SETS` array (or JSON catalog file) holds all sets.

#### 2b. Two-step picker UX

**Step 1 -- Tone strip.** A horizontal row of 6 circular color swatches representing the tone axis (Ivory through Dark). Each swatch is the representative skin color, sized at 40x40px. Clicking a tone filters the grid below. The active tone gets a white ring highlight. This mirrors Ready Player Me's skin tone strip and Sims 4's tone gradient.

```
Wireframe (Step 1 — Tone Strip):
┌──────────────────────────────────────┐
│  SKIN TONE                          │
│  (○)(○)(○)(●)(○)(○)                 │
│  Ivory Light Tan Bronze DarkTan Dark │
└──────────────────────────────────────┘
```

**Step 2 -- Character/variant grid.** Below the tone strip, a 2-column grid of preview cards. Each card shows:
- A **pre-rendered headshot thumbnail** (128x128px) showing the skin on the default avatar head
- The character name (e.g., "Cash") and variant label if applicable (e.g., "Stubble")
- An active highlight border when selected

```
Wireframe (Step 2 — Skin Variant Grid, filtered to "Bronze"):
┌──────────────────────────────────────┐
│  ┌───────────┐  ┌───────────┐       │
│  │ [headshot]│  │ [headshot]│       │
│  │  Cash     │  │  Dean     │       │
│  │  Clean    │  │  Clean    │       │
│  └───────────┘  └───────────┘       │
│  ┌───────────┐  ┌───────────┐       │
│  │ [headshot]│  │ [headshot]│       │
│  │  Cash     │  │  Dean     │       │
│  │  Stubble  │  │  Stubble  │       │
│  └───────────┘  └───────────┘       │
└──────────────────────────────────────┘
```

Selecting a card calls `SkinMaterialManager.setUpperBodySkin()`, `setLowerBodySkin()`, and `setHeadSkin()` together as a single atomic operation. A new method `SkinMaterialManager.applySkinSet(set: SkinSet)` wraps all three.

#### 2c. Preview thumbnails: pre-rendered approach

For the initial implementation, use **pre-rendered static thumbnails** (one per skin set). These are 128x128 PNG images showing a headshot/bust crop of the avatar head with that skin applied, rendered offline from the Babylon.js scene.

```
public/assets/skin-previews/
  cash-ivory-clean.png
  cash-bronze-stubble.png
  dean-tan-clean.png
  pleiades-light-clean.png
  ...
```

**Why not live render-to-texture?** Babylon.js `RenderTargetTexture` can render a mini viewport, but:
- Requires a second camera, lighting setup, and avatar instance per thumbnail
- GPU cost scales with grid size (potentially 10-20 simultaneous RTTs)
- Adds complexity for marginal benefit over static previews
- Static previews load instantly; RTT previews show blank frames while rendering

Pre-rendered thumbnails are how Second Life viewers, VRChat, and IMVU handle this. Live render is worth revisiting later if skins become dynamically generated.

**Fallback for skins without previews:** Display a circular swatch of the skin's representative tone color with the character name below it. This is still vastly better than a UV map.

### 3. Appearance Panel Section Layout

The tab is reorganized into collapsible sections (accordion pattern, like the existing `ShapeSliderPanel` groups). Sections collapse to save vertical space; only one or two are expanded at a time.

```
Wireframe (Full Appearance Tab):
┌──────────────────────────────────────┐
│  ▼ SKIN                             │
│  Tone strip: (○)(○)(○)(●)(○)(○)     │
│  Grid: [Card] [Card]                │
│         [Card] [Card]                │
│                                      │
│  Skin Tint: [swatch row] [picker]   │
│                                      │
│  ▶ EYES                [collapsed]  │
│  ▶ NAILS               [collapsed]  │
│  ▶ EYELASHES           [collapsed]  │
│  ▶ MAKEUP              [collapsed]  │
│  ▶ TATTOOS             [collapsed]  │
└──────────────────────────────────────┘
```

Expanded "Eyes" section:

```
┌──────────────────────────────────────┐
│  ▼ EYES                             │
│  Eye Color: [swatch row] [picker]   │
│                                      │
│  Iris Texture:                       │
│  Color filter: All Brown Blue Green  │
│  [iris] [iris] [iris] [iris] [iris]  │
│  [iris] [iris] [iris] [iris] [iris]  │
│  (scrollable, max 3 rows visible)   │
└──────────────────────────────────────┘
```

### 4. Eye Iris Texture Improvements

The current 106-iris flat grid needs organization. Group iris textures by dominant color family (Brown, Blue, Green, Hazel, Gray, Fantasy). Add a simple filter bar above the grid:

- Maintain a mapping `iris-NNN.png` to color category (can be auto-derived from average pixel color of the iris region, or manually curated in a JSON)
- Default filter: "All" (shows all, scrollable)
- Category filter buttons reduce the grid to 10-20 items per category
- Grid stays at 6 columns but gains a category filter bar

### 5. Nails Section

Currently a simple `ColorSlotWidget` for nail color. Expand to include:

- **Nail color picker** (existing, keep as-is)
- **Nail tip color** (for French manicure -- `SkinMaterialManager.setNailTipColor()` already exists)
- **Nail style selector** (future -- Ruth2 has 5 nail mesh variants; when mesh-switching is implemented, show 5 small thumbnails: natural, short, medium, long, stiletto)

### 6. Eyelashes Section

Ruth2 has an eyelash mesh that is currently hidden. This section provides:

- **Toggle on/off** (visibility toggle for the eyelash mesh)
- **Eyelash color** (tint the eyelash material -- typically black/brown/blonde)
- **Style selector** (future -- if multiple eyelash mesh assets are created)

### 7. Makeup and Tattoo Sections (Future, Skeleton Only)

These sections appear in the UI as collapsed headers with "Coming Soon" badges. They map to compositor layers 3-5 from `SKIN_COMPOSITOR_SPEC`. Including them now establishes the information architecture without requiring implementation.

- **Makeup:** Eye shadow color region, lipstick (overlay on head texture), blush region
- **Tattoos:** Overlay textures composited via `TextureCompositor.setLayer()` on upper/lower/head targets

### 8. Manifest Schema Update

The `SkinState` interface in `src/types/manifest.ts` gains a `skinSetId` field:

```typescript
export interface SkinState {
  skinSetId: string | null;    // NEW: selected skin set (e.g., 'cash-bronze-clean')
  upperBody: string | null;    // kept for backward compat / custom skins
  lowerBody: string | null;
  head: string | null;
  tint: string;
}

export interface ColorState {
  eyeColor: string;
  eyeTexture: string | null;   // NEW: iris texture path
  nailColor: string;
  nailTipColor: string | null; // NEW: French manicure tip color
  eyelashVisible: boolean;     // NEW
  eyelashColor: string | null; // NEW
}
```

### 9. Skin Set Catalog File

Move skin definitions out of `SkinTab.ts` hardcoded arrays into a JSON catalog file (following the pattern of `public/assets/clothing/catalog.json`):

```
public/assets/skins/catalog.json
```

This catalog is loaded at startup and drives the skin picker grid. Adding a new skin set means adding texture files + a catalog entry + a preview thumbnail -- no code changes.

### 10. Gender-Aware Filtering

The existing `setGender()` method on `SkinTab` already filters by `AvatarGender`. This continues to work with skin sets: each `SkinSet` has a `gender` field. Male skins (Cash, Dean) show when Roth2 is active. Female skins (Pleiades) show when Ruth2 is active. Sets marked `'both'` show on either.

---

## Implementation Sequence

**Phase 3a (immediate, highest impact):**
1. Create `SkinSet` data model and refactor `SkinTab.ts` hardcoded arrays into a catalog
2. Replace three-grid layout with tone-strip + character-grid two-step picker
3. Generate pre-rendered headshot thumbnails for existing skin sets (Cash x5 tones, Dean x5 tones, Pleiades x1 -- 11 thumbnails)
4. Add `applySkinSet()` method to `SkinMaterialManager`
5. Rename tab label in `TabBar.ts`

**Phase 3b (incremental):**
6. Add collapsible sections (accordion component)
7. Categorize 106 iris textures and add filter bar to eye section
8. Expose nail tip color and eyelash toggle
9. Update `ManifestSerializer` and `SkinState`/`ColorState` interfaces
10. Add skin catalog JSON file

**Phase 4+ (future):**
11. Makeup section (compositor layers 3-5)
12. Tattoo section
13. Nail mesh variant switching
14. Live render-to-texture thumbnails for user-uploaded skins

---

## Consequences

- Users see recognizable headshot previews instead of incomprehensible UV maps -- dramatically improved first impression
- Matched skin sets eliminate the mismatched-tone problem entirely
- Tone-first organization maps to how people actually think about skin selection ("I want a warm medium tone" not "I want texture file 0910b9a9...")
- Collapsible accordion prevents the tab from becoming an overwhelming scroll
- Catalog JSON decouples skin content from UI code, matching the clothing catalog pattern
- Eyelash toggle unlocks a hidden Ruth2 feature with minimal effort
- Manifest schema expansion is backward-compatible (new fields are optional/nullable)
- Pre-rendered thumbnails add ~11 small PNGs (~50KB total) to the asset bundle -- negligible cost

---

## Verification

- [ ] Selecting a skin set applies head + upper + lower textures atomically
- [ ] Tone strip filters the grid to show only skins matching the selected tone
- [ ] Preview thumbnails display as recognizable headshots, not UV maps
- [ ] Gender toggle filters skin sets (Cash/Dean for masculine, Pleiades for feminine)
- [ ] Eye iris textures can be filtered by color family
- [ ] Nail tip color and eyelash toggle are functional
- [ ] Appearance tab loads from skin catalog JSON, not hardcoded arrays
- [ ] Manifest save/load roundtrips include new fields (skinSetId, eyeTexture, eyelashVisible)
- [ ] Collapsible sections remember their expanded/collapsed state within a session
- [ ] Tab labeled "Appearance" in the sidebar tab bar
