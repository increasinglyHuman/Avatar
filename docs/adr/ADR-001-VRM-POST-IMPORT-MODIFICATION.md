# ADR-001: VRM Post-Import Modification Capabilities

**Status:** Accepted
**Date:** 2026-02-26
**Authors:** Allen Partridge, Claude Code
**Relates to:** AVATAR_STRATEGY.md Phase 1

---

## Context

VRM (specifically VRoid Studio 2.10.0 exports) is our Phase 1 avatar format for poqpoq World. Players upload VRM files or select from curated prebuilts. We need to define exactly what post-import modifications are technically possible, what we will implement, and what is explicitly out of scope.

This ADR is based on direct file analysis of VRoid Studio 2.10.0 exports (VRM 1.0 format with VRMC_vrm extension) and hands-on mesh inspection in BlackBox Skinner.

---

## VRoid Export Anatomy (Verified)

### Mesh Structure

A VRoid Studio 2.10.0 VRM export contains exactly three meshes:

**Face (merged):** 7-8 primitives, 57 morph targets
```
Prim 0: FaceMouth_00_FACE    -- Mouth interior, teeth
Prim 1: EyeIris_00_EYE       -- Iris/pupil geometry
Prim 2: EyeHighlight_00_EYE  -- Eye shine/reflection overlay
Prim 3: Face_00_SKIN          -- THE FACE: mask-like geometry covering front of head
Prim 4: EyeWhite_00_EYE      -- Sclera
Prim 5: FaceBrow_00_FACE     -- Eyebrow geometry
Prim 6: FaceEyelash_00_FACE  -- Eyelashes (ABSENT on masculine base)
Prim 7: FaceEyeline_00_FACE  -- Anime-style eye outlines
```
The face is literally a mask bolted onto the front of the skull. The body mesh covers the rest of the head (back, top, sides). Each primitive has its own material and texture, independently modifiable.

**Body (merged):** 2-8 primitives, ZERO morph targets

VRoid Studio exports clothing in one of **two modes** depending on export settings. This is the single most important structural discovery for our clothing system:

**Mode A — Separate CLOTH Primitives (swappable):**
```
Prim 0: Body_00_SKIN                -- Body (7,210 tris — reduced, clothing areas excluded)
Prim 1: HairBack_00_HAIR            -- Back hair
Prim 2: Socks/stockings             -- Lower leg coverings (striped knee-highs)
Prim 3: Gloves + arm/leg bands      -- Hand/wrist/arm accessories
Prim 4: Tie part 1                  -- Neck accessory (narrow vertical — 75 tris)
Prim 5: Collar/bow part 2           -- Neck accessory (decorative — 114 tris)
Prim 6: Puffy pants                 -- Main clothing piece (2,950 tris)
Prim 7: Shoes                       -- Footwear (676 tris)
```
Each `*_CLOTH` primitive is **independent geometry** with its own material, skinned to the same J_Bip skeleton. These can be stripped, swapped, or toggled without affecting other primitives.

**Primitive count is clothing-template-dependent.** The puffy pants outfit generates 7 non-body prims because it's a complex outfit (pants + socks + gloves + two-part tie/collar + shoes). A simpler "t-shirt and jeans" would produce fewer (top + bottom + shoes = 3). VRoid decomposes outfits into component pieces — socks separate from shoes, gloves separate from shirt, multi-part accessories split into individual prims. Each visible garment piece maps 1:1 to its own primitive.

Verified in BlackBox Skinner: isolating each `Body_[merged]_N` primitive shows exactly one garment piece per prim. See `public/vRoidModelPuffPantsSkinnerTestPix/` for per-primitive screenshots.

**Mode B — Body-Integrated (not directly separable):**
```
Prim 0: Body_00_SKIN          -- Full body (10,934 tris — all clothing baked into body geometry/texture)
Prim 1: HairBack_00_HAIR      -- Back hair
```
Clothing is baked into the body mesh geometry and texture. Cannot be separated without body reconstruction (see Tier 3.5).

**Evidence:** Same VRoid character (`bT.vrm` Mode B: 2 body prims, 10,934 tri body) re-exported as (`shortPantsWithNeckAcc.vrm` Mode A: 8 body prims, 7,210 tri body + separate CLOTH geometry). The export setting determines the mode — NOT the clothing itself.

**Detection:** If Body mesh contains any primitive with `_CLOTH` in its material/name → Mode A. If Body mesh has only `Body_00_SKIN` + `HairBack` → Mode B (or unclothed).

Unclothed exports (undergarments only) have just 2 primitives: Body_00_SKIN + HairBack. The full body mesh is intact in this case.

**Hair (merged):** 1 primitive, 0 morph targets
```
Separate mesh driven by J_Sec_* spring bones for physics.
```

### Key Constraint

**VRoid bakes and discards design-time morphs on export.** The parametric sliders used in VRoid Studio to shape faces and bodies are applied destructively. The exported VRM contains only runtime expression morphs (57 Fcl_* targets), not structural morphs. Body mesh has zero morph targets.

### Skeleton

- **52 J_Bip_* bones** (standard VRM humanoid -- identical across masc/fem)
- **Variable J_Sec_* spring bones** (4 on masc base, 55 on fem with hair/bust/clothing)
- **2 J_Adj_* adjustment bones** (eye tracking, fem only)
- **Total:** 59 (masc base) to 110 (fem with accessories)

### Masc vs Fem Differences

| Property | Masculine (baseMale) | Feminine (Pinkie) |
|----------|---------------------|-------------------|
| Face primitives | 7 (no eyelash) | 8 (has eyelash) |
| Body primitives (unclothed) | 2 | 2 |
| Body primitives (clothed) | varies | 5 |
| Spring bones | 4 (minimal) | 55 (hair + bust + cloth) |
| Face morphs | 57 | 57 (identical set) |
| Body morphs | 0 | 0 |
| Height mechanism | Bone translation (NOT Root scale) | Bone translation (NOT Root scale) |

### Materials & Textures

VRoid uses **VRMC_materials_mtoon** (anime toon shader) with **KHR_materials_unlit** fallback. Each primitive has its own material. Key textures:

- Body skin: Small PNG (~few KB), likely procedural tint overlay (explains flat appearance)
- Face skin: 13KB PNG -- minimal detail
- Eye textures: Detailed (iris, highlight, white -- each separate)
- Clothing: Larger textures with painted detail
- Hair: Textured with normal maps

**Observation:** VRoid skin textures are minimal because VRoid relies on procedural color multiplication in the MToon shader rather than painted skin detail. This is why VRoid skin looks flat compared to PBR-rendered characters. Replacing these with detailed PBR skin textures could dramatically improve visual quality.

### 57 Morph Targets (Face Only)

**Expression presets (full-face):**
`Fcl_ALL_Joy`, `Fcl_ALL_Angry`, `Fcl_ALL_Sorrow`, `Fcl_ALL_Fun`, `Fcl_ALL_Surprised`, `Fcl_ALL_Neutral`

**Component morphs:**
- `Fcl_BRW_*` (5) -- Eyebrow expressions
- `Fcl_EYE_*` (12) -- Eye states (blink, close L/R, spread, highlight hide, iris hide)
- `Fcl_MTH_*` (16) -- Mouth shapes (A, I, U, E, O visemes + expressions + size)
- `Fcl_HA_*` (9) -- Teeth/fang visibility variants

**Not present:** No structural face morphs (jaw_width, nose_shape, cheekbone). No body morphs of any kind.

### Body Variation Mechanism (baseMale vs baseMale2 Analysis)

**Critical finding:** VRoid does NOT use Root scale for body variation. All bone scales remain `[1, 1, 1]` across all body configurations. VRoid achieves body variation through **bone translation repositioning** — moving bones to different positions while keeping scale uniform.

**Verified bone transform comparison (baseMale → baseMale2):**

| Bone | baseMale Y | baseMale2 Y | Delta | Meaning |
|------|-----------|-------------|-------|---------|
| J_Bip_C_Hips | 0.9945 | 1.2507 | **+26%** | Overall height |
| J_Bip_L_UpperArm (X) | 0.1254 | 0.2194 | **+75%** | Shoulder width |
| J_Bip_L_LowerLeg | -0.3885 | -0.4560 | **+17%** | Leg length |
| J_Bip_L_LowerArm (Y) | -0.2264 | -0.3106 | **+37%** | Arm length |
| J_Bip_C_Head (scale) | [1,1,1] | [1,1,1] | none | All scales uniform |

**Implication:** Since VRM meshes are skinned to these bones, modifying bone rest positions post-import CAN produce limited body variation (wider shoulders, longer legs, taller stance). This is not equivalent to morph target quality, but provides meaningful customization within the VRM modality.

### VRoid Studio Component Catalog (Observed)

VRoid Studio provides extensive customization at design-time. Understanding the available components informs what we can offer as pre-exported variations and what we might swap post-import:

| Category | Stock Count | Post-Import Swappable? | Notes |
|----------|-------------|----------------------|-------|
| **Hairstyles** | ~39 composite | YES (separate mesh) | Built from bangs + 7 subcategories; interchangeable across models; possible head-scale dependency |
| **Face presets** | ~26 | NO (baked geometry) | Must export as separate VRM variants |
| **Eye iris** | ~8-10 types | YES (texture swap) | Each with highlight/sclera variants |
| **Eye highlights** | ~8-10 types | YES (texture swap) | Affects "life" of eyes |
| **Eyeliner** | ~120 variants | YES (texture swap) | Subtle differences |
| **Eyelashes** | ~80 variants | Possibly (mesh or texture) | Separate face prim on fem |
| **Nose** | ~60 variants | NO (baked geometry) | Extremely subtle differences |
| **Mouth** | ~10 types | NO (baked geometry) | Rigged with visemes, emotion, tongue |
| **Mouth inside** | ~10 types | NO (baked geometry) | |
| **Lipstick** | ~10 types | YES (color tint) | Independent lip coloring |
| **Cheeks** | ~30 variants | YES (color tint) | Blush/color overlay |
| **Ears** | Parameterized | NO (baked geometry) | Size, tip, stretch, prominence |
| **Jaw/face structure** | Parameterized | NO (baked geometry) | Jaw, cheekbone, chin, jawline |
| **Face paint** | Tattoo layer | YES (texture overlay) | Operates as face tattoo layer |
| **Outline style** | Fem/Masc sets | YES (material property) | Affects silhouette rendering |

**Recommendation:** For our simplified Avatar UI, offer a curated subset:
- Hair: 8-12 representative styles (from the 39)
- Eyes: 4-6 iris + highlight combos
- Skin: 6-8 tone presets with linked face/body
- Lips/cheeks: Color pickers
- Face paint: 3-5 preset patterns + color picker
- Everything else: Captured in pre-exported VRM variants

---

## Decision: Modification Tiers

### Tier 1: Texture Swaps (IMPLEMENT - Phase 1)

| Modification | Target | Confidence | Notes |
|---|---|---|---|
| Skin tone (body) | Body_00_SKIN texture | HIGH | Separate material, straightforward swap |
| Skin tone (face) | Face_00_SKIN texture | HIGH | Must match body tone |
| Eye color | EyeIris_00_EYE texture | HIGH | Isolated texture, clean swap |
| Eye highlight style | EyeHighlight_00_EYE texture | MEDIUM | Affects "life" of eyes |
| Eyebrow style/color | FaceBrow_00_FACE texture | MEDIUM | Texture swap or tint |
| Clothing recolor | *_CLOTH materials | HIGH | Color tint on existing textures |

**Implementation:** Enumerate materials by VRoid naming convention (`N00_*_SKIN`, `N00_*_EYE`, `N00_*_FACE`, `N00_*_CLOTH`, `N00_*_HAIR`). Present color pickers and texture swaps per category.

### Tier 2: Material Property Changes (INVESTIGATE - Phase 1.5)

| Modification | Approach | Confidence | Notes |
|---|---|---|---|
| MToon --> PBR skin | Replace shader, add detail textures | MEDIUM | Could dramatically improve realism |
| Metallic/roughness | PBR material properties | MEDIUM | Only if PBR conversion works |
| Emissive effects | Material emissive channel | HIGH | Easy, works with any shader |
| Lip color/makeup | UV-aware texture painting | MEDIUM | Requires face UV understanding |
| Tattoos/body paint | Texture overlay compositing | MEDIUM | Requires body UV understanding |

**Risk:** MToon-to-PBR conversion may look wrong on VRoid geometry (designed for anime aesthetic). Test with real models before committing.

### Tier 2.5: Bone Transform Manipulation (INVESTIGATE - Phase 1.5)

Since VRoid uses bone translation (not morph targets) for body variation, we can modify bone rest positions post-import to achieve limited body adjustment:

| Modification | Bones | Confidence | Notes |
|---|---|---|---|
| Overall height | J_Bip_C_Hips Y translation | HIGH | Moves entire skeleton up/down |
| Shoulder width | J_Bip_L/R_UpperArm X translation | HIGH | Wider/narrower shoulders |
| Arm length | J_Bip_L/R_LowerArm Y translation | MEDIUM | Proportional limb adjustment |
| Leg length | J_Bip_L/R_LowerLeg Y translation | MEDIUM | Proportional limb adjustment |
| Neck length | J_Bip_C_Neck Y translation | HIGH | Simple vertical offset |
| Head scale | J_Bip_C_Head uniform scale | HIGH | Counter head-to-body ratio distortion |

**Important caveats:**
- Bone translation does NOT deform the mesh like morph targets would — it repositions skinned regions. Results are acceptable for moderate adjustments but not extreme ones.
- Head scale should be offered as an independent control to counteract the head-to-body ratio problem (tall = tiny head without compensation).
- This is inherently less sophisticated than SuperMesh's 123-138 blend shapes. Frame it as "quick body tuning" not "body customization."

### Tier 3: Mesh Operations (SELECTIVE - Phase 1.5)

| Modification | Approach | Confidence | Decision |
|---|---|---|---|
| Hair swap | Replace Hair mesh, bind to same skeleton | HIGH | DO |
| Clothing visibility | Toggle clothing primitive rendering | HIGH | DO |
| Clothing swap (same skeleton) | Replace clothing primitives | MEDIUM | INVESTIGATE |
| Accessory attachment | Parent mesh to bone | LOW | DO NOT (defer to SuperMesh) |
| Body proportions | Bone translation (see Tier 2.5) | MEDIUM | Limited but real |
| Body musculature/shape | Morph targets | IMPOSSIBLE | No body morphs in VRM |
| Face structure | Morph targets | IMPOSSIBLE | Construction morphs baked |

**Hair swap** is the most promising mesh operation. Hair is a completely separate mesh bound to the same skeleton. Swapping it is architecturally clean.

**Clothing swap** requires the body underneath to be intact. Mode A exports reduce Body_00_SKIN tri count (7,210 vs 10,934 in Mode B for same character), suggesting clothing areas may be cut from the body mesh. Swapping to more revealing garments on a Mode A export may expose gaps. Mode B exports have the full body geometry but clothing is baked in.

### Tier 3.5: Body Reconstruction — "Frankenstein Assembly" (INVESTIGATE - Phase 1.5)

**Problem:** When a player wants to change outfits (e.g., "I'm going to the beach and need a bikini"), we need the player's body without their current clothing. Mode A exports have separate CLOTH primitives that can be stripped, but the underlying Body_00_SKIN may have cutaways. Mode B exports have clothing baked into the body mesh entirely.

**Solution: Extract identity, reconstruct body, apply new clothing.**

The key insight is that a VRM avatar's **identity** is separable from its body:

| Identity Component | Source | Preserved During Reconstruction? |
|---|---|---|
| Face mesh (7-8 prims, 57 morphs) | Always separate mesh | **YES** — face is never modified |
| Hair mesh | Always separate mesh | **YES** — hair is independent |
| Bone transforms (52 J_Bip positions) | Skeleton rest pose | **YES** — extracted and reapplied |
| Skin tone (body) | Body_00_SKIN material color/texture | **YES** — must be captured and reapplied |
| Skin tone (face) | Face_00_SKIN material color/texture | **YES** — preserved with face mesh |
| Eye color | EyeIris_00_EYE material | **YES** — preserved with face mesh |
| Lip color | FaceMouth/Face_00_SKIN region | **YES** — preserved with face mesh |
| Cheek/blush color | Face_00_SKIN region | **YES** — preserved with face mesh |
| Eyebrow style | FaceBrow_00_FACE texture | **YES** — preserved with face mesh |
| Eyeliner | FaceEyeline_00_FACE texture | **YES** — preserved with face mesh |
| Nail color | Body_00_SKIN UV regions | **MUST CAPTURE** — lives on body material |
| Spring bone config | J_Sec_* chains | **YES** — skeleton-level, independent of mesh |

**Reconstruction pipeline:**

```
1. EXTRACT IDENTITY from player's current VRM:
   ├── Face mesh (entire mesh object, all prims + materials + morphs)
   ├── Hair mesh (entire mesh object + spring bones)
   ├── All 52 J_Bip bone rest positions (translation vectors)
   ├── Body material properties:
   │   ├── Body_00_SKIN color/tint
   │   ├── Body_00_SKIN texture (if custom)
   │   ├── Nail color (UV region extraction)
   │   └── MToon shader properties (shade color, outline, etc.)
   └── Face material properties (already on face mesh, comes free)

2. LOAD CANONICAL NUDE BASE (pre-exported, unclothed VRM):
   ├── Use masc or fem base as appropriate
   ├── Body_00_SKIN with FULL intact geometry (no cutaways)
   └── Known topology — consistent across all bases

3. APPLY IDENTITY to nude base:
   ├── Replace face mesh → player's face
   ├── Replace hair mesh → player's hair
   ├── Set all 52 J_Bip bone positions → player's bone transforms
   ├── Apply body material properties:
   │   ├── Set Body_00_SKIN color/tint → player's skin tone
   │   ├── Apply custom skin texture if present
   │   ├── Apply nail color to UV regions
   │   └── Restore MToon properties
   └── Restore spring bone configuration

4. APPLY NEW CLOTHING:
   ├── Mode A clothing: Parent CLOTH primitives to skeleton
   ├── Texture clothing: Apply clothing texture layers to body material
   └── Result: Player's identity, new outfit
```

**Skin coloration preservation is critical.** During reconstruction, ALL of the following must be captured from the source avatar and reapplied to the new body:
- `Body_00_SKIN` base color / tint (the overall skin tone)
- `Body_00_SKIN` shade color (MToon secondary color)
- `Body_00_SKIN` texture (if custom, not just the default procedural)
- Nail color (stored as UV-region-specific color on body texture)
- Any tattoo/body paint overlays
- MToon material properties (outline color, outline width, shade toony, etc.)

**Confidence:** MEDIUM. The concept is sound — face and hair are always separate, bone transforms are extractable, materials are readable. The open question is whether the canonical nude base body will deform correctly under arbitrary bone transforms from a different VRoid export. Testing required with extreme body configurations.

**Validation needed:**
1. Export same VRoid character nude and clothed (Mode A), compare Body_00_SKIN vertex counts
2. Apply bone transforms from a tall heavy character to a short slim nude base — verify no mesh artifacts
3. Verify material property round-trip: extract skin tone from source, apply to new body, compare visually

### Tier 4: Variation Sampling (IMPLEMENT - Phase 1)

Since we cannot morph a single VRM into different body types, we curate a library:

| Variation Axis | Strategy | Count |
|---|---|---|
| Gender base | Masculine + Feminine | 2 |
| Height | Short / Average / Tall exports | 3 per base |
| Build | Slim / Average / Heavy (VRoid presets) | 3 per base |
| Face | Varied face configurations | 4-6 per base |
| Skin tone | Texture presets (light, medium, dark, + hues) | 6-8 textures |

**Minimum viable library:** 2 bases x 3 heights x 2 builds = 12 body variants, plus face variants and skin tone textures. Users pick the closest body/face match, then customize textures.

**Height caveat:** VRoid height uses bone translation (Hips Y repositioning), not Root scale. Taller characters naturally have disproportionately small-looking heads. We can compensate by independently scaling J_Bip_C_Head post-import (see Tier 2.5), but this remains a rough approximation compared to SuperMesh's proper morph targets.

---

## Implementation Plan

### Avatar App (React/Three.js)

1. **Load VRM** via existing CharacterStudio pipeline (`@pixiv/three-vrm` + `GLTFLoader`)
2. **Detect VRoid structure** by material naming convention:
   ```javascript
   // Material name patterns:
   // N00_000_00_Body_00_SKIN -- body skin
   // N00_000_00_Face_00_SKIN -- face skin
   // N00_000_00_EyeIris_00_EYE -- eye iris
   // N00_001_01_Tops_01_CLOTH -- clothing
   // N00_000_00_HairBack_00_HAIR -- hair
   ```
3. **Present modification UI** organized by category:
   - Skin (body + face tone, linked)
   - Eyes (iris color, highlight style)
   - Face details (eyebrow, lip color, makeup)
   - Clothing (color tint per garment)
   - Hair (swap mesh, recolor)
4. **Export modified VRM/GLB** via existing VRMExporter
5. **Upload to World** via NEXUS API (`POST /nexus/avatars/upload`)

### Files to Create/Modify

| File | Action | Purpose |
|---|---|---|
| `src/library/vrmMaterialEditor.js` | CREATE | VRM material detection + modification utilities |
| `src/pages/Appearance.jsx` | MODIFY | Add VRM-specific modification panels |
| `src/library/characterManager.js` | MODIFY | Add material swap methods |
| `public/manifest.json` | MODIFY | Add curated VRM prebuilt entries |
| `public/skins/` | CREATE | Skin tone texture presets |

### World Integration

No World changes needed for Phase 1. World's existing pipeline handles VRM/GLB:
- `AvatarSelectionModal.ts` -- upload + prebuilt picker
- `VRMValidator.ts` -- validates VRM before upload
- `VRMAvatarDriver.ts` -- loads into Babylon.js scene
- `AvatarDriverFactory.ts` -- format detection

---

## What We Explicitly Will NOT Do

1. **Attachment system on VRM** -- fragmented mesh structure makes this unreliable. Defer to SuperMesh (ADR-003).
2. **Body shape morphing on VRM** -- impossible (zero morph targets on body mesh). Limited **proportion adjustment** is possible via bone translation (Tier 2.5) but not musculature/weight changes. Full body customization requires SuperMesh.
3. **Face structure editing on VRM** -- impossible (construction morphs baked). Same as above.
4. **Cross-model topology blending** -- VRoid models have different topology per face/body configuration. Cannot blend face vertices from model A onto body from model B. However, we CAN transplant the entire face mesh (Tier 3.5 reconstruction) because face is a separate mesh object.
5. **VRoid design-time morph recovery** -- those morphs are gone. We cannot reverse-engineer them from baked geometry.
6. **Mode B clothing extraction** -- when clothing is baked into Body_00_SKIN geometry (Mode B), we cannot separate it. The solution is body reconstruction from a nude base (Tier 3.5), not mesh surgery.

---

## Testing Strategy

### Tier 1-2 Tests
1. **Skin swap test:** Load baseMale.vrm, swap Body_00_SKIN texture with a different skin tone. Verify face and body materials can be coordinated.
2. **Eye color test:** Load any VRM, swap EyeIris texture. Verify color change without affecting other eye layers.
3. **PBR test:** Replace MToon material with PBR on Face_00_SKIN. Evaluate visual quality change.

### Tier 2.5 Tests
4. **Bone transform test:** Load baseMale.vrm, programmatically adjust J_Bip_C_Hips Y and J_Bip_L/R_UpperArm X to match baseMale2 values. Verify mesh deforms to approximate baseMale2 proportions.
5. **Head scale compensation test:** Increase Hips Y (taller), independently scale J_Bip_C_Head. Verify head-to-body ratio remains natural.

### Tier 3 Tests
6. **Hair swap test:** Load VRM with hair, replace Hair mesh with hair from different VRM. Verify spring bones still work.
7. **Clothing mode detection test:** Load bT.vrm (Mode B) and shortPantsWithNeckAcc.vrm (Mode A). Verify detection algorithm correctly identifies each mode by presence/absence of `*_CLOTH` primitives.
8. **Mode A clothing strip test:** Load shortPantsWithNeckAcc.vrm, remove all `*_CLOTH` primitives. Verify Body_00_SKIN renders without gaps (or document where gaps appear).
9. **Mode A clothing swap test:** Extract `Shoes_01_CLOTH` from one Mode A VRM, parent to a different VRM's skeleton. Verify binding and visual fit.
10. **Clothing toggle test:** Load Mode A VRM, toggle clothing primitive visibility. Verify body underneath is visible.

### Tier 3.5 Tests (Body Reconstruction)
11. **Nude body baseline:** Export same VRoid character nude and with clothing (Mode A). Compare Body_00_SKIN vertex counts to confirm body cutaway behavior.
12. **Identity extraction test:** Extract face mesh, hair mesh, bone transforms, and ALL material properties from a customized VRM. Verify completeness of extracted data.
13. **Skin coloration roundtrip:** Extract Body_00_SKIN color/tint/shade from source VRM, apply to canonical nude base. Compare skin tone visually — must be indistinguishable.
14. **Bone transform transplant test:** Extract bone transforms from tall/heavy character, apply to short/slim nude base. Verify no mesh tearing, clipping, or visual artifacts.
15. **Full reconstruction test:** Extract identity from clothed VRM → apply to nude base → add different clothing → export as GLB → load in World. Verify identity preserved (face, skin tone, eye color, nail color).

### Integration Tests
16. **Export roundtrip:** Modify VRM in Avatar app (texture swaps + bone transforms), export as GLB, load in World's VRMAvatarDriver. Verify modifications persist.
17. **Cross-avatar clothing test:** Transfer Mode A clothing primitives between two different VRoid characters with different body proportions. Document fit quality at different proportion deltas.

---

## References

- VRoid Studio 2.10.0 VRM analysis: `public/vRoidModels/Pinkie.vrm`, `baseMale.vrm`, `baseMale2.vrm`
- Clothing mode comparison: `public/vRoidModels/bT.vrm` (Mode B, 2 body prims) vs `public/vRoidModels/shortPantsWithNeckAcc.vrm` (Mode A, 8 body prims)
- Skinner per-primitive isolation: `public/vRoidModelPuffPantsSkinnerTestPix/` (9 screenshots, each prim isolated)
- Bone translation comparison: baseMale vs baseMale2 (verified all scales [1,1,1], variation via translation only)
- Skinner mesh layer research: `public/vroidModelLayerPix/`
- VRoid texture UV research: `public/vroidModelLayerPix/latest/ss7290.png` (dress UV), `ss7291.png` (pants UV)
- VRM bone mapping: `src/library/VRMRigMapMixamo.js`
- Animator mesh layer handling: `blackBoxIKAnimator/labs/retargeting.html` (mesh cloning, skeleton rebinding)
- Animator morph target docs: `blackBoxIKAnimator/docs/MORPH_TARGET_EXPORT_OPTIMIZATION.md`
- World avatar pipeline: `World/src/avatars/VRMAvatarDriver.ts`
- VRM validator: `World/src/avatars/VRMValidator.ts`
- CharacterStudio export: `src/library/VRMExporter.js`, `src/library/download-utils.js`
- OpenSim clothing model: `Legacy/docs/opensim-object-model/avatars.md`
- poqpoq inventory system: `World/src/inventory/InventoryTypes.ts`

---

_Last Updated: 2026-02-26_
