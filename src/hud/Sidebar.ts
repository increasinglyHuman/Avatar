import { TabBar } from './TabBar.js';
import type { TabId } from './TabBar.js';
import { BodyTab } from './BodyTab.js';
import { OutfitsTab } from './OutfitsTab.js';
import { WardrobeTab } from './WardrobeTab.js';
import type { MaterialEditor } from '../avatar/MaterialEditor.js';
import type { VRMStructure } from '../types/index.js';

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
  }
  #avatar-sidebar .sidebar-header {
    padding: 16px 20px 12px;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.5);
  }

  /* Tab bar */
  .tab-bar {
    display: flex;
    padding: 0 12px;
    gap: 2px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  .tab-btn {
    flex: 1;
    padding: 8px 4px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: rgba(255, 255, 255, 0.35);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
    font-family: inherit;
  }
  .tab-btn:hover {
    color: rgba(255, 255, 255, 0.6);
  }
  .tab-btn.active {
    color: rgba(255, 255, 255, 0.9);
    border-bottom-color: rgba(255, 255, 255, 0.6);
  }

  /* Tab content area */
  .sidebar-content-area {
    flex: 1;
    overflow-y: auto;
    padding: 0 20px;
  }
  .tab-content { display: none; }
  .placeholder-tab {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    color: rgba(255, 255, 255, 0.2);
    font-style: italic;
  }

  /* Body tab: color sections */
  .body-tab { padding-top: 4px; }
  .color-section {
    padding: 12px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  .section-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.4);
    margin-bottom: 8px;
  }
  .swatch-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .swatch {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: border-color 0.15s;
    padding: 0;
  }
  .swatch:hover {
    border-color: rgba(255, 255, 255, 0.3);
  }
  .swatch.active {
    border-color: #fff;
  }
  .custom-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
  }
  .custom-row label {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
  }
  .custom-row input[type="color"] {
    width: 40px;
    height: 28px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    cursor: pointer;
    background: none;
    padding: 0;
  }

  /* Footer */
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
 * Sidebar shell with tab system.
 * Sprint 1: Body tab functional, Outfits/Wardrobe placeholders.
 */
export class Sidebar {
  private root: HTMLDivElement;
  private styleEl: HTMLStyleElement;
  private fpsEl: HTMLSpanElement;

  private tabBar: TabBar;
  private contentArea: HTMLDivElement;
  private outfitsTab: OutfitsTab;
  private bodyTab: BodyTab;
  private wardrobeTab: WardrobeTab;

  constructor(container: HTMLElement) {
    this.styleEl = document.createElement('style');
    this.styleEl.textContent = SIDEBAR_STYLES;
    document.head.appendChild(this.styleEl);

    this.root = document.createElement('div');
    this.root.id = 'avatar-sidebar';

    // Header
    const header = document.createElement('div');
    header.className = 'sidebar-header';
    header.textContent = 'Fit';
    this.root.appendChild(header);

    // Tab bar
    this.tabBar = new TabBar(this.root);
    this.tabBar.onTabChange((tabId) => this.switchTab(tabId));

    // Content area
    this.contentArea = document.createElement('div');
    this.contentArea.className = 'sidebar-content-area';
    this.root.appendChild(this.contentArea);

    // Tabs
    this.outfitsTab = new OutfitsTab(this.contentArea);
    this.bodyTab = new BodyTab(this.contentArea);
    this.wardrobeTab = new WardrobeTab(this.contentArea);

    // Show default tab
    this.switchTab('body');

    // Footer
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

  connectAvatar(editor: MaterialEditor, structure: VRMStructure): void {
    this.bodyTab.connect(editor, structure);
  }

  setFPS(fps: number): void {
    this.fpsEl.textContent = `${Math.round(fps)} FPS`;
  }

  setVisible(visible: boolean): void {
    this.root.style.display = visible ? 'flex' : 'none';
  }

  private switchTab(tabId: TabId): void {
    this.outfitsTab.hide();
    this.bodyTab.hide();
    this.wardrobeTab.hide();

    switch (tabId) {
      case 'outfits':
        this.outfitsTab.show();
        break;
      case 'body':
        this.bodyTab.show();
        break;
      case 'wardrobe':
        this.wardrobeTab.show();
        break;
    }
  }

  dispose(): void {
    this.outfitsTab.dispose();
    this.bodyTab.dispose();
    this.wardrobeTab.dispose();
    this.tabBar.dispose();
    this.styleEl.remove();
    this.root.remove();
  }
}
