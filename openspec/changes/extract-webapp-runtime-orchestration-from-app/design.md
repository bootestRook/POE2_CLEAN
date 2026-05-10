## Context

The previous App architecture change established owner-first rules, extracted large presentation blocks, moved several pure helper families, and added smoke checks that prevent extracted modules from importing from `webapp/App.tsx` or adding backend/skill-editor acceptance paths. The remaining `App.tsx` size is now dominated by App-local runtime/domain types, constants, frontend playable skill event generation/consumption, damage/status/resource helper logic, projectile and damage-zone lifecycle handling, runtime VFX scheduling, map-run orchestration, and battle-loop state/ref wiring.

The project is client-only. The playable WebApp battle path must not depend on backend APIs, server runtimes, Python skill runtime, disabled skill editor surfaces, or a second runtime mirror. This change therefore treats extraction as an ownership and searchability improvement, not a gameplay rewrite.

## Goals / Non-Goals

**Goals:**

- Reduce `webapp/App.tsx` by moving runtime/domain types, stable constants, deterministic helper families, frontend playable skill event builders, damage/status/resource helpers, projectile/damage-zone lifecycle helpers, and eventually focused battle orchestration into owner modules.
- Keep normal-play frontend skill runtime as the playable source for event generation, event consumption, damage, status, forced movement, cooldown/resource effects, and visual timing.
- Preserve every existing gameplay formula, event payload, timing field, storage key, save payload shape, class name, text string, DOM order, and visual behavior unless a separate behavior change explicitly scopes it.
- Make future code search simpler: runtime helpers live in `webapp/runtime/`, shared shapes in `webapp/types/`, state/save/drop helpers in `webapp/state/` or focused existing helpers, and battle presentation in `webapp/components/battle/` or `webapp/features/playable-battle/`.
- Extend smoke/source-boundary tests so moved invariants are checked in their new owner modules and App-specific checks remain limited to App-owned wiring/orchestration.

**Non-Goals:**

- No backend integration, server runtime, API call, Python `SkillRuntime` dependency, or backend-canonical gameplay path.
- No skill-editor launch, route, query flag, port `8765`, `dist-skill-editor`, or skill-editor preview acceptance evidence.
- No gameplay balance changes, save-schema changes, storage-key changes, copy changes, CSS redesign, new dependencies, or unrelated refactors.
- No one-shot extraction that rewrites battle behavior, target selection, hit timing, damage application, projectile trajectory, chain behavior, damage-zone origin decisions, pickup completion, or map-run progression.

## Decisions

### 1. Extract by ownership risk, not by line count

The extraction order is:

1. Audit and type/constant boundaries.
2. Pure deterministic runtime helpers.
3. Frontend playable skill event builders.
4. Damage/status/resource and lifecycle helpers.
5. Runtime service/hook boundaries only after explicit-input helpers are stable.
6. Final App cleanup and source-boundary test migration.

This avoids creating low-value micro-files and keeps each batch reviewable. A large App is acceptable during intermediate steps if the remaining code is intentionally App-owned.

### 2. Keep App as the state/ref and side-effect owner until a batch explicitly moves ownership

`App.tsx` may continue to own top-level mode routing, cross-domain React state/ref initialization, callback adapters, save/rest/map flow wiring, runtime queue refs, and React state setters until a specific batch defines a focused replacement owner. Extracted pure modules must receive all mutable state as explicit inputs and return data instead of mutating refs or React state.

### 3. Split frontend playable skill runtime into pure builders before orchestration

Frontend playable skill event generation currently spans projectile, chain, module-chain, damage-zone, melee-arc, nova, channel, status, forced movement, hit VFX, floating text, and kill-triggered paths. These should first move into focused event builder/runtime modules that preserve payload contracts and are covered by source and executable smoke tests. Only after the event builders are stable should `consumeSkillEventTimeline`, `consumeSkillEventBatch`, `applyDamageEventBatch`, and scheduling/orchestration be considered for a service or hook boundary.

### 4. Use type-only modules to break App imports

Runtime modules that need `SkillEvent`, `Gem`, `AppState` slices, `PlayerRuntimeState`, `Enemy`, `DropPrompt`, VFX shapes, or map progression shapes must import those from thin `webapp/types/` modules or focused existing type owners. Type modules must not import generated data, browser APIs, storage helpers, React state, or runtime behavior.

### 5. Test behavior where ownership moves

Smoke tests must read the owning source file for protected invariants. When a helper moves out of App, `webapp/smoke-test.mjs` should read that module and keep an equivalent invariant check. For runtime helpers that can execute independently, add focused smoke execution cases covering representative projectile, chain, damage-zone, melee-arc, nova, status, forced-movement, damage, resource, and lifecycle behavior.

### 6. Visual verification remains the playable WebApp

Any batch that can affect rendering or interaction must launch or match the project `run.bat` flow and verify the actual playable WebApp battle/rest/inventory surface. Screenshots and logs must be stored under `artifacts/`; no root-level artifacts are acceptable.

## Risks / Trade-offs

- Runtime helper extraction accidentally changes event payload shape -> Preserve source-text checks for payload tokens and add executable representative builder tests before changing consumers.
- A new module imports from `App.tsx` for convenience -> Keep and extend smoke guards that fail on extracted module App imports.
- A runtime hook becomes a second gameplay path -> Require extracted orchestration to be consumed by the existing playable App path and forbid duplicate target selection, damage application, projectile decisions, and event consumption.
- Batch diffs become too large to review -> Commit each completed batch after build/test/OpenSpec validation and visual verification when frontend behavior is affected.
- App remains large after early batches -> Treat size as a signal, but stop only when remaining code is intentionally App-owned or explicitly deferred with notes; do not create trivial wrappers solely for line count.
- Legacy tests may still read old App-local code -> Update tests in the same batch as ownership moves and document any unrelated pre-existing failures instead of weakening invariants.

## Migration Plan

1. Establish baseline audit of current App runtime/types/constants responsibilities and current smoke checks that read App-owned functions.
2. Move shared type-only shapes and stable runtime constants needed by later modules.
3. Extract pure playable skill runtime helper families and event builders into `webapp/runtime/` modules with focused tests.
4. Extract deterministic damage/status/resource/lifecycle helpers while App still owns state mutation and event consumption.
5. Introduce focused orchestration service or hook boundaries only for tightly related runtime flows with explicit dependencies.
6. Update smoke/source-boundary tests after each ownership move.
7. Run build, smoke, OpenSpec validation, and playable WebApp verification per batch.
8. Record final remaining App responsibilities and intentionally deferred runtime ownership.

Rollback is normal git revert per batch. Because the change is behavior-preserving and client-only, each batch should be independently revertible without schema migration or data cleanup.
