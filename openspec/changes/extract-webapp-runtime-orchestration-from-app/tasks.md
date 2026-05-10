## 1. Baseline And Scope Guardrails

- [x] 1.1 Confirm current branch and working tree status before implementation; stop if unrelated dirty files overlap `webapp/App.tsx`, WebApp runtime modules, WebApp type modules, smoke tests, or this change's OpenSpec files.
- [x] 1.2 Re-read `AGENTS.md`, `docs/webapp-module-boundaries.md`, `docs/webapp-app-decomposition-map.md`, this change's `proposal.md`, `design.md`, and spec deltas before editing.
- [x] 1.3 Run `openspec validate extract-webapp-runtime-orchestration-from-app --strict` before implementation begins.
- [x] 1.4 Record current `webapp/App.tsx` size, line count, major runtime function ranges, type/constant ranges, and smoke checks that still read App-owned runtime code.
- [x] 1.5 Confirm this change does not require backend APIs, server runtime behavior, Python `SkillRuntime`, save-schema changes, storage-key changes, dependency changes, CSS redesign, copy changes, gameplay balance changes, or skill-editor verification.
- [x] 1.6 After tasks 1.1-1.5, run `cmd /c npm run build`, `npm test`, and OpenSpec strict validation, then commit the baseline audit.

## 2. Runtime Ownership Map And Documentation

- [x] 2.1 Update `docs/webapp-app-decomposition-map.md` with the current remaining App runtime ownership map: types/constants, playable skill event generation, event consumption, damage application, projectile lifecycle, damage-zone lifecycle, status/resource helpers, VFX follow-up scheduling, map-run flow, and final App wiring.
- [x] 2.2 Update `docs/webapp-module-boundaries.md` only if a new focused runtime owner folder/module category is needed beyond existing `webapp/runtime/`, `webapp/types/`, `webapp/state/`, `webapp/components/battle/`, and `webapp/features/playable-battle/`.
- [x] 2.3 Define the final target for this pass: App keeps mode routing, cross-domain state/ref initialization, save/rest/map flow wiring, callback adapters, and only intentionally deferred runtime refs.
- [x] 2.4 Define the defer list for runtime ownership that remains too risky for this pass, including any target selection, hit timing, damage application, or battle loop mutation not moved.
- [x] 2.5 Run build, smoke, and OpenSpec validation, then commit the documentation/ownership-map batch.

## 3. Type-Only Runtime Shape Extraction

- [x] 3.1 Identify App-local type definitions needed by runtime extraction, including `SkillEvent`, player runtime state, enemy runtime state, battle VFX shapes, damage-zone runtime shapes, scheduled skill events, drop prompt slices, map progression slices, tooltip/floating item shapes, and App state/save slices.
- [x] 3.2 Create or extend thin `webapp/types/` modules for only the shapes needed by the next runtime modules.
- [x] 3.3 Move selected type definitions without changing field names, literal values, optionality, or semantic shape.
- [x] 3.4 Ensure new type modules do not import `webapp/App.tsx`, React state/runtime, generated data, browser APIs, storage helpers, backend calls, or gameplay mutation code.
- [x] 3.5 Rewire `webapp/App.tsx` and existing extracted modules to import moved types from type-only modules or local generic props.
- [x] 3.6 Update smoke/source-boundary tests to fail if new type modules import from App or contain runtime behavior tokens.
- [x] 3.7 Run build, `npm test`, focused type/source checks, and OpenSpec validation, then commit the type-only extraction batch.

## 4. Stable Runtime Constant Extraction

- [x] 4.1 Identify stable App-local constants that are needed by extracted runtime modules, grouped by gameplay family: battle camera/rendering, runtime visual budgets, skill timing, monster level formulas, boss skill defaults, inventory/stash constants, and interaction radii.
- [x] 4.2 Move only constants with clear focused owners into `webapp/runtime/`, `webapp/state/`, `webapp/components/inventory/`, or `webapp/types/` adjacent modules.
- [x] 4.3 Preserve every numeric value, string value, array order, map key, and exported name needed by existing behavior.
- [ ] 4.4 Leave mixed or cross-domain constants in App if moving them would require unrelated ownership decisions.
- [ ] 4.5 Update smoke/source-boundary tests to read moved constants from their owner modules.
- [ ] 4.6 Run build, `npm test`, OpenSpec validation, and commit the constant extraction batch.

## 5. Frontend Skill Runtime Family Audit

- [ ] 5.1 Map current App-owned frontend playable skill functions by family: projectile, chain, module-chain, damage-zone, melee-arc, nova, channel, status, forced movement, kill-triggered, hit VFX, floating text, projectile follow-up suppression, and immediate/timeline consumption.
- [ ] 5.2 For each family, mark functions as pure event builder, deterministic helper, App-owned side effect, or intentionally deferred orchestration.
- [ ] 5.3 Identify current smoke/source checks for each family and whether the check should move to a new runtime owner.
- [ ] 5.4 Record the audit in this change's implementation notes or baseline audit before moving code.
- [ ] 5.5 Run build, `npm test`, OpenSpec validation, and commit the frontend skill runtime audit.

## 6. Projectile And Chain Event Builder Extraction

- [ ] 6.1 Create a focused frontend playable skill runtime module for projectile and chain event builders, such as `webapp/runtime/frontendPlayableSkillEventBuilders.ts` or a narrower family-specific module.
- [ ] 6.2 Move projectile event construction helpers that can operate from explicit inputs without reading App refs or mutating state.
- [ ] 6.3 Move chain, module-chain, pierce/fork follow-up, hit VFX payload, and floating-text payload construction helpers that can remain deterministic.
- [ ] 6.4 Preserve event ids, event types, source/target entities, delays, durations, projectile ids, positions, directions, ranges, widths, radii, damage payloads, VFX keys, floating-text payloads, and follow-up suppression keys.
- [ ] 6.5 Keep `consumeSkillEventTimeline`, `consumeSkillEventBatch`, `setTexts`, `setBolts`, `setEnemies`, runtime refs, and scheduling in App during this batch.
- [ ] 6.6 Add focused smoke/executable checks for representative projectile, chain, module-chain, hit VFX, floating text, and follow-up suppression payloads.
- [ ] 6.7 Update existing App smoke checks so moved invariants read the new builder module.
- [ ] 6.8 Run build, `npm test`, focused builder checks, OpenSpec validation, and actual playable battle verification if visuals can be affected; commit the batch.

## 7. Damage-Zone Melee Nova Status And Forced-Movement Builder Extraction

- [ ] 7.1 Extend the frontend playable event builder module or add a focused adjacent module for damage-zone, melee-arc, nova, channel, status, and forced-movement event construction.
- [ ] 7.2 Move damage-zone event construction helpers that preserve zone ids, origins, radii, shapes, repeat fields, dynamic tick flags, movement policies, movement scopes, timing fields, and damage payloads.
- [ ] 7.3 Move melee-arc and player-nova event construction helpers while preserving arc angles, radii, origins, target fields, VFX payloads, and damage payloads.
- [ ] 7.4 Move status and forced-movement payload construction helpers while preserving status ids, stack/duration semantics, movement distance, origin, scope, and scheduling fields.
- [ ] 7.5 Keep active damage-zone refs, scheduled events, dynamic tick consumption, status application mutation, player/enemy state mutation, and combat logs App-owned during this batch.
- [ ] 7.6 Add focused smoke/executable checks for representative damage-zone, dynamic tick, melee-arc, nova, status, and forced-movement payloads.
- [ ] 7.7 Run build, `npm test`, focused builder checks, OpenSpec validation, and playable battle visual verification; commit the batch.

## 8. Skill Event Dispatcher Boundary

- [ ] 8.1 Review `buildFrontendPlayableSkillEvents` and related dispatcher logic after family event builders are extracted.
- [ ] 8.2 Move dispatcher logic into a focused frontend playable runtime module only if it can receive all required inputs explicitly and return event timelines without App side effects.
- [ ] 8.3 Preserve behavior-family routing, module lookup order, default fallbacks, cooldown/resource preconditions, and event ordering.
- [ ] 8.4 Keep skill release orchestration, mana spending mutation, cooldown mutation, continuous-attack runtime state, and event timeline consumption in App unless explicitly moved in a later batch.
- [ ] 8.5 Add smoke checks that representative skill families route through the focused dispatcher and that App calls the dispatcher instead of rebuilding family events locally.
- [ ] 8.6 Run build, `npm test`, focused dispatcher checks, OpenSpec validation, and playable battle verification; commit the batch.

## 9. Enemy Damage And Status Helper Extraction

- [ ] 9.1 Identify deterministic enemy damage/resource/status helper functions still in App, including resistance, armor, block, avoidance, damage-over-time aggravation, status damage taken, energy-shield/life resource application, and numeric stat lookup helpers.
- [ ] 9.2 Create or extend a focused runtime module for enemy damage/status helpers.
- [ ] 9.3 Move only helpers that are deterministic over explicit event/enemy/stat/roll inputs and do not mutate React state or runtime refs.
- [ ] 9.4 Preserve formulas, roll-key behavior, resistance caps, armor behavior, block/avoidance behavior, status interactions, resource ordering, and returned result shapes.
- [ ] 9.5 Keep `applyDamageEventBatch`, enemy array mutation, kill handling, drop progression, combat logs, and visual queue mutation App-owned during this batch.
- [ ] 9.6 Add focused executable smoke cases for physical, elemental, chaos, armor, resistance, block, avoidance, damage-over-time, status damage taken, energy-shield, and life resource cases.
- [ ] 9.7 Run build, `npm test`, focused enemy damage checks, OpenSpec validation, and playable battle verification; commit the batch.

## 10. Player Resource And Incoming Damage Helper Extraction

- [ ] 10.1 Identify remaining deterministic player resource and incoming damage helpers still in App, including regeneration, energy-shield recharge, block recovery, life/shield return timing, mana-before-life, resource normalization, and incoming damage result shaping.
- [ ] 10.2 Extend `webapp/runtime/playerDamageRuntime.ts` or create an adjacent focused player resource runtime module.
- [ ] 10.3 Move only helpers that preserve formulas and accept explicit player/stat/timestamp inputs.
- [ ] 10.4 Preserve cooldown semantics, resource order, clamp behavior, damage-to-mana/shield/life order, and state result shape.
- [ ] 10.5 Keep player React state mutation, defeat handling, recovery cooldown refs, floating text, and combat logs App-owned unless a later batch explicitly moves them.
- [ ] 10.6 Add focused executable smoke cases for regeneration, recharge delay, block recovery gating, life return, shield return, mana-before-life, and resource normalization.
- [ ] 10.7 Run build, `npm test`, focused player resource checks, OpenSpec validation, and playable battle verification; commit the batch.

## 11. Projectile Lifecycle And Visual Follow-Up Helper Extraction

- [ ] 11.1 Identify deterministic projectile lifecycle helpers still in App, including projectile id extraction, target follow-up keys, projectile completion, anchoring to targets, projectile spread helpers, direction rotation, and visual budget helpers.
- [ ] 11.2 Create or extend focused runtime modules for projectile lifecycle and visual follow-up helpers.
- [ ] 11.3 Move only helpers that do not decide target selection, hit timing, damage, pierce, chain, or event consumption.
- [ ] 11.4 Preserve follow-up suppression semantics, target anchoring behavior, projectile completion behavior, spread angles, rotation formulas, visual budget caps, and returned shapes.
- [ ] 11.5 Keep projectile spawn scheduling, active projectile state mutation, hit event consumption, and damage application App-owned during this batch.
- [ ] 11.6 Add smoke/executable checks for projectile follow-up suppression, target anchoring, projectile completion, spread direction, rotation, and visual budget behavior.
- [ ] 11.7 Run build, `npm test`, focused lifecycle checks, OpenSpec validation, and playable battle visual verification; commit the batch.

## 12. Damage-Zone Lifecycle And Dynamic Tick Helper Extraction

- [ ] 12.1 Identify deterministic active damage-zone lifecycle helpers still in App, including zone uniqueness, zone expiration, dynamic tick event creation, zone lookup, and repeated-zone payload shaping.
- [ ] 12.2 Create or extend a focused runtime module for damage-zone lifecycle helpers.
- [ ] 12.3 Move only helpers that accept active zone snapshots and explicit time/player/enemy inputs without mutating App refs.
- [ ] 12.4 Preserve zone id behavior, expiration timing, dynamic tick interval behavior, movement payloads, status payloads, and damage event payloads.
- [ ] 12.5 Keep `activeDamageZones` ref ownership, scheduled event queue mutation, `consumeSkillEventBatch`, and React visual state mutation App-owned during this batch.
- [ ] 12.6 Add focused checks for unique zones, expiration, dynamic tick event generation, movement/status payload preservation, and zone lookup behavior.
- [ ] 12.7 Run build, `npm test`, focused zone lifecycle checks, OpenSpec validation, and playable battle visual verification; commit the batch.

## 13. Runtime Queue And Event Consumer Adapter Review

- [ ] 13.1 Review `consumeSkillEventTimeline`, `consumeImmediateSkillEvents`, `consumeSkillEventBatch`, scheduled event queue handling, active damage-zone ticks, and damage batch application after helper extraction.
- [ ] 13.2 Decide whether a focused runtime event consumer adapter can be introduced without creating a second gameplay path.
- [ ] 13.3 If safe, extract a narrow adapter that receives explicit callbacks/setters/refs and returns or applies only the same mutations currently performed by App.
- [ ] 13.4 If not safe, record the exact event consumer responsibilities intentionally remaining App-owned and why.
- [ ] 13.5 Ensure no extracted adapter imports App, owns hidden global state, calls backend APIs, or duplicates target selection/damage application.
- [ ] 13.6 Add smoke checks proving the playable path calls the focused adapter if extracted, or proving consumer ownership remains intentionally App-specific if deferred.
- [ ] 13.7 Run build, `npm test`, focused event consumer checks, OpenSpec validation, and playable battle verification; commit the batch.

## 14. Battle Loop Orchestration Boundary Review

- [ ] 14.1 Review `stepGame`, runtime monster attacks, player movement/resource updates, map-run progression, spawn progression, minimap exploration, boss portal flow, pickup flow, and pause/failure flow after helper extraction.
- [ ] 14.2 Decide whether a focused battle runtime service or hook can own a narrow portion of battle-loop orchestration with explicit dependencies.
- [ ] 14.3 If safe, extract only the narrow orchestration boundary with explicit inputs, callbacks, refs, and no hidden imports from App.
- [ ] 14.4 If not safe, record battle-loop responsibilities intentionally remaining App-owned and the next smaller extraction target.
- [ ] 14.5 Ensure extracted orchestration does not change target selection, hit timing, damage application, projectile trajectory decisions, damage-zone origin decisions, pickup completion, drop progression, map progression, or save state.
- [ ] 14.6 Add smoke checks for the extracted orchestration boundary or the intentionally retained App boundary.
- [ ] 14.7 Run build, `npm test`, focused orchestration checks, OpenSpec validation, and actual playable WebApp verification; commit the batch.

## 15. App Cleanup And Import Boundary Hardening

- [ ] 15.1 Remove unused App imports, local types, constants, helpers, and callbacks after each extraction batch.
- [ ] 15.2 Confirm `webapp/App.tsx` imports focused runtime/type/state modules instead of redefining moved responsibilities locally.
- [ ] 15.3 Confirm extracted runtime modules do not import from `webapp/App.tsx`.
- [ ] 15.4 Confirm extracted runtime modules do not call backend APIs, server runtimes, disabled skill-editor paths, storage APIs unless explicitly owned, or browser globals unless explicitly allowed.
- [ ] 15.5 Confirm no new duplicate gameplay runtime path exists outside the playable WebApp path.
- [ ] 15.6 Update comments only where they clarify ownership boundaries and avoid broad comments that repeat code.
- [ ] 15.7 Run build, `npm test`, OpenSpec validation, and commit the cleanup/boundary-hardening batch.

## 16. Smoke And Focused Test Migration

- [ ] 16.1 Update `webapp/smoke-test.mjs` so each moved invariant reads the new owning source module.
- [ ] 16.2 Keep App-specific smoke checks limited to mode routing, cross-domain state/ref initialization, callback adapters, runtime refs that remain in App, disabled tooling gates, backend-coupling prevention, and playable WebApp acceptance boundaries.
- [ ] 16.3 Add or update executable smoke checks for frontend playable event builders and runtime helper modules.
- [ ] 16.4 Add or update tests preventing extracted runtime modules from importing from `webapp/App.tsx`.
- [ ] 16.5 Add or update tests preventing backend gameplay API calls, server runtimes, Python runtime evidence as sufficient acceptance, duplicate frontend gameplay runtimes, and skill-editor acceptance paths.
- [ ] 16.6 Run the repository's accepted WebApp test command `npm test` and any new focused checks, then commit the test migration batch.

## 17. Frontend Visual Verification

- [ ] 17.1 Run `cmd /c npm run build`.
- [ ] 17.2 Run `npm test`.
- [ ] 17.3 Run any focused runtime smoke checks added by this change.
- [ ] 17.4 Run `openspec validate extract-webapp-runtime-orchestration-from-app --strict`.
- [ ] 17.5 Start/open the WebApp through the project `run.bat` flow.
- [ ] 17.6 Verify the actual playable WebApp title/save/rest flow if touched by wiring changes.
- [ ] 17.7 Verify actual playable battle entry, player skill use, representative projectile visuals, damage-zone visuals, melee/nova/chain/status/forced-movement visuals as applicable to moved batches.
- [ ] 17.8 Verify pause/exit/rest return flow still works if battle-loop or shell wiring was touched.
- [ ] 17.9 Capture screenshots under `artifacts/screenshots/` for each verified playable WebApp surface.
- [ ] 17.10 Store logs or generated verification evidence under `artifacts/logs/` or a task-specific `artifacts/` subdirectory.
- [ ] 17.11 Confirm no screenshots, logs, traces, test outputs, or generated evidence were left in the repository root.
- [ ] 17.12 Confirm verification did not use `/skill-editor`, `?skill_editor=1`, `view=skill_editor`, port `8765`, `dist-skill-editor`, backend-only runtime reports, or Python-only runtime tests as acceptance evidence.
- [ ] 17.13 Commit the final frontend verification evidence and notes.

## 18. Completion Review

- [ ] 18.1 Review final `webapp/App.tsx` size, line count, and responsibility map against the target for this change.
- [ ] 18.2 Confirm moved type/constant/runtime helper/event builder owners are searchable in focused modules.
- [ ] 18.3 Confirm remaining App code is mode routing, cross-domain state/ref initialization, callback wiring, save/rest/map flow orchestration, event consumer/runtime refs intentionally retained, or explicitly deferred runtime ownership.
- [ ] 18.4 Confirm frontend playable skill runtime remains client-owned and no backend/canonical naming regression was introduced.
- [ ] 18.5 Confirm no gameplay balance, save-schema, storage-key, CSS, copy, dependency, backend, server runtime, root artifact, or skill-editor acceptance change was introduced.
- [ ] 18.6 Record final App responsibility summary and intentionally deferred runtime ownership in this change's implementation notes.
- [ ] 18.7 Run `cmd /c npm run build`, `npm test`, focused runtime checks, and `openspec validate extract-webapp-runtime-orchestration-from-app --strict`.
- [ ] 18.8 Commit the completion review.
