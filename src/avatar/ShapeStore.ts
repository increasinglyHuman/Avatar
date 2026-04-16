/**
 * ShapeStore — Persistence layer for saved shape presets.
 * Depends on: ShapeParameterDefinitions (param metadata), ShapeParameterDriver (capture/apply)
 * Depended on by: ShapeSliderPanel (gallery UI), BodyTab (wiring), AvatarLifecycle (init)
 *
 * Phase 1: localStorage only. Phase 2+: NEXUS inventory sync (see docs/NEXUS-INTEGRATION-SPEC.md).
 * SavedShape schema matches NEXUS inventory_items.properties JSONB format for zero-conversion sync.
 */
import { SHAPE_PARAMETERS } from './ShapeParameterDefinitions.js';
import type { ShapeParameterDriver } from './ShapeParameterDriver.js';

const STORAGE_KEY = 'bb-shapes';

/**
 * Saved shape record — NEXUS-compatible properties schema.
 * Stored in localStorage (Phase 1), synced to NEXUS inventory (Phase 2+).
 */
export interface SavedShape {
  /** Unique ID (local UUID-like string, replaced by NEXUS UUID on sync) */
  id: string;
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

/**
 * Persists shape presets to localStorage.
 * Phase 1: local-only. Phase 2+: NEXUS inventory sync.
 *
 * Follows the same pattern as OutfitStore for consistency.
 */
export class ShapeStore {

  /** Save a new shape from the current driver state. Returns the generated ID. */
  save(name: string, driver: ShapeParameterDriver, gender: 'feminine' | 'masculine'): string {
    const shapes = this.loadAll();
    const id = `shape_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const shape: SavedShape = {
      id,
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
    return true;
  }

  /** Delete a shape by ID. */
  delete(id: string): boolean {
    const shapes = this.loadAll();
    const filtered = shapes.filter((s) => s.id !== id);
    if (filtered.length === shapes.length) return false;
    this.persist(filtered);
    console.log(`[ShapeStore] Deleted ${id}`);
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
    // Build full values map: start with defaults, overlay saved values
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
      return JSON.parse(raw) as SavedShape[];
    } catch {
      console.warn('[ShapeStore] Failed to parse saved shapes');
      return [];
    }
  }

  /** Get a single shape by ID. */
  getById(id: string): SavedShape | undefined {
    return this.loadAll().find((s) => s.id === id);
  }

  /** Get shape count. */
  count(): number {
    return this.loadAll().length;
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
