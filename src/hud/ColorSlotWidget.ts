import { ColorPicker } from './ColorPicker.js';
import type { ColorPreset, SkinPreset } from '../types/index.js';

/**
 * Configuration for a color slot widget.
 * Each slot (skin, hair, eyes, lips, nails, clothing tint) gets one of these.
 */
export interface ColorSlotConfig {
  label: string;
  presets: Array<ColorPreset | SkinPreset>;
  /** Show intensity slider (0–100%). Default true. */
  hasIntensity?: boolean;
  /** Show tint slider (-50 to +50). Default true. */
  hasTint?: boolean;
  /** Initial color hex. */
  initialColor?: string;
  /** Called on every color/slider change (debounced 100ms). */
  onChange: (hex: string, intensity: number, tint: number) => Promise<void>;
}

interface SlotState {
  hex: string;
  intensity: number;
  tint: number;
}

const WIDGET_STYLE_ID = 'bb-avatar-color-slot-styles';

function injectWidgetStyles(): void {
  if (document.getElementById(WIDGET_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = WIDGET_STYLE_ID;
  style.textContent = `
.csw-root {
  margin-bottom: 16px;
}
.csw-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8px;
}
.csw-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.csw-swatch {
  width: 32px; height: 32px;
  border-radius: 6px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;
}
.csw-swatch:hover {
  border-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.08);
}
.csw-swatch.active {
  border-color: rgba(255, 255, 255, 0.8);
}
.csw-swatch--skin {
  width: 44px; height: 44px;
}
.csw-picker-wrap {
  margin: 8px 0;
}
.csw-slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
}
.csw-slider-row label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  width: 56px;
  flex-shrink: 0;
}
.csw-slider-row input[type="range"] {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 2px;
  outline: none;
}
.csw-slider-row input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px; height: 14px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid rgba(0, 0, 0, 0.3);
  cursor: pointer;
}
.csw-slider-row .csw-slider-val {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  width: 32px;
  text-align: right;
  font-family: 'Consolas', monospace;
}
`;
  document.head.appendChild(style);
}

/**
 * Self-contained color editing widget: preset swatches + HSV picker + sliders.
 * Used for skin, hair, eyes, lips, nails, and clothing tint — same UX everywhere.
 */
export class ColorSlotWidget {
  private root: HTMLDivElement;
  private picker: ColorPicker | null = null;
  private state: SlotState;
  private config: ColorSlotConfig;
  private activeSwatch: HTMLButtonElement | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(container: HTMLElement, config: ColorSlotConfig) {
    injectWidgetStyles();
    this.config = config;
    this.state = {
      hex: config.initialColor ?? '#ffffff',
      intensity: 1.0,
      tint: 0,
    };

    this.root = document.createElement('div');
    this.root.className = 'csw-root';
    container.appendChild(this.root);

    this.render();
  }

  private render(): void {
    this.root.innerHTML = '';

    // Label
    const label = document.createElement('div');
    label.className = 'csw-label';
    label.textContent = this.config.label;
    this.root.appendChild(label);

    // Preset swatches
    const presets = document.createElement('div');
    presets.className = 'csw-presets';

    for (const preset of this.config.presets) {
      const isSkin = 'baseColor' in preset;
      const btn = document.createElement('button');
      btn.className = 'csw-swatch' + (isSkin ? ' csw-swatch--skin' : '');

      if (isSkin) {
        const sp = preset as SkinPreset;
        btn.style.background = `linear-gradient(180deg, ${sp.baseColor} 50%, ${sp.shadeColor} 50%)`;
        btn.title = sp.name;
        btn.dataset.color = sp.baseColor;
      } else {
        const cp = preset as ColorPreset;
        btn.style.backgroundColor = cp.color;
        btn.title = cp.name;
        btn.dataset.color = cp.color;
      }

      btn.addEventListener('click', () => {
        const hex = btn.dataset.color!;
        this.state.hex = hex;
        this.picker?.setColor(hex);
        this.setActiveSwatch(btn);
        this.applyChange();
      });

      presets.appendChild(btn);
    }
    this.root.appendChild(presets);

    // HSV color picker
    const pickerWrap = document.createElement('div');
    pickerWrap.className = 'csw-picker-wrap';
    this.root.appendChild(pickerWrap);

    this.picker = new ColorPicker({
      container: pickerWrap,
      initialColor: this.state.hex,
      compact: true,
      showSwatches: true,
      onChange: (c) => {
        this.state.hex = c.hex;
        this.clearActiveSwatch();
        this.applyChange();
      },
    });

    // Intensity slider
    if (this.config.hasIntensity !== false) {
      this.root.appendChild(this.createSlider('Intensity', 0, 100, 100, (val) => {
        this.state.intensity = val / 100;
        this.applyChange();
      }));
    }

    // Tint slider
    if (this.config.hasTint !== false) {
      this.root.appendChild(this.createSlider('Tint', -50, 50, 0, (val) => {
        this.state.tint = val / 100;
        this.applyChange();
      }));
    }
  }

  private createSlider(
    label: string, min: number, max: number, initial: number,
    onChange: (val: number) => void,
  ): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'csw-slider-row';

    const lbl = document.createElement('label');
    lbl.textContent = label;
    row.appendChild(lbl);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.value = String(initial);

    const valSpan = document.createElement('span');
    valSpan.className = 'csw-slider-val';
    valSpan.textContent = String(initial);

    input.addEventListener('input', () => {
      valSpan.textContent = input.value;
      onChange(Number(input.value));
    });

    row.appendChild(input);
    row.appendChild(valSpan);
    return row;
  }

  private applyChange(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      void this.config.onChange(this.state.hex, this.state.intensity, this.state.tint);
    }, 100);
  }

  private setActiveSwatch(btn: HTMLButtonElement): void {
    if (this.activeSwatch) this.activeSwatch.classList.remove('active');
    btn.classList.add('active');
    this.activeSwatch = btn;
  }

  private clearActiveSwatch(): void {
    if (this.activeSwatch) this.activeSwatch.classList.remove('active');
    this.activeSwatch = null;
  }

  /** Update the widget to reflect an external color (e.g., syncing from model). */
  setColor(hex: string): void {
    this.state.hex = hex;
    this.picker?.setColor(hex);
  }

  /** Get current state. */
  getState(): { hex: string; intensity: number; tint: number } {
    return { ...this.state };
  }

  dispose(): void {
    this.picker?.dispose();
    this.root.remove();
  }
}
