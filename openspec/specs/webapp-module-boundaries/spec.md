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

### Requirement: Future WebApp code uses an owner-first planning rule
Future WebApp implementation work SHALL identify the focused owner module before editing WebApp code, and SHALL update the module plan before implementation when no owner exists.

#### Scenario: Existing owner is named before editing
- **WHEN** a non-trivial WebApp task is planned
- **THEN** the plan SHALL name the existing owner module or folder for the change before editing `webapp/App.tsx` or any WebApp feature file

#### Scenario: Missing owner creates a planning task first
- **WHEN** a WebApp task does not fit an existing owner module or folder
- **THEN** the task SHALL first update the WebApp module-boundary documentation or add a focused module plan, and SHALL NOT add the new feature directly to `webapp/App.tsx`

#### Scenario: App edits require explicit justification
- **WHEN** a WebApp task proposes editing `webapp/App.tsx`
- **THEN** the plan SHALL state whether the edit is orchestration wiring, state/ref initialization, mode routing, or an unavoidable adapter call; otherwise the work SHALL move to a focused module

### Requirement: Future WebApp code follows the architecture owner map
Future WebApp code SHALL use the documented owner map as the first destination for new modules, refactors, tests, and source-boundary checks.

#### Scenario: Runtime, presentation, and state code stay separated
- **WHEN** future WebApp code is added for UI display, gameplay runtime formulas, runtime event construction, App state/save helpers, domain types, or pure formatting
- **THEN** the code SHALL be placed in the matching presentation, runtime, state, type-only, or utility owner module and SHALL NOT mix those responsibilities in a new App-local block

#### Scenario: Tests follow ownership
- **WHEN** future WebApp source-text, smoke, or focused tests protect behavior in an extracted module
- **THEN** those tests SHALL read the owning module or an explicit combined source for that ownership boundary and SHALL NOT require the protected implementation to remain in `webapp/App.tsx`

#### Scenario: Documentation stays current after new boundaries
- **WHEN** implementation creates a new WebApp module boundary or changes the owner map
- **THEN** the module-boundary docs and relevant OpenSpec requirements SHALL be updated in the same change before the implementation is considered complete

### Requirement: Future WebApp changes prevent App regression
Future WebApp changes SHALL prevent `webapp/App.tsx` from regaining responsibilities that have been assigned to focused modules.

#### Scenario: New code does not duplicate extracted ownership
- **WHEN** a focused module already owns a UI surface, helper family, runtime formula, event builder, state helper, or type shape
- **THEN** future changes SHALL extend that owner or a deliberate adjacent owner and SHALL NOT recreate the same responsibility inside `webapp/App.tsx`

#### Scenario: App remains a wiring point only
- **WHEN** future code must touch App after the final architecture pass
- **THEN** the App change SHALL be limited to importing the focused module, passing existing state/callbacks, initializing cross-domain state/refs, or connecting top-level modes, unless a separate architecture change explicitly scopes a new App responsibility

#### Scenario: Boundary violations are blockers
- **WHEN** review or verification finds new backend coupling, duplicate gameplay runtime, skill-editor acceptance, root-level artifacts, unexplained App-local feature code, or mixed UI/runtime/state ownership
- **THEN** the change SHALL be corrected before it is considered complete

