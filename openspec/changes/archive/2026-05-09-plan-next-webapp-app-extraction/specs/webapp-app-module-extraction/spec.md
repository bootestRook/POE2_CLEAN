## ADDED Requirements

### Requirement: Planned App extraction follows risk-ordered batches
The WebApp SHALL perform the next `webapp/App.tsx` extraction pass in risk-ordered batches that preserve existing behavior and commit each completed batch before beginning the next.

#### Scenario: Tooltip extraction runs before interaction and storage extraction
- **WHEN** the next extraction implementation begins
- **THEN** tooltip view-model, tooltip normalization, tooltip rich-text, tooltip tag, and tooltip formatting helpers SHALL be extracted before inventory/equipment placement helpers or save-storage helpers

#### Scenario: Inventory and equipment helpers stay pure during extraction
- **WHEN** inventory and equipment helper code is extracted
- **THEN** the moved code SHALL preserve existing item classification, equipment-slot targeting, two-handed weapon handling, comparison lookup, and placement helper behavior without moving App-owned drag state, save writes, storage writes, or equipment stat recalculation

#### Scenario: Save storage extraction is isolated
- **WHEN** local save-slot or autosave helpers are extracted
- **THEN** that extraction SHALL be implemented as its own batch and SHALL preserve existing storage keys, payload shape, migration behavior, active-slot behavior, error text, and save/load semantics

### Requirement: High-risk gameplay runtime remains out of the next plan
The WebApp SHALL NOT include combat runtime ownership extraction in the next tooltip, inventory/equipment, or save-storage extraction batches.

#### Scenario: Combat runtime code is encountered during a batch
- **WHEN** a planned extraction would require moving or changing monster AI, enemy navigation, damage resolution, skill event generation, projectile targeting, hit timing, damage-zone origin, runtime event consumption, or battle-loop mutation
- **THEN** that work SHALL stop or be moved to a separate explicitly scoped change before implementation continues

#### Scenario: Extracted modules do not add alternate runtimes
- **WHEN** tooltip, inventory/equipment, or save-storage code is moved out of `webapp/App.tsx`
- **THEN** the extracted modules SHALL NOT introduce backend coupling, server runtime behavior, duplicate frontend gameplay runtimes, or skill-editor acceptance paths

### Requirement: Each extraction batch is verified and committed independently
The WebApp SHALL verify each planned extraction batch before committing it and before starting the next batch.

#### Scenario: Batch checks pass before commit
- **WHEN** a tooltip, inventory/equipment, or save-storage extraction batch is completed
- **THEN** `npm run build`, `npm test`, and any focused checks for touched modules SHALL pass or any remaining failure SHALL be documented as pre-existing and unrelated before the batch is committed

#### Scenario: Frontend behavior is visually accepted
- **WHEN** a batch affects frontend rendering or interaction
- **THEN** verification SHALL launch or match the project `run.bat` WebApp flow, exercise the actual playable view affected by the batch, capture screenshots under `artifacts/screenshots/`, and describe the visible result

#### Scenario: Batch boundaries remain reviewable
- **WHEN** a batch is ready to commit
- **THEN** the final diff for that batch SHALL be reviewed to confirm it does not include unrelated refactors, CSS redesign, copy changes, dependency changes, save-schema changes, gameplay behavior changes, backend calls, or skill-editor acceptance changes
