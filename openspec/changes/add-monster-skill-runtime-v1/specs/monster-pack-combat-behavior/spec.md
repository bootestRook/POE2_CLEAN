## ADDED Requirements

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

## MODIFIED Requirements

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
