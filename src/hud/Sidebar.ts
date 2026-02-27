const SIDEBAR_STYLES = `
  #avatar-sidebar {
    width: 320px;
    height: 100%;
    background: rgba(18, 18, 22, 0.95);
    border-left: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    color: rgba(255, 255, 255, 0.8);
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    font-size: 13px;
    overflow-y: auto;
  }
  #avatar-sidebar .sidebar-header {
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.5);
  }
  #avatar-sidebar .sidebar-content {
    flex: 1;
    padding: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.2);
    font-style: italic;
  }
  #avatar-sidebar .sidebar-footer {
    padding: 8px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    font-size: 11px;
    color: rgba(255, 255, 255, 0.3);
    display: flex;
    justify-content: space-between;
  }
`;

/**
 * Sidebar shell for avatar customization UI.
 * Sprint 0: empty placeholder. Tabs added in Sprint 1+.
 */
export class Sidebar {
  private root: HTMLDivElement;
  private styleEl: HTMLStyleElement;
  private fpsEl: HTMLSpanElement;

  constructor(container: HTMLElement) {
    // Inject styles
    this.styleEl = document.createElement('style');
    this.styleEl.textContent = SIDEBAR_STYLES;
    document.head.appendChild(this.styleEl);

    // Root
    this.root = document.createElement('div');
    this.root.id = 'avatar-sidebar';

    // Header
    const header = document.createElement('div');
    header.className = 'sidebar-header';
    header.textContent = 'Dressing Room';
    this.root.appendChild(header);

    // Content placeholder
    const content = document.createElement('div');
    content.className = 'sidebar-content';
    content.textContent = 'Outfits / Body / Wardrobe';
    this.root.appendChild(content);

    // Footer with version + FPS
    const footer = document.createElement('div');
    footer.className = 'sidebar-footer';

    const version = document.createElement('span');
    version.textContent = `v${__VERSION__}`;
    footer.appendChild(version);

    this.fpsEl = document.createElement('span');
    this.fpsEl.textContent = '-- FPS';
    footer.appendChild(this.fpsEl);

    this.root.appendChild(footer);

    container.appendChild(this.root);
  }

  setFPS(fps: number): void {
    this.fpsEl.textContent = `${Math.round(fps)} FPS`;
  }

  setVisible(visible: boolean): void {
    this.root.style.display = visible ? 'flex' : 'none';
  }

  dispose(): void {
    this.styleEl.remove();
    this.root.remove();
  }
}
