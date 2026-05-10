## ADDED Requirements

### Requirement: WebApp plans declare the App composition role before editing

Future non-trivial WebApp implementation work SHALL include an explicit `App.tsx role` statement before editing any WebApp source file when the work may touch `webapp/App.tsx` or introduce a new WebApp feature.

#### Scenario: App is only used for composition wiring

- **WHEN** a WebApp implementation plan expects to edit `webapp/App.tsx`
- **THEN** the plan SHALL state the focused component, hook, state value, prop, callback, mode route, or app-shell ref that App will wire
- **AND** the plan SHALL state that no feature UI structure, feature-owned state, business rule, display text branch, or data transform will live in `webapp/App.tsx`

#### Scenario: WebApp feature has no owner module

- **WHEN** a planned WebApp feature does not fit an existing owner module or folder
- **THEN** the plan SHALL create or update the focused owner module boundary before feature implementation begins
- **AND** the implementation SHALL NOT add the feature directly to `webapp/App.tsx` as the fallback destination

#### Scenario: App edit is expected to exceed the composition threshold

- **WHEN** a planned `webapp/App.tsx` edit is expected to exceed roughly 15-20 lines
- **THEN** the implementation SHALL first split the feature into a focused module unless the plan documents that the extra lines are app-shell ownership rather than feature ownership

### Requirement: App-level exceptions are justified before implementation

Future WebApp work SHALL allow `webapp/App.tsx` exceptions only when they are documented before editing as app-shell responsibilities with a bounded scope and extraction exit condition.

#### Scenario: App needs non-wiring logic

- **WHEN** a WebApp implementation needs to place logic in `webapp/App.tsx` that is not simple import, mounting, prop passing, callback forwarding, top-level mode routing, or app-shell state/ref initialization
- **THEN** the plan SHALL document the reason the logic belongs to App, the expected scope of the App diff, and the condition that would require extraction into a focused module

#### Scenario: Small App diff still adds feature ownership

- **WHEN** a proposed `webapp/App.tsx` edit adds feature UI structure, feature-owned state, business rules, display text decisions, or data transforms
- **THEN** the edit SHALL be treated as a module-boundary violation even if the line count is small
