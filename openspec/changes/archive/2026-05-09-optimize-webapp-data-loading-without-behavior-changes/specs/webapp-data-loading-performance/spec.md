## ADDED Requirements

### Requirement: Large generated data loads outside the initial WebApp path
The WebApp SHALL keep large generated or optional data assets out of the initial `/webapp` execution path unless the first visible flow requires that data to render equivalent output.

#### Scenario: Initial screen does not require equipment catalog data
- **WHEN** the player opens `/webapp` and reaches the title, save selection, or rest-area first paint
- **THEN** equipment affix catalogs, GM-only option catalogs, and other optional generated data SHALL NOT be synchronously imported by the initial WebApp bundle

#### Scenario: Required seed data remains available
- **WHEN** the first visible WebApp flow requires save summaries, initial player state, board state, or rest-area rendering data
- **THEN** that required data SHALL remain available without changing the visible screen, save shape, storage keys, text, class names, or DOM order

### Requirement: Lazy data access preserves deterministic behavior
The WebApp SHALL load optional data through client-side cached loaders without changing deterministic gameplay, item, drop, skill, or debug results.

#### Scenario: Equipment generation remains equivalent
- **WHEN** equipment generation is requested with the same source, level, rarity, affix selection, and seed as before the optimization
- **THEN** the generated equipment source, rarity, affixes, stat modifiers, tooltip text, and icon metadata SHALL match the pre-optimization result

#### Scenario: Drop and GM option data remain equivalent
- **WHEN** gem drop pools, equipment source lists, or GM/debug options are requested after lazy loading
- **THEN** the available ids, display names, ordering, filters, and generated outcomes SHALL match the previous eager-loaded behavior

#### Scenario: Skill level lookup remains equivalent
- **WHEN** a skill preview or runtime calculation reads level-table values for the same skill and level
- **THEN** the resolved values SHALL match the previous eager-loaded values and SHALL NOT alter skill timing, damage, targeting, VFX event payloads, or displayed tooltip values

### Requirement: Lazy loading stays outside per-frame gameplay loops
The WebApp SHALL resolve optional data before the gameplay action that needs it and SHALL NOT perform repeated asynchronous imports inside frame-by-frame combat, movement, AI, VFX, or rendering loops.

#### Scenario: Combat loop has no repeated data import
- **WHEN** the playable battle loop advances player movement, enemy AI, skill events, VFX, drops, or combat logs
- **THEN** the loop SHALL NOT call optional-data dynamic imports on each frame or per enemy iteration

#### Scenario: First-use loading is action-scoped
- **WHEN** a player action first needs optional data, such as opening GM tools or generating an equipment drop
- **THEN** the WebApp SHALL load the needed data once, cache it, and then complete the same action with equivalent output

### Requirement: Data file organization communicates ownership and cost
Large generated WebApp data SHALL live in explicit data or generated-data folders rather than the root WebApp module area.

#### Scenario: Large data file is moved to data ownership
- **WHEN** a generated data file is large enough to materially affect bundle size or is not needed for first paint
- **THEN** the file SHALL be placed under a focused path such as `webapp/data/generated/`, `webapp/data/equipment/`, or another documented data-ownership folder

#### Scenario: Application modules import through accessors
- **WHEN** application code needs a large generated data set
- **THEN** it SHALL import a small loader/accessor module instead of importing the large data file directly from `webapp/App.tsx` or another startup-critical module

### Requirement: Optimization verification proves no behavior change
The WebApp SHALL verify data-loading optimization with both behavior equivalence checks and actual playable frontend verification.

#### Scenario: Tests compare deterministic outputs
- **WHEN** the data loading structure changes
- **THEN** tests SHALL compare representative deterministic outputs for equipment generation, GM option data, gem drop pool access, skill level values, and initial app state behavior

#### Scenario: Initial bundle guard prevents regression
- **WHEN** `npm test` or the focused WebApp smoke checks run
- **THEN** they SHALL detect direct startup-path imports of large optional generated data or otherwise verify that optional data is not reintroduced into the initial WebApp bundle

#### Scenario: Playable WebApp is visually verified
- **WHEN** the optimization affects frontend loading, panels, map entry, inventory, drops, or combat visibility
- **THEN** verification SHALL launch or match the project `run.bat` WebApp flow, exercise the actual playable view, capture screenshots under `artifacts/screenshots/`, and describe the visible result
