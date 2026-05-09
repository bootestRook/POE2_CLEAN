## ADDED Requirements

### Requirement: UI shell extraction remains presentation-only
The WebApp SHALL extract remaining lightweight `webapp/App.tsx` UI shell sections into focused client-side presentation modules without changing visible behavior or App-owned state.

#### Scenario: Overlay and panel modules receive existing callbacks
- **WHEN** monster-test controls, pause overlays, failure overlays, portal confirmation overlays, help text, debug toggles, spawn warnings, or combat feed display are moved out of `webapp/App.tsx`
- **THEN** the extracted modules SHALL receive existing display values and callbacks through props and SHALL preserve text, class names, aria labels, DOM order, button order, rendering gates, and callback behavior

#### Scenario: UI shell modules do not own runtime state
- **WHEN** a UI shell section is extracted
- **THEN** the extracted module SHALL NOT own gameplay state, save state, storage writes, runtime refs, battle loop mutation, skill event queues, monster behavior, damage application, pickup rules, or map-run progression

### Requirement: Client state and save helper extraction preserves local behavior
The WebApp SHALL move client-only App state, save payload, starter state, and stash helper code into focused modules only when the move preserves current local behavior exactly.

#### Scenario: Save helper extraction preserves storage semantics
- **WHEN** initial state creation, new-save starter state, save payload conversion, autosave writes, active-slot behavior, or save migration helpers are moved out of `webapp/App.tsx`
- **THEN** the moved helpers SHALL preserve existing storage keys, payload shape, migration behavior, player-name normalization, starter gem rules, recalculation order, and save/load semantics

#### Scenario: Stash helper extraction preserves ownership rules
- **WHEN** stash page creation, stash normalization, stash item id collection, stash item removal, or stash slot movement helpers are moved out of `webapp/App.tsx`
- **THEN** the moved helpers SHALL preserve existing page counts, slot counts, duplicate rejection, foreign-item rejection, board/equipment ownership exclusion, slot movement behavior, and sanitized state results

#### Scenario: Extracted helpers remain client-only
- **WHEN** client state, save, or stash helpers are extracted
- **THEN** the extracted modules SHALL NOT add backend calls, server runtime behavior, new dependencies, save schema changes, storage key changes, gameplay runtime ownership, or alternate App state stores

### Requirement: Smoke tests follow extracted source boundaries
The WebApp smoke checks SHALL continue protecting behavior after extraction without requiring protected functions to remain directly in `webapp/App.tsx`.

#### Scenario: Function-body checks read the owning source file
- **WHEN** a function currently checked through `functionBody(app, ...)` is moved to a focused module
- **THEN** the smoke test SHALL read that focused source file or an explicit combined source containing that file and SHALL keep the equivalent behavior invariant check

#### Scenario: App-specific checks remain App-specific only when ownership remains there
- **WHEN** smoke checks assert App-owned orchestration such as `stepGame`, runtime event consumption, mutable refs, or playable battle loop behavior
- **THEN** those checks SHALL remain tied to the source that actually owns that behavior and SHALL NOT be weakened into broad text searches that miss ownership regressions

### Requirement: Runtime extraction is deferred from this batch
The WebApp SHALL keep combat and skill runtime ownership in the existing playable App path during this UI shell and client state extraction batch.

#### Scenario: Runtime code is encountered while extracting client state or UI shell
- **WHEN** an extraction would require moving or changing monster AI, enemy navigation, damage resolution, skill event generation, projectile targeting, hit timing, damage-zone origins, runtime event consumption, battle-loop mutation, pickup completion, or map-run progression
- **THEN** that work SHALL stop or be moved to a separate explicitly scoped change before implementation continues

#### Scenario: Extracted modules do not introduce alternate gameplay paths
- **WHEN** UI shell, client state, save, or stash helper modules are created
- **THEN** those modules SHALL be consumed by the existing playable WebApp path and SHALL NOT introduce backend coupling, server runtime behavior, duplicate frontend gameplay runtimes, or skill-editor acceptance paths

### Requirement: UI and client state extraction is verified in batches
The WebApp SHALL verify each UI shell or client state extraction group before continuing to the next group.

#### Scenario: Extraction batch passes build and smoke checks
- **WHEN** a UI shell, client state/save, stash helper, or smoke-test source-boundary extraction group is completed
- **THEN** `npm run build`, `npm test`, and focused checks for touched modules SHALL pass or any remaining failures SHALL be explicitly identified as pre-existing and unrelated before continuing

#### Scenario: Frontend behavior is visually accepted
- **WHEN** an extraction affects frontend rendering or interaction
- **THEN** verification SHALL launch or match the project `run.bat` WebApp flow, exercise the actual playable view affected by the batch, capture screenshots under `artifacts/screenshots/`, and describe the visible result

#### Scenario: Final diff remains behavior-preserving
- **WHEN** a batch is ready for review
- **THEN** the final diff SHALL be checked to confirm it does not include unrelated refactors, copy changes, CSS redesign, dependency changes, save-schema changes, gameplay behavior changes, backend calls, root-level screenshots/logs, or skill-editor acceptance changes
