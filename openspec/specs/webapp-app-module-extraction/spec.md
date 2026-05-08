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

