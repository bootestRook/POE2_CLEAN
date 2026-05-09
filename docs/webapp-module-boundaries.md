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

- `webapp/components/tooltips/`: tooltip presentation, tooltip panels, tooltip-only display controls, tooltip formatting adapters, rich tooltip sections, and gem orbs.
- `webapp/components/inventory/`: inventory overlay composition, bag grids, equipment slots, stash grids, item cells, floating item display, discard prompts, and drag/drop presentation.
- `webapp/components/skill-board/`: skill-board visible UI, board cells, support lines, support preview display, board hover presentation, and support preview hooks.
- `webapp/components/battle/`: battle HUD, battle-only visual layers, VFX views, projectile bodies, hit effects, minimap display, ground drops, boss portal display, and debug overlays that do not own gameplay simulation.
- `webapp/features/playable-battle/`: playable battle scene composition and presentation wiring.
- `webapp/components/rest-area/`: rest-area panels, NPC panels, stash/stage entry controls, and rest-area-only controls.
- `webapp/components/layout/`: title/save shell presentation, non-gameplay app chrome, release debug panels, pause/failure/portal overlay composition, and help/combat-feed presentation.
- `webapp/runtime/`: deterministic gameplay/runtime helpers such as monster skill presentation helpers, monster skill event builders, player damage formulas, projectile lifecycle helpers, and enemy runtime helpers. Runtime modules must not create alternate gameplay paths.
- `webapp/monsterSkillRuntime.ts`: monster skill config validation, assignment lookup, candidate selection, timer readiness, and cooldown bookkeeping.
- `webapp/state/`: frontend App state helpers, save payload helpers, deterministic drop/map-run helpers, and state recalculation adapters.
- `webapp/hooks/`: reusable React hooks after the owning state and side effects are clear.
- `webapp/utils/`: pure formatting, type guards, math, viewport metrics, token helpers, and deterministic helpers with no React state.
- `webapp/types/`: shared type-only shapes used to avoid imports from `webapp/App.tsx`; type modules must contain no runtime behavior.

## Extraction Rule

When splitting existing `App.tsx` code, move behavior first and abstract later:

- Preserve text, class names, DOM order, props, storage keys, runtime calls, and rendering order.
- Keep App-owned state in `App.tsx` until moving it is separately justified.
- Pass existing values and callbacks through props instead of rewriting data flow.
- Stop if extraction requires gameplay, save data, CSS, copy, runtime event, or dependency changes.

## Verification Rule

Frontend-affecting module work must be verified in the actual WebApp launched through the project `run.bat` flow. Screenshots and logs must be stored under `artifacts/`, never in the repository root.
