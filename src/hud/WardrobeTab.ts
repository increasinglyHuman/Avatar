import type { ClothingManager } from '../avatar/ClothingManager.js';
import type { HairSwapper } from '../avatar/HairSwapper.js';
import type { CatalogLoader } from '../avatar/CatalogLoader.js';
import type {
  WardrobeCategory, CatalogClothingItem, CatalogHairItem, ClothingSlot,
} from '../types/index.js';

const STYLE_ID = 'bb-avatar-wardrobe-styles';

const CATEGORIES: { key: WardrobeCategory; label: string; color: string }[] = [
  { key: 'tops',      label: 'Tops',    color: '#E8A040' },
  { key: 'bottoms',   label: 'Bottoms', color: '#4080C0' },
  { key: 'onepiece',  label: 'Dresses', color: '#9060B0' },
  { key: 'shoes',     label: 'Shoes',   color: '#8B6844' },
  { key: 'accessory', label: 'Acc',     color: '#50A060' },
  { key: 'hair',      label: 'Hair',    color: '#C050A0' },
];

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.wardrobe-categories {
  display: flex; gap: 2px; margin-bottom: 12px; overflow-x: auto;
  padding-bottom: 4px;
}
.cat-btn {
  font-size: 11px; padding: 6px 10px;
  background: rgba(255,255,255,0.06);
  border: none; border-radius: 4px;
  color: rgba(255,255,255,0.4);
  cursor: pointer; white-space: nowrap;
  transition: background 0.15s, color 0.15s;
  font-family: inherit;
}
.cat-btn:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); }
.cat-btn.active { background: rgba(255,255,255,0.14); color: rgba(255,255,255,0.85); }

.wardrobe-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 8px; max-height: calc(100vh - 280px); overflow-y: auto;
  padding-right: 4px;
}
.wardrobe-card {
  cursor: pointer; border-radius: 6px; overflow: hidden;
  border: 2px solid transparent;
  transition: border-color 0.15s, transform 0.1s;
  background: rgba(255,255,255,0.04);
}
.wardrobe-card:hover {
  border-color: rgba(255,255,255,0.2);
  transform: scale(1.03);
}
.wardrobe-card.equipped {
  border-color: rgba(255,255,255,0.7);
}
.wardrobe-card.loading {
  opacity: 0.5; pointer-events: none;
}
.card-thumb {
  aspect-ratio: 1;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 700;
  color: rgba(255,255,255,0.25);
  text-transform: uppercase;
}
.card-name {
  font-size: 9px; padding: 4px 6px;
  color: rgba(255,255,255,0.4);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  text-align: center;
}
.wardrobe-actions {
  display: flex; gap: 8px; margin-top: 12px;
}
.wardrobe-btn {
  flex: 1; padding: 8px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 4px;
  color: rgba(255,255,255,0.5);
  cursor: pointer; font-size: 12px;
  transition: background 0.15s, color 0.15s;
  font-family: inherit;
}
.wardrobe-btn:hover {
  background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7);
}
.wardrobe-empty {
  color: rgba(255,255,255,0.25);
  text-align: center; padding: 40px 0;
  font-size: 12px;
}
.wardrobe-count {
  font-size: 10px; color: rgba(255,255,255,0.25);
  margin-bottom: 8px;
}
`;
  document.head.appendChild(style);
}

/**
 * Wardrobe tab — browse clothing/hair catalog by category, equip/unequip items.
 */
export class WardrobeTab {
  private root: HTMLDivElement;
  private gridContainer: HTMLDivElement;
  private countLabel: HTMLDivElement;

  private catalog: CatalogLoader | null = null;
  private clothingMgr: ClothingManager | null = null;
  private hairSwapper: HairSwapper | null = null;

  private activeCategory: WardrobeCategory = 'tops';
  private loadingItemId: string | null = null;

  constructor(container: HTMLElement) {
    injectStyles();
    this.root = document.createElement('div');
    this.root.className = 'tab-content wardrobe-tab';
    container.appendChild(this.root);

    // Category bar
    const catBar = document.createElement('div');
    catBar.className = 'wardrobe-categories';
    for (const cat of CATEGORIES) {
      const btn = document.createElement('button');
      btn.className = 'cat-btn' + (cat.key === this.activeCategory ? ' active' : '');
      btn.textContent = cat.label;
      btn.dataset.category = cat.key;
      btn.addEventListener('click', () => this.selectCategory(cat.key));
      catBar.appendChild(btn);
    }
    this.root.appendChild(catBar);

    // Item count
    this.countLabel = document.createElement('div');
    this.countLabel.className = 'wardrobe-count';
    this.root.appendChild(this.countLabel);

    // Grid
    this.gridContainer = document.createElement('div');
    this.gridContainer.className = 'wardrobe-grid';
    this.root.appendChild(this.gridContainer);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'wardrobe-actions';

    const unequipBtn = document.createElement('button');
    unequipBtn.className = 'wardrobe-btn';
    unequipBtn.textContent = 'Unequip';
    unequipBtn.addEventListener('click', () => this.handleUnequip());
    actions.appendChild(unequipBtn);

    this.root.appendChild(actions);
  }

  connect(
    catalog: CatalogLoader,
    clothingMgr: ClothingManager,
    hairSwapper: HairSwapper,
  ): void {
    this.catalog = catalog;
    this.clothingMgr = clothingMgr;
    this.hairSwapper = hairSwapper;
    this.renderGrid();
  }

  show(): void { this.root.style.display = 'block'; }
  hide(): void { this.root.style.display = 'none'; }

  dispose(): void {
    this.root.remove();
    this.catalog = null;
    this.clothingMgr = null;
    this.hairSwapper = null;
  }

  private selectCategory(category: WardrobeCategory): void {
    this.activeCategory = category;
    const buttons = this.root.querySelectorAll<HTMLButtonElement>('.cat-btn');
    for (const btn of buttons) {
      btn.classList.toggle('active', btn.dataset.category === category);
    }
    this.renderGrid();
  }

  private renderGrid(): void {
    this.gridContainer.innerHTML = '';

    if (!this.catalog) {
      this.gridContainer.innerHTML = '<div class="wardrobe-empty">Loading catalog...</div>';
      return;
    }

    if (this.activeCategory === 'hair') {
      this.renderHairGrid();
      return;
    }

    const items = this.catalog.getClothing(this.activeCategory as ClothingSlot);
    this.countLabel.textContent = `${items.length} items`;

    if (items.length === 0) {
      this.gridContainer.innerHTML = '<div class="wardrobe-empty">No items</div>';
      return;
    }

    const equippedId = this.clothingMgr?.getEquipped(this.activeCategory as ClothingSlot);

    for (const item of items) {
      const card = this.createClothingCard(item, item.id === equippedId);
      this.gridContainer.appendChild(card);
    }
  }

  private renderHairGrid(): void {
    const items = this.catalog!.getHair();
    this.countLabel.textContent = `${items.length} styles`;

    if (items.length === 0) {
      this.gridContainer.innerHTML = '<div class="wardrobe-empty">No hair styles</div>';
      return;
    }

    const equippedId = this.hairSwapper?.getCurrentHairId();

    for (const item of items) {
      const card = this.createHairCard(item, item.id === equippedId);
      this.gridContainer.appendChild(card);
    }
  }

  private createClothingCard(item: CatalogClothingItem, equipped: boolean): HTMLDivElement {
    const cat = CATEGORIES.find(c => c.key === item.slot);
    const color = cat?.color ?? '#666';
    const label = this.friendlyName(item.materialName);

    const card = document.createElement('div');
    card.className = 'wardrobe-card' + (equipped ? ' equipped' : '');
    card.dataset.itemId = item.id;

    const thumb = document.createElement('div');
    thumb.className = 'card-thumb';
    thumb.style.background = color + '20';
    const abbr = document.createElement('span');
    abbr.textContent = label.substring(0, 2);
    thumb.appendChild(abbr);
    card.appendChild(thumb);

    const name = document.createElement('div');
    name.className = 'card-name';
    name.title = item.materialName;
    name.textContent = label;
    card.appendChild(name);

    card.addEventListener('click', () => this.handleEquipClothing(item, card));
    return card;
  }

  private createHairCard(item: CatalogHairItem, equipped: boolean): HTMLDivElement {
    const label = item.id.replace('hair-', '').toUpperCase();

    const card = document.createElement('div');
    card.className = 'wardrobe-card' + (equipped ? ' equipped' : '');
    card.dataset.itemId = item.id;

    const thumb = document.createElement('div');
    thumb.className = 'card-thumb';
    thumb.style.background = '#C050A020';
    const abbr = document.createElement('span');
    abbr.textContent = label;
    thumb.appendChild(abbr);
    card.appendChild(thumb);

    const name = document.createElement('div');
    name.className = 'card-name';
    name.title = item.sourceFile;
    name.textContent = label;
    card.appendChild(name);

    card.addEventListener('click', () => this.handleEquipHair(item, card));
    return card;
  }

  private async handleEquipClothing(item: CatalogClothingItem, card: HTMLDivElement): Promise<void> {
    if (!this.clothingMgr || !this.catalog || this.loadingItemId) return;

    if (this.clothingMgr.getEquipped(item.slot) === item.id) {
      this.clothingMgr.unequip(item.slot);
      this.renderGrid();
      return;
    }

    this.loadingItemId = item.id;
    card.classList.add('loading');

    const ok = await this.clothingMgr.equip(item, this.catalog);

    this.loadingItemId = null;
    if (ok) {
      this.renderGrid();
    } else {
      card.classList.remove('loading');
    }
  }

  private async handleEquipHair(item: CatalogHairItem, card: HTMLDivElement): Promise<void> {
    if (!this.hairSwapper || !this.catalog || this.loadingItemId) return;

    if (this.hairSwapper.getCurrentHairId() === item.id) {
      this.hairSwapper.restoreOriginal();
      this.renderGrid();
      return;
    }

    this.loadingItemId = item.id;
    card.classList.add('loading');

    const ok = await this.hairSwapper.swap(item, this.catalog);

    this.loadingItemId = null;
    if (ok) {
      this.renderGrid();
    } else {
      card.classList.remove('loading');
    }
  }

  private handleUnequip(): void {
    if (this.activeCategory === 'hair') {
      this.hairSwapper?.restoreOriginal();
    } else {
      this.clothingMgr?.unequip(this.activeCategory as ClothingSlot);
    }
    this.renderGrid();
  }

  private friendlyName(materialName: string): string {
    const match = materialName.match(/(Tops|Bottoms|Onepiece|Shoes|Accessory|Socks|Gloves)_(\d+)_CLOTH/i);
    if (match) {
      return `${match[1]} ${parseInt(match[2], 10) + 1}`;
    }
    return materialName
      .replace(/^N\d+_\d+_\d+_/, '')
      .replace(/_CLOTH.*$/, '')
      .replace(/\(Instance\)/, '')
      .trim() || materialName.substring(0, 12);
  }
}
