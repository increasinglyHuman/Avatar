/**
 * Body/Shape tab — placeholder for Phase 1 (parametric shape sliders).
 * VRM color editing has been retired; OpenSim shape sliders coming in ADR-010.
 */
export class BodyTab {
  private root: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'tab-content body-tab';

    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder-tab';
    placeholder.style.flexDirection = 'column';
    placeholder.style.gap = '12px';
    placeholder.style.textAlign = 'center';

    const title = document.createElement('div');
    title.textContent = 'Shape';
    title.style.fontSize = '16px';
    title.style.color = 'rgba(255, 255, 255, 0.4)';
    placeholder.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.textContent = 'Parametric body & face sliders — Phase 1';
    subtitle.style.fontSize = '11px';
    placeholder.appendChild(subtitle);

    this.root.appendChild(placeholder);
    container.appendChild(this.root);
  }

  show(): void {
    this.root.style.display = 'flex';
  }

  hide(): void {
    this.root.style.display = 'none';
  }

  dispose(): void {
    this.root.remove();
  }
}
