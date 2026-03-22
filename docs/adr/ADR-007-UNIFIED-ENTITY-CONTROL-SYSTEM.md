# ADR-007: Unified Entity Control System

**Status:** Accepted
**Date:** 2026-02-27
**Supersedes:** Sprint 1's per-slot hardcoded swatch grids

## Context

Sprint 1.5 proved the HSL texture remapping pipeline works — dramatic color changes on skin, hair, eyes, and lips with intensity and tint sliders. But the current UI has per-slot swatch grids (16-32 preset colors) with independently wired controls. This doesn't scale to the full avatar customization surface:

- Body parts beyond the original 4 (eyebrows, fingernails, toenails, tattoos per limb)
- Makeup layer (rouge, eye shadow, eye liner, mascara)
- Piercings (attached jewelry meshes)
- Hair styles

Each of these needs the same color + intensity + tint controls. Duplicating swatch grids per item creates UI bloat and maintenance burden.

## Decision

### One Control Set, Many Items

A single **Entity Control Panel** provides the color editing interface for the currently selected item. It contains:

1. **Color picker** — full continuous hue wheel (thousands of colors, not 16/32 presets)
2. **Intensity slider** (0–100%) — blend strength of the recolor
3. **Tint slider** (-50 to +50) — lightness shift for shadow/highlight control

No preset swatch grids. The color picker is the universal input.

### Four Subpanel Groups

Items are organized into four collapsible groups with dropdown selectors. The user picks an item from a dropdown, then adjusts it with the shared control set.

**Order (top to bottom):**

| Group | Items (dropdown) |
|-------|-----------------|
| **Hair** | Hair style, hair color |
| **Skin** | Body skin, face skin, tattoo-left-arm, tattoo-right-arm, tattoo-left-leg, tattoo-right-leg, tattoo-torso, tattoo-face, fingernails, toenails |
| **Makeup** | Eyes (iris), eyebrows, eyelashes/mascara, eye shadow, eye liner, cheeks/rouge, lips |
| **Piercings** | Ear, nose, lip, eyebrow, navel (attached jewelry meshes) |

### Selection Flow

1. User expands a group (e.g., "Makeup")
2. User selects an item from the dropdown (e.g., "Eye Shadow")
3. The Entity Control Panel updates to show that item's current color/intensity/tint
4. User adjusts → real-time preview via HSL texture remapping
5. Selecting a different item swaps the control panel's target — no UI duplication

### Piercings: Attached Jewelry Meshes

Piercings are a special case — they're not texture recoloring but mesh attachment:
- Small GLB meshes positioned at predefined bone attachment points
- Color control still applies (metallic tint of the jewelry)
- Dropdown includes "None" to remove

### Tattoos: Texture Overlay

Tattoos are texture decals composited onto the skin texture:
- Each tattoo slot has a library of designs (dropdown) plus color control
- Left/right arms and legs are separate to allow asymmetry
- Applied as a second HSL-remapped layer blended over the skin base

## Consequences

### Positive
- **Scales to any number of items** — adding a new customizable part means adding a dropdown entry, not a new UI section
- **Consistent UX** — every item works the same way
- **Less code** — one control panel component, not N duplicated swatch grids
- **Full color freedom** — continuous picker instead of preset limitations

### Negative
- Loses the "quick pick" affordance of visible swatch grids (mitigated by recent-colors history)
- Tattoo and piercing systems require new infrastructure (texture compositing, mesh attachment)
- More items to persist in Character Manifest JSON

### Architecture Impact
- **MaterialEditor** gains a generic `setItemColor(itemKey, hex, intensity, tint)` interface
- **BodyTab** replaced by **EntityPanel** with dropdown-driven item selection
- **TextureRecolorizer** unchanged — already generic enough
- **Character Manifest** schema gains per-item color entries
- New systems needed: TattooCompositor, PiercingAttacher (future sprints)

## Implementation Notes

- Sprint 2 target: refactor BodyTab → EntityPanel with the 4-group structure
- Hair and Skin groups functional first (already have the pipeline)
- Makeup group second (needs material ref expansion in VRMAnalyzer)
- Piercings and tattoos are Phase 2+ (require mesh/texture infrastructure)
- "Recent colors" strip (last 8 used) provides quick-pick without preset grids
