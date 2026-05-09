## Why

`webapp/App.tsx` remains very large after several successful extraction passes, and the remaining file still mixes UI shell overlays, client save/state helpers, stash ownership logic, smoke-test assumptions, and gameplay runtime orchestration. The next safe reduction should target behavior-preserving client UI/state boundaries before attempting higher-risk combat or skill runtime extraction.

## What Changes

- Extract remaining lightweight App-owned UI shell sections into focused client-side presentation modules, including monster-test controls, pause/failure/portal overlays, help text, debug toggles, spawn warnings, and combat feed display where they can move through props only.
- Extract client-only App state, save payload, starter state, stash normalization, and related pure helper boundaries into focused modules while preserving storage keys, save payload shape, migration behavior, item ownership rules, and recalculation order.
- Update WebApp smoke checks so behavior assertions follow the extracted source modules instead of requiring every protected function body to remain in `webapp/App.tsx`.
- Keep `GameApp` orchestration, React state ownership, runtime refs, battle loop mutation, skill event consumption, monster AI, projectile targeting, damage application, and map-run progression in `webapp/App.tsx` during this change.
- Preserve all user-visible behavior: no copy changes, CSS redesign, DOM-order changes, save schema changes, dependency changes, backend/API coupling, or skill-editor acceptance paths.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `webapp-app-module-extraction`: Adds the next behavior-preserving extraction batch for UI shell modules, client state/save/stash helper modules, and smoke-test source-boundary updates.

## Impact

- Affected frontend areas: `webapp/App.tsx`, focused modules under `webapp/components/`, likely new client-only modules under `webapp/state/` or `webapp/utils/`, existing inventory/stash helper modules, and `webapp/smoke-test.mjs`.
- Verification impact: `npm run build`, `npm test`, focused source-boundary checks, actual playable WebApp verification through the project `run.bat` flow, and screenshots stored under `artifacts/screenshots/`.
- No backend, API, server runtime, dependency, save schema, gameplay balance, combat runtime behavior, skill runtime behavior, CSS redesign, copy change, or skill-editor verification is intended.
