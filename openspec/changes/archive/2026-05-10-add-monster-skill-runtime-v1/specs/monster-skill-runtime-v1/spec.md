## ADDED Requirements

### Requirement: Monster skills are client-only local runtime data
The playable WebApp SHALL resolve monster skill assignments, skill ranges, cooldowns, module parameters, and boss patterns from local frontend code, local static config, or local assets.

#### Scenario: Local monster skill assignment
- **WHEN** a configured monster is materialized into a playable runtime enemy
- **THEN** the WebApp SHALL resolve that enemy's monster skill id or boss pattern id from local static data without calling backend gameplay APIs

#### Scenario: No backend skill runtime dependency
- **WHEN** the playable WebApp releases a monster skill
- **THEN** it SHALL NOT call a backend API, server runtime, Python `SkillRuntime`, or server-generated gameplay behavior to generate that skill's events

### Requirement: Every configured monster has a skill identity
Every monster defined in `configs/monsters/monster_defs.toml` SHALL resolve to exactly one first-pass skill identity or boss pattern identity.

#### Scenario: All seed monsters are covered
- **WHEN** monster skill config validation runs against the current 40 monster definitions
- **THEN** each monster id SHALL have one configured skill id or boss pattern id

#### Scenario: Unknown monster skill assignment is rejected
- **WHEN** a monster skill assignment references a missing monster id or missing skill id
- **THEN** validation SHALL fail before the playable WebApp accepts the config

### Requirement: Monster skill modules are reusable
Monster skills SHALL be implemented through reusable module families rather than one-off per-monster runtime branches.

#### Scenario: Skill shape maps to module family
- **WHEN** a monster has a configured `skill_shape`
- **THEN** the runtime SHALL dispatch it through a reusable module family such as melee arc, projectile, damage zone, charge, ambush, guard, support, or boss pattern

#### Scenario: Existing event consumers are reused
- **WHEN** a monster module emits projectile, damage zone, hit VFX, floating text, status, forced movement, or player damage events
- **THEN** those events SHALL be consumed by existing frontend battle event and player mitigation paths where those paths already support the behavior

### Requirement: Monster skill ranges are finite and skill-specific
Every monster skill SHALL define finite range gates appropriate to that skill's design.

#### Scenario: Range fields are required
- **WHEN** a monster skill definition is validated
- **THEN** it SHALL define finite positive `cast_range`, `effect_range`, and `leash_range` values and MAY define `min_cast_range`

#### Scenario: Release requires cast range
- **WHEN** an aggro-locked monster evaluates a skill and the player distance is greater than that skill's `cast_range`
- **THEN** the runtime SHALL NOT start that skill release

#### Scenario: Release respects minimum range
- **WHEN** a skill defines `min_cast_range` and the player is closer than that value
- **THEN** the runtime SHALL NOT start that skill release unless the skill explicitly defines a close-range fallback module

#### Scenario: Effect range limits impact
- **WHEN** a monster skill creates a projectile, dash, damage zone, melee arc, support aura, or boss pattern step
- **THEN** the runtime SHALL limit travel, placement, target search, or hit resolution to that skill's configured `effect_range`

#### Scenario: Leash range cancels remote hits
- **WHEN** the player is outside an in-progress skill's `leash_range` at hit resolution time
- **THEN** the runtime SHALL cancel or refuse the player hit for that skill event

### Requirement: Monster projectiles remain dodgeable relative to player movement
Monster projectile speed, width, count, warning time, and cooldown SHALL be constrained so projectile skills remain readable and dodgeable against a 250 px/s player baseline.

#### Scenario: Non-boss projectile speed cap
- **WHEN** a normal, magic, or rare monster projectile skill is validated
- **THEN** its projectile speed SHALL NOT exceed 500 px/s

#### Scenario: Boss projectile speed cap
- **WHEN** a boss projectile skill is validated
- **THEN** its projectile speed SHALL NOT exceed 600 px/s unless the skill has explicit warning or windup and passes the configured counterplay validation

#### Scenario: Fast projectile requires counterplay
- **WHEN** a monster projectile speed exceeds 500 px/s
- **THEN** the skill SHALL include explicit counterplay such as warning time, windup time, narrow collision width, low projectile count, longer cooldown, or a combination validated by the runtime config checks

#### Scenario: Projectile travel is finite
- **WHEN** a monster projectile is spawned
- **THEN** its max distance and lifetime SHALL be derived from finite skill config rather than map size, screen size, or an unlimited nearest-player query

### Requirement: Monster skills use player defensive mitigation
Monster skills that damage the player SHALL resolve damage through the existing player defensive mitigation path used by monster hits.

#### Scenario: Skill hit uses incoming damage rules
- **WHEN** a monster projectile, melee arc, charge, ambush, damage zone, or boss pattern step hits the player
- **THEN** the final player damage SHALL account for the skill's damage type, hit kind, monster modifiers, player block, resistance, armor, energy shield, and life through the existing player mitigation semantics

#### Scenario: Skill visual feedback uses battle channels
- **WHEN** a monster skill reduces player shield or life
- **THEN** the runtime SHALL present damage feedback through existing battle UI channels such as hit VFX, floating text, and combat logs

### Requirement: Representative monster skills are visually verified
Frontend-affecting monster skill work SHALL be verified in the actual playable WebApp battle view.

#### Scenario: Browser verification captures representative skills
- **WHEN** monster skill implementation changes are completed
- **THEN** verification SHALL run the playable WebApp battle view and capture screenshots for representative normal, magic, rare, legendary boss, and supreme boss skills under `artifacts/screenshots/`

#### Scenario: Skill editor is not a verification surface
- **WHEN** monster skill visuals, targeting guides, damage zones, projectiles, or hit feedback are verified
- **THEN** the disabled skill editor SHALL NOT be opened, served, scripted, or used as evidence
