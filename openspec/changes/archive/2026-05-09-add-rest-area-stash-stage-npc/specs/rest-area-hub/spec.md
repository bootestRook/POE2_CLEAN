## ADDED Requirements

### Requirement: Rest Area Scene Entry
The WebApp SHALL route normal player saves into a client-only rest-area scene after creating or loading a save.

#### Scenario: New save enters rest area
- **WHEN** the player creates a new save slot
- **THEN** the WebApp SHALL show the rest-area scene before any stage-selection panel or combat run starts

#### Scenario: Existing save enters rest area
- **WHEN** the player loads an existing compatible save slot
- **THEN** the WebApp SHALL restore saved player preparation state and show the rest-area scene

#### Scenario: Rest area remains client-only
- **WHEN** the rest-area scene loads, updates, opens panels, or starts a stage
- **THEN** it SHALL use only frontend code, local static assets, local configuration, and frontend save data without calling backend gameplay APIs

### Requirement: Rest Area Movement
The rest-area scene SHALL allow the player character to move within a 2D top-down preparation space.

#### Scenario: Player moves in rest area
- **WHEN** the player provides movement input in the rest-area scene
- **THEN** the player character SHALL move inside the rest-area bounds without starting combat or spawning monsters

#### Scenario: Rest area is not a combat runtime
- **WHEN** the player is in the rest-area scene
- **THEN** enemy spawning, skill auto-release, damage application, loot rolls, and combat timers SHALL remain inactive

### Requirement: Clickable Object Name Labels
Interactable rest-area objects SHALL expose clickable in-world name labels for interaction.

#### Scenario: Interact in range
- **WHEN** the player clicks an interactable object's name label while the player is inside that object's interaction range
- **THEN** the WebApp SHALL open the object's interaction panel

#### Scenario: Interact from out of range
- **WHEN** the player clicks an interactable object's name label while the player is outside that object's interaction range
- **THEN** the WebApp SHALL move or guide the player toward that object and open the interaction panel after the player reaches interaction range

#### Scenario: Interaction labels match ground-drop affordance
- **WHEN** a rest-area interactable name label is visible
- **THEN** it SHALL be clickable with a player-visible label style that is consistent with existing ground drop interaction labels

### Requirement: Wang Yang Stage NPC
The rest-area scene SHALL include exactly one normal stage-selection NPC named `王阳`.

#### Scenario: Wang Yang label
- **WHEN** the rest-area scene is visible
- **THEN** the NPC name label SHALL display `王阳`

#### Scenario: Wang Yang visual
- **WHEN** `王阳` is rendered in the rest-area scene
- **THEN** the NPC SHALL use the user-provided white-haired brown-cloaked character image as the visible NPC character asset

#### Scenario: Wang Yang opens stage selection
- **WHEN** the player interacts with `王阳`
- **THEN** the WebApp SHALL open the stage-selection panel using the existing map progression and stage eligibility data

#### Scenario: Stage start returns to existing combat path
- **WHEN** the player selects an enterable stage from the panel opened by `王阳`
- **THEN** the WebApp SHALL start the existing playable combat/map-run flow for that selected stage

### Requirement: Rest Area Stash Object
The rest-area scene SHALL include a stash interactable that opens player storage.

#### Scenario: Stash label
- **WHEN** the rest-area scene is visible
- **THEN** the stash interactable SHALL expose a clickable Chinese name label for storage access

#### Scenario: Stash opens storage panel
- **WHEN** the player interacts with the stash object
- **THEN** the WebApp SHALL open the stash panel without entering combat or changing stage selection

#### Scenario: Close stash returns to rest area
- **WHEN** the player closes the stash panel
- **THEN** the WebApp SHALL return focus to the rest-area scene and preserve the player's save state

### Requirement: Return Flow
The WebApp SHALL return normal play to the rest-area scene after preparation panels or combat runs end.

#### Scenario: Stage panel closes
- **WHEN** the stage-selection panel opened by `王阳` is closed without starting a stage
- **THEN** the WebApp SHALL show the rest-area scene

#### Scenario: Combat run ends
- **WHEN** a playable combat run ends through completion, failure, or return action
- **THEN** the WebApp SHALL return the player to the rest-area scene rather than the title screen or direct stage-selection screen

### Requirement: Playable WebApp Verification
Rest-area frontend behavior SHALL be verified in the actual playable WebApp.

#### Scenario: Browser verification
- **WHEN** implementation changes rest-area rendering, labels, movement, stage entry, or stash UI
- **THEN** verification SHALL run the local WebApp in a browser and capture screenshots of the actual playable WebApp view under `artifacts/screenshots/`

#### Scenario: Skill editor excluded
- **WHEN** rest-area behavior is verified
- **THEN** verification SHALL NOT use `/skill-editor`, `?skill_editor=1`, `view=skill_editor`, port `8765`, or `dist-skill-editor`
