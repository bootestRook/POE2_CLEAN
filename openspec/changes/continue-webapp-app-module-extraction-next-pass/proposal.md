## Why

`webapp/App.tsx` is smaller than before but still mixes presentation helpers, inventory/tooltip view-model code, battle guide overlays, and legacy VFX display helpers with the playable `GameApp` runtime. The next pass should keep reducing edit risk while the previous extraction boundaries are still fresh and verifiable.

## What Changes

- Continue behavior-preserving extraction from `webapp/App.tsx` into focused client-side modules.
- Prioritize low-risk presentation and pure helper boundaries: tooltip normalization/display helpers, inventory/equipment presentation helpers, battle guide/debug overlays, and remaining legacy VFX display helpers.
- Add thin shared type modules only when they prevent extracted modules from importing `App.tsx`.
- Keep App-owned runtime state, refs, save orchestration, skill event consumption, damage, targeting, projectile timing, monster movement, loot generation, storage keys, text, class names, DOM order, and rendering order unchanged.
- Do not introduce backend coupling, dependency changes, CSS redesign, route changes, skill-editor verification, or new gameplay simulators.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `webapp-app-module-extraction`: Adds next-pass extraction requirements for tooltip view-model helpers, inventory/equipment presentation helpers, battle guide/debug overlays, and remaining legacy VFX presentation while preserving playable WebApp behavior.

## Impact

- Affected areas: `webapp/App.tsx`, focused files under `webapp/components/tooltips/`, `webapp/components/inventory/`, `webapp/components/battle/`, optional thin `webapp/types/`, and pure helpers under `webapp/utils/`.
- Verification: `openspec validate`, `npm run build`, `npm test`, focused TypeScript checks for newly touched modules, and actual playable WebApp verification through `run.bat` with screenshots under `artifacts/screenshots/`.
- No backend, API, server runtime, package dependency, asset, save schema, balance, gameplay runtime, or disabled skill-editor surface is intended.
