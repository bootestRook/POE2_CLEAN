## Purpose
Define the frontend-owned playable skill runtime as the normal WebApp battle source for skill event generation, event consumption, damage, status, forced movement, cooldown, resource, and presentation timing behavior.

## Requirements

### Requirement: Frontend skill runtime is the playable source
The playable WebApp SHALL use frontend-owned skill runtime code as the sole source for normal-play skill event generation, event consumption, damage, status, forced movement, cooldown, resource, and presentation timing behavior.

#### Scenario: Playable skill event generation stays frontend-owned
- **WHEN** an active skill is released during normal playable WebApp combat
- **THEN** the WebApp SHALL generate the skill's gameplay events in frontend code without calling Python `SkillRuntime`, `CombatSession`, `V1WebAppApi.runtime_skill_events`, `/api/runtime/skill-events`, or any backend gameplay service

#### Scenario: Playable skill event consumption stays frontend-owned
- **WHEN** skill events are consumed during normal playable WebApp combat
- **THEN** the WebApp SHALL update enemy state, player state, damage, status, forced movement, VFX scheduling, floating text, kills, and drops in frontend runtime code without backend approval or recalculation

### Requirement: Backend skill runtime is tooling only
Python skill runtime systems SHALL NOT be treated as acceptance evidence for playable WebApp behavior.

#### Scenario: Python runtime tests are scoped as tooling
- **WHEN** a test executes Python `SkillRuntime`, `CombatSession`, or `V1WebAppApi.runtime_skill_events`
- **THEN** the test name, assertions, or surrounding comments SHALL identify it as tooling, legacy compatibility, report support, or migration comparison rather than canonical playable behavior

#### Scenario: Backend-only evidence cannot pass playable changes
- **WHEN** a change affects playable skill behavior, battle presentation, VFX timing, damage areas, status behavior, forced movement, or hit feedback
- **THEN** backend-only runtime tests SHALL NOT be sufficient acceptance evidence without frontend runtime tests and playable WebApp browser verification

### Requirement: Frontend runtime terminology is unambiguous
Playable frontend skill runtime code SHALL use names that identify it as frontend-owned or playable, not backend-canonical.

#### Scenario: Playable code avoids canonical naming
- **WHEN** frontend code defines normal-play skill release, event generation, event consumption, or combat runtime helpers
- **THEN** those helper names SHALL NOT use `canonical` to imply backend authority or Python runtime ownership

#### Scenario: Tooling comparison naming is explicit
- **WHEN** Python runtime paths or tests are retained for comparison
- **THEN** their names SHALL use tooling, legacy, or comparison terminology instead of implying they are the playable source of truth

### Requirement: Frontend runtime tests cover cross-cutting skill events
The system SHALL provide executable frontend runtime tests for skill event generation and event consumption behavior that can affect playable combat.

#### Scenario: Dynamic damage zones preserve forced movement
- **WHEN** a frontend-owned damage-zone skill has `dynamic_tick_runtime = true` and reverse knockback or pull behavior
- **THEN** frontend event generation SHALL still emit `forced_movement` events with `movement_policy = pull_to_origin`, `movement_scope = damage_zone`, zone origin, radius, movement distance, and scheduled pull time

#### Scenario: Forced movement consumes current enemy positions
- **WHEN** a frontend-owned area `forced_movement` event is consumed
- **THEN** every live enemy currently inside the event radius SHALL move toward the event origin by no more than the event movement distance, while enemies outside the radius remain unchanged

#### Scenario: Representative families have frontend coverage
- **WHEN** frontend runtime tests run
- **THEN** they SHALL cover representative projectile, chain, module-chain, damage-zone, melee-arc, player-nova, status, kill-triggered, hit VFX, floating text, and forced-movement behavior using frontend runtime paths

### Requirement: Playable browser verification remains mandatory
Frontend skill runtime changes SHALL be verified in the actual playable WebApp battle view.

#### Scenario: Skill runtime visual verification uses playable battle
- **WHEN** implementation changes skill runtime behavior, VFX timing, hit feedback, damage areas, targeting, unit movement, or status presentation
- **THEN** verification SHALL run the normal playable WebApp battle view in a browser, capture screenshots under `artifacts/screenshots/`, and describe the visible result

#### Scenario: Disabled tooling is excluded
- **WHEN** frontend skill runtime behavior is verified
- **THEN** the skill editor, `/skill-editor`, `?skill_editor=1`, `view=skill_editor`, port `8765`, `dist-skill-editor`, and backend-only runtime reports SHALL NOT be used as the verification surface
