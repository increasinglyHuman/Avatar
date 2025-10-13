# BlackBox Avatar - Codex Kickoff Prompt

**Date:** October 13, 2025
**Project:** BlackBox Avatar (Web-based character creator)
**Repository:** https://github.com/increasinglyHuman/Avatar
**Your Role:** Engineering Lead implementing Sprint 0-8

---

## 🎯 Your Mission

Build a simplified, web-based human character creator derived from MakeHuman. This tool will integrate with the poqpoq ecosystem (Animator, Skinner, /world) and enable users to create customizable avatars with body morphing, facial features, materials, and export to GLB format.

**Key Requirement:** Follow the sprint plan meticulously. No shortcuts, no skipping tests, no ambiguous deliverables.

---

## 📚 Required Reading (Do This First!)

Read these documents **in order** before writing any code:

### 1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical design (30 min)
   - MakeHuman analysis and learnings
   - System architecture and data flow
   - Material system strategy
   - Integration points with /world

### 2. **[SPRINT_PLAN.md](./SPRINT_PLAN.md)** - Your task breakdown (45 min)
   - 8 sprints with detailed tasks
   - Acceptance criteria for every feature
   - Testing requirements per task
   - Performance benchmarks
   - Definition of Done checklist

### 3. **[TESTING_GUIDE.md](./TESTING_GUIDE.md)** - Testing standards (30 min)
   - Unit test requirements (80%+ backend, 70%+ frontend)
   - Integration test patterns
   - E2E test examples
   - Performance benchmarking

### 4. **[docs/deployment/DEPLOYMENT_GUIDE.md](./docs/deployment/DEPLOYMENT_GUIDE.md)** - Production deployment (20 min)
   - Server: poqpoq.com (shared with other BlackBox tools)
   - Port 3030 allocated for Avatar API
   - Apache reverse proxy configuration
   - PM2 process management

### 5. **[docs/deployment/GOOD_NEIGHBOR_POLICY_API_ARCHITECTURE_v2_2025-08-31.md](./docs/deployment/GOOD_NEIGHBOR_POLICY_API_ARCHITECTURE_v2_2025-08-31.md)** - Shared server rules (15 min)
   - **CRITICAL:** This is a shared production server
   - Port allocation matrix
   - Service boundaries
   - How to be a good neighbor

### 6. **[UI_DESIGN_SYSTEM.md](./UI_DESIGN_SYSTEM.md)** - BlackBox visual style (15 min)
   - Dark theme color palette
   - Typography (Montserrat Black 900)
   - Button styles and interactions
   - Layout patterns

### 7. **[CLAUDE.md](./.claude/CLAUDE.md)** - Repo-specific workflows (10 min)
   - GitHub CLI usage (issues, PRs)
   - Commit message format
   - Branch naming conventions
   - Communication protocols

**Total Reading Time:** ~2.5 hours

---

## 🚀 Getting Started - First Steps

### Step 1: Verify You Have Access

```bash
# Verify you're in the right repo
pwd
# Expected: /home/p0qp0q/blackbox/BlackBoxAvatar

# Check GitHub remote
git remote -v
# Expected: https://github.com/increasinglyHuman/Avatar.git

# Verify gh CLI is configured
gh auth status
# Should show: Logged in to github.com
```

### Step 2: Review Existing Work

```bash
# Check current branch
git branch
# Should be on: main

# Review commit history
git log --oneline
# Should see 3 commits:
#   - Initial commit (architecture)
#   - Sprint plan + testing guide
#   - Deployment + database docs

# Check what files exist
ls -la
# Key files: README.md, ARCHITECTURE.md, SPRINT_PLAN.md, etc.
```

### Step 3: Create Sprint 0 Branch

```bash
# Create feature branch
git checkout -b feature/sprint-0-setup

# Verify branch
git branch --show-current
# Expected: feature/sprint-0-setup
```

---

## 📋 Your Immediate Tasks

### Sprint 0: Project Setup & Asset Extraction (Week 1-2)

**Goal:** Set up dev environment, extract MakeHuman assets, verify toolchain works

**Tasks:**
1. **Task 0.1:** Development Environment Setup (Python 3.11+, FastAPI)
2. **Task 0.2:** Frontend Environment Setup (Vite, Three.js)
3. **Task 0.3:** Extract MakeHuman Base Mesh
4. **Task 0.4:** Extract Core Morph Targets (age, gender, weight, height, muscle)
5. **Task 0.5:** Hello World - First Morph (slider controls one morph)

**See [SPRINT_PLAN.md](./SPRINT_PLAN.md) for detailed task specifications.**

---

## 🔧 GitHub CLI Workflows

### Creating Issues for Tasks

```bash
# Create issue for Task 0.1
gh issue create \
  --title "Sprint 0 - Task 0.1: Development Environment Setup" \
  --body "$(cat <<'EOF'
## Task Description
Set up Python backend environment with all dependencies installed and verified working.

## Acceptance Criteria
- [ ] Python 3.11+ virtual environment created
- [ ] All dependencies install without errors
- [ ] FastAPI health endpoint returns 200 OK
- [ ] .env.example contains all required variables
- [ ] README.md updated with setup instructions

## Testing
- [ ] All imports succeed
- [ ] Health check endpoint works

## Sprint
Sprint 0 - Week 1

## References
- SPRINT_PLAN.md lines 31-95
EOF
)" \
  --label "sprint-0,enhancement,p0-blocker" \
  --assignee @me

# List all issues
gh issue list

# View issue details
gh issue view 1
```

### Working on Issues

```bash
# Create branch for issue #1
git checkout -b feature/sprint0-task-0.1

# When task is complete, create PR
gh pr create \
  --title "Sprint 0 Task 0.1: Development Environment Setup" \
  --body "Closes #1

## Changes
- Created Python 3.11 venv
- Installed all dependencies (FastAPI, numpy, etc.)
- Health endpoint at /health
- .env.example with documentation

## Testing
- [x] All imports successful
- [x] Health check returns 200 OK
- [x] README.md updated

## Artifacts
- backend/requirements.txt
- backend/.env.example
- backend/api/main.py" \
  --label "sprint-0"

# Merge PR after review
gh pr merge 1 --squash
```

### Tracking Progress

```bash
# Create milestone for Sprint 0
gh api repos/:owner/:repo/milestones \
  --method POST \
  --field title="Sprint 0: Setup & Assets" \
  --field description="Project setup and MakeHuman asset extraction" \
  --field due_on="2025-10-27T00:00:00Z"

# Add issue to milestone
gh issue edit 1 --milestone "Sprint 0: Setup & Assets"

# View milestone progress
gh api repos/:owner/:repo/milestones/1 | jq '.open_issues, .closed_issues'
```

---

## ✅ Task Completion Format

For every completed task, create a completion report in this format:

```markdown
## Task 0.1 Complete: Development Environment Setup

**Status:** ✅ DONE
**Time:** 3.5 hours (estimate was 4h)
**Branch:** feature/sprint0-task-0.1
**PR:** #2
**Closes:** #1

### Completed Checklist
- [x] Python 3.11 venv created
- [x] All dependencies installed without errors
- [x] FastAPI health endpoint works
- [x] .env.example created with documentation
- [x] README.md updated with setup instructions

### Tests Passing
\`\`\`bash
$ pytest tests/test_environment.py
============== 5 passed in 0.23s ==============

$ curl http://localhost:3020/health
{"status":"healthy","python":"3.11.6","service":"avatar-api"}
\`\`\`

### Artifacts Created
- `backend/requirements.txt` - All Python dependencies
- `backend/.env.example` - Environment variable template
- `backend/api/main.py` - FastAPI app with health endpoint
- `tests/test_environment.py` - Environment validation tests
- Updated `README.md` - Setup instructions

### Issues Encountered
None - setup was smooth

### Next Task
Starting Task 0.2 (Frontend Environment Setup)

### Time Tracking
- Planned: 4h
- Actual: 3.5h
- Variance: -0.5h (under estimate)
```

**Post this report:**
1. As a comment on the GitHub issue
2. In project documentation: `docs/sprints/sprint-0-progress.md`

---

## 🎨 UI Design Requirements

### Color Palette (BlackBox Dark Theme)

```css
/* Background colors */
--bg-primary: #1a1a1a;      /* Main background */
--bg-secondary: #2a2a2a;    /* Header/panels */
--bg-tertiary: #3a3a3a;     /* Buttons/inputs */
--bg-divider: #333333;      /* Grid gaps */

/* Text colors */
--text-primary: #e0e0e0;    /* Main text */
--text-secondary: #aaaaaa;  /* Labels */
--text-disabled: #666666;   /* Disabled state */

/* Accent colors (choose one for Avatar product) */
--accent-animator: #ff00ff;     /* Magenta (taken by Animator) */
--accent-skinner: #00ffff;      /* Cyan (taken by Skinner) */
--accent-terraformer: #ff8800;  /* Orange (taken by Terraformer) */
--accent-worlds: #00ff00;       /* Green (taken by Worlds) */
--accent-avatar: #9900ff;       /* Purple (AVAILABLE - use this!) */

/* Functional colors */
--border-default: #555555;
--border-hover: #666666;
--border-active: #0066cc;

/* Status colors */
--success: #00cc66;
--warning: #ffaa00;
--error: #ff3333;
--info: #0099ff;
```

### Typography

```css
/* Header (product name) */
font-family: "Montserrat", sans-serif;
font-weight: 900;  /* Black */
font-size: 20px;
text-transform: uppercase;
letter-spacing: -0.02em;

/* Product name accent */
.product-name {
  color: #9900ff;  /* Purple for Avatar */
  text-shadow: 0 0 8px rgba(153, 0, 255, 0.5);
}

/* Body text */
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
font-size: 14px;
line-height: 1.5;

/* Labels */
font-size: 12px;
text-transform: uppercase;
letter-spacing: 0.05em;
color: #aaaaaa;
```

### Button Styles

```css
/* Default button */
button {
  padding: 6px 16px;
  background: #3a3a3a;
  color: #e0e0e0;
  border: 1px solid #555;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

button:hover {
  background: #4a4a4a;
  border-color: #666;
}

/* Primary button (main actions) */
button.primary {
  background: #0066cc;
  border-color: #0066cc;
}

button.primary:hover {
  background: #0077dd;
}

/* Accent button (product-specific) */
button.accent {
  background: #9900ff;  /* Avatar purple */
  border-color: #9900ff;
}

button.accent:hover {
  background: #aa11ff;
}
```

**See [UI_DESIGN_SYSTEM.md](./UI_DESIGN_SYSTEM.md) for complete design system.**

---

## 🔐 Security & Best Practices

### Environment Variables

**NEVER commit:**
- API keys
- Database passwords
- JWT secrets
- AWS credentials

**Always use:**
- `.env` file (gitignored)
- `.env.example` (committed, with dummy values)

### Code Quality

**Before committing:**
```bash
# Python
black backend/api/  # Format code
flake8 backend/api/ # Lint code
pytest --cov       # Run tests with coverage

# JavaScript
npm run lint       # ESLint
npm run format     # Prettier
npm test          # Jest tests
```

### Git Commit Messages

```
feat: Add morph slider UI component
fix: Correct normal recalculation after morphing
docs: Update API endpoint documentation
test: Add unit tests for morph engine
refactor: Extract mesh loading to separate module
perf: Optimize vertex buffer updates
style: Format code with Black
chore: Update dependencies
```

**Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

---

## 🆘 When You Need Help

### If Requirements Are Unclear

1. **Check Documentation First**
   - SPRINT_PLAN.md has detailed task specs
   - ARCHITECTURE.md has design decisions
   - TESTING_GUIDE.md has test requirements

2. **Search GitHub Issues**
   ```bash
   gh issue list --label "question"
   ```

3. **Create a Question Issue**
   ```bash
   gh issue create \
     --title "Question: Unclear requirement for Task 0.3" \
     --body "I'm unclear about..." \
     --label "question"
   ```

### If You Encounter Blockers

1. **Document the Blocker**
   - What were you trying to do?
   - What went wrong?
   - What have you tried?

2. **Create a Blocker Issue**
   ```bash
   gh issue create \
     --title "Blocker: MakeHuman assets download fails with SSL error" \
     --body "$(cat <<'EOF'
## Problem
Download script fails with SSL certificate error

## Impact
Cannot proceed with Task 0.3 (base mesh extraction)

## Attempted Solutions
- Tried alternative download method
- Checked SSL certificates
- Verified network connectivity

## Needed
- Alternative download URL
- Or: Manual asset transfer
EOF
)" \
     --label "blocker,sprint-0" \
     --assignee @me
   ```

3. **Flag to Allen**
   - Comment on the blocker issue
   - Tag Allen if critical path

### If Performance Benchmarks Fail

**Example:** Morph engine takes 1.5 seconds (requirement: < 1.0 second)

1. **Profile the code**
   ```python
   import cProfile
   cProfile.run('apply_morph(mesh, target, 0.5)')
   ```

2. **Document findings**
   - Where is the bottleneck?
   - What percentage of time is spent where?

3. **Optimize incrementally**
   - Fix biggest bottleneck first
   - Re-test after each change
   - Document improvements

4. **Update task notes**
   - "Initial implementation: 1.5s"
   - "Optimized numpy operations: 0.8s"
   - "Benchmark PASSED"

---

## 📊 Progress Tracking

### Daily Standup (Async)

Post in project discussion (or create standup.md):

```markdown
## Standup - October 14, 2025

**Yesterday:**
- Completed Task 0.1 (Dev Environment Setup)
- Started Task 0.2 (Frontend Environment Setup)

**Today:**
- Finish Task 0.2 (Frontend Environment)
- Start Task 0.3 (Extract Base Mesh)

**Blockers:**
- None

**Notes:**
- Python 3.11 venv working great
- Three.js renders test cube successfully
- On track for Sprint 0 completion
```

### Sprint Burndown

Update `docs/sprints/sprint-0-burndown.csv`:

```csv
Date,Remaining_Tasks,Remaining_Hours
2025-10-13,5,26
2025-10-14,4,22
2025-10-15,4,18
...
```

### Sprint Retrospective (End of Sprint)

Create `docs/sprints/sprint-0-retro.md`:

```markdown
# Sprint 0 Retrospective

**Dates:** Oct 13-27, 2025
**Goal:** Set up development environment and extract MakeHuman assets

## What Went Well
- Clear task specifications made implementation straightforward
- Testing requirements caught issues early
- Documentation was comprehensive

## What Could Be Improved
- Underestimated time for asset extraction (8h → 12h)
- Should have profiled performance earlier

## Action Items for Sprint 1
- [ ] Add more intermediate performance checks
- [ ] Create asset extraction automation script
- [ ] Set up CI/CD for automated testing

## Metrics
- Tasks Completed: 5/5
- Tests Written: 47
- Test Coverage: Backend 84%, Frontend 72%
- Performance: All benchmarks passed
```

---

## 🎯 Success Criteria

### You're On Track If:
- ✅ Every task has passing tests
- ✅ Code coverage meets minimums (80%/70%)
- ✅ Performance benchmarks pass
- ✅ Documentation is updated
- ✅ Git commits are clean and descriptive
- ✅ No shortcuts taken

### You're Off Track If:
- ❌ Tests are failing
- ❌ Coverage is below minimums
- ❌ Performance benchmarks fail
- ❌ Documentation is outdated
- ❌ Code is not committed
- ❌ Blockers are unresolved

---

## 🚀 Final Checklist Before Starting

- [ ] Read all required documentation (2.5 hours)
- [ ] Verify GitHub CLI is configured (`gh auth status`)
- [ ] Create Sprint 0 branch (`git checkout -b feature/sprint-0-setup`)
- [ ] Create GitHub milestone for Sprint 0
- [ ] Create issue for Task 0.1
- [ ] Review UI design system
- [ ] Understand Good Neighbor Policy (shared server)
- [ ] Bookmark SPRINT_PLAN.md and TESTING_GUIDE.md

---

## 💬 Communication

**For Allen:**
- Tag in GitHub issues for urgent questions
- Create discussion for design decisions
- Weekly sprint review (async or sync)

**For Claude Code (your assistant):**
- Use for code review
- Use for debugging assistance
- Use for documentation updates

**For Future Developers:**
- Document decisions in DECISIONS.md
- Update README.md as features are added
- Keep ARCHITECTURE.md current

---

## 🎉 Let's Build This!

You have everything you need:
- ✅ Clear architecture
- ✅ Detailed sprint plan
- ✅ Comprehensive testing requirements
- ✅ Production deployment guide
- ✅ UI design system
- ✅ Workflow guidelines

**Your first task:** Create issue for Task 0.1 and start coding!

```bash
gh issue create \
  --title "Sprint 0 - Task 0.1: Development Environment Setup" \
  --label "sprint-0,p0-blocker" \
  --assignee @me

git checkout -b feature/sprint0-task-0.1

# Read SPRINT_PLAN.md Task 0.1 (lines 31-95)
# Follow acceptance criteria exactly
# Write tests first (TDD)
# Document everything

# Let's go! 🚀
```

---

**Good luck, Codex! This is going to be an awesome character creator.** 🎨✨
