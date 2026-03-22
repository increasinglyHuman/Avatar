# Skin Compositor Specification

**Sprint:** 3
**Status:** Draft
**Date:** 2026-03-22

---

## Overview

The Skin Compositor replaces texture-based skin tinting with a **layer-based compositing system**. Instead of HSL-remapping a complex body texture (which bleeds detail into the color), we build skin from clean alpha-masked layers composited onto a flat color fill.

This gives us:
- **Perfect skin tinting** — flat color base, no remapping artifacts
- **User anatomy preferences** — belly button, nipple variants, or none
- **Multiplicative variation** — every new layer multiplies total avatar combinations
- **User-generated content** — anyone can create a tattoo/detail PNG and add it
- **Sub-millisecond recomposite** — flat fill + alpha blending, no pixel-by-pixel HSL

## Layer Stack

Composited bottom-to-top on a 2048×2048 OffscreenCanvas:

| Layer | Name | Type | Source | Opacity |
|-------|------|------|--------|---------|
| 0 | **Skin Tone** | Solid color fill | User-selected hex color | 100% |
| 1 | **Anatomy** | Alpha-masked PNG | Catalog (belly button, nipples) | 100% |
| 2 | **Skin Detail** | Alpha-masked PNG | Catalog (freckles, moles, beauty marks) | 10–30% |
| 3 | **Nail Polish** | Alpha-masked PNG (tinted) | Nail mask + user color | 80–100% |
| 4 | **Clothing Paint** | Alpha-masked PNG | Catalog (socks, underwear, undershirts) | 100% |
| 5 | **Tattoos** | Alpha-masked PNG | Catalog + user-uploaded | 80–100% |
| 6 | **Makeup** | Alpha-masked PNG | Catalog (lipstick, eyeshadow) | 50–100% |
| 7 | **Temporary Effects** | Alpha-masked PNG | Session-only (mud, paint, zombie rot) | Variable |

### Layer Rules

- **Layer 0 is never a texture** — always `ctx.fillStyle = hex; ctx.fillRect(0, 0, 2048, 2048)`
- Layers 1–7 are all alpha-masked PNGs (RGBA, mostly transparent)
- Each layer alpha-blends onto the previous result: `ctx.globalCompositeOperation = 'source-over'`
- Recomposite only on layer change — NOT per frame
- Result uploaded to GPU as a single DynamicTexture applied to Body_00_SKIN + Face_00_SKIN

### Why Layer 0 Is Flat Color

VRoid's original body texture contains baked-in skin detail (shading, pores, subtle color variation). When HSL-remapping this texture to change skin tone, the existing detail fights the target hue — warm tones in the original texture bleed through, desaturation artifacts appear at extreme color shifts, and dark skin tones look muddy because the luminance remapping can't fully overcome the baked shading.

A flat color fill eliminates all of this. The skin tone is exact. Detail comes from purpose-built layers above it — anatomical features, freckles, etc. — designed to composite cleanly at any base color.

**Performance gain:** Flat fill + N alpha blends ≈ 0.3–0.8ms vs pixel-by-pixel HSL remapping ≈ 2–5ms.

## Asset Format

### Skin Layer PNGs

- **Resolution:** 2048×2048 (body), 1024×1024 (face)
- **Format:** RGBA PNG, 8-bit
- **Color mode:** Grayscale or low-saturation detail
  - Anatomy (belly button, nipples): subtle shadow/highlight, neutral tone
  - Freckles/moles: dark spots at low alpha (10–30%)
  - Tattoos: full color or grayscale (tintable if grayscale)
  - Nail mask: white fill on nail UV regions (tinted at composite time)
- **UV layout:** Must match VRoid body UV (vroid-standard)
- **File size target:** 50–200 KB per layer (mostly transparent)

### UV Template

We provide a blank UV template PNG for user-created layers:

```
public/assets/skin-layers/
├── uv-template-body.png          # 2048×2048, UV wireframe on transparent
├── uv-template-face.png          # 1024×1024, UV wireframe on transparent
├── uv-template-guide.png         # Labeled body regions (for artists)
```

Users paint onto the template in any image editor → export as RGBA PNG → drop into the Dressing Room → it composites automatically.

## Catalog Schema

Added to `items.json` alongside clothing/hair:

```json
{
  "skinLayers": [
    {
      "id": "anatomy-belly-01",
      "slot": "anatomy",
      "name": "Standard Belly Button",
      "asset": "skin-layers/anatomy/belly-standard.png",
      "thumbnail": "thumbnails/skin/belly-standard.png",
      "target": "body",
      "defaultOpacity": 1.0,
      "tintable": false,
      "source": "builtin"
    },
    {
      "id": "anatomy-nipples-01",
      "slot": "anatomy",
      "name": "Variant A",
      "asset": "skin-layers/anatomy/nipples-variant-a.png",
      "thumbnail": "thumbnails/skin/nipples-a.png",
      "target": "body",
      "defaultOpacity": 1.0,
      "tintable": true,
      "tintHint": "slightly darker than skin tone",
      "source": "builtin"
    },
    {
      "id": "detail-freckles-01",
      "slot": "detail",
      "name": "Light Freckles",
      "asset": "skin-layers/detail/freckles-light.png",
      "thumbnail": "thumbnails/skin/freckles-light.png",
      "target": "body",
      "defaultOpacity": 0.2,
      "tintable": false,
      "source": "builtin"
    },
    {
      "id": "tattoo-dragon-back",
      "slot": "tattoo",
      "name": "Dragon (Back)",
      "asset": "skin-layers/tattoo/dragon-back.png",
      "thumbnail": "thumbnails/skin/tattoo-dragon.png",
      "target": "body",
      "defaultOpacity": 0.9,
      "tintable": true,
      "source": "builtin"
    }
  ]
}
```

### Slot Types

| Slot | Max Active | User Uploadable | Description |
|------|-----------|-----------------|-------------|
| `anatomy` | 3 (belly + nipples + other) | No (curated only) | Body features, preference-based |
| `detail` | 2 | Yes | Freckles, moles, beauty marks, scars |
| `nails` | 1 | No | Nail mask (tinted with user color) |
| `clothing_paint` | 3 | No | Socks, underwear, undershirts |
| `tattoo` | 8 | Yes | Tattoos, body paint |
| `makeup` | 4 | Yes | Lipstick, eyeshadow, blush |
| `temporary` | 2 | No | Session-only effects |

## Character Manifest Integration

The manifest (CHARACTER_MANIFEST_SPEC.md) gains a `skinLayers` field:

```json
{
  "version": 1,
  "materials": {
    "skin": "#D4A574",
    "eyes": "#7B3F00",
    "hair": "#1A0A2E",
    "lips": "#CC4455",
    "nails": "#CC0033"
  },
  "skinLayers": [
    { "id": "anatomy-belly-01", "opacity": 1.0 },
    { "id": "anatomy-nipples-01", "opacity": 1.0, "tint": "#C49268" },
    { "id": "detail-freckles-01", "opacity": 0.15 },
    { "id": "tattoo-dragon-back", "opacity": 0.9 }
  ],
  "equipped": { ... }
}
```

## Variation Math

Each new layer **multiplies** total combinations:

| Asset Count | Calculation | Unique Skins |
|-------------|-------------|-------------:|
| 8 skin tones | 8 | 8 |
| + 2 belly variants + none | 8 × 3 | 24 |
| + 3 freckle patterns + none | 24 × 4 | 96 |
| + 3 nipple variants + none | 96 × 4 | 384 |
| + 1 tattoo + none | 384 × 2 | 768 |
| + 5 tattoos + none | 384 × 6 | 2,304 |
| + 10 tattoos (mix up to 8) | combinatorial explosion | ~50,000+ |

With just **~25 skin layer PNGs** (< 5 MB total), we generate thousands of unique looks. Every community-contributed tattoo multiplies this further.

Combined with the clothing catalog (166 garments × tinting × 16 hair × skin combos), the effective avatar variety is in the millions — from a total asset footprint under 300 MB.

## Runtime API

```typescript
class SkinCompositor {
  private bodyCanvas: OffscreenCanvas;   // 2048×2048
  private faceCanvas: OffscreenCanvas;   // 1024×1024
  private bodyCtx: OffscreenCanvasRenderingContext2D;
  private faceCtx: OffscreenCanvasRenderingContext2D;

  private layers: Map<string, { image: ImageBitmap; opacity: number; tint?: string }>;

  /**
   * Set the base skin tone. Triggers recomposite.
   */
  setSkinTone(hex: string): void;

  /**
   * Add or update a skin layer. Triggers recomposite.
   */
  setLayer(id: string, image: ImageBitmap, opacity: number, tint?: string): void;

  /**
   * Remove a skin layer. Triggers recomposite.
   */
  removeLayer(id: string): void;

  /**
   * Recomposite all layers and upload to GPU.
   * Called automatically on any change. ~0.3–0.8ms.
   */
  compose(scene: Scene): DynamicTexture;

  /**
   * Load a user-uploaded PNG and validate it.
   * Checks: RGBA, correct resolution, reasonable file size (< 2 MB).
   */
  async loadUserLayer(file: File): Promise<ImageBitmap>;
}
```

### Compose Algorithm

```typescript
compose(): DynamicTexture {
  const ctx = this.bodyCtx;

  // Layer 0: Flat skin tone
  ctx.fillStyle = this.skinToneHex;
  ctx.fillRect(0, 0, 2048, 2048);

  // Layers 1–7: Alpha-blend in order
  for (const [id, layer] of this.layers) {
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = 'source-over';

    if (layer.tint) {
      // Tinted layer: draw to temp canvas with multiply blend
      this.drawTinted(ctx, layer.image, layer.tint, layer.opacity);
    } else {
      ctx.drawImage(layer.image, 0, 0);
    }
  }

  ctx.globalAlpha = 1.0;

  // Upload to GPU
  const tex = new DynamicTexture("composited-skin", 2048, scene);
  const texCtx = tex.getContext();
  texCtx.drawImage(this.bodyCanvas, 0, 0);
  tex.update();
  return tex;
}
```

## Dressing Room UI

### Body Tab — Skin Section (Updated)

```
┌─ Skin ──────────────────────────┐
│ [ColorSlotWidget: tone picker]  │  ← flat color, no texture
│                                  │
│ Anatomy                          │
│ Belly: [standard] [deep] [none] │  ← radio-style toggles
│ Nipples: [A] [B] [C] [none]    │
│                                  │
│ Details                          │
│ [freckles-1] [freckles-2] [none]│  ← with opacity slider
│ Opacity ═══════●══════ 20%      │
│                                  │
│ Nails                            │
│ [ColorSlotWidget: nail color]   │
└──────────────────────────────────┘
```

### Tattoo Tab (New, or sub-section of Body)

```
┌─ Tattoos ────────────────────────┐
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐     │
│ │drag│ │ 🐉 │ │ ☠ │ │ + │     │
│ │on  │ │back│ │arm │ │ADD │     │
│ └────┘ └────┘ └────┘ └────┘     │
│                                   │
│ Active (3/8):                     │
│ [🐉 Dragon — Back] [×] ●── 90%  │
│ [☠ Skull — Arm]    [×] ●── 85%  │
│ [Custom Upload]    [×] ●── 70%  │
└───────────────────────────────────┘
```

## User-Generated Content Pipeline

### Creating a Tattoo

1. Download UV template: `https://poqpoq.com/avatar/assets/skin-layers/uv-template-body.png`
2. Open in any image editor (Photoshop, GIMP, Krita, etc.)
3. Paint tattoo design on the template (use UV wireframe as guide)
4. Delete the UV wireframe layer, keep only the tattoo
5. Export as RGBA PNG (transparent background)
6. In the Dressing Room, click "+" in the Tattoo section
7. Drop the PNG — system validates resolution and composites immediately

### Validation Rules

- Format: PNG only (RGBA)
- Resolution: Must be 2048×2048 (body) or 1024×1024 (face)
- File size: Max 2 MB (prevents abuse, keeps load times fast)
- Content: No validation beyond format (trust the user)

### Sharing (Future)

User-created tattoos could be shared via:
- Inventory system (gift to another player)
- Community marketplace (upload → review → publish)
- Outfit presets (tattoos included in saved looks)

---

## Implementation Plan

### Sprint 3a: Core Compositor
- `SkinCompositor.ts` — OffscreenCanvas layer compositing
- Flat color Layer 0 (replaces HSL texture remapping for skin)
- Wire into MaterialEditor (swap albedoTexture with composited result)
- Basic nail mask layer

### Sprint 3b: Anatomy & Detail Layers
- Create initial PNG assets (belly button, 2–3 nipple variants, 2 freckle patterns)
- UV template PNGs for user content creation
- Add to items.json catalog schema
- Dressing Room UI toggles (anatomy section in Body tab)

### Sprint 3c: Tattoo System
- Tattoo layer management (add/remove/opacity)
- User upload + validation
- Tattoo tab in Dressing Room UI
- Catalog integration (built-in tattoo library)

### Sprint 3d: Face Compositor
- Separate 1024×1024 face canvas
- Makeup layers (lipstick, eyeshadow, blush)
- Face detail (beauty marks)

---

*Last updated: 2026-03-22*
