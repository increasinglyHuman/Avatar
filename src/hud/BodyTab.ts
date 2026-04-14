import type { ShapeParameterDriver } from '../avatar/ShapeParameterDriver.js';
import type { CVBounceDriver, BounceParams } from '../avatar/CVBounceDriver.js';
import type { BreathingDriver } from '../avatar/BreathingDriver.js';
import type { BlinkDriver } from '../avatar/BlinkDriver.js';
import { ShapeSliderPanel } from './ShapeSliderPanel.js';

const PHYSICS_STYLE_ID = 'bb-avatar-physics-styles';

function injectPhysicsStyles(): void {
  if (document.getElementById(PHYSICS_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PHYSICS_STYLE_ID;
  style.textContent = `
.physics-section {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 8px;
  margin-top: 8px;
}
.physics-section-header {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.3);
  padding: 8px 0 4px;
}
.physics-region {
  margin-bottom: 2px;
}
.physics-region-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.physics-region-header:hover {
  background: rgba(255, 255, 255, 0.02);
}
.physics-region-label {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
}
.physics-region-chevron {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  transition: transform 0.2s;
}
.physics-region.collapsed .physics-region-chevron {
  transform: rotate(-90deg);
}
.physics-region-body {
  padding: 4px 0 8px;
  overflow: hidden;
}
.physics-region.collapsed .physics-region-body {
  display: none;
}
.physics-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0 8px;
}
.physics-toggle-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}
.physics-toggle {
  position: relative;
  width: 36px;
  height: 20px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  cursor: pointer;
  border: none;
  padding: 0;
  transition: background 0.2s;
}
.physics-toggle.on {
  background: rgba(120, 200, 120, 0.5);
}
.physics-toggle::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}
.physics-toggle.on::after {
  transform: translateX(16px);
}
`;
  document.head.appendChild(style);
}

/** Slider definition for a single bounce param */
interface PhysicsSliderDef {
  key: keyof BounceParams;
  label: string;
  min: number;
  max: number;
  step: number;
}

const SLIDER_DEFS: PhysicsSliderDef[] = [
  { key: 'bounce', label: 'Bounce', min: 0, max: 8, step: 0.1 },
  { key: 'drag', label: 'Drag', min: 0, max: 3, step: 0.05 },
  { key: 'spring', label: 'Spring', min: 0, max: 8, step: 0.1 },
  { key: 'maxEffect', label: 'Max', min: 0, max: 0.08, step: 0.002 },
];

const REGION_LABELS: Record<string, string> = {
  breast: 'Chest',
  belly: 'Belly',
  butt: 'Butt',
};

/**
 * Shape tab — parametric body & face sliders + physics bounce controls.
 * Wraps ShapeSliderPanel and connects to both ShapeParameterDriver and CVBounceDriver.
 */
export class BodyTab {
  private root: HTMLDivElement;
  private panel: ShapeSliderPanel | null = null;
  private cvBounce: CVBounceDriver | null = null;
  private breathing: BreathingDriver | null = null;
  private blink: BlinkDriver | null = null;
  private physicsSection: HTMLDivElement | null = null;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'tab-content body-tab';
    container.appendChild(this.root);
  }

  /** Connect the driver to create the slider panel */
  connectDriver(driver: ShapeParameterDriver): void {
    // Dispose existing panel if reconnecting
    this.panel?.dispose();
    this.root.innerHTML = '';
    this.panel = new ShapeSliderPanel(this.root, driver);
    // Re-render physics if already connected
    if (this.cvBounce) this.renderPhysics();
  }

  /** Connect the CV bounce driver to add physics sliders */
  connectCVBounce(bounce: CVBounceDriver): void {
    this.cvBounce = bounce;
    this.renderPhysics();
  }

  /** Connect breathing and blink drivers — renders toggles in the physics section */
  connectBreathingAndBlink(breathing: BreathingDriver, blink: BlinkDriver): void {
    this.breathing = breathing;
    this.blink = blink;
    this.renderPhysics();
  }

  private renderPhysics(): void {
    injectPhysicsStyles();

    // Remove old section if re-rendering
    if (this.physicsSection) {
      this.physicsSection.remove();
      this.physicsSection = null;
    }

    if (!this.cvBounce && !this.breathing && !this.blink) return;

    const section = document.createElement('div');
    section.className = 'physics-section';
    this.physicsSection = section;

    // Section header
    const header = document.createElement('div');
    header.className = 'physics-section-header';
    header.textContent = 'Physics';
    section.appendChild(header);

    // CV Bounce controls
    if (this.cvBounce) {
      const cv = this.cvBounce;
      const regionNames = cv.getRegionNames();

      // Enable/disable toggle
      this.renderToggle(section, 'Bounce', cv.isEnabled(), (on) => {
        cv.setEnabled(on);
      });

      // Per-region collapsible groups
      for (const regionName of regionNames) {
        const params = cv.getRegionParams(regionName);
        if (!params) continue;
        this.renderRegionGroup(section, regionName, params, cv);
      }
    }

    // Breathing toggle
    if (this.breathing) {
      this.renderToggle(section, 'Breathing', this.breathing.isEnabled(), (on) => {
        this.breathing?.setEnabled(on);
      });
    }

    // Blinking toggle
    if (this.blink) {
      this.renderToggle(section, 'Blinking', this.blink.isEnabled(), (on) => {
        this.blink?.setEnabled(on);
      });
    }

    this.root.appendChild(section);
  }

  private renderRegionGroup(
    container: HTMLElement,
    regionName: string,
    params: BounceParams,
    cv: CVBounceDriver,
  ): void {
    const group = document.createElement('div');
    group.className = 'physics-region collapsed';

    const header = document.createElement('div');
    header.className = 'physics-region-header';

    const label = document.createElement('span');
    label.className = 'physics-region-label';
    label.textContent = REGION_LABELS[regionName] ?? regionName;
    header.appendChild(label);

    const chevron = document.createElement('span');
    chevron.className = 'physics-region-chevron';
    chevron.textContent = '\u25BC';
    header.appendChild(chevron);

    header.addEventListener('click', () => {
      group.classList.toggle('collapsed');
    });
    group.appendChild(header);

    const body = document.createElement('div');
    body.className = 'physics-region-body';

    for (const def of SLIDER_DEFS) {
      const currentVal = params[def.key];
      this.renderPhysicsSlider(body, def, currentVal, regionName, cv);
    }

    group.appendChild(body);
    container.appendChild(group);
  }

  private renderPhysicsSlider(
    container: HTMLElement,
    def: PhysicsSliderDef,
    currentVal: number,
    regionName: string,
    cv: CVBounceDriver,
  ): void {
    const row = document.createElement('div');
    row.className = 'shape-slider-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'shape-slider-label';
    labelEl.textContent = def.label;
    row.appendChild(labelEl);

    const input = document.createElement('input');
    input.type = 'range';
    input.className = 'shape-slider-input';
    input.min = String(def.min);
    input.max = String(def.max);
    input.step = String(def.step);
    input.value = String(currentVal);
    row.appendChild(input);

    const valueEl = document.createElement('span');
    valueEl.className = 'shape-slider-value';
    valueEl.textContent = currentVal.toFixed(def.key === 'maxEffect' ? 3 : 1);
    row.appendChild(valueEl);

    input.addEventListener('input', () => {
      const val = parseFloat(input.value);
      valueEl.textContent = val.toFixed(def.key === 'maxEffect' ? 3 : 1);
      cv.setRegionParams(regionName, { [def.key]: val });
    });

    container.appendChild(row);
  }

  private renderToggle(
    container: HTMLElement,
    label: string,
    initialState: boolean,
    onChange: (on: boolean) => void,
  ): void {
    const row = document.createElement('div');
    row.className = 'physics-toggle-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'physics-toggle-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    const btn = document.createElement('button');
    btn.className = 'physics-toggle' + (initialState ? ' on' : '');
    btn.addEventListener('click', () => {
      const nowOn = !btn.classList.contains('on');
      btn.classList.toggle('on', nowOn);
      onChange(nowOn);
    });
    row.appendChild(btn);
    container.appendChild(row);
  }

  show(): void {
    this.root.style.display = 'block';
  }

  hide(): void {
    this.root.style.display = 'none';
  }

  dispose(): void {
    this.panel?.dispose();
    this.panel = null;
    this.physicsSection = null;
    this.root.remove();
  }
}
