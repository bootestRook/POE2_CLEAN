## ADDED Requirements

### Requirement: Monster skill targeting is wall-blocked
Monster skill release checks SHALL require wall-unblocked targeting when the skill targets the player directly.

#### Scenario: Projectile skill does not release through wall
- **WHEN** an aggro-locked monster evaluates a direct player-targeted projectile skill
- **AND** the player is inside `cast_range` but wall-blocked from the monster
- **THEN** the runtime SHALL NOT start that direct projectile skill release solely from the blocked line

#### Scenario: Boss pattern direct shot respects walls
- **WHEN** a boss or supreme boss pattern step aims a direct projectile at the player
- **AND** the line from the projectile source to the aimed target is wall-blocked before reaching the target
- **THEN** the emitted projectile SHALL be clipped to the first blocker and SHALL NOT be allowed to damage the player beyond that blocker

### Requirement: Monster projectile hit legality respects walls
Monster projectile player damage SHALL be cancelled when the projectile has collided with wall geometry before reaching the player.

#### Scenario: In-flight projectile collides with wall
- **WHEN** an in-flight monster or boss projectile advances along its configured travel segment
- **AND** the segment from its spawn point to its current or next position crosses a wall blocker
- **THEN** the projectile SHALL stop or expire at the blocker and SHALL disable future player hit checks

#### Scenario: Visible projectile can still hit
- **WHEN** an in-flight monster or boss projectile reaches the player's collision radius without a wall blocker first
- **THEN** the player hit MAY resolve through the existing defensive mitigation path

### Requirement: Monster projectile wall behavior is verified
Monster skill wall-blocking work SHALL include tests and playable browser evidence.

#### Scenario: Runtime tests cover blocked monster projectile
- **WHEN** frontend runtime tests run for monster skill wall blocking
- **THEN** they SHALL prove that a monster or boss projectile blocked by a wall cannot damage the player

#### Scenario: Playable verification captures representative projectile
- **WHEN** implementation changes monster or boss projectile wall behavior
- **THEN** verification SHALL run the playable WebApp battle view and capture representative projectile behavior under `artifacts/screenshots/` without using the skill editor
