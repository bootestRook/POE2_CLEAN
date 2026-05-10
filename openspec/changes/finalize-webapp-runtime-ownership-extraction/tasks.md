## 1. Baseline And Ownership Map

- [x] 1.1 Inspect current `webapp/App.tsx`, `webapp/runtime/`, `webapp/types/`, `webapp/smoke-test.mjs`, and docs to identify the exact dependencies of `consumeSkillEventTimeline`, `consumeScheduledSkillEvents`, `updateActiveDamageZones`, `consumeSkillEventBatch`, and `applyDamageEventBatch`.
- [x] 1.2 Update the runtime ownership notes in `docs/webapp-app-decomposition-map.md` before code movement so the target owner modules, App-owned refs/state, and intentionally deferred wiring are explicit.
- [x] 1.3 Confirm no active worktree changes are unrelated to this pass before editing, and preserve any user changes encountered during implementation.

## 2. Extract Skill Event Consumption Boundary

- [x] 2.1 Create a focused client-side runtime owner for skill event timeline and batch consumption with explicit dependency inputs from App.
- [x] 2.2 Move timeline scheduling, scheduled event consumption, immediate event batching, active damage-zone tick routing, projectile follow-up suppression, VFX queue updates, status routing, forced movement routing, floating text routing, and damage-event routing into the event-consumption owner without changing behavior.
- [x] 2.3 Keep event builders separate from event consumption and verify the event consumer does not duplicate target selection, hit timing, projectile trajectory, damage-zone origin, chain target selection, damage amount generation, or event payload construction.
- [x] 2.4 Update App wiring so `webapp/App.tsx` imports the event-consumption owner and passes existing refs, setters, state snapshots, and callbacks explicitly.
- [x] 2.5 Migrate smoke/source checks for event-consumption invariants from App-location checks to owner-module checks.

## 3. Verify Event Consumption Boundary

- [x] 3.1 Run focused source/runtime checks for scheduled queue handling, active damage-zone routing, projectile follow-up suppression, status routing, forced movement routing, VFX queue updates, and damage-event routing.
- [x] 3.2 Run `cmd /c npm run build`, `npm test`, and OpenSpec validation for this change.
- [x] 3.3 Launch or match the project `run.bat` WebApp flow, exercise the actual playable battle view, capture screenshots under `artifacts/screenshots/`, and describe visible projectiles, damage zones, hit feedback, status or movement feedback, and combat UI behavior.
- [x] 3.4 Stop and fix any behavior, import, backend-coupling, skill-editor-acceptance, or root-artifact issue before starting damage application extraction.

## 4. Extract Damage Application Boundary

- [x] 4.1 Create a focused client-side runtime owner for damage batch application with explicit dependencies for enemy state mutation, player recovery, drops, combat logs, kill counters, and event recursion.
- [x] 4.2 Move `applyDamageEventBatch` behavior while preserving damage projection, HP mutation, energy-shield mutation, culling, kill detection, player on-hit recovery, enemy retention, combat-log updates, kill counters, drop spawning, and recursive on-kill event routing.
- [x] 4.3 Route on-kill follow-up events through the single event-consumption owner and verify no separate damage queue, alternate damage application path, duplicate floating-text path, or backend/runtime service call is introduced.
- [x] 4.4 Preserve existing damage helper formulas, roll keys, resource ordering, status interactions, and return shapes without gameplay rebalance.
- [x] 4.5 Migrate smoke/source checks for damage-application invariants from App-location checks to owner-module checks.

## 5. Verify Damage Application Boundary

- [x] 5.1 Run focused source/runtime checks for damage helper usage, enemy mutation, player on-hit recovery, drop spawning, combat-log side effects, and recursive on-kill event routing.
- [x] 5.2 Run `cmd /c npm run build`, `npm test`, and OpenSpec validation for this change.
- [x] 5.3 Launch or match the project `run.bat` WebApp flow, exercise the actual playable battle view, capture screenshots under `artifacts/screenshots/`, and describe visible damage numbers, enemy damage/death, drops or progression feedback, and combat log behavior.
- [x] 5.4 Stop and fix any behavior, import, backend-coupling, skill-editor-acceptance, duplicate-runtime, or root-artifact issue before evaluating battle-loop extraction.

## 6. Evaluate Optional Battle Loop Wiring

- [x] 6.1 Reassess `stepGame` after event consumption and damage application are extracted; document whether a narrow battle-loop owner is now obvious and useful.
- [x] 6.2 If battle-loop extraction is still broad, leave `stepGame` in `webapp/App.tsx` and record it as intentionally App-owned shell/wiring orchestration.
- [x] 6.3 Not applicable: battle-loop extraction is not narrow, so no battle-loop wiring moved.
- [x] 6.4 Not applicable: no battle-loop code moved, and existing smoke/source checks continue to cover `stepGame` as intentionally App-owned orchestration.

## 7. Final Acceptance And Stop Condition

- [x] 7.1 Update `docs/webapp-module-boundaries.md` and `docs/webapp-app-decomposition-map.md` to describe the final App shell/wiring boundary and the runtime owner modules.
- [x] 7.2 Run `openspec validate finalize-webapp-runtime-ownership-extraction --strict`, `cmd /c npm run build`, `npm test`, and all focused runtime/source checks.
- [ ] 7.3 Run final playable WebApp browser verification through the `run.bat` flow, capture screenshots under `artifacts/screenshots/`, store logs under `artifacts/logs/` if captured, and ensure no verification artifacts remain in the repository root.
- [ ] 7.4 Review the final diff to confirm it contains no backend calls, server runtime behavior, duplicate gameplay runtimes, save-schema changes, storage-key changes, CSS redesign, copy changes, gameplay balance changes, unrelated refactors, root-level screenshots, or root-level logs.
- [ ] 7.5 Mark this App decomposition effort complete once App is shell/routing/state-ref/callback wiring plus documented deferred orchestration, even if `webapp/App.tsx` remains large.
