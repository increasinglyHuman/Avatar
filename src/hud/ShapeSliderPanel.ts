import type { ShapeParameterDriver } from '../avatar/ShapeParameterDriver.js';
import {
  SHAPE_PARAMETERS,
  SHAPE_PRESETS,
  CATEGORY_GROUPS,
} from '../avatar/ShapeParameterDefinitions.js';
import type { ShapeCategory, SectionId, ShapePreset } from '../avatar/ShapeParameterDefinitions.js';

const STYLE_ID = 'bb-avatar-shape-styles';

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.shape-panel {
  padding-top: 8px;
}

/* Section headers (Body / Face) */
.shape-section-header {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.3);
  padding: 12px 0 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.shape-section-header:first-child {
  border-top: none;
  padding-top: 4px;
}

/* Presets row */
.shape-presets {
  display: flex;
  gap: 4px;
  padding: 4px 0 10px;
  flex-wrap: wrap;
}
.preset-btn {
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-size: 11px;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}
.preset-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.8);
}
.preset-btn.active {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
  border-color: rgba(255, 255, 255, 0.2);
}

/* Collapsible category group */
.shape-group {
  margin-bottom: 2px;
}
.shape-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 0;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.shape-group-header:hover {
  background: rgba(255, 255, 255, 0.02);
}
.shape-group-label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
}
.shape-group-chevron {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  transition: transform 0.2s;
}
.shape-group.collapsed .shape-group-chevron {
  transform: rotate(-90deg);
}
.shape-group-body {
  padding: 4px 0 8px;
  overflow: hidden;
}
.shape-group.collapsed .shape-group-body {
  display: none;
}

/* Individual slider */
.shape-slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
}
.shape-slider-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
  min-width: 90px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.shape-slider-input {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.shape-slider-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid rgba(0, 0, 0, 0.3);
  cursor: pointer;
}
.shape-slider-input::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid rgba(0, 0, 0, 0.3);
  cursor: pointer;
}
.shape-slider-value {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  min-width: 26px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* Reset button */
.shape-reset-row {
  padding: 12px 0 8px;
  text-align: center;
}
.shape-reset-btn {
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  font-size: 11px;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}
.shape-reset-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
}
`;
  document.head.appendChild(style);
}

/**
 * Shape slider panel with collapsible category groups and presets.
 * Renders ~55 sliders organized into Body and Face sections.
 */
export class ShapeSliderPanel {
  private root: HTMLDivElement;
  private driver: ShapeParameterDriver;
  private sliderInputs: Map<string, HTMLInputElement> = new Map();
  private sliderValues: Map<string, HTMLSpanElement> = new Map();

  constructor(container: HTMLElement, driver: ShapeParameterDriver) {
    injectStyles();
    this.driver = driver;
    this.root = document.createElement('div');
    this.root.className = 'shape-panel';
    container.appendChild(this.root);
    this.render();
  }

  private render(): void {
    this.root.innerHTML = '';
    this.sliderInputs.clear();
    this.sliderValues.clear();

    const sections: SectionId[] = ['body', 'face'];

    for (const section of sections) {
      // Section header
      const sectionHeader = document.createElement('div');
      sectionHeader.className = 'shape-section-header';
      sectionHeader.textContent = section === 'body' ? 'Body' : 'Face';
      this.root.appendChild(sectionHeader);

      // Presets for this section
      const sectionPresets = SHAPE_PRESETS.filter((p) => p.section === section);
      if (sectionPresets.length > 0) {
        this.renderPresets(sectionPresets);
      }

      // Category groups for this section
      const groups = CATEGORY_GROUPS.filter((g) => g.section === section);
      for (const group of groups) {
        this.renderGroup(group.id, group.label, section === 'face');
      }
    }

    // Reset all button
    const resetRow = document.createElement('div');
    resetRow.className = 'shape-reset-row';
    const resetBtn = document.createElement('button');
    resetBtn.className = 'shape-reset-btn';
    resetBtn.textContent = 'Reset All';
    resetBtn.addEventListener('click', () => {
      this.driver.resetAll();
      this.syncAllSliders();
    });
    resetRow.appendChild(resetBtn);
    this.root.appendChild(resetRow);
  }

  private renderPresets(presets: ShapePreset[]): void {
    const row = document.createElement('div');
    row.className = 'shape-presets';

    for (const preset of presets) {
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.textContent = preset.label;
      btn.addEventListener('click', () => {
        this.driver.applyPreset(preset);
        this.syncAllSliders();
      });
      row.appendChild(btn);
    }

    this.root.appendChild(row);
  }

  private renderGroup(
    category: ShapeCategory,
    label: string,
    startCollapsed: boolean,
  ): void {
    const params = SHAPE_PARAMETERS.filter((p) => p.category === category);
    if (params.length === 0) return;

    const group = document.createElement('div');
    group.className = 'shape-group' + (startCollapsed ? ' collapsed' : '');

    // Header (click to toggle)
    const header = document.createElement('div');
    header.className = 'shape-group-header';

    const labelEl = document.createElement('span');
    labelEl.className = 'shape-group-label';
    labelEl.textContent = `${label} (${params.length})`;
    header.appendChild(labelEl);

    const chevron = document.createElement('span');
    chevron.className = 'shape-group-chevron';
    chevron.textContent = '\u25BC'; // ▼
    header.appendChild(chevron);

    header.addEventListener('click', () => {
      group.classList.toggle('collapsed');
    });
    group.appendChild(header);

    // Body (sliders)
    const body = document.createElement('div');
    body.className = 'shape-group-body';

    for (const param of params) {
      this.renderSlider(body, param.id, param.label, param.defaultValue);
    }

    group.appendChild(body);
    this.root.appendChild(group);
  }

  private renderSlider(
    container: HTMLElement,
    paramId: string,
    label: string,
    defaultValue: number,
  ): void {
    const row = document.createElement('div');
    row.className = 'shape-slider-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'shape-slider-label';
    labelEl.textContent = label;
    labelEl.title = label;
    row.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = 'range';
    input.className = 'shape-slider-input';
    input.min = '0';
    input.max = '100';
    input.value = String(this.driver.getValue(paramId));
    row.appendChild(input);

    const valueEl = document.createElement('span');
    valueEl.className = 'shape-slider-value';
    valueEl.textContent = String(this.driver.getValue(paramId));
    row.appendChild(valueEl);

    // Live update on input (while dragging)
    input.addEventListener('input', () => {
      const val = parseInt(input.value, 10);
      valueEl.textContent = String(val);
      this.driver.setValue(paramId, val);
    });

    // Double-click to reset to default
    input.addEventListener('dblclick', () => {
      input.value = String(defaultValue);
      valueEl.textContent = String(defaultValue);
      this.driver.setValue(paramId, defaultValue);
    });

    this.sliderInputs.set(paramId, input);
    this.sliderValues.set(paramId, valueEl);

    container.appendChild(row);
  }

  /** Sync all slider UI to current driver values (after preset or reset) */
  private syncAllSliders(): void {
    for (const [paramId, input] of this.sliderInputs) {
      const val = this.driver.getValue(paramId);
      input.value = String(val);
      const valueEl = this.sliderValues.get(paramId);
      if (valueEl) valueEl.textContent = String(val);
    }
  }

  dispose(): void {
    this.sliderInputs.clear();
    this.sliderValues.clear();
    this.root.remove();
  }
}
