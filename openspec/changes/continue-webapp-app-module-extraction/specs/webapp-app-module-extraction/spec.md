## ADDED Requirements

### Requirement: Fourth-pass extraction targets map and debug presentation
The WebApp SHALL move map background, map debug overlay, and procedural spawn debug presentation out of `webapp/App.tsx` only as render-only client modules that preserve existing behavior.

#### Scenario: Map background presentation is extracted safely
- **WHEN** baked map background, editor runtime map background, map debug overlay, debug markers, or map debug cell style helpers are moved out of `webapp/App.tsx`
- **THEN** the moved code SHALL render the same supplied map data, class names, DOM order, labels, geometry sizing, and inline style values without owning map loading, map generation, walkability, camera state, minimap state, or gameplay simulation

#### Scenario: Procedural spawn debug presentation is extracted safely
- **WHEN** procedural spawn debug display code is moved out of `webapp/App.tsx`
- **THEN** the moved code SHALL receive the existing debug summary through props and SHALL NOT generate spawn plans, mutate enemies, recalculate monster packs, alter map progression, or change debug filtering behavior

### Requirement: Fourth-pass extraction targets character panel presentation
The WebApp SHALL isolate character information display into focused client-side presentation modules without moving stat ownership or gameplay-facing state calculation.

#### Scenario: Character panel renders supplied state
- **WHEN** character info panel rendering, panel row grouping, save-time formatting, or current resource display helpers are moved out of `webapp/App.tsx`
- **THEN** the moved code SHALL display the same supplied character panel data and player resources without recalculating equipment effects, modifying player stats, changing resource regeneration, changing save data, or owning App state

#### Scenario: Character helper extraction remains display-only
- **WHEN** character panel formatting helpers are extracted
- **THEN** those helpers SHALL be deterministic over explicit inputs and SHALL NOT read or mutate React state, runtime refs, local storage, enemies, drops, equipment slots, backend services, or global browser state

### Requirement: Fourth-pass extraction targets skill-board presentation
The WebApp SHALL move skill-board cell and support preview presentation into a focused skill-board module without changing board placement ownership.

#### Scenario: Board cell presentation is extracted safely
- **WHEN** board cell rendering, gem ghost rendering, support preview line rendering, board boundary class helpers, hover class helpers, or support preview class helpers are moved out of `webapp/App.tsx`
- **THEN** the moved code SHALL preserve the same text, class names, DOM structure, render callbacks, hover visuals, support preview visuals, and tooltip trigger behavior while receiving existing values and callbacks through props

#### Scenario: Board placement ownership remains in App
- **WHEN** skill-board presentation code is extracted
- **THEN** the extracted module SHALL NOT own placement legality, drag/drop mutation, save state, mounted skill recalculation, support modifier calculation, tooltip state, floating item state, or board storage behavior unless a later change explicitly scopes and verifies that ownership move

### Requirement: Fourth-pass shared types remain thin and behavior-free
The WebApp SHALL introduce shared type modules only as needed to keep extracted modules independent from `webapp/App.tsx`.

#### Scenario: Shared board and panel types preserve shape
- **WHEN** `Gem`, `Cell`, `SupportPreview`, `SupportLine`, character panel, floating item, tooltip, or related display shapes are moved to shared type modules
- **THEN** the moved types SHALL preserve existing field names, optionality, literal values, and semantic shape and SHALL NOT introduce runtime behavior, storage access, browser side effects, backend calls, or gameplay calculations

#### Scenario: Shared display helpers remain pure
- **WHEN** board, map debug, procedural debug, or character display helpers are moved to utility modules
- **THEN** the helpers SHALL depend only on explicit inputs and SHALL NOT read or mutate React state, refs, save data, local storage, enemy/player runtime state beyond supplied values, runtime queues, backend services, or global browser state

### Requirement: Fourth-pass extraction is verified incrementally
The WebApp SHALL verify each fourth-pass extraction group before continuing to the next extraction group.

#### Scenario: Each extraction group passes checks
- **WHEN** a map/debug, procedural debug, character panel, shared type/helper, or skill-board extraction group is completed
- **THEN** `npm run build`, relevant focused checks or tests, and final diff review SHALL pass or any remaining failure SHALL be identified as pre-existing and unrelated before the group is considered complete

#### Scenario: Playable WebApp screenshot verifies visible extraction
- **WHEN** a fourth-pass extraction affects frontend rendering or interaction
- **THEN** verification SHALL launch or match the project `run.bat` WebApp flow, exercise the actual playable view, capture screenshots under `artifacts/screenshots/`, and describe the visible result

#### Scenario: Disabled tooling is not used as acceptance evidence
- **WHEN** fourth-pass extraction is verified
- **THEN** `/skill-editor`, `?skill_editor=1`, `view=skill_editor`, port `8765`, `dist-skill-editor`, and skill-editor preview surfaces SHALL NOT be used as acceptance evidence
