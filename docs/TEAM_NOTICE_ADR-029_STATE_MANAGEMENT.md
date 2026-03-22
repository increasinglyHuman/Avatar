# Team Notice: ADR-029 — Unified Game State Architecture

**Date**: 2026-03-01
**Status**: Phase 1 + Phase 2 DEPLOYED to production
**ADR**: `docs/adr/ADR-029-Unified-Game-State-Architecture.md`

---

## What Changed

Three new singleton state managers now control game mode, camera ownership, and input gating across the entire application. **All teams must use these instead of ad-hoc state checks.**

### 1. GameStateManager (`src/state/GameStateManager.ts`)

Single source of truth for "what is the user doing right now?"

```typescript
import { GameStateManager, GameMode } from '../state/GameStateManager';

const gs = GameStateManager.getInstance();

// Query
gs.getMode();            // → 'exploring', 'combat', 'building', 'paused_ui', etc.
gs.isExploring();        // boolean
gs.isInCombat();         // boolean
gs.isPaused();           // boolean — true when modal/iframe overlay is active
gs.canSimulate();        // false during LOADING or PAUSED_UI
gs.canInteract();        // false during LOADING, PAUSED_UI, CINEMATIC

// Transitions
gs.enterCombat('hostile action');
gs.exitCombat('combat timeout');
gs.enterBuildMode('build panel');
gs.exitBuildMode('exit build');
gs.enterPausedUI('modal open');   // Push/pop — remembers previous mode
gs.exitPausedUI('modal close');   // Restores previous mode

// Listen for changes
const unsub = gs.onModeChange((transition) => {
    console.log(`${transition.from} → ${transition.to} (${transition.reason})`);
});
unsub(); // cleanup
```

**Valid transitions are enforced.** You cannot go from LOADING directly to COMBAT. See the transition matrix in GameStateManager.ts.

### 2. CameraStateManager (`src/state/CameraStateManager.ts`)

Priority-based camera ownership stack. Prevents systems from fighting over the camera.

```typescript
import { CameraStateManager, CameraMode } from '../state/CameraStateManager';

const cs = CameraStateManager.getInstance();

// Query
cs.getCurrentMode();       // → 'follow', 'pix_compose', 'build', etc.
cs.getCurrentOwner();      // → 'pix', 'build', 'hybrid', etc.
cs.isFollowing();          // true when elastic band follow loop is active
cs.shouldFollowLoopRun();  // HybridSLCamera checks this every frame

// Request camera control (returns false if higher-priority mode is active)
cs.requestMode(CameraMode.BUILD, 'my-system');

// Release when done (only the owner can release)
cs.releaseMode('my-system');

// Listen
const unsub = cs.onModeChange((from, to, owner) => { ... });
```

**Priority order** (low → high): FOLLOW(0) → FREE_LOOK(1) → FOCUSED(2) → BUILD/PIX_COMPOSE(3) → PIX_SELFIE(4) → CINEMATIC(5)

A lower-priority system **cannot** interrupt a higher-priority one.

### 3. InputGate (`src/state/InputGate.ts`)

Centralized input queries. **Stop using `document.activeElement` checks.**

```typescript
import { InputGate } from '../state/InputGate';

const ig = InputGate.getInstance();

ig.canAcceptGameInput();      // false if text field focused or paused
ig.canAcceptMovementInput();  // false if text field focused, paused, or cinematic
ig.canAcceptCombatInput();    // false if text field focused, chat visible, or paused
ig.canAcceptUIHotkeys();      // false if text field focused
ig.canForwardSceneEvents();   // false if paused — used by EventForwarder
ig.isTextFieldFocused();      // true if INPUT/TEXTAREA/[contenteditable] has focus
```

---

## What You Need To Do

### All Teams

1. **Do NOT add new `document.activeElement` checks.** Use `InputGate` instead.
2. **Do NOT maintain independent "is paused" or "is in combat" flags.** Query `GameStateManager`.
3. **If your feature opens a modal/iframe overlay**, call:
   ```typescript
   GameStateManager.getInstance().enterPausedUI('your-feature open');
   // ... when closing:
   GameStateManager.getInstance().exitPausedUI('your-feature close');
   ```
   This pauses simulation, blocks input forwarding, and remembers the previous mode.

### Events Team

Your iframe launcher **must** call `enterPausedUI()` / `exitPausedUI()` when opening/closing event iframes. This ensures combat pauses, script events stop forwarding, and the previous game mode is restored on close.

### Scripter (Glitch)

`EventForwarder` now checks `InputGate.canForwardSceneEvents()` before dispatching pointer events to scripts. When `GameMode.PAUSED_UI` is active, no touch/click events reach scripts. This is automatic — no action needed on your side, but be aware that scripts won't receive events during modal overlays.

### Dungeon Master / Combat Teams

Combat state is now tracked globally:
- `CombatStateDetector` calls `GameStateManager.enterCombat()` / `exitCombat()`
- Any system can check `GameStateManager.getInstance().isInCombat()`
- Combat → PAUSED_UI is valid (opening a modal during combat exits combat first)

### Avatar / Animation Teams

Animation state machine decoupling is planned for Phase 3 (not yet implemented). Current `NPCAnimationController` priority system remains unchanged. A future `AnimationStateMachine` will add:
- Generation counter to fix statue bug
- Queue-based blending
- Root motion awareness
- Full independence from NPC brain state

### Build System Teams

Build mode now routes through `CameraStateManager`:
- `requestMode(CameraMode.BUILD, 'build')` when entering build
- `releaseMode('build')` when exiting
- This prevents the follow-camera elastic band from fighting build orbit

---

## Console Debugging

Both managers are exposed on `window` in all environments:

```javascript
// In browser console:
gameState.getMode()           // → 'exploring'
gameState.isInCombat()        // → false
cameraState.getCurrentMode()  // → 'follow'
cameraState.getCurrentOwner() // → 'system'
```

---

## Phases Remaining

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | GameStateManager + InputGate | DEPLOYED |
| 2 | CameraStateManager + Pix/HybridSLCamera integration | DEPLOYED |
| 3 | ModalManager consolidation (iframe overlays) | Planned |
| 4 | AnimationStateMachine (decouple from brain) | Planned |
| 5 | Build state independence | Planned |
| 6 | Mobile/desktop gating | Planned |

---

**Questions?** Read the full ADR at `docs/adr/ADR-029-Unified-Game-State-Architecture.md` or ask in the team channel.
