import { RawTexture, Texture } from '@babylonjs/core';
import type { BaseTexture, Scene } from '@babylonjs/core';

export interface HSLTarget {
  hue: number; // 0–1
  saturation: number; // 0–1
}

/**
 * Canvas-based HSL texture remapping for VRM avatar materials.
 *
 * Reads source albedoTexture pixels, converts RGB → HSL,
 * replaces hue + saturation with the target while preserving
 * luminance (pores, shadows, highlights), writes back as RawTexture.
 */
export class TextureRecolorizer {
  /** Original unmodified pixel data, keyed by material name. */
  private cache = new Map<
    string,
    { pixels: Uint8Array; width: number; height: number }
  >();

  /** Last created recolored texture per material, for disposal. */
  private activeTextures = new Map<string, RawTexture>();

  /**
   * Read and cache original texture pixels. Call once per material
   * after VRM load, before any recoloring.
   */
  async cacheOriginalTexture(
    materialName: string,
    texture: BaseTexture,
  ): Promise<void> {
    if (this.cache.has(materialName)) return;

    const size = texture.getSize();
    const raw = await texture.readPixels();
    if (!raw) {
      console.warn(
        `[TextureRecolorizer] readPixels returned null for "${materialName}"`,
      );
      return;
    }

    // Defensive copy so source is immutable
    const view = raw as ArrayBufferView;
    const pixels = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    this.cache.set(materialName, {
      pixels,
      width: size.width,
      height: size.height,
    });
  }

  hasCached(materialName: string): boolean {
    return this.cache.has(materialName);
  }

  /**
   * HSL-remap cached pixels to the target and return a new RawTexture.
   * Disposes the previous recolored texture for this material.
   */
  recolor(
    materialName: string,
    target: HSLTarget,
    scene: Scene,
  ): RawTexture | null {
    const entry = this.cache.get(materialName);
    if (!entry) return null;

    const { pixels, width, height } = entry;
    const out = new Uint8Array(pixels.length);

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i] / 255;
      const g = pixels[i + 1] / 255;
      const b = pixels[i + 2] / 255;

      const [, , srcL] = rgbToHsl(r, g, b);
      const [nr, ng, nb] = hslToRgb(target.hue, target.saturation, srcL);

      out[i] = Math.round(nr * 255);
      out[i + 1] = Math.round(ng * 255);
      out[i + 2] = Math.round(nb * 255);
      out[i + 3] = pixels[i + 3]; // alpha unchanged
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

  /** Convert hex color to HSL target (luminance ignored — comes from texture). */
  static hexToHSLTarget(hex: string): HSLTarget {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = ((n >> 16) & 0xff) / 255;
    const g = ((n >> 8) & 0xff) / 255;
    const b = (n & 0xff) / 255;
    const [h, s] = rgbToHsl(r, g, b);
    return { hue: h, saturation: s };
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
