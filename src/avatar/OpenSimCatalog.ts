import type { ClothingItem, ClothingSlot } from '../types/clothing.js';
import { loadTextureClothingCatalog } from './TextureClothingCatalog.js';

/**
 * Manages the clothing catalog — the list of available items.
 * Merges built-in mesh items with texture clothing from JSON catalog.
 *
 * The catalog is separate from equipped state (OpenSimClothingManager handles that).
 */
export class OpenSimCatalog {
  private items: ClothingItem[] = [];
  private loaded = false;

  /**
   * Load the catalog. Merges built-in mesh items with texture clothing catalog.
   * Will be extended with NEXUS API fetch later.
   */
  async load(): Promise<void> {
    const textureItems = await loadTextureClothingCatalog();
    this.items = [...BUILT_IN_CATALOG, ...textureItems];
    this.loaded = true;

    console.log(`[Catalog] Loaded ${this.items.length} items (${textureItems.length} texture layers)`);
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  /** Get all items */
  getAll(): ClothingItem[] {
    return this.items;
  }

  /** Get items for a specific slot */
  getBySlot(slot: ClothingSlot): ClothingItem[] {
    return this.items.filter((item) => item.slot === slot);
  }

  /** Get a single item by ID */
  getById(id: string): ClothingItem | undefined {
    return this.items.find((item) => item.id === id);
  }

  /** Get all unique slots that have at least one item */
  getAvailableSlots(): ClothingSlot[] {
    const slots = new Set(this.items.map((item) => item.slot));
    return [...slots];
  }

  /** Get item count per slot */
  getSlotCounts(): Map<ClothingSlot, number> {
    const counts = new Map<ClothingSlot, number>();
    for (const item of this.items) {
      counts.set(item.slot, (counts.get(item.slot) ?? 0) + 1);
    }
    return counts;
  }
}

// ---------------------------------------------------------------------------
// Built-in catalog (mesh garments from MD/Blender pipeline)
// ---------------------------------------------------------------------------

const BUILT_IN_CATALOG: ClothingItem[] = [
  // Real Marvelous Designer garments will be added here as they're created.
  // 1. Export from MD → Blender → rig to SL skeleton → GLB
  // 2. Place GLB in public/assets/clothing/{slot}/
  // 3. Add entry here with correct asset path
];
