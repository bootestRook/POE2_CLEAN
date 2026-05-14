## 1. Shared Wall Query Runtime

- [x] 1.1 Create a focused client-side battle map line-blocking runtime helper that consumes `BakedBattleMapData | null` and exposes unblocked-line, first-blocker, and clipped-segment queries.
- [x] 1.2 Move or adapt the existing enemy walkable-line sampling semantics so enemy movement and new battle interaction checks use compatible blocker rules.
- [x] 1.3 Add focused tests for unblocked lines, wall-blocked lines, diagonal/corner samples, out-of-bounds samples, and null-map fallback behavior.

## 2. Player Skill Targeting and Projectile Blocking

- [x] 2.1 Wire the shared wall query into player skill initial target selection without adding feature-owned gameplay logic to `webapp/App.tsx`.
- [x] 2.2 Filter wall-blocked targets for unique target searches used by chain, split, secondary hit, target-locked damage-zone, melee/direct, and dynamic tick acquisition paths.
- [x] 2.3 Clip player projectile travel endpoints to the first wall blocker and suppress hit, damage, hit VFX, floating text, split, secondary, and kill-triggered follow-ups for blocked targets.
- [x] 2.4 Stop moving dynamic projectile tick runtimes at wall blockers so they cannot tick or select targets beyond blocked terrain.
- [x] 2.5 Add frontend runtime tests proving a blocked projectile target and a blocked chain or follow-up target are not damaged.

## 3. Monster Aggro and Monster Projectile Blocking

- [x] 3.1 Gate authored and procedural encounter aggro source triggers with the shared wall query before adding source ids to the triggered source set.
- [x] 3.2 Gate nearby individual aggro source propagation so wall-hidden monsters do not trigger their whole pack through walls.
- [x] 3.3 Apply shared wall checks to direct monster projectile release where the skill targets the player directly.
- [x] 3.4 Clip monster, boss, and supreme boss projectile travel to wall blockers and disable player-hit checks after projectile wall collision.
- [x] 3.5 Add frontend runtime tests proving blocked monster or boss projectiles cannot damage the player.

## 4. App Boundary and Integration

- [x] 4.1 Keep `webapp/App.tsx` changes limited to importing focused runtime helpers and passing `battleMap` or narrow wall-query callbacks into existing runtime builders/consumers.
- [x] 4.2 If App wiring would exceed simple composition, extract a focused owner module before adding the wall-blocking behavior.
- [x] 4.3 Ensure the implementation does not add backend APIs, backend runtime calls, server-generated gameplay behavior, skill-editor verification paths, or root-level verification artifacts.

## 5. Verification

- [x] 5.1 Run the relevant frontend/runtime tests and any existing smoke checks covering skill runtime, monster aggro, monster projectile, and client-only gameplay boundaries.
- [x] 5.2 Run the frontend through the project root `run.bat` flow and verify wall-blocked behavior in the actual playable WebApp battle view.
- [x] 5.3 Capture a screenshot under `artifacts/screenshots/` showing the playable battle result and describe what is visible.
- [x] 5.4 Run `openspec validate block-projectiles-targeting-aggro-by-walls` and resolve any proposal/spec/task issues.
