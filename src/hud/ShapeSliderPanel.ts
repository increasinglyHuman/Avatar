import type { ShapeParameterDriver } from '../avatar/ShapeParameterDriver.js';
import {
  SHAPE_PARAMETERS,
  SHAPE_PRESETS,
  CATEGORY_GROUPS,
} from '../avatar/ShapeParameterDefinitions.js';
import type { ShapeCategory, SectionId, ShapePreset } from '../avatar/ShapeParameterDefinitions.js';
import type { ShapeStore, SavedShape } from '../avatar/ShapeStore.js';

const STYLE_ID = 'bb-avatar-shape-styles';
const MODE_KEY = 'bb-shape-mode';

type ShapeMode = 'simple' | 'detail';

/** Callback when a category group is expanded. SectionId + category for camera targeting. */
export type CategoryExpandCallback = (section: SectionId, category: ShapeCategory) => void;

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.shape-panel {
  padding-top: 4px;
}

/* Mode toggle row */
.shape-mode-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 4px 0 8px;
}
.shape-mode-toggle {
  display: flex;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.shape-mode-btn {
  padding: 4px 12px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.35);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.shape-mode-btn:hover {
  color: rgba(255, 255, 255, 0.6);
}
.shape-mode-btn.active {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.9);
}

/* Search bar */
.shape-search-row {
  padding: 0 0 8px;
}
.shape-search-input {
  width: 100%;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 11px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.shape-search-input:focus {
  border-color: rgba(255, 255, 255, 0.2);
}
.shape-search-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

/* Collapsible section (Body / Face) */
.shape-section {
  margin-bottom: 2px;
}
.shape-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0 6px;
  cursor: pointer;
  user-select: none;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.shape-section:first-of-type .shape-section-header {
  border-top: none;
  padding-top: 4px;
}
.shape-section-header:hover {
  background: rgba(255, 255, 255, 0.02);
}
.shape-section-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.3);
  font-weight: 600;
}
.shape-section-chevron {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.2);
  transition: transform 0.2s;
}
.shape-section.collapsed .shape-section-chevron {
  transform: rotate(-90deg);
}
.shape-section-body {
  overflow: hidden;
}
.shape-section.collapsed .shape-section-body {
  display: none;
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
.shape-group-modified {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.25);
  margin-left: 4px;
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

/* Per-category reset */
.shape-group-actions {
  display: flex;
  justify-content: flex-end;
  padding: 4px 0 2px;
}
.shape-cat-reset-btn {
  padding: 2px 8px;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  color: rgba(255, 255, 255, 0.25);
  cursor: pointer;
  font-size: 10px;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}
.shape-cat-reset-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
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
  transition: color 0.15s;
}
.shape-slider-label.modified {
  color: rgba(255, 255, 255, 0.75);
}
.shape-slider-label.modified::before {
  content: '\\2022 ';
  color: rgba(255, 255, 255, 0.4);
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

/* Reset all button */
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

/* Shape gallery */
.shape-gallery-section {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding-bottom: 8px;
  margin-bottom: 4px;
}
.shape-gallery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0 6px;
}
.shape-gallery-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.3);
  font-weight: 600;
}
.shape-save-btn {
  padding: 3px 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-size: 10px;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}
.shape-save-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.8);
}
.shape-gallery-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.shape-gallery-empty {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.2);
  font-style: italic;
  padding: 4px 0;
}
.shape-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.shape-card:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba(255, 255, 255, 0.1);
}
.shape-card-name {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.shape-card-meta {
  font-size: 9px;
  color: rgba(255, 255, 255, 0.2);
  margin-left: 8px;
  white-space: nowrap;
}
.shape-card-actions {
  display: flex;
  gap: 4px;
  margin-left: 8px;
  opacity: 0;
  transition: opacity 0.15s;
}
.shape-card:hover .shape-card-actions {
  opacity: 1;
}
.shape-card-action {
  padding: 2px 4px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  font-size: 10px;
  font-family: inherit;
  border-radius: 2px;
  transition: background 0.1s, color 0.1s;
}
.shape-card-action:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
}
.shape-card-action.delete:hover {
  color: rgba(255, 100, 100, 0.8);
}

/* Save shape dialog (inline) */
.shape-save-dialog {
  display: flex;
  gap: 4px;
  padding: 6px 0;
}
.shape-save-input {
  flex: 1;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 11px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
}
.shape-save-input:focus {
  border-color: rgba(255, 255, 255, 0.25);
}
.shape-save-confirm {
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 11px;
  font-family: inherit;
}
.shape-save-confirm:hover {
  background: rgba(255, 255, 255, 0.15);
}
.shape-save-cancel {
  padding: 4px 6px;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  font-size: 11px;
  font-family: inherit;
}

/* Symmetry toggle */
.shape-sym-btn {
  width: 18px;
  height: 18px;
  padding: 0;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.2);
  cursor: pointer;
  font-size: 12px;
  line-height: 18px;
  text-align: center;
  flex-shrink: 0;
  border-radius: 2px;
  transition: color 0.15s, background 0.15s;
}
.shape-sym-btn:hover {
  color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.06);
}
.shape-sym-btn.unlinked {
  color: rgba(255, 180, 100, 0.6);
}
.shape-split-container {
  padding-left: 12px;
}
.shape-split-label {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  min-width: 78px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
`;
  document.head.appendChild(style);
}

/**
 * Shape slider panel with progressive disclosure (Simple/Detail modes),
 * collapsible sections, search, per-category reset, and modified indicators.
 */
export class ShapeSliderPanel {
  private root: HTMLDivElement;
  private driver: ShapeParameterDriver;
  private shapeStore: ShapeStore | null = null;
  private galleryEl: HTMLDivElement | null = null;
  private sliderInputs: Map<string, HTMLInputElement> = new Map();
  private sliderValues: Map<string, HTMLSpanElement> = new Map();
  private sliderLabels: Map<string, HTMLSpanElement> = new Map();
  private groupLabels: Map<ShapeCategory, HTMLSpanElement> = new Map();
  private groupModifiedEls: Map<ShapeCategory, HTMLSpanElement> = new Map();
  private isMasculine: boolean = false;
  private mode: ShapeMode;
  private searchTerm: string = '';
  private onCategoryExpand: CategoryExpandCallback | null = null;
  private searchDebounceTimer: number | null = null;

  constructor(container: HTMLElement, driver: ShapeParameterDriver) {
    injectStyles();
    this.driver = driver;
    this.mode = (localStorage.getItem(MODE_KEY) as ShapeMode) || 'simple';
    this.root = document.createElement('div');
    this.root.className = 'shape-panel';
    container.appendChild(this.root);
    this.render();
  }

  /** Connect the shape store for save/load functionality */
  connectStore(store: ShapeStore): void {
    this.shapeStore = store;
    this.refreshGallery();
  }

  /** Register callback for when a category group is expanded */
  onExpand(cb: CategoryExpandCallback): void {
    this.onCategoryExpand = cb;
  }

  /** Update gender state and re-render (hides/renames params as needed) */
  setGender(isMasculine: boolean): void {
    if (this.isMasculine === isMasculine) return;
    this.isMasculine = isMasculine;
    this.render();
    this.syncAllSliders();
  }

  private render(): void {
    this.root.innerHTML = '';
    this.sliderInputs.clear();
    this.sliderValues.clear();
    this.sliderLabels.clear();
    this.groupLabels.clear();
    this.groupModifiedEls.clear();

    // Mode toggle
    this.renderModeToggle();

    // Shape gallery (save/load)
    this.renderGallery();

    // Search (Detail mode only)
    if (this.mode === 'detail') {
      this.renderSearch();
    }

    const sections: SectionId[] = ['body', 'face'];

    for (const section of sections) {
      this.renderSection(section);
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
      this.updateAllModifiedIndicators();
    });
    resetRow.appendChild(resetBtn);
    this.root.appendChild(resetRow);
  }

  private renderModeToggle(): void {
    const row = document.createElement('div');
    row.className = 'shape-mode-row';

    const toggle = document.createElement('div');
    toggle.className = 'shape-mode-toggle';

    const simpleBtn = document.createElement('button');
    simpleBtn.className = 'shape-mode-btn' + (this.mode === 'simple' ? ' active' : '');
    simpleBtn.textContent = 'Simple';
    simpleBtn.addEventListener('click', () => {
      if (this.mode === 'simple') return;
      this.mode = 'simple';
      this.searchTerm = '';
      localStorage.setItem(MODE_KEY, 'simple');
      this.render();
      this.syncAllSliders();
    });
    toggle.appendChild(simpleBtn);

    const detailBtn = document.createElement('button');
    detailBtn.className = 'shape-mode-btn' + (this.mode === 'detail' ? ' active' : '');
    detailBtn.textContent = 'Detail';
    detailBtn.addEventListener('click', () => {
      if (this.mode === 'detail') return;
      this.mode = 'detail';
      localStorage.setItem(MODE_KEY, 'detail');
      this.render();
      this.syncAllSliders();
    });
    toggle.appendChild(detailBtn);

    row.appendChild(toggle);
    this.root.appendChild(row);
  }

  private renderSearch(): void {
    const row = document.createElement('div');
    row.className = 'shape-search-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'shape-search-input';
    input.placeholder = 'Search sliders\u2026';
    input.value = this.searchTerm;

    input.addEventListener('input', () => {
      if (this.searchDebounceTimer !== null) {
        clearTimeout(this.searchDebounceTimer);
      }
      this.searchDebounceTimer = window.setTimeout(() => {
        this.searchTerm = input.value.toLowerCase().trim();
        this.applySearchFilter();
      }, 150);
    });

    row.appendChild(input);
    this.root.appendChild(row);
  }

  private renderSection(section: SectionId): void {
    const sectionEl = document.createElement('div');
    sectionEl.className = 'shape-section';
    sectionEl.dataset.section = section;

    // Collapsible header
    const header = document.createElement('div');
    header.className = 'shape-section-header';

    const title = document.createElement('span');
    title.className = 'shape-section-title';
    title.textContent = section === 'body' ? 'Body' : 'Face';
    header.appendChild(title);

    const chevron = document.createElement('span');
    chevron.className = 'shape-section-chevron';
    chevron.textContent = '\u25BC';
    header.appendChild(chevron);

    header.addEventListener('click', () => {
      sectionEl.classList.toggle('collapsed');
    });
    sectionEl.appendChild(header);

    // Section body (presets + groups)
    const body = document.createElement('div');
    body.className = 'shape-section-body';

    // Presets
    const sectionPresets = SHAPE_PRESETS.filter((p) => p.section === section);
    if (sectionPresets.length > 0) {
      this.renderPresets(body, sectionPresets);
    }

    // Category groups
    const groups = CATEGORY_GROUPS.filter((g) => g.section === section);
    for (const group of groups) {
      this.renderGroup(body, group.id, group.label, section);
    }

    sectionEl.appendChild(body);
    this.root.appendChild(sectionEl);
  }

  private renderPresets(container: HTMLElement, presets: ShapePreset[]): void {
    const row = document.createElement('div');
    row.className = 'shape-presets';

    for (const preset of presets) {
      const btn = document.createElement('button');
      btn.className = 'preset-btn';
      btn.textContent = preset.label;
      btn.addEventListener('click', () => {
        this.driver.applyPreset(preset);
        this.syncAllSliders();
        this.updateAllModifiedIndicators();
      });
      row.appendChild(btn);
    }

    container.appendChild(row);
  }

  private renderGroup(
    container: HTMLElement,
    category: ShapeCategory,
    label: string,
    section: SectionId,
  ): void {
    const allParams = SHAPE_PARAMETERS.filter((p) => {
      if (p.category !== category) return false;
      if (this.isMasculine && p.hideOnMasculine) return false;
      return true;
    });

    // In simple mode, only show essential params
    const visibleParams = this.mode === 'simple'
      ? allParams.filter((p) => p.essential)
      : allParams;

    if (visibleParams.length === 0) return;

    const group = document.createElement('div');
    group.className = 'shape-group collapsed';
    group.dataset.category = category;

    // Header
    const header = document.createElement('div');
    header.className = 'shape-group-header';

    const labelEl = document.createElement('span');
    labelEl.className = 'shape-group-label';
    this.groupLabels.set(category, labelEl);

    const modifiedEl = document.createElement('span');
    modifiedEl.className = 'shape-group-modified';
    this.groupModifiedEls.set(category, modifiedEl);

    // Compute label text with count and modified info
    this.updateGroupLabel(category, visibleParams.length);

    labelEl.appendChild(modifiedEl);
    header.appendChild(labelEl);

    const chevron = document.createElement('span');
    chevron.className = 'shape-group-chevron';
    chevron.textContent = '\u25BC';
    header.appendChild(chevron);

    header.addEventListener('click', () => {
      const wasCollapsed = group.classList.contains('collapsed');
      group.classList.toggle('collapsed');
      if (wasCollapsed && this.onCategoryExpand) {
        this.onCategoryExpand(section, category);
      }
    });
    group.appendChild(header);

    // Body (sliders)
    const body = document.createElement('div');
    body.className = 'shape-group-body';

    for (const param of visibleParams) {
      const displayLabel = (this.isMasculine && param.masculineLabel)
        ? param.masculineLabel
        : param.label;
      this.renderSlider(body, param.id, displayLabel, param.defaultValue);
    }

    // Per-category reset (Detail mode only)
    if (this.mode === 'detail') {
      const actions = document.createElement('div');
      actions.className = 'shape-group-actions';

      const resetBtn = document.createElement('button');
      resetBtn.className = 'shape-cat-reset-btn';
      resetBtn.textContent = `Reset ${label}`;
      resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        for (const param of allParams) {
          this.driver.setValue(param.id, param.defaultValue);
        }
        this.syncAllSliders();
        this.updateAllModifiedIndicators();
      });
      actions.appendChild(resetBtn);
      body.appendChild(actions);
    }

    group.appendChild(body);
    container.appendChild(group);
  }

  private renderSlider(
    container: HTMLElement,
    paramId: string,
    label: string,
    defaultValue: number,
  ): void {
    const isSym = this.driver.isSymmetric(paramId);
    const isSplit = this.driver.isSplit(paramId);

    // If split AND in detail mode, render two sliders instead of one
    if (isSplit && this.mode === 'detail') {
      this.renderSplitSliders(container, paramId, label, defaultValue);
      return;
    }

    const row = document.createElement('div');
    row.className = 'shape-slider-row';
    row.dataset.paramId = paramId;

    const currentVal = this.driver.getValue(paramId);
    const isModified = currentVal !== defaultValue;

    const labelEl = document.createElement('span');
    labelEl.className = 'shape-slider-label' + (isModified ? ' modified' : '');
    labelEl.textContent = label;
    labelEl.title = label;
    this.sliderLabels.set(paramId, labelEl);
    row.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = 'range';
    input.className = 'shape-slider-input';
    input.min = '0';
    input.max = '100';
    input.value = String(currentVal);
    row.appendChild(input);

    const valueEl = document.createElement('span');
    valueEl.className = 'shape-slider-value';
    valueEl.textContent = String(currentVal);
    row.appendChild(valueEl);

    // Symmetry toggle (Detail mode only, symmetric params only)
    if (isSym && this.mode === 'detail') {
      const symBtn = document.createElement('button');
      symBtn.className = 'shape-sym-btn';
      symBtn.textContent = '\u{1F517}'; // chain link emoji
      symBtn.title = 'Unlink L/R for asymmetric editing';
      symBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.driver.splitParam(paramId);
        // Re-render the group containing this param
        this.render();
        this.syncAllSliders();
      });
      row.appendChild(symBtn);
    }

    // Live update on input (while dragging)
    input.addEventListener('input', () => {
      const val = parseInt(input.value, 10);
      valueEl.textContent = String(val);
      this.driver.setValue(paramId, val);
      labelEl.classList.toggle('modified', val !== defaultValue);
      this.updateModifiedCount(paramId);
    });

    // Double-click to reset to default
    input.addEventListener('dblclick', () => {
      input.value = String(defaultValue);
      valueEl.textContent = String(defaultValue);
      this.driver.setValue(paramId, defaultValue);
      labelEl.classList.remove('modified');
      this.updateModifiedCount(paramId);
    });

    this.sliderInputs.set(paramId, input);
    this.sliderValues.set(paramId, valueEl);

    container.appendChild(row);
  }

  /** Render two independent L/R sliders for a split (unlinked) param */
  private renderSplitSliders(
    container: HTMLElement,
    paramId: string,
    label: string,
    defaultValue: number,
  ): void {
    const splitContainer = document.createElement('div');
    splitContainer.className = 'shape-split-container';
    splitContainer.dataset.paramId = paramId;

    const splitVals = this.driver.getSplitValues(paramId);
    if (!splitVals) return;

    // Re-link button row
    const headerRow = document.createElement('div');
    headerRow.className = 'shape-slider-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'shape-slider-label modified';
    labelEl.textContent = label;
    labelEl.title = `${label} (unlinked L/R)`;
    this.sliderLabels.set(paramId, labelEl);
    headerRow.appendChild(labelEl);

    // Spacer
    const spacer = document.createElement('span');
    spacer.style.flex = '1';
    headerRow.appendChild(spacer);

    const relinkBtn = document.createElement('button');
    relinkBtn.className = 'shape-sym-btn unlinked';
    relinkBtn.textContent = '\u{26D3}'; // broken chain
    relinkBtn.title = 'Re-link L/R (uses average)';
    relinkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.driver.unsplitParam(paramId);
      this.render();
      this.syncAllSliders();
    });
    headerRow.appendChild(relinkBtn);

    splitContainer.appendChild(headerRow);

    // Left slider
    this.renderSidedSlider(splitContainer, paramId, 'left', `${label} L`, splitVals.left, defaultValue);
    // Right slider
    this.renderSidedSlider(splitContainer, paramId, 'right', `${label} R`, splitVals.right, defaultValue);

    container.appendChild(splitContainer);
  }

  private renderSidedSlider(
    container: HTMLElement,
    paramId: string,
    side: 'left' | 'right',
    label: string,
    currentVal: number,
    defaultValue: number,
  ): void {
    const row = document.createElement('div');
    row.className = 'shape-slider-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'shape-split-label' + (currentVal !== defaultValue ? ' modified' : '');
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = 'range';
    input.className = 'shape-slider-input';
    input.min = '0';
    input.max = '100';
    input.value = String(currentVal);
    row.appendChild(input);

    const valueEl = document.createElement('span');
    valueEl.className = 'shape-slider-value';
    valueEl.textContent = String(currentVal);
    row.appendChild(valueEl);

    const splitKey = `${paramId}_${side}`;
    this.sliderInputs.set(splitKey, input);
    this.sliderValues.set(splitKey, valueEl);

    input.addEventListener('input', () => {
      const val = parseInt(input.value, 10);
      valueEl.textContent = String(val);
      this.driver.setSplitValue(paramId, side, val);
    });

    input.addEventListener('dblclick', () => {
      input.value = String(defaultValue);
      valueEl.textContent = String(defaultValue);
      this.driver.setSplitValue(paramId, side, defaultValue);
    });

    container.appendChild(row);
  }

  /** Apply search filter — hide/show slider rows based on search term */
  private applySearchFilter(): void {
    const groups = this.root.querySelectorAll<HTMLElement>('.shape-group');
    for (const group of groups) {
      const rows = group.querySelectorAll<HTMLElement>('.shape-slider-row');
      let anyVisible = false;
      for (const row of rows) {
        const paramId = row.dataset.paramId;
        if (!paramId) continue;
        const param = SHAPE_PARAMETERS.find((p) => p.id === paramId);
        if (!param) continue;
        const label = (this.isMasculine && param.masculineLabel)
          ? param.masculineLabel.toLowerCase()
          : param.label.toLowerCase();
        const match = !this.searchTerm || label.includes(this.searchTerm);
        row.style.display = match ? '' : 'none';
        if (match) anyVisible = true;
      }
      // Hide entire group if no sliders match
      group.style.display = anyVisible ? '' : 'none';
      // Auto-expand groups with search results
      if (anyVisible && this.searchTerm) {
        group.classList.remove('collapsed');
      }
    }

    // Hide sections if all their groups are hidden
    const sections = this.root.querySelectorAll<HTMLElement>('.shape-section');
    for (const section of sections) {
      const visibleGroups = section.querySelectorAll<HTMLElement>('.shape-group:not([style*="display: none"])');
      section.style.display = visibleGroups.length > 0 || !this.searchTerm ? '' : 'none';
    }
  }

  /** Update the modified count badge for the category that contains paramId */
  private updateModifiedCount(paramId: string): void {
    const param = SHAPE_PARAMETERS.find((p) => p.id === paramId);
    if (!param) return;
    this.updateGroupModifiedEl(param.category);
  }

  private updateGroupModifiedEl(category: ShapeCategory): void {
    const modifiedEl = this.groupModifiedEls.get(category);
    if (!modifiedEl) return;

    const catParams = SHAPE_PARAMETERS.filter((p) => {
      if (p.category !== category) return false;
      if (this.isMasculine && p.hideOnMasculine) return false;
      if (this.mode === 'simple' && !p.essential) return false;
      return true;
    });

    let modifiedCount = 0;
    for (const p of catParams) {
      if (this.driver.getValue(p.id) !== p.defaultValue) modifiedCount++;
    }

    modifiedEl.textContent = modifiedCount > 0
      ? ` ${modifiedCount}/${catParams.length}`
      : '';
  }

  private updateGroupLabel(category: ShapeCategory, totalCount: number): void {
    const labelEl = this.groupLabels.get(category);
    if (!labelEl) return;
    const group = CATEGORY_GROUPS.find((g) => g.id === category);
    if (!group) return;
    labelEl.textContent = `${group.label} (${totalCount})`;
    // Re-append the modified element since textContent clears children
    const modifiedEl = this.groupModifiedEls.get(category);
    if (modifiedEl) {
      labelEl.appendChild(modifiedEl);
      this.updateGroupModifiedEl(category);
    }
  }

  private updateAllModifiedIndicators(): void {
    // Update individual slider labels
    for (const [paramId, labelEl] of this.sliderLabels) {
      const param = SHAPE_PARAMETERS.find((p) => p.id === paramId);
      if (!param) continue;
      const val = this.driver.getValue(paramId);
      labelEl.classList.toggle('modified', val !== param.defaultValue);
    }
    // Update group counts
    for (const [category] of this.groupModifiedEls) {
      this.updateGroupModifiedEl(category);
    }
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

  // ---------------------------------------------------------------------------
  // Shape Gallery (save/load)
  // ---------------------------------------------------------------------------

  private renderGallery(): void {
    const section = document.createElement('div');
    section.className = 'shape-gallery-section';

    // Header with save button
    const header = document.createElement('div');
    header.className = 'shape-gallery-header';

    const label = document.createElement('span');
    label.className = 'shape-gallery-label';
    label.textContent = 'Saved Shapes';
    header.appendChild(label);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'shape-save-btn';
    saveBtn.textContent = '+ Save';
    saveBtn.addEventListener('click', () => this.showSaveDialog(section));
    header.appendChild(saveBtn);

    section.appendChild(header);

    // Gallery list (populated by refreshGallery)
    this.galleryEl = document.createElement('div');
    this.galleryEl.className = 'shape-gallery-list';
    section.appendChild(this.galleryEl);

    this.root.appendChild(section);
    this.refreshGallery();
  }

  /** Re-render the gallery list from store */
  private refreshGallery(): void {
    if (!this.galleryEl) return;
    this.galleryEl.innerHTML = '';

    if (!this.shapeStore) {
      const empty = document.createElement('div');
      empty.className = 'shape-gallery-empty';
      empty.textContent = 'No saved shapes';
      this.galleryEl.appendChild(empty);
      return;
    }

    const shapes = this.shapeStore.loadAll();
    if (shapes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'shape-gallery-empty';
      empty.textContent = 'No saved shapes';
      this.galleryEl.appendChild(empty);
      return;
    }

    // Show newest first
    for (const shape of [...shapes].reverse()) {
      this.renderShapeCard(shape);
    }
  }

  private renderShapeCard(shape: SavedShape): void {
    if (!this.galleryEl) return;

    const card = document.createElement('div');
    card.className = 'shape-card';

    // Click card to apply
    card.addEventListener('click', (e) => {
      // Don't apply if clicking an action button
      if ((e.target as HTMLElement).closest('.shape-card-actions')) return;
      if (!this.shapeStore) return;
      this.shapeStore.applyShape(shape, this.driver);
      this.syncAllSliders();
      this.updateAllModifiedIndicators();
    });

    const name = document.createElement('span');
    name.className = 'shape-card-name';
    name.textContent = shape.name;
    name.title = shape.name;
    card.appendChild(name);

    // Param count badge
    const meta = document.createElement('span');
    meta.className = 'shape-card-meta';
    const paramCount = Object.keys(shape.params).length;
    meta.textContent = `${paramCount}p`;
    meta.title = `${paramCount} parameters modified from defaults`;
    card.appendChild(meta);

    // Action buttons (visible on hover)
    const actions = document.createElement('div');
    actions.className = 'shape-card-actions';

    // Overwrite button
    const overwriteBtn = document.createElement('button');
    overwriteBtn.className = 'shape-card-action';
    overwriteBtn.textContent = 'Update';
    overwriteBtn.title = 'Overwrite with current sliders';
    overwriteBtn.addEventListener('click', () => {
      if (!this.shapeStore) return;
      this.shapeStore.update(shape.id, this.driver);
      this.refreshGallery();
    });
    actions.appendChild(overwriteBtn);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'shape-card-action delete';
    deleteBtn.textContent = 'Del';
    deleteBtn.title = 'Delete this shape';
    deleteBtn.addEventListener('click', () => {
      if (!this.shapeStore) return;
      this.shapeStore.delete(shape.id);
      this.refreshGallery();
    });
    actions.appendChild(deleteBtn);

    card.appendChild(actions);
    this.galleryEl.appendChild(card);
  }

  private showSaveDialog(container: HTMLElement): void {
    // Remove existing dialog if any
    const existing = container.querySelector('.shape-save-dialog');
    if (existing) { existing.remove(); return; }

    const dialog = document.createElement('div');
    dialog.className = 'shape-save-dialog';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'shape-save-input';
    input.placeholder = 'Shape name\u2026';
    input.maxLength = 50;
    dialog.appendChild(input);

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'shape-save-confirm';
    confirmBtn.textContent = 'Save';
    confirmBtn.addEventListener('click', () => {
      const name = input.value.trim();
      if (!name || !this.shapeStore) return;
      const gender = this.isMasculine ? 'masculine' : 'feminine';
      this.shapeStore.save(name, this.driver, gender);
      dialog.remove();
      this.refreshGallery();
    });
    dialog.appendChild(confirmBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'shape-save-cancel';
    cancelBtn.textContent = 'X';
    cancelBtn.addEventListener('click', () => dialog.remove());
    dialog.appendChild(cancelBtn);

    // Insert after header
    const header = container.querySelector('.shape-gallery-header');
    if (header && header.nextSibling) {
      container.insertBefore(dialog, header.nextSibling);
    } else {
      container.appendChild(dialog);
    }

    // Focus and handle Enter key
    input.focus();
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmBtn.click();
      if (e.key === 'Escape') cancelBtn.click();
    });
  }

  dispose(): void {
    if (this.searchDebounceTimer !== null) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.sliderInputs.clear();
    this.sliderValues.clear();
    this.sliderLabels.clear();
    this.groupLabels.clear();
    this.groupModifiedEls.clear();
    this.root.remove();
  }
}
