## ADDED Requirements

### Requirement: Final App decomposition target
The WebApp SHALL complete `webapp/App.tsx` decomposition to a stable orchestration boundary instead of continuing indefinite line-count-driven splitting.

#### Scenario: App keeps only intentional orchestration
- **WHEN** the final App architecture pass is complete
- **THEN** `webapp/App.tsx` SHALL own top-level mode routing, App-owned cross-domain state/ref initialization, viewport shell composition, and callback wiring, and SHALL NOT contain large render-only inventory overlays, UI shell panels, monster skill pure helper logic, or monster skill event payload construction details

#### Scenario: App size is treated as a maintainability signal
- **WHEN** the final App architecture pass evaluates completion
- **THEN** the implementation SHALL use clear ownership, one-directional imports, and searchability as the completion criteria, and SHALL NOT create low-value micro-files solely to reduce `webapp/App.tsx` line count

#### Scenario: Extracted modules do not import App
- **WHEN** a module is extracted from `webapp/App.tsx`
- **THEN** the extracted module SHALL NOT import values, runtime functions, or types from `webapp/App.tsx`; shared shapes SHALL move to type-only modules when needed

### Requirement: Final WebApp module ownership map
The WebApp SHALL place remaining and future App-decomposition work into focused client-side module owners.

#### Scenario: Inventory and skill-board UI have focused owners
- **WHEN** inventory overlay, stash display, equipment grid, bag grid, floating item display, discard prompt, skill-board grid, board support lines, or board hover presentation is moved or extended
- **THEN** the work SHALL be placed under `webapp/components/inventory/` or `webapp/components/skill-board/` and SHALL receive existing state and callbacks through props without owning save writes, storage writes, drag/drop mutation, equipment stat recalculation, mounted skill recalculation, or gameplay runtime state

#### Scenario: Battle presentation and battle runtime have separate owners
- **WHEN** battle HUD, battle layers, VFX views, projectile bodies, hit effects, floating text views, minimap display, ground drops, boss portal display, or debug overlays are moved or extended
- **THEN** render-only work SHALL be placed under `webapp/components/battle/` or `webapp/features/playable-battle/`, while deterministic gameplay/runtime helpers SHALL be placed under `webapp/runtime/` and SHALL NOT duplicate target selection, hit timing, damage application, projectile trajectory decisions, or runtime event consumption

#### Scenario: Save state and drop helpers have focused owners
- **WHEN** save/load/autosave helpers, frontend state creation, starter state, save payload conversion, stash state helpers, map-stage selection, drop rolls, drop payload creation, or inventory-item-from-drop creation are moved or extended
- **THEN** the work SHALL be placed under `webapp/state/`, `webapp/utils/frontendSaveStorage.ts`, or existing focused inventory/drop state helpers and SHALL preserve storage keys, payload shape, migration behavior, item identity, and recalculation order

#### Scenario: Shared types remain behavior-free
- **WHEN** extracted modules need `Gem`, `AppState`, save payload, player runtime, enemy runtime, battle VFX, drop, tooltip, map progression, or board shapes
- **THEN** those shapes SHALL live in thin `webapp/types/` modules or local generic props and SHALL NOT include runtime calculations, browser effects, storage access, generated data imports, backend calls, or gameplay mutation

### Requirement: Final extraction sequence is risk ordered
The WebApp SHALL finish App decomposition in independently verified batches ordered from render-only and pure-helper work toward higher-coupling runtime ownership.

#### Scenario: Inventory overlay is extracted before runtime ownership changes
- **WHEN** implementation begins this final architecture pass
- **THEN** inventory overlay and related render-only UI composition SHALL be extracted before moving battle-loop ownership, monster AI ownership, damage application ownership, or projectile lifecycle ownership

#### Scenario: Monster skill pure helpers move before event builders
- **WHEN** monster skill code is extracted from `webapp/App.tsx`
- **THEN** pure helpers such as spread angle selection, zone center selection, aim policy, VFX key selection, damage type/form passthrough, and suppress-hit-VFX rules SHALL move before event builder functions or React side-effect orchestration

#### Scenario: Event builders move before runtime hooks
- **WHEN** monster skill event payload construction is extracted
- **THEN** event builder modules SHALL preserve existing `SkillEvent` payload shapes, ids, timing fields, damage payload fields, leash fields, VFX keys, and source metadata before any `usePlayableBattleRuntime` or similar runtime-owner hook is introduced

#### Scenario: Runtime hook extraction is allowed only after pure boundaries stabilize
- **WHEN** a later batch proposes moving battle-loop or monster skill side-effect ownership into a hook
- **THEN** the hook SHALL have a single focused owner, explicit dependencies, focused tests, no backend coupling, no duplicate gameplay runtime, and no behavior changes to target selection, hit timing, damage, movement, drops, or event consumption

### Requirement: Monster skill runtime boundaries are searchable and canonical
The WebApp SHALL make monster skill runtime code searchable through focused modules while preserving the existing playable runtime as the only gameplay path.

#### Scenario: Candidate and timer logic remains in monsterSkillRuntime
- **WHEN** monster skill assignment lookup, config validation, distance readiness, cooldown readiness, aggro-start timing, sequence tracking, or release marking is changed
- **THEN** that work SHALL belong in `webapp/monsterSkillRuntime.ts` or a directly focused runtime module and SHALL remain client-only

#### Scenario: Monster skill presentation helpers are pure
- **WHEN** monster skill spread angles, zone centers, aim policies, VFX key selection, or display-only skill classifications are changed
- **THEN** that work SHALL belong in a pure `webapp/runtime/monsterSkillPresentation.ts`-style module and SHALL depend only on explicit inputs

#### Scenario: Monster skill event building preserves payload contracts
- **WHEN** monster projectile, damage-zone, melee-arc, guard, support, charge, or ambush event payload construction is changed
- **THEN** that work SHALL belong in a focused event-builder module and SHALL preserve existing playable event payload contracts unless a separate behavior change explicitly modifies and verifies those contracts

#### Scenario: App remains the side-effect owner until explicitly moved
- **WHEN** monster skill extraction reaches `setTexts`, `setAreaNovas`, `consumeSkillEventTimeline`, pending player-hit queues, runtime refs, or battle-loop scheduling
- **THEN** those side effects SHALL remain App-owned unless a separate focused runtime-ownership batch scopes, tests, and visually verifies the ownership move

### Requirement: Final architecture verification protects ownership and behavior
The WebApp SHALL verify the final App architecture pass with source-boundary, build, test, and actual playable WebApp checks.

#### Scenario: Source-boundary checks prevent App backsliding
- **WHEN** the final architecture pass is complete
- **THEN** tests or smoke checks SHALL assert that extracted owner modules exist, extracted modules do not import from `webapp/App.tsx`, and protected behavior checks read the owning source files instead of requiring moved functions to remain in App

#### Scenario: Build and focused checks pass per batch
- **WHEN** each extraction batch is completed
- **THEN** `npm run build`, `npm test`, and any focused checks for touched modules SHALL pass or any remaining failure SHALL be identified as pre-existing and unrelated before continuing to the next batch

#### Scenario: Playable WebApp remains the visual acceptance surface
- **WHEN** the final architecture pass affects frontend rendering or interaction
- **THEN** verification SHALL launch or match the project `run.bat` WebApp flow, exercise the actual playable WebApp view, capture screenshots under `artifacts/screenshots/`, describe the visible result, and SHALL NOT use the disabled skill editor as acceptance evidence

#### Scenario: Final diff is architecture-only
- **WHEN** the final architecture pass is ready for completion
- **THEN** the final diff SHALL be reviewed to confirm it does not include backend calls, server runtime behavior, duplicate gameplay runtimes, save-schema changes, storage-key changes, CSS redesign, copy changes, gameplay balance changes, unrelated refactors, root-level screenshots, or root-level logs
