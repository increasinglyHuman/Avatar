import { TabBar } from './TabBar.js';
import type { TabId } from './TabBar.js';
import { BodyTab } from './BodyTab.js';
import { SkinTab } from './SkinTab.js';
import { OutfitsTab } from './OutfitsTab.js';
import { WardrobeTab } from './WardrobeTab.js';
import type { ShapeParameterDriver } from '../avatar/ShapeParameterDriver.js';
import type { CVBounceDriver } from '../avatar/CVBounceDriver.js';
import type { BreathingDriver } from '../avatar/BreathingDriver.js';
import type { BlinkDriver } from '../avatar/BlinkDriver.js';
import type { SkinMaterialManager } from '../avatar/SkinMaterialManager.js';
import type { OpenSimClothingManager } from '../avatar/OpenSimClothingManager.js';
import type { OpenSimCatalog } from '../avatar/OpenSimCatalog.js';
import type { AlphaMaskManager } from '../avatar/AlphaMaskManager.js';
import type { Engine, WebGPUEngine } from '@babylonjs/core';
import type { ManifestSerializer } from '../avatar/ManifestSerializer.js';
import type { OutfitStore } from '../avatar/OutfitStore.js';

const SIDEBAR_STYLES = `
  #avatar-sidebar {
    width: 400px;
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
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .gender-icons {
    display: flex;
    gap: 4px;
  }
  .gender-icon-btn {
    width: 30px;
    height: 30px;
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: background 0.15s, border-color 0.15s, opacity 0.15s;
    opacity: 0.35;
  }
  .gender-icon-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    opacity: 0.6;
  }
  .gender-icon-btn.active {
    opacity: 1;
    border-color: rgba(255, 255, 255, 0.25);
    background: rgba(255, 255, 255, 0.06);
  }
  .gender-icon-btn.loading {
    opacity: 0.3;
    pointer-events: none;
  }
  .gender-icon-btn svg {
    width: 16px;
    height: 16px;
    fill: white;
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
  .swatch--skin {
    width: 44px;
    height: 44px;
    border-radius: 6px;
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

  /* Sliders */
  .slider-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 6px;
  }
  .slider-row label {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.4);
    min-width: 52px;
  }
  .slider-row .color-slider {
    flex: 1;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }
  .slider-row .color-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid rgba(0, 0, 0, 0.3);
    cursor: pointer;
  }
  .slider-row .color-slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid rgba(0, 0, 0, 0.3);
    cursor: pointer;
  }
  .slider-row .slider-value {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    min-width: 24px;
    text-align: right;
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
 * Phase 0: Shell with placeholder tabs (OpenSim pivot).
 */
export class Sidebar {
  private root: HTMLDivElement;
  private styleEl: HTMLStyleElement;
  private fpsEl: HTMLSpanElement;

  private tabBar: TabBar;
  private contentArea: HTMLDivElement;
  private outfitsTab: OutfitsTab;
  private bodyTab: BodyTab;
  private skinTab: SkinTab;
  private wardrobeTab: WardrobeTab;
  private femaleBtn: HTMLButtonElement | null = null;
  private maleBtn: HTMLButtonElement | null = null;
  private onGenderSwap: ((isFeminine: boolean) => Promise<void>) | null = null;
  private isFeminine = true;

  constructor(container: HTMLElement) {
    this.styleEl = document.createElement('style');
    this.styleEl.textContent = SIDEBAR_STYLES;
    document.head.appendChild(this.styleEl);

    this.root = document.createElement('div');
    this.root.id = 'avatar-sidebar';

    // Header
    const header = document.createElement('div');
    header.className = 'sidebar-header';

    const headerLabel = document.createElement('span');
    headerLabel.textContent = 'Avatar';
    header.appendChild(headerLabel);

    // Gender icon pair
    const genderIcons = document.createElement('div');
    genderIcons.className = 'gender-icons';

    // Female icon (simplified silhouette)
    this.femaleBtn = document.createElement('button');
    this.femaleBtn.className = 'gender-icon-btn active';
    this.femaleBtn.title = 'Female';
    this.femaleBtn.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="none" stroke="white" stroke-width="2"/><path d="M12 12c-4 0-7 2.5-7 5.5V20h14v-2.5c0-3-3-5.5-7-5.5z" fill="white"/></svg>`;
    this.femaleBtn.addEventListener('click', () => {
      if (!this.isFeminine) this.handleGenderSwap();
    });
    genderIcons.appendChild(this.femaleBtn);

    // Male icon (broader shoulders silhouette)
    this.maleBtn = document.createElement('button');
    this.maleBtn.className = 'gender-icon-btn';
    this.maleBtn.title = 'Male';
    this.maleBtn.innerHTML = `<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="4" fill="none" stroke="white" stroke-width="2"/><path d="M12 11c-5 0-8 2.5-8 5.5V20h16v-3.5c0-3-3-5.5-8-5.5z" fill="white"/></svg>`;
    this.maleBtn.addEventListener('click', () => {
      if (this.isFeminine) this.handleGenderSwap();
    });
    genderIcons.appendChild(this.maleBtn);

    header.appendChild(genderIcons);
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
    this.skinTab = new SkinTab(this.contentArea);
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

  connectShapeDriver(driver: ShapeParameterDriver): void {
    this.bodyTab.connectDriver(driver);
  }

  connectCVBounce(bounce: CVBounceDriver): void {
    this.bodyTab.connectCVBounce(bounce);
  }

  connectBreathingAndBlink(breathing: BreathingDriver, blink: BlinkDriver): void {
    this.bodyTab.connectBreathingAndBlink(breathing, blink);
  }

  connectSkinManager(manager: SkinMaterialManager): void {
    this.skinTab.connectManager(manager);
  }

  connectOutfits(serializer: ManifestSerializer, store: OutfitStore, engine: Engine | WebGPUEngine): void {
    this.outfitsTab.connect(serializer, store, engine, () => {
      // When an outfit is loaded, the shape sliders need to resync
      // Future: also resync skin tab selections
    });
  }

  connectWardrobe(
    catalog: OpenSimCatalog,
    clothingMgr: OpenSimClothingManager,
    alphaMgr: AlphaMaskManager,
  ): void {
    this.wardrobeTab.connect(catalog, clothingMgr, alphaMgr);
  }

  /** Register callback for gender swap (called by AvatarLifecycle) */
  onModelSwap(callback: (isFeminine: boolean) => Promise<void>): void {
    this.onGenderSwap = callback;
  }

  private async handleGenderSwap(): Promise<void> {
    if (!this.femaleBtn || !this.maleBtn || !this.onGenderSwap) return;

    this.femaleBtn.classList.add('loading');
    this.maleBtn.classList.add('loading');

    try {
      this.isFeminine = !this.isFeminine;
      this.updateGenderIcons();
      // Set gender BEFORE swap so connectSkinManager renders with correct filter
      this.skinTab.setGender(this.isFeminine ? 'feminine' : 'masculine');
      await this.onGenderSwap(this.isFeminine);
    } catch (err) {
      console.error('[Sidebar] Gender swap failed:', err);
      this.isFeminine = !this.isFeminine; // revert
    } finally {
      this.femaleBtn.classList.remove('loading');
      this.maleBtn.classList.remove('loading');
    }
  }

  private updateGenderIcons(): void {
    this.femaleBtn?.classList.toggle('active', this.isFeminine);
    this.maleBtn?.classList.toggle('active', !this.isFeminine);
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
    this.skinTab.hide();
    this.wardrobeTab.hide();

    switch (tabId) {
      case 'outfits':
        this.outfitsTab.show();
        break;
      case 'body':
        this.bodyTab.show();
        break;
      case 'skin':
        this.skinTab.show();
        break;
      case 'wardrobe':
        this.wardrobeTab.show();
        break;
    }
  }

  dispose(): void {
    this.outfitsTab.dispose();
    this.bodyTab.dispose();
    this.skinTab.dispose();
    this.wardrobeTab.dispose();
    this.tabBar.dispose();
    this.styleEl.remove();
    this.root.remove();
  }
}
