## ADDED Requirements

### Requirement: Monster type geometric language
The geometric visual system SHALL map monster types to readable top-down silhouettes.

#### Scenario: Minion shape reads as low threat
- **WHEN** a `minion` monster is rendered
- **THEN** its primary silhouette SHALL be small, simple, or group-oriented

#### Scenario: Ranged shape reads as launcher or core
- **WHEN** a `ranged` monster is rendered
- **THEN** its primary silhouette SHALL use an eye, core, prism, or launcher-like form

#### Scenario: Tank shape reads as heavy
- **WHEN** a `tank` monster is rendered
- **THEN** its primary silhouette SHALL be wider, heavier, or more armored than a `minion`

#### Scenario: Support shape reads as connected
- **WHEN** a `support` monster is rendered
- **THEN** its primary silhouette SHALL use rings, nodes, links, or radial symmetry that communicates support behavior

### Requirement: Rarity overlay geometric language
The geometric visual system SHALL render rarity as an overlay layer separate from the monster type silhouette.

#### Scenario: Magic overlay differs from normal
- **WHEN** a `magic` monster is rendered
- **THEN** it SHALL have an overlay, accent, or health bar treatment distinguishable from `normal`

#### Scenario: Rare overlay differs from magic
- **WHEN** a `rare` monster is rendered
- **THEN** it SHALL have an overlay, accent, or health bar treatment distinguishable from `magic`

#### Scenario: Legendary boss overlay uses nemesis treatment
- **WHEN** a `legendary_boss` is rendered
- **THEN** it SHALL use boss-scale visual treatment and nemesis health bar presentation

#### Scenario: Supreme boss overlay is distinct
- **WHEN** a `supreme_boss` is rendered
- **THEN** it SHALL use a visual treatment distinguishable from `legendary_boss`

### Requirement: Visual verification from playable battle
Monster visual changes SHALL be verified in the actual playable WebApp battle view.

#### Scenario: Screenshot verification covers taxonomy visuals
- **WHEN** implementation is verified
- **THEN** screenshots SHALL be captured from the playable WebApp battle view
- **AND** the screenshots SHALL show at least one non-boss monster type visual and one nemesis health bar treatment
