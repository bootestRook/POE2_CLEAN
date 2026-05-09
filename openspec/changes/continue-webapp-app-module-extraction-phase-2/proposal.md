## Why

`webapp/App.tsx` is still roughly ten thousand lines after the previous extraction passes, and the remaining low-risk seams are now clearer. A follow-up plan is needed so the next work can continue reducing the monolith without drifting into gameplay runtime, skill event generation, backend coupling, or UI redesign.

## What Changes

- Continue decomposing `webapp/App.tsx` through client-only, behavior-preserving extraction groups.
- Prioritize deterministic frontend loot/drop state helpers, skill-board support preview hooks, battle render presentation helpers, and remaining small display/type utilities before any runtime orchestration work.
- Keep App-owned state, refs, event handlers, save ownership, storage keys, gameplay runtime calls, text, class names, DOM order, and rendering order unchanged.
- Treat monster AI, damage application, projectile lifecycle, skill event generation/consumption, map progression, pickup orchestration, and GameApp state flow as out of scope for this change.
- Preserve the project `run.bat` WebApp verification flow, including actual playable-view screenshot evidence stored under `artifacts/screenshots/`.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `webapp-app-module-extraction`: Adds the next safe extraction targets, sequencing, and verification expectations for continuing the App monolith reduction.

## Impact

- Affected code areas: `webapp/App.tsx`, focused modules under `webapp/state/`, `webapp/components/inventory/`, `webapp/components/skill-board/`, `webapp/components/battle/`, `webapp/components/tooltips/`, and `webapp/utils/` where needed.
- Affected tests/checks: `npm run build`, `npm test`, `run.bat --check`, and actual WebApp browser screenshot verification.
- No backend/API/server runtime, package dependency, save schema, gameplay balance, CSS redesign, copy edit, skill-editor route, or skill-editor verification changes are intended.
