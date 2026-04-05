import type { OpenSimStructure, OpenSimMeshPart } from '../types/opensim.js';
import type { AlphaRegion } from '../types/clothing.js';

/**
 * Manages body part visibility for alpha masking.
 * When opaque clothing covers a body region, we hide the body mesh
 * underneath to prevent z-fighting.
 *
 * Ruth2 mesh naming → alpha regions:
 *   upper_body: Ruth2v4Body primitives (neck, tank, sleeves)
 *   lower_body: Ruth2v4Body primitives (shorts, stockings) + feet
 *   head: Ruth2v4Head
 *   hands: Ruth2v4Hands + fingernails
 *   feet: Ruth2v4FeetFlat/Med/High + toenails
 */
export class AlphaMaskManager {
  private structure: OpenSimStructure;

  /** Track which regions are currently masked (hidden) */
  private maskedRegions: Set<AlphaRegion> = new Set();

  /** Mesh parts grouped by alpha region */
  private regionMeshes: Map<AlphaRegion, OpenSimMeshPart[]> = new Map();

  constructor(structure: OpenSimStructure) {
    this.structure = structure;
    this.classifyRegions();
  }

  /**
   * Hide body mesh regions covered by clothing.
   */
  maskRegions(regions: AlphaRegion[]): void {
    for (const region of regions) {
      if (this.maskedRegions.has(region)) continue;
      this.maskedRegions.add(region);

      const parts = this.regionMeshes.get(region) ?? [];
      for (const part of parts) {
        part.mesh.isVisible = false;
      }
    }
  }

  /**
   * Show body mesh regions (when clothing is removed).
   */
  unmaskRegions(regions: AlphaRegion[]): void {
    for (const region of regions) {
      if (!this.maskedRegions.has(region)) continue;
      this.maskedRegions.delete(region);

      const parts = this.regionMeshes.get(region) ?? [];
      for (const part of parts) {
        part.mesh.isVisible = true;
      }
    }
  }

  /**
   * Unmask all regions (show full body).
   */
  unmaskAll(): void {
    for (const region of this.maskedRegions) {
      const parts = this.regionMeshes.get(region) ?? [];
      for (const part of parts) {
        part.mesh.isVisible = true;
      }
    }
    this.maskedRegions.clear();
  }

  getMaskedRegions(): AlphaRegion[] {
    return [...this.maskedRegions];
  }

  private classifyRegions(): void {
    const upper: OpenSimMeshPart[] = [];
    const lower: OpenSimMeshPart[] = [];
    const head: OpenSimMeshPart[] = [];
    const hands: OpenSimMeshPart[] = [];
    const feet: OpenSimMeshPart[] = [];

    for (const [, part] of this.structure.meshParts) {
      // Only classify visible meshes (skip hidden variants)
      if (!part.mesh.isVisible) continue;

      const name = part.name.toLowerCase();

      if (part.category === 'head') {
        head.push(part);
      } else if (part.category === 'hands' || (part.category === 'nails' && name.includes('finger'))) {
        hands.push(part);
      } else if (part.category === 'feet' || (part.category === 'nails' && name.includes('toe'))) {
        feet.push(part);
      } else if (part.category === 'body') {
        // Ruth2 body primitives: neck + tank + sleeves = upper, shorts + stockings = lower
        if (name.includes('neck') || name.includes('tank') || name.includes('sleeve')) {
          upper.push(part);
        } else if (name.includes('short') || name.includes('stocking')) {
          lower.push(part);
        } else {
          // Generic body parts — classify by primitive index
          // primitives 0-2 tend to be upper, 3-4 tend to be lower
          upper.push(part); // default to upper for safety
        }
      }
    }

    this.regionMeshes.set('upper_body', upper);
    this.regionMeshes.set('lower_body', lower);
    this.regionMeshes.set('head', head);
    this.regionMeshes.set('hands', hands);
    this.regionMeshes.set('feet', feet);

    console.log(
      `[AlphaMask] Regions: upper=${upper.length}, lower=${lower.length}, ` +
      `head=${head.length}, hands=${hands.length}, feet=${feet.length}`,
    );
  }

  dispose(): void {
    this.unmaskAll();
    this.regionMeshes.clear();
  }
}
