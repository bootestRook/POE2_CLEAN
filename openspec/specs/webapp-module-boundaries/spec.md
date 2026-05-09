# webapp-module-boundaries Specification

## Purpose
TBD - created by archiving change split-webapp-app-without-behavior-changes. Update Purpose after archive.
## Requirements
### Requirement: WebApp modules are extracted without behavior changes

The WebApp SHALL allow `webapp/App.tsx` to be decomposed into focused client-side modules only when the extraction preserves existing behavior, text, styling, DOM structure, runtime calls, storage behavior, and rendering order.

#### Scenario: Leaf component extraction preserves behavior

- **WHEN** an existing App.tsx UI block is moved into a new WebApp component module
- **THEN** the moved component receives the same data and callbacks through props and renders the same user-visible result as before

#### Scenario: Extraction would require behavior edits

- **WHEN** a proposed extraction requires gameplay logic, save data, copy, CSS class, layout, runtime event, or storage behavior changes
- **THEN** implementation stops or splits the work into a separate explicitly scoped change before continuing

### Requirement: Future WebApp feature plans name a module boundary

Future WebApp feature work SHALL include a planning step that identifies the target existing module or the new focused module/folder where the feature belongs before implementation begins.

#### Scenario: New feature has an existing module

- **WHEN** a future plan adds a WebApp feature that matches an existing module boundary
- **THEN** the plan names that module and keeps the implementation inside that boundary unless a documented dependency requires otherwise

#### Scenario: New feature lacks a module

- **WHEN** a future WebApp feature does not fit an existing module boundary
- **THEN** the plan proposes a new focused client-side module instead of adding the feature directly to the App.tsx monolith

### Requirement: AI-facing guidance records the module rule

The repository SHALL include AI-visible development guidance that tells future Codex work to avoid growing `webapp/App.tsx` and to place new WebApp functionality in focused modules.

#### Scenario: Future AI-assisted implementation starts

- **WHEN** Codex prepares a non-trivial WebApp implementation plan
- **THEN** the repository guidance tells it to identify the target WebApp module or propose a new module before editing

### Requirement: Frontend extraction is visually verified in the actual WebApp

Every frontend-affecting extraction SHALL be verified through the actual WebApp launched by the project `run.bat` flow and SHALL store screenshots under `artifacts/screenshots/` instead of the repository root.

#### Scenario: Visible UI is extracted

- **WHEN** an extracted module affects visible WebApp UI
- **THEN** implementation records a screenshot from the running WebApp and describes the visible result before claiming the behavior is preserved

#### Scenario: Verification cannot be completed

- **WHEN** build, launch, browser, or existing unrelated workspace damage prevents visual verification
- **THEN** implementation reports the blocker and does not claim the frontend behavior was observed working

