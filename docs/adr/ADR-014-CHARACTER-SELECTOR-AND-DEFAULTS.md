# ADR-014: Character Selector and Default Avatars

**Status:** Proposed
**Date:** 2026-04-05
**Authors:** Allen Partridge, Claude Code
**Relates to:** ADR-009 (Foundation Reset), ADR-010 (Parametric Body), ADR-013 (Outfits)
**Phase:** 5

---

## Context

The current app offers ~8 prebuilt VRM characters plus VRM upload as the entry point. With the OpenSim pivot, this selector becomes non-functional. It needs replacement with OpenSim-native defaults.

Research findings inform the design:
- **Gender-neutral framing preferred** — body-shape descriptors rather than binary male/female labels (2024 Games and Culture study; 2025 systematic review on avatar-mediated gender exploration)
- **Customization time = attachment** — even the initial selection moment matters
- **Diverse representation from the start** — skin tone, body type, and presentation variety in defaults signals inclusivity

The two base meshes are Ruth2 v4 (feminine topology) and Roth2 v2 (masculine topology). The parametric shape system (ADR-010) can produce enormous variation from these two bases.

---

## Decision

### 1. Minimum Viable Character Selector (Phase 5)

**3 default starter avatars**, each a curated preset of shape parameters + basic clothing:

| Avatar | Base Mesh | Shape Preset | Clothing | Presentation |
|--------|-----------|-------------|----------|-------------|
| **Body Type A** | Ruth2 v4 | Default feminine proportions | Simple outfit (shirt + pants + shoes) | Feminine-leaning |
| **Body Type B** | (Ruth2 or Roth2, tuned to androgynous proportions) | Narrowed hips, reduced breast, moderate shoulders | Simple outfit | Androgynous/neutral |
| **Body Type C** | Roth2 v2 | Default masculine proportions | Simple outfit | Masculine-leaning |

Labels are deliberately **body-shape descriptors**, not gendered terms. The UI shows visual thumbnails of each preset, not text labels.

### 2. Character Selection UX

**First-time user flow:**
1. App loads → Character selector overlay (3 large preview cards)
2. User clicks a starting body → model loads with preset shape + clothing
3. User enters the full dressing room (Shape/Skin/Wardrobe tabs)
4. All sliders and colors are fully adjustable from any starting point

**Returning user flow:**
1. App loads → Last saved manifest loads automatically
2. Character selector available via "New Character" or "Switch Base" option

### 3. Growth Path

The 3 defaults are the minimum. Over time, add:
- **More body presets** (5-8 curated shapes spanning athletic, curvy, slim, heavy, etc.)
- **Skin tone variety in defaults** — each body type shown in multiple skin tones
- **Pre-dressed looks** — starter outfits beyond the basic set (as MD clothing catalog grows)
- **Community/marketplace characters** — user-shared presets (future)

Each "character" is just a manifest JSON (ADR-013) — adding a new default is adding a JSON file, not modeling a new mesh.

### 4. VRM Legacy Support (Phase 6)

The original VRM character selector (8 prebuilt + upload) can optionally be restored as a secondary tab or mode:
- Import pathway: VRM upload → VRMAnalyzer (from `src/legacy/vrm/`) → limited editing (color only, no shape)
- Clearly labeled as "Legacy VRM" or "Import Custom"
- Does not block the OpenSim-primary experience
- Deferred to Phase 6 unless user demand requires earlier attention

### 5. Base Mesh Switching

Switching between Ruth2 and Roth2 (or future base meshes) is a **destructive operation**:
- Unequips all clothing (different topology, clothing may not transfer)
- Resets shape parameters to new base's defaults
- Preserves material choices (skin tone, eye color, etc.) where compatible
- Requires user confirmation ("Switching body type will reset your shape and remove clothing")

---

## Consequences

- New users get a fast, visual entry point — pick a body, start customizing
- Gender-neutral framing creates a safe space for identity exploration
- 3 defaults is deliberately minimal — quality over quantity, grow organically
- Each default is a manifest JSON, trivially extensible
- VRM support preserved but deprioritized (legal reality)
- Base mesh switching is intentionally frictionful to prevent accidental loss

## Verification

- [ ] First-time user sees 3 body type cards with visual previews
- [ ] Selecting a body type loads correct base mesh + shape presets + starter clothing
- [ ] Returning user loads last saved manifest, bypassing selector
- [ ] "New Character" / "Switch Base" option accessible from within the dressing room
- [ ] Body type labels are descriptive and gender-neutral
- [ ] Base mesh switch warns about destructive nature and requires confirmation
