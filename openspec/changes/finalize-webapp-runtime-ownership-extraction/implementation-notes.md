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
