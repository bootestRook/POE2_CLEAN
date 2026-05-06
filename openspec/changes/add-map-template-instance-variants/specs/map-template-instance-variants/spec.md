## ADDED Requirements

### Requirement: Stage-driven map template selection
The playable WebApp SHALL choose a map template from the selected stage's `map_template_ids` when starting a client-only map run.

#### Scenario: Select eligible template for stage
- **WHEN** the player starts an enterable map stage with multiple `map_template_ids`
- **THEN** the WebApp SHALL choose one of those template ids for the new run
- **AND** the chosen template id SHALL be recorded in the run's local instance metadata

#### Scenario: Fallback when template list is unavailable
- **WHEN** the selected stage has no usable `map_template_ids`
- **THEN** the WebApp SHALL use the existing default runtime map fallback
- **AND** the map run SHALL remain client-only

### Requirement: Client-only map instance variants
The playable WebApp SHALL instantiate a selected authored map template into a per-run map instance before player placement and monster spawning.

#### Scenario: Instance metadata is created
- **WHEN** a map run starts
- **THEN** the WebApp SHALL create local instance metadata containing the selected template id, instance seed, rotation angle, and player spawn source
- **AND** the instance metadata SHALL NOT require a backend API or server runtime

#### Scenario: Same template can produce different runs
- **WHEN** the same stage and same map template are entered in separate normal runs
- **THEN** the WebApp SHALL be able to choose different supported rotations, player spawn regions, or monster pack placements

### Requirement: Multiple player spawn regions
Authored maps SHALL support multiple player spawn regions while preserving the existing single `spawn` field as a compatibility fallback.

#### Scenario: Choose one authored spawn region
- **WHEN** an authored map has more than one player spawn region
- **THEN** the map instancer SHALL choose one region for the current run
- **AND** the player SHALL spawn on a walkable point inside or nearest to that chosen region

#### Scenario: Preserve old map spawn compatibility
- **WHEN** an authored map has no player spawn regions but has the existing `spawn` field
- **THEN** the map instancer SHALL use the existing `spawn` value as the player spawn source

### Requirement: Four-way gameplay rotation
The map instancer SHALL support only `0`, `90`, `180`, and `270` degree rotations for the first version, and SHALL apply the selected rotation to gameplay data rather than only to rendering.

#### Scenario: Rotate map grids and dimensions
- **WHEN** a map instance uses `90` or `270` degree rotation
- **THEN** the runtime map width and height SHALL be swapped
- **AND** the walkable grid and blocker grid SHALL be transformed by the same rotation

#### Scenario: Rotate authored gameplay points
- **WHEN** a map instance uses any supported rotation
- **THEN** player spawn points, zone points, zone rectangles, boss points, exit points, and monster spawn candidates SHALL use the transformed coordinates

#### Scenario: Reject arbitrary-angle rotation
- **WHEN** map instance rotation is selected for this change
- **THEN** the rotation angle SHALL be one of `0`, `90`, `180`, or `270`
- **AND** the WebApp SHALL NOT rasterize arbitrary-angle or 45-degree map rotations for playable map runs

### Requirement: Playable battle view uses finalized map instance
The playable WebApp battle view SHALL render and simulate the finalized map instance created for the current run.

#### Scenario: Player movement uses transformed collision
- **WHEN** the player moves after entering a rotated map instance
- **THEN** movement SHALL be constrained by the transformed walkable and blocker grids

#### Scenario: Visual verification uses playable WebApp
- **WHEN** this feature is verified manually
- **THEN** verification SHALL use the actual playable WebApp battle view
- **AND** verification SHALL include a screenshot showing the rendered map run
