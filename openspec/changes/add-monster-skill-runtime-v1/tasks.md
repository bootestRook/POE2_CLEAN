## 1. Config And Coverage

- [x] 1.1 Choose the local monster skill config format and add schema/validation helpers for skill ids, module ids, Chinese skill-form descriptions, finite ranges, cooldowns, and projectile speed budgets.
- [x] 1.2 Add first-pass local monster skill definitions for normal, magic, rare, legendary boss, and supreme boss tiers.
- [x] 1.3 Assign every current monster id from `configs/monsters/monster_defs.toml` to exactly one skill id or boss pattern id.
- [x] 1.4 Encode the Chinese skill-form descriptions from `design.md` into the local monster skill config.
- [x] 1.5 Add validation that rejects missing monster ids, missing skill ids, duplicate assignments, invalid module ids, invalid ranges, and invalid cooldowns.
- [x] 1.6 Add validation that every legendary and supreme boss pattern defines at least three configured skills.
- [x] 1.7 Add validation that every major boss skill defines finite positive `initial_cooldown_ms` and `cooldown_ms`.

## 2. Runtime Data Plumbing

- [x] 2.1 Extend frontend monster spawn materialization so runtime enemies can carry monster skill identity, boss pattern identity, range data, cooldown data, and module params from local config.
- [x] 2.2 Preserve client-only boundaries by loading monster skill data from local frontend code/static config only.
- [x] 2.3 Add runtime state for monster skill cooldowns, aggro-start timestamps, in-progress releases, and boss major-skill initial cooldown timing.
- [x] 2.4 Ensure skill cooldown timers start only after aggro where required and do not advance for dormant, non-aggro player-targeting skills.

## 3. Monster Skill Dispatcher

- [x] 3.1 Add a frontend monster skill dispatcher that evaluates alive, aggro-locked monsters each runtime tick.
- [x] 3.2 Gate every release by `min_cast_range`, `cast_range`, cooldown readiness, aggro state, and player life state.
- [x] 3.3 Enforce `effect_range` for projectile travel, damage-zone placement, melee arc radius, charge distance, ambush displacement, guard radius, and support radius.
- [x] 3.4 Enforce `leash_range` at hit resolution so remote or stale skill hits cannot damage the player.
- [x] 3.5 Keep existing runtime melee cadence as fallback only for monsters whose skill is unavailable, too close, too far, or on cooldown.

## 4. Reusable Module Implementation

- [x] 4.1 Implement or adapt `monster_projectile` using existing projectile event consumption and player-hit payloads.
- [x] 4.2 Implement or adapt `monster_damage_zone` using existing boss warning/damage-zone style event consumption and player mitigation.
- [x] 4.3 Implement `monster_melee_arc` for finite close-range arc presentation and player damage.
- [x] 4.4 Implement `monster_charge` with windup, finite dash distance, collision/impact timing, and player mitigation.
- [x] 4.5 Implement `monster_ambush` with finite reposition distance, delayed close hit, and no offscreen/full-map teleport.
- [x] 4.6 Implement `monster_guard` for self or nearby ally defensive effects with finite duration and cooldown.
- [x] 4.7 Implement `monster_support` for nearby ally buffs or assists with finite ally radius and no full-map effect.
- [x] 4.8 Implement data-driven `monster_boss_pattern` scheduling for at least three skills per boss, including major-skill initial cooldowns from aggro start.

## 5. Projectile And Counterplay Tuning

- [x] 5.1 Enforce non-boss projectile speed cap at 500 px/s.
- [x] 5.2 Enforce boss projectile speed cap at 600 px/s unless explicit warning/windup counterplay is configured and validated.
- [x] 5.3 Validate fast projectiles above 500 px/s against counterplay fields such as warning time, windup, collision width, projectile count, and cooldown.
- [x] 5.4 Tune projectile distance, lifetime, width, count, and cooldown for each projectile monster skill against the 250 px/s player speed baseline.
- [x] 5.5 Tune boss barrage skills so high projectile count uses lower projectile speed or longer warning windows.

## 6. Boss Pattern Content

- [x] 6.1 Configure all 10 legendary boss patterns with at least three skills each.
- [x] 6.2 Configure all 6 supreme boss patterns with at least three skills each.
- [x] 6.3 Mark each boss pattern's major skill and set aggro-start `initial_cooldown_ms`.
- [x] 6.4 Ensure major skills use normal `cooldown_ms` after release instead of restarting from initial cooldown.
- [x] 6.5 Give legendary and supreme bosses distinguishable skill cadence, range profile, projectile profile, phase marker, or presentation.

## 7. Tests

- [x] 7.1 Add config tests proving all 40 monsters have skill assignments and Chinese skill-form descriptions.
- [x] 7.2 Add config tests proving finite `cast_range`, optional `min_cast_range`, `effect_range`, and `leash_range` are present and valid.
- [x] 7.3 Add config tests proving projectile speeds obey non-boss and boss caps.
- [x] 7.4 Add runtime tests proving monsters do not release skills outside `cast_range` or inside invalid `min_cast_range`.
- [x] 7.5 Add runtime tests proving `effect_range` limits travel, placement, and target search.
- [x] 7.6 Add runtime tests proving `leash_range` prevents stale remote hits.
- [x] 7.7 Add runtime tests proving monster skill hits use existing player defensive mitigation, block, resistance, energy shield, and life paths.
- [x] 7.8 Add boss tests proving each boss has at least three skills and major skills wait for aggro-start initial cooldown before first release.
- [x] 7.9 Add boundary tests proving playable monster skills do not call backend APIs, server runtimes, Python `SkillRuntime`, or the skill editor.

## 8. Verification

- [x] 8.1 Run focused monster config and runtime tests.
- [x] 8.2 Run `node webapp/smoke-test.mjs`.
- [x] 8.3 Run `cmd /c npm run build`.
- [x] 8.4 Start the local WebApp and verify representative normal, magic, rare, legendary boss, and supreme boss skills in the actual playable battle view.
- [x] 8.5 Capture browser screenshots under `artifacts/screenshots/` and describe visible projectile, melee, damage-zone, charge/ambush, support/guard, and boss major-skill behavior.
