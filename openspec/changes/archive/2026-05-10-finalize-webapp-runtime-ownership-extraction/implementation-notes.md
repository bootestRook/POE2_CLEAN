## Runtime Ownership Baseline

### Task 1.1 Dependency Inspection

Current owner locations in `webapp/App.tsx`:

- `consumeSkillEventTimeline(events)` at the skill runtime consumption boundary.
- `consumeScheduledSkillEvents(dt)` for scheduled event queue advancement.
- `updateActiveDamageZones(dt)` for active damage-zone runtime tick consumption.
- `consumeSkillEventBatch(events)` for visual queue updates, status and movement routing, projectile follow-up suppression, and damage event routing.
- `applyDamageEventBatch(events)` for enemy resource mutation, kill handling, drops, combat logs, and on-kill event recursion.

Existing reusable modules:

- `webapp/types/skillEventTypes.ts` owns `SkillEvent`.
- `webapp/types/combatRuntimeTypes.ts` owns `ScheduledSkillEvent`, `PlayerRuntimeState`, `FireBolt`, `DamageZoneVfx`, `HitVfx`, `FloatingText`, `AreaNova`, `MeleeArcVfx`, `ChainSegmentVfx`, and other battle runtime view types.
- `webapp/types/damageZoneRuntimeTypes.ts` owns `ActiveDamageZoneRuntime`.
- `webapp/types/enemyTypes.ts` owns `Enemy` and `EnemyBuff`.
- `webapp/runtime/damageZoneLifecycleRuntime.ts` already owns pure active damage-zone lifecycle helpers.
- `webapp/runtime/enemyDamageRuntime.ts` already owns deterministic enemy damage/resource helpers.
- `webapp/runtime/frontendPlayableSkillEventBuilders.ts` already owns frontend event builder families; these must remain separate from the event consumer.

Current smoke-test ownership checks:

- `webapp/smoke-test.mjs` checks `consumeSkillEventTimeline`, `consumeScheduledSkillEvents`, `updateActiveDamageZones`, `consumeSkillEventBatch`, `applyDamageEventBatch`, and `stepGame` directly in `webapp/App.tsx`.
- These checks must migrate with each moved owner instead of being deleted.

Observed extraction dependency shape:

- Event consumption depends on scheduled event refs, active damage-zone refs, visual queue setters, player/enemy snapshots, projectile helper functions, status handlers, forced-movement handler, damage application routing, and ID refs for runtime visuals.
- Damage application depends on enemy state refs/setters, damage helper formulas, player recovery, kill/drop side effects, on-kill event creation, combat logs, and recursive event consumption.
- `stepGame` has the broadest dependency surface and should remain App-owned unless event and damage extraction make a narrow owner obvious.

### Task 1.3 Worktree Baseline

- Branch: `main`.
- Worktree check before runtime code movement: clean.
- Latest commits before code movement:
  - `4c4d3d1 Document final runtime ownership boundaries`
  - `6b29d64 Add runtime ownership extraction plan`
- No unrelated user changes were present at the start of runtime extraction.

### Task 2.3 Event Consumer Boundary Check

- `webapp/runtime/skillEventConsumerRuntime.ts` does not import or reference `frontendPlayableSkillEventBuilders`.
- Source search found no `buildFrontend*`, `releaseFrontendPlayableSkill`, `frontendNearestSkillTargets`, `frontendUniqueTargetsByDistance`, `frontendDamageEventsForTarget`, `/api/`, or `fetch(` references in the event consumer owner.
- Projectile trajectory and damage amount decisions remain behind injected helpers such as `liveMonsterProjectileTrajectoryForEvent` and `damageEventAmountAgainstEnemy`; the consumer routes events and side effects rather than rebuilding skill event payloads.
- Event builder families remain separate in `webapp/runtime/frontendPlayableSkillEventBuilders.ts`.

### Task 3.1 Event Consumer Focused Checks

- Source checks confirmed `skillEventConsumerRuntime.ts` owns scheduled queue advancement, active damage-zone tick consumption, projectile follow-up suppression state, status routing, forced movement routing, VFX queue setters, and damage-event routing.
- Source checks confirmed `App.tsx` wires the event consumer owner through `createSkillEventConsumerRuntime` with explicit refs, setters, and callbacks.
- `npm test` passed after migrating owner checks.

### Task 3.2 Event Consumer Build/Test/OpenSpec Verification

- `cmd /c npm run build` passed.
- `npm test` passed.
- `openspec validate finalize-webapp-runtime-ownership-extraction --strict` passed.

### Task 3.3 Event Consumer Playable WebApp Verification

- Started the WebApp through `run.bat`; runner output was stored under `artifacts/logs/run-webapp-event-consumer-out.log` and `artifacts/logs/run-webapp-event-consumer-err.log`.
- Verified the actual WebApp at `http://127.0.0.1:8766/`.
- Captured playable screenshots under `artifacts/screenshots/`, including `event-consumer-playable-battle-active.png`, `event-consumer-playable-battle-corner.png`, and `event-consumer-playable-battle-vfx.png`.
- Visible result: the playable battle/map view rendered with terrain, player HUD/resource bars, minimap, procedural spawn debug panel, combat feed, and the corner monster debug scenario. Combat feed showed automatic player skill release, monster melee/skill hits, enemy kills, item drops, and boss/monster skill messages after event consumption moved to the runtime owner.
- The verification did not use `/skill-editor`, `?skill_editor=1`, `view=skill_editor`, port `8765`, or `dist-skill-editor`.

### Task 3.4 Event Consumer Gate Before Damage Extraction

- Worktree check before damage extraction: clean.
- `npm test` passed.
- `openspec validate finalize-webapp-runtime-ownership-extraction --strict` passed.
- Root artifact check found no root-level screenshots or logs.
- Coupling searches found no `from "../App"`, `from "./App"`, `/api/`, `fetch(`, skill-editor route, `dist-skill-editor`, or port `8765` usage in `webapp/runtime/skillEventConsumerRuntime.ts`.
- Matches in `webapp/smoke-test.mjs` and OpenSpec artifacts are guard/check text, not playable runtime coupling.
