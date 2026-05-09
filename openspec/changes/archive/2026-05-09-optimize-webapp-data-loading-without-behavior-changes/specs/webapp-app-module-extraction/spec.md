## MODIFIED Requirements

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
