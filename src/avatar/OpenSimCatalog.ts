import type { ClothingItem, ClothingSlot } from '../types/clothing.js';

/**
 * Manages the clothing catalog — the list of available items.
 * Phase 3: starts with a static built-in catalog, later loads from NEXUS.
 *
 * The catalog is separate from equipped state (OpenSimClothingManager handles that).
 */
export class OpenSimCatalog {
  private items: ClothingItem[] = [];
  private loaded = false;

  /**
   * Load the catalog. Currently uses a built-in static catalog.
   * Will be replaced with NEXUS API fetch in Phase 4.
   */
  async load(): Promise<void> {
    // Start with the built-in catalog
    this.items = [...BUILT_IN_CATALOG];
    this.loaded = true;

    console.log(`[Catalog] Loaded ${this.items.length} items`);
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
// Built-in catalog (placeholder items until real garments arrive)
// ---------------------------------------------------------------------------

const BUILT_IN_CATALOG: ClothingItem[] = [
  // These are placeholder entries — no actual GLBs yet.
  // They demonstrate the catalog structure and will be replaced
  // with real Marvelous Designer garments as they're created.
  //
  // When real garments are added:
  // 1. Export from MD → Blender → rig to SL skeleton → GLB
  // 2. Place GLB in public/assets/clothing/{slot}/
  // 3. Add entry here with correct asset path
  // 4. Generate thumbnail (256×256)
];
