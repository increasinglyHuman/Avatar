# ADR-004: Appearance Tab Integration

**Status:** Accepted
**Date:** 2026-02-26
**Authors:** Allen Partridge, Claude Code
**Relates to:** AVATAR_STRATEGY.md Cross-Cutting, ADR-001 (VRM modifications)
**Timeline:** Phase 1 immediate (Spring 2026)

---

## Context

World's left shelf has an Appearance panel (`AppearancePanel.ts`) that is currently a "Coming Soon" stub. This is the **most important user-facing surface** in the entire avatar system — the vanity mirror, the dress-up game, the place where players build identity and spend the bulk of their time and money.

The Appearance tab must serve three progressively expanding modalities (VRM now, AI Mesh summer, SuperMesh late 2026) while feeling like a single cohesive experience. It starts simple and grows.

**Design philosophy:** To a player, this IS the avatar system. The technical complexity (VRM vs AI Mesh vs SuperMesh, retargeting, bone transforms, material compositing) must be invisible. They see: "my avatar, looking good, with things I can change."

---

## Phase 1 User Experience: The Immediate Wins

### Win 1: Avatar Swap (Week 1 priority)

The simplest, highest-impact feature. Players can:
- Browse curated VRM prebuilts in a carousel
- Upload their own VRoid Studio creation
- Instantly switch between saved avatars (wardrobe)
- Return to avatar selection anytime (not just first-run)

**Current state:** World's `AvatarSelectionModal.ts` already does this for first-run. We need to:
1. Make it accessible from the Appearance tab (not just first-run)
2. Expand the prebuilt carousel with quality VRoid exports
3. Add "wardrobe" concept (multiple saved avatars per user)

### Win 2: Dress-Up Preview (Weeks 2-3)

A **glam preview viewport** — better than what you see in-world:
- Turntable rotation (drag to spin)
- Zoom into face/body regions
- Studio lighting (better than in-game ambient)
- Expression preview (trigger 57 Fcl_* morphs)
- Signature BlackBox visual treatment
- Undress to undergarments (toggle clothing primitive visibility)
- Try on different outfits (swap clothing primitives between compatible VRMs)

### Win 3: Makeup, Skin & Hair (Weeks 3-5)

| Control | Target | Mechanism |
|---------|--------|-----------|
| Skin tone | Body_00_SKIN + Face_00_SKIN | Texture swap (linked) |
| Lipstick | Face_00_SKIN (lip UV region) | UV-targeted color tint |
| Rouge/blush | Face_00_SKIN (cheek UV region) | UV-targeted color tint |
| Eye color | EyeIris_00_EYE | Texture swap or tint |
| Hair style | Hair mesh | Mesh swap (from ~39 exportable VRoid styles, curated to 8-12) |
| Hair color | Hair material | Color tint on existing texture |
| Eyeliner | FaceEyeline_00_FACE | Texture swap or tint |
| Nail color | Body_00_SKIN (nail UV regions) | UV-targeted color paint |

### Win 4: Outfit Swapping (Weeks 4-6)

**Key insight from Animator/Skinner work:** VRM submeshes can be torn apart. We've already had to do this to master spring bone animation and visemes in Animator. Clothing primitives (`Tops_01_CLOTH`, `Bottoms_01_CLOTH`, `Shoes_01_CLOTH`) are separate primitives within the Body mesh, each with their own material, skinned to the same 52 J_Bip skeleton.

**Swap strategy:**
1. Extract clothing primitive from donor VRM
2. Parent to recipient VRM's skeleton (same bone names, same hierarchy)
3. Apply recipient's bone transforms (so clothing follows body proportions)

**Fit quality depends on body similarity:**
- Same-proportion models (both unmodified fem, both unmodified masc): Clean fit
- Different-proportion models: Acceptable with minor clipping at extremes
- Cross-gender (masc clothing on fem): May work for some garments (jacket) but not others (fitted top)

**Building a clothing library:**
- Export VRoid models in each outfit variation → strip clothing primitives
- Catalog them by type (tops, bottoms, shoes, full-body)
- Player sees: "try on this shirt" — system swaps the Tops_01_CLOTH primitive

---

## Integration Architecture

### Decision: Option B — Lightweight Inline + Link Out

After evaluating the three options:

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| A: iframe | Clean separation | Communication complexity, feels disconnected | NO |
| B: Inline + link out | Fast for common tweaks, full power available | Context switch for advanced | **YES** |
| C: API-driven headless | Native feel | Duplicated UI, API complexity | NO for Phase 1 |

**Phase 1:** The Appearance shelf panel (300px width) shows:
- Avatar preview (top half — 3D viewport or high-quality rendered image)
- Quick controls (skin, eyes, hair color, outfit selector)
- "Open Avatar Studio" button → full Avatar app in new tab for deep customization

**Phase 2+:** As SuperMesh arrives, the inline controls expand. The full Avatar app becomes the "advanced mode" for parametric body/face sculpting, attachment management, clothing shopping.

### Shelf Panel Layout (300px width)

```
┌──────────────────────────┐
│    [Avatar Preview]      │  ← 3D or rendered image, 300×300
│    drag to rotate        │
│                          │
├──────────────────────────┤
│  ▸ Swap Avatar      [▾]  │  ← Carousel of saved/prebuilt
├──────────────────────────┤
│  ▸ Skin Tone        [◉]  │  ← Color picker
│  ▸ Hair Style       [▾]  │  ← Dropdown (8-12 options)
│  ▸ Hair Color       [◉]  │  ← Color picker
│  ▸ Eye Color        [◉]  │  ← Color picker
│  ▸ Lipstick         [◉]  │  ← Color picker
│  ▸ Outfit           [▾]  │  ← Clothing category browser
├──────────────────────────┤
│  [✨ Open Avatar Studio]  │  ← Full app in new tab
└──────────────────────────┘
```

### Viewport Decision

**3D preview in shelf panel:** Use World's Babylon.js scene camera zoomed to avatar (not a separate Three.js context). This avoids running two 3D engines simultaneously and gives an accurate representation of how the avatar looks in-world.

**Full Avatar Studio (separate tab):** Uses Three.js via the CharacterStudio fork. Different engine, but produces GLB output that World consumes. The visual difference between Three.js preview and Babylon.js in-world is acceptable.

### Communication Pattern

**Appearance Panel ↔ Avatar App:**
- Shelf panel writes to `localStorage` (same pattern as Animator auth)
- Key: `avatar_pending_changes` — JSON with modification instructions
- Avatar app reads on open, applies, exports
- On save: Avatar app uploads GLB → updates `avatar_url` → shelf panel refreshes preview

**Appearance Panel ↔ World Scene:**
- Panel dispatches custom event: `avatar:swap` with new avatar URL
- World's `AvatarDriverFactory` handles the swap (already supports hot-reload)
- Live preview in-world while browsing (stretch goal)

### Auth

Follow Animator's proven pattern:
- Shared Google OAuth via `/voice-ninja/auth/google`
- `localStorage` keys: `auth_user`, `auth_token`
- Shelf panel already runs in World's authenticated context
- Avatar app (if opened in new tab) reads same localStorage

---

## Shelf System Integration

### World Files to Modify

| File | Change | Purpose |
|------|--------|---------|
| `World/src/ui/shelves/panels/AppearancePanel.ts` | REWRITE | Replace "Coming Soon" with real controls |
| `World/src/ui/AvatarSelectionModal.ts` | MODIFY | Extract avatar carousel as reusable component |
| `World/src/avatars/AvatarDriverFactory.ts` | NONE | Already handles format detection |
| `World/src/avatars/VRMAvatarDriver.ts` | NONE | Already handles VRM/GLB loading |

### Design Tokens

Follow World's ShelfTheme (`World/src/ui/shelves/ShelfTheme.ts`):
- Background: `#0a0a0a` (bgDeep)
- Accent: `#00ff88`
- Text: `#e8e8e8`
- Panel borders: `#2a2a2a`
- Slider/picker styling: Match existing shelf widget patterns

---

## Phase Evolution

### Phase 1 (Now): VRM Quick Customization
- Avatar swap (prebuilt + upload)
- Skin/hair/eye/lip color
- Outfit toggle (clothing visibility)
- Outfit swap (cross-VRM clothing primitive transfer)
- Nail color
- Bone transform tuning (height, shoulder width, head scale)

### Phase 2 (Summer): + AI Mesh Support
- AI mesh import (link to Animator for retarget, then import GLB)
- Basic material tweaks for AI meshes (roughness, tint)
- Separate "avatar type" indicator in UI (VRM badge vs AI badge)

### Phase 3 (Late 2026): + SuperMesh
- Full parametric body/face sliders
- Clothing browser (marketplace integration)
- Attachment equip/unequip
- Makeup layer compositing
- "Open Avatar Studio" → full SuperMesh creator

---

## What the 300px Panel CAN'T Do

- Full parametric SuperMesh body sculpting (needs wide viewport)
- 3D clothing try-on with physics preview (needs compute)
- Attachment positioning/adjustment (needs 3D gizmos)
- Face structure editing (too many sliders for 300px)

These are "Open Avatar Studio" features. The shelf panel is for quick tweaks and outfit changes — the most frequent player actions. Deep customization is a separate session.

---

## Testing Strategy

1. **Shelf integration test:** Appearance panel renders in World's shelf, respects ShelfTheme tokens
2. **Avatar swap test:** Select prebuilt, verify World scene updates with new avatar
3. **Color picker test:** Change skin tone, verify both body and face materials update in sync
4. **Hair swap test:** Select different hair, verify mesh swap + spring bone physics still work
5. **Clothing toggle test:** Hide/show clothing primitives, verify body underneath is visible
6. **Clothing swap test:** Transfer tops from VRM-A to VRM-B, verify skeleton binding works
7. **Auth continuity test:** Open Avatar Studio from shelf, verify auth token carries over
8. **Export roundtrip test:** Modify in shelf, save, reload World, verify changes persisted

---

## References

- Shelf system: `World/src/ui/shelves/ShelfManager.ts`
- Appearance stub: `World/src/ui/shelves/panels/AppearancePanel.ts`
- IShelfPanel interface: `World/src/ui/shelves/IShelfPanel.ts`
- ShelfTheme tokens: `World/src/ui/shelves/ShelfTheme.ts`
- ShelfHost CSS: `World/src/ui/shelves/ShelfHost.ts`
- Avatar selection: `World/src/ui/AvatarSelectionModal.ts`
- Animator auth pattern: `blackBoxIKAnimator/src/auth/AuthManager.js`
- VRM material naming: ADR-001 (material detection by convention)

---

_Last Updated: 2026-02-26_
