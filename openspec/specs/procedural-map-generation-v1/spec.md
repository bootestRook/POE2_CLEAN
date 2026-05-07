## Purpose

Define client-only procedural dungeon map JSON generation for MapEditor preview, including required entrance and boss regions, minimum size guarantees relative to `map_001`, connectivity validation, deterministic seeds, and the boundary that this phase is not registered as a formal playable map template.

## Requirements

### Requirement: Client-only procedural map JSON generation
The system SHALL generate procedural dungeon map editor JSON entirely from frontend/client-side code and local static configuration.

#### Scenario: Generated map does not call backend
- **WHEN** the procedural map JSON generator runs
- **THEN** the system SHALL NOT call a backend map generation API, backend map start API, server runtime, or server-generated gameplay behavior
- **AND** the generated map SHALL be created from local client code, local static config, and the provided seed

#### Scenario: Generated map uses existing map editor document shape
- **WHEN** the system creates a procedural map JSON file
- **THEN** the generated document SHALL use the same map editor JSON format as existing authored map documents
- **AND** the generated document SHALL include `tiles`, `colliders`, `zones`, `spawn`, `width`, `height`, and `cellSize`

#### Scenario: Generated map is not registered as a playable template yet
- **WHEN** this phase is implemented
- **THEN** the generated map SHALL NOT be registered in the formal playable map template registry
- **AND** the playable map start flow SHALL NOT expose a procedural map debug template selector

### Requirement: Required generated regions
The system SHALL include the required gameplay regions in every accepted generated map.

#### Scenario: Four entrance regions exist
- **WHEN** procedural map generation returns an accepted map
- **THEN** the map SHALL include at least four zones with `zoneType = "entrance"`
- **AND** each entrance zone center SHALL be walkable

#### Scenario: Boss room exists
- **WHEN** procedural map generation returns an accepted map
- **THEN** the map SHALL include at least one zone with `zoneType = "boss_room"`
- **AND** each boss room zone center SHALL be walkable

#### Scenario: Supporting region vocabulary exists
- **WHEN** procedural map generation returns an accepted map
- **THEN** the map SHALL include connected `corridor` zones between major rooms
- **AND** the map SHALL include at least one `main_room` or `large_room`

### Requirement: Minimum generated map size
The system SHALL guarantee generated maps are at least four fifths of the current `map_001` playable size.

#### Scenario: Authored dimensions meet minimum size
- **WHEN** procedural map generation returns an accepted map
- **THEN** the generated map width SHALL be greater than or equal to floor(`map_001.width * 0.8`)
- **AND** the generated map height SHALL be greater than or equal to floor(`map_001.height * 0.8`)

#### Scenario: Walkable footprint meets minimum size
- **WHEN** procedural map generation returns an accepted map
- **THEN** the generated map walkable `ground` cell count SHALL be greater than or equal to floor(`map_001` walkable `ground` cell count * 0.8)
- **AND** empty cells SHALL NOT count toward the generated map playable footprint

#### Scenario: Current map_001 reference is enforced
- **WHEN** the implementation measures the current `map_001` baseline
- **THEN** the minimum generated map width SHALL be at least 204 cells
- **AND** the minimum generated map height SHALL be at least 115 cells
- **AND** the minimum generated walkable `ground` cell count SHALL be at least 1,828 cells

### Requirement: Generated map connectivity
The system SHALL validate generated maps for playable connectivity before writing an accepted JSON file.

#### Scenario: Entrances can reach boss room
- **WHEN** procedural map generation returns an accepted map
- **THEN** every entrance zone center SHALL have a walkable path to at least one boss room zone center

#### Scenario: Major rooms are reachable
- **WHEN** procedural map generation returns an accepted map
- **THEN** every `main_room`, `large_room`, `dead_end`, and `boss_room` zone center SHALL be reachable from at least one entrance zone center

#### Scenario: Invalid map is rejected
- **WHEN** a generated candidate fails required region, size, bounds, walkability, or connectivity validation
- **THEN** the system SHALL reject that candidate before writing it as the accepted MapEditor preview JSON
- **AND** the system SHALL retry with a deterministic bounded fallback seed or fall back to a valid local map template with a warning

### Requirement: Generated dungeon pacing
The system SHALL produce a playable 2D top-down dungeon layout with a safe start, exploration space, and a boss destination.

#### Scenario: Boss room is placed as a destination
- **WHEN** procedural map generation returns an accepted map
- **THEN** at least one boss room SHALL be farther by walkable path from the selected or default entrance than the nearest non-entrance major room
- **AND** the boss room SHALL be connected through a corridor or antechamber rather than overlapping an entrance

#### Scenario: Entrances are marked as safe regions
- **WHEN** procedural map generation returns an accepted map
- **THEN** entrance regions SHALL be emitted with `zoneType = "entrance"`
- **AND** non-entrance regions SHALL retain existing zone vocabulary for later spawn-rule compatibility

### Requirement: Generated map determinism
The system SHALL support deterministic procedural map generation for tests and reproducible debug runs.

#### Scenario: Same seed produces same generated map
- **WHEN** procedural map generation runs twice with the same seed and generation profile
- **THEN** the generated map document SHALL have the same dimensions, tile layout, zones, and spawn point

#### Scenario: Different seeds can vary generated maps
- **WHEN** procedural map generation runs with different seeds and the same generation profile
- **THEN** the system MAY produce different room placement, corridor routing, branch placement, or entrance selection
- **AND** every accepted result SHALL still satisfy required regions, minimum size, and connectivity validation

### Requirement: MapEditor preview verification
The system SHALL support reviewing generated maps through `mapEditor.bat`.

#### Scenario: Generated map JSON is written for MapEditor
- **WHEN** the procedural map generation change is implemented
- **THEN** verification SHALL generate a JSON file that can be loaded from the MapEditor map file flow
- **AND** verification SHALL run the MapEditor build/check path without using the disabled skill editor

#### Scenario: Skill editor is not used
- **WHEN** generated map visuals, gameplay areas, map tiles, unit placement, or monster spawning are verified
- **THEN** verification SHALL NOT use `/skill-editor`, `?skill_editor=1`, `view=skill_editor`, port `8765`, or `dist-skill-editor`
