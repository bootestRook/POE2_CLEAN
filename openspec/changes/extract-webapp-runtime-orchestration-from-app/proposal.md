## Why

`webapp/App.tsx` has completed the first architecture-boundary pass, but it still carries roughly 400KB of App-local types, constants, player skill runtime, enemy damage handling, battle-loop orchestration, and runtime visual scheduling. The next pass needs a complete, behavior-preserving plan that moves searchable runtime ownership into focused modules without introducing backend coupling or alternate gameplay paths.

## What Changes

- Move App-local runtime/domain type definitions and stable constants into focused `webapp/types/`, `webapp/runtime/`, and `webapp/state/` owners when they are required by extracted runtime modules.
- Extract deterministic frontend playable skill event builders and pure helper families from `App.tsx` into focused runtime modules while preserving existing event payloads, timing, targeting, damage, VFX, and floating-text contracts.
- Extract deterministic enemy/player damage, status, resource, projectile lifecycle, damage-zone tick, and visual follow-up helpers only when they can be tested through explicit inputs and still consumed by the existing playable App path.
- Introduce a focused battle runtime orchestration boundary only after pure helper/event-builder boundaries are stable, with App retaining top-level mode routing, cross-domain state/ref initialization, callback adapters, save/rest/map flow wiring, and React state ownership that is not explicitly moved.
- Update smoke/source-boundary tests so protected invariants follow the new owning modules and so extracted runtime modules cannot import from `webapp/App.tsx`, call backend APIs, use disabled skill-editor acceptance paths, or duplicate gameplay runtimes.
- Verify every batch with build/smoke checks and verify frontend-affecting behavior in the actual playable WebApp launched through `run.bat`; capture evidence under `artifacts/`.
- No gameplay balance, save schema, storage key, CSS redesign, copy, dependency, backend, or skill-editor enablement changes are intended.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `webapp-app-module-extraction`: add requirements for the next runtime-orchestration extraction pass, including type/constant ownership, playable skill runtime extraction, damage/status/resource helper extraction, battle-loop orchestration boundaries, and batch verification.
- `frontend-skill-runtime-source`: add requirements that frontend-owned skill runtime extraction keeps normal-play skill generation and consumption in client code with explicit module ownership and no backend/canonical naming regression.

## Impact

- Affected code: `webapp/App.tsx`, `webapp/runtime/`, `webapp/types/`, `webapp/state/`, `webapp/components/battle/`, `webapp/features/playable-battle/`, `webapp/smoke-test.mjs`, and WebApp module documentation if a new owner is created.
- Affected validation: `cmd /c npm run build`, `npm test`, focused smoke/runtime checks, `openspec validate <change> --strict`, and actual playable WebApp browser screenshots through `run.bat`.
- No backend services, server runtimes, network APIs, save migrations, storage keys, dependency changes, or disabled skill-editor verification surfaces are in scope.
