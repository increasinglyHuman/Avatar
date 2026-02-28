import type { MaterialEditor } from '../avatar/MaterialEditor.js';
import type { VRMStructure, ColorPreset, SkinPreset } from '../types/index.js';
import {
  SKIN_PRESETS,
  EYE_PRESETS,
  HAIR_PRESETS,
  LIP_PRESETS,
} from '../types/index.js';

type SetColorFn = (structure: VRMStructure, hex: string) => void | Promise<void>;
type GetColorFn = () => string | null;

/**
 * Body tab — skin, eye, hair, lip color pickers with preset swatches.
 * Skin and hair use async HSL texture remapping for dramatic changes.
 * Eyes and lips use direct albedoColor multiplication.
 */
export class BodyTab {
  private root: HTMLDivElement;
  private editor: MaterialEditor | null = null;
  private structure: VRMStructure | null = null;
  private activeSwatch: Map<string, HTMLButtonElement> = new Map();

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

  private render(): void {
    this.root.innerHTML = '';

    this.addSkinSection();
    this.addAsyncColorSection('Hair', HAIR_PRESETS, 'hair',
      (s, hex) => this.editor!.setHairColor(s, hex),
      () => this.editor!.getHairColor(),
    );
    this.addColorSection('Eyes', EYE_PRESETS, 'eyes',
      (s, hex) => this.editor!.setEyeColor(s, hex),
      () => this.editor!.getEyeColor(this.structure!),
    );
    this.addColorSection('Lips', LIP_PRESETS, 'lips',
      (s, hex) => this.editor!.setLipColor(s, hex),
      () => this.editor!.getLipColor(this.structure!),
    );
  }

  // ---------------------------------------------------------------------------
  // Skin section — dual-tone swatches, async HSL remapping
  // ---------------------------------------------------------------------------

  private addSkinSection(): void {
    const section = document.createElement('div');
    section.className = 'color-section';

    const label = document.createElement('div');
    label.className = 'section-label';
    label.textContent = 'Skin';
    section.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'swatch-grid';

    for (const preset of SKIN_PRESETS) {
      const btn = this.createSkinSwatch(preset);
      btn.addEventListener('click', async () => {
        if (!this.editor || !this.structure) return;
        await this.editor.setSkinTone(this.structure, preset.baseColor);
        this.setActiveSwatch('skin', btn);
      });
      grid.appendChild(btn);
    }
    section.appendChild(grid);

    const customRow = this.createDebouncedPicker('skin', 150, async (hex) => {
      if (!this.editor || !this.structure) return;
      await this.editor.setSkinTone(this.structure, hex);
      this.clearActiveSwatch('skin');
    });
    section.appendChild(customRow);

    this.root.appendChild(section);
  }

  /** Dual-tone swatch showing base (top) and shade (bottom) colors. */
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
  // Async color section — for hair (HSL texture remapping)
  // ---------------------------------------------------------------------------

  private addAsyncColorSection(
    title: string,
    presets: ColorPreset[],
    slotKey: string,
    setColor: (structure: VRMStructure, hex: string) => Promise<void>,
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

    for (const preset of presets) {
      const btn = this.createSwatch(preset.color, preset.name, slotKey);
      btn.addEventListener('click', async () => {
        if (!this.editor || !this.structure) return;
        await setColor(this.structure, preset.color);
        this.setActiveSwatch(slotKey, btn);
      });
      grid.appendChild(btn);
    }
    section.appendChild(grid);

    const customRow = this.createDebouncedPicker(slotKey, 150, async (hex) => {
      if (!this.editor || !this.structure) return;
      await setColor(this.structure, hex);
      this.clearActiveSwatch(slotKey);
    });
    section.appendChild(customRow);

    this.root.appendChild(section);
  }

  // ---------------------------------------------------------------------------
  // Sync color section — for eyes and lips (instant albedoColor)
  // ---------------------------------------------------------------------------

  private addColorSection(
    title: string,
    presets: ColorPreset[],
    slotKey: string,
    setColor: SetColorFn,
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

    for (const preset of presets) {
      const btn = this.createSwatch(preset.color, preset.name, slotKey);
      btn.addEventListener('click', () => {
        if (!this.editor || !this.structure) return;
        setColor(this.structure, preset.color);
        this.setActiveSwatch(slotKey, btn);
      });
      grid.appendChild(btn);
    }
    section.appendChild(grid);

    const customRow = this.createCustomPicker(slotKey, (hex) => {
      if (!this.editor || !this.structure) return;
      setColor(this.structure, hex);
      this.clearActiveSwatch(slotKey);
    });
    section.appendChild(customRow);

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

  private createCustomPicker(
    slotKey: string,
    onChange: (hex: string) => void,
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
    input.addEventListener('input', () => onChange(input.value));
    row.appendChild(input);

    return row;
  }

  /** Custom picker with debounce for async texture remapping. */
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

  /** Read current model colors and highlight matching swatches. */
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
