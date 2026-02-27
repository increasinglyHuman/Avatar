# Phase 1 Technical Specification: VRM Avatar System

**Status:** Draft
**Date:** 2026-02-26
**Authors:** Allen Partridge, Claude Code
**Implements:** AVATAR_STRATEGY.md Phase 1, ADR-001, ADR-004, ADR-005

---

## Scope

Ship the first playable version of the avatar dress-up system. A player can:
1. Swap between prebuilt VRMs or upload their own
2. Preview their avatar in a glam viewport with turntable rotation
3. Change skin tone, eye color, hair color, lip color, nail color
4. Swap hairstyles
5. Strip and swap clothing pieces (Mode A VRMs)
6. Reconstruct their body for outfit changes (Mode A and Mode B VRMs)
7. Save and load to World via NEXUS

---

## 1. VRM Material Editor

**New file:** `src/library/vrmMaterialEditor.js`

This is the core engine. It detects VRM structure, identifies modifiable components, and applies changes.

### 1.1 Structure Detection

```javascript
/**
 * Analyze a loaded VRM and return its modifiable structure.
 * @param {THREE.Object3D} model - The loaded VRM scene
 * @returns {VRMStructure}
 */
function analyzeVRM(model) → {
  clothingMode: 'A' | 'B' | 'nude',    // Mode A = separate CLOTH prims, B = baked, nude = no clothing
  bodyPrimitives: [{                     // All primitives in Body mesh
    name: string,                        // e.g. 'Body_00_SKIN', 'Shoes_01_CLOTH'
    type: 'skin' | 'cloth' | 'hair',    // Categorized by naming convention
    material: THREE.Material,
    triangleCount: number,
    mesh: THREE.SkinnedMesh
  }],
  facePrimitives: [{                     // All primitives in Face mesh
    name: string,
    type: 'skin' | 'eye' | 'mouth' | 'brow' | 'lash' | 'line',
    material: THREE.Material,
    mesh: THREE.SkinnedMesh
  }],
  hairMesh: THREE.SkinnedMesh | null,
  morphTargets: string[],                // All 57 Fcl_* names
  boneTransforms: Map<string, {x,y,z}>, // All 52 J_Bip rest positions
  springBoneChains: string[],            // J_Sec chain names
  gender: 'masculine' | 'feminine'       // Inferred from eyelash presence + spring bone count
}
```

**Detection logic:**
- `_CLOTH` in primitive name → `type: 'cloth'`
- `_SKIN` in primitive name → `type: 'skin'`
- `_HAIR` in primitive name → `type: 'hair'`
- `_EYE` in primitive name → `type: 'eye'`
- `_FACE` in primitive name → categorize by prefix (FaceBrow → 'brow', FaceEyelash → 'lash', etc.)
- Body mesh has `_CLOTH` prims → `clothingMode: 'A'`
- Body mesh has only SKIN + HAIR prims, SKIN tri count > 9000 → `clothingMode: 'B'`
- Body mesh has only SKIN + HAIR prims, SKIN tri count < 9000 → `clothingMode: 'nude'`

### 1.2 Material Modification API

```javascript
/**
 * Set skin tone across body and face (linked).
 * Preserves shade color ratio for MToon materials.
 */
function setSkinTone(model, hexColor) → void

/**
 * Set eye iris color.
 */
function setEyeColor(model, hexColor) → void

/**
 * Set hair color (applies to Hair mesh material + HairBack in Body).
 */
function setHairColor(model, hexColor) → void

/**
 * Set lip color (targets FaceMouth / lip UV region of Face_00_SKIN).
 */
function setLipColor(model, hexColor) → void

/**
 * Set cheek/blush color (targets cheek UV region of Face_00_SKIN).
 */
function setCheekColor(model, hexColor) → void

/**
 * Set nail color (targets nail UV regions of Body_00_SKIN).
 */
function setNailColor(model, hexColor) → void

/**
 * Set clothing piece color (targets specific CLOTH primitive).
 */
function setClothingColor(model, primitiveName, hexColor) → void

/**
 * Swap texture on a specific primitive.
 * @param {string} target - Primitive name (e.g. 'EyeIris_00_EYE')
 * @param {string|Blob} texture - URL or Blob of replacement texture
 */
function swapTexture(model, target, texture) → Promise<void>
```

**MToon color handling:** VRoid's MToon shader uses `litFactor` (main color) and `shadeColorFactor` (shadow tint). When setting skin tone, compute shade as `baseColor * 0.8` to maintain the MToon look. Expose this ratio as an optional parameter for advanced users.

### 1.3 Bone Transform API

```javascript
/**
 * Get all 52 J_Bip bone rest positions.
 */
function extractBoneTransforms(model) → Map<string, {x, y, z}>

/**
 * Apply bone rest position overrides.
 * Used for body proportion adjustment and reconstruction.
 */
function applyBoneTransforms(model, transforms: Map<string, {x, y, z}>) → void

/**
 * Convenience: set overall height via Hips Y translation.
 */
function setHeight(model, hipsY: number) → void

/**
 * Convenience: set shoulder width via UpperArm X translation (symmetric).
 */
function setShoulderWidth(model, upperArmX: number) → void

/**
 * Convenience: set head scale (uniform, to compensate height changes).
 */
function setHeadScale(model, scale: number) → void
```

---

## 2. Clothing System

**New file:** `src/library/vrmClothingManager.js`

### 2.1 Clothing Piece Extraction

```javascript
/**
 * Extract all CLOTH primitives from a Mode A VRM as standalone pieces.
 * Each piece retains: geometry, material, textures, skinning data.
 * @returns Array of ClothingPiece objects
 */
function extractClothingPieces(model) → [{
  name: string,              // 'Shoes_01_CLOTH', 'Onepiece_00_CLOTH_01', etc.
  category: string,          // Inferred: 'shoes', 'top', 'bottom', 'onepiece', 'accessory', 'socks', 'gloves'
  mesh: THREE.SkinnedMesh,   // Detached from parent, still skinned to J_Bip
  material: THREE.Material,
  triangleCount: number,
  thumbnail: string | null   // Generated at extraction time
}]
```

**Category inference from naming:**
- `Shoes_*` → `'shoes'`
- `Tops_*` → `'top'`
- `Bottoms_*` → `'bottom'`
- `Onepiece_*` → `'onepiece'` (may need manual subcategory: dress, pants, gloves, socks)
- `Accessory_*` → `'accessory'`

### 2.2 Clothing Application

```javascript
/**
 * Apply a clothing piece to a model.
 * The piece must be skinned to J_Bip skeleton (all VRoid clothing is).
 * @param {THREE.Object3D} model - Target VRM
 * @param {ClothingPiece} piece - Extracted clothing piece
 */
function applyClothingPiece(model, piece) → void

/**
 * Remove a clothing piece from a model by name.
 */
function removeClothingPiece(model, pieceName) → void

/**
 * Toggle visibility of a clothing piece (cheaper than add/remove).
 */
function toggleClothingVisibility(model, pieceName, visible) → void

/**
 * List currently equipped clothing pieces.
 */
function getEquippedClothing(model) → ClothingPiece[]
```

### 2.3 Hair Swap

```javascript
/**
 * Replace the Hair mesh on a model with hair from a donor VRM.
 * Transfers: geometry, materials, textures.
 * Rebinds: to target skeleton (same J_Bip names).
 * Preserves: spring bone chains if present.
 * @param {THREE.Object3D} target - Model receiving new hair
 * @param {THREE.Object3D} donor - VRM containing desired hair
 */
function swapHair(target, donor) → void
```

---

## 3. Identity & Body Reconstruction

**New file:** `src/library/vrmIdentityManager.js`

### 3.1 Identity Extraction

```javascript
/**
 * Extract everything that makes this avatar "me" — independent of clothing and body mesh.
 * @returns {AvatarIdentity} Serializable identity object
 */
function extractIdentity(model) → {
  // Face (entire mesh object — always separate, always preserved)
  faceMesh: THREE.Mesh,          // Clone of face mesh with all 7-8 prims
  faceMorphTargets: string[],    // All 57 Fcl_* morph target names
  faceMaterials: [{              // Material snapshot per face prim
    name: string,
    color: string,               // Hex
    shadeColor: string,          // Hex (MToon)
    texture: Blob | null,        // PNG blob if custom
    properties: object           // MToon uniforms snapshot
  }],

  // Hair
  hairMesh: THREE.Mesh | null,   // Clone of hair mesh
  hairMaterial: {
    color: string,
    texture: Blob | null,
    properties: object
  },
  hairBackMesh: THREE.Mesh | null, // Clone of HairBack prim from Body

  // Skeleton
  boneTransforms: Map<string, {x, y, z}>,  // All 52 J_Bip rest positions
  springBoneConfig: object,      // J_Sec chain parameters

  // Body Material (critical for reconstruction)
  bodyMaterial: {
    color: string,               // Body_00_SKIN base tint
    shadeColor: string,          // MToon shade color
    texture: Blob | null,        // Custom skin texture if any
    nailColor: string | null,    // Extracted nail color
    tattooOverlay: Blob | null,  // Tattoo/body paint layer if any
    properties: object           // Full MToon uniform snapshot
  },

  // Metadata
  gender: 'masculine' | 'feminine',
  sourceClothingMode: 'A' | 'B' | 'nude',
  extractedAt: number            // Timestamp
}
```

### 3.2 Body Reconstruction

```javascript
/**
 * Reconstruct an avatar from identity + nude base + new clothing.
 *
 * Pipeline:
 * 1. Load canonical nude base VRM (masc or fem)
 * 2. Replace face mesh with identity's face
 * 3. Replace hair mesh with identity's hair
 * 4. Apply bone transforms from identity
 * 5. Apply body material properties from identity (skin tone, nail color, etc.)
 * 6. Apply spring bone configuration
 * 7. Optionally apply new clothing pieces
 *
 * @param {AvatarIdentity} identity - Extracted identity
 * @param {ClothingPiece[]} clothing - New clothing to apply (optional)
 * @returns {THREE.Object3D} Reconstructed VRM model
 */
async function reconstructAvatar(identity, clothing = []) → THREE.Object3D
```

**Canonical nude bases:**
- `public/vRoidModels/bases/nude-feminine.vrm` — Unclothed feminine VRM (full body geometry)
- `public/vRoidModels/bases/nude-masculine.vrm` — Unclothed masculine VRM (full body geometry)

These must be exported from VRoid Studio with **no clothing** to ensure Body_00_SKIN is complete (no cutaways).

### 3.3 Identity Serialization

```javascript
/**
 * Serialize identity to JSON + binary blobs for storage.
 * Materials and textures serialized as base64 in JSON.
 * Used for wardrobe persistence (ADR-005 metadata JSONB).
 */
function serializeIdentity(identity) → { json: string, blobs: Map<string, Blob> }

/**
 * Deserialize identity from stored format.
 */
function deserializeIdentity(json, blobs) → AvatarIdentity
```

---

## 4. Prebuilt Library

### 4.1 VRM Prebuilt Manifest

**New file:** `public/vRoidModels/prebuilts.json`

```json
{
  "version": 1,
  "bases": {
    "nude-feminine": {
      "file": "bases/nude-feminine.vrm",
      "thumbnail": "bases/nude-feminine.webp",
      "gender": "feminine",
      "boneTransforms": { "J_Bip_C_Hips": [0, 0.98, 0] }
    },
    "nude-masculine": {
      "file": "bases/nude-masculine.vrm",
      "thumbnail": "bases/nude-masculine.webp",
      "gender": "masculine",
      "boneTransforms": { "J_Bip_C_Hips": [0, 0.99, 0] }
    }
  },
  "prebuilts": [
    {
      "id": "fem-casual-01",
      "name": "Casual Girl",
      "file": "prebuilts/fem-casual-01.vrm",
      "thumbnail": "prebuilts/fem-casual-01.webp",
      "gender": "feminine",
      "clothingMode": "A",
      "tags": ["casual", "feminine", "starter"]
    }
  ],
  "hair": [
    {
      "id": "hair-short-fem-01",
      "name": "Short Bob",
      "file": "hair/short-bob.vrm",
      "thumbnail": "hair/short-bob.webp",
      "gender": "feminine",
      "tags": ["short", "bob"]
    }
  ],
  "clothing": [
    {
      "id": "top-tshirt-01",
      "name": "Basic Tee",
      "file": "clothing/top-tshirt-01.glb",
      "thumbnail": "clothing/top-tshirt-01.webp",
      "category": "top",
      "gender": "unisex",
      "sourceVRM": "fem-casual-01",
      "tags": ["casual", "basic"]
    }
  ],
  "skins": [
    {
      "id": "skin-light-warm",
      "name": "Light Warm",
      "bodyTexture": "skins/light-warm-body.png",
      "faceTexture": "skins/light-warm-face.png",
      "baseColor": "#f5d0b0",
      "shadeColor": "#c4a68c"
    }
  ]
}
```

### 4.2 Building the Library

Export from VRoid Studio in both modes:
1. **Mode A exports** for each outfit (separate CLOTH prims) — these become both prebuilts and clothing source
2. **Nude bases** (no clothing) — canonical bodies for reconstruction
3. **Hair VRMs** — one VRM per hairstyle, used for hair swap donor

Strip clothing from Mode A exports → save as individual `.glb` clothing pieces in `public/vRoidModels/clothing/`.

**Recommended initial library size:**
- 4 feminine prebuilts + 4 masculine prebuilts (varied faces/builds)
- 2 nude bases (1 fem, 1 masc)
- 8-12 hairstyles (mix of fem/masc/unisex)
- 10-15 clothing pieces (tops, bottoms, shoes, dresses, swimwear)
- 6-8 skin tone presets

---

## 5. Appearance UI Updates

### 5.1 Modified Pages

**`src/pages/Appearance.jsx`** — Major rewrite. Currently trait-group based (Body, Head, Chest from manifest). Restructure to user-facing categories:

```
Appearance Page Layout:
┌──────────────────────────────────────────────┐
│  [3D Viewport - turntable, zoom, studio lit] │
│                                              │
├──────────────────────────────────────────────┤
│  Category tabs:                              │
│  [Avatar] [Skin] [Eyes] [Hair] [Lips] [Outfit] [Nails] │
├──────────────────────────────────────────────┤
│  Category-specific controls:                 │
│                                              │
│  [Avatar tab]: Prebuilt carousel + Upload    │
│  [Skin tab]: Tone presets + color picker     │
│  [Eyes tab]: Iris presets + color picker      │
│  [Hair tab]: Style carousel + color picker   │
│  [Lips tab]: Color picker + presets          │
│  [Outfit tab]: Clothing grid + equip/remove  │
│  [Nails tab]: Color picker                   │
├──────────────────────────────────────────────┤
│  [Save to World]  [Open in VRoid Studio]     │
└──────────────────────────────────────────────┘
```

### 5.2 State Management

Add to existing Zustand/context pattern:

```javascript
// New state for appearance editing
{
  // Current avatar analysis
  vrmStructure: VRMStructure | null,    // From analyzeVRM()
  currentIdentity: AvatarIdentity | null,

  // Editing state
  activeCategory: 'avatar' | 'skin' | 'eyes' | 'hair' | 'lips' | 'outfit' | 'nails',
  skinTone: string,          // Hex
  eyeColor: string,          // Hex
  hairColor: string,         // Hex
  lipColor: string,          // Hex
  nailColor: string,         // Hex
  selectedHairId: string,    // From prebuilts.json
  equippedClothing: string[], // Array of clothing piece IDs

  // Undo stack
  undoStack: EditAction[],

  // Dirty flag
  hasUnsavedChanges: boolean
}
```

### 5.3 Viewport

Use the existing Three.js scene from `SceneContext`. Add:
- **Studio lighting** preset (3-point light setup, better than default ambient)
- **Turntable orbit** (drag to rotate, scroll to zoom)
- **Camera presets**: Full body, Face closeup, Upper body, Feet
- **Background**: Solid dark gradient or subtle environment

The existing `characterManager.js` already handles VRM rendering via Three.js — we compose on top of it.

---

## 6. Export Pipeline

### 6.1 Save Flow

```
User clicks [Save to World]:
  1. characterManager runs VRMExporter.parse() → GLB ArrayBuffer
  2. Generate thumbnail (screenshotManager.getScreenshot()) → WebP Blob
  3. POST /nexus/avatars/upload (multipart/form-data):
     - file: avatar.glb
     - thumbnail: portrait.webp
     - metadata: JSON (identity summary, clothing list, bone transforms)
  4. Server stores to S3, updates users.avatar_url
  5. Emit localStorage event: avatar_updated = { url, timestamp }
  6. World picks up change, reloads avatar via AvatarDriverFactory
```

### 6.2 Metadata Payload

```json
{
  "gender": "feminine",
  "clothingMode": "A",
  "skinTone": "#f5d0b0",
  "eyeColor": "#3a7d4e",
  "hairStyle": "hair-short-fem-01",
  "hairColor": "#2b1810",
  "lipColor": "#c4556a",
  "nailColor": "#ff2244",
  "equippedClothing": ["top-tshirt-01", "bottom-jeans-01", "shoes-sneaker-01"],
  "boneTransforms": {
    "J_Bip_C_Hips": [0, 1.04, 0],
    "J_Bip_L_UpperArm": [0.125, 0, 0]
  },
  "sourcePrebuilt": "fem-casual-01"
}
```

This metadata enables re-editing without re-analyzing the GLB. Stored in `avatar_wardrobe.metadata` JSONB (ADR-005 Phase 2) or initially in a parallel JSON file on S3.

---

## 7. World Integration

### 7.1 Appearance Panel (World Side)

**File:** `World/src/ui/shelves/panels/AppearancePanel.ts`

Replace the "Coming Soon" stub with a lightweight panel. Phase 1 scope for the World shelf panel is intentionally limited — deep customization happens in Avatar app.

```typescript
class AppearancePanel implements IShelfPanel {
  // Quick controls only:
  // - Avatar swap carousel (reuse AvatarSelectionModal logic)
  // - Skin tone picker (6-8 presets)
  // - Hair color picker
  // - Eye color picker
  // - "Open Avatar Studio" button → window.open(avatarAppUrl)

  // Communication with Avatar app:
  // - Write to localStorage: avatar_pending_changes
  // - Listen for localStorage: avatar_updated
  // - Dispatch custom event: avatar:swap { url }
}
```

### 7.2 Avatar Swap Event

World already supports hot-reload via `AvatarDriverFactory`. The communication pattern:

```typescript
// Avatar app (or Appearance panel) signals a swap:
window.dispatchEvent(new CustomEvent('avatar:swap', {
  detail: { url: 'https://s3.../avatars/user123.glb', format: 'glb' }
}));

// World's scene manager listens and reloads:
window.addEventListener('avatar:swap', async (e) => {
  const { url, format } = e.detail;
  const driver = AvatarDriverFactory.createDriver(url, format);
  await driver.load(url, scene, options);
  // Dispose old driver, update state
});
```

### 7.3 Upload Endpoint

**Endpoint:** `POST /nexus/avatars/upload`

```
Request: multipart/form-data
  - file: avatar.glb (required, <50MB)
  - source: avatar.vrm (optional, <100MB, for re-editing)
  - thumbnail: portrait.webp (optional, <2MB)
  - metadata: JSON string (optional)

Response: {
  avatar_url: "https://s3.../avatars/{userId}.glb",
  source_url: "https://s3.../avatars/{userId}.vrm",
  thumbnail_url: "https://s3.../thumbnails/{userId}.webp"
}

Side effects:
  - UPDATE users SET avatar_url = $avatar_url WHERE id = $userId
```

---

## 8. File Inventory

### New Files (Avatar App)

| File | Purpose | Priority |
|------|---------|----------|
| `src/library/vrmMaterialEditor.js` | Structure detection + material modification API | P0 |
| `src/library/vrmClothingManager.js` | Clothing extraction, application, toggle | P0 |
| `src/library/vrmIdentityManager.js` | Identity extraction + body reconstruction | P1 |
| `public/vRoidModels/prebuilts.json` | Prebuilt library manifest | P0 |
| `public/vRoidModels/bases/` | Canonical nude base VRMs | P0 |
| `public/vRoidModels/prebuilts/` | Curated prebuilt VRMs | P0 |
| `public/vRoidModels/hair/` | Swappable hair VRMs | P1 |
| `public/vRoidModels/clothing/` | Extracted clothing pieces (GLB) | P1 |
| `public/skins/` | Skin tone texture presets | P1 |

### Modified Files (Avatar App)

| File | Change | Priority |
|------|--------|----------|
| `src/pages/Appearance.jsx` | Major rewrite — category-based UI | P0 |
| `src/library/characterManager.js` | Add material swap + clothing methods | P0 |
| `src/context/SceneContext.jsx` | Add appearance editing state | P1 |

### Modified Files (World)

| File | Change | Priority |
|------|--------|----------|
| `World/src/ui/shelves/panels/AppearancePanel.ts` | Replace stub with quick controls | P1 |

### Assets to Export from VRoid Studio

| Asset | Count | Source |
|-------|-------|--------|
| Nude base (fem) | 1 | VRoid export, no clothing |
| Nude base (masc) | 1 | VRoid export, no clothing |
| Prebuilt avatars | 8 | VRoid export, Mode A, varied faces/builds |
| Hairstyles | 8-12 | VRoid export, one per style |
| Clothing pieces | 10-15 | Extracted from Mode A exports |
| Skin tone textures | 6-8 | Painted or generated |

---

## 9. Implementation Order

### Sprint 1: Foundation (Week 1-2)

1. **vrmMaterialEditor.js** — `analyzeVRM()` + `setSkinTone()` + `setEyeColor()` + `setHairColor()`
2. **prebuilts.json** — Initial manifest with 2-4 prebuilts
3. **Appearance.jsx** — Category tabs, skin/eye/hair color pickers wired to vrmMaterialEditor
4. Export nude bases from VRoid Studio

### Sprint 2: Clothing (Week 3-4)

5. **vrmClothingManager.js** — `extractClothingPieces()` + `toggleClothingVisibility()` + `applyClothingPiece()`
6. **Appearance.jsx** — Outfit tab with equip/remove grid
7. Export 8 prebuilts as Mode A, strip clothing pieces
8. Hair swap (`swapHair()`)

### Sprint 3: Reconstruction & Polish (Week 5-6)

9. **vrmIdentityManager.js** — `extractIdentity()` + `reconstructAvatar()`
10. **Appearance.jsx** — Lip color, nail color, cheek color
11. Viewport: studio lighting, camera presets, turntable
12. Save-to-World flow (export + upload + avatar_url update)

### Sprint 4: World Integration (Week 7-8)

13. **AppearancePanel.ts** — Quick controls in World's shelf
14. Avatar swap event system (`avatar:swap` custom event)
15. Upload endpoint (`POST /nexus/avatars/upload`)
16. End-to-end test: create in Avatar app → save → appear in World

---

## 10. Key Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Mode A body has cutaways under clothing | Outfit changes show holes | Body reconstruction from nude base (Tier 3.5) |
| Bone transforms from tall char distort slim base | Reconstruction looks wrong | Test with extreme configs; constrain adjustment ranges |
| MToon shade color ratio varies across VRMs | Skin tone looks wrong on some models | Capture full MToon uniform snapshot, not just base color |
| Hair swap breaks spring bones | Hair goes rigid | Transfer J_Sec chains with hair mesh; fallback to static |
| Clothing pieces from different proportions clip | Outfit looks bad | Document fit quality matrix; warn on extreme mismatch |
| VRM file size exceeds S3 upload limit | Save fails | Client-side validation, texture atlas optimization |

---

## 11. Phase 1 Decisions That Constrain Later Phases

| Decision | Affects | Why It Matters |
|----------|---------|----------------|
| Clothing pieces stored as standalone GLBs skinned to J_Bip | Phase 3 SuperMesh clothing | SuperMesh skeleton is a J_Bip superset — Phase 1 clothing pieces will still bind, but won't use twist/helper bones. Phase 3 clothing needs separate higher-fidelity exports. |
| Identity serialization format (JSON + blobs) | Phase 2 wardrobe DB schema | The `metadata` JSONB in `avatar_wardrobe` (ADR-005) must accommodate this format. Design the serialization now so Phase 2 doesn't require migration. |
| `prebuilts.json` manifest structure | Phase 2 AI mesh + Phase 3 marketplace | Add `avatarType` field now (`'vrm'`) even though Phase 1 only has VRM. Phase 2 adds `'ai_mesh'`, Phase 3 adds `'supermesh'`. |
| `analyzeVRM()` detection by naming convention | Phase 2 AI mesh (no naming convention) | AI meshes won't have `_CLOTH` / `_SKIN` naming. Phase 2 needs a separate `analyzeAIMesh()` or a generic detector. Keep VRM detection isolated. |
| Nude base bodies as canonical reconstruction targets | Phase 3 SuperMesh body morphs | SuperMesh won't need reconstruction — it has proper morph targets. But the identity extraction concept (face + materials + bone transforms) carries forward as the "save what makes you YOU" primitive. |
| `avatar:swap` custom event for World communication | All future phases | This event contract becomes the stable API between Avatar app and World. Keep the payload minimal and extensible: `{ url, format, metadata? }`. |

---

## References

- ADR-001: VRM Post-Import Modification (`docs/adr/ADR-001-VRM-POST-IMPORT-MODIFICATION.md`)
- ADR-004: Appearance Tab Integration (`docs/adr/ADR-004-APPEARANCE-TAB-INTEGRATION.md`)
- ADR-005: Avatar Storage & Identity (`docs/adr/ADR-005-AVATAR-STORAGE-AND-IDENTITY.md`)
- Existing characterManager: `src/library/characterManager.js` (1,875 lines)
- Existing VRMExporter: `src/library/VRMExporter.js` (919 lines)
- Existing Appearance page: `src/pages/Appearance.jsx` (560 lines)
- World IAvatarDriver: `World/src/avatars/IAvatarDriver.ts`
- World AppearancePanel stub: `World/src/ui/shelves/panels/AppearancePanel.ts`
- World InventoryTypes: `World/src/inventory/InventoryTypes.ts`
- Skinner prim isolation evidence: `public/vRoidModelPuffPantsSkinnerTestPix/`
- VRM model analysis data: `public/vRoidModels/` (bT.vrm, shortPantsWithNeckAcc.vrm, baseMale.vrm, baseMale2.vrm, Pinkie.vrm)

---

_Last Updated: 2026-02-26_
