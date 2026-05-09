## ADDED Requirements

### Requirement: Architecture-boundary extraction isolates disabled tooling
The WebApp SHALL isolate disabled or inactive App tooling code from active playable WebApp orchestration during architecture-boundary extraction while preserving the current disabled behavior.

#### Scenario: Disabled skill-editor code is moved without enabling it
- **WHEN** disabled skill-editor types, panels, request stubs, arena views, or editor-only helpers are moved out of `webapp/App.tsx`
- **THEN** the moved boundary SHALL preserve existing disabled behavior, throw-only request paths, text, class names, storage keys, and imports without adding a skill-editor acceptance route or re-enabling editor gameplay tooling

#### Scenario: Playable WebApp searches avoid disabled tooling noise
- **WHEN** disabled tooling is extracted from `webapp/App.tsx`
- **THEN** the extracted files SHALL be placed under an explicitly named disabled tooling boundary so future playable WebApp feature work can search active runtime and presentation modules without matching inactive editor implementation by default

### Requirement: Architecture-boundary extraction uses one-directional domain types
The WebApp SHALL use thin shared type-only modules to support architecture extraction when focused modules need domain shapes currently declared in `webapp/App.tsx`.

#### Scenario: Shared domain type modules preserve existing shapes
- **WHEN** gem, skill preview, App state, save payload, player runtime, enemy runtime, battle VFX, drop, tooltip, or map progression shapes are moved out of `webapp/App.tsx`
- **THEN** the moved type definitions SHALL preserve existing field names, optionality, literal values, and semantic meaning and SHALL NOT introduce runtime logic, storage access, browser side effects, backend calls, or gameplay calculations

#### Scenario: Extracted modules do not import from App
- **WHEN** a focused feature, runtime, component, or utility module needs shared WebApp shapes
- **THEN** it SHALL import those shapes from type-only domain modules or local generic props and SHALL NOT import from `webapp/App.tsx`

### Requirement: Playable battle scene extraction remains presentation-only
The WebApp SHALL extract playable battle scene presentation and canvas snapshot assembly into focused client-side modules without transferring gameplay ownership to those modules.

#### Scenario: Battle scene renders supplied runtime state
- **WHEN** terrain layers, battle entities, visual effects, canvas geometry snapshots, minimap, ground drops, boss portal, rest-area interactables, or HUD overlays are moved out of `webapp/App.tsx`
- **THEN** the extracted module SHALL render supplied state, refs, callbacks, projection helpers, and view data without owning monster behavior, damage application, projectile lifecycle, target anchoring, drop pickup rules, minimap exploration, map-run progression, or runtime event queues

#### Scenario: Battle scene render order is preserved
- **WHEN** battle scene presentation is extracted
- **THEN** the extracted module SHALL preserve existing DOM order, class names, aria labels, canvas placement, layer ordering, text, projection behavior, and rendering gates such as canvas or legacy DOM fallback flags

### Requirement: Enemy runtime helper extraction preserves gameplay behavior
The WebApp SHALL move enemy runtime and navigation helper implementations into focused client-side runtime modules only as behavior-preserving extraction.

#### Scenario: Enemy movement helpers are moved without formula changes
- **WHEN** enemy spatial indexing, navigation context creation, crowd steering, wall scoring, melee reachability, collision separation, renderable enemy selection, or runtime debug boundary scan helpers are moved out of `webapp/App.tsx`
- **THEN** the moved code SHALL preserve existing formulas, constants, function inputs, function outputs, deterministic behavior, map walkability usage, player contact behavior, runtime-tier behavior, and debug scan semantics

#### Scenario: Enemy runtime extraction does not create alternate gameplay paths
- **WHEN** enemy runtime helpers are extracted
- **THEN** the extracted runtime modules SHALL be consumed by the existing playable battle path and SHALL NOT introduce backend coupling, server runtime behavior, duplicate frontend gameplay runtimes, skill-editor acceptance, or separate target selection and damage application paths

### Requirement: Architecture-boundary batches are verified independently
The WebApp SHALL implement architecture-boundary extraction in independently verified batches before continuing to the next batch.

#### Scenario: Disabled tooling extraction is verified before runtime extraction
- **WHEN** disabled tooling extraction is completed
- **THEN** focused checks, `npm run build`, `npm test` or documented unrelated blockers, and final diff review SHALL confirm that playable behavior, disabled editor behavior, backend coupling, storage keys, save schema, CSS, copy, and dependencies are unchanged before enemy runtime extraction begins

#### Scenario: Playable battle extraction is visually accepted
- **WHEN** battle scene presentation or enemy runtime helper extraction affects frontend rendering or interaction
- **THEN** verification SHALL launch or match the project `run.bat` WebApp flow, exercise the actual playable view, capture screenshots under `artifacts/screenshots/`, describe the visible result, and leave no screenshots, logs, traces, or generated verification artifacts in the repository root

#### Scenario: Runtime extraction has focused behavioral checks
- **WHEN** enemy runtime helper modules are extracted
- **THEN** focused tests or smoke checks SHALL cover the moved helper paths sufficiently to catch import leaks, changed formulas, circular dependencies, missing exports, and unintended changes to playable monster runtime behavior
