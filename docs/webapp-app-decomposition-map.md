# WebApp App.tsx Decomposition Map

This map records the current `webapp/App.tsx` ownership picture and the intended final extraction direction. It is a planning aid only; it must not be used to justify behavior changes.

Line numbers are temporary navigation notes. If the file changes, update the ownership descriptions instead of relying on stale ranges.

## Current Responsibilities

- Lines 1-229: imports for app metadata, map assets, spawn/runtime config, skill runtimes, equipment runtime, disabled editor modules, playable battle scene, inventory, layout, battle presentation, skill-board, map editor, state helpers, utilities, sprite test, and rest-area scene.
- Lines 231-907: App-local domain shapes and constants, including item, skill event, App state, save payload, map run, drop, portal, GM, player runtime, battle VFX, tooltip, floating item, placement prompt, camera, and visual runtime shapes.
- Lines 909-1107: static gameplay/rendering/inventory constants, local preference helpers, state helper wiring, sanitization, recalculation, GM local request helpers, and disabled backend request shim.
- Lines 1114-1154: top-level App routing and launch cache clearing.
- Lines 1155-1331: `GameApp` state and ref initialization for save/rest/battle/inventory/debug/runtime flows.
- Lines 1332-2095: state application, resource setters, minimap helpers, player buffs, movement and recovery effects, save loading, map loading, input effects, and rest-area movement.
- Lines 2099-2345: main battle tick orchestration and runtime monster melee player-hit handling.
- Lines 2348-2814: monster skill dispatch, release, movement positioning, projectile event creation, damage-zone/melee-arc event creation, and monster skill pure helper logic.
- Lines 2817-3313: legacy boss skill timer and event release logic.
- Lines 3314-6385: player-hit handling, frontend playable skill release, event building/consumption, projectile/damage-zone/melee/nova/chain/channel/status/forced-movement handling, runtime VFX, and damage-event orchestration.
- Lines 6388-7140: damage batch application, enemy damage and kill/drop/progression side effects, floating item placement, drag/drop movement, map instance creation, boss portal, frontend drops, pickup logic, keyboard interaction, and battle reset.
- Lines 7140-7549: start game flow, monster-test controls, disabled skill-editor stub, drag/hover tooltip setup, derived inventory/board/support/GM data, GM submit, save-slot flow, rest-area interaction, resolution change, inventory close, and pause/exit/end-game flows.
- Lines 7553-8068: main JSX return, including playable battle scene, title/save/rest/battle overlays, disabled editor panel, map selection, combat feed, and inline inventory overlay.
- Lines 8079-8435: stat/resource helpers, tooltip positioning, typing guard, map bounds, inventory removal, equipment sanitization, projection helpers, boss pack ids, monster skill materialization, spawn plan creation, and stage/boss scope helpers.
- Lines 8448-9058: monster level scaling, attack/defense stats, shape parsing, spawn logs, monster offense, damage mitigation, ailments, resistances, enemy damage/resource helpers, and status damage interactions.
- Lines 9060-9244: targeting, projectile launch helpers, projectile spread/direction math, battle camera/projection, render item adapter, and battle render helper creation.
- Lines 9246-9350: gem tooltip view-model enrichment, active tooltip normalization, support tooltip normalization, and conduit/support tooltip helpers.
- Lines 9352-9817: skill pipeline classification, VFX scale/helpers, forced element selection, stable hash, hit target/projectile follow-up helpers, VFX anchoring, enemy creation, debug helpers, monster test factories, encounter palettes, and visual budget helpers.

## Current Runtime Ownership Baseline

After the first App architecture pass, the runtime code that still intentionally remains in `webapp/App.tsx` is grouped as follows:

- App-local runtime/domain types and constants: `SkillEvent`, `AppState` slices, save payload, map-run slices, drop prompts, boss portals, GM views, player runtime state, battle VFX shapes, scheduled events, active damage-zone runtime, tooltip/floating item shapes, camera shapes, visual runtime shapes, boss skill defaults, runtime visual budgets, interaction radii, monster-test constants, and selected boss pack ids.
- Playable skill event generation: `releaseFrontendPlayableSkill`, `buildFrontendPlayableSkillEvents`, projectile, split projectile, secondary hit, ignited hit explosion, chain, module-chain, damage-zone, melee-arc, nova, status, forced-movement, hit VFX, floating text, and kill-triggered event payload construction.
- Skill event consumption and runtime queues: `consumeSkillEventTimeline`, `consumeImmediateSkillEvents`, scheduled skill events, `consumeSkillEvent`, `consumeSkillEventBatch`, active damage-zone tick queues, projectile impact queues, and damage event routing.
- Damage application and status/resource helpers: `applyDamageEventBatch`, enemy damage projection, monster armor/resistance/block/avoidance/resource helpers, enemy status helpers, player resource regeneration, energy-shield recharge, incoming player hit adapters, and player mitigation/block recovery helpers.
- Projectile lifecycle and VFX follow-up scheduling: projectile id extraction, follow-up suppression keys, projectile completion, projectile anchoring, hit VFX anchoring, projectile spread/direction helpers, visual budget capping, and runtime projectile visual state mutation.
- Damage-zone lifecycle: active damage-zone refs, zone uniqueness, zone expiration, dynamic tick event creation, rectangle containment, repeated monster zone scheduling, and pending boss damage-zone hit queues.
- Map-run and battle flow: map instance creation, procedural spawn plan installation, drop progression, pickup flow, boss portal flow, minimap exploration, battle reset, pause/failure/end-game flow, and rest/map transitions.
- Final App wiring: top-level mode routing, cross-domain React state and refs, save/rest/map flow wiring, callback adapters, viewport shell composition, runtime queue refs, and state setters that extracted modules must receive explicitly if a later batch moves a narrow orchestration boundary.

## Target Ownership

- `webapp/App.tsx`: top-level mode routing, App-owned cross-domain state/ref initialization, viewport shell composition, callback wiring, and intentional orchestration adapters.
- `webapp/components/inventory/`: inventory overlay, bag/stash/equipment presentation, floating item display, discard prompt, and item-cell visuals.
- `webapp/components/skill-board/`: skill-board visible UI, board cells, support line display, support preview display, and board hover presentation.
- `webapp/components/battle/` and `webapp/features/playable-battle/`: battle scene composition, HUD/layers/VFX presentation, minimap, drops, boss portal display, and debug overlays.
- `webapp/runtime/`: deterministic gameplay/runtime helpers such as monster skill presentation helpers, monster skill event builders, player damage formulas, projectile lifecycle helpers, and enemy runtime helpers.
- `webapp/monsterSkillRuntime.ts`: monster skill config validation, assignment lookup, candidate selection, timer readiness, and cooldown bookkeeping.
- `webapp/state/`: frontend state helpers, save payload helpers, deterministic drop/map-run helpers, and recalculation adapters.
- `webapp/components/tooltips/`: tooltip rendering, view models, rich text, tags, formatting adapters, and gem orbs.
- `webapp/components/rest-area/`: rest-area scene/panel/control presentation.
- `webapp/components/layout/`: title/save shell presentation, non-gameplay app chrome, debug panels, pause/failure/portal overlay composition, help text, and combat feed.
- `webapp/types/`: shared type-only shapes needed by extracted modules.
- `webapp/utils/` and `webapp/hooks/`: pure helpers and focused hooks after ownership is clear.

## Target For This Runtime Pass

This pass is complete when `webapp/App.tsx` has stopped being the place where searchable runtime formulas and event-builder families live. The final App target for this pass is:

- top-level mode routing between title, save selection, rest area, playable battle, map editor, and disabled tooling stubs;
- cross-domain React state and ref initialization for state that is still intentionally App-owned;
- save, rest-area, map-run, battle reset, pause/failure, boss portal, pickup, and mode-transition wiring;
- callback adapters that connect focused modules without taking ownership of their feature behavior;
- viewport shell composition and launch/bootstrap flags;
- intentionally deferred runtime refs and queues whose ownership would be unsafe to move before pure helpers, builders, and source-boundary checks are stable.

The final App target is not a line-count target. Remaining App code is acceptable only when it is explicitly routing, state/ref wiring, callback adaptation, or deferred orchestration recorded in this map.

## Risk-Ordered Extraction Path

1. Inventory overlay render-only composition.
2. Inventory/skill-board subpanels if the overlay remains too broad.
3. Monster skill pure presentation/runtime helper logic.
4. Monster skill event builder logic.
5. Pure player damage/runtime helpers that can move without state ownership changes.
6. Deterministic save/state/drop/stash helpers that still live in App.
7. Title, UI shell, and non-gameplay overlay composition.
8. Final App boundary cleanup and source-test ownership migration.

## Completion Definition

The App architecture pass is complete when all of the following are true:

- `webapp/App.tsx` keeps only mode routing, App-owned cross-domain state/ref initialization, viewport shell composition, callback wiring, and intentional orchestration adapters.
- Large render-only inventory, equipment, stash, board, title, and non-gameplay shell UI blocks no longer live inline in App.
- Monster skill pure helpers and monster skill event payload builders are searchable in focused runtime modules outside App.
- Extracted modules do not import from `webapp/App.tsx`; shared shapes live in type-only modules when needed.
- Source-text and smoke tests read the module that owns each protected invariant instead of requiring moved functions to remain in App.
- Future WebApp module placement guidance is documented in `docs/webapp-module-boundaries.md`.
- Build, tests, OpenSpec validation, and actual playable WebApp verification through the `run.bat` flow have passed for the final batch.

## Defer Unless Explicitly Scoped

- Battle-loop ownership and runtime hook ownership.
- Target selection, hit timing, projectile trajectory decisions, damage-zone origin decisions, damage application, monster AI behavior, and runtime event consumption.
- Save-schema changes, storage-key changes, CSS redesign, copy changes, and gameplay balance changes.
- Any extraction that would require backend coupling, duplicate gameplay runtime, or skill-editor verification.
