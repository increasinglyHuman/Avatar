/**
 * Wardrobe tab — placeholder for Sprint 2.
 * Will show clothing items by category for mix-and-match.
 */
export class WardrobeTab {
  private root: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'tab-content placeholder-tab';
    this.root.textContent = 'Clothing items — coming soon';
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
