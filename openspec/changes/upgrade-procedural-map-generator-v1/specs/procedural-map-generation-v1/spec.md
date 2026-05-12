## MODIFIED Requirements

### Requirement: Client-only procedural map JSON generation
The system SHALL generate procedural dungeon map editor JSON entirely from frontend/client-side code and local static configuration.

#### Scenario: Generated map does not call backend
- **WHEN** the procedural map JSON generator runs
- **THEN** the system SHALL NOT call a backend map generation API, backend map start API, server runtime, or server-generated gameplay behavior
- **AND** the generated map SHALL be created from local client code, local static config, and the provided seed

#### Scenario: Generated map uses existing map editor document shape
- **WHEN** the system creates a procedural map JSON file
- **THEN** the generated document SHALL use the `poe.tilemap.editor` JSON format used by existing authored map documents
- **AND** the generated document SHALL include `format`, `version`, `name`, `savedAt`, `tiles`, `colliders`, `zones`, `spawn`, `width`, `height`, and `cellSize`

#### Scenario: Generated map uses locked V1 map specs
- **WHEN** procedural map generation returns an accepted map
- **THEN** the generated map width SHALL equal `256`
- **AND** the generated map height SHALL equal `144`
- **AND** the generated map `cellSize` SHALL equal `96`
- **AND** every tile SHALL be one of `empty`, `ground`, or `wall`

#### Scenario: Existing authored map loading remains available
- **WHEN** the V1 procedural generator is added or upgraded
- **THEN** existing `map_001.json` loading SHALL remain available
- **AND** `map_001.json` SHALL be used only as a specification reference, not as a fixed topology, room layout, corridor path, or room count template

### Requirement: Required generated regions
The system SHALL include the required gameplay regions in every accepted generated map.

#### Scenario: Entrance regions exist
- **WHEN** procedural map generation returns an accepted map
- **THEN** the map SHALL include at least four zones with `zoneType = "entrance"`
- **AND** each entrance zone center SHALL be walkable
- **AND** entrance zones SHALL be distributed across different map edge directions or quadrants where possible

#### Scenario: Boss room exists
- **WHEN** procedural map generation returns an accepted map
- **THEN** the map SHALL include exactly one zone with `zoneType = "boss_room"`
- **AND** the boss room zone center SHALL be walkable
- **AND** the boss room SHALL NOT directly connect to an entrance zone

#### Scenario: Supporting region vocabulary exists
- **WHEN** procedural map generation returns an accepted map
- **THEN** the map SHALL include connected `corridor` zones between rooms
- **AND** the map SHALL include `main_room`, `large_room`, and `dead_end` zones

#### Scenario: Room counts follow V1 ranges
- **WHEN** procedural map generation returns an accepted map
- **THEN** the entrance count SHALL be between 4 and 6 inclusive
- **AND** the `main_room` count SHALL be between 8 and 18 inclusive
- **AND** the `large_room` count SHALL be between 2 and 5 inclusive
- **AND** the `dead_end` count SHALL be between 3 and 8 inclusive
- **AND** the `boss_room` count SHALL equal 1

### Requirement: Minimum generated map size
The system SHALL guarantee generated maps use the full V1 tilemap specification and remain compatible with the current `map_001` reference shape.

#### Scenario: Generated dimensions match V1 spec
- **WHEN** procedural map generation returns an accepted map
- **THEN** the generated map width SHALL equal `256`
- **AND** the generated map height SHALL equal `144`

#### Scenario: Walkable footprint is non-empty and validated
- **WHEN** procedural map generation returns an accepted map
- **THEN** the generated map SHALL include walkable `ground` cells for all rooms and corridors
- **AND** empty cells SHALL NOT count toward the generated map playable footprint
- **AND** every accepted `ground` cell island SHALL be connected to the main walkable area

#### Scenario: Current map_001 reference remains compatible
- **WHEN** the implementation reads the current `map_001` baseline
- **THEN** the baseline SHALL remain loadable as a `poe.tilemap.editor` document
- **AND** the generated V1 map SHALL preserve compatible tile, collider, spawn, zone, width, height, and cellSize fields

### Requirement: Generated map connectivity
The system SHALL validate generated maps for playable connectivity before accepting or writing an accepted JSON file.

#### Scenario: Entrances can reach boss room
- **WHEN** procedural map generation returns an accepted map
- **THEN** every entrance zone center SHALL have a walkable path to the boss room zone center

#### Scenario: Major rooms are reachable
- **WHEN** procedural map generation returns an accepted map
- **THEN** every `main_room`, `large_room`, `dead_end`, and `boss_room` zone center SHALL be reachable from at least one entrance zone center

#### Scenario: Graph connectivity rules are enforced
- **WHEN** procedural map generation returns an accepted map
- **THEN** all generated room nodes SHALL be connected in the generated graph
- **AND** each `dead_end` room SHALL have degree 1
- **AND** each `large_room` SHALL have degree at least 2
- **AND** the boss room SHALL have degree 1 or 2
- **AND** no entrance SHALL directly connect to the boss room

#### Scenario: Invalid map is rejected with Chinese debug
- **WHEN** a generated candidate fails required region, format, room count, graph, bounds, walkability, spawn, or connectivity validation
- **THEN** the system SHALL reject that candidate before accepting or writing it
- **AND** the system SHALL retry with deterministic bounded attempts
- **AND** if all attempts fail, the result SHALL include Chinese error or debug text explaining the failure reason

### Requirement: Generated dungeon pacing
The system SHALL produce a playable 2D top-down dungeon layout with safe starts, exploration space, branch variation, and a boss destination.

#### Scenario: Boss room is placed as a destination
- **WHEN** procedural map generation returns an accepted map
- **THEN** the boss room SHALL be farther by walkable path from most entrance rooms than nearby non-entrance major rooms
- **AND** the boss room SHALL be connected through a corridor or antechamber rather than overlapping an entrance

#### Scenario: Entrances are marked as safe regions
- **WHEN** procedural map generation returns an accepted map
- **THEN** entrance regions SHALL be emitted with `zoneType = "entrance"`
- **AND** non-entrance regions SHALL retain existing zone vocabulary for later spawn-rule compatibility

#### Scenario: Dead ends are branch endpoints
- **WHEN** procedural map generation returns an accepted map
- **THEN** `dead_end` rooms SHALL be branch endpoints
- **AND** `dead_end` rooms SHALL NOT be required pass-through rooms on every entrance-to-boss path

### Requirement: Generated map determinism
The system SHALL support deterministic procedural map generation for tests and reproducible debug runs.

#### Scenario: Same seed produces same generated map
- **WHEN** procedural map generation runs twice with the same seed and generation configuration
- **THEN** the generated map document SHALL have the same dimensions, tile layout, zones, spawn point, graph summary, validation result, and debug text

#### Scenario: Different seeds can vary generated maps
- **WHEN** procedural map generation runs with different seeds and the same generation configuration
- **THEN** the system MAY produce different room counts, room placement, topology preset, corridor routing, branch placement, or entrance selection
- **AND** every accepted result SHALL still satisfy required regions, V1 map specs, room count ranges, spawn legality, and connectivity validation

#### Scenario: Math.random is not used for map results
- **WHEN** procedural map generation chooses room counts, topology, dimensions, positions, corridor paths, spawn, or retry variants
- **THEN** those choices SHALL use seeded random derived from the provided seed and generation configuration
- **AND** direct `Math.random` SHALL NOT participate in generated map results

### Requirement: MapEditor preview verification
The system SHALL support reviewing generated maps through the existing MapEditor-compatible JSON flow while also allowing V1 generated maps to be verified in the playable WebApp view when frontend behavior is affected.

#### Scenario: Generated map JSON is written for MapEditor
- **WHEN** the procedural map generation change is implemented
- **THEN** verification SHALL generate a JSON file that can be loaded from the MapEditor map file flow
- **AND** verification SHALL run the MapEditor build/check path without using the disabled skill editor

#### Scenario: Skill editor is not used
- **WHEN** generated map visuals, gameplay areas, map tiles, unit placement, monster spawning, or debug overlays are verified
- **THEN** verification SHALL NOT use `/skill-editor`, `?skill_editor=1`, `view=skill_editor`, port `8765`, or `dist-skill-editor`

#### Scenario: Playable WebApp visual verification is required for frontend-affecting changes
- **WHEN** the V1 generated map changes or affects the playable frontend
- **THEN** verification SHALL launch the WebApp through the project root `run.bat` flow
- **AND** verification SHALL capture a screenshot of the actual rendered WebApp view under `artifacts/screenshots/`
- **AND** verification SHALL describe what is visible in the screenshot

## ADDED Requirements

### Requirement: V1 topology presets
The system SHALL implement the V1 topology presets `hub_spoke`, `main_path_branches`, and `loop_with_branches`.

#### Scenario: Hub spoke topology is generated
- **WHEN** procedural map generation runs with `topologyPreset = "hub_spoke"`
- **THEN** the accepted map SHALL include at least one `large_room` used as a hub
- **AND** the hub SHALL have degree at least 4
- **AND** multiple entrance regions SHALL connect into the map from varied directions

#### Scenario: Main path branches topology is generated
- **WHEN** procedural map generation runs with `topologyPreset = "main_path_branches"`
- **THEN** the accepted map SHALL include a main path from an entrance-side region toward the boss room
- **AND** the main path SHALL include `main_room` or `large_room` nodes before the boss room
- **AND** branch rooms and `dead_end` rooms SHALL attach to the main path or branch endpoints

#### Scenario: Loop with branches topology is generated
- **WHEN** procedural map generation runs with `topologyPreset = "loop_with_branches"`
- **THEN** the accepted map SHALL include at least one local loop containing at least four room nodes
- **AND** branch rooms, entrance rooms, dead ends, large rooms, or boss access SHALL attach outside or around the loop
- **AND** the boss room SHALL still have no more than two graph connections

#### Scenario: Seed can select topology
- **WHEN** procedural map generation runs without an explicit `topologyPreset`
- **THEN** the selected topology preset SHALL be derived deterministically from the provided seed

### Requirement: V1 generated map API
The system SHALL expose a client-side V1 generator API that returns the generated map, graph, validation, and Chinese debug text.

#### Scenario: Procedural generator returns V1 result
- **WHEN** a caller invokes `generateProceduralEditorMap` with a seed and optional topology preset
- **THEN** the result SHALL include `map`, `graph`, `validation`, and `debugText`
- **AND** `map` SHALL be compatible with the existing `poe.tilemap.editor` document format

#### Scenario: Validation API returns structured result
- **WHEN** a caller invokes `validateGeneratedMap` for a generated editor map
- **THEN** the result SHALL include `ok`, `errors`, `warnings`, and `stats`
- **AND** `stats` SHALL include map dimensions, room counts, corridor count, and tile counts

### Requirement: V1 Chinese debug output
The system SHALL provide Chinese debug text for generated map inspection and failure diagnosis.

#### Scenario: Debug text includes required labels
- **WHEN** procedural map generation returns a result
- **THEN** `debugText` SHALL include Chinese labels for 程序化地图生成, Seed, 拓扑类型, 地图尺寸, 入口区域, 普通房间, 大房间, 死胡同, Boss 房, 通道数量, Ground 连通性, 入口到 Boss, Boss 连接数, 死胡同规则, and 校验结果

#### Scenario: Topology names are localized
- **WHEN** debug text describes the selected topology preset
- **THEN** `hub_spoke` SHALL display as `中心枢纽型`
- **AND** `main_path_branches` SHALL display as `主路径分支型`
- **AND** `loop_with_branches` SHALL display as `环路分支型`

### Requirement: V1 map loading entry
The system SHALL expose the V1 generated map through an additive, client-only loading entry without replacing existing authored map entries.

#### Scenario: Procedural map entry is additive
- **WHEN** the user or debug flow switches to a generated procedural map
- **THEN** the system SHALL load the generated map through the existing client-side map document/runtime adapter path
- **AND** existing authored map entries, including `map_001.json`, SHALL remain available

#### Scenario: App root remains wiring only
- **WHEN** `webapp/App.tsx` is touched to expose the generated map entry
- **THEN** `App.tsx` SHALL only import focused modules, pass props/state/callbacks, or connect top-level mode/template wiring
- **AND** feature UI structure, generation state, topology rules, validation rules, debug text, and data transformations SHALL live outside `App.tsx`
