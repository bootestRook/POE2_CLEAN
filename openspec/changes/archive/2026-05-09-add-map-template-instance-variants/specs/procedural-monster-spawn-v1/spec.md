## ADDED Requirements

### Requirement: Spawn generation consumes finalized map instance
Procedural monster spawning SHALL consume the finalized map instance created for the current playable map run, including transformed player spawn, zones, walkable grid, blocker grid, boss points, and exit points.

#### Scenario: Filter distance from transformed player spawn
- **WHEN** a map instance chooses a player spawn region and applies a supported rotation
- **THEN** procedural monster spawn filtering SHALL measure `min_distance_from_player_spawn` from the transformed player spawn
- **AND** monsters SHALL NOT be accepted in the transformed entrance area near that spawn

#### Scenario: Place packs inside transformed zones
- **WHEN** procedural spawning classifies or reads authored zones from a rotated map instance
- **THEN** monster pack centers SHALL be chosen from the transformed zone geometry
- **AND** pack members SHALL be placed on transformed walkable, unblocked cells

#### Scenario: Vary pack centers per run
- **WHEN** the same map template and monster pack config are used in separate normal runs
- **THEN** procedural spawning SHALL be able to choose different accepted pack centers from eligible transformed zones
- **AND** monsters in a chosen pack SHALL be able to occupy different valid points around the pack center

#### Scenario: Debug output identifies instance-aligned spawns
- **WHEN** procedural spawning completes for a map instance
- **THEN** debug output SHALL describe spawn points using the finalized map instance coordinates
- **AND** debug output SHALL include the selected `zone_type` and `monster_pack_id` for accepted points as before
