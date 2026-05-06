## ADDED Requirements

### Requirement: Spawn output includes monster taxonomy
The procedural spawn runtime SHALL emit monster rarity and monster type for every generated monster instance.

#### Scenario: Generated monster has taxonomy fields
- **WHEN** procedural spawn creates a monster instance
- **THEN** the instance SHALL include `spawn_rarity`
- **AND** the instance SHALL include `monster_type`

#### Scenario: Spawn debug includes new rarity counts
- **WHEN** procedural spawn completes
- **THEN** debug summary SHALL separately count `normal`, `magic`, `rare`, `legendary_boss`, and `supreme_boss` monsters

#### Scenario: Spawn debug includes type counts
- **WHEN** procedural spawn completes
- **THEN** debug summary SHALL include counts for `minion`, `melee`, `ranged`, `charger`, `tank`, `assassin`, and `support`

### Requirement: Spawn rarity and boss pool boundaries
The procedural spawn runtime SHALL allow base monsters to cross non-boss rarities and SHALL restrict nemesis rarities to boss definitions.

#### Scenario: Base monster can become rare
- **WHEN** rarity rules upgrade a base monster instance
- **THEN** that monster MAY receive `spawn_rarity = "magic"` or `spawn_rarity = "rare"`
- **AND** its base visual identity SHALL remain unchanged

#### Scenario: Legendary boss uses boss pool
- **WHEN** a `legendary_boss` is generated
- **THEN** the selected monster SHALL come from a boss monster pool

#### Scenario: Supreme boss uses boss pool
- **WHEN** a `supreme_boss` is generated
- **THEN** the selected monster SHALL come from a boss monster pool

#### Scenario: Boss room can choose legendary or supreme
- **WHEN** a boss room spawn rule is evaluated
- **THEN** the rule SHALL be able to select either `legendary_boss` or `supreme_boss` according to configuration

### Requirement: Spawn config supports type defaults
The spawn configuration SHALL support monster type defaults used by procedural instantiation.

#### Scenario: Type defaults are loaded
- **WHEN** V1 spawn config is loaded
- **THEN** it SHALL provide defaults for each supported `monster_type`

#### Scenario: Type defaults affect instantiated stats
- **WHEN** a monster instance is created
- **THEN** its life, damage, movement speed, attack range, attack cadence, and skill-shape defaults SHALL account for its `monster_type`
- **AND** per-monster and pack overrides SHALL still be able to override specific values
