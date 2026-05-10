## ADDED Requirements

### Requirement: Runtime orchestration extraction follows explicit ownership phases
The WebApp SHALL continue reducing `webapp/App.tsx` by moving runtime code only through explicit, independently verified ownership phases.

#### Scenario: Type and constant boundaries move before runtime behavior
- **WHEN** runtime extraction begins
- **THEN** shared domain shapes and stable constants needed by extracted modules SHALL move to `webapp/types/`, `webapp/runtime/`, or focused existing owners before event generation, event consumption, battle loop, or state mutation ownership is moved

#### Scenario: Pure helpers move before side-effect orchestration
- **WHEN** a helper can be evaluated from explicit inputs without React state, refs, local storage, browser effects, backend calls, or runtime queues
- **THEN** it SHALL be extracted before moving any function that mutates player state, enemy state, combat logs, visual queues, drops, map progression, or save state

#### Scenario: App keeps top-level wiring until replacement owner exists
- **WHEN** no focused runtime owner exists for a state/ref group, callback adapter, save/rest/map flow, or runtime queue
- **THEN** `webapp/App.tsx` SHALL keep that orchestration and the task SHALL record it as intentionally App-owned instead of moving it into an unrelated module

### Requirement: Shared runtime types remain behavior-free
Shared runtime and domain types extracted from `webapp/App.tsx` SHALL preserve shapes without adding runtime behavior.

#### Scenario: Type modules preserve existing fields
- **WHEN** `SkillEvent`, `Gem`, `AppState` slices, save payload, player runtime, enemy runtime, battle VFX, drop, tooltip, or map progression shapes are moved
- **THEN** the moved types SHALL preserve field names, optionality, literal values, and semantic shape used by current WebApp code

#### Scenario: Type modules stay dependency-light
- **WHEN** a shared type module is created or extended
- **THEN** it SHALL NOT import `webapp/App.tsx`, React runtime state, generated data, browser APIs, storage helpers, backend calls, gameplay mutation code, or event-consuming code

### Requirement: Playable skill event builders preserve payload contracts
Frontend playable skill event builder extraction SHALL preserve existing normal-play event contracts while making each skill family searchable in focused runtime modules.

#### Scenario: Projectile and chain builders preserve events
- **WHEN** projectile, chain, module-chain, pierce, fork, hit VFX, or floating-text event construction is moved out of `webapp/App.tsx`
- **THEN** the moved code SHALL preserve event ids, event types, target/source entities, delay and duration fields, projectile ids, positions, directions, ranges, widths, radius fields, damage payload fields, follow-up suppression keys, VFX keys, and floating-text payloads

#### Scenario: Damage-zone and melee builders preserve events
- **WHEN** damage-zone, dynamic tick, melee-arc, nova, channel, status, or forced-movement event construction is moved
- **THEN** the moved code SHALL preserve zone ids, origins, radii, shape fields, repeat fields, movement policies, movement scopes, status payloads, damage payloads, timing fields, and visual payloads

#### Scenario: Event builders do not consume runtime state
- **WHEN** a skill event builder module is extracted
- **THEN** it SHALL return events and derived payloads from explicit inputs and SHALL NOT call `setEnemies`, `setRuntimePlayer`, `consumeSkillEventBatch`, `consumeSkillEventTimeline`, storage writes, backend APIs, or map-run mutation functions

### Requirement: Damage status and resource helpers remain deterministic
Damage, status, resource, and lifecycle helper extraction SHALL preserve existing formulas and leave React mutation ownership explicit.

#### Scenario: Enemy damage helpers preserve formulas
- **WHEN** enemy damage scaling, resistance, armor, block, avoidance, damage-over-time aggravation, ailment, energy-shield, or life resource helpers are moved
- **THEN** the moved helpers SHALL preserve numeric formulas, order of operations, roll-key behavior, status interactions, resource ordering, and returned values

#### Scenario: Player resource helpers preserve formulas
- **WHEN** player resource regeneration, energy-shield recharge, mana-before-life, block recovery, life return, shield return, or incoming damage helper code is moved
- **THEN** the moved helpers SHALL preserve current formulas, cooldown semantics, resource order, and state result shape

#### Scenario: App keeps mutation until a focused owner moves it
- **WHEN** damage/status/resource helpers are extracted
- **THEN** App SHALL keep React state mutation, runtime refs, death handling, kill/drop progression, combat log mutation, and visual queue mutation unless a later task explicitly defines and verifies a focused owner for that mutation

### Requirement: Battle runtime orchestration boundaries are introduced only after helper extraction
The WebApp SHALL introduce battle runtime orchestration services or hooks only after their pure helper and event builder dependencies are extracted and tested.

#### Scenario: Runtime service has explicit dependencies
- **WHEN** a battle runtime service, adapter, or hook is introduced
- **THEN** it SHALL receive explicit state snapshots, refs, setters, callback adapters, and clock inputs instead of importing from `webapp/App.tsx` or reading hidden globals

#### Scenario: Runtime service does not create a second gameplay path
- **WHEN** runtime orchestration is extracted
- **THEN** the extracted owner SHALL be consumed by the existing playable WebApp path and SHALL NOT introduce alternate target selection, hit timing, projectile trajectory decisions, damage-zone origin decisions, damage application, map progression, or event consumption paths

#### Scenario: App final responsibility is recorded
- **WHEN** the runtime orchestration extraction pass is complete
- **THEN** implementation notes SHALL record the remaining App-owned mode routing, cross-domain state/ref initialization, callback adapters, save/rest/map flow wiring, and intentionally deferred runtime ownership

### Requirement: Runtime extraction verification protects behavior
The WebApp SHALL verify runtime extraction with source-boundary, executable smoke, build, OpenSpec, and playable browser checks.

#### Scenario: Smoke checks follow moved owners
- **WHEN** a protected runtime function or invariant moves out of `webapp/App.tsx`
- **THEN** `webapp/smoke-test.mjs` or a focused test SHALL read the owning source module and keep an equivalent invariant check

#### Scenario: Extracted modules cannot regress boundaries
- **WHEN** smoke tests run after runtime extraction
- **THEN** they SHALL fail if extracted runtime modules import from `webapp/App.tsx`, call backend gameplay APIs, use disabled skill-editor acceptance paths, or duplicate frontend gameplay runtimes

#### Scenario: Each batch is verified before commit
- **WHEN** a runtime extraction batch is completed
- **THEN** `cmd /c npm run build`, `npm test`, relevant focused runtime checks, and `openspec validate extract-webapp-runtime-orchestration-from-app --strict` SHALL pass before the batch is committed

#### Scenario: Playable browser verification covers affected runtime surfaces
- **WHEN** a batch can affect playable battle rendering, interaction, runtime event timing, damage areas, projectiles, status, drops, or pause/map/rest flow
- **THEN** verification SHALL launch or match the project `run.bat` WebApp flow, exercise the actual playable view, capture screenshots under `artifacts/screenshots/`, store logs under `artifacts/logs/`, and avoid root-level artifacts
