export type TabId = 'outfits' | 'body' | 'wardrobe';
export type TabChangeCallback = (tabId: TabId) => void;

const TAB_LABELS: { id: TabId; label: string }[] = [
  { id: 'outfits', label: 'Outfits' },
  { id: 'body', label: 'Body' },
  { id: 'wardrobe', label: 'Wardrobe' },
];

/**
 * Horizontal tab bar with 3 buttons.
 * Emits TabId on change. Highlights active tab.
 */
export class TabBar {
  private root: HTMLDivElement;
  private buttons: Map<TabId, HTMLButtonElement> = new Map();
  private activeTab: TabId = 'body';
  private onChange: TabChangeCallback | null = null;

  constructor(container: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'tab-bar';

    for (const tab of TAB_LABELS) {
      const btn = document.createElement('button');
      btn.className = 'tab-btn';
      btn.textContent = tab.label;
      btn.addEventListener('click', () => this.setActiveTab(tab.id));
      this.buttons.set(tab.id, btn);
      this.root.appendChild(btn);
    }

    this.highlightActive();
    container.appendChild(this.root);
  }

  setActiveTab(tabId: TabId): void {
    if (tabId === this.activeTab) return;
    this.activeTab = tabId;
    this.highlightActive();
    this.onChange?.(tabId);
  }

  getActiveTab(): TabId {
    return this.activeTab;
  }

  onTabChange(callback: TabChangeCallback): void {
    this.onChange = callback;
  }

  private highlightActive(): void {
    for (const [id, btn] of this.buttons) {
      btn.classList.toggle('active', id === this.activeTab);
    }
  }

  dispose(): void {
    this.root.remove();
    this.onChange = null;
  }
}
