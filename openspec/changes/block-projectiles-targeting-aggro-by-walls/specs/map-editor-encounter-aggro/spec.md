## ADDED Requirements

### Requirement: Runtime encounter aggro is line-of-sight gated
Runtime use of authored or procedural encounter aggro ranges SHALL require wall-unblocked line-of-sight from the aggro source to the player before triggering shared pack aggro.

#### Scenario: Aggro ring is blocked by wall
- **WHEN** the player enters an encounter aggro radius shown or authored in map data
- **AND** the battle map line from that aggro source to the player crosses wall or blocker geometry
- **THEN** the runtime SHALL NOT mark that source as triggered from the blocked radius check

#### Scenario: Aggro ring triggers in visible space
- **WHEN** the player enters an encounter aggro radius
- **AND** the battle map line from that aggro source to the player is unblocked
- **THEN** the runtime SHALL mark that source as triggered according to the existing pack-shared aggro lock rule

#### Scenario: Authoring data remains unchanged
- **WHEN** line-of-sight gated aggro is implemented
- **THEN** map JSON aggro range fields, spawn range fields, and editor authoring controls SHALL NOT require a schema change solely for wall blocking
