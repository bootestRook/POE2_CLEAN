## ADDED Requirements

### Requirement: Rest Area Preparation Loop
V1 SHALL include a rest-area preparation step between save loading and combat entry.

#### Scenario: Save load enters preparation
- **WHEN** the player creates or loads a normal save
- **THEN** the WebApp SHALL enter the rest-area preparation scene before the player chooses a combat stage

#### Scenario: Stage selection moves behind NPC
- **WHEN** the player wants to choose a combat stage
- **THEN** the player SHALL interact with `王阳` in the rest-area scene to open stage selection

#### Scenario: Board and inventory remain available before combat
- **WHEN** the player is in the rest-area preparation scene
- **THEN** the player SHALL be able to manage inventory, gems, equipment, board state, and stash contents before entering combat

### Requirement: Stash Storage
V1 Inventory / Storage SHALL provide a player stash with 5 pages of 10x10 slots.

#### Scenario: Stash dimensions
- **WHEN** the stash UI opens
- **THEN** it SHALL show one active stash page containing 100 slots arranged as a 10x10 grid

#### Scenario: Stash page tabs
- **WHEN** the stash UI is open
- **THEN** it SHALL provide 5 page tabs and switching tabs SHALL show the selected page's 10x10 slot contents

#### Scenario: Inventory shown beside stash
- **WHEN** the stash UI is open
- **THEN** the player's inventory and gem/item entries SHALL be visible on the right side of the stash UI

#### Scenario: Transfer between inventory and stash
- **WHEN** the player moves an item between inventory and an eligible stash slot
- **THEN** Inventory / Storage SHALL preserve the same item instance, tooltip data, rarity, level, board state, and equipment metadata

#### Scenario: Stash rejects invalid duplicate ownership
- **WHEN** save data or UI actions would place one item instance in multiple stash or inventory slots at the same time
- **THEN** Inventory / Storage SHALL sanitize or reject the duplicate placement so each item instance has one storage location

### Requirement: Stash Persistence
V1 frontend saves SHALL persist stash slot placement.

#### Scenario: New save starts with empty stash
- **WHEN** a new save slot is created
- **THEN** the save state SHALL contain 5 empty stash pages with 100 empty slots per page

#### Scenario: Existing save migration
- **WHEN** an existing compatible save has no stash data
- **THEN** save loading SHALL migrate it by adding 5 empty stash pages without changing inventory, equipment, board, or map progression data

#### Scenario: Stash survives reload
- **WHEN** the player stores items in stash pages and reloads the save
- **THEN** the WebApp SHALL restore the same items in the same stash page slots

### Requirement: V1 Loop Return To Rest Area
V1 SHALL use the rest-area scene as the normal preparation return point.

#### Scenario: Return after combat
- **WHEN** the player exits, completes, or fails a combat run
- **THEN** the WebApp SHALL return to the rest-area scene with inventory, stash, board, equipment, and map progress saved

#### Scenario: Re-enter combat from preparation
- **WHEN** the player returns to the rest area after combat
- **THEN** the player SHALL be able to interact with `王阳` again to choose another enterable stage
