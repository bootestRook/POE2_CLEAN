## ADDED Requirements

### Requirement: Monster aggro awareness is wall-blocked
Playable monster aggro and awareness checks SHALL not treat a wall-blocked radius check as direct player visibility.

#### Scenario: Authored pack does not aggro through wall
- **WHEN** the player is inside an authored encounter source's aggro radius
- **AND** the line from that source to the player is blocked by map wall geometry
- **THEN** monsters from that source SHALL remain untriggered unless another unblocked aggro condition applies

#### Scenario: Nearby individual aggro does not bypass walls
- **WHEN** a nearby monster would contribute its source id to pack aggro through an individual aggro radius check
- **AND** the line between the monster or source and the player is wall-blocked
- **THEN** that blocked individual check SHALL NOT trigger the pack source

#### Scenario: Existing locked aggro remains locked
- **WHEN** a monster or pack has already become aggro-locked through a valid unblocked trigger
- **THEN** later movement behind a wall SHALL NOT clear the existing aggro lock unless an existing reset or death rule applies

### Requirement: Monster engagement uses shared wall checks
Playable monster engagement helpers SHALL reuse the shared wall-blocking query for direct line checks instead of maintaining incompatible wall sampling logic.

#### Scenario: Existing melee path remains walkable
- **WHEN** an aggro-locked melee monster evaluates a direct close-range contact or attack line
- **THEN** the runtime SHALL use a wall-blocking line check compatible with the shared battle line query before treating the player as directly reachable
