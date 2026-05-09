## Why

`webapp/App.tsx` has already been reduced through several extraction passes, but it still mixes top-level orchestration, inventory UI composition, battle runtime side effects, monster skill event construction, save flow, and future placement decisions. The next change needs to turn the earlier piecemeal extraction guidance into a final architecture boundary so future WebApp work has a clear first destination and does not grow `App.tsx` again.

## What Changes

- Define the final intended responsibility of `webapp/App.tsx`: top-level mode routing, App-owned state/ref wiring, cross-module callback composition, and explicit orchestration only.
- Define the target module map for future WebApp code, including inventory, skill-board, battle presentation, monster skill runtime/event building, player damage runtime, save/state helpers, rest-area UI, layout shell, tooltips, and shared type-only modules.
- Add a risk-ordered implementation plan that first extracts render-only inventory/UI composition, then pure monster skill helpers, then monster skill event builders, then save/state helpers, and only later considers runtime hook ownership.
- Add explicit completion criteria for this architecture pass so the work stops at a maintainable boundary instead of continuing to split files for line-count alone.
- Update future-coding rules so any WebApp task without an obvious module owner must first add or update a focused module plan before implementation.
- Preserve all existing client-only constraints: no backend coupling, no duplicate gameplay runtime, no skill-editor acceptance surface, no save-schema drift, no CSS/copy redesign, and no root-level verification artifacts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `webapp-app-module-extraction`: Add the final App decomposition target, extraction sequence, module ownership map, completion criteria, and verification gates.
- `webapp-module-boundaries`: Strengthen future WebApp planning rules so new code has a documented owner module and missing boundaries are planned before implementation.

## Impact

- Affected planning/docs: `docs/webapp-module-boundaries.md`, `docs/webapp-app-decomposition-map.md`, and OpenSpec specs for WebApp module extraction and boundaries.
- Affected future frontend code areas: `webapp/App.tsx`, `webapp/components/inventory/`, `webapp/components/skill-board/`, `webapp/components/battle/`, `webapp/components/layout/`, `webapp/components/rest-area/`, `webapp/components/tooltips/`, `webapp/runtime/`, `webapp/state/`, `webapp/types/`, `webapp/hooks/`, and `webapp/utils/`.
- Affected tests/checks: WebApp smoke/source-boundary checks, TypeScript/build checks, focused runtime helper tests, and playable WebApp screenshot verification through the project `run.bat` flow.
- Not affected: no backend APIs, no server runtime, no new dependencies, no save format changes, no gameplay balance changes, no skill-editor launch or acceptance path, and no visual redesign.
