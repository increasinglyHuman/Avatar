import { Vector3, Quaternion, Matrix } from '@babylonjs/core';
import type { Scene, TransformNode, Observer } from '@babylonjs/core';

/**
 * Spring bone physics for secondary motion (hair, clothing, accessories).
 *
 * Ported from World's VRMSpringBoneSystem — Verlet integration with
 * sphere colliders against body bones.
 *
 * Auto-discovers VRM spring bone chains (J_Sec_* naming) and supports
 * manual chain registration for OpenSim mesh garments.
 *
 * On Ruth2/Roth2 base meshes this is a no-op (no spring bones in skeleton).
 * Activates when mesh clothing/hair with bone chains is loaded.
 */

// ---------- Types ----------

export type SpringBoneCategory = 'hair' | 'skirt' | 'sleeve' | 'bust' | 'coat' | 'accessory' | 'unknown';

export interface SpringBoneJoint {
  bone: TransformNode;
  parentBone: TransformNode;
  restLocalPosition: Vector3;
  currentTip: Vector3;
  previousTip: Vector3;
  length: number;
  stiffness: number;
  gravity: Vector3;
  dragForce: number;
  hitRadius: number;
}

export interface SpringBoneChain {
  joints: SpringBoneJoint[];
  name: string;
  category: SpringBoneCategory;
}

export interface SphereCollider {
  bone: TransformNode;
  offset: Vector3;
  radius: number;
}

interface CategoryDefaults {
  stiffness: number;
  gravity: number;
  drag: number;
  hitRadius: number;
}

// ---------- Constants ----------

const CATEGORY_DEFAULTS: Record<SpringBoneCategory, CategoryDefaults> = {
  hair:      { stiffness: 0.3,  gravity: 0.10, drag: 0.4,  hitRadius: 0.02 },
  skirt:     { stiffness: 0.7,  gravity: 0.20, drag: 0.3,  hitRadius: 0.03 },
  sleeve:    { stiffness: 0.5,  gravity: 0.15, drag: 0.35, hitRadius: 0.02 },
  bust:      { stiffness: 0.8,  gravity: 0.05, drag: 0.5,  hitRadius: 0.04 },
  coat:      { stiffness: 0.6,  gravity: 0.18, drag: 0.3,  hitRadius: 0.03 },
  accessory: { stiffness: 0.5,  gravity: 0.10, drag: 0.4,  hitRadius: 0.02 },
  unknown:   { stiffness: 0.5,  gravity: 0.10, drag: 0.4,  hitRadius: 0.02 },
};

/** Body collider definitions — VRM bone names (ignored if not found) */
const VRM_BODY_COLLIDERS: Array<{ boneName: string; offset: [number, number, number]; radius: number }> = [
  { boneName: 'J_Bip_C_Head',       offset: [0, 0.08, 0],  radius: 0.12 },
  { boneName: 'J_Bip_C_UpperChest', offset: [0, 0.1, 0],   radius: 0.14 },
  { boneName: 'J_Bip_C_Chest',      offset: [0, 0.08, 0],  radius: 0.12 },
  { boneName: 'J_Bip_C_Hips',       offset: [0, 0, 0],     radius: 0.12 },
];

/** OpenSim equivalent body colliders */
const OPENSIM_BODY_COLLIDERS: Array<{ boneName: string; offset: [number, number, number]; radius: number }> = [
  { boneName: 'mHead',  offset: [0, 0.08, 0],  radius: 0.12 },
  { boneName: 'mChest', offset: [0, 0.1, 0],   radius: 0.14 },
  { boneName: 'mTorso', offset: [0, 0.08, 0],  radius: 0.12 },
  { boneName: 'mPelvis', offset: [0, 0, 0],    radius: 0.12 },
];

// ---------- Helpers ----------

function detectCategory(name: string): SpringBoneCategory {
  const lower = name.toLowerCase();
  if (lower.includes('hair')) return 'hair';
  if (lower.includes('skirt') && !lower.includes('coat')) return 'skirt';
  if (lower.includes('bust')) return 'bust';
  if (lower.includes('sleeve')) return 'sleeve';
  if (lower.includes('coat')) return 'coat';
  return 'unknown';
}

function findNodeByName(root: TransformNode, name: string): TransformNode | null {
  if (root.name === name) return root;
  for (const child of root.getChildren(undefined, false)) {
    if ('getChildren' in child) {
      const found = findNodeByName(child as TransformNode, name);
      if (found) return found;
    }
  }
  return null;
}

// ---------- Main class ----------

export class SpringBoneSystem {
  private scene: Scene;
  private rootNode: TransformNode;
  private chains: SpringBoneChain[] = [];
  private colliders: SphereCollider[] = [];
  private colliderWorldPositions: Vector3[] = [];
  private renderObserver: Observer<Scene> | null = null;
  private enabled = true;

  // Reusable temps (per-instance to prevent cross-system corruption)
  private readonly _tmpVec = Vector3.Zero();
  private readonly _tmpVec2 = Vector3.Zero();
  private readonly _tmpVec3 = Vector3.Zero();
  private readonly _tmpQuat = Quaternion.Identity();
  private readonly _tmpMatrix = Matrix.Identity();

  private lastTime = 0;

  constructor(rootNode: TransformNode, scene: Scene) {
    this.scene = scene;
    this.rootNode = rootNode;

    // Auto-discover VRM spring bones (J_Sec_*)
    this.discoverVRMSpringBones(rootNode);

    // Setup body colliders (try both VRM and OpenSim naming)
    this.setupColliders(rootNode);

    if (this.chains.length > 0) {
      this.lastTime = performance.now();
      this.renderObserver = this.scene.onBeforeRenderObservable.add(() => {
        const now = performance.now();
        const dt = (now - this.lastTime) / 1000;
        this.lastTime = now;
        this.update(dt);
      });
      console.log(
        `[SpringBone] Initialized: ${this.chains.length} chains, ` +
        `${this.chains.reduce((n, c) => n + c.joints.length, 0)} joints, ` +
        `${this.colliders.length} colliders`,
      );
    } else {
      console.log('[SpringBone] No spring bone chains found (normal for Ruth2/Roth2 base)');
    }
  }

  /**
   * Manually register a spring bone chain (for OpenSim mesh garments).
   * Call this after loading mesh clothing/hair that has bone chains.
   */
  addChain(
    name: string,
    boneNodes: TransformNode[],
    category: SpringBoneCategory = 'unknown',
  ): void {
    const defaults = CATEGORY_DEFAULTS[category];
    const joints: SpringBoneJoint[] = [];

    for (const node of boneNodes) {
      const parent = node.parent as TransformNode;
      if (!parent) continue;

      const restLocal = node.position.clone();
      const boneLength = restLocal.length();
      node.computeWorldMatrix(true);
      const worldPos = node.getAbsolutePosition().clone();

      joints.push({
        bone: node,
        parentBone: parent,
        restLocalPosition: restLocal,
        currentTip: worldPos.clone(),
        previousTip: worldPos.clone(),
        length: Math.max(boneLength, 0.001),
        stiffness: defaults.stiffness,
        gravity: new Vector3(0, -defaults.gravity, 0),
        dragForce: defaults.drag,
        hitRadius: defaults.hitRadius,
      });
    }

    if (joints.length > 0) {
      this.chains.push({ joints, name, category });

      // Start observer if this is the first chain
      if (this.chains.length === 1 && !this.renderObserver) {
        this.lastTime = performance.now();
        this.renderObserver = this.scene.onBeforeRenderObservable.add(() => {
          const now = performance.now();
          const dt = (now - this.lastTime) / 1000;
          this.lastTime = now;
          this.update(dt);
        });
      }

      console.log(`[SpringBone] Added chain "${name}" (${category}): ${joints.length} joints`);
    }
  }

  /** Remove a chain by name (e.g., when unequipping clothing). */
  removeChain(name: string): void {
    const idx = this.chains.findIndex((c) => c.name === name);
    if (idx >= 0) {
      this.chains.splice(idx, 1);
      console.log(`[SpringBone] Removed chain "${name}"`);
    }

    // Stop observer if no chains remain
    if (this.chains.length === 0 && this.renderObserver) {
      this.scene.onBeforeRenderObservable.remove(this.renderObserver);
      this.renderObserver = null;
    }
  }

  // ---------- Discovery ----------

  private discoverVRMSpringBones(rootNode: TransformNode): void {
    const springNodes = new Map<string, TransformNode>();
    this.collectSpringNodes(rootNode, springNodes);
    if (springNodes.size === 0) return;

    // Group into chains by chain ID
    const chainGroups = new Map<string, TransformNode[]>();
    for (const [name, node] of springNodes) {
      const chainId = this.extractChainId(name);
      if (!chainGroups.has(chainId)) chainGroups.set(chainId, []);
      chainGroups.get(chainId)!.push(node);
    }

    for (const [chainId, nodes] of chainGroups) {
      nodes.sort((a, b) => this.extractJointIndex(a.name) - this.extractJointIndex(b.name));

      const category = detectCategory(chainId);
      const defaults = CATEGORY_DEFAULTS[category];
      const joints: SpringBoneJoint[] = [];

      for (const node of nodes) {
        const parent = node.parent as TransformNode;
        if (!parent) continue;

        const restLocal = node.position.clone();
        const boneLength = restLocal.length();
        node.computeWorldMatrix(true);
        const worldPos = node.getAbsolutePosition().clone();

        joints.push({
          bone: node,
          parentBone: parent,
          restLocalPosition: restLocal,
          currentTip: worldPos.clone(),
          previousTip: worldPos.clone(),
          length: Math.max(boneLength, 0.001),
          stiffness: defaults.stiffness,
          gravity: new Vector3(0, -defaults.gravity, 0),
          dragForce: defaults.drag,
          hitRadius: defaults.hitRadius,
        });
      }

      if (joints.length > 0) {
        this.chains.push({ joints, name: chainId, category });
      }
    }
  }

  private collectSpringNodes(node: TransformNode, out: Map<string, TransformNode>): void {
    if (node.name.startsWith('J_Sec_')) {
      out.set(node.name, node);
    }
    for (const child of node.getChildren(undefined, false)) {
      if ('getChildren' in child) {
        this.collectSpringNodes(child as TransformNode, out);
      }
    }
  }

  /** "J_Sec_L_HairSide1_00" -> "L_HairSide1" */
  private extractChainId(boneName: string): string {
    const rest = boneName.substring(6);
    const match = rest.match(/^(.+?)_(\d{2})$/);
    return match ? match[1] : rest;
  }

  /** "J_Sec_L_HairSide1_00" -> 0 */
  private extractJointIndex(boneName: string): number {
    const match = boneName.match(/_(\d{2})$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  // ---------- Colliders ----------

  private setupColliders(rootNode: TransformNode): void {
    const colliderDefs = [...VRM_BODY_COLLIDERS, ...OPENSIM_BODY_COLLIDERS];
    for (const def of colliderDefs) {
      const bone = findNodeByName(rootNode, def.boneName);
      if (bone) {
        this.colliders.push({
          bone,
          offset: new Vector3(def.offset[0], def.offset[1], def.offset[2]),
          radius: def.radius,
        });
      }
    }
  }

  private updateColliderPositions(): void {
    for (let i = 0; i < this.colliders.length; i++) {
      const collider = this.colliders[i];
      collider.bone.computeWorldMatrix(true);
      const boneWorldPos = collider.bone.getAbsolutePosition();
      if (!this.colliderWorldPositions[i]) {
        this.colliderWorldPositions[i] = boneWorldPos.clone().addInPlace(collider.offset);
      } else {
        this.colliderWorldPositions[i].copyFrom(boneWorldPos).addInPlace(collider.offset);
      }
    }
  }

  // ---------- Simulation ----------

  private update(deltaTime: number): void {
    if (!this.enabled || this.chains.length === 0) return;
    const dt = Math.min(deltaTime, 1 / 15);
    if (dt <= 0) return;

    this.updateColliderPositions();

    for (const chain of this.chains) {
      for (const joint of chain.joints) {
        this.updateJoint(joint, dt);
      }
    }
  }

  private updateJoint(joint: SpringBoneJoint, dt: number): void {
    const { parentBone, currentTip, previousTip, stiffness, gravity, dragForce, length } = joint;
    const tmp = this._tmpVec;
    const tmp2 = this._tmpVec2;
    const tmp3 = this._tmpVec3;

    parentBone.computeWorldMatrix(true);

    // 1. Verlet velocity (implicit)
    tmp.copyFrom(currentTip).subtractInPlace(previousTip);

    // 2. Drag
    tmp.scaleInPlace(1 - dragForce);

    // 3. Gravity
    tmp.addInPlace(tmp2.copyFrom(gravity).scaleInPlace(dt));

    // 4. Stiffness: pull toward rest position
    const worldRestPos = this.getWorldRestPosition(joint);
    tmp2.copyFrom(worldRestPos).subtractInPlace(currentTip);
    tmp.addInPlace(tmp2.scaleInPlace(stiffness * dt));

    // 5. Integrate
    previousTip.copyFrom(currentTip);
    currentTip.addInPlace(tmp);

    // 6. Length constraint
    const parentWorldPos = parentBone.getAbsolutePosition();
    tmp3.copyFrom(currentTip).subtractInPlace(parentWorldPos);
    const currentLength = tmp3.length();
    if (currentLength > 0.0001) {
      tmp3.scaleInPlace(length / currentLength);
      currentTip.copyFrom(parentWorldPos).addInPlace(tmp3);
    }

    // 7. Collision
    this.resolveCollisions(joint);

    // 8. Apply rotation
    this.applyBoneRotation(joint);
  }

  private getWorldRestPosition(joint: SpringBoneJoint): Vector3 {
    const parentMatrix = joint.parentBone.getWorldMatrix();
    const result = Vector3.Zero();
    Vector3.TransformCoordinatesToRef(joint.restLocalPosition, parentMatrix, result);
    return result;
  }

  private resolveCollisions(joint: SpringBoneJoint): void {
    const tmp = this._tmpVec;
    for (let i = 0; i < this.colliders.length; i++) {
      const collider = this.colliders[i];
      const colliderWorldPos = this.colliderWorldPositions[i];
      const dist = Vector3.Distance(joint.currentTip, colliderWorldPos);
      const minDist = collider.radius + joint.hitRadius;

      if (dist < minDist && dist > 0.0001) {
        joint.currentTip.subtractToRef(colliderWorldPos, tmp);
        tmp.normalize();
        tmp.scaleInPlace(minDist - dist);
        joint.currentTip.addInPlace(tmp);
      }
    }
  }

  private applyBoneRotation(joint: SpringBoneJoint): void {
    const { bone, parentBone, currentTip, restLocalPosition } = joint;
    const tmpQuat = this._tmpQuat;
    const tmp = this._tmpVec;
    const tmp2 = this._tmpVec2;

    const parentWorldMatrix = parentBone.getWorldMatrix();
    const parentWorldMatrixInv = this._tmpMatrix;
    parentWorldMatrix.invertToRef(parentWorldMatrixInv);

    // Transform currentTip to parent local space
    Vector3.TransformCoordinatesToRef(currentTip, parentWorldMatrixInv, tmp);

    // Rotation from rest direction to current direction
    const restDir = tmp2.copyFrom(restLocalPosition);
    const restLen = restDir.length();
    if (restLen < 0.0001) return;
    restDir.scaleInPlace(1 / restLen);

    const currentDir = tmp;
    const curLen = currentDir.length();
    if (curLen < 0.0001) return;
    currentDir.scaleInPlace(1 / curLen);

    Quaternion.FromUnitVectorsToRef(restDir, currentDir, tmpQuat);
    bone.rotationQuaternion = bone.rotationQuaternion || Quaternion.Identity();
    bone.rotationQuaternion.copyFrom(tmpQuat);
  }

  // ---------- Public API ----------

  getChainCount(): number {
    return this.chains.length;
  }

  getChainNames(): string[] {
    return this.chains.map((c) => c.name);
  }

  getChainsByCategory(category: SpringBoneCategory): SpringBoneChain[] {
    return this.chains.filter((c) => c.category === category);
  }

  reset(): void {
    for (const chain of this.chains) {
      for (const joint of chain.joints) {
        joint.parentBone.computeWorldMatrix(true);
        const worldRestPos = this.getWorldRestPosition(joint);
        joint.currentTip.copyFrom(worldRestPos);
        joint.previousTip.copyFrom(worldRestPos);
      }
    }
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.reset();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  dispose(): void {
    if (this.renderObserver) {
      this.scene.onBeforeRenderObservable.remove(this.renderObserver);
      this.renderObserver = null;
    }
    this.chains = [];
    this.colliders = [];
    this.colliderWorldPositions = [];
  }
}
