## Why

`webapp/App.tsx` is still large enough that unrelated WebApp work can easily touch fragile shared code, especially around tool modes, panel rendering, tooltips, and battle presentation. The previous split established module boundaries; this change continues that work with another behavior-preserving pass focused on reducing edit blast radius without changing gameplay.

## What Changes

- Continue decomposing `webapp/App.tsx` into focused client-side modules by moving isolated tool-mode, panel, type, tooltip, and battle-presentation code out of the monolith.
- Keep App-owned gameplay state, save state, runtime refs, storage keys, runtime event consumption, DOM order, class names, text, and visual behavior unchanged during extraction.
- Add thin shared WebApp type modules only where they unblock one-directional component extraction.
- Preserve the actual playable WebApp as the verification surface; do not use the disabled skill editor or any backend/server runtime.
- Avoid feature work, design cleanup, CSS churn, dependency changes, save schema changes, runtime rewrites, or new frontend-local mirrors of gameplay logic.

## Capabilities

### New Capabilities

- `webapp-app-module-extraction`: Defines the behavior-preserving requirements for continuing to extract `webapp/App.tsx` into focused frontend modules.

### Modified Capabilities

- None.

## Impact

- Affected code areas during implementation: `webapp/App.tsx`, new or existing files under `webapp/components/`, `webapp/hooks/`, `webapp/utils/`, and optional thin type modules under `webapp/types/`.
- No backend, API, gameplay runtime, skill runtime, monster runtime, save format, balance, CSS redesign, asset, package dependency, or skill-editor changes are intended.
- Verification impact: implementation must build, launch the actual WebApp through the project `run.bat` flow, visually verify the playable view in-browser, and store screenshots under `artifacts/screenshots/`.
