## Context

The playable WebApp already loads client-side map collision data as `walkableGrid` and `blockerGrid` through `BakedBattleMapData`. Enemy movement also has `enemyHasWalkableLine`, but most battle interactions still select targets or resolve projectile travel through distance-only checks.

The affected paths are cross-cutting:

- Player skills build events from `frontendNearestSkillTargets`, `frontendUniqueTargetsByDistance`, and the playable skill event builders.
- Dynamic damage-zone ticks select targets during event consumption.
- Encounter aggro sources trigger packs through radius checks.
- Monster and boss skills emit projectile events and resolve player hits from in-flight projectile bodies.

The implementation must stay client-only. It must not introduce backend gameplay APIs, backend collision checks, or server-generated combat behavior. It must also respect WebApp module boundaries: new wall interaction logic belongs in focused runtime utilities, while `webapp/App.tsx` should only wire `battleMap` and callback dependencies into those utilities.

## Goals / Non-Goals

**Goals:**

- Define one shared client-side line/blocker query used by projectile travel, target selection, aggro checks, and monster projectile hit legality.
- Stop player, monster, and boss projectiles at the first blocking wall along their travel segment.
- Prevent wall-hidden targets from being selected by player skills, chains, split/secondary hits, and dynamic target scans when those interactions imply direct visibility from an origin.
- Prevent authored encounter aggro sources from locking packs through walls.
- Add runtime tests and playable browser verification that prove the actual battle path uses the wall-blocking rules.

**Non-Goals:**

- Do not add destructible walls, cover damage reduction, door logic, ricochet behavior, or wall-penetrating skill exceptions.
- Do not rebalance skill numbers, monster ranges, projectile speeds, cooldowns, damage, spawn budgets, or loot.
- Do not convert the project to backend-authoritative collision or pathfinding.
- Do not use the disabled skill editor as verification.

## Decisions

### Decision: Extract shared map line blocking into a focused runtime utility

Create a focused client-side helper module, for example `webapp/runtime/battleMapLineBlockerRuntime.ts`, that consumes `BakedBattleMapData | null` and exposes pure functions such as:

- `hasUnblockedBattleLine(map, from, to)`
- `firstBattleLineBlocker(map, from, to, options)`
- `clipBattleLineToBlocker(map, from, to, options)`

The helper should reuse the existing sampling semantics from `enemyHasWalkableLine` but move them out of enemy-specific ownership. If `map` is null, helpers should preserve current behavior by treating the line as unblocked.

Alternative considered: add wall checks directly in every skill and monster function. That would create duplicate sampling rules, make future exceptions inconsistent, and increase the chance that one projectile family still passes through walls.

### Decision: Use wall filtering before event generation where possible

Target selection should filter candidates before events are emitted. This includes initial skill targets, unique target searches, chain next-target searches, split/secondary hit searches, and target-locked damage zone placement.

This keeps damage, VFX, floating text, and follow-up events consistent because blocked targets never enter the event timeline. It also preserves existing damage application code by avoiding late cancellation for most player skill hits.

Alternative considered: emit all events and cancel blocked damage at consumption time. That would leave misleading projectile paths, hit VFX, chain segments, or floating text unless every consumer also received duplicate cancellation logic.

### Decision: Clip projectile travel in the projectile event/visual path

Projectile spawn events should carry an end position that is no farther than the first wall collision point. For projectiles with targeted hit/damage events, the builder should emit hit/damage only when the intended target is reachable before a wall blocker. For monster and boss projectiles, the in-flight projectile body should expire or disable player hits after wall collision.

This covers both visual and mechanical behavior: projectiles should not merely stop drawing while invisible damage continues.

Alternative considered: only clip DOM/canvas projectile rendering. That would still allow hidden damage or player hits through walls.

### Decision: Treat direct visibility as a line from interaction origin to target

The origin depends on the interaction:

- Player projectile and direct skill targeting: projectile spawn point or caster position.
- Chain and split follow-ups: previous hit position or trigger position.
- Damage-zone target-lock selection: zone origin or caster, depending on the existing policy.
- Encounter aggro source: source center or pack source position to the player's current position.
- Monster projectiles: monster/source current position to the player or projectile travel endpoint.

Area effects that already exist at a valid origin may still use their shape rules, but any target acquisition step that selects an enemy by radius must use the line-blocking helper from the acquisition origin.

### Decision: Keep App.tsx as dependency wiring only

The implementation may need `App.tsx` to pass `battleMap` or a prebuilt wall-query callback into existing runtime builders and consumers. Any new collision rules, target filtering functions, projectile clipping functions, and tests should live in focused runtime modules.

If App changes would exceed simple wiring, the implementation should first extract a focused owner module instead of adding feature-owned gameplay logic to App.

## Risks / Trade-offs

- Risk: Sampling misses thin diagonal blockers or corner cases. Mitigation: use a step size tied to map grid size and add tests for straight, diagonal, corner, and null-map cases.
- Risk: Projectiles that previously hit through walls will feel weaker in some layouts. Mitigation: this is intended behavior; do not compensate by changing damage, range, cooldown, or projectile speed in this change.
- Risk: Dynamic zone filtering may change edge cases for AoE around corners. Mitigation: limit filtering to target acquisition from a defined origin and document the origin used in tests.
- Risk: Boss projectile patterns may terminate early in tight rooms and reduce pressure. Mitigation: validate representative normal, rare, legendary boss, and supreme boss projectile behavior visually in playable battle.
- Risk: Runtime builders currently receive limited map context. Mitigation: inject narrow wall-query dependencies rather than importing App state into runtime modules.
