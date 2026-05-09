# WebApp Module Boundaries

This project is client-only. WebApp features must be planned into focused frontend modules instead of growing `webapp/App.tsx`.

## Planning Rule

Before implementing any non-trivial WebApp change, identify the owner module first. The plan must name:

- The existing module that owns the change, or
- The new focused module/folder that should be created, and
- The state, callbacks, runtime data, and visual verification surface that must stay unchanged.

If the change seems to require editing `webapp/App.tsx`, first ask whether the change can be limited to an existing component, hook, or utility. If no boundary exists, create a focused client-side module instead of adding more feature code to the App monolith.

If no existing owner fits the work, update this module-boundary plan or create a focused module plan before implementing the feature. Do not add new WebApp feature code directly to `webapp/App.tsx` as the fallback destination.

## Current Target Folders

- `webapp/components/tooltips/`: tooltip presentation, tooltip panels, and tooltip-only display controls.
- `webapp/components/inventory/`: inventory grids, equipment slots, stash grids, item cells, and item drag/drop presentation.
- `webapp/components/battle/`: battle HUD and battle-only visual layers that do not own gameplay simulation.
- `webapp/components/rest-area/`: rest-area panels, NPC panels, and rest-area-only controls.
- `webapp/hooks/`: reusable React hooks after the owning state and side effects are clear.
- `webapp/utils/`: pure formatting, type guards, and deterministic helpers with no React state.

## Extraction Rule

When splitting existing `App.tsx` code, move behavior first and abstract later:

- Preserve text, class names, DOM order, props, storage keys, runtime calls, and rendering order.
- Keep App-owned state in `App.tsx` until moving it is separately justified.
- Pass existing values and callbacks through props instead of rewriting data flow.
- Stop if extraction requires gameplay, save data, CSS, copy, runtime event, or dependency changes.

## Verification Rule

Frontend-affecting module work must be verified in the actual WebApp launched through the project `run.bat` flow. Screenshots and logs must be stored under `artifacts/`, never in the repository root.
