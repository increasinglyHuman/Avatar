import { Vector3 } from '@babylonjs/core';
import type { Scene, Skeleton, TransformNode, Observer } from '@babylonjs/core';

/**
 * SL-compatible collision volume bounce physics.
 *
 * Drives LEFT_PEC, RIGHT_PEC, BELLY, and BUTT CVs with spring-damper
 * simulation triggered by avatar root motion (walking, turning, jumping).
 * Matches the Second Life Avatar Physics wearable layer behavior.
 *
 * Each region has: bounce (amplitude), drag (damping), spring (stiffness),
 * and maxEffect (displacement clamp).
 */

interface BounceRegion {
  name: string;
  cvNodes: TransformNode[];
  restPositions: Vector3[];
  velocity: Vector3;
  displacement: Vector3;
  bounce: number;
  drag: number;
  spring: number;
  maxEffect: number;
  /** Primary axis of motion for this region (local space) */
  axis: Vector3;
}

export interface BounceParams {
  bounce: number;
  drag: number;
  spring: number;
  maxEffect: number;
}

// Tuned for visibility with idle animation impulse.
// bounce = impulse gain, drag = damping, spring = return stiffness, maxEffect = displacement clamp
const DEFAULT_BREAST: BounceParams = { bounce: 3.0, drag: 1.2, spring: 2.0, maxEffect: 0.03 };
const DEFAULT_BELLY: BounceParams = { bounce: 1.6, drag: 1.5, spring: 3.0, maxEffect: 0.016 };
const DEFAULT_BUTT: BounceParams = { bounce: 2.0, drag: 1.3, spring: 2.5, maxEffect: 0.02 };

export class CVBounceDriver {
  private scene: Scene;
  private regions: BounceRegion[] = [];
  private lastRootPos = Vector3.Zero();
  private rootVelocity = Vector3.Zero();
  private rootNode: TransformNode | null = null;
  private skeleton: Skeleton;
  private enabled = true;
  /** Track chest bone world position as impulse source (idle animation drives this) */
  private chestNode: TransformNode | null = null;
  private lastChestWorldPos = Vector3.Zero();
  private lastChestVelocity = Vector3.Zero();
  private _debugTimer = 0;
  private renderObserver: Observer<Scene> | null = null;

  constructor(scene: Scene, skeleton: Skeleton, rootNode: TransformNode) {
    this.scene = scene;
    this.skeleton = skeleton;
    this.rootNode = rootNode;
    this.lastRootPos = rootNode.position.clone();

    // Find CV TransformNodes and the chest animation bone for impulse sampling
    const cvMap = new Map<string, TransformNode>();
    for (const bone of skeleton.bones) {
      const tn = bone.getTransformNode();
      if (!tn) continue;
      if (bone.name === bone.name.toUpperCase() && bone.name.length > 2) {
        cvMap.set(bone.name, tn);
      }
      if (bone.name === 'mChest') {
        this.chestNode = tn;
      }
    }
    if (this.chestNode) {
      this.lastChestWorldPos = this.chestNode.getAbsolutePosition().clone();
    }

    // Breast region (LEFT_PEC + RIGHT_PEC) — bounces vertically (Y axis)
    this.addRegion('breast', ['LEFT_PEC', 'RIGHT_PEC'], cvMap, DEFAULT_BREAST,
      new Vector3(0, 1, 0),
    );

    // Belly region — bounces vertically
    this.addRegion('belly', ['BELLY'], cvMap, DEFAULT_BELLY,
      new Vector3(0, 1, 0),
    );

    // Butt region — bounces vertically
    this.addRegion('butt', ['BUTT'], cvMap, DEFAULT_BUTT,
      new Vector3(0, 1, 0),
    );

    console.log(
      `[CVBounce] Initialized: ${this.regions.length} regions, ` +
      `${this.regions.reduce((n, r) => n + r.cvNodes.length, 0)} CV nodes`,
    );

    // Register AFTER animations update — skeleton animation overwrites bone
    // transforms each frame, so CV displacement must be applied after that.
    // onAfterAnimationsObservable fires after animation groups evaluate but
    // before the final render, so our displacement survives to the GPU.
    this.renderObserver = this.scene.onAfterAnimationsObservable.add(() => this.update());
  }

  private addRegion(
    name: string,
    cvNames: string[],
    cvMap: Map<string, TransformNode>,
    params: BounceParams,
    axis: Vector3,
  ): void {
    const nodes: TransformNode[] = [];
    const restPositions: Vector3[] = [];

    for (const cvName of cvNames) {
      const tn = cvMap.get(cvName);
      if (tn) {
        nodes.push(tn);
        restPositions.push(tn.position.clone());
      }
    }

    if (nodes.length === 0) {
      console.warn(`[CVBounce] No CV nodes found for region "${name}"`);
      return;
    }

    this.regions.push({
      name,
      cvNodes: nodes,
      restPositions,
      velocity: Vector3.Zero(),
      displacement: Vector3.Zero(),
      bounce: params.bounce,
      drag: params.drag,
      spring: params.spring,
      maxEffect: params.maxEffect,
      axis,
    });
  }

  /**
   * Per-frame spring-damper simulation.
   * Driven by chest bone world velocity from idle animations.
   */
  private update(): void {
    if (!this.enabled) return;

    const dt = this.scene.getEngine().getDeltaTime() / 1000;
    if (dt <= 0 || dt > 0.1) return; // skip bad frames

    // Sample chest bone world-space velocity, then compute ACCELERATION.
    // Bounce is driven by acceleration (change in velocity), not velocity.
    // When the body changes direction (hop up → fall down), that's the impulse.
    let bodyAcceleration = Vector3.Zero();
    if (this.chestNode) {
      const chestWorldPos = this.chestNode.getAbsolutePosition();
      const chestVelocity = chestWorldPos.subtract(this.lastChestWorldPos).scaleInPlace(1 / dt);
      bodyAcceleration = chestVelocity.subtract(this.lastChestVelocity).scaleInPlace(1 / dt);
      this.lastChestVelocity.copyFrom(chestVelocity);
      this.lastChestWorldPos.copyFrom(chestWorldPos);
    }

    // Debug: log every ~2 seconds
    this._debugTimer += dt;
    if (this._debugTimer > 2.0) {
      this._debugTimer = 0;
      const acc = bodyAcceleration.length().toFixed(4);
      const disp = this.regions[0]?.displacement.y.toFixed(6) ?? '?';
      const vel = this.regions[0]?.velocity.y.toFixed(6) ?? '?';
      console.log(`[CVBounce] accel=${acc} breastDisp=${disp} breastVel=${vel}`);
    }

    for (const region of this.regions) {
      // Project body acceleration onto region axis (vertical)
      const accelOnAxis = Vector3.Dot(bodyAcceleration, region.axis);

      // The bounce impulse is OPPOSITE to body acceleration:
      // body accelerates UP → soft tissue lags DOWN (and vice versa)
      const impulse = -accelOnAxis * region.bounce;

      // Current displacement and velocity along axis
      const d = Vector3.Dot(region.displacement, region.axis);
      const v = Vector3.Dot(region.velocity, region.axis);

      // Spring-damper: F = -spring * d - drag * v + impulse
      const force = -region.spring * d - region.drag * v + impulse;

      // Integrate (semi-implicit Euler)
      const newV = v + force * dt;
      const newD = d + newV * dt;

      // Clamp displacement
      const clampedD = Math.max(-region.maxEffect, Math.min(region.maxEffect, newD));

      // Write back
      region.velocity.copyFrom(region.axis).scaleInPlace(newV);
      region.displacement.copyFrom(region.axis).scaleInPlace(clampedD);

      // Apply to CV nodes
      for (let i = 0; i < region.cvNodes.length; i++) {
        const node = region.cvNodes[i];
        const rest = region.restPositions[i];
        node.position.copyFrom(rest).addInPlace(region.displacement);
      }
    }

    // Force skeleton to recompute transform matrices this frame.
    // skeleton.prepare() caches by renderId and skips if already computed,
    // so we must pass dontCheckFrameId=true after modifying CV positions.
    this.skeleton.prepare(true);
  }

  /**
   * Inject an external impulse (e.g., from animation velocity detection).
   * direction should be in local avatar space.
   */
  applyImpulse(direction: Vector3, strength: number): void {
    for (const region of this.regions) {
      const dot = Vector3.Dot(direction, region.axis);
      const impulse = dot * strength * region.bounce;
      region.velocity.addInPlace(region.axis.scale(impulse));
    }
  }

  /**
   * Update parameters for a specific region.
   */
  setRegionParams(regionName: string, params: Partial<BounceParams>): void {
    const region = this.regions.find((r) => r.name === regionName);
    if (!region) return;
    if (params.bounce !== undefined) region.bounce = params.bounce;
    if (params.drag !== undefined) region.drag = params.drag;
    if (params.spring !== undefined) region.spring = params.spring;
    if (params.maxEffect !== undefined) region.maxEffect = params.maxEffect;
  }

  getRegionParams(regionName: string): BounceParams | null {
    const region = this.regions.find((r) => r.name === regionName);
    if (!region) return null;
    return {
      bounce: region.bounce,
      drag: region.drag,
      spring: region.spring,
      maxEffect: region.maxEffect,
    };
  }

  getRegionNames(): string[] {
    return this.regions.map((r) => r.name);
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) {
      // Reset all CVs to rest position
      for (const region of this.regions) {
        region.velocity.setAll(0);
        region.displacement.setAll(0);
        for (let i = 0; i < region.cvNodes.length; i++) {
          region.cvNodes[i].position.copyFrom(region.restPositions[i]);
        }
      }
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  dispose(): void {
    if (this.renderObserver) {
      this.scene.onAfterAnimationsObservable.remove(this.renderObserver);
      this.renderObserver = null;
    }
    // Reset CVs to rest
    this.setEnabled(false);
    this.regions = [];
  }
}
