## ADDED Requirements

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
