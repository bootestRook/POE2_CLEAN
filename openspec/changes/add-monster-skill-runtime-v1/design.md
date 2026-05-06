## Context

The project is client-only. The playable WebApp already resolves procedural monster stats, aggro, melee cadence, boss projectiles, boss damage zones, player defensive mitigation, skill event consumption, hit VFX, floating text, and local frontend skill families. It does not yet have a reusable monster skill runtime for all configured monsters.

The 40 monster definitions already carry `monster_type`, `skill_shape`, `movement_kind`, visual identity, rarity, and base stats. Spawn runtime materializes `monsterType`, `skillShape`, damage type, attack range, cadence, and modifiers into `Enemy`. Bosses currently use hardcoded timers and hardcoded projectile/area/barrage events, while non-boss monsters mostly use melee attack cadence.

This change should turn monster skills into local static data plus frontend runtime modules, not backend calls or Python runtime evidence.

## Goals / Non-Goals

**Goals:**

- Give every configured monster a skill identity that fits its visual/type identity.
- Keep monster skills finite, readable, and counterplayable through explicit cast range, minimum range, effect range, and leash/cancel range.
- Keep projectile speeds bounded relative to the current player move speed of 250 px/s.
- Reuse existing frontend event consumption and player defensive mitigation paths.
- Split monster skill behavior into reusable modules rather than per-monster hardcoded branches.
- Add focused tests proving config coverage, range gates, projectile speed caps, module dispatch, and client-only boundaries.
- Verify representative monster skills in the actual playable WebApp battle view.

**Non-Goals:**

- No backend gameplay service, web API call, server runtime, or Python `SkillRuntime` dependency for playable monster skills.
- No skill editor use as a verification surface.
- No 2.5D/isometric/perspective-squashed gameplay visuals.
- No full behavior tree, threat table, patrol rewrite, or broad enemy navigation redesign.
- No final balance pass for all numbers beyond establishing safe, testable first-pass ranges and speed budgets.
- No replacement of player skill runtime as part of this change.

## Decisions

1. Monster skills are local data plus frontend modules.

   Add a local static monster skill config, such as `configs/monsters/monster_skills.toml` or JSON, and parse/materialize it into frontend runtime data beside existing monster definitions. Each monster definition must resolve to a skill id or boss pattern id.

   Rationale: the repo requires client-only gameplay, and current spawn runtime already consumes local monster config. Keeping skill data local makes it testable and avoids reintroducing backend coupling.

   Alternative considered: encode behavior only in `App.tsx` based on monster id. Rejected because 40 monsters would create large hardcoded branches and make reuse/testing difficult.

2. Reuse frontend event families before adding mechanisms.

   Map monster skill modules onto existing event consumers wherever possible:
   - projectile -> `projectile_spawn` with player-hit payloads similar to boss projectiles
   - damage zone -> `damage_zone_prime`/`damage_zone` plus pending player hit checks
   - melee arc -> runtime-owned close-range player hit plus arc presentation
   - guard/support -> existing buff/status style state where possible
   - hit VFX/floating text -> existing visual budgeted queues

   Rationale: the project already has event scheduling, VFX rendering, and player defensive mitigation. The monster layer should adapt those paths, not duplicate combat math.

   Alternative considered: reuse player `SkillPreview` objects directly for monsters. Rejected for the first pass because player skills target enemies and carry player-specific mana/equipment/scaling concerns; monster skills need smaller purpose-built config while sharing lower-level event consumers.

3. Add only missing monster modules.

   New reusable modules should be limited to behavior not covered cleanly by current paths:
   - `monster_charge`: range-gated windup, finite dash distance, impact player hit
   - `monster_ambush`: range-gated short reposition/phase, delayed close hit, finite max displacement
   - `monster_guard`: self or ally defensive buff with finite duration/cooldown
   - `monster_support`: nearby ally buff or tactical assist with finite ally radius
   - `monster_boss_pattern`: data-driven orchestration of projectile, zone, charge, ambush, guard, and support phases

   Rationale: these match existing monster `skill_shape` values while keeping the module set small.

   Alternative considered: add one bespoke function per monster. Rejected because it prevents shared validation for range and projectile speed constraints.

4. Skill range is a first-class schema concern.

   Every skill definition must declare:
   - `cast_range`: maximum distance from monster to valid player target before release can start
   - `min_cast_range`: optional lower bound, especially for charge and ranged pressure
   - `effect_range`: actual maximum travel, dash, zone placement, aura, or impact reach
   - `leash_range`: maximum distance after which an in-progress release cancels or refuses player hit

   Rationale: previous boss targeting constants are coarse. Per-skill range prevents full-map targeting and makes skills fit their design.

   Alternative considered: use monster `attack_range` as every skill's range. Rejected because melee, projectile, charge, support, and boss phases need different gates.

5. Projectile speed is budgeted against 250 px/s player movement.

   Baseline limits:
   - normal/magic/rare monster projectile speed must be at or below 500 px/s
   - boss projectile speed must be at or below 600 px/s unless the skill has explicit warning or windup and remains capped by validation
   - projectiles above 500 px/s need counterplay constraints such as warning, windup, low width, low count, or longer cooldown

   Rationale: with a 250 px/s player, extremely fast projectiles become unavoidable without prediction. Speed, width, count, cooldown, and warning time must be validated together.

   Alternative considered: keep existing hardcoded boss projectile speed as the universal default. Rejected because it does not account for projectile count, warning, or monster tier.

6. Boss patterns become data-driven but keep existing semantics as reusable references.

   Existing boss projectile, warning area, and circular barrage behavior should be moved or wrapped behind boss pattern modules. Individual bosses can combine pattern steps with different ranges, cooldowns, projectile counts, zone radii, and warnings.

   Rationale: this preserves the known playable boss event path while letting all 16 boss definitions have distinct identities.

   Alternative considered: leave boss skills hardcoded and only add non-boss skills. Rejected because the user asked for all monsters, and boss identity is part of the 40 configured monsters.

## Risks / Trade-offs

- [Risk] A large first pass touches too much `App.tsx`. -> Mitigation: extract or add small frontend runtime helpers by module family and keep existing event consumers intact.
- [Risk] Range validation becomes disconnected from actual event behavior. -> Mitigation: tests must exercise release gating and player-hit refusal beyond `leash_range`, not only config field presence.
- [Risk] Projectile speed caps feel too conservative for bosses. -> Mitigation: allow boss-specific exceptions only with explicit warning/windup constraints and browser verification.
- [Risk] Support and guard skills may be invisible or hard to validate visually. -> Mitigation: include combat log, buff state, VFX, or debug-safe visual evidence for representative guard/support releases.
- [Risk] Data-driven boss patterns accidentally alter existing boss pressure. -> Mitigation: characterize current boss projectile/area behavior before refactor and keep rollback path to existing hardcoded helpers.
- [Risk] Existing active change `harden-frontend-skill-runtime-as-playable-source` may rename or extract frontend runtime functions. -> Mitigation: implement after reviewing that change's current state and target the extracted module boundaries if they exist.

## Migration Plan

1. Add monster skill config schema and tests that every monster id resolves to one skill or boss pattern.
2. Materialize monster skill ids and range data into runtime enemies from local config.
3. Add a frontend monster skill dispatcher that checks aggro, cooldown, `min_cast_range`, `cast_range`, and `leash_range`.
4. Implement projectile, melee arc, and damage zone modules by adapting existing boss/player event paths.
5. Add charge, ambush, guard, support, and boss pattern modules as small reusable module families.
6. Assign first-pass skills to all 40 monsters and tune finite ranges/projectile speeds.
7. Add focused tests for finite range gates, projectile speed caps, module dispatch, player mitigation reuse, and client-only boundaries.
8. Run WebApp build/smoke checks and capture playable battle screenshots for representative normal, magic, rare, legendary boss, and supreme boss skills.

Rollback can be per phase: keep existing melee cadence and hardcoded boss helpers active until the replacement module for that family passes tests and browser verification.

## Open Questions

- Whether monster skill config should live in TOML beside `monster_defs.toml` or JSON beside `map_spawn_v1.json`.
- Whether support skills should only buff allies in the same pack or any nearby aggro-locked monster.
- Whether boss patterns should be unlocked by monster id only or by `boss_rarity` plus id-specific overrides.
- Whether future player move-speed changes should drive speed validation from a single shared constant rather than the current 250 px/s baseline.
