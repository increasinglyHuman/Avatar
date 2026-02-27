# BlackBox Avatar - Claude Code Instructions

**Repository:** https://github.com/increasinglyHuman/Avatar
**Project:** Web-based avatar customization tool for poqpoq World
**Stack:** Babylon.js, TypeScript, Vite

---

## Key Context

- This repo was reinitalized Feb 2026 (previous CharacterStudio fork archived)
- Building on Babylon.js (NOT Three.js), following the Glitch repo architecture
- Reference codebase: `/home/p0qp0q/blackbox/glitch/`
- Preserved assets and research: `/home/p0qp0q/blackbox/avatar-preserved/`

## Architecture Documents

- `docs/adr/` — 6 Architecture Decision Records
- `docs/TECHNICAL_SPEC_PHASE1.md` — Phase 1 (VRM) specification
- `docs/research/SL_APPEARANCE_OUTFITS_RESEARCH.md` — Phoenix Viewer UI research

## Deployment

- Production: https://poqpoq.com/avatar/
- Server: poqpoq.com, SSH via `~/.ssh/poqpoq-new.pem`
- Apache Alias: /avatar → /var/www/avatar

## Git Workflow

- Main branch: `main`
- Use conventional commits (feat/fix/docs/refactor)
- Remote: https://github.com/increasinglyHuman/Avatar.git
