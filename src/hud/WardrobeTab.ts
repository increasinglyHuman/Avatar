import type { OpenSimClothingManager } from '../avatar/OpenSimClothingManager.js';
import type { OpenSimCatalog } from '../avatar/OpenSimCatalog.js';
import type { AlphaMaskManager } from '../avatar/AlphaMaskManager.js';
import type { ClothingSlot, ClothingItem } from '../types/clothing.js';

const STYLE_ID = 'bb-avatar-wardrobe-styles';

/** Slot categories with display metadata */
const SLOT_CATEGORIES: { key: ClothingSlot; label: string; icon: string }[] = [
  { key: 'shirt',      label: 'Tops',       icon: '👕' },
  { key: 'pants',      label: 'Bottoms',    icon: '👖' },
  { key: 'skirt',      label: 'Skirts',     icon: '🩳' },
  { key: 'jacket',     label: 'Jackets',    icon: '🧥' },
  { key: 'shoes',      label: 'Shoes',      icon: '👟' },
  { key: 'underwear',  label: 'Under',      icon: '🩲' },
  { key: 'gloves',     label: 'Gloves',     icon: '🧤' },
  { key: 'hat',        label: 'Hats',       icon: '🎩' },
  { key: 'hair',       label: 'Hair',       icon: '💇' },
  { key: 'accessory',  label: 'Acc',        icon: '💍' },
];

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.wardrobe-tab { padding-top: 8px; }

.wardrobe-categories {
  display: flex; gap: 2px; margin-bottom: 12px; overflow-x: auto;
  padding-bottom: 4px; flex-wrap: wrap;
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
.cat-btn .cat-count {
  font-size: 9px; color: rgba(255,255,255,0.25);
  margin-left: 3px;
}

.wardrobe-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 8px; max-height: calc(100vh - 320px); overflow-y: auto;
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
  font-size: 28px;
  color: rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.03);
}
.card-thumb img {
  width: 100%; height: 100%; object-fit: cover;
}
.card-name {
  font-size: 9px; padding: 4px 6px;
  color: rgba(255,255,255,0.4);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  text-align: center;
}

.wardrobe-empty {
  color: rgba(255,255,255,0.2);
  text-align: center; padding: 40px 0;
  font-size: 12px;
  font-style: italic;
}
.wardrobe-empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
  opacity: 0.3;
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

.wardrobe-status {
  font-size: 10px; color: rgba(255,255,255,0.25);
  margin-bottom: 8px;
}
`;
  document.head.appendChild(style);
}

/**
 * Wardrobe tab — browse clothing catalog by slot, equip/unequip items.
 * Phase 3 scaffold: full UI ready, catalog starts empty until garments arrive.
 */
export class WardrobeTab {
  private root: HTMLDivElement;
  private gridContainer: HTMLDivElement;
  private statusLabel: HTMLDivElement;

  private catalog: OpenSimCatalog | null = null;
  private clothingMgr: OpenSimClothingManager | null = null;
  private alphaMgr: AlphaMaskManager | null = null;

  private activeSlot: ClothingSlot = 'shirt';
  private loadingItemId: string | null = null;

  constructor(container: HTMLElement) {
    injectStyles();
    this.root = document.createElement('div');
    this.root.className = 'tab-content wardrobe-tab';
    container.appendChild(this.root);

    // Category bar
    const catBar = document.createElement('div');
    catBar.className = 'wardrobe-categories';
    for (const cat of SLOT_CATEGORIES) {
      const btn = document.createElement('button');
      btn.className = 'cat-btn' + (cat.key === this.activeSlot ? ' active' : '');
      btn.innerHTML = `${cat.label}`;
      btn.dataset.slot = cat.key;
      btn.addEventListener('click', () => this.selectSlot(cat.key));
      catBar.appendChild(btn);
    }
    this.root.appendChild(catBar);

    // Status
    this.statusLabel = document.createElement('div');
    this.statusLabel.className = 'wardrobe-status';
    this.root.appendChild(this.statusLabel);

    // Grid
    this.gridContainer = document.createElement('div');
    this.gridContainer.className = 'wardrobe-grid';
    this.root.appendChild(this.gridContainer);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'wardrobe-actions';

    const unequipBtn = document.createElement('button');
    unequipBtn.className = 'wardrobe-btn';
    unequipBtn.textContent = 'Unequip Slot';
    unequipBtn.addEventListener('click', () => this.handleUnequip());
    actions.appendChild(unequipBtn);

    const unequipAllBtn = document.createElement('button');
    unequipAllBtn.className = 'wardrobe-btn';
    unequipAllBtn.textContent = 'Unequip All';
    unequipAllBtn.addEventListener('click', () => this.handleUnequipAll());
    actions.appendChild(unequipAllBtn);

    this.root.appendChild(actions);

    // Show initial empty state
    this.renderGrid();
  }

  connect(
    catalog: OpenSimCatalog,
    clothingMgr: OpenSimClothingManager,
    alphaMgr: AlphaMaskManager,
  ): void {
    this.catalog = catalog;
    this.clothingMgr = clothingMgr;
    this.alphaMgr = alphaMgr;
    this.renderGrid();
  }

  show(): void { this.root.style.display = 'block'; }
  hide(): void { this.root.style.display = 'none'; }

  dispose(): void {
    this.root.remove();
    this.catalog = null;
    this.clothingMgr = null;
    this.alphaMgr = null;
  }

  private selectSlot(slot: ClothingSlot): void {
    this.activeSlot = slot;
    const buttons = this.root.querySelectorAll<HTMLButtonElement>('.cat-btn');
    for (const btn of buttons) {
      btn.classList.toggle('active', btn.dataset.slot === slot);
    }
    this.renderGrid();
  }

  private renderGrid(): void {
    this.gridContainer.innerHTML = '';

    if (!this.catalog || !this.catalog.isLoaded()) {
      this.statusLabel.textContent = '';
      this.showEmpty('Loading catalog...');
      return;
    }

    const items = this.catalog.getBySlot(this.activeSlot);
    const equippedId = this.clothingMgr?.getEquippedInSlot(this.activeSlot);
    const slotMeta = SLOT_CATEGORIES.find((c) => c.key === this.activeSlot);

    if (items.length === 0) {
      this.statusLabel.textContent = '';
      this.showEmpty(
        `No ${slotMeta?.label.toLowerCase() ?? this.activeSlot} yet`,
        slotMeta?.icon ?? '👔',
      );
      return;
    }

    this.statusLabel.textContent = `${items.length} item${items.length > 1 ? 's' : ''}`;

    for (const item of items) {
      const card = this.createCard(item, item.id === equippedId);
      this.gridContainer.appendChild(card);
    }
  }

  private showEmpty(message: string, icon?: string): void {
    const empty = document.createElement('div');
    empty.className = 'wardrobe-empty';
    if (icon) {
      const iconEl = document.createElement('div');
      iconEl.className = 'wardrobe-empty-icon';
      iconEl.textContent = icon;
      empty.appendChild(iconEl);
    }
    const text = document.createElement('div');
    text.textContent = message;
    empty.appendChild(text);

    const hint = document.createElement('div');
    hint.textContent = 'Garments from Marvelous Designer will appear here';
    hint.style.fontSize = '10px';
    hint.style.marginTop = '8px';
    hint.style.color = 'rgba(255,255,255,0.15)';
    empty.appendChild(hint);

    this.gridContainer.appendChild(empty);
  }

  private createCard(item: ClothingItem, equipped: boolean): HTMLDivElement {
    const card = document.createElement('div');
    card.className = 'wardrobe-card' + (equipped ? ' equipped' : '');
    card.dataset.itemId = item.id;

    const thumb = document.createElement('div');
    thumb.className = 'card-thumb';

    if (item.thumbnail) {
      const img = document.createElement('img');
      img.src = item.thumbnail;
      img.alt = item.name;
      img.loading = 'lazy';
      thumb.appendChild(img);
    } else {
      const slotMeta = SLOT_CATEGORIES.find((c) => c.key === item.slot);
      thumb.textContent = slotMeta?.icon ?? '👔';
    }
    card.appendChild(thumb);

    const name = document.createElement('div');
    name.className = 'card-name';
    name.textContent = item.name;
    name.title = item.name;
    card.appendChild(name);

    card.addEventListener('click', () => this.handleEquip(item, card));
    return card;
  }

  private async handleEquip(item: ClothingItem, card: HTMLDivElement): Promise<void> {
    if (!this.clothingMgr || this.loadingItemId) return;

    // Toggle if already equipped
    if (this.clothingMgr.getEquippedInSlot(item.slot) === item.id) {
      this.handleUnequip();
      return;
    }

    this.loadingItemId = item.id;
    card.classList.add('loading');

    // Apply alpha masking for this item's covered regions
    if (item.alphaRegions.length > 0 && this.alphaMgr) {
      this.alphaMgr.maskRegions(item.alphaRegions);
    }

    const ok = await this.clothingMgr.equip(item);

    this.loadingItemId = null;
    if (ok) {
      this.renderGrid();
    } else {
      card.classList.remove('loading');
      // Undo alpha masking on failure
      if (item.alphaRegions.length > 0 && this.alphaMgr) {
        this.alphaMgr.unmaskRegions(item.alphaRegions);
      }
    }
  }

  private handleUnequip(): void {
    if (!this.clothingMgr) return;
    const itemId = this.clothingMgr.getEquippedInSlot(this.activeSlot);
    if (!itemId) return;

    // Find the item to get its alpha regions
    const item = this.catalog?.getById(itemId);
    if (item?.alphaRegions.length && this.alphaMgr) {
      this.alphaMgr.unmaskRegions(item.alphaRegions);
    }

    this.clothingMgr.unequip(this.activeSlot);
    this.renderGrid();
  }

  private handleUnequipAll(): void {
    if (!this.clothingMgr) return;
    this.clothingMgr.unequipAll();
    this.alphaMgr?.unmaskAll();
    this.renderGrid();
  }
}
