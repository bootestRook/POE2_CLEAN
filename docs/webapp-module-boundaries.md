# WebApp Module Boundaries

This project is client-only. WebApp features must be planned into focused frontend modules instead of growing `webapp/App.tsx`.

## Planning Rule

Before implementing any non-trivial WebApp change, identify the owner module first. The plan must name:

- The existing module that owns the change, or
- The new focused module/folder that should be created, and
- The state, callbacks, runtime data, and visual verification surface that must stay unchanged.

If the change seems to require editing `webapp/App.tsx`, first ask whether the change can be limited to an existing component, hook, or utility. If no boundary exists, create a focused client-side module instead of adding more feature code to the App monolith.

If no existing owner fits the work, update this module-boundary plan or create a focused module plan before implementing the feature. Do not add new WebApp feature code directly to `webapp/App.tsx` as the fallback destination.

For any non-trivial WebApp change, the plan must also include this concrete section before editing:

```text
App.tsx role:
Only wires [component/hook/state/props/callbacks/mode/ref].
No feature UI/state/rules/text/transforms live in App.tsx.
```

Fill in the bracketed items with the actual component, hook, state value, props, callbacks, mode route, or app-shell ref being connected. A generic "minimal App changes" statement is not enough.

## Missing Boundaries

When a WebApp feature does not fit the owner map below, the first task is architecture planning. Add or update a focused owner module/folder in this document and, when behavior requirements change, add or update the relevant OpenSpec requirement before implementation. The implementation must wait until the new boundary names the state, callbacks, runtime data, and verification surface that remain unchanged.

## App.tsx Allowed Edits

`webapp/App.tsx` is the orchestration root, not a feature module. After the final architecture pass, App edits are allowed only for:

- top-level mode routing between existing WebApp surfaces;
- App-owned cross-domain React state or ref initialization;
- viewport shell composition and launch/bootstrap flags;
- importing focused modules and passing existing state/callbacks into them;
- thin runtime-owner wiring for `webapp/runtime/skillEventConsumerRuntime.ts` and `webapp/runtime/damageApplicationRuntime.ts`;
- intentionally documented battle-loop orchestration in `stepGame` while it still spans save/rest/map flow, movement, minimap, spawning, monster AI, player skills, projectile impacts, boss zones, active zones, and scheduled events;
- unavoidable adapter calls that connect two focused modules without taking ownership of either module's behavior.

If an App edit adds feature UI, runtime formulas, event payload construction, save/storage helpers, target selection, damage logic, or display formatting, the work belongs in a focused module first.

In addition, App edits must not introduce feature-owned state, feature-specific event handling, new feature text branches, business rule decisions, or data transformations. Those belong in an owner module such as a component, hook, model, text module, state helper, runtime helper, utility, or type-only file.

If a new feature needs files, prefer one or more of these focused shapes:

- `FeaturePanel.tsx`: display structure and presentation composition.
- `useFeatureState.ts`: local state and event handling owned by the feature.
- `featureModel.ts`: enums, rule predicates, and pure decision helpers.
- `featureText.ts`: display text, labels, and text selection helpers.
- `featureTypes.ts`: shared feature types with no runtime behavior.

## App.tsx Exception Rule

`webapp/App.tsx` is not a banned file. It may keep app-shell responsibilities when that is the smallest coherent boundary. Any exception beyond composition wiring must be documented before editing with this format:

```text
App.tsx exception:
Reason: [why this belongs to the app shell instead of a focused owner module]
Expected scope: [rough line count and touched App responsibility]
Extraction condition: [what growth or behavior would force a focused module]
```

If an `App.tsx` edit is expected to exceed roughly 15-20 lines, split the feature into a focused module first unless the plan documents that the extra lines are app-shell ownership rather than feature ownership. This threshold is a pre-edit trigger, not an after-the-fact cleanup metric.

Line count is not the only rule. Even a small `App.tsx` diff is a boundary violation if it adds feature UI structure, feature-owned state, business rules, display text decisions, or data transforms.

## Current Target Folders

- `webapp/components/tooltips/`: tooltip presentation, tooltip panels, tooltip-only display controls, tooltip formatting adapters, rich tooltip sections, and gem orbs.
- `webapp/components/inventory/`: inventory overlay composition, bag grids, equipment slots, stash grids, item cells, floating item display, discard prompts, and drag/drop presentation.
- `webapp/components/skill-board/`: skill-board visible UI, board cells, support lines, support preview display, board hover presentation, and support preview hooks.
- `webapp/components/battle/`: battle HUD, battle-only visual layers, VFX views, projectile bodies, hit effects, minimap display, ground drops, boss portal display, and debug overlays that do not own gameplay simulation.
- `webapp/features/playable-battle/`: playable battle scene composition and presentation wiring.
- `webapp/components/rest-area/`: rest-area panels, NPC panels, stash/stage entry controls, and rest-area-only controls.
- `webapp/components/layout/`: title/save shell presentation, non-gameplay app chrome, release debug panels, pause/failure/portal overlay composition, and help/combat-feed presentation.
- `webapp/localization/`: client-only string resources, localization lookup helpers, template interpolation, fallback behavior, and localization-specific tests. Feature modules may consume this owner through the lookup API or passed display text, but must not parse localization config directly.
- `webapp/runtime/`: deterministic gameplay/runtime helpers and focused runtime owners. `skillEventConsumerRuntime.ts` owns playable skill-event timeline/batch consumption, scheduled events, active damage-zone ticks, VFX/status/forced-movement routing, and damage-event routing. `damageApplicationRuntime.ts` owns playable damage-batch application, enemy HP/energy-shield mutation, kill/drop/log side effects, player on-hit recovery, and recursive on-kill event routing. Runtime modules must not create alternate gameplay paths, duplicate target selection, duplicate hit timing, recalculate projectile trajectory, recalculate damage-zone origin, or introduce backend coupling.
- `webapp/mapGeneration/`: client-only procedural editor map generation, seeded random helpers, topology graph creation, room layout, corridor carving, generated zones, spawn placement, map validation, and Chinese debug text. This folder may emit editor-map documents for existing map loading adapters, but must not own combat simulation, monster spawning rules, rewards, map modifiers, or backend coupling.
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
