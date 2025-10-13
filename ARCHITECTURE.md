# BlackBox Avatar - Architecture & Development Plan

## Executive Summary

BlackBox Avatar is a simplified, web-based character creation tool derived from MakeHuman, designed to integrate seamlessly with the poqpoq ecosystem (Animator, Skinner, Terraformer, and /world).

**License:** AGPL-3.0 (derivative of MakeHuman)
**Primary Export:** GLB (with future FBX support)
**Target Frameworks:** Three.js, Babylon.js
**Integration:** Iframe-friendly for in-game avatar creation

---

## MakeHuman Analysis - What We Learned

### Technology Stack (Current MakeHuman)
- **Language:** Python 3.6+
- **GUI:** PyQt5 (desktop application)
- **3D Rendering:** PyOpenGL
- **Core Code:** ~9,000 lines
- **Plugin System:** ~8,500 lines

### Key Assets (All CC0 - Public Domain!)
- ✅ **Base mesh** (hm08) - Professional human topology
- ✅ **Morph targets** - Thousands of blend shapes for every body part
- ✅ **Material definitions** (.mhmat format)
- ✅ **Rig templates** - Multiple skeleton options
- ✅ **Proxy meshes** - Clothes, hair, accessories

**Assets Repository:** https://github.com/makehumancommunity/makehuman-assets.git

### Material System Insights

**MakeHuman Material Format (.mhmat):**
```
name DefaultSkin
ambientColor 0.11 0.11 0.11
specularColor 0.3 0.3 0.3
shininess 0.96
opacity 1.0
translucency 0.0
autoBlendSkin true        # Automatic ethnicity-based skin blending
sssEnabled true           # Subsurface scattering
shader data/shaders/glsl/litsphere
shaderConfig diffuse false
shaderConfig bump true
shaderConfig spec true
```

**Key Material Features:**
- **autoBlendSkin** - Procedural skin tone generation based on ethnicity sliders
- **Subsurface Scattering (SSS)** - For realistic skin rendering
- **Multi-texture support:** diffuse, bump, normal, displacement, specular, transparency, AO
- **Shader system:** GLSL shaders with configurable defines

### Export System

**Available Exporters in MakeHuman:**
- FBX (9_export_fbx/) - Binary FBX with full rig/material support
- Collada (.dae) - XML-based, good for game engines
- OBJ (9_export_obj/) - Simple mesh export
- BVH - Animation/motion capture data
- STL - 3D printing
- Ogre3D - Legacy game engine format

**Notable:** No native GLB/GLTF exporter (yet)

### Morphing System

**How MakeHuman Creates Bodies:**
1. **Base Mesh** - Single, high-quality neutral human mesh
2. **Target Files** - Delta vectors stored as `.target` files
3. **Additive Blending** - Targets are applied with weights (0.0 to 1.0)
4. **Categories:**
   - **Macros:** Age, gender, weight, muscle, height
   - **Details:** Individual body parts (nose, eyes, chin, etc.)
   - **Asymmetry:** Left/right variations
   - **Expressions:** Facial expressions
   - **Custom:** User-created morphs

**Example Target Categories:**
```
data/targets/
├── head/          # Head shape, fat, scale
├── nose/          # Width, curve, flaring
├── eyes/          # Size, angle, distance
├── mouth/         # Width, lips, philtrum
├── ears/          # Size, shape, lobe
├── torso/         # Chest, belly, shoulders
├── breast/        # Size, firmness
├── arms/legs/     # Muscle, fat, length
├── hip/           # Width, pelvis shape
└── expression/    # Smile, frown, etc.
```

---

## BlackBox Avatar - Architecture Plan

### Design Philosophy

**Modular & Pythonic:**
- Keep Python backend for morphing engine (proven, fast)
- Use FastAPI or Flask for REST API
- Three.js for 3D viewer (matches /world tech stack)
- Simple, clean UI (not trying to replicate all MakeHuman features)

**Integration First:**
- Iframe-embeddable for in-game character creation
- GLB export optimized for Three.js/Babylon.js
- Compatible with Voice Ninja for personality layer
- Works with Skinner and Animator tools

**Simplified Feature Set:**
- Focus on human character creation (no animals, fantasy creatures in V1)
- Essential body morphing (age, gender, weight, height, muscle)
- Face customization (simplified presets + sliders)
- Basic clothing/hair selection
- Skin tone/texture selection
- Export to GLB (rigged, with materials)

---

## Technical Architecture

### Directory Structure

```
blackbox-avatar/
├── frontend/                    # Web UI
│   ├── index.html              # Main character creator
│   ├── js/
│   │   ├── avatar-viewer.js    # Three.js 3D viewer
│   │   ├── morph-controls.js   # Slider UI for body/face
│   │   ├── material-picker.js  # Skin/texture selection
│   │   ├── export-manager.js   # GLB export handler
│   │   └── api-client.js       # Backend communication
│   ├── css/
│   │   ├── avatar-creator.css
│   │   └── controls.css
│   └── assets/
│       ├── icons/
│       └── ui/
│
├── backend/                     # Python API
│   ├── api/
│   │   ├── main.py             # FastAPI entry point
│   │   ├── routes/
│   │   │   ├── morph.py        # Morphing endpoints
│   │   │   ├── export.py       # GLB export
│   │   │   └── presets.py      # Character presets
│   │   ├── engine/
│   │   │   ├── morph_engine.py # Core from MakeHuman
│   │   │   ├── mesh_utils.py   # Mesh operations
│   │   │   └── target_loader.py# Load .target files
│   │   ├── export/
│   │   │   ├── glb_exporter.py # GLB export (pygltflib or trimesh)
│   │   │   └── fbx_exporter.py # Future FBX support
│   │   └── materials/
│   │       ├── material_manager.py
│   │       └── skin_blender.py # Auto skin tone blending
│   ├── requirements.txt
│   └── venv/
│
├── assets/                      # From MakeHuman (CC0)
│   ├── base/
│   │   ├── base_mesh.obj       # hm08 base mesh
│   │   ├── base_mesh_uv.png    # UV layout
│   │   └── skeleton.json       # Default rig
│   ├── targets/                # Morph targets
│   │   ├── macros/             # Age, gender, weight, etc.
│   │   ├── face/               # Facial features
│   │   ├── body/               # Body parts
│   │   └── expression/         # Facial expressions
│   ├── materials/
│   │   ├── skins/              # Skin textures/materials
│   │   └── eyes/               # Eye materials
│   ├── clothes/                # Proxy meshes
│   ├── hair/                   # Hair meshes
│   └── rigs/                   # Skeleton templates
│
├── docs/
│   ├── ARCHITECTURE.md         # This file
│   ├── API.md                  # API documentation
│   ├── MATERIALS.md            # Material system guide
│   └── INTEGRATION.md          # /world integration guide
│
├── scripts/
│   ├── extract_makehuman_assets.py  # Pull assets from MakeHuman
│   ├── convert_targets.py           # Convert .target to JSON
│   └── test_morph.py                # Morphing system tests
│
├── LICENSE                     # AGPL-3.0
├── README.md
└── makehuman-reference/        # Reference clone (not deployed)
```

---

## API Design

### REST Endpoints

```python
# Morphing
POST   /api/morph/apply          # Apply morph targets to base mesh
GET    /api/morph/targets        # List available targets
GET    /api/morph/presets        # Get character presets

# Materials
GET    /api/materials/skins      # Available skin tones
GET    /api/materials/eyes       # Eye colors/materials
POST   /api/materials/apply      # Apply material to mesh

# Export
POST   /api/export/glb           # Export character as GLB
POST   /api/export/preview       # Generate thumbnail

# Assets
GET    /api/assets/clothes       # List clothing options
GET    /api/assets/hair          # List hair options
POST   /api/assets/attach        # Attach clothing/hair
```

### Example Morph Request

```json
POST /api/morph/apply
{
  "baseModel": "hm08",
  "targets": [
    {"name": "macros/age", "weight": 0.5},
    {"name": "macros/gender", "weight": 0.0},
    {"name": "macros/weight", "weight": 0.3},
    {"name": "face/nose-width", "weight": 0.7}
  ],
  "returnFormat": "json"  // or "glb", "obj"
}

Response:
{
  "vertices": [...],
  "normals": [...],
  "uvs": [...],
  "preview": "data:image/png;base64,..."
}
```

---

## Material System Strategy

### Phase 1: Simple Texture Mapping (MVP)
**Goal:** Get avatars rendering with basic skin

**Approach:**
- Use MakeHuman's CC0 base skin textures
- Simple diffuse + normal map
- Pre-baked skin tone variations (light, medium, dark)
- Three.js `MeshStandardMaterial` or `MeshPhysicalMaterial`

**No Custom Material Editor Needed Yet:**
```javascript
// Three.js side
const material = new THREE.MeshStandardMaterial({
  map: diffuseTexture,      // From MakeHuman assets
  normalMap: normalTexture,
  roughness: 0.8,
  metalness: 0.1
});
```

### Phase 2: Procedural Skin Blending (After MVP)
**Goal:** Dynamic skin tones like MakeHuman's autoBlendSkin

**Approach:**
- Port MakeHuman's skin blending algorithm
- Use ethnicity sliders (African, Asian, Caucasian, etc.)
- Generate skin textures procedurally or blend base textures
- Could use fragment shaders for real-time blending

### Phase 3: Advanced Materials (Future)
**Goal:** SSS, detailed skin, tattoos, makeup

**Learn from MakeHuman's material_editor.py:**
- Multi-layer material system
- Subsurface scattering parameters
- Custom shader integration
- Texture painting/stamping

**When We Build Material Editor:**
- Study `7_material_editor.py` (903 lines)
- Understand their shader configuration system
- Review `.mhmat` file format
- Look at their SSS implementation

---

## GLB Export Strategy

### Why GLB?
- Native support in Three.js, Babylon.js
- Self-contained (textures embedded)
- Efficient binary format
- Industry standard for web 3D

### Python GLB Export Options

**Option 1: pygltflib** (Recommended)
```python
pip install pygltflib
```
- Pure Python, easy to use
- Good for basic GLB export
- Less feature-complete than Blender

**Option 2: trimesh + pygltflib**
```python
pip install trimesh[easy] pygltflib
```
- Better mesh utilities
- Handles complex geometries
- Good documentation

**Option 3: Blender Python API** (Later)
- Most robust, full feature set
- Can leverage MakeHuman's existing FBX exporter
- Convert FBX → GLB via Blender
- Requires Blender installation

### MVP Export Flow

```python
# Simplified GLB export
def export_glb(mesh, skeleton, materials):
    # 1. Create GLTF structure
    gltf = GLTF2()

    # 2. Add mesh geometry
    gltf.meshes.append(create_mesh(mesh.vertices, mesh.faces, mesh.uvs))

    # 3. Add skeleton (armature)
    if skeleton:
        gltf.skins.append(create_skin(skeleton))

    # 4. Add materials
    for mat in materials:
        gltf.materials.append(create_pbr_material(mat))

    # 5. Embed textures
    for tex in materials.textures:
        gltf.images.append(embed_texture(tex))

    # 6. Write binary GLB
    gltf.save_binary(output_path)
```

---

## FBX Export (Future Phase)

**Why Keep FBX in Mind:**
- Industry standard for game engines (Unity, Unreal)
- Better rigging/animation support
- MakeHuman already has robust FBX exporter

**MakeHuman's FBX Exporter Structure:**
```
9_export_fbx/
├── fbx_binary.py      # Binary FBX format (1,035 lines!)
├── fbx_mesh.py        # Mesh export
├── fbx_skeleton.py    # Armature/bones
├── fbx_material.py    # Material export
├── fbx_deformer.py    # Skinning weights
└── fbx_anim.py        # Animation data
```

**When We Port FBX:**
- Study their binary FBX implementation
- Understand their skinning weight calculation
- Review material conversion
- Test with Unity/Unreal import

---

## Development Phases

### Phase 1: Foundation (Week 1-2)
- [x] Clone MakeHuman reference
- [ ] Extract base mesh and essential morph targets
- [ ] Set up Python backend (FastAPI)
- [ ] Implement basic morph engine
- [ ] Create simple Three.js viewer
- [ ] Test morph application (body sliders only)

### Phase 2: MVP Export (Week 3)
- [ ] Implement GLB export (pygltflib)
- [ ] Add basic material support (diffuse + normal)
- [ ] Test in Three.js and Babylon.js
- [ ] Verify skeleton/rigging works
- [ ] Simple UI for body morphing

### Phase 3: Face Customization (Week 4)
- [ ] Add facial morph targets
- [ ] Face control UI (eyes, nose, mouth, etc.)
- [ ] Expression presets
- [ ] Test facial animations

### Phase 4: Materials & Textures (Week 5-6)
- [ ] Implement skin tone selection
- [ ] Eye color/material picker
- [ ] Port autoBlendSkin algorithm (optional)
- [ ] Add hair/clothing proxy meshes

### Phase 5: Integration (Week 7)
**Priority 1: /world integration**
- [ ] Iframe embedding for /world
- [ ] PostMessage API for avatar data
- [ ] Save/load character presets
- [ ] Test in poqpoq /world

**Priority 2: Standalone tool**
- [ ] Direct GLB download
- [ ] Character library/gallery
- [ ] Share character URLs

**Priority 3: Animator integration**
- [ ] Export rigged GLB with proper skeleton
- [ ] Test animations in Animator
- [ ] Ensure skeleton compatibility

### Phase 6: Polish (Week 8+)
- [ ] Advanced materials (SSS, makeup)
- [ ] FBX export option
- [ ] Custom morph target upload
- [ ] Material editor UI

---

## Key Questions & Decisions

### Can We Get Sophisticated Materials Without Porting Material Editor?

**Short Answer: YES (for now)**

**Phase 1 Strategy:**
1. **Use MakeHuman's Existing Skin Textures (CC0)**
   - They already have high-quality skin diffuse/normal/specular maps
   - Just load these as static assets
   - No editor needed - users pick from presets

2. **Three.js MeshPhysicalMaterial**
   ```javascript
   const skinMaterial = new THREE.MeshPhysicalMaterial({
     map: skinDiffuseTexture,
     normalMap: skinNormalMap,
     roughnessMap: skinRoughnessMap,
     roughness: 0.8,
     metalness: 0.0,
     // Optional: fake SSS with translucency
     transmission: 0.1,
     thickness: 0.5
   });
   ```

3. **Pre-Made Skin Tone Variations**
   - Light, Medium, Dark, Very Dark (4-6 presets)
   - Eye colors (10-15 options)
   - Hair colors (10-15 options)
   - No procedural blending yet

**When We Need Material Editor:**
- Users want custom tattoos/makeup
- Real-time skin tone adjustment (not presets)
- Advanced SSS tuning
- Texture painting

**Learning from Material Editor (for later):**
- Shader configuration system (diffuse, bump, normal, SSS)
- Material file format (.mhmat → JSON)
- Texture layering approach
- SSS parameter tuning

---

## Production Deployment

**Server:** poqpoq.com (34.220.134.216)
**Port:** 3030 (Avatar API)
**Path:** `/avatar/` (frontend), `/avatar/api/` (backend)
**Database:** `bbworlds_nexus` (shared with /world)

See [docs/deployment/DEPLOYMENT_GUIDE.md](docs/deployment/DEPLOYMENT_GUIDE.md) for full deployment instructions.

**IMPORTANT:** Read [docs/deployment/GOOD_NEIGHBOR_POLICY_API_ARCHITECTURE_v2_2025-08-31.md](docs/deployment/GOOD_NEIGHBOR_POLICY_API_ARCHITECTURE_v2_2025-08-31.md) before deploying. This is a **shared server** with multiple BlackBox tools.

---

## Technology Stack

### Backend
- **Language:** Python 3.11+ (3.12 recommended, NOT 3.6!)
- **Framework:** FastAPI (async, modern, fast)
- **3D Libraries:**
  - `numpy` - Mesh math
  - `pygltflib` - GLB export
  - `trimesh` - Mesh utilities (optional)
- **Image:** Pillow (texture handling)

### Frontend
- **3D Engine:** Three.js r150+
- **UI:** Vanilla JS + Web Components (or React if needed)
- **Build:** Vite (fast dev server, HMR)
- **Styling:** Custom CSS (match BlackBox suite aesthetic)

### Development
- **Version Control:** Git (GitHub: increasinglyHuman/Avatar.git)
- **License:** AGPL-3.0 (same as MakeHuman)
- **Assets License:** CC0 (MakeHuman assets)

---

## Integration Points

### With /world (poqpoq WORLDS)
- Iframe embed in character creation screen
- PostMessage API for avatar data exchange
- GLB export directly to /world asset library
- Character save to user profile

### With Voice Ninja (V2 - Future)
**Status:** Deferred until we can afford concurrent AI/VN processing
- Avatar creation + personality assignment
- Voice settings attached to character
- Lip-sync animation targets (viseme matching)
- Emotional expression morphs

### With Animator
- Export rigged GLB
- Test animations on character
- Custom animation creation

### With Skinner
- Weight painting on custom morphs
- Fine-tune skinning weights
- Export corrected weights back to Avatar

---

## Open Questions

1. **Texture Resolution:**
   - What resolution for skin textures? (2K, 4K?)
   - Web optimization vs quality tradeoff

2. **Skeleton:**
   - Which rig to use as default? (game, cmu, rigify?)
   - Custom rig for /world compatibility?

3. **Morph Target Count:**
   - How many targets to ship? (all ~2000? or curated subset?)
   - Performance implications in browser

4. **Asset Storage:**
   - Host assets on S3?
   - CDN for textures?
   - Self-host vs cloud

5. **Authentication:**
   - Anonymous creation?
   - Require login for save/export?
   - Integration with /world auth

---

## Next Immediate Steps

1. **Extract MakeHuman Assets**
   - Run `download_assets_git.py`
   - Identify essential base mesh
   - Copy core morph targets

2. **Set Up Project Structure**
   - Create `frontend/` and `backend/` directories
   - Initialize Python venv
   - Set up FastAPI skeleton

3. **Proof of Concept:**
   - Load base mesh in Three.js
   - Apply one morph target via Python API
   - Verify morphing math works

4. **First GLB Export:**
   - Export static base mesh as GLB
   - Load in Three.js
   - Verify skeleton/materials

---

## Resources & References

- **MakeHuman Docs:** http://www.makehumancommunity.org/wiki/
- **MakeHuman Code:** https://github.com/makehumancommunity/makehuman
- **MakeHuman Assets:** https://github.com/makehumancommunity/makehuman-assets
- **GLTF Spec:** https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
- **Three.js Docs:** https://threejs.org/docs/
- **pygltflib:** https://gitlab.com/dodgyville/pygltflib

---

**Document Version:** 1.0
**Date:** October 13, 2025
**Author:** Allen Partridge (p0qp0q) with Claude Code
