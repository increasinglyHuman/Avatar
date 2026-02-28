import type { MaterialEditor } from '../avatar/MaterialEditor.js';
import type { VRMStructure, ColorPreset, SkinPreset } from '../types/index.js';
import {
  SKIN_PRESETS,
  EYE_PRESETS,
  HAIR_PRESETS,
  LIP_PRESETS,
} from '../types/index.js';

type GetColorFn = () => string | null;
type AsyncSetColor = (
  structure: VRMStructure, hex: string,
  intensity: number, tint: number,
) => Promise<void>;

/** Per-slot state for color + sliders. */
interface SlotState {
  hex: string | null;
  intensity: number;
  tint: number;
}

/**
 * Body tab — skin, eye, hair, lip color pickers with preset swatches,
 * intensity sliders, and tint-shadow sliders.
 * All slots use async HSL texture remapping.
 */
export class BodyTab {
  private root: HTMLDivElement;
  private editor: MaterialEditor | null = null;
  private structure: VRMStructure | null = null;
  private activeSwatch: Map<string, HTMLButtonElement> = new Map();
  private slotState: Map<string, SlotState> = new Map();

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'tab-content body-tab';
    container.appendChild(this.root);
  }

  connect(editor: MaterialEditor, structure: VRMStructure): void {
    this.editor = editor;
    this.structure = structure;
    this.render();
    this.syncFromModel();
  }

  show(): void {
    this.root.style.display = 'block';
  }

  hide(): void {
    this.root.style.display = 'none';
  }

  dispose(): void {
    this.root.remove();
    this.editor = null;
    this.structure = null;
  }

  private getSlot(key: string): SlotState {
    let s = this.slotState.get(key);
    if (!s) {
      s = { hex: null, intensity: 1.0, tint: 0 };
      this.slotState.set(key, s);
    }
    return s;
  }

  private render(): void {
    this.root.innerHTML = '';

    this.addSkinSection();
    this.addColorSection('Hair', HAIR_PRESETS, 'hair',
      (s, hex, i, t) => this.editor!.setHairColor(s, hex, i, t),
      () => this.editor!.getHairColor(),
    );
    this.addColorSection('Eyes', EYE_PRESETS, 'eyes',
      (s, hex, i, t) => this.editor!.setEyeColor(s, hex, i, t),
      () => this.editor!.getEyeColor(this.structure!),
    );
    this.addColorSection('Lips', LIP_PRESETS, 'lips',
      (s, hex, i, t) => this.editor!.setLipColor(s, hex, i, t),
      () => this.editor!.getLipColor(this.structure!),
    );
  }

  // ---------------------------------------------------------------------------
  // Skin section — dual-tone swatches + sliders
  // ---------------------------------------------------------------------------

  private addSkinSection(): void {
    const slotKey = 'skin';
    const section = document.createElement('div');
    section.className = 'color-section';

    const label = document.createElement('div');
    label.className = 'section-label';
    label.textContent = 'Skin';
    section.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'swatch-grid';

    const applySlot = async (hex: string): Promise<void> => {
      if (!this.editor || !this.structure) return;
      const slot = this.getSlot(slotKey);
      slot.hex = hex;
      await this.editor.setSkinTone(this.structure, hex, slot.intensity, slot.tint);
    };

    for (const preset of SKIN_PRESETS) {
      const btn = this.createSkinSwatch(preset);
      btn.addEventListener('click', async () => {
        await applySlot(preset.baseColor);
        this.setActiveSwatch(slotKey, btn);
      });
      grid.appendChild(btn);
    }
    section.appendChild(grid);

    const customRow = this.createDebouncedPicker(slotKey, 150, async (hex) => {
      await applySlot(hex);
      this.clearActiveSwatch(slotKey);
    });
    section.appendChild(customRow);

    section.appendChild(this.createSliderRow('Intensity', slotKey, 'intensity',
      0, 100, 100, async (val) => {
        const slot = this.getSlot(slotKey);
        slot.intensity = val / 100;
        if (slot.hex) await applySlot(slot.hex);
      }));

    section.appendChild(this.createSliderRow('Tint', slotKey, 'tint',
      -50, 50, 0, async (val) => {
        const slot = this.getSlot(slotKey);
        slot.tint = val / 100;
        if (slot.hex) await applySlot(slot.hex);
      }));

    this.root.appendChild(section);
  }

  private createSkinSwatch(preset: SkinPreset): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'swatch swatch--skin';
    btn.style.background =
      `linear-gradient(180deg, ${preset.baseColor} 50%, ${preset.shadeColor} 50%)`;
    btn.title = preset.name;
    btn.dataset.slot = 'skin';
    btn.dataset.color = preset.baseColor;
    return btn;
  }

  // ---------------------------------------------------------------------------
  // Generic color section — swatches + custom picker + sliders
  // ---------------------------------------------------------------------------

  private addColorSection(
    title: string,
    presets: ColorPreset[],
    slotKey: string,
    setColor: AsyncSetColor,
    _getColor: GetColorFn,
  ): void {
    const section = document.createElement('div');
    section.className = 'color-section';

    const label = document.createElement('div');
    label.className = 'section-label';
    label.textContent = title;
    section.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'swatch-grid';

    const applySlot = async (hex: string): Promise<void> => {
      if (!this.editor || !this.structure) return;
      const slot = this.getSlot(slotKey);
      slot.hex = hex;
      await setColor(this.structure, hex, slot.intensity, slot.tint);
    };

    for (const preset of presets) {
      const btn = this.createSwatch(preset.color, preset.name, slotKey);
      btn.addEventListener('click', async () => {
        await applySlot(preset.color);
        this.setActiveSwatch(slotKey, btn);
      });
      grid.appendChild(btn);
    }
    section.appendChild(grid);

    const customRow = this.createDebouncedPicker(slotKey, 150, async (hex) => {
      await applySlot(hex);
      this.clearActiveSwatch(slotKey);
    });
    section.appendChild(customRow);

    section.appendChild(this.createSliderRow('Intensity', slotKey, 'intensity',
      0, 100, 100, async (val) => {
        const slot = this.getSlot(slotKey);
        slot.intensity = val / 100;
        if (slot.hex) await applySlot(slot.hex);
      }));

    section.appendChild(this.createSliderRow('Tint', slotKey, 'tint',
      -50, 50, 0, async (val) => {
        const slot = this.getSlot(slotKey);
        slot.tint = val / 100;
        if (slot.hex) await applySlot(slot.hex);
      }));

    this.root.appendChild(section);
  }

  // ---------------------------------------------------------------------------
  // Swatch and picker helpers
  // ---------------------------------------------------------------------------

  private createSwatch(color: string, title: string, slotKey: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'swatch';
    btn.style.backgroundColor = color;
    btn.title = title;
    btn.dataset.slot = slotKey;
    btn.dataset.color = color;
    return btn;
  }

  private createDebouncedPicker(
    slotKey: string,
    delayMs: number,
    onChange: (hex: string) => Promise<void>,
  ): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'custom-row';

    const label = document.createElement('label');
    label.textContent = 'Custom';
    row.appendChild(label);

    const input = document.createElement('input');
    input.type = 'color';
    input.value = '#ffffff';
    input.dataset.slot = slotKey;

    let timeout: ReturnType<typeof setTimeout> | null = null;
    input.addEventListener('input', () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => void onChange(input.value), delayMs);
    });
    row.appendChild(input);

    return row;
  }

  // ---------------------------------------------------------------------------
  // Slider helpers
  // ---------------------------------------------------------------------------

  private createSliderRow(
    label: string,
    slotKey: string,
    param: string,
    min: number,
    max: number,
    initial: number,
    onChange: (val: number) => Promise<void>,
  ): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'slider-row';

    const lbl = document.createElement('label');
    lbl.textContent = label;
    row.appendChild(lbl);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.value = String(initial);
    input.dataset.slot = slotKey;
    input.dataset.param = param;
    input.className = 'color-slider';

    const valLabel = document.createElement('span');
    valLabel.className = 'slider-value';
    valLabel.textContent = String(initial);

    let timeout: ReturnType<typeof setTimeout> | null = null;
    input.addEventListener('input', () => {
      valLabel.textContent = input.value;
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => void onChange(Number(input.value)), 100);
    });

    row.appendChild(input);
    row.appendChild(valLabel);
    return row;
  }

  // ---------------------------------------------------------------------------
  // Active swatch tracking
  // ---------------------------------------------------------------------------

  private setActiveSwatch(slotKey: string, btn: HTMLButtonElement): void {
    const prev = this.activeSwatch.get(slotKey);
    if (prev) prev.classList.remove('active');
    btn.classList.add('active');
    this.activeSwatch.set(slotKey, btn);
  }

  private clearActiveSwatch(slotKey: string): void {
    const prev = this.activeSwatch.get(slotKey);
    if (prev) prev.classList.remove('active');
    this.activeSwatch.delete(slotKey);
  }

  syncFromModel(): void {
    if (!this.editor || !this.structure) return;

    this.syncSlot('skin', this.editor.getSkinTone());
    this.syncSlot('eyes', this.editor.getEyeColor(this.structure));
    this.syncSlot('hair', this.editor.getHairColor());
    this.syncSlot('lips', this.editor.getLipColor(this.structure));
  }

  private syncSlot(slotKey: string, currentHex: string | null): void {
    if (!currentHex) return;
    const swatches = this.root.querySelectorAll<HTMLButtonElement>(
      `.swatch[data-slot="${slotKey}"]`,
    );
    for (const btn of swatches) {
      if (this.colorsMatch(btn.dataset.color ?? '', currentHex)) {
        this.setActiveSwatch(slotKey, btn);
        return;
      }
    }
  }

  private colorsMatch(a: string, b: string): boolean {
    return a.toLowerCase() === b.toLowerCase();
  }
}
