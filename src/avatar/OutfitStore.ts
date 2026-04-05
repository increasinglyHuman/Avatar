import type { SavedOutfit, AvatarManifest } from '../types/manifest.js';

const STORAGE_KEY = 'bbavatar_outfits';
const CURRENT_KEY = 'bbavatar_current';

/**
 * Persists outfits to localStorage.
 * Phase 4: local-only storage. Phase 5+ will add NEXUS sync via PostMessage.
 */
export class OutfitStore {

  /** Save a new outfit. Returns the generated ID. */
  save(manifest: AvatarManifest): string {
    const outfits = this.loadAll();
    const id = `outfit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    outfits.push({ id, manifest });
    this.persist(outfits);
    console.log(`[OutfitStore] Saved "${manifest.metadata.name}" as ${id}`);
    return id;
  }

  /** Update an existing outfit's manifest. */
  update(id: string, manifest: AvatarManifest): boolean {
    const outfits = this.loadAll();
    const idx = outfits.findIndex((o) => o.id === id);
    if (idx < 0) return false;
    manifest.metadata.modified = new Date().toISOString();
    outfits[idx].manifest = manifest;
    this.persist(outfits);
    return true;
  }

  /** Delete an outfit by ID. */
  delete(id: string): boolean {
    const outfits = this.loadAll();
    const filtered = outfits.filter((o) => o.id !== id);
    if (filtered.length === outfits.length) return false;
    this.persist(filtered);
    console.log(`[OutfitStore] Deleted ${id}`);
    return true;
  }

  /** Rename an outfit. */
  rename(id: string, newName: string): boolean {
    const outfits = this.loadAll();
    const outfit = outfits.find((o) => o.id === id);
    if (!outfit) return false;
    outfit.manifest.metadata.name = newName;
    outfit.manifest.metadata.modified = new Date().toISOString();
    this.persist(outfits);
    return true;
  }

  /** Get all saved outfits. */
  loadAll(): SavedOutfit[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as SavedOutfit[];
    } catch {
      console.warn('[OutfitStore] Failed to parse saved outfits');
      return [];
    }
  }

  /** Get a single outfit by ID. */
  getById(id: string): SavedOutfit | undefined {
    return this.loadAll().find((o) => o.id === id);
  }

  /** Get outfit count. */
  count(): number {
    return this.loadAll().length;
  }

  /** Save the current working state (auto-save on changes). */
  saveCurrent(manifest: AvatarManifest): void {
    try {
      localStorage.setItem(CURRENT_KEY, JSON.stringify(manifest));
    } catch {
      // localStorage full or unavailable — silently skip
    }
  }

  /** Load the last working state (restore on app load). */
  loadCurrent(): AvatarManifest | null {
    try {
      const raw = localStorage.getItem(CURRENT_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AvatarManifest;
    } catch {
      return null;
    }
  }

  private persist(outfits: SavedOutfit[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(outfits));
    } catch (err) {
      console.error('[OutfitStore] Failed to save:', err);
    }
  }
}
