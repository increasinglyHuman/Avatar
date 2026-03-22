import type { MaterialEditor } from '../avatar/MaterialEditor.js';
import type { VRMStructure } from '../types/index.js';
import {
  SKIN_PRESETS,
  EYE_PRESETS,
  HAIR_PRESETS,
  LIP_PRESETS,
} from '../types/index.js';
import { ColorSlotWidget } from './ColorSlotWidget.js';

/**
 * Body tab — skin, eye, hair, lip color editing using shared ColorSlotWidget.
 * Each slot gets the full HSV picker + preset swatches + intensity/tint sliders.
 */
export class BodyTab {
  private root: HTMLDivElement;
  private editor: MaterialEditor | null = null;
  private structure: VRMStructure | null = null;
  private widgets: Map<string, ColorSlotWidget> = new Map();

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'tab-content body-tab';
    container.appendChild(this.root);
  }

  connect(editor: MaterialEditor, structure: VRMStructure): void {
    this.editor = editor;
    this.structure = structure;
    this.render();
  }

  show(): void {
    this.root.style.display = 'block';
  }

  hide(): void {
    this.root.style.display = 'none';
  }

  dispose(): void {
    for (const w of this.widgets.values()) w.dispose();
    this.widgets.clear();
    this.root.remove();
    this.editor = null;
    this.structure = null;
  }

  private render(): void {
    // Dispose previous widgets
    for (const w of this.widgets.values()) w.dispose();
    this.widgets.clear();
    this.root.innerHTML = '';

    // Skin
    const skinWidget = new ColorSlotWidget(this.root, {
      label: 'Skin',
      presets: SKIN_PRESETS,
      initialColor: this.editor?.getSkinTone() ?? '#D4A574',
      onChange: async (hex, intensity, tint) => {
        if (!this.editor || !this.structure) return;
        await this.editor.setSkinTone(this.structure, hex, intensity, tint);
      },
    });
    this.widgets.set('skin', skinWidget);

    // Hair
    const hairWidget = new ColorSlotWidget(this.root, {
      label: 'Hair',
      presets: HAIR_PRESETS,
      initialColor: this.editor?.getHairColor() ?? '#1A0A2E',
      onChange: async (hex, intensity, tint) => {
        if (!this.editor || !this.structure) return;
        await this.editor.setHairColor(this.structure, hex, intensity, tint);
      },
    });
    this.widgets.set('hair', hairWidget);

    // Eyes
    const eyeWidget = new ColorSlotWidget(this.root, {
      label: 'Eyes',
      presets: EYE_PRESETS,
      initialColor: this.editor?.getEyeColor(this.structure!) ?? '#7B3F00',
      onChange: async (hex, intensity, tint) => {
        if (!this.editor || !this.structure) return;
        await this.editor.setEyeColor(this.structure, hex, intensity, tint);
      },
    });
    this.widgets.set('eyes', eyeWidget);

    // Lips
    const lipWidget = new ColorSlotWidget(this.root, {
      label: 'Lips',
      presets: LIP_PRESETS,
      initialColor: this.editor?.getLipColor(this.structure!) ?? '#CC4455',
      onChange: async (hex, intensity, tint) => {
        if (!this.editor || !this.structure) return;
        await this.editor.setLipColor(this.structure, hex, intensity, tint);
      },
    });
    this.widgets.set('lips', lipWidget);
  }
}
