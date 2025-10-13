# BlackBox Avatar

**Web-based human character creator for the poqpoq ecosystem**

![BLACK BOX](https://img.shields.io/badge/BLACK%20BOX-Avatar-purple)
![License](https://img.shields.io/badge/license-AGPL--3.0-blue)
![Assets](https://img.shields.io/badge/assets-CC0-green)

---

## Overview

BlackBox Avatar is a simplified, web-based character creation tool derived from [MakeHuman](https://github.com/makehumancommunity/makehuman). It provides an intuitive interface for creating customizable human avatars optimized for web-based 3D environments.

**Part of the BlackBox Creative Suite:**
- [BlackBox Animator](https://github.com/increasinglyHuman/blackBoxIKStudio) - GLB animation editor with IK
- [BlackBox Skinner](https://github.com/increasinglyHuman/BlackBoxWeightPainter) - Vertex weight painter
- [BlackBox Terraformer](https://github.com/increasinglyHuman/BLACKBOXWORLDS) - Terrain editor
- **BlackBox Avatar** (this) - Character creator

---

## Features

### Current (MVP - In Development)
- 🎨 **Body Morphing** - Age, gender, weight, height, muscle control
- 👤 **Face Customization** - Eyes, nose, mouth, chin, and more
- 🎭 **Material System** - Skin tones, eye colors, basic textures
- 📦 **GLB Export** - Optimized for Three.js and Babylon.js
- 🖼️ **Iframe-friendly** - Embeddable in games and applications

### Planned
- 👕 Clothing and accessories
- 💇 Hair styles and colors
- 🎨 Advanced material editor (SSS, tattoos, makeup)
- 📤 FBX export for game engines
- 🎬 Integration with Voice Ninja
- 💾 Character presets and save system

---

## Technology Stack

**Backend:**
- Python 3.10+ with FastAPI
- Morphing engine based on MakeHuman
- GLB export via pygltflib
- RESTful API

**Frontend:**
- Three.js for 3D rendering
- Vanilla JS/Web Components
- Modern ES6+ JavaScript

**Assets:**
- Base mesh and morph targets from MakeHuman (CC0 license)
- High-quality human topology optimized for rigging

---

## Quick Start

### Prerequisites
- Python 3.10 or higher
- Node.js 18+ (for frontend dev server)
- Git with LFS support

### Installation

```bash
# Clone the repository
git clone https://github.com/increasinglyHuman/Avatar.git
cd Avatar

# Set up Python backend
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Download MakeHuman assets
python scripts/download_assets.py

# Run backend API
uvicorn api.main:app --reload --port 3020

# In a new terminal, set up frontend
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to use the character creator.

---

## Project Structure

```
blackbox-avatar/
├── frontend/           # Web UI (Three.js)
├── backend/            # Python API (FastAPI)
├── assets/             # MakeHuman base mesh & targets (CC0)
├── docs/               # Documentation
├── scripts/            # Utility scripts
└── makehuman-reference/ # Reference clone (not deployed)
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed technical documentation.

---

## API Usage

### Apply Morph Targets

```bash
POST /api/morph/apply
Content-Type: application/json

{
  "baseModel": "hm08",
  "targets": [
    {"name": "macros/age", "weight": 0.5},
    {"name": "macros/gender", "weight": 0.0},
    {"name": "macros/weight", "weight": 0.3}
  ],
  "returnFormat": "json"
}
```

### Export Character

```bash
POST /api/export/glb
Content-Type: application/json

{
  "morphData": {...},
  "materials": {...},
  "skeleton": "game"
}

Response: character.glb (binary)
```

See [API.md](./docs/API.md) for complete API documentation.

---

## Integration

### Embedding in Your Application

```html
<iframe
  src="https://poqpoq.com/avatar/"
  width="100%"
  height="600px"
  id="avatar-creator">
</iframe>

<script>
  // Listen for avatar creation
  window.addEventListener('message', (event) => {
    if (event.data.type === 'avatar-created') {
      const glbData = event.data.glbData;
      // Use the avatar in your application
    }
  });
</script>
```

### With poqpoq /world

BlackBox Avatar integrates seamlessly with poqpoq WORLDS for in-game character creation.

### With Voice Ninja

Combine avatar creation with Voice Ninja for fully-voiced, personality-driven characters.

---

## Development Roadmap

- [x] Clone and analyze MakeHuman codebase
- [x] Architecture and technical planning
- [ ] Extract MakeHuman assets (base mesh + targets)
- [ ] Implement Python morph engine
- [ ] Create Three.js viewer
- [ ] Basic body morphing (sliders)
- [ ] GLB export functionality
- [ ] Facial customization
- [ ] Material/texture system
- [ ] Clothing and hair
- [ ] Character presets
- [ ] Save/load system
- [ ] /world integration
- [ ] Advanced material editor

---

## License

**Code:** AGPL-3.0 (as required by MakeHuman derivative works)
**Assets:** CC0 (MakeHuman assets are public domain)

This project is a derivative work of MakeHuman Community. We are grateful to the MakeHuman team for their decade of work on human modeling and their generous CC0 licensing of assets.

### What This Means

- ✅ You can use this tool to create characters for any purpose (commercial or not)
- ✅ Exported characters (GLB files) are completely unrestricted (CC0)
- ✅ You can modify this tool's code, but must release modifications as AGPL-3.0
- ✅ MakeHuman's base mesh and morph targets are public domain (CC0)

See [LICENSE](./LICENSE) for full terms.

---

## Credits

**MakeHuman Team:**
- Original morphing system, base mesh, and assets
- 10+ years of human modeling expertise
- Generous CC0 licensing of core assets

**BlackBox/poqpoq Team:**
- Allen Partridge (p0qp0q) - Architecture and development
- Integration with poqpoq ecosystem

---

## Contributing

We welcome contributions! Areas of interest:
- GLB export optimization
- Material system enhancements
- UI/UX improvements
- Integration with other tools
- Documentation

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## Community

- **Website:** https://poqpoq.com/avatar/
- **GitHub:** https://github.com/increasinglyHuman/Avatar
- **Discord:** [Join poqpoq Community](https://discord.gg/poqpoq) *(link TBD)*
- **MakeHuman:** http://www.makehumancommunity.org/

---

## Acknowledgments

Special thanks to the MakeHuman Community for creating an incredible open-source tool and releasing their assets as CC0. This project would not be possible without their decade of work.

---

**Status:** 🚧 In Active Development
**Version:** 0.1.0-alpha
**Last Updated:** October 13, 2025
