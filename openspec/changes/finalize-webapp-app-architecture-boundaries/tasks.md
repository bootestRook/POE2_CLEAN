## 1. Baseline Audit And Scope Lock

- [x] 1.1 Confirm current branch and working tree status before implementation; stop if unrelated dirty files overlap `webapp/App.tsx`, WebApp docs, or planned target modules.
- [x] 1.2 Re-read `AGENTS.md`, `docs/webapp-module-boundaries.md`, `docs/webapp-app-decomposition-map.md`, this change's `proposal.md`, `design.md`, and spec deltas before editing.
- [x] 1.3 Record the current `webapp/App.tsx` responsibility map by function/render block, using current line numbers only as temporary navigation notes.
- [x] 1.4 Identify current App-owned state, refs, callbacks, storage keys, runtime queues, and event consumers that must remain unchanged during this change.
- [x] 1.5 Identify current source-text/smoke tests that read `webapp/App.tsx` for functions or invariants that may move to focused modules.
- [x] 1.6 Confirm no implementation task in this change requires backend APIs, server runtime behavior, save-schema changes, CSS redesign, copy changes, gameplay balance changes, or skill-editor verification.

## 2. Architecture Documentation And Owner Map

- [x] 2.1 Update `docs/webapp-module-boundaries.md` with the owner-first planning rule for future WebApp work.
- [x] 2.2 Update `docs/webapp-module-boundaries.md` with the final owner map for inventory, skill-board, battle presentation, battle runtime, monster skills, player damage, save/state, drops, tooltips, rest-area, layout shell, utils, hooks, and types.
- [x] 2.3 Update `docs/webapp-module-boundaries.md` to state when `webapp/App.tsx` edits are allowed: mode routing, state/ref initialization, callback wiring, and unavoidable adapter calls only.
- [x] 2.4 Update `docs/webapp-app-decomposition-map.md` so it reflects the current App shape instead of stale historical line ranges.
- [x] 2.5 Add the final completion definition to `docs/webapp-app-decomposition-map.md`: ownership clarity, no App imports from extracted modules, no large render-only UI in App, searchable monster skill helpers/event builders, and verified playable WebApp behavior.
- [x] 2.6 Document that future missing module boundaries must be planned first instead of adding new App-local feature code.

## 3. Shared Type Boundary Preparation

- [x] 3.1 Identify App-local types needed by extracted modules, including item/gem, App state/save payload, tooltip, floating item, battle VFX, player runtime, drop, map progression, and skill-board shapes.
- [x] 3.2 Create or extend thin type-only modules under `webapp/types/` only for shapes that are required by the extraction batches.
- [x] 3.3 Move type definitions without changing field names, literal values, optionality, or semantic shape.
- [x] 3.4 Ensure type-only modules do not import `webapp/App.tsx`, generated data, browser APIs, local storage helpers, runtime formulas, or gameplay mutation code.
- [x] 3.5 Rewire extracted module imports to use type-only modules or local generic props instead of importing from App.
- [ ] 3.6 Run focused TypeScript/build checks after type boundary changes and fix circular imports before continuing.

## 4. Inventory Overlay Presentation Extraction

- [ ] 4.1 Create `webapp/components/inventory/InventoryOverlay.tsx` as a render-only composition module for the existing bag overlay.
- [ ] 4.2 Move the current inventory overlay DOM structure from `App.tsx` into `InventoryOverlay` without changing class names, aria labels, button order, text, DOM order, render gates, or styling hooks.
- [ ] 4.3 Pass existing App-owned values and callbacks into `InventoryOverlay` through props; do not move save state, storage writes, drag/drop mutation, tooltip ownership, GM request logic, equipment stat recalculation, board mutation, or runtime refs.
- [ ] 4.4 Keep `GemOrb`, `GemTooltipOverlay`, `FloatingGemView`, `StashPanel`, `BagGrid`, `EquipmentItemCell`, `EquipmentEmptyCell`, `BoardCell`, `SupportLines`, and `SupportPreviewLines` behavior identical after extraction.
- [ ] 4.5 Preserve two-handed weapon blocked-slot behavior, equipment hover behavior, stash page behavior, board hover behavior, support line rendering, placement preview rendering, floating item rendering, discard prompt behavior, and GM panel toggling.
- [ ] 4.6 Replace the inline App overlay block with `<InventoryOverlay />` and only the required prop wiring.
- [ ] 4.7 Run build/type checks and a focused smoke check covering inventory/stash/equipment/board source invariants.
- [ ] 4.8 Verify the actual playable WebApp inventory surface through the `run.bat` flow and capture screenshots under `artifacts/screenshots/`.

## 5. Inventory And Skill-Board Subpanel Refinement

- [ ] 5.1 If `InventoryOverlay` remains too broad after extraction, split only stable render-only subpanels into `EquipmentPanel.tsx`, `InventorySkillBoardPanel.tsx`, or similarly focused modules.
- [ ] 5.2 Keep subpanel props explicit and avoid creating a new inventory state store, board state store, or drag/drop context in this change.
- [ ] 5.3 Preserve all existing slot arrays, item lookup maps, hover state, floating item state, tooltip triggers, render callbacks, and placement callbacks.
- [ ] 5.4 Confirm `webapp/App.tsx` no longer owns large inventory/equipment/stash/board JSX after this batch.
- [ ] 5.5 Run focused checks and visually verify inventory, stash, equipment, and board rendering in the playable WebApp.

## 6. Monster Skill Pure Helper Extraction

- [ ] 6.1 Create `webapp/runtime/monsterSkillPresentation.ts` or an equivalent focused pure helper module.
- [ ] 6.2 Move pure monster skill helpers from `App.tsx`, including projectile spread angles, zone center selection, clamped zone placement, damage type/form passthrough, VFX key selection, suppress-hit-VFX rules, and projectile aim policy.
- [ ] 6.3 Preserve every existing numeric formula, special skill-id case, VFX key string, pattern name, default value, and return shape.
- [ ] 6.4 Ensure the helper module depends only on explicit inputs and pure utilities, and does not read React state, refs, local storage, browser globals, runtime queues, player/enemy mutable state beyond supplied arguments, or backend services.
- [ ] 6.5 Add focused tests or smoke/source checks for representative fan/ring/spiral/cross spread, zone patterns, special-case zone centers, special-case VFX keys, and aim policies.
- [ ] 6.6 Rewire `App.tsx` to import these helpers and leave side effects in App.
- [ ] 6.7 Run build/test checks and inspect the diff for behavior-only movement.

## 7. Monster Skill Event Builder Extraction

- [ ] 7.1 Create `webapp/runtime/monsterSkillEventBuilder.ts` or an equivalent focused module for monster skill `SkillEvent` payload construction.
- [ ] 7.2 Extract projectile event payload construction for monster skills while preserving event ids, timestamps, source/target fields, positions, directions, delays, durations, damage type/form fields, VFX keys, projectile ids, speed/range/radius/width/lifetime fields, leash fields, hit marker fields, suppress-hit-VFX fields, and source enemy metadata.
- [ ] 7.3 Extract damage-zone and melee-arc event payload construction while preserving warning events, damage-zone events, melee-arc event type selection, zone ids, repeat fields, shape fields, radius, origin, direction, duration, damage amount, trigger/hit marker fields, and range/arc payload fields.
- [ ] 7.4 Extract guard/support display-event construction only where it can remain deterministic; leave `setTexts`, `setAreaNovas`, healing mutation, ally buff mutation, and combat log mutation in App unless separately dependency-injected and tested.
- [ ] 7.5 Keep `consumeSkillEventTimeline`, pending hit queues, `setTexts`, `setAreaNovas`, runtime refs, and battle-loop scheduling App-owned during this batch.
- [ ] 7.6 Add focused tests comparing representative generated event payloads for projectile, damage-zone, melee-arc, guard/support pulse, repeated zones, and special-case skills before/after extraction.
- [ ] 7.7 Update smoke/source-boundary checks so protected monster skill event invariants read the event-builder module instead of forcing event builders to remain in `App.tsx`.
- [ ] 7.8 Run build/test checks and visually verify representative monster skill projectiles/zones/arcs in the actual playable WebApp, with screenshots under `artifacts/screenshots/`.

## 8. Player Damage Runtime Helper Extraction

- [ ] 8.1 Identify player damage and resource helper functions in `App.tsx` that are deterministic over explicit player, enemy, stat, damage, and timestamp inputs.
- [ ] 8.2 Create `webapp/runtime/playerDamageRuntime.ts` only for pure mitigation/resource helpers that can move without changing state ownership.
- [ ] 8.3 Move player resistance cap, incoming conversion, armor/resistance mitigation, evasion/block chance helpers, monster outgoing damage scalar helpers, and damage-to-resource result helpers only when their formulas can be preserved exactly.
- [ ] 8.4 Leave React state mutation, defeat handling, combat log generation, floating text creation, recovery cooldown refs, and runtime queue consumption in App unless a separate batch explicitly scopes them.
- [ ] 8.5 Add focused tests for physical, elemental, chaos, armor, resistance cap, incoming conversion, block, evasion, critical, double-damage, energy-shield, and life-damage representative cases.
- [ ] 8.6 Update smoke/source-boundary checks so combat invariants read the player damage runtime module where ownership moved.
- [ ] 8.7 Run build/test checks and actual playable battle verification.

## 9. Save, State, Drop, And Stash Helper Boundaries

- [ ] 9.1 Review existing `webapp/state/frontendAppState.ts`, `webapp/state/frontendDropState.ts`, `webapp/components/inventory/stashState.ts`, and `webapp/utils/frontendSaveStorage.ts` for helpers already extracted.
- [ ] 9.2 Move only deterministic save payload conversion, starter-state creation, stash normalization, stash item id collection, stash removal, or drop calculation helpers that still live in App and clearly belong in existing state/helper modules.
- [ ] 9.3 Preserve frontend save version, storage keys, active-slot behavior, autosave behavior, migration/sanitization order, player-name normalization, starter gem exclusions, stash page/slot counts, duplicate ownership rules, and item identity.
- [ ] 9.4 Keep App-owned orchestration in App: when saves are loaded, when state is applied, when drops are spawned, when pickup animation starts/finishes, when boss portal confirmation mutates state, and when map-run progression changes.
- [ ] 9.5 Update tests for save/stash/drop behavior to read the owning state/helper modules.
- [ ] 9.6 Run focused persistence/drop tests, build checks, and playable WebApp verification for save/load/rest-area/stash flow.

## 10. UI Shell And Entry Flow Extraction

- [ ] 10.1 Create focused layout components for title entry, non-gameplay App chrome, and shell overlays only where they reduce App JSX without moving state ownership.
- [ ] 10.2 Extract the title screen display while preserving text, class names, aria labels, button behavior, and entry-step transitions.
- [ ] 10.3 Extract shell overlay composition for release-debug HUD, map debug toggle, procedural spawn debug panel, spawn warnings, game failure overlay, pause overlay, portal confirm overlay, help text, skill-editor disabled toggles, map selection panel gate, and combat feed only as render-only composition.
- [ ] 10.4 Keep mode state, save state, pause state, game failure state, portal confirmation state, skill-editor disabled state, and runtime logs owned by App.
- [ ] 10.5 Run build checks and visually verify title/save/rest/battle overlay surfaces in the actual playable WebApp.

## 11. App Boundary Cleanup

- [ ] 11.1 Remove unused imports, local types, helper functions, constants, and callbacks from `webapp/App.tsx` after each extraction batch.
- [ ] 11.2 Confirm remaining App functions are intentionally App-owned orchestration or adapters, not presentation-only blocks or pure helper families that now have owners.
- [ ] 11.3 Confirm no extracted module imports from `webapp/App.tsx`.
- [ ] 11.4 Confirm App imports focused modules instead of redefining their responsibilities locally.
- [ ] 11.5 Confirm no new module duplicates gameplay runtime, target selection, hit timing, damage application, projectile trajectory decisions, or event consumption.
- [ ] 11.6 Update comments only where they clarify ownership boundaries; avoid broad explanatory comments that repeat code.

## 12. Test And Smoke Boundary Updates

- [ ] 12.1 Update WebApp smoke/source-boundary tests so moved functions and invariants are checked in the source module that now owns them.
- [ ] 12.2 Keep App-specific tests specific to App-owned orchestration, runtime refs, battle loop entrypoints, disabled tooling gates, backend-coupling prevention, and playable WebApp acceptance boundaries.
- [ ] 12.3 Add or update tests that prevent extracted modules from importing from `webapp/App.tsx`.
- [ ] 12.4 Add or update tests that prevent new backend gameplay API calls, server runtimes, duplicate frontend gameplay runtimes, and skill-editor acceptance paths.
- [ ] 12.5 Add or update tests that verify future module owner docs exist and include the final owner map.
- [ ] 12.6 Run the relevant focused tests after each batch and the full test suite before completion.

## 13. Frontend Verification

- [ ] 13.1 Run `cmd /c npm run build`.
- [ ] 13.2 Run `npm test` or the repository's accepted WebApp test command, documenting any pre-existing unrelated failure if one blocks completion.
- [ ] 13.3 Run `node webapp/smoke-test.mjs` if it remains part of the WebApp acceptance flow.
- [ ] 13.4 Start/open the WebApp through the project `run.bat` flow.
- [ ] 13.5 Verify the actual playable WebApp title/save/rest flow, inventory overlay, stash panel, equipment/board surface, playable battle view, monster skill projectile/zone/arc visuals, and pause/portal/failure overlays as applicable to touched batches.
- [ ] 13.6 Capture screenshots under `artifacts/screenshots/` for the verified playable WebApp surfaces.
- [ ] 13.7 Store logs or generated verification evidence under `artifacts/logs/` or a task-specific `artifacts/` subdirectory.
- [ ] 13.8 Confirm no screenshots, logs, traces, test outputs, or generated evidence were left in the repository root.
- [ ] 13.9 Do not use `/skill-editor`, `?skill_editor=1`, `view=skill_editor`, port `8765`, or `dist-skill-editor` as verification surfaces.

## 14. Completion Review

- [ ] 14.1 Review `webapp/App.tsx` against the final target: mode routing, App-owned cross-domain state/ref initialization, callback wiring, viewport shell composition, and intentional orchestration only.
- [ ] 14.2 Confirm large render-only inventory/equipment/stash/board UI composition no longer lives inline in App.
- [ ] 14.3 Confirm monster skill pure helpers and event payload builders are searchable in focused runtime modules outside App.
- [ ] 14.4 Confirm player damage and save/state/drop helper ownership changes, if performed, are covered by focused tests and have not changed formulas or storage semantics.
- [ ] 14.5 Confirm future WebApp module placement guidance is updated and AI-visible.
- [ ] 14.6 Confirm no backend coupling, server runtime behavior, duplicate gameplay runtime, save-schema change, storage-key change, CSS redesign, copy change, gameplay balance change, unrelated refactor, root-level artifact, or skill-editor acceptance path was introduced.
- [ ] 14.7 Record the final App responsibility summary and any intentionally remaining App-owned runtime orchestration in the final implementation notes.
- [ ] 14.8 Run `openspec validate finalize-webapp-app-architecture-boundaries --strict`.
