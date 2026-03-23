#!/usr/bin/env node
/**
 * VRM Asset Catalog Extractor
 *
 * Scans VRoid VRM exports, analyzes structure, extracts clothing pieces
 * as standalone GLBs, and generates an inventory catalog manifest.
 *
 * Usage:
 *   node tools/extract-catalog.mjs --analyze              # Catalog only (fast, no extraction)
 *   node tools/extract-catalog.mjs --extract              # Extract GLBs + catalog
 *   node tools/extract-catalog.mjs --extract --deduplicate  # Extract with deduplication
 *   node tools/extract-catalog.mjs --extract --single tops/top01.vrm  # Single file
 *
 * Output:
 *   extracted-assets/
 *   ├── catalog/items.json        # Master inventory manifest
 *   ├── bases/                    # Nude body GLBs
 *   ├── clothing/{slot}/          # Individual garment GLBs
 *   ├── hair/                     # Hair mesh GLBs
 *   └── texture-layers/{slot}/    # Texture-only PNGs (socks, underwear)
 */

import { NodeIO } from '@gltf-transform/core';
import { prune, dedup, cloneDocument } from '@gltf-transform/functions';
import { createHash } from 'node:crypto';
import { readdir, mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { join, basename, extname, relative } from 'node:path';
import { existsSync } from 'node:fs';

// ─── Configuration ───────────────────────────────────────────────────────────

const ASSET_ROOT = '/home/p0qp0q/blackbox/avatar-preserved/assets/vRoidModels';
const OUTPUT_ROOT = join(process.cwd(), 'extracted-assets');

/** Source directories to scan, mapped to clothing slot hints */
const SOURCE_DIRS = {
  'clothing/tops':          { slotHint: 'tops',          type: 'geometry' },
  'clothing/pants':         { slotHint: 'bottoms',       type: 'geometry' },
  'clothing/dresses':       { slotHint: 'onepiece',      type: 'geometry' },
  'clothing/shoes':         { slotHint: 'shoes',         type: 'geometry' },
  'clothing/accessories':   { slotHint: 'accessory',     type: 'geometry' },
  'clothing/socks':         { slotHint: 'socks',         type: 'texture' },
  'clothing/inner_tops':    { slotHint: 'undershirt',    type: 'texture' },
  'clothing/inner_bottoms': { slotHint: 'underpants',    type: 'texture' },
  'hair':                   { slotHint: 'hair',          type: 'hair' },
  'bases':                  { slotHint: 'base',          type: 'base' },
  'body-types':             { slotHint: 'base',          type: 'base' },
};

// ─── Material Name Classification ────────────────────────────────────────────

const PRIM_RULES = [
  { pattern: /_CLOTH/i,        type: 'cloth' },
  { pattern: /Body_\d+_SKIN/i, type: 'skin' },
  { pattern: /Face_\d+_SKIN/i, type: 'face_skin' },
  { pattern: /EyeIris/i,       type: 'eye_iris' },
  { pattern: /EyeHighlight/i,  type: 'eye_highlight' },
  { pattern: /EyeWhite/i,      type: 'eye_white' },
  { pattern: /FaceMouth/i,     type: 'mouth' },
  { pattern: /FaceBrow/i,      type: 'brow' },
  { pattern: /FaceEyelash/i,   type: 'lash' },
  { pattern: /FaceEyeline/i,   type: 'eyeline' },
  { pattern: /_HAIR/i,         type: 'hair' },
  { pattern: /_SKIN/i,         type: 'skin' },
];

function classifyPrimitive(materialName) {
  for (const rule of PRIM_RULES) {
    if (rule.pattern.test(materialName)) return rule.type;
  }
  return 'unknown';
}

/**
 * Infer clothing slot from VRoid CLOTH material naming.
 * VRoid's internal names don't always match our directory organization
 * (e.g., a top might be exported as "Onepiece" in VRoid's material name).
 * The directory hint (from our curated file organization) takes priority.
 */
function classifyClothSlot(materialName, dirSlotHint) {
  // VRoid material name classification (secondary — VRoid's own labels)
  const vroidSlot = classifyClothSlotFromMaterial(materialName);

  // Directory hint takes priority — our curated organization is more reliable
  // than VRoid's internal naming which can misclassify items
  if (dirSlotHint && dirSlotHint !== 'clothing') {
    return dirSlotHint;
  }

  return vroidSlot;
}

/** Extract VRoid's own slot classification from material name */
function classifyClothSlotFromMaterial(materialName) {
  const lower = materialName.toLowerCase();
  if (/tops?[_\d]/i.test(materialName))     return 'tops';
  if (/bottom/i.test(lower))                return 'bottoms';
  if (/onepiece/i.test(lower))              return 'onepiece';
  if (/shoes?[_\d]/i.test(materialName))    return 'shoes';
  if (/sock/i.test(lower))                  return 'socks';
  if (/glove/i.test(lower))                 return 'gloves';
  if (/dress/i.test(lower))                 return 'onepiece';
  if (/accessory/i.test(lower)) {
    if (/neck/i.test(lower))                return 'accessory_neck';
    if (/arm|wrist/i.test(lower))           return 'accessory_arm';
    return 'accessory';
  }
  return 'clothing';
}

/**
 * Detect gender from face primitives and filename.
 * VRoid eyelash presence is the primary signal.
 * Filename patterns (nude-feminine, hF*) serve as fallback.
 */
function detectGender(primitives, fileName = '') {
  // Primary: eyelash in face prims
  if (primitives.some(p => p.type === 'lash')) return 'feminine';
  // Fallback: filename patterns
  const lower = fileName.toLowerCase();
  if (lower.includes('feminine') || lower.includes('female') || /^hf\d/i.test(lower)) return 'feminine';
  if (lower.includes('masculine') || lower.includes('male')) return 'masculine';
  // Default: most VRoid exports in our library are feminine
  return 'feminine';
}

/** Detect clothing mode from primitives */
function detectClothingMode(primitives) {
  const hasCloth = primitives.some(p => p.type === 'cloth');
  if (hasCloth) return 'A';
  const skinPrim = primitives.find(p => p.type === 'skin');
  if (skinPrim && skinPrim.vertexCount > 9000) return 'B';
  return 'nude';
}

// ─── GLB Parsing & Analysis ──────────────────────────────────────────────────

const io = new NodeIO();

/**
 * Analyze a VRM file and return structured metadata about all primitives.
 */
async function analyzeVRM(filePath) {
  const doc = await io.read(filePath);
  const root = doc.getRoot();

  const meshes = root.listMeshes();
  const skins = root.listSkins();
  const nodes = root.listNodes();

  const allPrimitives = [];
  const meshMap = new Map(); // mesh → node name

  // Map nodes to meshes
  for (const node of nodes) {
    const mesh = node.getMesh();
    if (mesh) {
      meshMap.set(mesh, node.getName());
    }
  }

  for (const mesh of meshes) {
    const nodeName = meshMap.get(mesh) || mesh.getName() || 'unnamed';

    for (const prim of mesh.listPrimitives()) {
      const material = prim.getMaterial();
      const matName = material?.getName() || '';
      const type = classifyPrimitive(matName);

      // Vertex count from POSITION accessor
      const posAccessor = prim.getAttribute('POSITION');
      const vertexCount = posAccessor ? posAccessor.getCount() : 0;

      // Triangle count from indices
      const indices = prim.getIndices();
      const triangleCount = indices ? Math.floor(indices.getCount() / 3) : 0;

      // Check for skinning
      const hasJoints = !!prim.getAttribute('JOINTS_0');
      const hasWeights = !!prim.getAttribute('WEIGHTS_0');

      // Geometry hash (MD5 of position data)
      let geometryHash = null;
      if (posAccessor) {
        const posArray = posAccessor.getArray();
        if (posArray) {
          const hash = createHash('md5');
          hash.update(Buffer.from(posArray.buffer, posArray.byteOffset, posArray.byteLength));
          geometryHash = hash.digest('hex');
        }
      }

      // Texture info
      const baseColorTex = material?.getBaseColorTexture?.() || null;
      const texSize = baseColorTex?.getSize?.() || null;

      allPrimitives.push({
        meshName: nodeName,
        materialName: matName,
        type,
        vertexCount,
        triangleCount,
        hasSkinning: hasJoints && hasWeights,
        geometryHash,
        textureResolution: texSize ? [texSize[0], texSize[1]] : null,
      });
    }
  }

  // Skeleton info
  const skeleton = {
    boneCount: 0,
    boneNames: [],
  };
  if (skins.length > 0) {
    const skin = skins[0];
    const joints = skin.listJoints();
    skeleton.boneCount = joints.length;
    skeleton.boneNames = joints.map(j => j.getName());
  }

  const clothingMode = detectClothingMode(allPrimitives);
  const gender = detectGender(allPrimitives, basename(filePath));

  return {
    filePath,
    fileName: basename(filePath),
    primitives: allPrimitives,
    clothingMode,
    gender,
    skeleton,
    meshCount: meshes.length,
    skinCount: skins.length,
    _document: doc,  // Keep for extraction
  };
}

// ─── Primitive Extraction ────────────────────────────────────────────────────

/**
 * Extract a single primitive from a VRM as a standalone GLB.
 * Clones the document, removes everything except the target primitive,
 * then prunes unused resources.
 */
async function extractPrimitive(analysis, targetMaterialName) {
  const doc = cloneDocument(analysis._document);
  const root = doc.getRoot();

  // Find and keep only the target primitive
  let targetPrim = null;
  let targetMesh = null;

  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const matName = prim.getMaterial()?.getName() || '';
      if (matName === targetMaterialName) {
        targetPrim = prim;
        targetMesh = mesh;
      }
    }
  }

  if (!targetPrim || !targetMesh) {
    throw new Error(`Primitive not found: ${targetMaterialName}`);
  }

  // Remove all other primitives from the target mesh
  for (const prim of targetMesh.listPrimitives()) {
    if (prim !== targetPrim) {
      targetMesh.removePrimitive(prim);
    }
  }

  // Remove all other meshes from nodes
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (mesh && mesh !== targetMesh) {
      node.setMesh(null);
    }
  }

  // Strip VRM-specific extensions (output is plain GLB)
  for (const ext of doc.getRoot().listExtensionsUsed()) {
    const name = ext.extensionName;
    if (name.startsWith('VRMC_') || name === 'VRM') {
      ext.dispose();
    }
  }

  // Prune unused resources (materials, textures, accessors, nodes)
  await doc.transform(prune());

  // Write to binary GLB
  const glb = await io.writeBinary(doc);
  return glb;
}

/**
 * Extract the Hair mesh (Hair001 + HairBack) as a standalone GLB.
 */
async function extractHair(analysis) {
  const doc = cloneDocument(analysis._document);
  const root = doc.getRoot();

  // Keep only hair-related primitives
  for (const mesh of root.listMeshes()) {
    const primsToRemove = [];
    for (const prim of mesh.listPrimitives()) {
      const matName = prim.getMaterial()?.getName() || '';
      const type = classifyPrimitive(matName);
      if (type !== 'hair') {
        primsToRemove.push(prim);
      }
    }
    for (const prim of primsToRemove) {
      mesh.removePrimitive(prim);
    }
  }

  // Remove meshes with no remaining primitives
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (mesh && mesh.listPrimitives().length === 0) {
      node.setMesh(null);
    }
  }

  // Strip VRM extensions
  for (const ext of doc.getRoot().listExtensionsUsed()) {
    if (ext.extensionName.startsWith('VRMC_') || ext.extensionName === 'VRM') {
      ext.dispose();
    }
  }

  await doc.transform(prune());
  return await io.writeBinary(doc);
}

/**
 * Extract the base body (SKIN only, no CLOTH, no face, no hair) as GLB.
 */
async function extractBase(analysis) {
  const doc = cloneDocument(analysis._document);
  const root = doc.getRoot();

  for (const mesh of root.listMeshes()) {
    const primsToRemove = [];
    for (const prim of mesh.listPrimitives()) {
      const matName = prim.getMaterial()?.getName() || '';
      const type = classifyPrimitive(matName);
      // Keep only body skin
      if (type !== 'skin') {
        primsToRemove.push(prim);
      }
    }
    for (const prim of primsToRemove) {
      mesh.removePrimitive(prim);
    }
  }

  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (mesh && mesh.listPrimitives().length === 0) {
      node.setMesh(null);
    }
  }

  for (const ext of doc.getRoot().listExtensionsUsed()) {
    if (ext.extensionName.startsWith('VRMC_') || ext.extensionName === 'VRM') {
      ext.dispose();
    }
  }

  await doc.transform(prune());
  return await io.writeBinary(doc);
}

/**
 * Extract texture-only items (socks, underwear).
 * Returns the base color texture PNG from the body skin material,
 * which includes the painted garment.
 */
async function extractBodyTexture(analysis) {
  const doc = analysis._document;
  const root = doc.getRoot();

  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const mat = prim.getMaterial();
      const matName = mat?.getName() || '';
      if (/Body_\d+_SKIN/i.test(matName)) {
        const tex = mat.getBaseColorTexture();
        if (tex) {
          const image = tex.getImage();
          if (image) {
            return { data: Buffer.from(image), mimeType: tex.getMimeType() || 'image/png' };
          }
        }
      }
    }
  }
  return null;
}

// ─── Catalog Generation ──────────────────────────────────────────────────────

/**
 * Scan all source directories and analyze every VRM file.
 */
async function scanAllVRMs() {
  const results = [];

  for (const [dirRelative, dirConfig] of Object.entries(SOURCE_DIRS)) {
    const dirPath = join(ASSET_ROOT, dirRelative);
    if (!existsSync(dirPath)) {
      console.warn(`  ⚠ Directory not found: ${dirRelative}`);
      continue;
    }

    const files = await readdir(dirPath);
    const vrmFiles = files.filter(f => extname(f).toLowerCase() === '.vrm').sort();

    console.log(`\n📁 ${dirRelative}/ (${vrmFiles.length} VRMs)`);

    for (const file of vrmFiles) {
      const filePath = join(dirPath, file);
      try {
        process.stdout.write(`  Analyzing ${file}...`);
        const analysis = await analyzeVRM(filePath);
        results.push({
          ...analysis,
          sourceDir: dirRelative,
          dirConfig,
        });
        const clothCount = analysis.primitives.filter(p => p.type === 'cloth').length;
        const hairCount = analysis.primitives.filter(p => p.type === 'hair').length;
        console.log(` ${analysis.clothingMode} | ${analysis.gender} | ${clothCount} cloth | ${hairCount} hair | ${analysis.skeleton.boneCount} bones`);
      } catch (err) {
        console.log(` ERROR: ${err.message}`);
      }
    }
  }

  return results;
}

/**
 * Build the catalog manifest from analysis results.
 */
function buildCatalog(analyses, options = {}) {
  const catalog = {
    version: 1,
    generated: new Date().toISOString(),
    generator: 'extract-catalog.mjs',
    stats: {
      totalVRMs: analyses.length,
      totalClothPrimitives: 0,
      uniqueClothGeometries: 0,
      totalHairStyles: 0,
      baseBodies: 0,
      textureOnlyItems: 0,
    },
    bases: [],
    hair: [],
    clothing: [],
    textureLayers: [],
  };

  const geometryHashes = new Map(); // hash → first item id
  let clothIdx = 0;
  let hairIdx = 0;

  for (const analysis of analyses) {
    const { fileName, sourceDir, dirConfig, primitives, clothingMode, gender, skeleton } = analysis;
    const stem = basename(fileName, extname(fileName));

    // ── Base bodies ──
    if (dirConfig.type === 'base') {
      catalog.bases.push({
        id: stem,
        gender,
        source: 'vroid',
        sourceFile: fileName,
        asset: `bases/${stem}.glb`,
        skeleton: `j_bip_${skeleton.boneCount}`,
        boneCount: skeleton.boneCount,
        primitives: primitives.map(p => ({
          name: p.materialName,
          type: p.type,
          vertexCount: p.vertexCount,
          triangleCount: p.triangleCount,
        })),
      });
      catalog.stats.baseBodies++;
      continue;
    }

    // ── Hair ──
    if (dirConfig.type === 'hair') {
      const hairPrims = primitives.filter(p => p.type === 'hair');
      if (hairPrims.length > 0) {
        const id = `hair-${stem}`;
        catalog.hair.push({
          id,
          gender,
          source: 'vroid',
          sourceFile: fileName,
          asset: `hair/${stem}.glb`,
          thumbnail: `thumbnails/${stem}.png`,
          skeleton: `j_bip_${skeleton.boneCount}`,
          primitives: hairPrims.map(p => ({
            name: p.materialName,
            vertexCount: p.vertexCount,
            triangleCount: p.triangleCount,
            geometryHash: p.geometryHash,
          })),
          springBones: skeleton.boneNames.filter(n => n.startsWith('J_Sec_')).length,
        });
        catalog.stats.totalHairStyles++;
      }
      continue;
    }

    // ── Texture-only items (socks, underwear) ──
    if (dirConfig.type === 'texture') {
      const slot = dirConfig.slotHint;
      catalog.textureLayers.push({
        id: `${slot}-${stem}`,
        slot,
        source: 'vroid',
        sourceFile: fileName,
        asset: `texture-layers/${slot}/${stem}.png`,
        thumbnail: `thumbnails/${slot}-${stem}.png`,
        targetMesh: 'body',
        uvLayout: 'vroid-standard',
        blendMode: 'alpha',
        compositingLayer: slot === 'socks' ? 1 : (slot === 'undershirt' ? 1 : 1),
        gender,
        // Include body texture info for diff extraction
        bodyTextureHash: primitives.find(p => p.type === 'skin')?.geometryHash || null,
      });
      catalog.stats.textureOnlyItems++;
      continue;
    }

    // ── Geometry clothing (Mode A) ──
    if (dirConfig.type === 'geometry') {
      const clothPrims = primitives.filter(p => p.type === 'cloth');

      if (clothPrims.length === 0 && clothingMode !== 'A') {
        // Mode B or nude — log but skip extraction
        console.warn(`  ⚠ ${fileName}: Mode ${clothingMode}, no extractable CLOTH primitives`);
      }

      for (const cp of clothPrims) {
        const slot = classifyClothSlot(cp.materialName, dirConfig.slotHint);
        const itemId = `${slot}-${stem}-${clothIdx++}`;

        // Deduplication check
        let isDuplicate = false;
        let duplicateOf = null;
        if (cp.geometryHash && geometryHashes.has(cp.geometryHash)) {
          isDuplicate = true;
          duplicateOf = geometryHashes.get(cp.geometryHash);
        } else if (cp.geometryHash) {
          geometryHashes.set(cp.geometryHash, itemId);
        }

        const vroidSlot = classifyClothSlotFromMaterial(cp.materialName);

        catalog.clothing.push({
          id: itemId,
          slot,
          vroidSlot,  // VRoid's internal classification (may differ from slot)
          source: 'vroid',
          sourceFile: fileName,
          sourceDir,
          materialName: cp.materialName,
          asset: `clothing/${slot}/${stem}-${cp.materialName.replace(/[^a-zA-Z0-9_-]/g, '_')}.glb`,
          thumbnail: `thumbnails/${slot}-${stem}.png`,
          vertexCount: cp.vertexCount,
          triangleCount: cp.triangleCount,
          hasSkinning: cp.hasSkinning,
          skeleton: `j_bip_${skeleton.boneCount}`,
          gender,
          geometryHash: cp.geometryHash,
          textureResolution: cp.textureResolution,
          tintable: true,
          isDuplicate,
          duplicateOf,
        });

        catalog.stats.totalClothPrimitives++;
        if (!isDuplicate) catalog.stats.uniqueClothGeometries++;
      }

      // Also catalog non-CLOTH primitives from clothing VRMs
      // (these are the "bonus" pieces that come with multi-layer exports)
      const nonClothTypes = ['hair', 'skin', 'face_skin'];
      const bonusPrims = primitives.filter(p =>
        !nonClothTypes.includes(p.type) &&
        p.type !== 'cloth' &&
        p.type !== 'unknown'
      );
      // We don't extract these, but note them in a separate field
    }
  }

  return catalog;
}

// ─── Extraction Pipeline ─────────────────────────────────────────────────────

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function runExtraction(analyses, catalog) {
  console.log('\n═══════════════════════════════════════════');
  console.log('  EXTRACTION PHASE');
  console.log('═══════════════════════════════════════════\n');

  // Prepare output directories
  const dirs = [
    'catalog',
    'bases',
    'hair',
    'thumbnails',
    'texture-layers/socks',
    'texture-layers/undershirt',
    'texture-layers/underpants',
  ];
  // Clothing slot dirs
  const clothingSlots = [...new Set(catalog.clothing.map(c => c.slot))];
  for (const slot of clothingSlots) {
    dirs.push(`clothing/${slot}`);
  }
  for (const dir of dirs) {
    await ensureDir(join(OUTPUT_ROOT, dir));
  }

  let extracted = 0;
  let skipped = 0;
  let errors = 0;

  // ── Extract bases ──
  for (const base of catalog.bases) {
    const analysis = analyses.find(a => a.fileName === base.sourceFile);
    if (!analysis) continue;

    const outPath = join(OUTPUT_ROOT, base.asset);
    try {
      process.stdout.write(`  Extracting base: ${base.id}...`);
      const glb = await extractBase(analysis);
      await writeFile(outPath, glb);
      console.log(` ✓ (${(glb.length / 1024).toFixed(0)} KB)`);
      extracted++;
    } catch (err) {
      console.log(` ✗ ${err.message}`);
      errors++;
    }
  }

  // ── Extract hair ──
  for (const hair of catalog.hair) {
    const analysis = analyses.find(a => a.fileName === hair.sourceFile);
    if (!analysis) continue;

    const outPath = join(OUTPUT_ROOT, hair.asset);
    try {
      process.stdout.write(`  Extracting hair: ${hair.id}...`);
      const glb = await extractHair(analysis);
      await writeFile(outPath, glb);
      console.log(` ✓ (${(glb.length / 1024).toFixed(0)} KB)`);
      extracted++;
    } catch (err) {
      console.log(` ✗ ${err.message}`);
      errors++;
    }
  }

  // ── Extract clothing ──
  const shouldDeduplicate = process.argv.includes('--deduplicate');
  for (const item of catalog.clothing) {
    if (shouldDeduplicate && item.isDuplicate) {
      skipped++;
      continue;
    }

    const analysis = analyses.find(a => a.fileName === item.sourceFile);
    if (!analysis) continue;

    const outPath = join(OUTPUT_ROOT, item.asset);
    await ensureDir(join(outPath, '..'));

    try {
      process.stdout.write(`  Extracting ${item.slot}: ${item.materialName}...`);
      const glb = await extractPrimitive(analysis, item.materialName);
      await writeFile(outPath, glb);
      console.log(` ✓ (${(glb.length / 1024).toFixed(0)} KB)`);
      extracted++;
    } catch (err) {
      console.log(` ✗ ${err.message}`);
      errors++;
    }
  }

  // ── Extract texture layers ──
  for (const layer of catalog.textureLayers) {
    const analysis = analyses.find(a => a.fileName === layer.sourceFile);
    if (!analysis) continue;

    const outPath = join(OUTPUT_ROOT, layer.asset);
    await ensureDir(join(outPath, '..'));

    try {
      process.stdout.write(`  Extracting texture: ${layer.id}...`);
      const tex = await extractBodyTexture(analysis);
      if (tex) {
        const ext = tex.mimeType.includes('png') ? '.png' : '.jpg';
        const finalPath = outPath.replace(/\.\w+$/, ext);
        await writeFile(finalPath, tex.data);
        layer.asset = layer.asset.replace(/\.\w+$/, ext);
        console.log(` ✓ (${(tex.data.length / 1024).toFixed(0)} KB)`);
        extracted++;
      } else {
        console.log(' ✗ No body texture found');
        errors++;
      }
    } catch (err) {
      console.log(` ✗ ${err.message}`);
      errors++;
    }
  }

  console.log(`\n  Extracted: ${extracted} | Skipped (dedup): ${skipped} | Errors: ${errors}`);
  return { extracted, skipped, errors };
}

// ─── Summary Report ──────────────────────────────────────────────────────────

function printSummary(catalog) {
  console.log('\n═══════════════════════════════════════════');
  console.log('  INVENTORY CATALOG SUMMARY');
  console.log('═══════════════════════════════════════════\n');

  console.log(`  Total VRMs scanned:        ${catalog.stats.totalVRMs}`);
  console.log(`  Base bodies:               ${catalog.stats.baseBodies}`);
  console.log(`  Hair styles:               ${catalog.stats.totalHairStyles}`);
  console.log(`  CLOTH primitives found:    ${catalog.stats.totalClothPrimitives}`);
  console.log(`  Unique geometries:         ${catalog.stats.uniqueClothGeometries}`);
  console.log(`  Texture-only items:        ${catalog.stats.textureOnlyItems}`);

  // Slot breakdown
  const slotCounts = {};
  for (const item of catalog.clothing) {
    slotCounts[item.slot] = (slotCounts[item.slot] || 0) + 1;
  }
  console.log('\n  Clothing by slot:');
  for (const [slot, count] of Object.entries(slotCounts).sort()) {
    const unique = catalog.clothing.filter(c => c.slot === slot && !c.isDuplicate).length;
    console.log(`    ${slot.padEnd(20)} ${count} total (${unique} unique)`);
  }

  // Gender breakdown
  const genderCounts = { feminine: 0, masculine: 0 };
  for (const item of catalog.clothing) {
    genderCounts[item.gender] = (genderCounts[item.gender] || 0) + 1;
  }
  console.log(`\n  By gender: feminine=${genderCounts.feminine} masculine=${genderCounts.masculine}`);

  // Skeleton contracts
  const skeletons = new Set(catalog.clothing.map(c => c.skeleton));
  console.log(`  Skeleton contracts: ${[...skeletons].join(', ')}`);

  // Duplicate analysis
  const dupes = catalog.clothing.filter(c => c.isDuplicate);
  if (dupes.length > 0) {
    console.log(`\n  Duplicate geometries: ${dupes.length} items share mesh with another`);
    console.log('  (These are texture-only variants — same shape, different material)');
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const doAnalyze = args.includes('--analyze') || args.length === 0;
  const doExtract = args.includes('--extract');
  const singleFile = args.includes('--single') ? args[args.indexOf('--single') + 1] : null;

  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   VRM Asset Catalog Extractor v1.0        ║');
  console.log('║   BlackBox Avatar — poqpoq World          ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log(`\n  Asset root:  ${ASSET_ROOT}`);
  console.log(`  Output root: ${OUTPUT_ROOT}`);
  console.log(`  Mode:        ${doExtract ? 'EXTRACT + CATALOG' : 'ANALYZE ONLY'}`);

  // Phase 1: Scan and analyze
  console.log('\n═══════════════════════════════════════════');
  console.log('  ANALYSIS PHASE');
  console.log('═══════════════════════════════════════════');

  let analyses;
  if (singleFile) {
    const filePath = join(ASSET_ROOT, singleFile);
    console.log(`\n  Single file: ${singleFile}`);
    const analysis = await analyzeVRM(filePath);
    // Determine dirConfig from path
    const dirRelative = singleFile.split('/').slice(0, -1).join('/');
    analysis.sourceDir = dirRelative;
    analysis.dirConfig = SOURCE_DIRS[dirRelative] || { slotHint: 'clothing', type: 'geometry' };
    analyses = [analysis];
  } else {
    analyses = await scanAllVRMs();
  }

  // Phase 2: Build catalog
  const catalog = buildCatalog(analyses);

  // Print summary
  printSummary(catalog);

  // Phase 3: Extract (if requested)
  if (doExtract) {
    await runExtraction(analyses, catalog);
  }

  // Phase 4: Write catalog
  await ensureDir(join(OUTPUT_ROOT, 'catalog'));
  const catalogPath = join(OUTPUT_ROOT, 'catalog', 'items.json');
  await writeFile(catalogPath, JSON.stringify(catalog, null, 2));
  console.log(`\n  ✓ Catalog written to: ${catalogPath}`);

  // Also write a compact version
  const compactPath = join(OUTPUT_ROOT, 'catalog', 'items.min.json');
  await writeFile(compactPath, JSON.stringify(catalog));
  console.log(`  ✓ Compact catalog: ${compactPath}`);
}

main().catch(err => {
  console.error('\n  FATAL:', err);
  process.exit(1);
});
