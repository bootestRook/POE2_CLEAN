# webapp-app-module-extraction Specification

## Purpose
TBD - created by archiving change continue-webapp-app-module-extraction. Update Purpose after archive.
## Requirements
### Requirement: App extraction preserves existing WebApp behavior
The WebApp SHALL continue extracting `webapp/App.tsx` into focused client-side modules without changing user-visible behavior, gameplay behavior, persisted state shape, storage keys, class names, text, DOM order, rendering order, or runtime event consumption.

#### Scenario: Leaf code is moved without behavior changes
- **WHEN** a component, helper, hook, or type is moved out of `webapp/App.tsx`
- **THEN** the moved code SHALL preserve the same props, callback behavior, rendered markup, class names, text, storage behavior, and runtime calls as before the move

#### Scenario: Extraction stops when behavior would change
- **WHEN** a proposed extraction requires changing gameplay logic, save data, CSS, copy, runtime event payloads, dependency setup, or rendering order
- **THEN** that extraction SHALL stop or be split into a separate explicitly scoped change

### Requirement: App-owned runtime state remains stable during extraction
The WebApp SHALL keep existing App-owned state, runtime refs, and gameplay orchestration in `webapp/App.tsx` unless a later change explicitly scopes and verifies state movement.

#### Scenario: Component receives existing state through props
- **WHEN** a presentational component is extracted from `webapp/App.tsx`
- **THEN** it SHALL receive existing values and callbacks through props instead of introducing new ownership for gameplay state, save state, runtime refs, or cross-cutting side effects

#### Scenario: Hook extraction requires clear ownership
- **WHEN** a hook is extracted from `webapp/App.tsx`
- **THEN** the hook SHALL have a focused ownership boundary and SHALL NOT combine unrelated gameplay, inventory, save, tooltip, and battle-loop responsibilities

### Requirement: Shared types unblock one-directional imports
The WebApp SHALL use thin shared type modules only when they are needed to let extracted modules import types without importing from `webapp/App.tsx`.

#### Scenario: Type extraction preserves shapes
- **WHEN** a shared type is moved into `webapp/types/`
- **THEN** the moved type SHALL preserve the existing field names, optionality, literal values, and semantic shape used by the current WebApp code

#### Scenario: Type modules do not own runtime logic
- **WHEN** a new type module is created for extraction
- **THEN** it SHALL NOT introduce runtime calculations, browser side effects, storage access, backend calls, or gameplay behavior

### Requirement: Extracted battle presentation does not duplicate gameplay runtime
Extracted battle presentation modules SHALL render existing client runtime state and events without recalculating gameplay decisions.

#### Scenario: Visual module renders supplied projectile state
- **WHEN** projectile or hit VFX presentation is moved out of `webapp/App.tsx`
- **THEN** the extracted module SHALL render the supplied projectile, hit, and timing state and SHALL NOT recalculate trajectory, target selection, hit timing, damage, pierce, chain, or damage-zone origins

#### Scenario: Battle HUD module renders supplied data
- **WHEN** a battle HUD, boss health, minimap, ground drop, or resource panel is extracted
- **THEN** the extracted module SHALL render the supplied App/runtime data and SHALL NOT own gameplay simulation, monster behavior, damage application, pickup rules, or map-run progression

### Requirement: Extraction remains client-only and outside disabled tooling
All App extraction work SHALL remain client-only and SHALL be verified through the actual playable WebApp flow.

#### Scenario: No backend coupling is introduced
- **WHEN** code is extracted from `webapp/App.tsx`
- **THEN** the WebApp SHALL NOT add, restore, depend on, or call backend APIs, backend services, server runtimes, web API layers, or server-generated gameplay behavior

#### Scenario: Skill editor is not used for acceptance
- **WHEN** frontend behavior affected by extraction is verified
- **THEN** `/skill-editor`, `?skill_editor=1`, `view=skill_editor`, port `8765`, `dist-skill-editor`, and skill-editor preview surfaces SHALL NOT be used as acceptance evidence

#### Scenario: Playable WebApp screenshot verifies frontend changes
- **WHEN** an extraction affects frontend rendering or interaction
- **THEN** verification SHALL launch or match the project `run.bat` WebApp flow, exercise the actual playable view, capture a screenshot of the rendered result, and store it under `artifacts/screenshots/`

### Requirement: Next-pass extraction targets low-risk display boundaries
The WebApp SHALL continue `webapp/App.tsx` extraction through low-risk display and pure helper boundaries before attempting higher-coupling runtime ownership changes.

#### Scenario: Tooltip view-model helpers are extracted safely
- **WHEN** tooltip normalization, support tooltip display rules, equipment tooltip formatting, or tooltip-only display helpers are moved out of `webapp/App.tsx`
- **THEN** the moved code SHALL preserve existing tooltip text, rich text segments, tags, rarity tones, comparison behavior, icon behavior, class names, DOM order, and hover state ownership

#### Scenario: Inventory and equipment presentation helpers are extracted safely
- **WHEN** inventory, equipment, bag, stash, or floating item presentation code is moved out of `webapp/App.tsx`
- **THEN** the moved code SHALL receive existing slot arrays, item data, drag state, hover state, and callbacks through props and SHALL NOT own save state, storage writes, equipment stat recalculation, pickup rules, or drag/drop rules

#### Scenario: Battle guide overlays are extracted safely
- **WHEN** battle guide, damage-zone guide, projectile alignment debug, or runtime debug overlay presentation is moved out of `webapp/App.tsx`
- **THEN** the moved code SHALL render supplied positions, ranges, directions, labels, toggles, and debug state without recalculating target selection, trajectory timing, hit timing, damage-zone origin, damage, pierce, chain, monster behavior, or skill event results

#### Scenario: VFX presentation helpers are extracted safely
- **WHEN** remaining projectile, hit, sprite-sheet, frame-index, or legacy VFX presentation helpers are moved out of `webapp/App.tsx`
- **THEN** the moved code SHALL render supplied runtime visual state and SHALL NOT own projectile lifecycle, collision, follow-up suppression, target anchoring, damage application, floating text generation, or runtime event consumption

### Requirement: Next-pass extraction isolates shared types and pure helpers
The WebApp SHALL introduce shared type, utility, and data-access modules only when they are needed to preserve one-directional imports for extracted components and to keep large generated data outside startup-critical App paths.

#### Scenario: Shared WebApp types are introduced
- **WHEN** extracted modules need `Gem`, tooltip, floating item, equipment display, battle guide, or VFX view types
- **THEN** the WebApp SHALL place only shape-preserving type definitions in thin shared type modules and SHALL NOT add runtime behavior, storage access, browser side effects, backend calls, or gameplay calculations to those type modules

#### Scenario: Pure display helpers are introduced
- **WHEN** extracted modules need deterministic formatting, CSS token, rich-text, sprite-frame, or display geometry helpers
- **THEN** those helpers SHALL be pure and SHALL NOT read or mutate React state, refs, local storage, save data, runtime event queues, enemy/player state, backend services, or global browser state beyond explicit inputs

#### Scenario: Large generated data is accessed through focused modules
- **WHEN** extracted or existing WebApp modules need large generated data that is not required for the current first visible flow
- **THEN** the WebApp SHALL place that data behind focused client-side loader or accessor modules and SHALL NOT import the large data directly from `webapp/App.tsx` or other startup-critical presentation modules

#### Scenario: Existing dirty worktree changes are preserved
- **WHEN** implementation begins with unrelated dirty files or overlapping user edits
- **THEN** the extraction SHALL inspect and work with those edits without reverting, overwriting, or silently discarding them

### Requirement: Next-pass verification catches extraction leaks
The WebApp SHALL verify each next-pass extraction group strongly enough to catch missing imports, circular dependencies, and frontend regressions.

#### Scenario: Extraction group is committed only after checks
- **WHEN** a tooltip, inventory/equipment, guide/debug, or VFX extraction group is completed
- **THEN** `npm run build`, `npm test`, and focused TypeScript checks for touched modules SHALL pass or any remaining failures SHALL be explicitly identified as pre-existing and unrelated before that group is committed

#### Scenario: Playable WebApp remains the acceptance surface
- **WHEN** next-pass extraction affects frontend rendering or interaction
- **THEN** the implementation SHALL launch or match the project `run.bat` WebApp flow, exercise the actual playable view, capture screenshots under `artifacts/screenshots/`, and describe the visible result

#### Scenario: Root artifact hygiene is preserved
- **WHEN** tests, browser verification, or debugging produce screenshots, logs, traces, or generated evidence
- **THEN** those artifacts SHALL be stored under `artifacts/` and SHALL NOT be left in the repository root

### Requirement: Third-pass extraction targets remaining battle presentation
The WebApp SHALL continue `webapp/App.tsx` extraction by moving remaining render-only battle presentation code into focused client-side modules without changing playable behavior.

#### Scenario: Projectile body views are extracted safely
- **WHEN** projectile body components, projectile sprite presentation, projectile trail presentation, or projectile body display helpers are moved out of `webapp/App.tsx`
- **THEN** the moved code SHALL render supplied projectile state and SHALL NOT own projectile spawning, movement, collision, lifecycle, target selection, hit timing, damage, pierce, chain, or runtime event consumption

#### Scenario: Hit VFX views are extracted safely
- **WHEN** hit VFX components, impact sprite presentation, fork/nova/rain visual decorations, or hit display helpers are moved out of `webapp/App.tsx`
- **THEN** the moved code SHALL render supplied hit VFX state and SHALL NOT own damage application, floating text generation, follow-up suppression, target anchoring, projectile completion, or runtime event consumption

#### Scenario: Player buff overlays are extracted safely
- **WHEN** player buff overlay presentation is moved out of `webapp/App.tsx`
- **THEN** the moved code SHALL render supplied player and buff state without changing buff timing, guard state, movement channels, stat effects, runtime mutations, or skill results

### Requirement: Third-pass extraction isolates pure visual helpers
The WebApp SHALL move shared helper code only when the helper is deterministic display logic needed by extracted battle presentation modules.

#### Scenario: VFX classification helpers remain pure
- **WHEN** VFX kind selection, sprite sheet lookup, CSS token selection, visual tone selection, or scale normalization is moved into a shared helper module
- **THEN** the helper SHALL depend only on explicit inputs and SHALL NOT read or mutate React state, refs, local storage, save data, enemies, projectiles, player state, runtime queues, backend services, or global browser state

#### Scenario: Projectile and hit style helpers remain visual-only
- **WHEN** opacity, travel progress, world-to-screen style construction, ballistic shadow style, or impact visual scale helpers are moved out of `webapp/App.tsx`
- **THEN** the helpers SHALL preserve existing numeric formulas and SHALL NOT decide projectile lifecycle, collision, hit timing, target choice, damage, pierce, chain, or follow-up behavior

#### Scenario: Damage text helpers do not alter runtime damage
- **WHEN** damage number formatting or floating text component display helpers are moved out of `webapp/App.tsx`
- **THEN** the helpers SHALL preserve existing displayed text and component ordering and SHALL NOT change damage totals, damage component data, ailment results, hit results, or combat state

### Requirement: Third-pass guide overlays remain presentation-only
The WebApp SHALL keep skill guide and debug overlay extraction separate from gameplay runtime decisions.

#### Scenario: Skill guide layer renders supplied data
- **WHEN** skill guide layers, projectile alignment debug views, damage-zone guide views, or debug labels are moved out of `webapp/App.tsx`
- **THEN** the moved code SHALL render supplied skill/package/debug values and projection callbacks without recalculating target selection, hit timing, damage-zone origin, damage, pierce, chain, monster behavior, or skill event results

#### Scenario: Debug toggles keep existing ownership
- **WHEN** guide/debug overlay components are extracted
- **THEN** the extracted components SHALL receive existing debug option values through props and SHALL NOT introduce new storage keys, URL parameters, local state ownership, or debug setting persistence

### Requirement: Third-pass verification is incremental
The WebApp SHALL verify each third-pass extraction group before continuing to the next group.

#### Scenario: Each extraction group is checked and committed
- **WHEN** a visual helper, projectile body, hit VFX, player buff, or guide overlay extraction group is completed
- **THEN** `npm run build`, `npm test`, focused TypeScript checks for touched modules, and actual playable WebApp verification SHALL pass or any remaining failures SHALL be explicitly identified as pre-existing and unrelated before that group is committed

#### Scenario: Playable WebApp is the acceptance surface
- **WHEN** third-pass extraction affects frontend rendering or interaction
- **THEN** verification SHALL launch or match the project `run.bat` WebApp flow, exercise the actual playable view, capture screenshots under `artifacts/screenshots/`, and describe the visible result

#### Scenario: Artifact hygiene is preserved
- **WHEN** tests, browser verification, or debugging produce screenshots, logs, traces, or generated evidence
- **THEN** those artifacts SHALL be stored under `artifacts/` and SHALL NOT be left in the repository root

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

