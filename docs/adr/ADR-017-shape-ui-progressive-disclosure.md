# ADR-017: Shape UI Progressive Disclosure and Scalable Layout

**Status:** Proposed  
**Date:** 2026-04-15  
**Author:** UX/XD Consultation (Claude)  
**Relates to:** ADR-010 (Parametric Body System), ADR-016 (Shape Parameter Parity)  
**Phase:** Concurrent with ADR-016 Phase 2+

---

## Context

ADR-016 proposes expanding shape parameters from ~43 to ~119 to achieve full Second Life parity. The current UI (implemented in `ShapeSliderPanel.ts`) displays sliders in 9 collapsible groups within a 400px sidebar. This design works acceptably at 43 sliders but will collapse under its own weight at 119:

**Quantitative problem:**
- At ~43 sliders, the current panel scrolls approximately 2-3 screen heights. At 119, it will scroll 7-8 screen heights.
- Categories like "Eyes" grow from 5 to 18 sliders. "Mouth" grows from 2 to 13. Opening one group will push others off-screen entirely.
- The existing face groups start collapsed (`startCollapsed: boolean` passed as `section === 'face'`), which helps, but does not solve discoverability when every group is dense.

**Qualitative problem:**
- Casual users (the majority for a metaverse onboarding tool) want to look different quickly, not learn 119 parameters. The current flat list of presets (Default, Athletic, Curvy, Slim, Heavy for body; Default, Angular, Soft, Distinct for face) is too sparse relative to the parameter space.
- Power users migrating from Second Life expect category organization that matches the SL viewer (which they have muscle memory for), plus the ability to find parameters by name.
- The current sidebar has no mobile/narrow-viewport story at all: it is hardcoded to `width: 400px` in `Sidebar.ts`.

**Competitive analysis (informing design, not copying):**
- **Second Life / Firestorm viewer:** Flat slider list in categories, no progressive disclosure, no search. Users tolerate this because they have used it for 20 years. New users find it overwhelming.
- **VRChat:** Relies almost entirely on presets and toggles; individual sliders are rare. Too restrictive for our use case.
- **The Sims 4:** Direct-manipulation (click and drag on the body). Intuitive but requires a 3D picking system we do not have in Phase 1.
- **Ready Player Me:** Preset-driven with minimal sliders. Good for onboarding, bad for power users.

Our opportunity is to combine the accessibility of preset-driven workflows with the precision of SL-style sliders, using progressive disclosure as the bridge.

### Additional Systems to Consider

The Shape tab coexists with physics controls (CV bounce, breathing, blinking) that are already implemented. These procedural animation controls need a clear home in the expanded UI without being buried by 119 shape sliders.

---

## Decision

### 1. Two-Tier Progressive Disclosure: Simple Mode and Detail Mode

The Shape tab gets a mode toggle in its header area, defaulting to **Simple Mode**.

```
 BODY                                    [Simple | Detail]
 +-------------------------------------------------+
 |  [Default] [Athletic] [Curvy] [Slim] [Heavy]    |  <- presets row
 +-------------------------------------------------+
 |  v Body (3)                                     |  <- "essentials" only
 |    Height          [========O=======] 50        |
 |    Body Thickness  [=====O==========] 40        |
 |    Body Fat        [===O============] 30        |
 |  > Torso (3)                                    |  <- collapsed
 |  > Legs (2)                                     |
 +-------------------------------------------------+
 FACE
 +-------------------------------------------------+
 |  [Default] [Angular] [Soft] [Distinct]          |
 +-------------------------------------------------+
 |  > Head Shape (2)                               |
 |  > Eyes (2)                                     |
 |  > Nose (2)                                     |
 |  > Mouth (2)                                    |
 +-------------------------------------------------+
 PHYSICS
 +-------------------------------------------------+
 |  [x] Breathing  [x] Blinking                    |
 |  > Bounce (per-region sliders)                   |
 +-------------------------------------------------+
```

**Simple Mode** shows only "essential" parameters per category -- the 3-5 sliders that produce the most visible change. This reduces the visible slider count from 119 to approximately 25-30. The selection of which parameters are "essential" is a curated editorial decision encoded in the data model.

**Detail Mode** shows all sliders in each category, matching full SL parity:

```
 BODY                                    [Simple | Detail]
 +-------------------------------------------------+
 |  [Default] [Athletic] [Curvy] [Slim] [Heavy]    |
 +-------------------------------------------------+
 |  [Search sliders...]              [filter icon] |  <- search bar
 +-------------------------------------------------+
 |  v Body (10)                                    |
 |    Height          [========O=======] 50        |
 |    Body Thickness  [=====O==========] 40        |
 |    Body Fat        [===O============] 30        |
 |    Shoulder Width  [========O=======] 50        |
 |    Hip Width       [========O=======] 50        |
 |    Torso Muscle    [======O=========] 40        |
 |    Body Taper      [========O=======] 50        |
 |    ...3 more from ADR-016...                    |
 |                          [Reset Body] [Undo]    |  <- per-category actions
 |  > Torso (9)                                    |
 |  > Arms (7)                                     |
 |  ...                                            |
 +-------------------------------------------------+
```

**Data model change** -- add `essential: boolean` to `ShapeParameterDef`:

```typescript
export interface ShapeParameterDef {
  id: string;
  label: string;
  category: ShapeCategory;
  defaultValue: number;
  drivers: BoneDriver[];
  /** If true, shown in Simple Mode. All params shown in Detail Mode. */
  essential?: boolean;
}
```

The mode preference is persisted to `localStorage` under key `bb-shape-mode`.

### 2. Expanded Category Structure

With 119 parameters, the current 9 categories need refinement. The face section in particular needs splitting to avoid single groups with 18 sliders.

**Proposed categories (13 total):**

| Section | Category ID | Label | Approx Slider Count | Essential Count |
|---------|------------|-------|---------------------|-----------------|
| body | `body` | Body | 10 | 3 (Height, Thickness, Fat) |
| body | `torso` | Torso | 9 | 3 (Breast Size, Belly, Chest Width) |
| body | `arms` | Arms | 7 | 2 (Arm Length, Hand Size) |
| body | `legs` | Legs | 15 | 3 (Leg Length, Upper Leg, Foot Size) |
| body | `details` | Details | 7 | 2 (Butt Size, Head Size) |
| face | `head_shape` | Head Shape | 12 | 3 (Egg Head, Head Stretch, Face Shear) |
| face | `eyes` | Eyes | 11 | 3 (Eye Size, Eye Spacing, Eye Opening) |
| face | `eyelids` | Eyelids | 7 | 2 (Wide Eyes, Eyelid Corner) |
| face | `nose` | Nose | 11 | 3 (Nose Size, Nose Width, Nose Tip Angle) |
| face | `mouth` | Mouth | 8 | 3 (Lip Width, Lip Fullness, Lip Thickness) |
| face | `chin` | Chin | 6 | 2 (Chin Depth, Jaw Width) |
| face | `ears` | Ears | 4 | 1 (Ear Size) |
| face | `forehead` | Forehead | 3 | 1 (Forehead Height) |

### 3. Physics Section (Preserved)

The existing physics controls (breathing toggle, blinking toggle, per-region bounce sliders) remain in a dedicated **Physics** section at the bottom of the Shape tab. These are NOT shape parameters — they are procedural animation controls — and should be visually distinct from the shape sliders (e.g., different section header color or separator).

### 4. Search/Filter (Detail Mode Only)

A search input appears at the top of the Shape tab content area when Detail Mode is active. It performs substring matching against slider labels, filtering the visible sliders in real time.

```
Search behavior:
- Input: "lip"
- Result: Shows only "Lip Width", "Lip Fullness Upper", "Lip Fullness Lower",
  "Lip Thickness", "Lip Cleft" — grouped under their categories
- Empty categories are hidden
- Clearing search restores full list
```

Implementation: The `renderGroup` method in `ShapeSliderPanel.ts` already filters `SHAPE_PARAMETERS.filter(p => p.category === category)`. Adding a search term filter is a simple predicate addition: `&& p.label.toLowerCase().includes(searchTerm)`.

### 5. Per-Category Reset and Undo

Each expanded category group gets a small action row at its bottom with two buttons:

- **Reset [Category]**: Sets all sliders in that category back to their `defaultValue`.
- **Undo**: Reverts the most recent slider change within that category.

The undo system is lightweight -- a per-category stack of `{paramId, previousValue}` tuples, capped at 20 entries. This is NOT a full undo/redo system; it is a "last change" safety net.

```typescript
interface UndoEntry {
  paramId: string;
  previousValue: number;
}

// In ShapeSliderPanel:
private undoStacks: Map<ShapeCategory, UndoEntry[]> = new Map();
```

The current "Reset All" button at the bottom of the panel is retained. Category-level resets are an addition, not a replacement.

### 6. Symmetry Editing (Paired Parameters)

Many face parameters come in left/right pairs (eye corners, eyelids, brow arches). ADR-016 lists several asymmetric parameters (Crooked Smile, Crooked Nose).

**Design:** By default, left/right pairs are linked (one slider controls both). A small "unlink" toggle (chain icon) next to paired sliders breaks them into two independent sliders.

```
 Eye Spacing       [========O=======] 50  [chain]
```

Click the chain icon:

```
 Eye Spacing L     [========O=======] 50
 Eye Spacing R     [========O=======] 50  [chain-broken]
```

**Data model change** -- add optional `symmetryGroup` to `ShapeParameterDef`:

```typescript
export interface ShapeParameterDef {
  id: string;
  label: string;
  category: ShapeCategory;
  defaultValue: number;
  drivers: BoneDriver[];
  essential?: boolean;
  /**
   * If set, this param is the "linked" version driving both sides.
   * Unlinking spawns two virtual params: `${id}_left` and `${id}_right`
   * whose drivers are the left-only and right-only subsets of `drivers`.
   */
  symmetryGroup?: string;
}
```

The current `symmetric()` and `symmetricCV()` helper functions in `ShapeParameterDefinitions.ts` already generate paired bone drivers. The symmetry toggle splits these driver arrays by bone name suffix ("Left"/"Right" or "L_"/"R_" prefix).

Symmetry is linked by default because most users want symmetric faces. Unlinking is a power-user feature surfaced only in Detail Mode.

### 7. Enhanced Presets with Thumbnails

With 119 parameters, presets become the primary tool for casual users. The current preset system (small text buttons in a flex row) does not communicate what each preset looks like.

**Phase 1 (immediate):** Keep button row but add tooltip-on-hover showing the preset's key parameter values in a mini summary.

**Phase 2 (when snapshot infrastructure exists):** Replace text buttons with small thumbnail cards showing a rendered preview of the preset, similar to the outfit cards in `OutfitsTab.ts` (which already use a `3/4 aspect-ratio` thumbnail pattern). Reuse the existing `Tools.CreateScreenshotUsingRenderTarget` pattern already used in the outfits system.

Preset cards layout:

```
 [Default] [Athletic] [Curvy] [Slim] [Heavy] [+ Save]
  (each is a 48x64 thumbnail card with label below)
```

**User-created presets / Shapes as inventory assets:** In SL/OpenSim, shapes are first-class inventory assets (`.shape` type) — users can save unlimited shapes, trade them, and apply them like any other asset. For metaverse parity, saved shapes should be inventory assets stored in NEXUS (not localStorage with artificial limits). This requires extending the NEXUS inventory asset type system to include `shape` alongside existing types. Shape parameters map directly to OpenSim's shape param IDs. Until NEXUS integration, localStorage serves as a local cache with no artificial limit.

### 8. Camera Auto-Focus on Category Selection

The existing `DressingRoomCamera` already supports `focusOnModel()`. Extend with targeted focus methods:

```typescript
// New methods on DressingRoomCamera:
focusOnHead(): void    // radius ~0.8, target at head center
focusOnTorso(): void   // radius ~1.5, target at chest
focusOnLegs(): void    // radius ~2.0, target at hip height
focusOnFull(): void    // current focusOnModel behavior
```

**Trigger:** When a user expands a face category group, the camera smoothly animates to `focusOnHead()`. When a body category is expanded, it stays at full body or zooms to the relevant region. This is already called out in ADR-010 but is not yet implemented. This ADR specifies the concrete behavior.

Animation: Use Babylon.js `ArcRotateCamera` animation helpers (target lerp and radius lerp over 400ms).

### 9. Modified Slider Indicators

With 119 sliders, it becomes important to quickly see which parameters have been changed from their defaults. Add a visual indicator:

- Sliders at their default value: standard appearance (current)
- Sliders changed from default: the slider label text brightens from `rgba(255,255,255,0.45)` to `rgba(255,255,255,0.75)` and a small dot appears next to the label

This helps users understand what they have customized, especially after loading a preset. The category header count also gains a "modified" indicator: `Body (3/10)` meaning "3 of 10 sliders changed from default."

### 10. Mobile / Narrow Viewport Layout

The current sidebar is hardcoded at `width: 400px` with no responsive behavior. For screens narrower than 768px:

**Approach: Bottom sheet drawer**

```
 +------------------------------------------+
 |                                          |
 |           3D Viewport                    |
 |          (full width)                    |
 |                                          |
 +------------------------------------------+
 |  [drag handle]                           |  <- bottom sheet
 |  [Outfits] [Shape] [Skin] [Wardrobe]     |
 +------------------------------------------+
 |  BODY                   [Simple|Detail]  |
 |  [Default][Athletic][Curvy][Slim][Heavy]  |
 |  v Body (3)                              |
 |    Height        [=====O========] 50     |
 |    ...                                   |
 +------------------------------------------+
```

The bottom sheet has three snap positions:
1. **Peek** (~60px): Just the tab bar visible, maximum 3D viewport
2. **Half** (~40vh): Tab bar + content, 3D viewport still visible above for live preview
3. **Full** (~85vh): Nearly full-screen panel for intensive editing

Implementation: CSS-only approach using `position: fixed; bottom: 0` with a CSS custom property `--sheet-height` toggled by a drag handle. The 3D viewport remains behind at full width/height. No additional JS library required.

**Breakpoint rules for `Sidebar.ts`:**

```css
@media (max-width: 768px) {
  #avatar-sidebar {
    width: 100%;
    height: var(--sheet-height, 40vh);
    position: fixed;
    bottom: 0;
    left: 0;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px 16px 0 0;
    z-index: 100;
  }
}
```

Slider touch targets: The current slider thumb is 14x14px (below the 44px minimum recommended for touch). On mobile, increase to 24x24px thumb with 44px touch target via padding.

### 11. Interaction Refinements

**Double-click to reset (preserve):** The current `dblclick` handler on sliders resets to default. Keep this -- it is discoverable through muscle memory and commonly expected.

**Numeric input on click:** Clicking the numeric value display (the "50" to the right of the slider) should convert it to an editable `<input type="number">` for precise entry. On blur or Enter, it reverts to the static display. This is a common pattern in creative tools (Figma, Blender property panels).

**Slider acceleration:** Hold Shift while dragging for fine-grained control (0.1 increments instead of 1). Hold Ctrl/Cmd for coarse control (5 increments).

---

## Implementation Strategy

### Phase A: Data Model Extension (prerequisite, small)
1. Add `essential` and `symmetryGroup` fields to `ShapeParameterDef` interface
2. Curate the `essential` flag for all ~43 existing parameters
3. Add the new category types to `ShapeCategory` union and `CATEGORY_GROUPS` array

**Files:** `src/avatar/ShapeParameterDefinitions.ts`

### Phase B: Simple/Detail Toggle (core feature)
1. Add mode toggle UI element at the top of the shape panel
2. Modify `renderGroup()` to filter by `essential` when in Simple Mode
3. Persist mode to `localStorage`

**Files:** `src/hud/ShapeSliderPanel.ts`

### Phase C: Search and Per-Category Actions
1. Add search input (Detail Mode only)
2. Add per-category Reset button and undo stack
3. Add modified-from-default indicator styling

**Files:** `src/hud/ShapeSliderPanel.ts`

### Phase D: Camera Auto-Focus
1. Add `focusOnHead()`, `focusOnTorso()`, `focusOnLegs()` to `DressingRoomCamera.ts`
2. Wire category group expand events to camera focus calls
3. Add smooth animation (400ms lerp)

**Files:** `src/camera/DressingRoomCamera.ts`, `src/hud/ShapeSliderPanel.ts`, `src/hud/BodyTab.ts`

### Phase E: Symmetry Toggle
1. Implement linked/unlinked slider rendering
2. Add driver array splitting logic based on bone name patterns
3. Surface only in Detail Mode

**Files:** `src/hud/ShapeSliderPanel.ts`, `src/avatar/ShapeParameterDefinitions.ts`, `src/avatar/ShapeParameterDriver.ts`

### Phase F: Mobile Layout
1. Add media query breakpoints to `Sidebar.ts` styles
2. Implement bottom sheet drag handle
3. Increase touch targets on mobile
4. Test on iOS Safari and Android Chrome

**Files:** `src/hud/Sidebar.ts`

### Phase G: Enhanced Presets
1. Add user-created preset save/load to `localStorage`
2. Add thumbnail rendering when screenshot infrastructure is available
3. Limit to 20 user presets

**Files:** `src/hud/ShapeSliderPanel.ts`, `src/avatar/ShapeParameterDefinitions.ts`

---

## Consequences

- **Simple Mode reduces cognitive load by ~75%**: 25-30 essential sliders vs 119 total. Casual users see a manageable interface. The "Detail" toggle is always visible for users who want more.
- **Search eliminates scrolling for power users**: Instead of scrolling through 13 categories to find "Nostril Width", type "nostr" and it appears.
- **Per-category reset reduces fear of experimentation**: Users can freely adjust face sliders knowing they can reset just the face, not the entire body.
- **Mobile layout unblocks a significant use case**: Metaverse users frequently customize avatars on phones. The bottom sheet pattern is familiar from Google Maps, Uber, and other mobile apps.
- **Symmetry toggle covers both common and edge cases**: Most users never touch it (symmetric editing is default). Power users creating asymmetric faces (scars, unique features) get the control they need.
- **Camera auto-focus reduces disorientation**: When editing nose parameters, the camera zooms to the face automatically. No manual zoom/pan needed.
- **Modified indicators reduce "what did I change?" confusion**: After loading a preset and making tweaks, users can instantly see which parameters differ from the preset baseline.
- **Physics controls remain accessible**: Breathing, blinking, and bounce sliders stay in a dedicated section, not buried under 119 shape parameters.

## Risks

- **Essential parameter curation is subjective**: Which 3 of 11 nose parameters are "essential"? This requires user testing. Mitigated by: the Detail toggle is always one click away, and the curation can be updated without code changes (just data).
- **Bottom sheet on mobile may conflict with browser chrome**: iOS Safari's bottom bar and Android's navigation gestures can interfere with bottom sheets. Mitigated by: using the peek state to keep the drag handle above the browser chrome, and testing on real devices.
- **Search adds DOM manipulation overhead**: Filtering 119 sliders on each keystroke is DOM-heavy. Mitigated by: debounce input events to 150ms, and use `display: none` rather than removing/re-creating DOM nodes.

## Verification

- [ ] Simple Mode shows <= 30 sliders across all categories
- [ ] Detail Mode shows all ~119 sliders
- [ ] Mode toggle persists across page reloads
- [ ] Search filters sliders by label substring (Detail Mode only)
- [ ] Per-category Reset restores that category's defaults without affecting others
- [ ] Undo reverts the last slider change within a category
- [ ] Modified sliders display visual indicator (brightened label, dot)
- [ ] Category headers show modified count (e.g., "Body (3/10)")
- [ ] Symmetry toggle splits paired sliders into independent L/R controls
- [ ] Camera animates to head when a face category is expanded
- [ ] Camera animates to full body when a body category is expanded
- [ ] On viewports < 768px, sidebar renders as bottom sheet
- [ ] Bottom sheet has three snap positions (peek, half, full)
- [ ] Slider touch targets are >= 44px on mobile
- [ ] Double-click on slider resets to default (existing behavior preserved)
- [ ] Clicking numeric value allows direct numeric input
- [ ] Physics controls (breathing, blinking, bounce) visible in dedicated section
- [ ] User-created presets save to and load from localStorage
