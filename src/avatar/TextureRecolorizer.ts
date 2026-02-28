import { RawTexture, Texture } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';

export interface HSLTarget {
  hue: number; // 0–1
  saturation: number; // 0–1
  lightness: number; // 0–1
}

/**
 * Canvas-based HSL texture remapping for VRM avatar materials.
 *
 * Reads source albedoTexture pixels, converts RGB → HSL,
 * replaces hue + saturation with the target, and remaps luminance
 * so the target's lightness sets overall brightness while texture
 * detail (pores, shadows, highlights) is preserved as relative variation.
 */
export class TextureRecolorizer {
  /** Original unmodified pixel data + precomputed average luminance. */
  private cache = new Map<
    string,
    { pixels: Uint8Array; width: number; height: number; avgL: number }
  >();

  /** Last created recolored texture per material, for disposal. */
  private activeTextures = new Map<string, RawTexture>();

  /**
   * Read and cache original texture pixels. Call once per material
   * after VRM load, before any recoloring.
   */
  async cacheOriginalTexture(
    materialName: string,
    texture: Texture,
  ): Promise<void> {
    if (this.cache.has(materialName)) return;

    // Wait for texture to be GPU-ready before reading pixels
    if (!texture.isReady()) {
      await new Promise<void>((resolve) => {
        texture.onLoadObservable.addOnce(() => resolve());
      });
    }

    const size = texture.getSize();
    const raw = await texture.readPixels();
    if (!raw) {
      console.warn(
        `[TextureRecolorizer] readPixels returned null for "${materialName}"`,
      );
      return;
    }

    // TRUE copy — raw buffer may be reused/freed by the engine
    const view = raw as ArrayBufferView;
    const src = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    const pixels = new Uint8Array(src); // copies into new ArrayBuffer

    // Compute average luminance (HSL L) for luminance remapping.
    // Sample every 8th pixel for speed on large textures.
    let totalL = 0;
    let sampleCount = 0;
    const stride = 8;
    for (let i = 0; i < pixels.length; i += 4 * stride) {
      const a = pixels[i + 3];
      if (a === 0) continue; // skip fully transparent
      const r = pixels[i] / 255;
      const g = pixels[i + 1] / 255;
      const b = pixels[i + 2] / 255;
      totalL += (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
      sampleCount++;
    }
    const avgL = sampleCount > 0 ? totalL / sampleCount : 0.5;

    console.log(
      `[TextureRecolorizer] Cached "${materialName}": ${size.width}x${size.height}, ` +
        `${pixels.length} bytes, avgL=${avgL.toFixed(3)}`,
    );

    this.cache.set(materialName, {
      pixels,
      width: size.width,
      height: size.height,
      avgL,
    });
  }

  hasCached(materialName: string): boolean {
    return this.cache.has(materialName);
  }

  /**
   * HSL-remap cached pixels to the target and return a new RawTexture.
   *
   * @param intensity 0–1: blend between original (0) and fully recolored (1)
   * @param tintOffset -0.5–+0.5: darken (negative) or lighten (positive) the output
   */
  recolor(
    materialName: string,
    target: HSLTarget,
    scene: Scene,
    intensity: number = 1.0,
    tintOffset: number = 0,
  ): RawTexture | null {
    const entry = this.cache.get(materialName);
    if (!entry) {
      console.warn(`[TextureRecolorizer] recolor: no cache for "${materialName}"`);
      return null;
    }

    const { pixels, width, height, avgL } = entry;
    const out = new Uint8Array(pixels.length);
    const safeAvgL = avgL > 0.001 ? avgL : 0.5;
    const inv = 1 - intensity;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i] / 255;
      const g = pixels[i + 1] / 255;
      const b = pixels[i + 2] / 255;

      const [, , srcL] = rgbToHsl(r, g, b);

      // Remap luminance + tint offset
      const outL = Math.min(Math.max(
        target.lightness * (srcL / safeAvgL) + tintOffset, 0), 1);
      const [rr, rg, rb] = hslToRgb(target.hue, target.saturation, outL);

      // Blend with original based on intensity
      out[i] = Math.round((r * inv + rr * intensity) * 255);
      out[i + 1] = Math.round((g * inv + rg * intensity) * 255);
      out[i + 2] = Math.round((b * inv + rb * intensity) * 255);
      out[i + 3] = pixels[i + 3];
    }

    // Dispose previous recolored texture for this material
    const prev = this.activeTextures.get(materialName);
    if (prev) prev.dispose();

    const tex = RawTexture.CreateRGBATexture(
      out,
      width,
      height,
      scene,
      true, // generateMipMaps
      false, // invertY
      Texture.BILINEAR_SAMPLINGMODE,
    );
    tex.name = `${materialName}_recolored`;
    tex.hasAlpha = false;

    this.activeTextures.set(materialName, tex);
    return tex;
  }

  /** Convert hex color to full HSL target (hue, saturation, AND lightness). */
  static hexToHSLTarget(hex: string): HSLTarget {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = ((n >> 16) & 0xff) / 255;
    const g = ((n >> 8) & 0xff) / 255;
    const b = (n & 0xff) / 255;
    const [h, s, l] = rgbToHsl(r, g, b);
    return { hue: h, saturation: s, lightness: l };
  }

  dispose(): void {
    for (const tex of this.activeTextures.values()) {
      tex.dispose();
    }
    this.activeTextures.clear();
    this.cache.clear();
  }
}

// ---------------------------------------------------------------------------
// HSL conversion helpers (standard algorithm)
// ---------------------------------------------------------------------------

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;

  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;

  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l];

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3)];
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
}
