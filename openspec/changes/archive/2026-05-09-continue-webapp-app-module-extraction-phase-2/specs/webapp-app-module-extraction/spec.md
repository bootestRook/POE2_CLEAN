## ADDED Requirements

### Requirement: Phase 2 extraction follows a risk-ordered plan
The WebApp SHALL continue `webapp/App.tsx` extraction in independently verified batches ordered from deterministic client-side helpers to render-only presentation, while keeping high-risk runtime orchestration in the existing playable App path.

#### Scenario: Deterministic helpers are extracted before orchestration
- **WHEN** phase 2 extraction begins
- **THEN** frontend loot/drop state helpers and skill-board support preview hooks SHALL be extracted before pickup orchestration, GameApp state flow, monster AI, damage application, skill event generation, or runtime event consumption

#### Scenario: Each batch has a focused owner module
- **WHEN** a phase 2 extraction batch is planned
- **THEN** the implementation SHALL identify a focused target module under `webapp/state/`, `webapp/components/skill-board/`, `webapp/components/battle/`, `webapp/components/inventory/`, `webapp/components/tooltips/`, or `webapp/utils/` before editing `webapp/App.tsx`

#### Scenario: Batch commits stay reviewable
- **WHEN** a phase 2 extraction batch is ready for commit
- **THEN** the final diff SHALL include only the focused extraction, import rewiring, and directly required smoke-test source-boundary updates

### Requirement: Frontend loot and drop helpers remain deterministic
The WebApp SHALL extract frontend loot/drop calculation helpers only as deterministic client-side state helpers that preserve existing drop behavior exactly.

#### Scenario: Drop calculation helpers preserve formulas and payloads
- **WHEN** map-stage selection, drop roll, monster drop chance, drop attempts, map level roll, equipment rarity roll, drop kind selection, map-entry target selection, gem weighting, drop option selection, or drop payload creation is moved out of `webapp/App.tsx`
- **THEN** the moved helpers SHALL preserve existing formulas, salts, stage gates, boss/final-stage behavior, rarity behavior, gem/equipment/map-entry payload fields, and returned values

#### Scenario: Inventory item creation preserves item shape
- **WHEN** frontend inventory item creation from a drop is moved out of `webapp/App.tsx`
- **THEN** the moved helper SHALL preserve existing item ids, equipment source fields, tooltip fields, map-entry fields, gem fields, rarity/source text, and recalculation expectations

#### Scenario: Drop orchestration remains App-owned
- **WHEN** frontend loot/drop helpers are extracted
- **THEN** `spawnFrontendDrops`, pickup start/finish, boss portal confirmation, player proximity checks, save writes, inventory mutation orchestration, and map-run progression SHALL remain in the existing App-owned flow unless a separate change explicitly scopes them

### Requirement: Skill-board support preview hooks remain presentation state
The WebApp SHALL extract skill-board support preview hooks into a focused skill-board module without changing board placement, tooltip, drag/drop, or skill recalculation ownership.

#### Scenario: Support preview hooks preserve displayed relations
- **WHEN** linked gem id lookup, support preview relations, support line construction, or active target line filtering is moved out of `webapp/App.tsx`
- **THEN** the moved hooks SHALL preserve existing relation ids, source/target positions, colors, hover filtering, floating item suppression, and displayed support preview behavior

#### Scenario: Skill-board extraction does not move runtime ownership
- **WHEN** support preview hooks are extracted
- **THEN** placement legality, drag/drop mutation, floating item state, tooltip state, support modifier calculation, mounted skill recalculation, save data, and storage ownership SHALL remain unchanged

### Requirement: Remaining battle presentation extraction stays render-only
The WebApp SHALL extract remaining battle presentation helpers only when the moved code renders supplied runtime state and does not own gameplay decisions.

#### Scenario: Battle presentation helpers consume supplied state
- **WHEN** render-only battle helpers, visual style helpers, guide overlay presentation, debug label presentation, or entity JSX wrappers are moved out of `webapp/App.tsx`
- **THEN** the moved code SHALL receive existing state, projection callbacks, visual values, toggles, and render callbacks through explicit inputs and SHALL preserve class names, DOM order, layer order, text, and rendering gates

#### Scenario: Battle runtime decisions remain unchanged
- **WHEN** battle presentation helpers are extracted
- **THEN** the moved code SHALL NOT recalculate monster behavior, player damage, projectile trajectory decisions, target selection, hit timing, damage-zone origins, chain behavior, pierce behavior, damage results, pickup rules, runtime queues, or skill event generation/consumption

### Requirement: Smoke checks follow extracted ownership without weakening invariants
The WebApp smoke tests SHALL continue protecting behavior after phase 2 extraction by checking the source file that owns each protected invariant.

#### Scenario: Source-text checks move with protected functions
- **WHEN** a function or invariant currently checked in `webapp/App.tsx` moves to a focused module
- **THEN** the smoke test SHALL read that focused module or a deliberate combined source and SHALL keep an equivalent invariant check

#### Scenario: App orchestration checks remain specific
- **WHEN** a smoke check protects App-owned orchestration, runtime refs, battle loop behavior, disabled tooling gates, backend-coupling prevention, or playable WebApp acceptance boundaries
- **THEN** that check SHALL remain specific to the source that owns the behavior and SHALL NOT be weakened into an unrelated broad text search

### Requirement: Phase 2 verification is mandatory for every frontend batch
The WebApp SHALL verify each phase 2 extraction batch before continuing to the next batch.

#### Scenario: Build and smoke checks pass before completion
- **WHEN** a phase 2 extraction batch is completed
- **THEN** `npm run build`, `npm test`, and any focused checks for touched modules SHALL pass or any remaining failure SHALL be explicitly identified as pre-existing and unrelated before continuing

#### Scenario: Playable WebApp is visually verified
- **WHEN** a phase 2 extraction affects frontend rendering or interaction
- **THEN** verification SHALL launch or match the project `run.bat` WebApp flow, exercise the actual playable view affected by the batch, capture screenshots under `artifacts/screenshots/`, and describe the visible result

#### Scenario: Verification artifacts stay out of the repository root
- **WHEN** tests, browser verification, logs, screenshots, traces, or generated evidence are produced
- **THEN** those artifacts SHALL be stored under `artifacts/` and SHALL NOT be left in the repository root
