import type {
  Catalog, CatalogClothingItem, CatalogHairItem, CatalogBaseItem, ClothingSlot,
} from '../types/index.js';

/**
 * Loads and caches the extracted asset catalog (items.json).
 * Provides filtered access to clothing, hair, and base body entries.
 */
export class CatalogLoader {
  private catalog: Catalog | null = null;
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? this.detectBaseUrl();
  }

  private detectBaseUrl(): string {
    if (window.location.hostname === 'poqpoq.com') {
      return '/avatar/extracted-assets/';
    }
    // Dev mode — Vite serves from project root
    return '/avatar/extracted-assets/';
  }

  async load(): Promise<Catalog> {
    if (this.catalog) return this.catalog;

    const url = this.baseUrl + 'catalog/items.json';
    console.log(`[Catalog] Loading from ${url}`);
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Failed to load catalog: ${resp.status} ${resp.statusText}`);
    }
    this.catalog = await resp.json() as Catalog;
    console.log(
      `[Catalog] Loaded: ${this.catalog.clothing.length} clothing, ` +
      `${this.catalog.hair.length} hair, ${this.catalog.bases.length} bases`,
    );
    return this.catalog;
  }

  getCatalog(): Catalog | null {
    return this.catalog;
  }

  getClothing(slot?: ClothingSlot, uniqueOnly = true): CatalogClothingItem[] {
    if (!this.catalog) return [];
    let items = this.catalog.clothing;
    if (uniqueOnly) {
      items = items.filter(c => !c.isDuplicate);
    }
    if (slot) {
      items = items.filter(c => c.slot === slot);
    }
    return items;
  }

  getHair(): CatalogHairItem[] {
    return this.catalog?.hair ?? [];
  }

  getBases(): CatalogBaseItem[] {
    return this.catalog?.bases ?? [];
  }

  getClothingById(id: string): CatalogClothingItem | undefined {
    return this.catalog?.clothing.find(c => c.id === id);
  }

  getHairById(id: string): CatalogHairItem | undefined {
    return this.catalog?.hair.find(h => h.id === id);
  }

  resolveAssetUrl(relativePath: string): string {
    return this.baseUrl + relativePath;
  }
}
