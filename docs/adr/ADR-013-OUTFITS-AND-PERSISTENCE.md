# ADR-013: Outfits, Persistence, and Private Dressing Room

**Status:** Proposed
**Date:** 2026-04-05
**Authors:** Allen Partridge, Claude Code
**Relates to:** ADR-005 (Avatar Storage), ADR-009 (Foundation Reset), ADR-004 (Appearance Tab)
**Phase:** 4

---

## Context

Research on avatar customization psychology strongly validates the private dressing room concept:

- A 2024 ACM study on "Avatar Dressing Room" found dedicated private spaces strengthen both physical and psychological connection to the avatar
- Users report discomfort when observed during customization, particularly when exploring non-normative options
- The dressing room functions as a **liminal space** — a threshold between the player's identity and the avatar's identity
- Customization time directly correlates with avatar attachment depth (Proteus Effect, meta-analysis of 46 studies)

The existing iframe architecture already provides absolute privacy — the Babylon.js viewport is local to the player's browser, never shared. This ADR formalizes the dressing room UX and the outfit persistence system.

---

## Decision

### 1. Private Dressing Room Architecture

**Standalone mode** (absolute privacy):
- App at `https://poqpoq.com/avatar/` runs independently
- No World connection, no server awareness of what the user is trying on
- Complete freedom to experiment (body shape, skin tone, gender presentation, nudity)
- Save/export when ready

**Embedded mode** (World integration with privacy):
1. Player clicks "Enter Dressing Room" in World's Appearance panel
2. World opens Avatar iframe + hides player's in-world avatar from other players
3. Avatar app receives current manifest via `avatar_spawn` PostMessage
4. Player customizes freely in private Babylon.js viewport
5. Player clicks "Return to World"
6. Avatar app exports GLB + sends updated manifest via PostMessage
7. World re-shows avatar with new appearance

No new architecture needed — iframe isolation provides privacy by design.

**Future: Semi-private shared rooms:**
- Optional "invite a friend" mode for showing off outfits
- Lower priority — research favors private-first
- Implementation: WebRTC peer connection to share viewport state (future ADR)

### 2. Outfit Manifest v2

The Character Manifest (from `CHARACTER_MANIFEST_SPEC.md`) evolves for OpenSim:

```typescript
interface OpenSimManifest {
  version: 2;
  base: 'ruth2-feminine' | 'roth2-masculine';  // extensible
  shapeParameters: Record<string, number>;       // ~20+ param values
  materials: {
    skin: { base: string; undertone: string };
    eyes: string;
    hair: string;
    lips: string;
    nails: string;
    eyebrows: string;
  };
  skinLayers: SkinLayerState[];  // Compositor layer stack
  equipped: Record<ClothingSlot, EquippedItem | null>;
  metadata: {
    name: string;
    created: string;
    modified: string;
    thumbnail?: string;  // Base64 or URL
  };
}
```

### 3. OutfitManager

`src/avatar/OutfitManager.ts`:

- **Serialize**: Capture complete avatar state → manifest JSON
- **Deserialize**: Apply manifest → restore full look (shape + materials + clothing)
- **Atomic swap**: Changing outfit replaces everything simultaneously
- **Thumbnail capture**: `BABYLON.Tools.CreateScreenshot()` at outfit save time

### 4. Rebuilt OutfitsTab

The current placeholder OutfitsTab becomes a full outfit gallery:

- **Thumbnail grid** (2-3 columns) of saved looks
- **One-click apply** — atomic swap to saved outfit
- **Save current** — capture current state as new outfit preset
- **Delete, rename** operations
- **Default outfits** — 3 starter looks pre-loaded (see ADR-014)

### 5. NEXUS Persistence

PostMessageBridge extensions:

| Message | Direction | Payload |
|---------|-----------|---------|
| `avatar_save_config` | Avatar → World | Full manifest JSON |
| `avatar_load_config` | World → Avatar | Saved manifest JSON |
| `avatar_appearance_changed` | Avatar → World | Delta or full manifest |
| `avatar_outfit_list` | World → Avatar | Array of saved outfit summaries |

Database: `users.avatar_config` JSONB column (already exists on 39 users) stores the active manifest. New `avatar_wardrobe` table for multiple saved outfits.

### 6. GLB Export

When returning to World, export the customized avatar as GLB via `@babylonjs/serializers` `GLTF2Export.GLBAsync()`. This baked GLB is what other players see — fast loading, no parameter interpretation needed client-side.

---

## Consequences

- Privacy is the default, not an option — the tool never exposes the customization process to others
- Outfit persistence enables "one-click satisfaction" — the UX research gold standard
- Manifest v2 is extensible to future avatar types (SuperMesh, AI Mesh)
- GLB export means World doesn't need to understand shape parameters — it just loads the baked result
- Thumbnail auto-capture eliminates the need for pre-rendered previews

## Verification

- [ ] Standalone mode: full customization without any World connection
- [ ] Embedded mode: avatar vanishes from World during customization
- [ ] Save outfit captures shape + materials + clothing + thumbnail
- [ ] Load outfit restores complete look atomically
- [ ] Return to World sends updated GLB + manifest
- [ ] Multiple saved outfits persist across sessions
- [ ] Default starter outfits pre-loaded for new users
