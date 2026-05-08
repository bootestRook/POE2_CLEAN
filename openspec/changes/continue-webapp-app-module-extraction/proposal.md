## Why

`webapp/App.tsx` is still large after the completed first extraction pass, and safe future UI/runtime work needs another narrow behavior-preserving reduction step. Recent exploration identified low-risk display boundaries that can be moved before touching higher-coupling gameplay runtime ownership.

## What Changes

- Continue decomposing `webapp/App.tsx` through small client-only, behavior-preserving extraction groups.
- Prioritize map/background debug presentation, procedural spawn debug UI, character information display, and skill-board presentation boundaries.
- Keep App-owned state, gameplay runtime refs, save data, storage keys, copy, class names, DOM order, rendering order, and visual behavior unchanged.
- Avoid skill-editor acceptance surfaces and avoid extracting frontend skill runtime generation/consumption in this change.
- Verify each frontend-affecting group with build/test checks and the actual playable WebApp launched through the project `run.bat` flow, with screenshots under `artifacts/screenshots/`.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `webapp-app-module-extraction`: Add the next behavior-preserving extraction targets and verification expectations for map/debug, procedural spawn debug, character panel, and skill-board presentation modules.

## Impact

- Affected frontend areas: `webapp/App.tsx`, new or existing focused modules under `webapp/components/battle/`, `webapp/components/character/`, `webapp/components/skill-board/`, and thin shared type/helper modules if needed.
- No backend, API, server runtime, dependency, save schema, gameplay balance, skill runtime behavior, or CSS redesign changes are intended.
- Verification impact: each visible extraction requires `npm run build`, relevant focused checks/tests, actual playable WebApp browser verification through the `run.bat` flow, and screenshots stored outside the repository root.
