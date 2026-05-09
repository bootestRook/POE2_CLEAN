## Why

`webapp/App.tsx` remains large after several behavior-preserving extraction passes because it still mixes App shell routing, playable battle orchestration, disabled skill-editor tooling, shared domain types, enemy runtime helpers, save/inventory/drop handlers, and battle scene presentation. This makes future small WebApp changes expensive to inspect and risky to edit because searches and imports still cross unrelated architecture zones.

## What Changes

- Continue reducing `webapp/App.tsx` through architecture-boundary extraction rather than another broad leaf-component pass.
- Isolate disabled skill-editor/tooling code into a focused client-only disabled tooling boundary so routine WebApp searches are not polluted by inactive editor code.
- Move shared WebApp domain shapes into thin type-only modules where needed to prevent extracted modules from importing from `App.tsx`.
- Move playable battle scene presentation and canvas snapshot assembly into focused presentation modules that render supplied runtime state without owning gameplay decisions.
- Move enemy runtime/navigation helpers into focused client-side runtime modules in a separately verified batch, preserving existing monster movement, collision, targeting reachability, and debug behavior.
- Keep App-owned orchestration, existing storage keys, save shape, gameplay behavior, rendering order, text, CSS classes, and playable WebApp acceptance flow unchanged.
- Do not add backend APIs, server runtime coupling, new dependencies, route restructuring, CSS redesign, skill-editor acceptance, or alternate gameplay runtimes.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `webapp-app-module-extraction`: Extend App extraction requirements from low-risk display extraction into explicit architecture-boundary extraction for disabled tooling, shared domain types, playable battle presentation, and enemy runtime helper modules.

## Impact

- Affected frontend areas: `webapp/App.tsx`, new or existing focused client-side modules under `webapp/features/`, `webapp/runtime/`, `webapp/types/` or equivalent existing WebApp folders, and supporting tests/smoke checks.
- No backend, API, server runtime, package dependency, save schema, gameplay balance, copy, CSS redesign, or skill-editor acceptance changes are intended.
- Verification impact: each extraction batch requires focused checks, `npm run build`, `npm test` or documented unrelated blockers, playable WebApp verification through the project `run.bat` flow, screenshots under `artifacts/screenshots/`, and root artifact hygiene review.
