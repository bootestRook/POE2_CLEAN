## Why

`webapp/App.tsx` remains very large after the previous extraction pass, and the next reductions should be planned before implementation so each split can be tested and committed independently. The safest next step is to continue with behavior-preserving client-side module boundaries while avoiding high-risk combat runtime and save-schema changes.

## What Changes

- Define the next App extraction sequence by risk: tooltip display/view-model helpers first, inventory/equipment placement helpers second, and local save-slot storage helpers only as a carefully isolated later step.
- Preserve App-owned React state, gameplay runtime behavior, save payload shape, storage keys, visible copy, class names, DOM order, rendering order, dependencies, and acceptance surfaces.
- Keep each extraction small enough to build, test, visually verify through the playable WebApp `run.bat` flow, and commit before starting the next split.
- Explicitly defer high-risk combat runtime, monster AI/navigation, skill event generation, projectile targeting, damage calculation, and skill-editor surfaces from this planning change.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `webapp-app-module-extraction`: Add the next behavior-preserving extraction plan and verification gates for tooltip, inventory/equipment, and save-storage utility boundaries.

## Impact

- Affected planning and future implementation areas: `webapp/App.tsx`, `webapp/components/tooltips/`, `webapp/components/inventory/`, and focused client-only utility modules under `webapp/utils/`.
- No backend, API, server runtime, dependency, gameplay balance, combat runtime, skill runtime, CSS redesign, copy rewrite, save-schema migration, or skill-editor acceptance change is intended.
- Verification impact: each extraction batch must run build/test checks, launch the actual WebApp through `run.bat`, capture screenshots under `artifacts/screenshots/`, and confirm no verification artifacts are left in the repository root.
