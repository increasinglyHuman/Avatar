import { Tools } from '@babylonjs/core';
import type { Engine, WebGPUEngine } from '@babylonjs/core';
import type { ManifestSerializer } from '../avatar/ManifestSerializer.js';
import type { OutfitStore } from '../avatar/OutfitStore.js';
import type { SavedOutfit } from '../types/manifest.js';

const STYLE_ID = 'bb-avatar-outfits-styles';

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.outfits-tab { padding-top: 8px; }

.outfits-actions {
  display: flex; gap: 6px; margin-bottom: 12px;
}
.outfit-save-btn {
  flex: 1; padding: 10px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 6px;
  color: rgba(255,255,255,0.7);
  cursor: pointer; font-size: 12px;
  font-family: inherit; font-weight: 500;
  transition: background 0.15s, color 0.15s;
}
.outfit-save-btn:hover {
  background: rgba(255,255,255,0.14);
  color: rgba(255,255,255,0.9);
}

.outfits-grid {
  display: grid; grid-template-columns: repeat(2, 1fr);
  gap: 8px; max-height: calc(100vh - 260px); overflow-y: auto;
  padding-right: 4px;
}
.outfit-card {
  border-radius: 8px; overflow: hidden;
  border: 2px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.03);
  cursor: pointer;
  transition: border-color 0.15s, transform 0.1s;
}
.outfit-card:hover {
  border-color: rgba(255,255,255,0.2);
  transform: scale(1.02);
}
.outfit-card.active {
  border-color: rgba(100,180,255,0.5);
}
.outfit-thumb {
  aspect-ratio: 3/4;
  background: rgba(255,255,255,0.02);
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.1);
  font-size: 28px;
  position: relative;
}
.outfit-thumb img {
  width: 100%; height: 100%; object-fit: cover;
}
.outfit-info {
  padding: 6px 8px;
  display: flex; align-items: center; justify-content: space-between;
}
.outfit-name {
  font-size: 11px; color: rgba(255,255,255,0.6);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  flex: 1;
}
.outfit-delete {
  background: none; border: none;
  color: rgba(255,255,255,0.2);
  cursor: pointer; font-size: 14px;
  padding: 0 4px;
  transition: color 0.15s;
}
.outfit-delete:hover {
  color: rgba(255,100,100,0.7);
}
.outfit-date {
  font-size: 9px; color: rgba(255,255,255,0.2);
  padding: 0 8px 6px;
}

.outfits-empty {
  text-align: center; padding: 40px 0;
  color: rgba(255,255,255,0.2);
}
.outfits-empty-icon {
  font-size: 32px; margin-bottom: 8px; opacity: 0.3;
}
.outfits-count {
  font-size: 10px; color: rgba(255,255,255,0.25);
  margin-bottom: 8px;
}

/* Save dialog */
.outfit-save-dialog {
  padding: 12px 0;
}
.outfit-save-input {
  width: 100%; padding: 8px 12px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 4px;
  color: rgba(255,255,255,0.8);
  font-size: 13px; font-family: inherit;
  outline: none;
  margin-bottom: 8px;
}
.outfit-save-input:focus {
  border-color: rgba(100,180,255,0.4);
}
.outfit-save-confirm {
  display: flex; gap: 6px;
}
.outfit-save-confirm button {
  flex: 1; padding: 8px;
  border-radius: 4px;
  font-size: 12px; font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
}
.save-ok {
  background: rgba(100,180,255,0.2);
  border: 1px solid rgba(100,180,255,0.3);
  color: rgba(100,180,255,0.9);
}
.save-ok:hover { background: rgba(100,180,255,0.3); }
.save-cancel {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.5);
}
.save-cancel:hover { background: rgba(255,255,255,0.1); }
`;
  document.head.appendChild(style);
}

/**
 * Outfits tab — save, browse, and restore complete avatar looks.
 * Each outfit is a full manifest snapshot (shape + skin + clothing).
 */
export class OutfitsTab {
  private root: HTMLDivElement;
  private gridContainer: HTMLDivElement;
  private countLabel: HTMLDivElement;
  private saveArea: HTMLDivElement;

  private serializer: ManifestSerializer | null = null;
  private store: OutfitStore | null = null;
  private engine: Engine | WebGPUEngine | null = null;
  private onOutfitLoad: (() => void) | null = null;

  constructor(container: HTMLElement) {
    injectStyles();
    this.root = document.createElement('div');
    this.root.className = 'tab-content outfits-tab';
    container.appendChild(this.root);

    // Save button area
    this.saveArea = document.createElement('div');
    this.saveArea.className = 'outfits-actions';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'outfit-save-btn';
    saveBtn.textContent = 'Save Current Look';
    saveBtn.addEventListener('click', () => this.showSaveDialog());
    this.saveArea.appendChild(saveBtn);
    this.root.appendChild(this.saveArea);

    // Count
    this.countLabel = document.createElement('div');
    this.countLabel.className = 'outfits-count';
    this.root.appendChild(this.countLabel);

    // Grid
    this.gridContainer = document.createElement('div');
    this.gridContainer.className = 'outfits-grid';
    this.root.appendChild(this.gridContainer);

    this.renderGrid();
  }

  connect(
    serializer: ManifestSerializer,
    store: OutfitStore,
    engine: Engine | WebGPUEngine,
    onOutfitLoad: () => void,
  ): void {
    this.serializer = serializer;
    this.store = store;
    this.engine = engine;
    this.onOutfitLoad = onOutfitLoad;
    this.renderGrid();
  }

  show(): void { this.root.style.display = 'block'; }
  hide(): void { this.root.style.display = 'none'; }

  dispose(): void {
    this.root.remove();
    this.serializer = null;
    this.store = null;
  }

  private renderGrid(): void {
    this.gridContainer.innerHTML = '';

    if (!this.store) {
      this.showEmpty();
      return;
    }

    const outfits = this.store.loadAll();
    this.countLabel.textContent = outfits.length > 0
      ? `${outfits.length} saved outfit${outfits.length > 1 ? 's' : ''}`
      : '';

    if (outfits.length === 0) {
      this.showEmpty();
      return;
    }

    // Sort by most recent first
    outfits.sort((a, b) =>
      new Date(b.manifest.metadata.modified).getTime() -
      new Date(a.manifest.metadata.modified).getTime(),
    );

    for (const outfit of outfits) {
      this.gridContainer.appendChild(this.createCard(outfit));
    }
  }

  private showEmpty(): void {
    const empty = document.createElement('div');
    empty.className = 'outfits-empty';

    const icon = document.createElement('div');
    icon.className = 'outfits-empty-icon';
    icon.textContent = '\u2727'; // ✧
    empty.appendChild(icon);

    const text = document.createElement('div');
    text.textContent = 'No saved outfits yet';
    empty.appendChild(text);

    const hint = document.createElement('div');
    hint.textContent = 'Customize your avatar, then save your look';
    hint.style.fontSize = '10px';
    hint.style.marginTop = '6px';
    hint.style.color = 'rgba(255,255,255,0.15)';
    empty.appendChild(hint);

    this.gridContainer.appendChild(empty);
  }

  private createCard(outfit: SavedOutfit): HTMLDivElement {
    const card = document.createElement('div');
    card.className = 'outfit-card';

    // Thumbnail
    const thumb = document.createElement('div');
    thumb.className = 'outfit-thumb';
    if (outfit.manifest.metadata.thumbnail) {
      const img = document.createElement('img');
      img.src = outfit.manifest.metadata.thumbnail;
      img.alt = outfit.manifest.metadata.name;
      thumb.appendChild(img);
    } else {
      thumb.textContent = '\u2727'; // ✧
    }
    card.appendChild(thumb);

    // Click to load
    thumb.addEventListener('click', () => this.handleLoad(outfit));

    // Info row
    const info = document.createElement('div');
    info.className = 'outfit-info';

    const name = document.createElement('span');
    name.className = 'outfit-name';
    name.textContent = outfit.manifest.metadata.name;
    name.title = outfit.manifest.metadata.name;
    info.appendChild(name);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'outfit-delete';
    deleteBtn.textContent = '\u00D7'; // ×
    deleteBtn.title = 'Delete outfit';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleDelete(outfit.id, outfit.manifest.metadata.name);
    });
    info.appendChild(deleteBtn);

    card.appendChild(info);

    // Date
    const date = document.createElement('div');
    date.className = 'outfit-date';
    date.textContent = this.formatDate(outfit.manifest.metadata.modified);
    card.appendChild(date);

    return card;
  }

  private showSaveDialog(): void {
    // Replace save button area with input
    this.saveArea.innerHTML = '';
    const dialog = document.createElement('div');
    dialog.className = 'outfit-save-dialog';

    const input = document.createElement('input');
    input.className = 'outfit-save-input';
    input.type = 'text';
    input.placeholder = 'Name this look...';
    input.value = `Look ${(this.store?.count() ?? 0) + 1}`;
    dialog.appendChild(input);

    const buttons = document.createElement('div');
    buttons.className = 'outfit-save-confirm';

    const okBtn = document.createElement('button');
    okBtn.className = 'save-ok';
    okBtn.textContent = 'Save';
    okBtn.addEventListener('click', () => {
      const name = input.value.trim() || 'Untitled';
      this.handleSave(name);
      this.restoreSaveButton();
    });
    buttons.appendChild(okBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'save-cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this.restoreSaveButton());
    buttons.appendChild(cancelBtn);

    dialog.appendChild(buttons);
    this.saveArea.appendChild(dialog);

    // Focus and select
    input.focus();
    input.select();

    // Enter to save
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const name = input.value.trim() || 'Untitled';
        this.handleSave(name);
        this.restoreSaveButton();
      } else if (e.key === 'Escape') {
        this.restoreSaveButton();
      }
    });
  }

  private restoreSaveButton(): void {
    this.saveArea.innerHTML = '';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'outfit-save-btn';
    saveBtn.textContent = 'Save Current Look';
    saveBtn.addEventListener('click', () => this.showSaveDialog());
    this.saveArea.appendChild(saveBtn);
  }

  private async handleSave(name: string): Promise<void> {
    if (!this.serializer || !this.store) return;
    const manifest = this.serializer.capture(name);

    // Capture portrait thumbnail using offscreen render target.
    // CreateScreenshotUsingRenderTargetAsync renders at exact dimensions
    // with correct aspect ratio — no black bars, no viewport hacking.
    if (this.engine) {
      try {
        const camera = this.engine.scenes[0].activeCamera!;
        const dataUrl = await Tools.CreateScreenshotUsingRenderTargetAsync(
          this.engine, camera, { width: 512, height: 680 },
        );
        manifest.metadata.thumbnail = dataUrl;
      } catch (err) {
        console.warn('[Outfits] Screenshot failed:', err);
      }
    }

    this.store.save(manifest);
    this.renderGrid();
  }

  private async handleLoad(outfit: SavedOutfit): Promise<void> {
    if (!this.serializer) return;
    await this.serializer.restore(outfit.manifest);
    this.onOutfitLoad?.();
    console.log(`[Outfits] Loaded: "${outfit.manifest.metadata.name}"`);
  }

  private handleDelete(id: string, name: string): void {
    if (!this.store) return;
    this.store.delete(id);
    this.renderGrid();
    console.log(`[Outfits] Deleted: "${name}"`);
  }

  private formatDate(isoString: string): string {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }
}
