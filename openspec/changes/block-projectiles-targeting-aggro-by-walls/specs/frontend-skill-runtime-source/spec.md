## ADDED Requirements

### Requirement: Player skill targeting is wall-blocked
Frontend-owned player skill event generation SHALL use client-side map wall checks when selecting direct targets for normal playable combat.

#### Scenario: Auto-release ignores wall-hidden enemies
- **WHEN** an active skill auto-release evaluates live enemies in cast range
- **AND** an enemy is within numeric range but wall-blocked from the player or projectile spawn origin
- **THEN** that enemy SHALL NOT satisfy the release target requirement for direct target acquisition

#### Scenario: Skill event generation uses unblocked initial targets
- **WHEN** the frontend playable skill runtime builds events for projectile, chain, module-chain, damage-zone target lock, melee arc, player nova, or direct-hit families
- **THEN** target acquisition steps that depend on direct visibility SHALL receive candidates filtered by the shared wall-blocking query

### Requirement: Player projectile events stop at walls
Frontend-owned player projectile events SHALL not generate blocked-target gameplay results beyond the first wall collision.

#### Scenario: Blocked projectile emits no blocked target damage
- **WHEN** a projectile skill's intended target is behind a wall from the projectile origin
- **THEN** the frontend runtime SHALL either select another unblocked target or emit only a projectile travel event ending at the blocker
- **AND** the blocked target SHALL NOT receive projectile hit, damage, hit VFX, floating text, split, secondary, or kill-triggered follow-up events from that projectile

#### Scenario: Dynamic projectile tick stops at wall
- **WHEN** a moving projectile uses dynamic tick runtime and its path reaches a wall blocker before its configured endpoint
- **THEN** the projectile tick runtime SHALL not continue ticking or selecting targets beyond the blocker position

### Requirement: Wall-blocked skill runtime has frontend coverage
Frontend runtime tests SHALL cover wall-blocked player skill behavior through playable frontend runtime paths.

#### Scenario: Projectile and chain target tests use map blockers
- **WHEN** frontend runtime tests run for wall-blocked skill behavior
- **THEN** they SHALL prove that at least one projectile target and one chain or follow-up target behind a wall is not selected or damaged

#### Scenario: Browser verification uses playable battle
- **WHEN** wall-blocked player skill behavior is implemented
- **THEN** verification SHALL run the normal playable WebApp battle view through the project `run.bat` flow, capture a screenshot under `artifacts/screenshots/`, and describe the visible projectile or targeting result
