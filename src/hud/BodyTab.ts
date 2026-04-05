import type { ShapeParameterDriver } from '../avatar/ShapeParameterDriver.js';
import { ShapeSliderPanel } from './ShapeSliderPanel.js';

/**
 * Shape tab — parametric body & face sliders.
 * Wraps ShapeSliderPanel and connects to the ShapeParameterDriver.
 */
export class BodyTab {
  private root: HTMLDivElement;
  private panel: ShapeSliderPanel | null = null;

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
    this.root.remove();
  }
}
