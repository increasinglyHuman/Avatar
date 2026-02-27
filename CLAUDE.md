# BlackBox Avatar

Web-based avatar customization tool for poqpoq World.

## Project Status

**Fresh start** — repo reinitalized Feb 2026. Previous CharacterStudio fork has been archived.

## Technology Stack

- **Runtime**: Babylon.js (WebGPU-first, TypeScript)
- **Build**: Vite
- **No React** — vanilla TypeScript, following the Glitch repo pattern
- **Reference codebase**: `/home/p0qp0q/blackbox/glitch/` (Babylon.js, same architecture)

## Architecture Overview

### Three-Phase Avatar Strategy

1. **Phase 1 (VRM)**: Accept VRM uploads, post-import modification (skin/eye/hair color, clothing swap)
2. **Phase 2 (AI Mesh)**: Meshy3D + Mixamo retargeting pipeline
3. **Phase 3 (SuperMesh)**: Full parametric creation with blend shapes

See `docs/` for ADRs and technical specifications.

### VRM Modification Capabilities (Phase 1)

**Can change at runtime:**
- Skin tone (Body_00_SKIN + Face_00_SKIN materials)
- Eye color (EyeIris_00_EYE material)
- Hair color (all *_HAIR materials)
- Hair mesh swap (Hair001 mesh replacement)
- Clothing swap (Mode A CLOTH primitives: Tops, Bottoms, Shoes, Onepiece, Accessory)

**Cannot change post-export:**
- Body shape (0 morph targets on Body mesh — VRoid bakes at export)
- Face structure (57 expression morphs only, no structural morphs)

### Key VRM Anatomy

| Mesh | Primitives | Morphs | Purpose |
|------|-----------|--------|---------|
| Face | 7-8 | 57 expressions | Face rendering + expressions |
| Body | 2-8 | 0 | Body skin + hair back + clothing |
| Hair001 | 1 | 0 | Top/front hair geometry |

## Preserved Assets

All VRM assets, reference code, and research are preserved at:
`/home/p0qp0q/blackbox/avatar-preserved/`

- 38 tops, 5 pants, 16 hair styles, 4 nude bases, 12+ prebuilt characters
- Library code: vrmMaterialEditor.js, vrmClothingManager.js
- UI reference: VRMAppearanceEditor.jsx
- Research: Phoenix Viewer appearance/outfits analysis
- Pipeline docs: VRM-to-inventory pipeline specification

## Integration with poqpoq World

- Auth: Google OAuth (follow Animator's AuthManager.js pattern)
- Storage: `/var/www/world/models/` (S3 migration later)
- Database: `bbworlds_nexus` — uses existing `inventory_items`, `user_characters` tables
- Entry point: Appearance tab in World's shelf system
- All avatar modalities output GLB for World consumption

## Deployment

- **Production URL**: https://poqpoq.com/avatar/
- **Server**: poqpoq.com (SSH via `~/.ssh/poqpoq-new.pem`)
- **Apache**: Alias /avatar /var/www/avatar

## Development Commands

TBD — will be set up when Babylon.js scaffold is created.
