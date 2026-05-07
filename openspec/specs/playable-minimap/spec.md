## Purpose
Define the client-only playable battle minimap behavior, including run-scoped exploration, compact rendering, and the `M` key enlarged overlay used in the formal WebApp battle view.

## Requirements

### Requirement: Run-scoped playable map exploration
The playable WebApp SHALL track minimap exploration as client-side state for the current formal map run only.

#### Scenario: New run resets exploration
- **WHEN** the player starts a new formal playable map run
- **THEN** the minimap exploration state SHALL be reset for that run before the player begins exploring

#### Scenario: Exploration begins at player spawn
- **WHEN** the player enters a formal playable map run
- **THEN** the minimap SHALL reveal the area around the finalized runtime player spawn

#### Scenario: Movement reveals nearby cells
- **WHEN** the player moves through the formal playable map
- **THEN** the minimap SHALL reveal cells around the player's current runtime grid position

#### Scenario: Exploration is not persisted between runs
- **WHEN** a map run ends and the player later starts another map run
- **THEN** the new run SHALL NOT reuse explored cells from the previous run

### Requirement: Compact minimap in formal battle view
The playable WebApp SHALL show a compact minimap during formal playable battle runs.

#### Scenario: Compact minimap uses finalized runtime map
- **WHEN** the compact minimap renders during a formal playable map run
- **THEN** it SHALL use the finalized runtime battle map, including selected template instance and rotation, as its map source

#### Scenario: Unexplored cells remain hidden
- **WHEN** the compact minimap renders cells that have not been explored in the current run
- **THEN** those unexplored cells SHALL NOT be displayed as map terrain, blockers, walkable space, drops, monsters, or markers

#### Scenario: Explored cells remain visible
- **WHEN** the compact minimap renders cells that were explored earlier in the current run
- **THEN** those explored cells SHALL remain visible even after the player moves away

#### Scenario: Current player marker is visible
- **WHEN** the compact minimap is visible during a formal playable map run
- **THEN** it SHALL show the player's current position relative to explored map terrain

### Requirement: M toggles a transparent enlarged overlay map
The playable WebApp SHALL let the player press `M` to toggle an enlarged, semi-transparent map overlay centered on the battle view.

#### Scenario: M opens enlarged map overlay
- **WHEN** the player presses `M` during a formal playable battle run while the compact minimap is active
- **THEN** the WebApp SHALL show an enlarged, semi-transparent map overlay centered on the screen

#### Scenario: M closes enlarged map overlay
- **WHEN** the enlarged map overlay is visible and the player presses `M`
- **THEN** the WebApp SHALL return to the compact minimap view

#### Scenario: Enlarged overlay hides unexplored cells
- **WHEN** the enlarged map overlay is visible
- **THEN** it SHALL use the same current-run explored-cell state as the compact minimap and SHALL NOT display unexplored areas

#### Scenario: Enlarged overlay does not pause gameplay
- **WHEN** the enlarged map overlay is visible
- **THEN** the playable battle runtime SHALL continue movement, combat, projectile updates, monster updates, drops, and other normal gameplay updates

#### Scenario: Enlarged overlay does not block movement input
- **WHEN** the enlarged map overlay is visible and the player presses WASD movement keys
- **THEN** the player SHALL continue moving according to the normal playable battle movement rules

#### Scenario: Enlarged overlay does not block pickup interaction
- **WHEN** the enlarged map overlay is visible and the player uses normal drop pickup interaction
- **THEN** click-to-pickup and movement-to-pickup behavior SHALL continue to use the existing playable battle pickup path

### Requirement: Playable minimap remains client-only and outside disabled tooling
The playable minimap system SHALL be implemented and verified in the client-only formal WebApp battle path.

#### Scenario: No backend minimap authority
- **WHEN** minimap exploration, compact rendering, or enlarged overlay rendering is updated
- **THEN** the WebApp SHALL NOT call backend APIs, backend map services, backend runtime services, or server persistence to calculate or store minimap state

#### Scenario: Skill editor is excluded
- **WHEN** the playable minimap is implemented or verified
- **THEN** `/skill-editor`, `?skill_editor=1`, `view=skill_editor`, port `8765`, `dist-skill-editor`, and skill-editor preview surfaces SHALL NOT be used as acceptance evidence

#### Scenario: Browser verification uses playable battle view
- **WHEN** the playable minimap implementation affects frontend rendering or interaction
- **THEN** verification SHALL run the actual playable WebApp battle view and store screenshots under `artifacts/screenshots/`
