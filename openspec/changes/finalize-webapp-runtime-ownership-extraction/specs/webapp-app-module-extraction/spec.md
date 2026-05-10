## ADDED Requirements

### Requirement: Final runtime ownership extraction terminates App decomposition
The WebApp SHALL treat the runtime ownership extraction pass as the final planned `webapp/App.tsx` decomposition pass before returning to new gameplay and content work.

#### Scenario: Completion is based on ownership rather than line count
- **WHEN** the final runtime ownership extraction pass is complete
- **THEN** `webapp/App.tsx` SHALL be accepted when it owns shell routing, cross-domain state/ref initialization, callback wiring, and explicitly documented deferred orchestration, and further decomposition SHALL NOT continue only to reduce file size

#### Scenario: Remaining App responsibilities are documented
- **WHEN** implementation finishes this pass
- **THEN** the module-boundary or decomposition documentation SHALL identify remaining App-owned state, refs, callback adapters, mode transitions, save/rest/map flow wiring, and any intentionally deferred runtime ownership

### Requirement: Skill event consumption has one playable owner
The WebApp SHALL extract playable skill event consumption into a focused client-side owner without creating a second gameplay runtime.

#### Scenario: Timeline and batch consumption move together
- **WHEN** `consumeSkillEventTimeline`, scheduled skill event consumption, immediate event batching, active damage-zone tick routing, projectile impact routing, or `consumeSkillEventBatch` behavior is moved out of `webapp/App.tsx`
- **THEN** the moved owner SHALL preserve event order, delay handling, active damage-zone queue mutation, projectile follow-up suppression, VFX queue updates, status routing, forced movement routing, floating text routing, and damage-event routing

#### Scenario: Event consumer does not recalculate event-generation decisions
- **WHEN** the event consumer processes playable skill events
- **THEN** it SHALL NOT perform duplicate target selection, hit timing calculation, projectile trajectory selection, damage-zone origin selection, chain target selection, damage amount generation, or skill event payload construction

#### Scenario: Event consumer dependencies are explicit
- **WHEN** event consumption is extracted
- **THEN** the new owner SHALL receive current state snapshots, refs, setters, queue refs, and callback adapters through explicit dependencies and SHALL NOT import from `webapp/App.tsx`, call backend gameplay APIs, or use disabled skill-editor paths

### Requirement: Damage application has one playable owner
The WebApp SHALL extract playable damage application into a focused client-side owner while preserving current combat side effects and event recursion.

#### Scenario: Damage batch application preserves mutation order
- **WHEN** `applyDamageEventBatch` behavior is moved out of `webapp/App.tsx`
- **THEN** the moved owner SHALL preserve damage projection, enemy HP mutation, energy-shield mutation, culling, kill detection, player on-hit recovery, enemy retention, combat-log updates, kill counters, drop spawning, and recursive on-kill event routing

#### Scenario: Damage owner does not duplicate event consumption
- **WHEN** the damage application owner emits or routes on-kill follow-up events
- **THEN** it SHALL call the single playable event-consumption owner and SHALL NOT introduce a separate damage queue, alternate damage application path, duplicate floating-text path, or backend/runtime service call

#### Scenario: Damage formulas remain unchanged
- **WHEN** damage application is extracted
- **THEN** existing helper formulas such as enemy damage amount calculation, armor and resistance mitigation, block and avoidance rolls, energy-shield ordering, and damage-over-time interactions SHALL remain behavior-preserving and SHALL NOT be rebalanced

### Requirement: Battle-loop ownership is optional and gated
The WebApp SHALL move battle-loop wiring only if event consumption and damage application extraction make a narrow owner safe and useful.

#### Scenario: Battle loop is not moved before runtime owners
- **WHEN** implementation begins this final pass
- **THEN** `stepGame` or battle-loop hook extraction SHALL NOT begin until the event-consumption owner and damage-application owner are implemented, tested, and accepted in the playable WebApp

#### Scenario: Battle-loop extraction may be skipped
- **WHEN** event consumption and damage application have been extracted
- **THEN** implementation MAY leave `stepGame` in `webapp/App.tsx` if moving it would require unrelated state-management changes, save/rest/map flow movement, target selection changes, monster AI changes, projectile lifecycle redesign, or broad callback reshaping

#### Scenario: Battle-loop owner does not create alternate runtime paths
- **WHEN** a battle-loop service or hook is introduced
- **THEN** it SHALL consume the same playable state, refs, callbacks, and runtime owners as the existing App path and SHALL NOT duplicate target selection, hit timing, damage application, projectile trajectory decisions, damage-zone origin decisions, monster AI behavior, drop progression, or map-run progression

### Requirement: Runtime ownership checks follow moved modules
The WebApp SHALL update tests and source-boundary checks so runtime invariants follow the module that owns them.

#### Scenario: Smoke checks migrate with event consumption
- **WHEN** event consumption moves out of `webapp/App.tsx`
- **THEN** `webapp/smoke-test.mjs` or focused tests SHALL read the new event-consumption owner and continue checking scheduled queue handling, active damage-zone routing, projectile follow-up suppression, status routing, forced movement routing, VFX queue updates, and damage-event routing

#### Scenario: Smoke checks migrate with damage application
- **WHEN** damage application moves out of `webapp/App.tsx`
- **THEN** `webapp/smoke-test.mjs` or focused tests SHALL read the new damage owner and continue checking damage calculation helper use, enemy state mutation, player on-hit recovery, drop spawning, combat-log side effects, and recursive on-kill event routing

#### Scenario: Checks prevent forbidden runtime duplication
- **WHEN** runtime extraction checks run
- **THEN** they SHALL fail if extracted runtime owners import from `webapp/App.tsx`, call backend gameplay APIs, use disabled skill-editor acceptance paths, or duplicate target selection, hit timing, damage application, projectile trajectory, damage-zone origin, or event-consumption paths

### Requirement: Final runtime pass is accepted through playable frontend verification
The WebApp SHALL verify the final runtime ownership pass through executable checks and the actual playable WebApp browser surface.

#### Scenario: Each runtime boundary is checked before the next begins
- **WHEN** event consumption, damage application, or optional battle-loop extraction is completed
- **THEN** `cmd /c npm run build`, `npm test`, relevant focused source/runtime checks, and OpenSpec validation SHALL pass or any failure SHALL be documented as pre-existing and unrelated before continuing to the next boundary

#### Scenario: Playable WebApp remains acceptance surface
- **WHEN** this pass affects runtime timing, damage areas, projectiles, status, drops, combat visuals, or battle interaction
- **THEN** verification SHALL launch or match the project `run.bat` WebApp flow, exercise the actual playable battle view, capture screenshots under `artifacts/screenshots/`, describe the visible result, and SHALL NOT use `/skill-editor`, `?skill_editor=1`, `view=skill_editor`, port `8765`, or `dist-skill-editor`

#### Scenario: Final diff stays architecture-only
- **WHEN** this final runtime pass is ready for completion
- **THEN** the final diff SHALL be reviewed to confirm it contains no backend calls, server runtime behavior, duplicate gameplay runtimes, save-schema changes, storage-key changes, CSS redesign, copy changes, gameplay balance changes, unrelated refactors, root-level screenshots, or root-level logs
