/**
 * Outfits tab — placeholder for Sprint 4.
 * Will show thumbnail gallery of saved outfit presets.
 */
export class OutfitsTab {
  private root: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'tab-content placeholder-tab';
    this.root.textContent = 'Saved outfits — coming soon';
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
