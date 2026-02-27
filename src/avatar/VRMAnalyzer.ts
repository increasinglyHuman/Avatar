import { PBRMaterial, MultiMaterial } from '@babylonjs/core';
import type { AbstractMesh } from '@babylonjs/core';
import type {
  PrimType,
  PrimInfo,
  VRMStructure,
  ClothingMode,
  AvatarGender,
  MaterialRefs,
} from '../types/index.js';

/**
 * Classification rules — ordered by specificity (most specific first).
 * Matches against material.name using VRoid naming conventions.
 */
const PRIM_RULES: { pattern: RegExp; type: PrimType }[] = [
  { pattern: /_CLOTH/i, type: 'cloth' },
  { pattern: /Body_\d+_SKIN/i, type: 'skin' },
  { pattern: /Face_\d+_SKIN/i, type: 'face_skin' },
  { pattern: /EyeIris/i, type: 'eye_iris' },
  { pattern: /EyeHighlight/i, type: 'eye_highlight' },
  { pattern: /EyeWhite/i, type: 'eye_white' },
  { pattern: /FaceMouth/i, type: 'mouth' },
  { pattern: /FaceBrow/i, type: 'brow' },
  { pattern: /FaceEyelash/i, type: 'lash' },
  { pattern: /FaceEyeline/i, type: 'eyeline' },
  { pattern: /_HAIR/i, type: 'hair' },
  { pattern: /_SKIN/i, type: 'skin' },
];

const FACE_TYPES: PrimType[] = [
  'face_skin',
  'eye_iris',
  'eye_highlight',
  'eye_white',
  'mouth',
  'brow',
  'lash',
  'eyeline',
];

function classifyMaterial(name: string): PrimType {
  for (const rule of PRIM_RULES) {
    if (rule.pattern.test(name)) return rule.type;
  }
  return 'unknown';
}

/**
 * Analyzes loaded VRM meshes and classifies materials by VRoid naming convention.
 * Produces a VRMStructure with cached material references for fast color editing.
 */
export class VRMAnalyzer {
  analyze(meshes: AbstractMesh[]): VRMStructure {
    const bodyPrimitives: PrimInfo[] = [];
    const facePrimitives: PrimInfo[] = [];
    const hairPrimitives: PrimInfo[] = [];
    const clothPrimitives: PrimInfo[] = [];
    const morphTargetNames: string[] = [];
    let hasEyelash = false;

    for (const mesh of meshes) {
      const materials = this.extractMaterials(mesh);

      for (const mat of materials) {
        const type = classifyMaterial(mat.name);
        const prim: PrimInfo = {
          name: mat.name,
          type,
          material: mat,
          mesh,
          vertexCount: mesh.getTotalVertices(),
        };

        if (FACE_TYPES.includes(type)) {
          facePrimitives.push(prim);
          if (type === 'lash') hasEyelash = true;
        } else if (type === 'hair') {
          hairPrimitives.push(prim);
        } else if (type === 'cloth') {
          clothPrimitives.push(prim);
          bodyPrimitives.push(prim);
        } else if (type !== 'unknown') {
          bodyPrimitives.push(prim);
        }
      }

      // Collect morph target names
      const mtm = mesh.morphTargetManager;
      if (mtm) {
        for (let i = 0; i < mtm.numTargets; i++) {
          const name = mtm.getTarget(i).name;
          if (!morphTargetNames.includes(name)) {
            morphTargetNames.push(name);
          }
        }
      }
    }

    const clothingMode = this.detectClothingMode(clothPrimitives, bodyPrimitives);
    const gender: AvatarGender = hasEyelash ? 'feminine' : 'masculine';
    const materialRefs = this.buildMaterialRefs(bodyPrimitives, facePrimitives, hairPrimitives);

    return {
      clothingMode,
      gender,
      bodyPrimitives,
      facePrimitives,
      hairPrimitives,
      clothPrimitives,
      morphTargetNames,
      materialRefs,
    };
  }

  private extractMaterials(mesh: AbstractMesh): PBRMaterial[] {
    const mat = mesh.material;
    if (!mat) return [];

    if (mat instanceof MultiMaterial) {
      return mat.subMaterials.filter((m): m is PBRMaterial => m instanceof PBRMaterial);
    }
    if (mat instanceof PBRMaterial) {
      return [mat];
    }

    return [];
  }

  private detectClothingMode(
    clothPrims: PrimInfo[],
    bodyPrims: PrimInfo[],
  ): ClothingMode {
    if (clothPrims.length > 0) return 'A';
    const skinPrim = bodyPrims.find((p) => p.type === 'skin');
    if (skinPrim && skinPrim.vertexCount > 9000) return 'B';
    return 'nude';
  }

  private buildMaterialRefs(
    bodyPrims: PrimInfo[],
    facePrims: PrimInfo[],
    hairPrims: PrimInfo[],
  ): MaterialRefs {
    return {
      bodySkin: bodyPrims.filter((p) => p.type === 'skin').map((p) => p.material),
      faceSkin: facePrims.filter((p) => p.type === 'face_skin').map((p) => p.material),
      eyeIris: facePrims.filter((p) => p.type === 'eye_iris').map((p) => p.material),
      hair: hairPrims.map((p) => p.material),
      mouth: facePrims.filter((p) => p.type === 'mouth').map((p) => p.material),
    };
  }
}
