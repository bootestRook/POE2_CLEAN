## ADDED Requirements

### Requirement: V1 skill behavior acceptance uses playable frontend runtime
V1 active skill behavior acceptance SHALL come from the frontend-owned playable runtime, not from Python runtime output alone.

#### Scenario: Active skill behavior is accepted through frontend runtime
- **WHEN** a V1 active skill behavior is changed, fixed, migrated, or refactored
- **THEN** acceptance SHALL include frontend runtime tests that execute the relevant playable skill event generation or consumption path

#### Scenario: Python runtime output is comparison evidence only
- **WHEN** Python `SkillRuntime`, `CombatSession`, or `V1WebAppApi.runtime_skill_events` output is used while evaluating a V1 active skill
- **THEN** that output SHALL be treated as tooling or migration comparison evidence and SHALL NOT replace frontend runtime acceptance

#### Scenario: Browser proof is required for player-visible skill behavior
- **WHEN** a V1 active skill change affects battle visuals, hit feedback, damage zones, movement, status presentation, target selection, or timing visible to the player
- **THEN** verification SHALL include a screenshot from the actual playable WebApp battle view under `artifacts/screenshots/`

### Requirement: V1 damage-zone pull behavior is frontend-owned
V1 damage-zone skills that declare reverse knockback or pull behavior SHALL execute that behavior in the playable frontend runtime.

#### Scenario: Black hole emits frontend pull events
- **WHEN** `active_black_hole` is released in the playable frontend runtime
- **THEN** the frontend runtime SHALL emit scheduled area `forced_movement` events for the black hole duration even when its damage ticks are handled by dynamic damage-zone runtime

#### Scenario: Black hole visibly pulls enemies in playable battle
- **WHEN** enemies are inside the black hole circle in the actual playable WebApp battle view
- **THEN** the frontend runtime SHALL move those enemies toward the black hole origin while preserving the circular screen-space black hole visual
