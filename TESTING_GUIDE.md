# BlackBox Avatar - Testing Guide

**For:** Codex (and future developers)
**Purpose:** Comprehensive testing standards and procedures

---

## Testing Philosophy

**"If it's not tested, it's broken."**

Every feature must have:
1. **Unit tests** - Individual functions work correctly
2. **Integration tests** - Components work together
3. **Manual tests** - UI/UX feels right
4. **Performance tests** - Meets speed requirements

---

## Test Coverage Requirements

### Minimum Coverage
- **Backend:** 80% code coverage
- **Frontend:** 70% code coverage (UI is harder to autotest)
- **Critical paths:** 95% coverage (morphing, export)

### What Must Be Tested
✅ All API endpoints
✅ All morphing algorithms
✅ All export functions
✅ Error handling paths
✅ Edge cases (empty input, max input, invalid input)

### What Can Skip Tests
- Simple getters/setters
- Third-party library wrappers (if thin)
- Temporary debug code

---

## Python Backend Testing

### Setup

```bash
cd backend
pip install pytest pytest-cov pytest-asyncio pytest-mock
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=api --cov-report=html

# Run specific test file
pytest tests/test_morph_engine.py

# Run specific test
pytest tests/test_morph_engine.py::test_single_target_weight_one

# Run with verbose output
pytest -v

# Run and stop on first failure
pytest -x

# Run only fast tests (skip slow integration tests)
pytest -m "not slow"
```

### Test Structure

```python
# tests/test_morph_engine.py

import pytest
import numpy as np
from api.engine.morph_engine import MorphEngine

@pytest.fixture
def base_mesh():
    """Fixture: Load test base mesh"""
    return {
        "vertices": np.array([[0,0,0], [1,0,0], [0,1,0]]),
        "faces": np.array([[0,1,2]])
    }

@pytest.fixture
def age_target():
    """Fixture: Simple age morph target"""
    return {
        "deltas": {
            0: [0.1, 0.0, 0.0],  # Vertex 0 moves +0.1 in X
            1: [0.0, 0.1, 0.0]   # Vertex 1 moves +0.1 in Y
        }
    }

def test_apply_morph_weight_zero(base_mesh, age_target):
    """Weight 0.0 should not change mesh"""
    engine = MorphEngine()
    result = engine.apply_morph(base_mesh, age_target, weight=0.0)
    np.testing.assert_array_equal(result["vertices"], base_mesh["vertices"])

def test_apply_morph_weight_one(base_mesh, age_target):
    """Weight 1.0 should apply full delta"""
    engine = MorphEngine()
    result = engine.apply_morph(base_mesh, age_target, weight=1.0)

    # Vertex 0 should have moved
    expected_v0 = [0.1, 0.0, 0.0]
    np.testing.assert_array_almost_equal(result["vertices"][0], expected_v0)

    # Vertex 1 should have moved
    expected_v1 = [1.0, 0.1, 0.0]
    np.testing.assert_array_almost_equal(result["vertices"][1], expected_v1)

def test_apply_morph_weight_half(base_mesh, age_target):
    """Weight 0.5 should apply half delta"""
    engine = MorphEngine()
    result = engine.apply_morph(base_mesh, age_target, weight=0.5)

    expected_v0 = [0.05, 0.0, 0.0]  # 0.1 * 0.5
    np.testing.assert_array_almost_equal(result["vertices"][0], expected_v0)

def test_invalid_weight_raises_error(base_mesh, age_target):
    """Weights outside [0, 1] should raise ValueError"""
    engine = MorphEngine()

    with pytest.raises(ValueError, match="Weight must be between 0.0 and 1.0"):
        engine.apply_morph(base_mesh, age_target, weight=1.5)

    with pytest.raises(ValueError):
        engine.apply_morph(base_mesh, age_target, weight=-0.1)

@pytest.mark.slow
def test_performance_large_mesh():
    """Morphing should complete in < 1 second for production mesh"""
    import time

    # Load full base mesh (13k vertices)
    mesh = load_full_base_mesh()
    target = load_target("macros/age")

    engine = MorphEngine()

    start = time.time()
    result = engine.apply_morph(mesh, target, weight=0.5)
    elapsed = time.time() - start

    assert elapsed < 1.0, f"Morphing took {elapsed:.2f}s, must be < 1.0s"

def test_concurrent_requests():
    """Engine should handle concurrent morphing"""
    import threading

    engine = MorphEngine()
    mesh = load_test_mesh()
    target = load_target("age")

    results = []

    def morph_worker():
        result = engine.apply_morph(mesh, target, weight=0.5)
        results.append(result)

    threads = [threading.Thread(target=morph_worker) for _ in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(results) == 10
    # All results should be identical
    for r in results[1:]:
        np.testing.assert_array_equal(r["vertices"], results[0]["vertices"])
```

### API Endpoint Testing

```python
# tests/test_api_morph.py

import pytest
from fastapi.testclient import TestClient
from api.main import app

@pytest.fixture
def client():
    return TestClient(app)

def test_health_endpoint(client):
    """Health check should return 200 OK"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_apply_morph_valid_request(client):
    """Valid morph request should return morphed mesh"""
    payload = {
        "base_mesh": "assets/base/base_mesh.json",
        "targets": [
            {"name": "macros/age", "weight": 0.5}
        ],
        "return_format": "json"
    }

    response = client.post("/api/morph/apply", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert "vertices" in data
    assert len(data["vertices"]) > 0

def test_apply_morph_invalid_weight(client):
    """Invalid weight should return 400 Bad Request"""
    payload = {
        "base_mesh": "assets/base/base_mesh.json",
        "targets": [
            {"name": "macros/age", "weight": 1.5}  # Invalid!
        ]
    }

    response = client.post("/api/morph/apply", json=payload)

    assert response.status_code == 400
    assert "weight" in response.json()["detail"].lower()

def test_apply_morph_missing_target(client):
    """Missing target file should return 404"""
    payload = {
        "base_mesh": "assets/base/base_mesh.json",
        "targets": [
            {"name": "macros/nonexistent", "weight": 0.5}
        ]
    }

    response = client.post("/api/morph/apply", json=payload)

    assert response.status_code == 404

@pytest.mark.slow
def test_export_glb(client):
    """GLB export should return valid binary file"""
    payload = {
        "morphs": [
            {"name": "age", "weight": 0.5}
        ],
        "material": "skin_medium",
        "include_rig": False
    }

    response = client.post("/api/export/glb", json=payload)

    assert response.status_code == 200
    assert response.headers["content-type"] == "model/gltf-binary"

    # Save and validate GLB
    with open("test_output.glb", "wb") as f:
        f.write(response.content)

    # Validate with gltf-validator (requires npm package installed)
    import subprocess
    result = subprocess.run(
        ["npx", "gltf-validator", "test_output.glb"],
        capture_output=True
    )
    assert result.returncode == 0
```

---

## Frontend JavaScript Testing

### Setup

```bash
cd frontend
npm install --save-dev jest @testing-library/jest-dom
npm install --save-dev playwright  # For E2E tests
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Run E2E tests
npx playwright test
```

### Unit Tests

```javascript
// js/__tests__/MorphController.test.js

import { MorphController } from '../MorphController';

describe('MorphController', () => {
  let controller;

  beforeEach(() => {
    controller = new MorphController();
  });

  test('initializes with default morphs', () => {
    expect(controller.getMorphs()).toEqual({
      age: 0.5,
      gender: 0.5,
      weight: 0.5,
      height: 0.5,
      muscle: 0.5
    });
  });

  test('setMorph updates value', () => {
    controller.setMorph('age', 0.7);
    expect(controller.getMorph('age')).toBe(0.7);
  });

  test('setMorph clamps values to [0, 1]', () => {
    controller.setMorph('age', 1.5);
    expect(controller.getMorph('age')).toBe(1.0);

    controller.setMorph('age', -0.5);
    expect(controller.getMorph('age')).toBe(0.0);
  });

  test('setMorph rejects invalid morph names', () => {
    expect(() => {
      controller.setMorph('invalid', 0.5);
    }).toThrow('Unknown morph: invalid');
  });

  test('reset returns all morphs to 0.5', () => {
    controller.setMorph('age', 0.8);
    controller.setMorph('weight', 0.2);

    controller.reset();

    const morphs = controller.getMorphs();
    Object.values(morphs).forEach(value => {
      expect(value).toBe(0.5);
    });
  });
});
```

### Integration Tests

```javascript
// js/__tests__/integration/MorphPipeline.test.js

import { MorphController } from '../../MorphController';
import { APIClient } from '../../APIClient';
import { MeshRenderer } from '../../MeshRenderer';

// Mock API calls
jest.mock('../../APIClient');

describe('Morph Pipeline Integration', () => {
  test('changing slider updates mesh via API', async () => {
    const controller = new MorphController();
    const apiClient = new APIClient('http://localhost:3020');
    const renderer = new MeshRenderer();

    // Mock API response
    apiClient.applyMorphs.mockResolvedValue({
      vertices: [[0,0,0], [1,0,0], [0,1,0]],
      faces: [[0,1,2]],
      normals: [[0,0,1], [0,0,1], [0,0,1]]
    });

    // Change morph
    controller.setMorph('age', 0.8);

    // Apply via API
    const morphData = controller.getMorphs();
    const mesh = await apiClient.applyMorphs(morphData);

    // Update renderer
    renderer.updateMesh(mesh);

    // Verify API was called correctly
    expect(apiClient.applyMorphs).toHaveBeenCalledWith({
      age: 0.8,
      gender: 0.5,
      weight: 0.5,
      height: 0.5,
      muscle: 0.5
    });

    // Verify mesh updated
    expect(renderer.getVertexCount()).toBe(3);
  });
});
```

### E2E Tests (Playwright)

```javascript
// tests/e2e/character-creation.spec.js

const { test, expect } = require('@playwright/test');

test.describe('Character Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('loads with default character', async ({ page }) => {
    // Wait for 3D canvas to load
    await page.waitForSelector('canvas');

    // Verify canvas is rendered
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Check that default morphs are visible
    const ageSlider = page.locator('#morph-age');
    await expect(ageSlider).toHaveValue('0.5');
  });

  test('adjusting slider updates character', async ({ page }) => {
    // Find age slider
    const ageSlider = page.locator('#morph-age');
    const ageValue = page.locator('#morph-age-value');

    // Change slider value
    await ageSlider.fill('0.8');

    // Verify display updated
    await expect(ageValue).toHaveText('0.80');

    // Wait for API call to complete (debounced)
    await page.waitForTimeout(500);

    // Verify no errors in console
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));

    const errors = logs.filter(log => log.includes('error'));
    expect(errors.length).toBe(0);
  });

  test('preset buttons apply correct values', async ({ page }) => {
    // Click "Young Male" preset
    await page.click('button:text("Young Male")');

    // Wait for morphs to apply
    await page.waitForTimeout(500);

    // Verify slider values
    await expect(page.locator('#morph-age')).toHaveValue('0.2');
    await expect(page.locator('#morph-gender')).toHaveValue('1.0');
    await expect(page.locator('#morph-weight')).toHaveValue('0.5');
  });

  test('export button generates GLB file', async ({ page }) => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Click export button
    await page.click('button:text("Export GLB")');

    // Wait for download
    const download = await downloadPromise;

    // Verify filename
    expect(download.suggestedFilename()).toMatch(/character.*\.glb$/);

    // Verify file size (should be several MB)
    const path = await download.path();
    const fs = require('fs');
    const stats = fs.statSync(path);
    expect(stats.size).toBeGreaterThan(100000);  // > 100KB
  });

  test('handles API errors gracefully', async ({ page }) => {
    // Intercept API call and return error
    await page.route('**/api/morph/apply', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ detail: 'Internal server error' })
      });
    });

    // Try to change morph
    await page.locator('#morph-age').fill('0.8');
    await page.waitForTimeout(500);

    // Verify error message displayed
    const errorMsg = page.locator('.error-message');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText('error');
  });
});
```

---

## Performance Testing

### Benchmarking

```python
# tests/benchmark_morph.py

import time
import numpy as np
from api.engine.morph_engine import MorphEngine

def benchmark_single_morph(iterations=100):
    """Benchmark single morph application"""
    engine = MorphEngine()
    mesh = load_full_base_mesh()
    target = load_target("macros/age")

    times = []
    for _ in range(iterations):
        start = time.perf_counter()
        result = engine.apply_morph(mesh, target, 0.5)
        elapsed = time.perf_counter() - start
        times.append(elapsed)

    times = np.array(times)
    print(f"Single Morph Performance:")
    print(f"  Mean: {times.mean()*1000:.2f}ms")
    print(f"  Median: {np.median(times)*1000:.2f}ms")
    print(f"  95th percentile: {np.percentile(times, 95)*1000:.2f}ms")
    print(f"  Max: {times.max()*1000:.2f}ms")

    assert times.mean() < 0.5, f"Average too slow: {times.mean():.3f}s"

def benchmark_multi_morph(iterations=100):
    """Benchmark multiple morph application"""
    engine = MorphEngine()
    mesh = load_full_base_mesh()
    targets = [
        ("macros/age", 0.5),
        ("macros/gender", 0.3),
        ("macros/weight", 0.7),
        ("macros/height", 0.4),
        ("macros/muscle", 0.6)
    ]

    times = []
    for _ in range(iterations):
        start = time.perf_counter()
        result = engine.apply_multiple_morphs(mesh, targets)
        elapsed = time.perf_counter() - start
        times.append(elapsed)

    times = np.array(times)
    print(f"Multi Morph Performance (5 targets):")
    print(f"  Mean: {times.mean()*1000:.2f}ms")
    print(f"  95th percentile: {np.percentile(times, 95)*1000:.2f}ms")

    assert times.mean() < 1.0, f"Average too slow: {times.mean():.3f}s"

if __name__ == "__main__":
    benchmark_single_morph()
    benchmark_multi_morph()
```

### Load Testing

```bash
# Use Apache Bench to test API under load
ab -n 1000 -c 10 -T 'application/json' -p morph_payload.json \
   http://localhost:3020/api/morph/apply

# Expected results:
# - Requests per second: > 50
# - 95th percentile latency: < 500ms
# - Failed requests: 0
```

---

## Manual Testing Checklist

### Sprint 0 Checklist

- [ ] **Dev Environment**
  - [ ] Python venv activates
  - [ ] All dependencies install
  - [ ] Backend server starts
  - [ ] Frontend dev server starts
  - [ ] No console errors on startup

- [ ] **Base Mesh**
  - [ ] Base mesh JSON file exists
  - [ ] Loads in Three.js
  - [ ] Renders as recognizable human
  - [ ] No missing faces/holes

- [ ] **First Morph**
  - [ ] Slider moves smoothly
  - [ ] Character visibly changes
  - [ ] No lag or stutter
  - [ ] Works on Firefox, Chrome, Safari

### Visual Quality Checks

Always verify:
- [ ] Lighting looks natural (not too dark/bright)
- [ ] No z-fighting or polygon tearing
- [ ] Textures not stretched or distorted
- [ ] Silhouette looks human (not deformed)
- [ ] Camera controls smooth (orbit, pan, zoom)

---

## Continuous Integration

### GitHub Actions (Future)

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install -r backend/requirements.txt
      - run: pytest --cov --cov-report=xml
      - uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test -- --coverage

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: docker-compose up -d
      - run: npx playwright test
```

---

## Test Data Management

### Fixtures Location
```
tests/
├── fixtures/
│   ├── meshes/
│   │   ├── test_mesh_simple.json     # 10 vertices
│   │   ├── test_mesh_medium.json     # 1000 vertices
│   │   └── base_mesh_full.json       # 13k vertices
│   ├── targets/
│   │   ├── test_age.json
│   │   └── test_weight.json
│   └── textures/
│       └── test_skin.png
└── conftest.py  # Pytest fixtures
```

### Generating Test Data

```python
# tests/generate_test_fixtures.py

def generate_simple_mesh():
    """Create minimal test mesh (triangle)"""
    return {
        "vertices": [[0,0,0], [1,0,0], [0,1,0]],
        "faces": [[0,1,2]],
        "uvs": [[0,0], [1,0], [0,1]],
        "normals": [[0,0,1], [0,0,1], [0,0,1]]
    }

def generate_test_target():
    """Create minimal morph target"""
    return {
        "name": "test-morph",
        "deltas": {
            0: [0.1, 0.0, 0.0],
            1: [0.0, 0.1, 0.0]
        }
    }
```

---

## Debugging Failed Tests

### Common Issues

**Issue:** Test passes locally, fails in CI
- **Cause:** Different Python/Node versions
- **Fix:** Use exact versions in CI (pin in requirements.txt)

**Issue:** Intermittent failures
- **Cause:** Race condition or network timeout
- **Fix:** Add proper waits, mock network calls

**Issue:** "Import error" in tests
- **Cause:** PYTHONPATH not set correctly
- **Fix:** Run from project root, or add `__init__.py` files

### Debug Pytest

```bash
# Run with verbose output and stop on first failure
pytest -vx

# Run with print statements visible
pytest -s

# Run with debugger on failure
pytest --pdb

# Run specific test with full traceback
pytest tests/test_file.py::test_name -vv
```

---

## Test Maintenance

### When to Update Tests

- ✅ **Feature added** → Add tests for new feature
- ✅ **Bug fixed** → Add test that would have caught bug
- ✅ **Refactored code** → Ensure tests still pass
- ✅ **API changed** → Update integration tests
- ✅ **Performance regression** → Add benchmark test

### Test Review Checklist

Before merging code, verify:
- [ ] All tests pass locally
- [ ] All tests pass in CI
- [ ] Coverage hasn't decreased
- [ ] New features have tests
- [ ] Tests are not flaky (run 3 times)
- [ ] Test names clearly describe what they test

---

**Bottom Line:** If Codex writes code without tests, send it back! No untested code lands in main. 🛡️
