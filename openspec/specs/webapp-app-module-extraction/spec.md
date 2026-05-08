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
The WebApp SHALL introduce shared type and utility modules only when they are needed to preserve one-directional imports for extracted components.

#### Scenario: Shared WebApp types are introduced
- **WHEN** extracted modules need `Gem`, tooltip, floating item, equipment display, battle guide, or VFX view types
- **THEN** the WebApp SHALL place only shape-preserving type definitions in thin shared type modules and SHALL NOT add runtime behavior, storage access, browser side effects, backend calls, or gameplay calculations to those type modules

#### Scenario: Pure display helpers are introduced
- **WHEN** extracted modules need deterministic formatting, CSS token, rich-text, sprite-frame, or display geometry helpers
- **THEN** those helpers SHALL be pure and SHALL NOT read or mutate React state, refs, local storage, save data, runtime event queues, enemy/player state, backend services, or global browser state beyond explicit inputs

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
