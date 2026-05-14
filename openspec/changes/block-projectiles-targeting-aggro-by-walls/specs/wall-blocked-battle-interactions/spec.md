## ADDED Requirements

### Requirement: Shared wall-blocking line queries
The playable WebApp SHALL provide a shared client-side battle map line-blocking query for runtime systems that need direct visibility, direct targeting, or projectile travel through map geometry.

#### Scenario: Walkable line is unblocked
- **WHEN** a line segment from one walkable world position to another walkable world position crosses only walkable map cells
- **THEN** the shared query SHALL report the segment as unblocked

#### Scenario: Wall line is blocked
- **WHEN** a line segment crosses a wall, blocker, non-walkable cell, or out-of-bounds blocked map region
- **THEN** the shared query SHALL report the segment as blocked and SHALL identify a world position at or before the first blocker

#### Scenario: Missing map preserves existing behavior
- **WHEN** no battle map is available to the query
- **THEN** the shared query SHALL treat the segment as unblocked and SHALL NOT throw

### Requirement: Projectiles collide with walls
Playable projectile travel SHALL stop at the first wall blocker along the projectile segment before it can pass through the wall.

#### Scenario: Player projectile reaches visible target
- **WHEN** a player projectile is released toward a target with an unblocked line from projectile origin to target position
- **THEN** the projectile SHALL travel to the target and its normal hit and damage events MAY be emitted according to existing skill rules

#### Scenario: Player projectile hits wall first
- **WHEN** a player projectile is released toward a target or endpoint and the first wall blocker is closer than the intended endpoint
- **THEN** the projectile visual SHALL end at the wall collision point
- **AND** hit, damage, hit VFX, floating text, split, secondary, and kill-triggered follow-up events for the blocked target SHALL NOT be emitted

#### Scenario: Monster projectile hits wall first
- **WHEN** a monster or boss projectile path reaches a wall blocker before reaching the player
- **THEN** the projectile SHALL stop at the wall collision point
- **AND** the projectile SHALL NOT damage the player after the collision

### Requirement: Direct target acquisition respects walls
Direct target acquisition in playable battle SHALL filter wall-blocked targets using the shared line query from the interaction origin.

#### Scenario: Nearest target is hidden behind wall
- **WHEN** a direct skill, chain segment, split projectile, secondary hit, target-locked area, or dynamic target scan searches for targets by radius
- **AND** the nearest candidate is within numeric range but wall-blocked from the interaction origin
- **THEN** that candidate SHALL NOT be selected by that acquisition step

#### Scenario: Visible alternate target is selected
- **WHEN** a blocked candidate and an unblocked candidate are both within numeric range
- **THEN** the acquisition step SHALL prefer valid unblocked candidates according to the existing distance, uniqueness, and max-target ordering rules

### Requirement: Aggro range respects walls
Encounter and monster awareness checks that represent direct hatred or search range SHALL require an unblocked line to the player before starting aggro.

#### Scenario: Player enters radius behind wall
- **WHEN** the player is inside an authored or procedural encounter aggro radius but the line from the aggro source to the player is wall-blocked
- **THEN** the aggro source SHALL NOT trigger solely from that blocked radius check

#### Scenario: Player enters visible radius
- **WHEN** the player is inside an authored or procedural encounter aggro radius and the line from the aggro source to the player is unblocked
- **THEN** the aggro source MAY trigger according to the existing pack-shared aggro rules
