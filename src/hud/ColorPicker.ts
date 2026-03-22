/**
 * ColorPicker — Canvas-based HSV color picker.
 *
 * Ported from BBWorlds (World/src/ui/components/ColorPicker.ts) for shared use
 * across the BlackBox suite. Dark-themed, compact mode for sidebar panels.
 *
 * Features: SV square + hue strip, hex input, mode selector (HEX/RGB/HSL/HSV),
 * recent color swatches with localStorage persistence, optional alpha slider.
 *
 * @example
 *   const picker = new ColorPicker({
 *     container: host,
 *     initialColor: '#ff8844',
 *     compact: true,
 *     onChange: (c) => applyColor(c.hex),
 *     onCommit: (c) => saveColor(c.hex),
 *   });
 */

// ─── Color math (exported for shared use) ────────────────────────────

export interface RGB { r: number; g: number; b: number }
export interface HSV { h: number; s: number; v: number }
export interface HSL { h: number; s: number; l: number }

export interface ColorResult {
  hex: string;
  rgb: RGB;
  hsv: HSV;
  hsl: HSL;
  alpha: number;
}

/** HSV → RGB.  h: 0-360, s/v: 0-1 → r/g/b: 0-255 */
export function hsvToRgb(h: number, s: number, v: number): RGB {
  h = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60)       { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else              { r = c; b = x; }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/** RGB → HSV.  r/g/b: 0-255 → h: 0-360, s/v: 0-1 */
export function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

/** HSV → HSL */
export function hsvToHsl(h: number, s: number, v: number): HSL {
  const l = v * (1 - s / 2);
  const sl = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
  return { h, s: sl, l };
}

/** HSL → HSV */
export function hslToHsv(h: number, s: number, l: number): HSV {
  const v = l + s * Math.min(l, 1 - l);
  const sv = v === 0 ? 0 : 2 * (1 - l / v);
  return { h, s: sv, v };
}

/** Hex string (#RGB or #RRGGBB) → RGB */
export function hexToRgb(hex: string): RGB | null {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
}

/** RGB → hex string (always #rrggbb lowercase) */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ─── Interfaces ──────────────────────────────────────────────────────

export interface ColorPickerOptions {
  container: HTMLElement;
  initialColor?: string;
  showAlpha?: boolean;
  showSwatches?: boolean;
  onChange?: (color: ColorResult) => void;
  onCommit?: (color: ColorResult) => void;
  compact?: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────

const STYLE_ID = 'bb-avatar-color-picker-styles';
const STORAGE_KEY = 'bb_avatar_recent_colors';
const MAX_SWATCHES = 10;

// ─── Styles (dark theme, matches Avatar sidebar) ─────────────────────

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.cp-root {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-family: 'Segoe UI', system-ui, sans-serif;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
    user-select: none;
    -webkit-user-select: none;
}
.cp-root.cp-compact { gap: 5px; }

/* SV + Hue row */
.cp-picker-row {
    display: flex;
    gap: 8px;
    align-items: stretch;
}
.cp-sv-wrap {
    position: relative;
    flex: 1;
    border-radius: 4px;
    overflow: hidden;
    cursor: crosshair;
    border: 1px solid rgba(255, 255, 255, 0.08);
}
.cp-sv-canvas { display: block; width: 100%; height: 100%; }
.cp-sv-cursor {
    position: absolute;
    width: 12px; height: 12px;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 0 2px rgba(0,0,0,.8);
    pointer-events: none;
    transform: translate(-50%, -50%);
}

/* Hue strip */
.cp-hue-wrap {
    position: relative;
    width: 20px;
    border-radius: 4px;
    overflow: hidden;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.08);
}
.cp-hue-canvas { display: block; width: 100%; height: 100%; }
.cp-hue-indicator {
    position: absolute;
    left: -1px; right: -1px;
    height: 3px;
    background: #fff;
    box-shadow: 0 0 2px rgba(0,0,0,.8);
    pointer-events: none;
    transform: translateY(-50%);
}

/* Alpha slider */
.cp-alpha-wrap {
    position: relative;
    height: 16px;
    border-radius: 4px;
    overflow: hidden;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.08);
}
.cp-alpha-canvas { display: block; width: 100%; height: 100%; }
.cp-alpha-indicator {
    position: absolute;
    top: -1px; bottom: -1px;
    width: 3px;
    background: #fff;
    box-shadow: 0 0 2px rgba(0,0,0,.8);
    pointer-events: none;
    transform: translateX(-50%);
}

/* Controls row */
.cp-controls {
    display: flex;
    align-items: center;
    gap: 6px;
}
.cp-preview {
    width: 28px; height: 28px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    flex-shrink: 0;
}
.cp-hex-input {
    width: 72px;
    padding: 4px 6px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.8);
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 12px;
    outline: none;
}
.cp-hex-input:focus {
    border-color: rgba(255, 255, 255, 0.3);
}
.cp-mode-select {
    padding: 3px 4px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.5);
    font-size: 11px;
    cursor: pointer;
    outline: none;
}
.cp-values {
    flex: 1;
    text-align: right;
    color: rgba(255, 255, 255, 0.5);
    font-size: 11px;
    font-family: 'Consolas', 'Courier New', monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Recent swatches */
.cp-swatches {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
}
.cp-swatch {
    width: 20px; height: 20px;
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    cursor: pointer;
    transition: transform 0.1s;
}
.cp-swatch:hover {
    transform: scale(1.15);
    border-color: rgba(255, 255, 255, 0.4);
}
.cp-swatch-clear {
    width: 20px; height: 20px;
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.3);
    transition: color 0.1s, border-color 0.1s;
}
.cp-swatch-clear:hover {
    color: #ff5555;
    border-color: #ff5555;
}
`;
  document.head.appendChild(style);
}

// ─── ColorPicker ─────────────────────────────────────────────────────

export class ColorPicker {
  private root: HTMLElement;
  private svCanvas: HTMLCanvasElement;
  private svCtx: CanvasRenderingContext2D;
  private svCursor: HTMLElement;
  private hueCanvas: HTMLCanvasElement;
  private hueCtx: CanvasRenderingContext2D;
  private hueIndicator: HTMLElement;
  private alphaWrap: HTMLElement | null = null;
  private alphaCanvas: HTMLCanvasElement | null = null;
  private alphaCtx: CanvasRenderingContext2D | null = null;
  private alphaIndicator: HTMLElement | null = null;
  private preview: HTMLElement;
  private hexInput: HTMLInputElement;
  private modeSelect: HTMLSelectElement;
  private valuesSpan: HTMLElement;
  private swatchRow: HTMLElement | null = null;

  private _h = 0;
  private _s = 0;
  private _v = 1;
  private _a = 1;

  private showAlpha: boolean;
  private showSwatches: boolean;
  private compact: boolean;
  private onChange: ((c: ColorResult) => void) | undefined;
  private onCommit: ((c: ColorResult) => void) | undefined;

  private svW: number;
  private svH: number;
  private hueH: number;

  private dragging: 'sv' | 'hue' | 'alpha' | null = null;
  private _onMouseMove: (e: MouseEvent) => void;
  private _onMouseUp: (e: MouseEvent) => void;

  constructor(options: ColorPickerOptions) {
    injectStyles();

    this.showAlpha = options.showAlpha ?? false;
    this.showSwatches = options.showSwatches ?? true;
    this.compact = options.compact ?? false;
    this.onChange = options.onChange;
    this.onCommit = options.onCommit;

    this.svW = this.compact ? 220 : 200;
    this.svH = this.compact ? 100 : 150;
    this.hueH = this.svH;

    const initRgb = hexToRgb(options.initialColor ?? '#ffffff') ?? { r: 255, g: 255, b: 255 };
    const initHsv = rgbToHsv(initRgb.r, initRgb.g, initRgb.b);
    this._h = initHsv.h;
    this._s = initHsv.s;
    this._v = initHsv.v;

    // ── Build DOM ──

    this.root = document.createElement('div');
    this.root.className = 'cp-root' + (this.compact ? ' cp-compact' : '');

    const pickerRow = document.createElement('div');
    pickerRow.className = 'cp-picker-row';

    // SV square
    const svWrap = document.createElement('div');
    svWrap.className = 'cp-sv-wrap';
    svWrap.style.height = this.svH + 'px';

    this.svCanvas = document.createElement('canvas');
    this.svCanvas.className = 'cp-sv-canvas';
    this.svCanvas.width = this.svW;
    this.svCanvas.height = this.svH;
    this.svCtx = this.svCanvas.getContext('2d', { willReadFrequently: false })!;

    this.svCursor = document.createElement('div');
    this.svCursor.className = 'cp-sv-cursor';

    svWrap.appendChild(this.svCanvas);
    svWrap.appendChild(this.svCursor);
    pickerRow.appendChild(svWrap);

    // Hue strip
    const hueWrap = document.createElement('div');
    hueWrap.className = 'cp-hue-wrap';
    hueWrap.style.height = this.hueH + 'px';

    this.hueCanvas = document.createElement('canvas');
    this.hueCanvas.className = 'cp-hue-canvas';
    this.hueCanvas.width = 20;
    this.hueCanvas.height = this.hueH;
    this.hueCtx = this.hueCanvas.getContext('2d', { willReadFrequently: false })!;

    this.hueIndicator = document.createElement('div');
    this.hueIndicator.className = 'cp-hue-indicator';

    hueWrap.appendChild(this.hueCanvas);
    hueWrap.appendChild(this.hueIndicator);
    pickerRow.appendChild(hueWrap);

    this.root.appendChild(pickerRow);

    // Alpha slider (optional)
    if (this.showAlpha) {
      this.alphaWrap = document.createElement('div');
      this.alphaWrap.className = 'cp-alpha-wrap';

      this.alphaCanvas = document.createElement('canvas');
      this.alphaCanvas.className = 'cp-alpha-canvas';
      this.alphaCanvas.width = this.svW + 20 + 8;
      this.alphaCanvas.height = 16;
      this.alphaCtx = this.alphaCanvas.getContext('2d', { willReadFrequently: false })!;

      this.alphaIndicator = document.createElement('div');
      this.alphaIndicator.className = 'cp-alpha-indicator';

      this.alphaWrap.appendChild(this.alphaCanvas);
      this.alphaWrap.appendChild(this.alphaIndicator);
      this.root.appendChild(this.alphaWrap);
    }

    // Controls row
    const controls = document.createElement('div');
    controls.className = 'cp-controls';

    this.preview = document.createElement('div');
    this.preview.className = 'cp-preview';
    controls.appendChild(this.preview);

    this.hexInput = document.createElement('input');
    this.hexInput.className = 'cp-hex-input';
    this.hexInput.type = 'text';
    this.hexInput.maxLength = 7;
    this.hexInput.spellcheck = false;
    controls.appendChild(this.hexInput);

    this.modeSelect = document.createElement('select');
    this.modeSelect.className = 'cp-mode-select';
    for (const mode of ['HEX', 'RGB', 'HSL', 'HSV']) {
      const opt = document.createElement('option');
      opt.value = mode;
      opt.textContent = mode;
      this.modeSelect.appendChild(opt);
    }
    controls.appendChild(this.modeSelect);

    this.valuesSpan = document.createElement('span');
    this.valuesSpan.className = 'cp-values';
    controls.appendChild(this.valuesSpan);

    this.root.appendChild(controls);

    // Swatches
    if (this.showSwatches) {
      this.swatchRow = document.createElement('div');
      this.swatchRow.className = 'cp-swatches';
      this.root.appendChild(this.swatchRow);
    }

    options.container.appendChild(this.root);

    // ── Initial render ──
    this.renderHueStrip();
    this.renderSvSquare();
    if (this.showAlpha) this.renderAlphaSlider();
    this.updateUI();
    this.renderSwatches();

    // ── Events ──
    svWrap.addEventListener('mousedown', (e) => { this.dragging = 'sv'; this.handleSv(e); });
    hueWrap.addEventListener('mousedown', (e) => { this.dragging = 'hue'; this.handleHue(e); });
    if (this.alphaWrap) {
      this.alphaWrap.addEventListener('mousedown', (e) => { this.dragging = 'alpha'; this.handleAlpha(e); });
    }

    this._onMouseMove = (e: MouseEvent) => {
      if (!this.dragging) return;
      e.preventDefault();
      if (this.dragging === 'sv') this.handleSv(e);
      else if (this.dragging === 'hue') this.handleHue(e);
      else if (this.dragging === 'alpha') this.handleAlpha(e);
    };
    this._onMouseUp = () => {
      if (this.dragging) { this.dragging = null; this.commit(); }
    };
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);

    this.hexInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { this.applyHexInput(); this.hexInput.blur(); }
    });
    this.hexInput.addEventListener('blur', () => this.applyHexInput());
    this.modeSelect.addEventListener('change', () => this.updateValuesDisplay());
  }

  // ── Public API ─────────────────────────────────────────────────────

  getColor(): ColorResult { return this.buildResult(); }

  setColor(hex: string): void {
    const rgb = hexToRgb(hex);
    if (!rgb) return;
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    this._h = hsv.h;
    this._s = hsv.s;
    this._v = hsv.v;
    this.renderSvSquare();
    if (this.showAlpha) this.renderAlphaSlider();
    this.updateUI();
  }

  setAlpha(alpha: number): void {
    this._a = Math.max(0, Math.min(1, alpha));
    if (this.showAlpha) this.renderAlphaSlider();
    this.updateUI();
  }

  dispose(): void {
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
    this.root.remove();
  }

  // ── Rendering ──────────────────────────────────────────────────────

  private renderSvSquare(): void {
    const ctx = this.svCtx, w = this.svW, h = this.svH;
    const rgb = hsvToRgb(this._h, 1, 1);
    ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
    ctx.fillRect(0, 0, w, h);
    const wg = ctx.createLinearGradient(0, 0, w, 0);
    wg.addColorStop(0, 'rgba(255,255,255,1)');
    wg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = wg;
    ctx.fillRect(0, 0, w, h);
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, 'rgba(0,0,0,0)');
    bg.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }

  private renderHueStrip(): void {
    const ctx = this.hueCtx, h = this.hueH;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#ff0000');
    grad.addColorStop(1 / 6, '#ffff00');
    grad.addColorStop(2 / 6, '#00ff00');
    grad.addColorStop(3 / 6, '#00ffff');
    grad.addColorStop(4 / 6, '#0000ff');
    grad.addColorStop(5 / 6, '#ff00ff');
    grad.addColorStop(1, '#ff0000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 20, h);
  }

  private renderAlphaSlider(): void {
    if (!this.alphaCanvas || !this.alphaCtx) return;
    const ctx = this.alphaCtx, w = this.alphaCanvas.width, h = this.alphaCanvas.height;
    const sz = 6;
    for (let y = 0; y < h; y += sz) {
      for (let x = 0; x < w; x += sz) {
        ctx.fillStyle = (x / sz + y / sz) % 2 === 0 ? '#cccccc' : '#888888';
        ctx.fillRect(x, y, sz, sz);
      }
    }
    const rgb = hsvToRgb(this._h, this._s, this._v);
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
    grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},1)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  private updateUI(): void {
    const result = this.buildResult();
    this.svCursor.style.left = this._s * this.svW + 'px';
    this.svCursor.style.top = (1 - this._v) * this.svH + 'px';
    this.hueIndicator.style.top = (this._h / 360) * this.hueH + 'px';
    if (this.alphaIndicator && this.alphaCanvas) {
      this.alphaIndicator.style.left = this._a * this.alphaCanvas.width + 'px';
    }
    this.preview.style.background = this.showAlpha
      ? `rgba(${result.rgb.r},${result.rgb.g},${result.rgb.b},${this._a})`
      : result.hex;
    if (document.activeElement !== this.hexInput) {
      this.hexInput.value = result.hex;
    }
    this.updateValuesDisplay();
  }

  private updateValuesDisplay(): void {
    const r = this.buildResult();
    const mode = this.modeSelect.value;
    let text = '';
    switch (mode) {
      case 'HEX': text = r.hex; if (this.showAlpha && this._a < 1) text += ' ' + Math.round(this._a * 100) + '%'; break;
      case 'RGB': text = `${r.rgb.r}, ${r.rgb.g}, ${r.rgb.b}`; break;
      case 'HSL': text = `${Math.round(r.hsl.h)}, ${Math.round(r.hsl.s * 100)}%, ${Math.round(r.hsl.l * 100)}%`; break;
      case 'HSV': text = `${Math.round(r.hsv.h)}, ${Math.round(r.hsv.s * 100)}%, ${Math.round(r.hsv.v * 100)}%`; break;
    }
    this.valuesSpan.textContent = text;
  }

  // ── Interaction ────────────────────────────────────────────────────

  private handleSv(e: MouseEvent): void {
    const rect = this.svCanvas.getBoundingClientRect();
    this._s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    this._v = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    if (this.showAlpha) this.renderAlphaSlider();
    this.updateUI();
    this.fireChange();
  }

  private handleHue(e: MouseEvent): void {
    const rect = this.hueCanvas.getBoundingClientRect();
    this._h = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)) * 360;
    this.renderSvSquare();
    if (this.showAlpha) this.renderAlphaSlider();
    this.updateUI();
    this.fireChange();
  }

  private handleAlpha(e: MouseEvent): void {
    if (!this.alphaCanvas) return;
    const rect = this.alphaCanvas.getBoundingClientRect();
    this._a = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    this.updateUI();
    this.fireChange();
  }

  private applyHexInput(): void {
    const val = this.hexInput.value.trim();
    const hex = val.startsWith('#') ? val : '#' + val;
    const rgb = hexToRgb(hex);
    if (!rgb) { this.hexInput.value = this.buildResult().hex; return; }
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    this._h = hsv.h;
    this._s = hsv.s;
    this._v = hsv.v;
    this.renderSvSquare();
    if (this.showAlpha) this.renderAlphaSlider();
    this.updateUI();
    this.fireChange();
    this.commit();
  }

  // ── Events ─────────────────────────────────────────────────────────

  private fireChange(): void { if (this.onChange) this.onChange(this.buildResult()); }

  private commit(): void {
    const result = this.buildResult();
    if (this.onCommit) this.onCommit(result);
    this.addRecentSwatch(result.hex);
  }

  private buildResult(): ColorResult {
    const rgb = hsvToRgb(this._h, this._s, this._v);
    const hsl = hsvToHsl(this._h, this._s, this._v);
    return { hex: rgbToHex(rgb.r, rgb.g, rgb.b), rgb, hsv: { h: this._h, s: this._s, v: this._v }, hsl, alpha: this._a };
  }

  // ── Recent swatches ────────────────────────────────────────────────

  private loadRecentSwatches(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const arr: unknown = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.filter((s): s is string => typeof s === 'string').slice(0, MAX_SWATCHES);
    } catch { return []; }
  }

  private addRecentSwatch(hex: string): void {
    const swatches = this.loadRecentSwatches().filter((s) => s !== hex);
    swatches.unshift(hex);
    if (swatches.length > MAX_SWATCHES) swatches.length = MAX_SWATCHES;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(swatches)); } catch { /* ignore */ }
    this.renderSwatches();
  }

  private renderSwatches(): void {
    if (!this.swatchRow) return;
    this.swatchRow.innerHTML = '';
    const swatches = this.loadRecentSwatches();
    if (swatches.length === 0) return;

    for (const hex of swatches) {
      const el = document.createElement('div');
      el.className = 'cp-swatch';
      el.style.background = hex;
      el.title = hex;
      el.addEventListener('click', () => { this.setColor(hex); this.fireChange(); this.commit(); });
      this.swatchRow.appendChild(el);
    }

    const clearBtn = document.createElement('div');
    clearBtn.className = 'cp-swatch-clear';
    clearBtn.title = 'Clear recent colors';
    clearBtn.textContent = '\u00D7';
    clearBtn.addEventListener('click', () => {
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      this.renderSwatches();
    });
    this.swatchRow.appendChild(clearBtn);
  }
}
