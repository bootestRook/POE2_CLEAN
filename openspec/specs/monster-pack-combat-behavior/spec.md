# monster-pack-combat-behavior Specification

## Purpose
TBD - created by archiving change add-monster-pack-chase-damage. Update Purpose after archive.
## Requirements
### Requirement: Monster offense attributes
Runtime monsters SHALL have explicit offense attributes compatible with the existing player combat stat vocabulary.

#### Scenario: Runtime enemy includes offense context
- **WHEN** a monster is created from procedural spawn pack data
- **THEN** the runtime enemy SHALL include base damage, damage type, hit kind, attack range, attack cadence, and any available damage modifiers needed to compute its outgoing hit

#### Scenario: Offense attributes use shared stat ids
- **WHEN** monster damage modifiers are configured or materialized into runtime data
- **THEN** modifier ids SHALL use existing player stat ids where applicable, such as `damage_add_percent`, damage-type add percent stats, hit-kind damage add percent stats, `damage_final_percent`, and `resistance_penetration_percent`

#### Scenario: Safe default offense
- **WHEN** a monster or pack lacks explicit offense attributes beyond the existing pack damage value
- **THEN** the runtime SHALL treat the monster as a physical melee attack using the pack damage value and rarity damage multiplier

### Requirement: Monster hits use player defensive counterplay
Monster damage to the player SHALL be resolved against the player's defensive attributes instead of directly subtracting raw damage from life.

#### Scenario: Player defense reduces incoming monster hit
- **WHEN** an aggro-locked monster lands a melee hit on the player
- **THEN** the final player damage SHALL account for the monster's damage type and hit kind and the player's relevant block, resistance, physical damage reduction, final mitigation, energy shield, and life values

#### Scenario: Damage type selects resistance
- **WHEN** a monster hit uses fire, cold, lightning, chaos, or physical damage
- **THEN** the player's corresponding resistance or physical reduction rules SHALL affect the final damage using the same semantics as player incoming hit resolution

#### Scenario: Hit kind selects block type
- **WHEN** a monster hit declares `hit_kind = attack`
- **THEN** the player's attack block attributes SHALL be used for block mitigation

#### Scenario: Monster damage feedback
- **WHEN** a monster hit reduces player shield or life
- **THEN** the runtime SHALL update player HP/shield state and present damage feedback through existing battle UI channels such as combat logs or floating text

### Requirement: Aggro-locked monsters charge directly
Aggro-locked monsters SHALL chase the player's current position directly and SHALL NOT use player-body repulsion, ring-position targeting, or close-range avoidance-style side steering to avoid the player.

#### Scenario: Close-range chase targets player
- **WHEN** an aggro-locked monster is within close range of the player
- **THEN** its movement target SHALL remain the player's current world position rather than a ring slot around the player

#### Scenario: No player repulsion
- **WHEN** an aggro-locked monster overlaps or nearly overlaps the player's body radius
- **THEN** the movement solver SHALL NOT add a force that intentionally moves the monster away from the player

#### Scenario: No close-range side avoidance
- **WHEN** an aggro-locked monster is outside melee range but close enough to approach contact directly
- **THEN** the movement solver SHALL NOT select tangential steering that preserves or increases its distance from the player when a direct walkable approach is available

#### Scenario: Collision safeguards remain
- **WHEN** multiple aggro-locked monsters charge the player
- **THEN** enemy-enemy separation and wall collision safeguards MAY still prevent impossible overlap or blocked-terrain traversal

### Requirement: Monster melee attack cadence
Monsters SHALL damage the player through runtime-owned melee attack cadence rather than continuous per-frame proximity damage or visual-synchronization side effects.

#### Scenario: Hit requires attack readiness
- **WHEN** a monster is aggro-locked, alive, in melee range, and its runtime attack cooldown is ready
- **THEN** the monster SHALL be able to start an attack that schedules or applies one player damage hit for that attack cycle

#### Scenario: No frame damage
- **WHEN** a monster remains in melee range across multiple frames during one attack cooldown
- **THEN** the runtime SHALL NOT apply monster damage every frame

#### Scenario: Player movement is not required
- **WHEN** the player provides no movement input while a ready aggro-locked monster is in melee range
- **THEN** the monster attack cadence SHALL still apply its hit through the runtime combat update

### Requirement: Baseline monster speed multiplier
Monster chase speed SHALL be doubled for the first tuning pass.

#### Scenario: Normal monster speed doubles
- **WHEN** a normal runtime monster chases the player
- **THEN** its baseline chase speed SHALL be twice the previous normal monster baseline

#### Scenario: Boss monster speed doubles
- **WHEN** a boss runtime monster chases the player
- **THEN** its baseline chase speed SHALL be twice the previous boss monster baseline

### Requirement: Monster type combat behavior
Monster combat behavior SHALL consume `monster_type`, `skill_shape`, and monster skill identity through existing client-side battle paths.

#### Scenario: Type affects movement speed
- **WHEN** a monster chases the player
- **THEN** its chase speed SHALL be derived from the type default and instance modifiers instead of only the legacy boss/non-boss split

#### Scenario: Type affects attack range and cadence
- **WHEN** a monster evaluates whether it can attack
- **THEN** its attack range and attack cadence SHALL reflect its `monster_type` defaults plus instance overrides

#### Scenario: Type affects skill shape family
- **WHEN** a monster releases a type-specific skill shape
- **THEN** the skill shape SHALL come from the monster type configuration or boss identity configuration

#### Scenario: Skill shape uses finite configured skill ranges
- **WHEN** a monster evaluates a configured skill shape release
- **THEN** the runtime SHALL apply that skill's finite cast range, minimum range, effect range, and leash range instead of using unlimited player targeting

### Requirement: Monster type behavior remains client-only
Monster type behavior and monster skill behavior SHALL be implemented in the existing client-side WebApp runtime without backend APIs or server runtime dependencies.

#### Scenario: No backend behavior source
- **WHEN** monster type stats, skill shape defaults, skill assignments, range gates, cooldowns, or boss patterns are resolved
- **THEN** the playable WebApp SHALL resolve them from local frontend code, local static config, or local assets

#### Scenario: Existing damage path is reused
- **WHEN** a monster type or monster skill changes outgoing damage behavior
- **THEN** the implementation SHALL reuse the existing monster hit and player defensive mitigation paths

#### Scenario: Tooling runtime is not playable proof
- **WHEN** Python runtime, report, import, export, or comparison tooling emits monster or skill events
- **THEN** those events SHALL NOT be treated as playable WebApp acceptance evidence unless the same behavior is verified through the frontend runtime

### Requirement: Nemesis combat identity
Nemesis monsters SHALL use boss-grade combat presentation and may use boss-grade skill cadence through configured, finite boss patterns.

#### Scenario: Legendary boss uses boss-grade targeting
- **WHEN** a `legendary_boss` is alive and can target the player
- **THEN** it SHALL use boss-grade targeting and skill cadence paths constrained by its configured boss pattern ranges

#### Scenario: Supreme boss is distinct from legendary boss
- **WHEN** a `supreme_boss` is alive and can target the player
- **THEN** it SHALL use a combat identity distinguishable from `legendary_boss` through configured skill cadence, skill shape, phase marker, range profile, projectile profile, or visual presentation

#### Scenario: Boss projectile speed remains bounded
- **WHEN** a nemesis boss releases a projectile or barrage pattern
- **THEN** the projectile speed SHALL obey the monster projectile speed constraints for boss skills and SHALL provide warning or windup when configured above the non-boss projectile cap

### Requirement: Monster combat behavior is frontend-owned for play
Playable monster offense, movement, attack cadence, collision behavior, player damage, and visual feedback SHALL execute in frontend code.

#### Scenario: Frontend runs monster behavior
- **WHEN** monsters are alive in the playable battle view
- **THEN** frontend runtime SHALL update monster AI, movement, target pursuit, collision safeguards, attack readiness, attack cadence, outgoing damage, player HP or shield changes, and feedback without backend combat ticks

#### Scenario: Monster behavior effects are preserved
- **WHEN** the same monster pack, rarity, player stats, map geometry, elapsed time, and random seed are evaluated before and after migration
- **THEN** monster speed multipliers, chase behavior, aggro behavior, attack range, attack cadence, damage type, hit kind, outgoing damage, mitigation results, and feedback timing SHALL remain equivalent

### Requirement: Frontend owns monster definitions for play
Playable monster type, base HP, movement speed, body size, collision radius, attack configuration, drop references, sprite keys, palette keys, visual keys, and rarity multipliers SHALL be frontend-owned data.

#### Scenario: Monster data loads without backend
- **WHEN** the playable WebApp creates runtime monsters
- **THEN** it SHALL resolve all monster configuration from frontend-owned data included in or loaded by the WebApp build

#### Scenario: Backend monster state is not authoritative
- **WHEN** monsters move, attack, take damage, lose HP, die, or trigger feedback during normal play
- **THEN** backend monster state SHALL NOT be required, polled, or used to overwrite frontend runtime state

### Requirement: Monster attack state is runtime-owned
Monster melee attack readiness, cooldown state, active attack window, and player hit application SHALL be owned by the runtime enemy/combat update loop rather than by visual synchronization.

#### Scenario: Stationary player is hit on cadence
- **WHEN** an aggro-locked living monster is already in melee range of a stationary living player and the monster attack cooldown is ready
- **THEN** the runtime combat update SHALL apply one monster hit to the player without requiring player movement

#### Scenario: Render synchronization does not own hits
- **WHEN** enemy visual synchronization runs for renderable enemies
- **THEN** it SHALL NOT be the authoritative place that starts attack cooldowns or applies monster damage to the player

#### Scenario: Non-rendered aggro monster keeps combat timing
- **WHEN** an aggro-locked monster remains alive and in the runtime enemy list
- **THEN** its melee attack readiness SHALL continue to advance from runtime combat time even if presentation filtering changes whether it is rendered

### Requirement: Monster skill shape releases runtime skills
Monster `skill_shape` and monster identity SHALL be consumed by the client-side runtime to release finite, module-backed monster skills after aggro and cooldown rules allow release.

#### Scenario: Skill shape resolves to module-backed behavior
- **WHEN** a runtime monster has `skill_shape` set to melee, projectile, charge, guard, ambush, support, or boss
- **THEN** the client-side runtime SHALL resolve that shape and monster identity to a configured monster skill module rather than ignoring the shape

#### Scenario: Aggro gates monster skill release
- **WHEN** a monster is authored or procedurally spawned but has not aggro-locked onto the player
- **THEN** the runtime SHALL NOT release that monster's player-targeting skill

#### Scenario: Cooldown gates monster skill release
- **WHEN** a monster has recently released a skill and its configured cooldown has not elapsed
- **THEN** the runtime SHALL NOT release that skill again

