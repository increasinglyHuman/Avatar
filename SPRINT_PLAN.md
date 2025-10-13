# BlackBox Avatar - Sprint Plan & Task Breakdown

**Project Manager:** Allen Partridge (p0qp0q)
**Engineering Lead:** Codex
**Technical Advisor:** Claude Code

**Project Type:** Web-based 3D character creator (MakeHuman derivative)
**Timeline:** 8 sprints (2 weeks each) = 16 weeks
**Methodology:** Agile with strict acceptance criteria and testing gates

---

## Sprint Completion Criteria

Each sprint must meet ALL of the following before marking complete:

1. ✅ **All tasks completed** with passing tests
2. ✅ **Code review** completed and approved
3. ✅ **Documentation** updated (inline comments + docs/)
4. ✅ **Demo video** or screenshots provided
5. ✅ **Sprint retrospective** notes in `docs/sprints/sprint-N-retro.md`
6. ✅ **Git commit** pushed to main with descriptive message

---

## Sprint 0: Project Setup & Asset Extraction (Week 1-2)

**Goal:** Set up development environment, extract MakeHuman assets, verify toolchain works

### Task 0.1: Development Environment Setup

**Priority:** P0 (Blocker)
**Estimate:** 4 hours
**Assignee:** Codex

**Description:**
Set up Python backend environment with all dependencies installed and verified working.

**Implementation Steps:**
1. Create `backend/` directory structure
2. Create Python virtual environment (Python 3.11+ recommended, 3.10+ minimum)
3. Create `requirements.txt` with core dependencies
4. Install and verify all packages
5. Create `.env.example` with required environment variables
6. Test imports for all critical packages

**Note:** MakeHuman docs say 3.6+ but that's ancient. We're building new - use 3.11 or 3.12.

**Required Files:**
```
backend/
├── venv/                    # Python virtual environment (gitignored)
├── requirements.txt         # Dependencies
├── .env.example            # Template environment file
├── api/
│   └── __init__.py
└── tests/
    └── __init__.py
```

**Dependencies to Install:**
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
numpy==1.26.2
pygltflib==1.16.1
trimesh==4.0.5
python-multipart==0.0.6
pillow==10.1.0
pydantic==2.5.0
asyncpg==0.29.0          # PostgreSQL async driver
```

**Acceptance Criteria:**
- [ ] Python 3.11+ virtual environment created (3.12 even better)
- [ ] All dependencies install without errors
- [ ] `python -c "import fastapi, numpy, pygltflib, trimesh, asyncpg"` succeeds
- [ ] `.env.example` contains all required variables with documentation
- [ ] README.md updated with setup instructions

**.env.example Template:**
```bash
# Server Configuration
API_PORT=3030
API_HOST=127.0.0.1
NODE_ENV=development

# Database (shared with NEXUS and /world)
# IMPORTANT: Database is on PRODUCTION server (poqpoq.com), NOT local!
# For local development: SSH tunnel required (see below)
# For production deployment: localhost works (API runs on same server as DB)
DATABASE_URL=postgresql://nexus_user:nexus_secure_2025@localhost:5432/bbworlds_nexus
DB_POOL_MIN=2
DB_POOL_MAX=10

# Local Development Database Access
# Option 1: SSH Tunnel (recommended for development)
#   ssh -i ~/.ssh/poqpoq-new.pem -L 5432:localhost:5432 ubuntu@poqpoq.com
#   Then DATABASE_URL above will connect via tunnel
#
# Option 2: Mock/Test Database (for offline development)
#   Create local PostgreSQL with test data
#   DATABASE_URL=postgresql://test_user:test_pass@localhost:5432/avatar_test

# AWS S3 (for GLB exports)
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
AWS_REGION=us-west-2
S3_BUCKET_NAME=poqpoq-avatars

# Asset Paths
ASSETS_PATH=../assets
MAKEHUMAN_ASSETS_PATH=../assets/makehuman-assets
TEMP_PATH=../tmp

# Security
JWT_SECRET=generate_random_64_char_string
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3030

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/avatar-api.log
```

**Testing:**
```bash
# Verify Python version
python --version  # Must be >= 3.11 (3.12 recommended)

# Verify all imports
python -c "import fastapi; import numpy; import pygltflib; import trimesh; print('✅ All imports successful')"

# Verify FastAPI can start
cd backend
uvicorn api.main:app --reload --port 3020 &
curl http://localhost:3020/health  # Should return 200 OK
kill %1
```

**Definition of Done:**
- Environment setup script runs without errors
- All team members can replicate setup
- Health check endpoint returns 200 OK

**⚠️ IMPORTANT: Database Development Strategy**

The database is **NOT local** - it's on the production server (poqpoq.com). You have two options:

**Option 1: SSH Tunnel (Recommended for Sprint 0-2)**
```bash
# Open SSH tunnel in separate terminal (keep running)
ssh -i ~/.ssh/poqpoq-new.pem -L 5432:localhost:5432 ubuntu@poqpoq.com

# Now your local API can connect to production DB via localhost:5432
# .env DATABASE_URL stays as: postgresql://nexus_user:...@localhost:5432/bbworlds_nexus
```

**Option 2: Local Test Database (Recommended for Sprint 1+)**
```bash
# Install PostgreSQL locally
sudo apt install postgresql-16  # Ubuntu
brew install postgresql@16      # Mac

# Create local test database
sudo -u postgres psql << EOF
CREATE DATABASE avatar_test;
CREATE USER test_user WITH PASSWORD 'test_pass';
GRANT ALL PRIVILEGES ON DATABASE avatar_test TO test_user;
EOF

# Apply schema
sudo -u postgres psql -d avatar_test < backend/database/migrations/001_create_avatars_table.sql

# Update .env for local development
DATABASE_URL=postgresql://test_user:test_pass@localhost:5432/avatar_test
```

**Which to use when:**
- **Sprint 0 (Setup):** Either works, SSH tunnel is fastest
- **Sprint 1 (Morphing):** Local test DB recommended (no network dependency)
- **Sprint 2 (Materials):** Local test DB (faster iteration)
- **Sprint 3 (Export):** Production DB or SSH tunnel (test real data)
- **Production Deploy:** Runs on poqpoq.com with localhost connection

**Never:**
- ❌ Directly expose production PostgreSQL to internet
- ❌ Hardcode production credentials in code
- ❌ Test destructive operations on production DB

---

### Task 0.2: Frontend Environment Setup

**Priority:** P0 (Blocker)
**Estimate:** 3 hours
**Assignee:** Codex

**Description:**
Set up modern frontend development environment with Three.js and build tools.

**Implementation Steps:**
1. Create `frontend/` directory structure
2. Initialize npm project with Vite
3. Install Three.js and development dependencies
4. Create basic HTML structure with Three.js scene
5. Verify hot module reloading works
6. Test Three.js can render a simple cube

**Required Files:**
```
frontend/
├── package.json
├── vite.config.js
├── index.html
├── js/
│   └── main.js         # Entry point
├── css/
│   └── style.css       # Main styles
└── assets/
    └── .gitkeep
```

**Dependencies:**
```json
{
  "dependencies": {
    "three": "^0.159.0"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

**Acceptance Criteria:**
- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts dev server on port 5173
- [ ] Hot module reloading works (edit JS, see changes without refresh)
- [ ] Three.js renders a spinning cube on screen
- [ ] No console errors or warnings

**Testing:**
```bash
cd frontend
npm install
npm run dev

# Open http://localhost:5173
# Verify: Spinning cube visible
# Edit js/main.js, change cube color
# Verify: Color updates without manual refresh
```

**Definition of Done:**
- Dev server starts and serves content
- Three.js scene renders correctly
- HMR (Hot Module Reload) functional

---

### Task 0.3: Extract MakeHuman Base Mesh

**Priority:** P0 (Blocker)
**Estimate:** 6 hours
**Assignee:** Codex

**Description:**
Download MakeHuman assets, extract base mesh (hm08), and convert to usable formats (OBJ + JSON).

**Implementation Steps:**
1. Run `makehuman-reference/makehuman/download_assets_git.py`
2. Locate base mesh file (typically `data/3dobjs/base.obj`)
3. Create Python script to parse OBJ and extract data
4. Export mesh to JSON format for Three.js loading
5. Verify mesh loads correctly in Three.js
6. Document mesh specifications (vertex count, face count, etc.)

**Required Files:**
```
assets/
├── base/
│   ├── base_mesh.obj       # Original OBJ from MakeHuman
│   ├── base_mesh.json      # Converted for Three.js
│   └── base_mesh_info.txt  # Mesh specifications
└── scripts/
    └── extract_base_mesh.py
```

**Script Requirements:**
```python
# scripts/extract_base_mesh.py
"""
Extract MakeHuman base mesh and convert to JSON

Output JSON format:
{
  "vertices": [[x, y, z], ...],
  "faces": [[v1, v2, v3], ...],
  "normals": [[nx, ny, nz], ...],
  "uvs": [[u, v], ...],
  "metadata": {
    "vertex_count": 13380,
    "face_count": 13776,
    "source": "MakeHuman hm08"
  }
}
"""
```

**Acceptance Criteria:**
- [ ] MakeHuman assets downloaded successfully
- [ ] Base mesh extracted to `assets/base/base_mesh.obj`
- [ ] JSON conversion script creates valid JSON
- [ ] JSON mesh loads in Three.js without errors
- [ ] Mesh renders as a recognizable human figure
- [ ] Vertex/face counts match expected values (~13,000 verts)

**Testing:**
```bash
# Run extraction script
cd assets/scripts
python extract_base_mesh.py

# Verify output files exist
ls -lh ../base/base_mesh.json  # Should be ~2-5MB

# Verify JSON is valid
python -c "import json; json.load(open('../base/base_mesh.json'))"

# Load in Three.js
cd ../../frontend
npm run dev
# Verify: Human figure renders instead of cube
```

**Definition of Done:**
- Base mesh JSON file exists and is valid
- Mesh renders correctly in Three.js viewer
- Mesh info documented (vertex count, topology notes)

---

### Task 0.4: Extract Core Morph Targets

**Priority:** P1 (High)
**Estimate:** 8 hours
**Assignee:** Codex

**Description:**
Extract essential morph targets from MakeHuman for body customization (age, gender, weight, height, muscle).

**Implementation Steps:**
1. Identify target file locations in MakeHuman data structure
2. Parse `.target` file format (binary delta vectors)
3. Extract 5 core macro targets:
   - `macros/universal-age.target` (0-1: young to old)
   - `macros/universal-gender.target` (0-1: female to male)
   - `macros/universal-weight.target` (0-1: underweight to overweight)
   - `macros/universal-height.target` (0-1: short to tall)
   - `macros/universal-muscle.target` (0-1: flabby to ripped)
4. Convert to JSON format
5. Verify target counts match base mesh vertex count
6. Test applying single target to base mesh

**Target File Format:**
```
# MakeHuman .target format (binary)
# Each line: vertex_index dx dy dz
# Only vertices that move are listed

1234 0.015 -0.003 0.012
5678 -0.021 0.008 -0.001
...
```

**Output Format:**
```json
{
  "name": "universal-age",
  "category": "macros",
  "description": "Age: young (0.0) to old (1.0)",
  "vertex_count": 13380,
  "affected_vertices": 8234,
  "deltas": {
    "1234": [0.015, -0.003, 0.012],
    "5678": [-0.021, 0.008, -0.001]
  }
}
```

**Required Files:**
```
assets/
├── targets/
│   └── macros/
│       ├── universal-age.json
│       ├── universal-gender.json
│       ├── universal-weight.json
│       ├── universal-height.json
│       └── universal-muscle.json
└── scripts/
    └── extract_targets.py
```

**Acceptance Criteria:**
- [ ] All 5 macro targets extracted successfully
- [ ] JSON files are valid and parseable
- [ ] Each target has correct vertex count (13380)
- [ ] Delta vectors are within reasonable range (-1.0 to 1.0)
- [ ] Script includes verbose logging of progress
- [ ] Documentation explains .target format

**Testing:**
```bash
# Run extraction
python assets/scripts/extract_targets.py --category macros

# Verify all files created
ls -lh assets/targets/macros/
# Should show 5 JSON files, ~100KB-500KB each

# Validate JSON structure
python tests/test_target_format.py

# Test target application (manual)
# Load base mesh + age target at weight 1.0
# Verify: Mesh looks visibly older (wrinkles, posture)
```

**Definition of Done:**
- All 5 core targets extracted and validated
- Test script verifies target format correctness
- Documentation includes visual reference images

---

### Task 0.5: Hello World - First Morph

**Priority:** P1 (High)
**Estimate:** 6 hours
**Assignee:** Codex

**Description:**
Create proof-of-concept: apply a single morph target to base mesh and render result in Three.js.

**Implementation Steps:**
1. Create Python function to apply morph target
2. Create FastAPI endpoint `/api/morph/apply-single`
3. Create Three.js loader for morphed mesh
4. Add UI slider (0.0 to 1.0) for morph weight
5. Wire up slider to API call
6. Render morphed mesh in real-time
7. Verify morph interpolation is smooth

**API Endpoint:**
```python
# backend/api/routes/morph.py

@router.post("/morph/apply-single")
async def apply_single_morph(request: MorphRequest):
    """
    Apply a single morph target to base mesh

    Args:
        base_mesh: Path to base mesh JSON
        target: Path to target JSON
        weight: Float 0.0 to 1.0

    Returns:
        Morphed mesh as JSON
    """
    # Load base mesh
    # Load target deltas
    # Apply: new_vertex = base_vertex + (delta * weight)
    # Return morphed mesh
```

**Frontend:**
```html
<div class="controls">
  <label>Age</label>
  <input type="range" min="0" max="1" step="0.01" value="0.5" id="age-slider">
  <span id="age-value">0.50</span>
</div>
```

**Acceptance Criteria:**
- [ ] API endpoint accepts JSON payload and returns morphed mesh
- [ ] Morph math is correct (vertex + delta * weight)
- [ ] Slider changes mesh visibly in real-time
- [ ] Performance: < 500ms response time for single morph
- [ ] UI updates smoothly (no flickering)
- [ ] Weight values 0.0, 0.5, 1.0 all render correctly

**Testing:**
```bash
# Test API endpoint
curl -X POST http://localhost:3020/api/morph/apply-single \
  -H "Content-Type: application/json" \
  -d '{
    "base_mesh": "assets/base/base_mesh.json",
    "target": "assets/targets/macros/universal-age.json",
    "weight": 0.5
  }' | jq '.vertices | length'
# Should return 13380

# Manual UI test
# 1. Open http://localhost:5173
# 2. Drag slider from 0 to 1
# 3. Verify: Character ages smoothly
# 4. Check browser console for errors (should be none)
```

**Definition of Done:**
- Slider controls morph weight smoothly
- Visual difference between weight 0.0 and 1.0 is obvious
- No console errors or warnings

---

## Sprint 1: Core Morphing Engine (Week 3-4)

**Goal:** Implement production-ready morphing system supporting multiple simultaneous targets

### Task 1.1: Multi-Target Morph Engine

**Priority:** P0 (Blocker)
**Estimate:** 12 hours
**Assignee:** Codex

**Description:**
Build robust morphing engine that applies multiple targets simultaneously with proper additive blending.

**Requirements:**
- Support applying 5+ targets at once
- Additive blending (sum all weighted deltas)
- Caching for performance
- Error handling for missing targets
- Input validation (weights 0.0-1.0)

**API Design:**
```python
@router.post("/morph/apply-multiple")
async def apply_multiple_morphs(request: MultiMorphRequest):
    """
    Apply multiple morph targets with weights

    Request:
    {
      "base_mesh": "assets/base/base_mesh.json",
      "targets": [
        {"name": "macros/universal-age", "weight": 0.5},
        {"name": "macros/universal-weight", "weight": 0.7},
        {"name": "macros/universal-muscle", "weight": 0.3}
      ],
      "return_format": "json"  // or "obj"
    }

    Returns:
    {
      "vertices": [...],
      "faces": [...],
      "normals": [...],
      "applied_targets": ["universal-age", "universal-weight", "universal-muscle"],
      "processing_time_ms": 234
    }
    """
```

**Implementation Algorithm:**
```python
def apply_morphs(base_mesh, targets_with_weights):
    """
    1. Load base mesh vertices (Nx3 numpy array)
    2. Initialize output = copy(base_vertices)
    3. For each target with weight:
         a. Load target deltas
         b. For each affected vertex:
              output[vertex_id] += delta * weight
    4. Recalculate normals
    5. Return morphed mesh
    """
```

**Acceptance Criteria:**
- [ ] Handles 0 targets (returns base mesh)
- [ ] Handles 1 target (same as Sprint 0 Task 0.5)
- [ ] Handles 5 targets simultaneously
- [ ] Handles 20+ targets (future-proofing)
- [ ] Weight validation: rejects values outside [0.0, 1.0]
- [ ] Target validation: returns error for missing target files
- [ ] Performance: < 1 second for 5 targets
- [ ] Memory: < 100MB RAM usage
- [ ] Thread-safe for concurrent requests

**Testing:**
```python
# tests/test_morph_engine.py

def test_no_targets_returns_base_mesh():
    result = apply_morphs(base_mesh, [])
    assert np.array_equal(result, base_mesh)

def test_single_target_weight_zero():
    result = apply_morphs(base_mesh, [{"name": "age", "weight": 0.0}])
    assert np.array_equal(result, base_mesh)

def test_single_target_weight_one():
    result = apply_morphs(base_mesh, [{"name": "age", "weight": 1.0}])
    assert not np.array_equal(result, base_mesh)
    # Verify specific vertex moved correctly
    assert result[1234][0] == base_mesh[1234][0] + age_delta[1234][0]

def test_multiple_targets_additive():
    result = apply_morphs(base_mesh, [
        {"name": "age", "weight": 0.5},
        {"name": "weight", "weight": 0.7}
    ])
    # Verify: affected vertex = base + (age_delta * 0.5) + (weight_delta * 0.7)

def test_invalid_weight_raises_error():
    with pytest.raises(ValidationError):
        apply_morphs(base_mesh, [{"name": "age", "weight": 1.5}])

def test_missing_target_raises_error():
    with pytest.raises(FileNotFoundError):
        apply_morphs(base_mesh, [{"name": "nonexistent", "weight": 0.5}])

def test_performance_five_targets():
    start = time.time()
    result = apply_morphs(base_mesh, [
        {"name": "age", "weight": 0.5},
        {"name": "gender", "weight": 0.3},
        {"name": "weight", "weight": 0.7},
        {"name": "height", "weight": 0.4},
        {"name": "muscle", "weight": 0.6}
    ])
    elapsed = time.time() - start
    assert elapsed < 1.0  # Must complete in under 1 second
```

**Definition of Done:**
- All 8 unit tests pass
- API endpoint returns correct results
- Performance benchmarks meet requirements
- Code reviewed and approved

---

### Task 1.2: Frontend Multi-Slider UI

**Priority:** P1 (High)
**Estimate:** 8 hours
**Assignee:** Codex

**Description:**
Create professional UI with sliders for all 5 macro morphs, real-time preview, and preset buttons.

**UI Specifications:**

```
┌─────────────────────────────────────────────┐
│  BLACK BOX Avatar                    [? ⚙]  │
├────────────┬────────────────────────────────┤
│            │                                │
│  Body      │                                │
│  ────      │         [3D Preview]           │
│  Age       │                                │
│  ●────○    │                                │
│  0.50      │                                │
│            │                                │
│  Gender    │                                │
│  ●────○    │                                │
│  0.30      │                                │
│            │                                │
│  Weight    │                                │
│  ●─────○   │                                │
│  0.70      │                                │
│            │                                │
│  [Presets] │                                │
│  [Export]  │                                │
└────────────┴────────────────────────────────┘
```

**Features:**
1. **5 Sliders:** Age, Gender, Weight, Height, Muscle
2. **Real-time Updates:** Debounced API calls (300ms delay)
3. **Preset Buttons:** "Young Male", "Adult Female", "Elderly", "Athletic"
4. **Reset Button:** Return all sliders to 0.5
5. **Export Button:** Download GLB (disabled for now, placeholder)

**Technical Requirements:**
- Responsive layout (works on desktop and tablet)
- Keyboard accessible (arrow keys adjust sliders)
- Touch-friendly (mobile swipe to adjust)
- Visual feedback (loading spinner during API call)
- Error handling (show error message if API fails)

**Acceptance Criteria:**
- [ ] All 5 sliders visible and functional
- [ ] Slider values update numeric display in real-time
- [ ] 3D preview updates within 500ms of slider release
- [ ] Preset buttons apply correct values
- [ ] Reset button returns to default (0.5 for all)
- [ ] UI matches BlackBox brand (dark theme, Montserrat font)
- [ ] No layout shift or flickering during updates
- [ ] Keyboard navigation works (Tab, Arrow keys)

**Testing:**
```
Manual UI Tests:

1. Slider Interaction
   - Drag each slider from 0 to 1
   - Verify: 3D model updates visually
   - Verify: Numeric value updates

2. Preset Buttons
   - Click "Young Male"
   - Verify: Age=0.2, Gender=1.0, Weight=0.5, Height=0.6, Muscle=0.4
   - Verify: 3D model reflects preset

3. Performance
   - Rapidly drag slider back and forth
   - Verify: No duplicate API calls (debouncing works)
   - Verify: UI remains responsive

4. Error Handling
   - Stop backend API
   - Adjust slider
   - Verify: Error message displays (not silent fail)
   - Restart API
   - Verify: Normal operation resumes

5. Accessibility
   - Tab through controls
   - Use arrow keys to adjust slider
   - Verify: Works without mouse
```

**Definition of Done:**
- All manual tests pass
- UI matches design mockup
- Code reviewed for accessibility

---

### Task 1.3: Normal Recalculation

**Priority:** P1 (High)
**Estimate:** 6 hours
**Assignee:** Codex

**Description:**
Implement proper normal vector recalculation after morphing to ensure correct lighting.

**Problem:**
When vertices move, their normals (used for lighting) become incorrect. This causes weird shading artifacts.

**Solution:**
Recalculate normals based on new vertex positions using face-weighted averaging.

**Algorithm:**
```python
def recalculate_normals(vertices, faces):
    """
    1. Initialize normals array (Nx3) with zeros
    2. For each face (triangle):
         a. Get 3 vertices
         b. Calculate face normal: cross(v1-v0, v2-v0)
         c. Normalize face normal
         d. Add face normal to each vertex's normal (weighted by face area)
    3. Normalize all vertex normals
    4. Return normals array
    """
```

**Acceptance Criteria:**
- [ ] Normals calculated correctly (verified against known test mesh)
- [ ] Lighting looks smooth and correct
- [ ] No dark spots or inverted normals
- [ ] Performance: < 200ms for base mesh (13k verts)
- [ ] Works with degenerate faces (zero-area triangles)

**Testing:**
```python
# tests/test_normals.py

def test_flat_plane_normals():
    """Flat plane should have all normals pointing up"""
    vertices = [[0,0,0], [1,0,0], [1,1,0], [0,1,0]]
    faces = [[0,1,2], [0,2,3]]
    normals = recalculate_normals(vertices, faces)
    # All normals should point in +Z direction
    for normal in normals:
        assert normal[2] > 0.99  # Nearly 1.0
        assert abs(normal[0]) < 0.01  # Nearly 0
        assert abs(normal[1]) < 0.01  # Nearly 0

def test_sphere_normals():
    """Sphere normals should point radially outward"""
    # Load test sphere mesh
    # Verify normals point away from center

def test_morphed_mesh_normals():
    """Apply age morph, verify normals recalculated"""
    base_mesh = load_base_mesh()
    morphed = apply_morph(base_mesh, "age", 1.0)
    normals = recalculate_normals(morphed.vertices, morphed.faces)
    # Check sample vertices have reasonable normals
    for i, normal in enumerate(normals[::100]):  # Check every 100th
        magnitude = np.linalg.norm(normal)
        assert 0.99 < magnitude < 1.01  # Should be unit length
```

**Visual Verification:**
```
Load morphed character in Three.js with MeshStandardMaterial
Add directional light from side
Verify:
  - No black spots
  - Smooth shading across surface
  - Highlights appear in correct locations
  - No inverted faces (inside-out)
```

**Definition of Done:**
- All unit tests pass
- Visual inspection shows correct lighting
- Performance meets requirement

---

## Sprint 2: Material System (Week 5-6)

**Goal:** Implement basic material system with skin tones and textures

### Task 2.1: Texture Loading System

**Priority:** P1 (High)
**Estimate:** 6 hours
**Assignee:** Codex

**Description:**
Create system to load and manage MakeHuman skin textures (diffuse, normal, specular).

**Requirements:**
- Load PNG/JPG textures from `assets/materials/skins/`
- Support multiple texture types per material
- Convert paths to Three.js texture objects
- Handle missing textures gracefully

**Texture Types:**
1. **Diffuse** - Base color map
2. **Normal** - Surface detail (bump/wrinkle simulation)
3. **Specular** - Shininess/reflectivity map
4. **Roughness** - Material roughness (matte vs glossy)

**Implementation:**
```javascript
// frontend/js/TextureManager.js

class TextureManager {
  constructor() {
    this.cache = new Map();
    this.loader = new THREE.TextureLoader();
  }

  async loadMaterial(materialName) {
    // Load all textures for a material
    const diffuse = await this.loadTexture(`/assets/skins/${materialName}_diffuse.png`);
    const normal = await this.loadTexture(`/assets/skins/${materialName}_normal.png`);
    const spec = await this.loadTexture(`/assets/skins/${materialName}_spec.png`);

    return {
      diffuseMap: diffuse,
      normalMap: normal,
      specularMap: spec
    };
  }

  async loadTexture(path) {
    if (this.cache.has(path)) {
      return this.cache.get(path);
    }

    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (texture) => {
          this.cache.set(path, texture);
          resolve(texture);
        },
        undefined,
        (error) => {
          console.warn(`Failed to load texture: ${path}`, error);
          resolve(null);  // Return null instead of failing
        }
      );
    });
  }
}
```

**Acceptance Criteria:**
- [ ] Loads PNG and JPG textures
- [ ] Caches textures (no duplicate loads)
- [ ] Handles missing textures without crashing
- [ ] Provides fallback checkerboard texture for missing files
- [ ] Reports loading progress (for loading screen)
- [ ] Memory efficient (unloads unused textures)

**Testing:**
```javascript
// tests/test_texture_manager.js

describe('TextureManager', () => {
  test('loads valid texture', async () => {
    const manager = new TextureManager();
    const texture = await manager.loadTexture('/assets/test/valid.png');
    expect(texture).not.toBeNull();
    expect(texture.image.width).toBeGreaterThan(0);
  });

  test('handles missing texture', async () => {
    const manager = new TextureManager();
    const texture = await manager.loadTexture('/assets/test/missing.png');
    expect(texture).toBeNull();  // Should not throw
  });

  test('caches textures', async () => {
    const manager = new TextureManager();
    const tex1 = await manager.loadTexture('/assets/test/valid.png');
    const tex2 = await manager.loadTexture('/assets/test/valid.png');
    expect(tex1).toBe(tex2);  // Same object reference
  });

  test('loads complete material', async () => {
    const manager = new TextureManager();
    const material = await manager.loadMaterial('skin_caucasian_male');
    expect(material.diffuseMap).not.toBeNull();
    expect(material.normalMap).not.toBeNull();
  });
});
```

**Definition of Done:**
- All tests pass
- Textures display correctly in Three.js
- No memory leaks (verified with Chrome DevTools)

---

### Task 2.2: Skin Tone Presets

**Priority:** P1 (High)
**Estimate:** 8 hours
**Assignee:** Codex

**Description:**
Extract 6 skin tone presets from MakeHuman assets and create material picker UI.

**Skin Tone Presets:**
1. **Light** - Very pale (Northern European)
2. **Fair** - Light with warm undertones (Mediterranean)
3. **Medium** - Olive/tan (Middle Eastern, Latino)
4. **Tan** - Brown (South Asian, Native American)
5. **Dark** - Deep brown (African, Caribbean)
6. **Very Dark** - Very deep brown (Sub-Saharan African)

**Material Specifications:**
```json
{
  "name": "skin_light",
  "diffuse": "assets/skins/light_diffuse.png",
  "normal": "assets/skins/light_normal.png",
  "roughness": 0.8,
  "metalness": 0.0,
  "subsurface": {
    "enabled": false,
    "color": [0.8, 0.4, 0.3],
    "intensity": 0.5
  }
}
```

**UI Design:**
```
Skin Tone
─────────
[○] [○] [○]  <- 3 skin swatches per row
[○] [○] [○]

Each swatch:
- 60x60px circle
- Shows actual skin color
- Hover: Scale up slightly
- Click: Apply material
- Selected: Blue border
```

**Implementation:**
```javascript
// frontend/js/MaterialPicker.js

class MaterialPicker {
  constructor(scene, avatarMesh) {
    this.scene = scene;
    this.mesh = avatarMesh;
    this.presets = this.loadPresets();
    this.createUI();
  }

  loadPresets() {
    return [
      {name: 'Light', diffuse: '#f5d5c4', normalMap: '/assets/skins/light_normal.png'},
      {name: 'Fair', diffuse: '#e8ba9d', normalMap: '/assets/skins/fair_normal.png'},
      {name: 'Medium', diffuse: '#c89872', normalMap: '/assets/skins/medium_normal.png'},
      {name: 'Tan', diffuse: '#a67453', normalMap: '/assets/skins/tan_normal.png'},
      {name: 'Dark', diffuse: '#6e4530', normalMap: '/assets/skins/dark_normal.png'},
      {name: 'Very Dark', diffuse: '#3d2619', normalMap: '/assets/skins/verydark_normal.png'}
    ];
  }

  applyMaterial(preset) {
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(preset.diffuse),
      normalMap: this.textureManager.loadTexture(preset.normalMap),
      roughness: 0.8,
      metalness: 0.0,
      transmission: 0.05,  // Slight subsurface scattering fake
      thickness: 0.5
    });

    this.mesh.material = material;
  }
}
```

**Acceptance Criteria:**
- [ ] 6 skin tone swatches render correctly
- [ ] Clicking swatch applies material immediately
- [ ] Selected swatch has visual indicator
- [ ] Material includes diffuse + normal maps
- [ ] Skin looks realistic (not plastic/fake)
- [ ] Performance: < 100ms to switch materials
- [ ] Works on touch devices

**Testing:**
```
Manual Tests:

1. Visual Quality
   - Load character with each skin tone
   - Verify: Realistic appearance
   - Verify: Normal map shows skin texture
   - Verify: Lighting looks natural

2. UI Interaction
   - Click each swatch
   - Verify: Material updates immediately
   - Verify: Selected swatch highlighted

3. Performance
   - Rapidly click between swatches
   - Verify: No lag or stutter
   - Check memory: Should not increase

4. Edge Cases
   - Apply same swatch twice (should be idempotent)
   - Switch swatch during morph update (should not conflict)
```

**Definition of Done:**
- All 6 presets work correctly
- UI is intuitive and responsive
- Skin looks photorealistic (or close)

---

## Sprint 3: GLB Export (Week 7-8)

**Goal:** Implement GLB export with embedded textures and skeleton

### Task 3.1: Basic GLB Export (No Rig)

**Priority:** P0 (Blocker)
**Estimate:** 10 hours
**Assignee:** Codex

**Description:**
Create GLB exporter that outputs morphed mesh with materials (no skeleton yet).

**Requirements:**
- Export mesh geometry (vertices, normals, UVs)
- Embed textures in GLB
- Include material properties (PBR)
- Binary format (not JSON)
- Valid GLTF 2.0 spec

**Implementation:**
```python
# backend/api/export/glb_exporter.py

from pygltflib import GLTF2, Scene, Node, Mesh, Primitive, Buffer, BufferView, Accessor
import numpy as np

class GLBExporter:
    def export(self, mesh, material, output_path):
        """
        Export mesh as GLB file

        Steps:
        1. Create GLTF2 object
        2. Add mesh geometry (vertices, normals, UVs, faces)
        3. Add material (PBR parameters)
        4. Embed textures as base64
        5. Write binary GLB
        """
        gltf = GLTF2()

        # Create buffers for vertex data
        vertex_buffer = self._create_vertex_buffer(mesh)
        index_buffer = self._create_index_buffer(mesh)

        # Create material
        material_idx = self._create_material(gltf, material)

        # Create mesh primitive
        primitive = Primitive(
            attributes={
                "POSITION": 0,
                "NORMAL": 1,
                "TEXCOORD_0": 2
            },
            indices=3,
            material=material_idx
        )

        # Build scene graph
        scene = Scene(nodes=[0])
        gltf.scenes.append(scene)

        # Save binary
        gltf.save_binary(output_path)

        return output_path
```

**Acceptance Criteria:**
- [ ] Exports valid GLB file (passes gltf-validator)
- [ ] File size reasonable (< 10MB for base character)
- [ ] Loads correctly in Three.js
- [ ] Loads correctly in Babylon.js
- [ ] Loads correctly in Blender
- [ ] Textures embedded and display correctly
- [ ] Normals correct (lighting looks right)
- [ ] UVs correct (texture not stretched)

**Testing:**
```bash
# Generate test GLB
curl -X POST http://localhost:3020/api/export/glb \
  -H "Content-Type: application/json" \
  -d '{
    "morphs": [
      {"name": "age", "weight": 0.5},
      {"name": "weight", "weight": 0.7}
    ],
    "material": "skin_medium"
  }' \
  --output test_character.glb

# Validate GLTF spec compliance
npx gltf-validator test_character.glb

# Load in Three.js (automated test)
node tests/test_glb_load.js test_character.glb

# Manual validation
# 1. Import to Blender
#    File > Import > glTF 2.0 > test_character.glb
# 2. Verify: Model appears correctly
# 3. Verify: Textures load
# 4. Verify: No errors in Blender console

# Load in online viewer
# https://gltf-viewer.donmccurdy.com/
# Upload test_character.glb
# Verify: Renders correctly
```

**Definition of Done:**
- Passes gltf-validator with no errors
- Loads in 3+ different GLTF viewers/engines
- Textures display correctly

---

### Task 3.2: Add Skeleton/Rig to Export

**Priority:** P1 (High)
**Estimate:** 12 hours
**Assignee:** Codex

**Description:**
Add skeletal rig to GLB export for animation compatibility.

**Skeleton Specifications:**
- **Bone count:** 54-65 bones (humanoid standard)
- **Hierarchy:** Root → Hips → Spine → Chest → Shoulders → Arms/Legs
- **Naming:** Mixamo-compatible for easy animation import
- **Skinning:** Vertex weights from MakeHuman

**Bone Hierarchy (Simplified):**
```
Root
└── Hips
    ├── Spine
    │   └── Spine1
    │       └── Spine2
    │           ├── Neck
    │           │   └── Head
    │           ├── LeftShoulder
    │           │   └── LeftArm
    │           │       └── LeftForeArm
    │           │           └── LeftHand
    │           └── RightShoulder (mirror left)
    ├── LeftUpLeg
    │   └── LeftLeg
    │       └── LeftFoot
    └── RightUpLeg (mirror left)
```

**Implementation Steps:**
1. Extract MakeHuman skeleton definition
2. Convert bone positions to GLTF format
3. Extract skinning weights per vertex
4. Create GLTF Skin object
5. Link mesh to skeleton
6. Test in animation software

**Acceptance Criteria:**
- [ ] Skeleton has correct bone count (54-65)
- [ ] Bone hierarchy matches humanoid standard
- [ ] Skinning weights applied correctly
- [ ] Character deforms naturally when posed
- [ ] Compatible with Mixamo animations
- [ ] Imports cleanly into BlackBox Animator
- [ ] Imports cleanly into Blender
- [ ] No vertex explosions or weird deformations

**Testing:**
```python
# Automated test
def test_skeleton_export():
    exporter = GLBExporter()
    glb_path = exporter.export(
        mesh=morphed_mesh,
        material=material,
        skeleton=True,
        output_path="test_rigged.glb"
    )

    # Load GLB and verify skeleton
    gltf = GLTF2.load(glb_path)
    assert len(gltf.skins) == 1
    skin = gltf.skins[0]
    assert 54 <= len(skin.joints) <= 65

    # Verify weights sum to 1.0 for each vertex
    for vertex_weights in skin.weights:
        assert abs(sum(vertex_weights) - 1.0) < 0.01
```

```
Manual Tests:

1. Blender Import Test
   - Import test_rigged.glb
   - Enter Pose Mode
   - Rotate shoulder bone
   - Verify: Arm deforms smoothly
   - Verify: No vertices left behind
   - Verify: Weight painting looks reasonable

2. Animator Import Test
   - Load test_rigged.glb in BlackBox Animator
   - Enter IK mode
   - Move hand IK target
   - Verify: Arm follows naturally
   - Verify: Shoulder/elbow bend correctly

3. Animation Test
   - Download Mixamo walk animation (FBX)
   - Retarget to exported skeleton
   - Verify: Animation plays correctly
   - Verify: No joint popping or flipping
```

**Definition of Done:**
- Skeleton exports correctly
- Deformations look natural
- Compatible with animation tools

---

## Sprint 4: Face Customization (Week 9-10)

**Goal:** Add facial feature morphing (eyes, nose, mouth, etc.)

*(Continues with similar level of detail for Tasks 4.1-4.4)*

---

## Sprint 5-8 Overview

**Sprint 5:** Hair & Clothing Assets (Week 11-12)
**Sprint 6:** /world Integration (Week 13-14)
**Sprint 7:** Polish & Optimization (Week 15-16)
**Sprint 8:** Documentation & Launch Prep (Week 17-18)

---

## Testing Requirements Summary

### Unit Tests (Python Backend)
- All core functions have test coverage > 80%
- Tests use pytest framework
- Fixtures for common test data (base mesh, targets)
- Mock external dependencies
- Performance tests for critical paths

### Integration Tests (API)
- All endpoints tested with valid/invalid inputs
- Error handling verified
- Response times measured
- Concurrent request handling tested

### Frontend Tests (JavaScript)
- Unit tests with Jest
- Component tests for UI elements
- E2E tests with Playwright (critical user flows)
- Visual regression tests (optional but recommended)

### Manual Testing Checklist
- [ ] All UI controls functional
- [ ] 3D preview renders correctly
- [ ] Export produces valid files
- [ ] Performance acceptable on target hardware
- [ ] Accessibility: keyboard navigation works
- [ ] Accessibility: screen reader compatible
- [ ] Mobile: touch controls work
- [ ] Mobile: responsive layout correct

---

## Definition of Done (Global)

A task is NOT complete until ALL of these are true:

1. ✅ **Code written** and committed to feature branch
2. ✅ **Tests written** and passing (unit + integration)
3. ✅ **Documentation updated** (inline comments + external docs)
4. ✅ **Code review** completed by peer or lead
5. ✅ **Manual testing** completed using checklist
6. ✅ **Performance benchmarks** met (if applicable)
7. ✅ **Security review** passed (input validation, etc.)
8. ✅ **Accessibility tested** (WCAG 2.1 AA minimum)
9. ✅ **Merged to main** branch
10. ✅ **Deployment verified** in staging environment

---

## Progress Tracking

### Sprint Velocity Calculation
```
Story Points Completed / Sprint Duration = Velocity
```

Track velocity to improve estimates over time.

### Burndown Chart
Update `docs/sprints/sprint-N-burndown.csv` daily:
```csv
Date,Remaining_Points
2025-10-14,52
2025-10-15,48
2025-10-16,45
...
```

### Blockers Log
Document blockers immediately in `docs/BLOCKERS.md`:
```markdown
## 2025-10-14 - Task 0.3 Blocked

**Issue:** MakeHuman assets download script fails with SSL error

**Impact:** Cannot proceed with base mesh extraction

**Owner:** Codex

**Resolution Plan:**
1. Try alternative download method (manual git clone)
2. Contact MakeHuman community if issue persists
3. ETA for resolution: 2025-10-15
```

---

## Communication Protocol

### Daily Standup (Async)
Post in project chat by 10am:
```
**Yesterday:** Completed Task 0.1, started Task 0.2
**Today:** Finish Task 0.2, start Task 0.3
**Blockers:** None
```

### Sprint Review
End of each sprint:
1. Demo completed features
2. Review burndown chart
3. Discuss what went well
4. Identify improvements for next sprint

### Sprint Retrospective
Answer these questions:
- What went well?
- What could be improved?
- What will we commit to improving next sprint?

---

**Next Step:** Codex should acknowledge this sprint plan and begin with **Task 0.1: Development Environment Setup**.

All task details, acceptance criteria, and testing requirements are specified. No ambiguity should remain.

Ready for engineering execution. 🚀
