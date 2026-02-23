# BlackBox Avatar

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-increasinglyHuman-purple)](https://github.com/increasinglyHuman/Avatar)

**Web-Based VRM Avatar Creator for poqpoq Worlds**

Part of the [BlackBox Creative Suite](https://poqpoq.com) - Professional browser-based 3D tools.

> **Based on:** [CharacterStudio](https://github.com/M3-org/CharacterStudio) by M3-org (MIT Licensed)

---

## BlackBox Creative Suite

BlackBox Avatar joins the other professional web tools in the suite:

- **[Legacy](https://poqpoq.com/legacy/)** - OpenSim OAR to GLB converter
- **[Animator](https://poqpoq.com/animator/)** - GLB animation editor with IK system
- **[Skinner](https://poqpoq.com/skinner/)** - Vertex weight painting tool
- **[Terraformer](https://poqpoq.com/terraformer/)** - Terrain editor for virtual worlds
- **[Landscaper](https://github.com/increasinglyHuman/Landscaper)** - Procedural world population
- **[World](https://poqpoq.com/world/)** - AI-first metaverse platform

All tools are browser-based, work with GLB files, and integrate seamlessly.

---

## Quick Start for poqpoq Worlds Alpha

**Alpha Testing Flow (3 Simple Options):**

1. **Upload Your VRM** - Bring your own VRoid/VTuber avatar
2. **Default Avatar A** - Female preset
3. **Default Avatar B** - Male preset

**For Developers:**

> Note: You need loot-assets imported to public folder for this to work! https://github.com/m3-org/loot-assets

```bash
# Clone the repo and change directory into it
git clone https://github.com/M3-org/CharacterStudio
cd CharacterStudio

# Install dependencies with legacy peer deps flag to ignore React errors
npm install
npm run dev

# Install default assets
npm run get-assets
```

---

## Load Your Assets

We separate the program from the asset packs. We have some sample assets here: https://github.com/memelotsqui/character-assets
![Screenshot from 2023-10-17 17-10-38](https://github.com/M3-org/CharacterStudio/assets/32600939/23768dc3-b834-4f70-a986-a4a0141c4014)

Refer to docs to add your own 3d models

## Features
- **Personalized Creation**: Point and click to build 3D characters
    - Drag and drop local 3D files (VRM) and textures
    - Color picker for adding a personal touch
    - Export creatoins as glb and VRM + screenshots
- **Dynamic animation**: Variety of programmable animations
- **Effortless Optimization** One-click VRM optimizer
    - Merge skinned meshes + Texture atlassing
        - Can reduce avatars to a single draw call!
- **Batch Export**: Randomize or adhere to metadata schemas
- **Transparent Development**: Open-source MIT licensed codebase
- **Robust Rendering**: Using Three.js, WebGL, and React
    - Recently refactored to NOT need React as a dependency
    - Logic is now all inside `CharacterManager` class
- **Face auto culling**: Automatically cull undereneath faces with custom layer system

---

## Special Thanks

Shoutout to [original repo by Webaverse](https://github.com/webaverse/characterstudio)

Thanks m00n, memelotsqui, boomboxhead, jin, and many others for contributing
