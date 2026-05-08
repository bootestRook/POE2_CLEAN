## Context

The previous `split-webapp-app-without-behavior-changes` change established the client-only WebApp module-boundary rule and extracted several leaf components under `webapp/components/`, `webapp/hooks/`, and `webapp/utils/`. `webapp/App.tsx` remains very large and still owns unrelated concerns: mode dispatch, map-editor tooling, sprite-test tooling, playable `GameApp` orchestration, rest-area panels, stash and save panels, battle minimap rendering, tooltip view models, projectile and hit VFX views, and many shared types/helpers.

This follow-up change continues the same behavior-preserving strategy. The goal is to reduce future edit risk, not to redesign the runtime. The project is client-only, and all work must remain in frontend code, local static config, local assets, or other explicitly client-side mechanisms.

## Goals / Non-Goals

**Goals:**

- Move isolated `App.tsx` regions into focused modules with minimal call-site changes.
- Preserve App-owned state and runtime refs until a later change separately justifies moving them.
- Create thin shared type modules only when they unblock clean component extraction.
- Keep existing class names, text, DOM order, rendering order, storage keys, local runtime calls, and visual output unchanged.
- Verify extraction in the actual playable WebApp launched through `run.bat`, with screenshots under `artifacts/screenshots/`.

**Non-Goals:**

- No gameplay, skill runtime, monster runtime, combat timing, target selection, damage application, projectile behavior, chain behavior, save format, balance, copy, CSS redesign, asset, or dependency changes.
- No backend APIs, backend services, server runtimes, or server-generated gameplay behavior.
- No new state-management framework, route restructure, build tool change, or package dependency.
- No use of `/skill-editor`, `?skill_editor=1`, `view=skill_editor`, port `8765`, `dist-skill-editor`, or skill-editor preview surfaces as verification.
- No extraction that requires reimplementing a frontend-local gameplay simulator or parallel battle runtime.

## Decisions

1. Continue with behavior-preserving extraction before abstraction.

   Move existing code into modules first and keep the public prop/callback surface close to the current closure variables. This keeps review focused on whether code moved intact rather than whether behavior changed.

   Alternative considered: redesign `GameApp` around new domain services or a global store while splitting. Rejected because it would mix architectural changes with behavior preservation and make regressions hard to isolate.

2. Extract low-coupling outer modes before high-coupling playable runtime internals.

   `MapEditorScene` and `SpriteTestScene` are comparatively isolated from the formal playable battle path and can be moved to `webapp/components/map-editor/` and `webapp/components/sprite-test/` with their private helpers. This reduces `App.tsx` size without touching the core `GameApp` loop.

   Alternative considered: split `GameApp` first. Rejected because `GameApp` owns many state refs, effects, and runtime callbacks; moving it first would create a large prop surface and higher risk.

3. Use existing target folders for presentation modules.

   Continue placing rest-area UI in `webapp/components/rest-area/`, inventory/stash presentation in `webapp/components/inventory/`, battle HUD and battle visual layers in `webapp/components/battle/`, tooltip presentation in `webapp/components/tooltips/`, pure helpers in `webapp/utils/`, and reusable hooks in `webapp/hooks/`.

   Alternative considered: create broad folders such as `webapp/features/` or `webapp/game/`. Rejected for this pass because existing folder boundaries are already documented and reduce ambiguity for future edits.

4. Introduce type modules only as thin dependency breakers.

   Shared types such as inventory items, tooltips, battle render models, or runtime visual view props may move to `webapp/types/` when needed to avoid importing from `App.tsx`. Type extraction must not alter data shapes or introduce runtime code.

   Alternative considered: leave all types in `App.tsx`. Rejected because it blocks clean one-directional imports for extracted modules.

5. Keep canonical playable behavior inside the existing client runtime path.

   Extracted battle presentation modules may render events and visual state passed from `GameApp`, but they must not recalculate trajectory, targets, hit timing, damage-zone origins, damage results, chain targets, or monster behavior.

   Alternative considered: make extracted visual modules compute more of their own behavior. Rejected because it would create duplicate gameplay logic and conflict with the existing runtime-source boundary.

## Risks / Trade-offs

- Circular imports after type/component extraction -> Mitigation: move shared types into `webapp/types/` and keep component modules dependent on props, utilities, and static assets rather than `App.tsx`.
- Accidental behavior change from moved closures -> Mitigation: keep state ownership in `GameApp` and pass existing values/callbacks through props; stop if an extraction requires rewriting data flow.
- Large prop surfaces on first extraction -> Mitigation: prefer small leaf modules and accept prop drilling until a later hook/state refactor is explicitly scoped.
- Visual regressions missed by static checks -> Mitigation: run the actual WebApp via `run.bat` and capture screenshots of the playable view after frontend changes.
- Active changes touching the same areas -> Mitigation: inspect branch/status before implementation and avoid mixing unrelated work into this refactor.
- `App.tsx` remains large after this pass -> Mitigation: optimize for safe incremental reduction rather than a line-count target.

## Migration Plan

1. Start from a clean or clearly understood worktree and confirm the current branch.
2. Extract one module group at a time, preserving imports, props, class names, and DOM structure.
3. Build and visually verify after each meaningful frontend extraction group.
4. If an extraction causes circular dependencies or runtime behavior changes, revert only that extraction group and leave the stable moved modules intact.

## Open Questions

- Whether the first implementation pass should prioritize tool-mode extraction (`MapEditorScene` and `SpriteTestScene`) or visible playable panels (`RestAreaScene`, stash, save, map selection). Both are valid; tool modes are lower risk, while playable panels provide more immediate future-edit value.
