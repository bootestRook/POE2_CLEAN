## Context

The current WebApp is client-only and still routes the main playable experience through `webapp/App.tsx`. Earlier extraction passes moved several leaf presentation boundaries into `webapp/components/`, `webapp/features/playable-battle/`, `webapp/hooks/`, and `webapp/utils/`, but `App.tsx` still owns several different concerns:

- lightweight UI shell sections embedded in the final JSX return;
- client save/startup/stash helper functions near the top of the file;
- React state, refs, effects, and gameplay runtime orchestration inside `GameApp`;
- battle rendering adapter helpers and gameplay formulas below `GameApp`;
- smoke-test checks that still assume many protected functions live directly in `App.tsx`.

The next extraction step should reduce future edit risk without crossing into combat runtime ownership. The implementation must preserve the project rule that all new or changed behavior remains frontend/client-side only and that actual frontend acceptance is the playable WebApp launched through the project `run.bat` flow.

## Goals / Non-Goals

**Goals:**

- Reduce `webapp/App.tsx` through small, behavior-preserving extraction groups with clear module owners.
- Move render-only UI shell sections into focused presentation components that receive existing values and callbacks through props.
- Move client-only save/state/stash helper code into focused modules while preserving storage keys, payload shapes, ownership sanitization, recalculation order, and current save/load behavior.
- Update smoke-test source lookups so extraction is not blocked by tests that require functions to remain in `App.tsx`.
- Keep each batch independently buildable, testable, visually verifiable, and reviewable.

**Non-Goals:**

- No combat runtime, skill event generation, skill event consumption, monster AI, projectile lifecycle, damage formula, target selection, hit timing, damage-zone origin, or map-run progression extraction.
- No movement of broad `GameApp` state into a global store or large hook.
- No save schema changes, storage-key changes, migration behavior changes, copy edits, CSS redesign, DOM-order changes, dependency changes, backend/API coupling, or server runtime behavior.
- No skill-editor verification surface, `/skill-editor` navigation, `?skill_editor=1`, port `8765`, or `dist-skill-editor` acceptance.

## Decisions

1. Extract UI shell before client state helpers.

   Render-only UI shell sections have the clearest prop-only boundary and lowest behavior risk. Moving them first reduces the JSX surface in `App.tsx` and confirms the new batch process before touching save or state helpers.

   Alternative considered: move client save/state helpers first. Rejected for the first batch because `webapp/smoke-test.mjs` currently protects several of those functions through App-source body checks, so the test boundary should be addressed deliberately after a low-risk extraction proves the baseline.

2. Keep `GameApp` as the state owner during this change.

   Extracted UI shell components should accept existing booleans, labels, summaries, arrays, and callbacks. Extracted state/save helpers should remain pure or explicitly local-storage focused, but `GameApp` should continue owning React state, refs, effects, runtime loops, and orchestration.

   Alternative considered: introduce a `useGameAppState` or global store. Rejected because it would mix decomposition with state architecture changes and make behavior preservation hard to prove.

3. Split client state/save/stash helpers by ownership, not by convenience.

   Starter state and save payload helpers belong in a client state/save module. Stash page creation, normalization, ownership sanitization, and stash slot movement can move to an inventory/stash state helper boundary. Equipment slot sanitization should either stay with inventory/equipment rules or be moved only when its dependency direction is one-way.

   Alternative considered: create one large `appStateHelpers.ts`. Rejected because it would recreate a smaller monolith and make future ownership less clear.

4. Update smoke tests to follow source boundaries.

   Existing smoke checks are useful, but many use `functionBody(app, "...")` or `app.includes(...)`, which will fail when behavior-preserving functions move out of `App.tsx`. The test should read the relevant extracted source files or use the existing collected `webappSourceText` for invariants that are not App-specific.

   Alternative considered: leave thin wrapper functions in `App.tsx` solely for tests. Rejected because it keeps artificial App coupling and weakens the extraction boundary.

5. Defer combat/runtime formula extraction.

   Runtime helper extraction is a real future need, but it overlaps with in-progress monster-skill runtime work and carries higher behavior risk. This change should stop before moving formulas or mutable runtime paths.

   Alternative considered: include monster/player damage formulas in this change for a larger line-count reduction. Rejected because the risk and verification burden are different from UI shell and client save/state extraction.

## Risks / Trade-offs

- Smoke tests fail after correct moves -> Mitigation: update smoke source reads in the same batch as the helper extraction and keep invariant checks equivalent.
- Circular imports between App, state helpers, inventory helpers, and type definitions -> Mitigation: introduce thin type-only modules only when needed, and keep extracted modules from importing `webapp/App.tsx`.
- Save/stash behavior changes accidentally -> Mitigation: preserve exact storage keys, function inputs/outputs, item ownership filters, duplicate rejection, board/equipment/stash interactions, and recalculation order; run `npm test`.
- UI shell extraction changes markup or event flow -> Mitigation: preserve text, class names, DOM order, aria labels, button order, and callback behavior; verify in the playable WebApp screenshot.
- Line-count pressure encourages overreach -> Mitigation: explicitly exclude combat runtime and stop a batch if extraction requires runtime ownership changes.
