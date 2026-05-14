## ADDED Requirements

### Requirement: Frontend owns wall-blocked battle legality
The playable WebApp SHALL resolve wall-blocked projectile travel, target selection, aggro triggering, and player-hit legality entirely in frontend runtime code using local map collision data.

#### Scenario: No backend wall collision authority
- **WHEN** playable combat evaluates whether a projectile, skill target, monster aggro source, or monster projectile can pass through a map wall
- **THEN** the WebApp SHALL resolve the result from frontend-owned runtime code and local `BakedBattleMapData`
- **AND** it SHALL NOT call backend collision, pathfinding, skill runtime, combat tick, or gameplay services

#### Scenario: Wall behavior participates in normal gameplay state
- **WHEN** a wall blocks projectile travel, target acquisition, or aggro triggering
- **THEN** the resulting visual, damage, hit feedback, enemy state, player state, and combat log behavior SHALL be produced by the normal frontend playable battle path

#### Scenario: Static build remains sufficient
- **WHEN** the production WebApp is served as static frontend assets without backend gameplay APIs
- **THEN** wall-blocked projectile, targeting, and aggro behavior SHALL still work in normal playable battle
