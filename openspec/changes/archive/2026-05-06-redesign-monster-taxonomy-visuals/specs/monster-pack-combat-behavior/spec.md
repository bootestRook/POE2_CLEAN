## ADDED Requirements

### Requirement: Monster type combat behavior
Monster combat behavior SHALL consume `monster_type` through existing client-side battle paths.

#### Scenario: Type affects movement speed
- **WHEN** a monster chases the player
- **THEN** its chase speed SHALL be derived from the type default and instance modifiers instead of only the legacy boss/non-boss split

#### Scenario: Type affects attack range and cadence
- **WHEN** a monster evaluates whether it can attack
- **THEN** its attack range and attack cadence SHALL reflect its `monster_type` defaults plus instance overrides

#### Scenario: Type affects skill shape family
- **WHEN** a monster releases a type-specific skill shape
- **THEN** the skill shape SHALL come from the monster type configuration or boss identity configuration

### Requirement: Monster type behavior remains client-only
Monster type behavior SHALL be implemented in the existing client-side WebApp runtime without backend APIs or server runtime dependencies.

#### Scenario: No backend behavior source
- **WHEN** monster type stats or skill shape defaults are resolved
- **THEN** the playable WebApp SHALL resolve them from local frontend code, local static config, or local assets

#### Scenario: Existing damage path is reused
- **WHEN** a monster type changes outgoing damage behavior
- **THEN** the implementation SHALL reuse the existing monster hit and player defensive mitigation paths

### Requirement: Nemesis combat identity
Nemesis monsters SHALL use boss-grade combat presentation and may use boss-grade skill cadence.

#### Scenario: Legendary boss uses boss-grade targeting
- **WHEN** a `legendary_boss` is alive and can target the player
- **THEN** it SHALL use boss-grade targeting and skill cadence paths

#### Scenario: Supreme boss is distinct from legendary boss
- **WHEN** a `supreme_boss` is alive and can target the player
- **THEN** it SHALL use a combat identity distinguishable from `legendary_boss` through configured skill cadence, skill shape, phase marker, or visual presentation
