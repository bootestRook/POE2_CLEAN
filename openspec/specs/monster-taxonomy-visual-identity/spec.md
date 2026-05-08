## Purpose
Define the playable monster rarity taxonomy, monster type taxonomy, and visual identity requirements that keep combat roles, boss presentation, health bars, and concept artifacts consistent.

## Requirements

### Requirement: Monster rarity taxonomy
The system SHALL support exactly five playable monster rarities: `normal`, `magic`, `rare`, `legendary_boss`, and `supreme_boss`.

#### Scenario: Non-boss rarity values are available
- **WHEN** a non-boss monster is generated
- **THEN** its `spawn_rarity` SHALL be one of `normal`, `magic`, or `rare`

#### Scenario: Nemesis rarity values are available
- **WHEN** a boss monster is generated
- **THEN** its `spawn_rarity` SHALL be either `legendary_boss` or `supreme_boss`

#### Scenario: Legacy boss rarity is not emitted
- **WHEN** the procedural spawn result is consumed by the playable WebApp battle view
- **THEN** the runtime monster rarity SHALL NOT be emitted as the legacy value `boss`

### Requirement: Nemesis classification
The system SHALL classify `legendary_boss` and `supreme_boss` monsters as nemesis monsters.

#### Scenario: Legendary boss is nemesis
- **WHEN** a monster has `spawn_rarity = "legendary_boss"`
- **THEN** the monster SHALL be treated as a nemesis for boss presentation, reward logic, and debug output

#### Scenario: Supreme boss is nemesis
- **WHEN** a monster has `spawn_rarity = "supreme_boss"`
- **THEN** the monster SHALL be treated as a nemesis for boss presentation, reward logic, and debug output

#### Scenario: Non-boss rarity is not nemesis
- **WHEN** a monster has `spawn_rarity` of `normal`, `magic`, or `rare`
- **THEN** the monster SHALL NOT be treated as a nemesis

### Requirement: Monster type taxonomy
The system SHALL support exactly seven monster types: `minion`, `melee`, `ranged`, `charger`, `tank`, `assassin`, and `support`.

#### Scenario: Runtime monster exposes type
- **WHEN** a monster is instantiated for battle
- **THEN** the runtime monster SHALL include a `monster_type` value from the supported type list

#### Scenario: Monster type controls combat role
- **WHEN** the runtime resolves movement, attack range, attack cadence, or skill shape defaults
- **THEN** it SHALL use `monster_type` before applying per-monster or pack overrides

### Requirement: Base monsters can cross non-boss rarities
The system SHALL allow base non-boss monsters to spawn as `normal`, `magic`, or `rare` without changing their base visual identity.

#### Scenario: Same base monster appears in multiple non-boss rarities
- **WHEN** spawn rules select the same base monster definition in separate encounters
- **THEN** the monster MAY appear as `normal`, `magic`, or `rare`
- **AND** its type silhouette SHALL remain consistent across those rarities

### Requirement: Boss monsters use dedicated boss pool
The system SHALL generate `legendary_boss` and `supreme_boss` only from dedicated boss monster definitions.

#### Scenario: Base monster is not promoted to boss
- **WHEN** spawn rules require `legendary_boss` or `supreme_boss`
- **THEN** the selected monster SHALL come from the boss monster pool
- **AND** the selected monster SHALL NOT be a promoted base non-boss monster

#### Scenario: Boss pool does not feed non-boss generation
- **WHEN** spawn rules generate `normal`, `magic`, or `rare` monsters
- **THEN** boss monster definitions SHALL NOT be selected

### Requirement: Type-driven visual identity
The system SHALL use monster type to determine the primary visual language of a monster.

#### Scenario: Type silhouette remains primary
- **WHEN** a monster is rendered in the playable battle view
- **THEN** its body silhouette SHALL communicate its `monster_type`
- **AND** rarity effects SHALL be rendered as overlays or presentation layers rather than replacing the type silhouette

#### Scenario: Existing geometry shapes are reused
- **WHEN** the visual identity library is built
- **THEN** existing monster geometry shapes SHALL be mapped to the new monster types instead of being discarded

### Requirement: Rarity-driven health bar presentation
The system SHALL render distinct health bar presentation for all five monster rarities.

#### Scenario: Normal health bar
- **WHEN** a `normal` monster is visible and damaged or targeted
- **THEN** the playable battle view SHALL render the lowest-emphasis monster health bar treatment

#### Scenario: Magic health bar
- **WHEN** a `magic` monster is visible and damaged or targeted
- **THEN** the playable battle view SHALL render a treatment distinguishable from `normal`

#### Scenario: Rare health bar
- **WHEN** a `rare` monster is visible and damaged or targeted
- **THEN** the playable battle view SHALL render a treatment distinguishable from `normal` and `magic`

#### Scenario: Legendary boss health bar
- **WHEN** a `legendary_boss` is alive in battle
- **THEN** the playable battle view SHALL render the nemesis boss health bar path

#### Scenario: Supreme boss health bar
- **WHEN** a `supreme_boss` is alive in battle
- **THEN** the playable battle view SHALL render a boss health bar treatment distinguishable from `legendary_boss`

### Requirement: Visual concept artifact
The change SHALL include an in-repository visual artifact that communicates the monster type and boss rarity identity direction.

#### Scenario: Concept sheet exists
- **WHEN** implementation is complete
- **THEN** the repository SHALL include a concept sheet or equivalent visual artifact under an artifact or design location
- **AND** it SHALL show all seven monster types plus legendary and supreme boss presentation
