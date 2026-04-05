/**
 * Wardrobe tab — placeholder for Phase 3 (OpenSim clothing system).
 * VRM wardrobe has been retired; OpenSim clothing coming in ADR-012.
 */
export class WardrobeTab {
  private root: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'tab-content placeholder-tab';

    const placeholder = document.createElement('div');
    placeholder.style.flexDirection = 'column';
    placeholder.style.gap = '12px';
    placeholder.style.textAlign = 'center';
    placeholder.style.display = 'flex';
    placeholder.style.alignItems = 'center';
    placeholder.style.justifyContent = 'center';
    placeholder.style.minHeight = '200px';

    const title = document.createElement('div');
    title.textContent = 'Wardrobe';
    title.style.fontSize = '16px';
    title.style.color = 'rgba(255, 255, 255, 0.4)';
    placeholder.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.textContent = 'OpenSim clothing system — Phase 3';
    subtitle.style.fontSize = '11px';
    subtitle.style.color = 'rgba(255, 255, 255, 0.2)';
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
