/**
 * ShapeStore — Persistence layer for saved shape presets.
 * Depends on: ShapeParameterDefinitions (param metadata), ShapeParameterDriver (capture/apply),
 *   NexusInventoryAdapter (optional, for NEXUS sync)
 * Depended on by: ShapeSliderPanel (gallery UI), BodyTab (wiring), AvatarLifecycle (init)
 *
 * Dual-layer persistence: localStorage (always) + NEXUS inventory (when connected).
 * NEXUS is source of truth when connected. localStorage is cache + offline fallback.
 * SavedShape schema matches NEXUS inventory_items.properties JSONB for zero-conversion sync.
 * See docs/NEXUS-INTEGRATION-SPEC.md for the full contract.
 */
import { SHAPE_PARAMETERS } from './ShapeParameterDefinitions.js';
import type { ShapeParameterDriver } from './ShapeParameterDriver.js';
import type { NexusInventoryAdapter, NexusInventoryItem } from '../nexus/NexusInventoryAdapter.js';

const STORAGE_KEY = 'bb-shapes';

/**
 * Saved shape record — NEXUS-compatible properties schema.
 * Stored in localStorage (always), synced to NEXUS inventory (when connected).
 */
export interface SavedShape {
  /** Unique ID (local ID or NEXUS UUID) */
  id: string;
  /** NEXUS inventory item UUID (null if local-only, not yet synced) */
  nexusId: string | null;
  /** Display name */
  name: string;
  /** Format version for future schema evolution */
  version: 1;
  /** Which skeleton family this shape targets */
  skeletonType: 'bento';
  /** Gender this shape was authored for */
  gender: 'feminine' | 'masculine';
  /** Sparse param values — only non-default values stored */
  params: Record<string, number>;
  /** Total param count (for validation) */
  paramCount: number;
  /** ISO date strings */
  created: string;
  modified: string;
}

/** Callback for when the shape list changes (for UI refresh) */
type ChangeCallback = () => void;

/**
 * Persists shape presets to localStorage + NEXUS inventory.
 * localStorage writes are synchronous (instant UI). NEXUS writes are fire-and-forget async.
 */
export class ShapeStore {
  private nexus: NexusInventoryAdapter | null = null;
  private onChange: ChangeCallback | null = null;

  /** Register a callback for when shapes change (NEXUS sync, save, delete) */
  onChanged(cb: ChangeCallback): void {
    this.onChange = cb;
  }

  /**
   * Connect to NEXUS for bidirectional sync.
   * On connect: NEXUS shapes merge into local cache (NEXUS = source of truth).
   * On save/update/delete: local write + async NEXUS write.
   */
  connectNexus(adapter: NexusInventoryAdapter): void {
    this.nexus = adapter;
    adapter.onShapesReceived((nexusShapes) => {
      this.mergeFromNexus(nexusShapes);
    });
  }

  /** Save a new shape from the current driver state. Returns the generated ID. */
  save(name: string, driver: ShapeParameterDriver, gender: 'feminine' | 'masculine'): string {
    const shapes = this.loadAll();
    const id = `shape_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const shape: SavedShape = {
      id,
      nexusId: null,
      name,
      version: 1,
      skeletonType: 'bento',
      gender,
      params: this.captureParams(driver),
      paramCount: SHAPE_PARAMETERS.length,
      created: now,
      modified: now,
    };

    shapes.push(shape);
    this.persist(shapes);
    console.log(`[ShapeStore] Saved "${name}" as ${id}`);

    // Fire-and-forget NEXUS upsert — update local with NEXUS ID when response arrives
    if (this.nexus) {
      this.nexus.upsertShape(shape).then((item) => {
        if (item) {
          this.setNexusId(id, item.id);
        }
      });
    }

    return id;
  }

  /** Update an existing shape with current driver state. */
  update(id: string, driver: ShapeParameterDriver): boolean {
    const shapes = this.loadAll();
    const shape = shapes.find((s) => s.id === id);
    if (!shape) return false;
    shape.params = this.captureParams(driver);
    shape.paramCount = SHAPE_PARAMETERS.length;
    shape.modified = new Date().toISOString();
    this.persist(shapes);

    // Async NEXUS update
    if (this.nexus && shape.nexusId) {
      this.nexus.upsertShape(shape, shape.nexusId);
    } else if (this.nexus) {
      // Local-only shape — create in NEXUS
      this.nexus.upsertShape(shape).then((item) => {
        if (item) this.setNexusId(id, item.id);
      });
    }

    return true;
  }

  /** Delete a shape by ID. */
  delete(id: string): boolean {
    const shapes = this.loadAll();
    const shape = shapes.find((s) => s.id === id);
    if (!shape) return false;

    const filtered = shapes.filter((s) => s.id !== id);
    this.persist(filtered);
    console.log(`[ShapeStore] Deleted ${id}`);

    // Async NEXUS delete
    if (this.nexus && shape.nexusId) {
      this.nexus.deleteItem(shape.nexusId);
    }

    return true;
  }

  /** Rename a shape. */
  rename(id: string, newName: string): boolean {
    const shapes = this.loadAll();
    const shape = shapes.find((s) => s.id === id);
    if (!shape) return false;
    shape.name = newName;
    shape.modified = new Date().toISOString();
    this.persist(shapes);

    // Async NEXUS rename
    if (this.nexus && shape.nexusId) {
      this.nexus.renameItem(shape.nexusId, newName);
    }

    return true;
  }

  /** Apply a saved shape to the driver. */
  apply(id: string, driver: ShapeParameterDriver): boolean {
    const shape = this.getById(id);
    if (!shape) return false;
    this.applyShape(shape, driver);
    return true;
  }

  /** Apply a SavedShape object directly to the driver. */
  applyShape(shape: SavedShape, driver: ShapeParameterDriver): void {
    const values: Record<string, number> = {};
    for (const param of SHAPE_PARAMETERS) {
      values[param.id] = param.defaultValue;
    }
    for (const [id, val] of Object.entries(shape.params)) {
      values[id] = val;
    }
    driver.setValues(values);
    console.log(`[ShapeStore] Applied "${shape.name}" (${Object.keys(shape.params).length} params)`);
  }

  /** Get all saved shapes. */
  loadAll(): SavedShape[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const shapes = JSON.parse(raw) as SavedShape[];
      // Migration: add nexusId field if missing (pre-Phase 2 shapes)
      for (const s of shapes) {
        if (s.nexusId === undefined) (s as SavedShape).nexusId = null;
      }
      return shapes;
    } catch {
      console.warn('[ShapeStore] Failed to parse saved shapes');
      return [];
    }
  }

  /** Get a single shape by ID (checks both local ID and NEXUS ID). */
  getById(id: string): SavedShape | undefined {
    return this.loadAll().find((s) => s.id === id || s.nexusId === id);
  }

  /** Get shape count. */
  count(): number {
    return this.loadAll().length;
  }

  // ---------------------------------------------------------------------------
  // NEXUS sync
  // ---------------------------------------------------------------------------

  /**
   * Merge NEXUS shapes into local cache. NEXUS is source of truth:
   * - NEXUS items with matching nexusId → update local (name, params, timestamps)
   * - NEXUS items with no local match → add to local
   * - Local-only items (nexusId=null) → preserved (will sync on next save)
   */
  private mergeFromNexus(nexusShapes: NexusInventoryItem[]): void {
    const local = this.loadAll();
    const localByNexusId = new Map<string, SavedShape>();
    for (const s of local) {
      if (s.nexusId) localByNexusId.set(s.nexusId, s);
    }

    let changed = false;

    for (const nexusItem of nexusShapes) {
      const existing = localByNexusId.get(nexusItem.id);
      const props = nexusItem.properties as Record<string, unknown>;
      const params = (props.params ?? {}) as Record<string, number>;

      if (existing) {
        // Update local from NEXUS (NEXUS wins)
        if (existing.name !== nexusItem.name || existing.modified !== (nexusItem.modifiedAt ?? existing.modified)) {
          existing.name = nexusItem.name;
          existing.params = params;
          existing.paramCount = (props.param_count as number) ?? Object.keys(params).length;
          existing.gender = (props.gender as 'feminine' | 'masculine') ?? existing.gender;
          existing.modified = nexusItem.modifiedAt ?? existing.modified;
          changed = true;
        }
      } else {
        // New NEXUS item — add to local
        const newShape: SavedShape = {
          id: nexusItem.id, // Use NEXUS UUID as primary ID
          nexusId: nexusItem.id,
          name: nexusItem.name,
          version: 1,
          skeletonType: 'bento',
          gender: (props.gender as 'feminine' | 'masculine') ?? 'feminine',
          params,
          paramCount: (props.param_count as number) ?? Object.keys(params).length,
          created: nexusItem.createdAt ?? new Date().toISOString(),
          modified: nexusItem.modifiedAt ?? new Date().toISOString(),
        };
        local.push(newShape);
        changed = true;
      }
    }

    if (changed) {
      this.persist(local);
      console.log(`[ShapeStore] Merged ${nexusShapes.length} NEXUS shapes into local cache`);
      this.onChange?.();
    }
  }

  /** Update a local shape's nexusId after successful NEXUS create */
  private setNexusId(localId: string, nexusId: string): void {
    const shapes = this.loadAll();
    const shape = shapes.find((s) => s.id === localId);
    if (!shape) return;
    shape.nexusId = nexusId;
    this.persist(shapes);
  }

  /**
   * Capture current driver state as sparse params (omit defaults).
   * This produces the compact format used in NEXUS properties.params.
   */
  private captureParams(driver: ShapeParameterDriver): Record<string, number> {
    const all = driver.getAllValues();
    const sparse: Record<string, number> = {};
    for (const param of SHAPE_PARAMETERS) {
      const val = all.get(param.id) ?? param.defaultValue;
      if (val !== param.defaultValue) {
        sparse[param.id] = val;
      }
    }
    return sparse;
  }

  private persist(shapes: SavedShape[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(shapes));
    } catch (err) {
      console.error('[ShapeStore] Failed to save:', err);
    }
  }
}
