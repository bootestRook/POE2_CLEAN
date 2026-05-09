## Why

`webapp/App.tsx` has become large enough that small UI edits are risky: unrelated merge conflicts, encoding damage, and syntax breakage can affect the whole WebApp. Splitting it into stable client-side modules will reduce future edit blast radius while preserving the current game behavior exactly.

## What Changes

- Decompose `webapp/App.tsx` through behavior-preserving extraction of leaf UI components, formatter helpers, and hooks into focused WebApp modules.
- Keep the first implementation pass move-only: no gameplay changes, no visual redesign, no copy changes, no storage schema changes, and no backend/API coupling.
- Add an explicit WebApp module-boundary development rule so future new features must be planned into focused modules instead of being added directly to the monolithic `App.tsx`.
- Document the rule in repository AI/developer guidance so future AI-assisted work sees the same constraint before implementation.
- Preserve the existing `run.bat` WebApp verification flow and require visual screenshot checks for frontend-affecting extraction steps.

## Capabilities

### New Capabilities

- `webapp-module-boundaries`: Defines how WebApp code is split, where future frontend features should be placed, and what must be verified to prove extraction did not change behavior.

### Modified Capabilities

- None.

## Impact

- Affected code areas during implementation: `webapp/App.tsx`, new files under `webapp/components/`, `webapp/hooks/`, `webapp/utils/`, and repository guidance such as `AGENTS.md` or a small docs file referenced by it.
- No backend, API, gameplay runtime, skill runtime, save format, asset, or dependency changes are intended.
- Verification impact: each frontend-affecting extraction must build and be visually checked in the actual WebApp launched through the project `run.bat` flow, with screenshots stored under `artifacts/screenshots/`.
