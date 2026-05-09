# Baseline Audit

This file records the current `webapp/App.tsx` responsibility map for `finalize-webapp-app-architecture-boundaries`. Line numbers are temporary navigation notes only; ownership boundaries are the durable reference.

## Current Branch And Worktree

- Branch at audit time: `main`.
- Starting overlap check: no unrelated dirty edits in `webapp/App.tsx`, WebApp docs, or planned WebApp target modules.
- Current `webapp/App.tsx` size at audit time: 9,817 lines.

## App.tsx Responsibility Map

- Lines 1-229: imports for app metadata, map assets, spawn/runtime config, skill runtimes, equipment runtime, editor-disabled modules, playable battle scene, inventory, layout, battle presentation, skill-board, map editor, state helpers, utilities, sprite test, and rest-area scene.
- Lines 231-907: App-local domain shapes and constants, including `Gem`, `Cell`, `SkillEvent`, `AppState`, save payload, map-run monster/drop/portal views, GM option views, player runtime, battle VFX runtime, tooltip/floating item/placement prompt shapes, camera and unit visual runtime shapes.
- Lines 909-986: static gameplay, rendering, inventory, stash, tooltip, discard, starter, monster-test, and progression constants.
- Lines 990-1107: frontend data cloning, local preference helpers, frontend state helper wiring, sanitization, skill/equipment recalculation, GM option/affix local request helpers, and disabled backend request shim.
- Lines 1114-1154: top-level `App` mode routing and launch cache clearing.
- Lines 1155-1329: `GameApp` state and ref initialization for save flow, rest area, skill-editor-disabled state, player/enemy/runtime visual state, inventory/tooltip/drag state, map/debug state, battle runtime queues, performance summaries, spawn/drop ids, recovery cooldown refs, and status-effect refs.
- Lines 1332-2095: App state application, player runtime resource setters, minimap reset/reveal, player buffs, movement equipment effects, self damage, energy shield recharge, block/recovery, enemy buff advancement, save loading, GM option loading, map loading/rest-area setup, global pointer/keyboard effects, and rest-area movement.
- Lines 2099-2276: main playable battle tick orchestration, including player movement, enemy AI update calls, monster skill updates, boss/supreme boss runtime updates, damage-zone ticking, projectile/hit/floating-text visual advancement, runtime performance tracking, and game-over transition.
- Lines 2279-2345: existing runtime monster melee attack handling and player-hit application.
- Lines 2348-2814: monster skill dispatch, release, movement skill positioning, projectile event creation, damage-zone/melee-arc event creation, zone center/spread/VFX/aim helper logic.
- Lines 2817-3313: legacy boss skill timers, basic projectile, area warning/damage, circular barrage, and boss interval helper logic.
- Lines 3314-3423: player-hit application, guard mitigation, and channel movement buff handling.
- Lines 3424-6385: frontend playable skill release, skill event building/consumption, projectile/damage-zone/melee/nova/chain/channel/status/forced-movement handling, damage events, damage batches, VFX anchoring, and related runtime orchestration.
- Lines 6388-6556: damage event batch application, enemy damage/resource mutation, kill/drop/progression side effects, and event result handling.
- Lines 6559-6839: floating item placement, drag/drop target handling, inventory/equipment/stash/board movement, discard/drop prompt handling, and floating item state helpers.
- Lines 6840-7140: map instance creation, boss portal creation, frontend drop spawning, inventory item creation from drops, pickup logic, boss portal confirmation, keyboard interaction, and battle runtime reset.
- Lines 7140-7549: start game flow, monster-test spawning/destruction, disabled skill-editor open stub, drag start, hover tooltip setup, derived inventory/board/support/gm data, GM submit, save-slot selection/loading/deletion, rest-area interaction, resolution change, inventory close, pause/exit/end-game flows.
- Lines 7553-8068: main JSX return, including `PlayableBattleScene`, monster test panel, release-debug HUD, title screen, save selection, debug panels, overlays, disabled skill-editor panel, rest-area map selection, combat feed, and the inline inventory overlay with GM panel, character panel, stash panel, equipment grid, board grid, bag grid, tooltip, floating gem, placement prompt, and discard prompt.
- Lines 8079-8228: stat/resource helpers, tooltip positioning, typing-target guard, map bounds, dropped item kind, inventory removal, equipment sanitization, point parsing, battle viewport projection helpers.
- Lines 8230-8435: boss pack ids, monster skill config constants, monster skill materialization, procedural spawn plan creation, and stage scope/boss-pack helpers.
- Lines 8448-8689: monster level scaling, attack/defense stat construction, shape effect parsing, and procedural spawn log formatting.
- Lines 8693-9058: monster offense, outgoing damage, accuracy, player evasion, player damage mitigation, ailments, resistances, enemy damage scaling, enemy avoidance/block, enemy resource damage, enemy resistance/stat helpers, and status damage interactions.
- Lines 9060-9244: targeting, projectile launch helpers, projectile spread/direction math, battle camera/projection/terrain transform, render item adapter, and battle render presentation helper creation.
- Lines 9246-9350: gem tooltip view-model enrichment, active tooltip normalization, support tooltip normalization, conduit tooltip sections, conduit descriptions, and support target tag text.
- Lines 9352-9526: skill pipeline classification, thundercloud detection, damage-zone dedupe, projectile template checks, VFX scale helpers, forced element selection, stable hash/percent, hit target extraction, projectile follow-up suppression, VFX/projectile anchoring, and projectile completion helpers.
- Lines 9529-9817: enemy creation, runtime debug corner helpers, monster test option/enemy factories, monster-test stat helpers, random spawn, skill-test dummies, encounter palette helpers, and visual budget helpers.

## First Extraction Implications

- The lowest-risk render-only block is the inline inventory overlay at lines 7830-8068.
- The highest-value runtime pure-helper block is monster skill helper logic at lines 2712-2814.
- Monster skill event construction at lines 2519-2709 is valuable but must follow pure helper extraction because it still feeds App-owned side effects.
- App-owned side effects that must not move first include `consumeSkillEventTimeline`, pending hit queues, `setTexts`, `setAreaNovas`, save writes, pickup completion, battle tick scheduling, and runtime refs.
- Initial `InventoryOverlay` extraction starts with the outer render shell only. Existing values and callbacks remain produced by App and flow through the component's render children; the component does not own save state, storage writes, drag/drop mutation, tooltip ownership, GM request logic, equipment stat recalculation, board mutation, or runtime refs.

## App-Owned State And Runtime Invariants To Preserve

These values are intentionally App-owned at the start of the change. Extraction batches may pass them through props or explicit function inputs, but must not silently move ownership.

- Mode and shell state: `spriteTestMode`, `mapEditorMode`, `monsterTestMode`, `skillEditorMode`, `entryStep`, `gameResolutionMode`, `notice`, `playing`, `battlePauseOpen`, `battlePauseView`, `gameFailureOpen`.
- Save/rest state: `state`, `saveSlots`, `selectedSaveSlotId`, `saveStartMode`, `newPlayerName`, `restAreaPanel`, `restAreaInteractionTarget`, `restAreaMapEntryKey`.
- Map/debug state: `selectedMapId`, `battleMap`, `mapDebugEnabled`, `playableMinimapMode`, `exploredMinimapCells`, `authoredSpawnPlanActive`, `authoredAggroSources`, `spawnPlanWarnings`, `proceduralSpawnDebug`, `runtimeBoundaryScan`.
- Player/enemy state: `player`, `enemies`, `activePlayerBuffs`, `kills`, `elapsed`, `combatLogs`, `runtimePerfSummary`.
- Battle visual state: `bossPortal`, `bossPortalConfirm`, `texts`, `bolts`, `areaNovas`, `meleeArcs`, `chainSegments`, `damageZones`, `hitVfxs`.
- Inventory and interaction state: `bagOpen`, `hoveredGemId`, `hoveredBoardCell`, `hoveredBagSlot`, `hoveredEquipmentSlot`, `tooltip`, `compareModifierHeld`, `floatingGem`, `placementPrompt`, `itemDiscardPrompt`, `skipItemDiscardConfirmToday`, `showPersistentSupportLines`, `gmOpen`, `gmOptions`, `gmAffixes`, `inventorySlots`, `equipmentSlots`, `stashPageIndex`.
- Input and drag refs: `keys`, `floatingGemRef`, `dropInProgressRef`, `pendingDropPickup`, `pendingBossPortalUse`, `pickupRequestInFlight`, `dropDisplayPositions`, `knownDropIds`.
- Id/timer refs: `lastFrame`, `nextEnemyId`, `nextTextId`, `nextPlayerBuffId`, `nextBoltId`, `nextAreaNovaId`, `nextMeleeArcId`, `nextChainSegmentId`, `nextDamageZoneId`, `nextHitVfxId`, `nextPromptId`, `frontendDropId`, `frontendItemId`, `frontendBossPortalId`.
- Runtime queue refs: `attackTimers`, `thundercloudChannels`, `damageZoneChannels`, `scheduledSkillEvents`, `continuousAttackRuntime`, `activeDamageZones`, `bossSkillTimers`, `monsterSkillTimers`, `supremeBossSkillTimers`, `pendingBossDamageZoneHits`, `onKillRecastCounts`.
- Runtime mirror refs: `runtimePerf`, `runtimePerfLastSync`, `runtimeLastStepError`, `spawnTimer`, `playerVisual`, `enemyVisuals`, `exploredMinimapCellsRef`, `lastMinimapGridCellRef`, `triggeredEncounterSourceIds`, `encounterMonsterPalette`, `playerStateRef`, `activePlayerBuffsRef`, `enemiesStateRef`, `boltsStateRef`, `elapsedRef`, `elapsedLastUiSync`.
- Recovery/equipment refs: `movementBarrierDistanceAccumulator`, `playerBlockHitCounter`, `blockLifeRecoveryReadyMs`, `blockShieldRecoveryReadyMs`, `lifeReturnReadyMs`, `shieldReturnReadyMs`, `energyShieldRechargeReadyMs`, `warIntentState`.

Storage keys and local persistence that must remain unchanged:

- `GAME_RESOLUTION_STORAGE_KEY`.
- `ITEM_DISCARD_SKIP_CONFIRM_STORAGE_KEY`.
- `MAP_EDITOR_STORAGE_KEY`.
- `MAP_EDITOR_CURRENT_FILE_STORAGE_KEY`.
- `SKILL_EDITOR_CAMERA_STORAGE_KEY`.
- Frontend save slot storage behavior through `loadFrontendSaveSlotSummaries`, `loadActiveFrontendSaveSlotId`, `saveActiveFrontendSaveSlotId`, and related save helpers.

Runtime event consumers that must keep their current ownership until explicitly scoped:

- `consumeSkillEventTimeline`.
- `consumeImmediateSkillEvents`.
- `processFrontendProjectileImpacts`.
- `activeDamageZoneTickProgress`.
- `applyDamageEventBatch`.
- Pending hit and damage-zone mutation through `pendingBossDamageZoneHits.current` and `activeDamageZones.current`.
- Visual state writes through `setTexts`, `setBolts`, `setAreaNovas`, `setMeleeArcs`, `setChainSegments`, `setDamageZones`, and `setHitVfxs`.

## App Source-Text Test Coupling To Migrate With Ownership

The following checks currently read `webapp/App.tsx` directly. When protected functions move, the tests must follow the new owner module instead of forcing the implementation to stay in App.

- `webapp/smoke-test.mjs` reads `webapp/App.tsx` into `app` and uses broad `app.includes(...)` checks for character panel wiring, mana/runtime code, movement handling, backend-forbidden strings, generated-data loading, UI text, and other App/source invariants.
- `webapp/smoke-test.mjs` uses `functionBody(app, ...)` for `anchorHitVfxsToTargets`, `advanceEnemyBuffs`, `consumeSkillEventBatch`, `applyDamageEventBatch`, `applyEnemyStatusBuff`, `releaseFrontendPlayableSkill`, `buildFrontendPlayableSkillEvents`, projectile/chain/module-chain/damage-zone/melee/nova event builders, `activeDamageZoneRuntimeTickEvents`, `applyForcedMovementEvent`, `hitEnemies`, `stepGame`, `applyRuntimeMonsterAttacks`, and `syncEnemyVisuals`.
- `tests/test_webapp_map_run_boundary.py` centralizes `_app_source()` and reads `webapp/App.tsx` for many map-run, drop, spawn, progression, portal, and runtime source invariants.
- `tests/test_procedural_map_generation_v1.py` reads `webapp/App.tsx` to assert map generation debug/runtime request boundaries.
- `tests/test_map_template_instance_variants.py` reads `webapp/App.tsx` for map-template instance and runtime map usage checks.
- `tests/test_client_only_game_runtime_boundary.py` reads `webapp/App.tsx` for frontend skill runtime names, chromatic/split projectile payload invariants, client-only runtime recalculation, equipment/GM local behavior, player stat feed into combat, equipment modifier consumption, equipment modifier recovery, skill-family runtime branches, spawn/loot/progression paths, and save recovery messages.

Initial migration implications:

- App-owned orchestration checks should remain App-specific.
- Pure helper and event-builder checks should move to the focused runtime module once ownership moves.
- Broad source text checks should use deliberate combined sources only when the invariant is intentionally cross-module.
- Backend-coupling and skill-editor-forbidden checks should continue scanning all WebApp sources.

## Scope Exclusions Confirmed

No implementation task in this change requires or authorizes:

- backend APIs, backend services, server runtimes, web API layers, or server-generated gameplay behavior
- save-schema changes, storage-key changes, or migration semantics changes
- CSS redesign, visual theme changes, copy rewrites, or DOM order changes
- gameplay balance changes, skill behavior changes, target selection changes, hit timing changes, projectile path changes, damage-zone origin changes, damage formula changes, monster AI changes, drop-rate changes, or map progression changes
- duplicate frontend gameplay runtimes or alternate skill event generation paths
- skill-editor launch, skill-editor routes, skill-editor query flags, port `8765`, `dist-skill-editor`, or skill-editor preview acceptance evidence
- root-level screenshots, logs, traces, test outputs, or generated verification artifacts

## App-Local Types Needed By Extraction Batches

These App-local shapes are likely to be needed by extracted modules. They should move only when an extraction requires them, and then only into type-only modules or generic component props.

- Item and board types: `Gem`, `Cell`.
- Skill and runtime event types: `SkillEvent`, `RuntimeSkillEventsResponse`, `ScheduledSkillEvent`, `ContinuousAttackRuntime`.
- App state and save types: `AppState`, `FrontendSavePayload`, `FrontendSaveSlotSummary`, `MapProgressionStageView`, `FrontendMapRunMonster`.
- Drop and portal types: `DropPrompt`, `BossPortal`, `PlacementResult`, `PlacementPrompt`, `ItemDiscardPrompt`.
- GM/debug option types: `GmGemOption`, `GmEquipmentSourceOption`, `GmEquipmentRarityOption`, `GmOptions`, `GmEquipmentAffixOption`, `GmEquipmentAffixResponse`, `RuntimePerfSummary`.
- Player and combat resource types: `PlayerStatView`, `PlayerRuntimeState`, `PlayerBuff`, `FloatingText`.
- Battle visual runtime types: `FireBolt`, `HitVfx`, `AreaNova`, `MeleeArcVfx`, `ChainSegmentVfx`, `DamageZoneVfx`, `ActiveDamageZoneRuntime`, `ThundercloudChannelRuntime`, `Camera2D`, `UnitVisualRuntime`, `EnemyVisualRuntime`.
- Tooltip and drag types: `Tooltip`, `FloatingGem`.

Initial extraction should prefer generic props for render-only components. Shared type modules are justified only when multiple focused modules need the same shape and importing from App would create a circular or reverse dependency.

Type boundary decision for the first extraction batch:

- No new type-only module is required before extracting the inventory overlay.
- The inventory overlay can use local generic props for item, floating item, slot, tooltip, panel, and preview shapes.
- Shared type modules should be created later only when a concrete extracted runtime or presentation module needs a stable shape that cannot be expressed locally without importing from App.
- Because no type definitions are moved in the initial type-boundary preparation, no field names, literal values, optionality, or semantic shapes are changed at this point.
- Existing `webapp/types/` modules at audit time are `skillEditorTypes.ts` and `enemyTypes.ts`; source checks found no imports or references to `webapp/App.tsx`, generated data, local storage, browser globals, React state hooks, backend calls, or request helpers.
- No extracted module import rewiring is needed before the first actual extraction, because no new extracted module exists yet. The first render-only module should use local generic props or focused imports and must not import from App.
- Inventory overlay extraction currently wraps the existing App-owned inventory children without changing calls to `GemOrb`, `GemTooltipOverlay`, `FloatingGemView`, `StashPanel`, `BagGrid`, `EquipmentItemCell`, `EquipmentEmptyCell`, `BoardCell`, `SupportLines`, or `SupportPreviewLines`.
- The first overlay shell extraction preserves two-handed blocked-slot markup and hover handlers, stash render gate and page props, board hover and placement props, support-line selection logic, floating item render gate, discard prompt dialog/actions, and GM panel toggle/render gate in `App.tsx`.
- `webapp/App.tsx` no longer owns the outer `inventory-overlay` section directly; the inline bag gate now renders `<InventoryOverlay>` with the existing child composition inside it.
- Focused inventory extraction checks passed with `cmd /c npm run build`, `node webapp/smoke-test.mjs`, and `openspec validate finalize-webapp-app-architecture-boundaries --strict`.
- Actual WebApp verification used the project `run.bat` flow on `http://127.0.0.1:8766/`; the verified inventory screenshot is `artifacts/screenshots/4-8-inventory-overlay-rest.png`, showing the rest-area inventory overlay with equipment slots, board surface, bag grid, persistent support-line toggle, GM button, and gameplay view behind it. Run logs were stored in `artifacts/logs/runbat-webapp-out.log` and `artifacts/logs/runbat-webapp-err.log`. The in-app browser connection timed out twice, so local Playwright was used against the same `run.bat` WebApp URL.
- Inventory subpanel refinement split the stable render-only right workbench into `EquipmentPanel`, `InventorySkillBoardPanel`, and `InventoryBagPanel`. `App.tsx` retains state derivation and callback wiring while the new components own the repeated JSX for equipment slots, board cells/support lines, and bag cells.
- The new inventory subpanels use explicit props and do not introduce `useState`, `useReducer`, `createContext`, browser storage access, inventory stores, board stores, or drag/drop context.
- Slot arrays, lookup maps, hover state, floating item state, tooltip clearing, render callbacks, and placement callbacks remain App-owned and are passed into the subpanels. The subpanels do not create new maps, sets, memoized state, refs, or local React state for those responsibilities.
- `webapp/App.tsx` no longer imports or renders `EquipmentItemCell`, `EquipmentEmptyCell`, `BoardCell`, `SupportLines`, `SupportPreviewLines`, or `BagGrid` directly. The remaining inventory area in App is conditional rendering, `StashPanel` composition, right-workbench subpanel wiring, tooltip/floating item prompts, and App-owned callbacks.
- Inventory subpanel verification passed with `cmd /c npm run build`, `node webapp/smoke-test.mjs`, OpenSpec strict validation, and the project `run.bat` WebApp flow. The current-code screenshot is `artifacts/screenshots/5-5-inventory-subpanels.png`, with one `.equipment-panel`, one `.board-panel`, one `.bag-panel`, the support-line toggle, and the GM button visible.
- Monster skill presentation helper extraction created `webapp/runtime/monsterSkillPresentation.ts` and rewired `App.tsx` to import the moved helper family from that module.
- Moved monster skill pure helpers now live outside App: projectile spread angles, zone center selection and clamping, damage type/form passthrough, VFX key selection, suppress-hit-VFX policy, and projectile aim policy. `App.tsx` retains event release orchestration and calls the imported helpers.
- The moved helper formulas preserve the original pattern names, numeric constants, special skill ids, VFX key strings, aim-policy strings, passthrough return shapes, and default values from App.
- `webapp/runtime/monsterSkillPresentation.ts` depends only on monster skill types and `distance` from `utils/math2d`; source checks found no React state/hooks, refs, browser storage/globals, fetch/API calls, runtime queues, mutable player/enemy refs, or visual state setters.
- `webapp/smoke-test.mjs` now checks `monsterSkillPresentation.ts` as the owner for representative fan/ring/spiral/cross/wide_fan projectile patterns, ring/around_player/cross/line zone patterns, target-centered special zones, clamped zone placement, damage type/form passthrough, special VFX keys, suppress-hit-VFX policy, aim policies, and purity guardrails.
- `App.tsx` imports monster skill presentation helpers from `./runtime/monsterSkillPresentation`; local helper definitions for spread, zone center, VFX key, and aim policy are no longer present in App.
- Monster skill pure helper extraction passed `cmd /c npm run build`, `node webapp/smoke-test.mjs`, and OpenSpec strict validation. Diff inspection showed App helper deletion/import rewiring, the new pure helper module, and source-check updates only for this batch.
- Monster skill event-builder extraction created `webapp/runtime/monsterSkillEventBuilder.ts` as the focused owner for monster skill `SkillEvent` payload construction. `App.tsx` now calls builder functions for projectile and melee/damage-zone event arrays while retaining timeline consumption, pending hit queue mutation, runtime refs, and scheduling.
- Projectile event payload construction now lives in `buildMonsterSkillProjectileEvents`. The moved payload preserves spawn event ids, timestamps, boss/player source-target fields, spawn/target/expire positions, normalized directions, windup delay, computed lifetime duration, damage type/form helpers, VFX keys, projectile ids, speed/range/width/height/radius/collision/impact/lifetime fields, leash range, hit marker, suppress-hit-VFX flag, aim/spawn policies, source enemy metadata, and player hit metadata.
- Damage-zone and melee-arc event payload construction now lives in `buildMonsterSkillMeleeZoneEvents`. The moved payload preserves warning prime events, damage-zone events, melee-arc event type selection, zone ids, zone indexes/counts, repeat fields, circular shape fields, radius/origin/direction, warning/windup delay, duration fallback, damage amount formula, trigger/hit marker fields, arc angle/radius/range payloads, and the pending damage-zone hit payload used by App-owned collision timing.
- Deterministic monster support display payload construction now lives in `buildMonsterSupportDisplayEvents`, limited to heal floating-text payloads and the heal pulse area-nova payload. `App.tsx` still owns healing mutation, ally buff mutation, `setTexts`, `setAreaNovas`, combat log mutation, and id-ref advancement.
- App ownership remains explicit after the event-builder batch: `consumeSkillEventTimeline`, pending boss damage-zone hit queue mutation, repeated-zone `window.setTimeout` scheduling, `playerStateRef`, `enemiesStateRef`, `setTexts`, and `setAreaNovas` are still in `webapp/App.tsx` and are guarded by smoke/source checks.
- `webapp/smoke-test.mjs` now compiles and executes `monsterSkillEventBuilder.ts` directly, checking representative projectile, damage-zone, melee-arc, support pulse, repeated multi-zone, and special-case target-centered zone payloads against the preserved field contracts.
- Smoke/source-boundary checks now read protected monster skill event payload invariants from `webapp/runtime/monsterSkillEventBuilder.ts`, pure placement/VFX/policy invariants from `webapp/runtime/monsterSkillPresentation.ts`, and App-owned orchestration invariants from `webapp/App.tsx`. The checks no longer force moved event-builder payload code to remain in App.
- Monster skill event-builder visual verification used the project `run.bat` flow on `http://127.0.0.1:8766/`, then opened the actual WebApp battle surface with `?mode=monster-test` to spawn monsters using projectile, damage-zone, melee-arc, and support skills without using skill-editor routes or port `8765`. Screenshot `artifacts/screenshots/7-8-monster-skill-events.png` shows the battle view with spawned monsters, a blue projectile visual, green circular zone/pulse visuals, and near-monster arc visuals; the combat feed records `暮色哨戒弹`, `毒织地雾`, `尘环刮击`, and `星标复苏` releases. Run logs are `artifacts/logs/runbat-webapp-7-8-out.log` and `artifacts/logs/runbat-webapp-7-8-err.log`.

## Player Damage Runtime Candidate Review

Deterministic helpers eligible for focused runtime ownership:

- Monster outgoing damage scalar helpers: `monsterOffenseModifier`, `monsterOutgoingDamage`, `monsterAccuracy`, `monsterCritChancePercent`, `monsterCritDamagePercent`, `monsterDoubleDamageChancePercent`.
- Player mitigation helpers: `playerEvasionChanceAgainstMonster`, `playerResistancePercent`, `playerResistanceCap`, `convertIncomingPlayerDamageComponents`, `mitigateIncomingPlayerDamageComponent`.
- Damage-to-resource helpers: the energy-shield/life split inside `resolveMonsterHitAgainstPlayer` and the mana-before-life/energy-shield/life split in `applyFrontendDamageToPlayer`.

Must remain App-owned in this batch:

- React state mutation through `setRuntimePlayer`, `setTexts`, `setCombatLogs`, and defeat overlays.
- Runtime refs and cooldown refs: `playerStateRef`, `blockLifeRecoveryReadyMs`, `blockShieldRecoveryReadyMs`, `lifeReturnReadyMs`, `shieldReturnReadyMs`, and `energyShieldRechargeReadyMs`.
- Combat log generation, floating-text creation, recovery-on-block/on-hit side effects, defeat handling, runtime queue consumption, and boss/monster hit adapter orchestration.
- `webapp/runtime/playerDamageRuntime.ts` now owns pure player damage formulas: monster outgoing damage, monster accuracy/evasion interaction, crit/double-damage scalar helpers, resistance caps, incoming conversion, armor/resistance/final mitigation, ailment chance calculation, monster-hit resolution, and damage-to-mana/energy-shield/life splitting. `App.tsx` imports these helpers and keeps state mutation, block roll counters, recovery cooldown refs, text/log generation, defeat handling, and battle queue orchestration.
- Smoke checks now prevent `playerDamageRuntime.ts` from owning App side effects or cooldown refs, including `setRuntimePlayer`, `setTexts`, `setCombatLogs`, defeat overlay state, recovery refs, energy-shield recharge refs, and floating-text types.
- `webapp/smoke-test.mjs` now compiles and executes `playerDamageRuntime.ts` directly, covering monster outgoing damage scaling, evasion, elemental/chaos resistance caps, incoming conversion, armor and physical mitigation, block reduction, critical scaling, double-damage scaling, and mana/energy-shield/life damage ordering.
- Smoke/source-boundary checks now read moved player damage invariants from `webapp/runtime/playerDamageRuntime.ts`, while App-specific checks remain limited to hit adapter usage, block roll orchestration, state mutation, combat logs, and visual side effects.
- Player damage runtime verification passed `cmd /c npm run build`, `node webapp/smoke-test.mjs`, and OpenSpec strict validation. Actual WebApp verification used `run.bat` on `http://127.0.0.1:8766/` with the battle surface opened via `?mode=monster-test`; screenshot `artifacts/screenshots/8-7-player-damage-runtime.png` shows live monsters around the player, overhead resource bars, and combat feed entries for monster melee skills dealing physical damage. Run logs are `artifacts/logs/runbat-webapp-8-7-out.log` and `artifacts/logs/runbat-webapp-8-7-err.log`.

## Save State Drop And Stash Boundary Review

Existing focused owners reviewed for this batch:

- `webapp/state/frontendAppState.ts` owns initial state creation, monster-test state, new-save starter state, starter gem selection, save-to-state restoration, save payload conversion, and autosave payload handoff.
- `webapp/utils/frontendSaveStorage.ts` owns save version/key constants, active slot persistence, slot id normalization, autosave/slot loading, legacy autosave migration, slot summaries, slot clearing, payload serialization shape, and save candidate restoration.
- `webapp/components/inventory/stashState.ts` owns empty stash pages, stash page normalization, stash item id collection, stash removal, and moving an item to a stash slot.
- `webapp/state/frontendDropState.ts` owns selected map stage selection, deterministic frontend drop rolls, monster drop chance/attempts, map-entry target selection, equipment rarity selection, gem weighting/choice, drop prompt creation, and inventory item creation from drops.
- 9.2 review found no remaining App-local helper matching the approved deterministic move list. `App.tsx` still calls the existing owners for save payload conversion, starter-state creation, stash normalization/id/removal, drop calculations, and inventory-item-from-drop creation; the remaining App functions around drops are orchestration over ID refs, display positions, pickup animation state, map progression mutation timing, and notices.
- 9.3 preservation review kept the existing frontend save constants and storage flow in place: `FRONTEND_SAVE_VERSION`, autosave key, active-slot key, slot key prefix, and slot count remain unchanged in `frontendSaveStorage.ts`; active-slot mirroring through autosave payload writes remains unchanged; legacy autosave migration still runs before slot summaries; save restoration still normalizes player names before state recalculation; starter gems still exclude `excludedStarterBaseGemIds`; stash page and slot counts still come from the existing App wiring into `createStashStateHelpers`; duplicate ownership filtering and item identity still remain in `normalizeStashPages`, `removeItemsFromStashPages`, and `createFrontendInventoryItem`.
- 9.4 orchestration review keeps save/drop/map-run side effects in `App.tsx`: slot summary loading and selected-slot application, `applyServerState`/`applyFrontendState`, autosave trigger timing, `spawnFrontendDrops`, `beginDropPickup`/`finishDropPickup`, `pendingDropPickup`, `dropDisplayPositions`, boss portal confirmation, and map progression entry-count/unlock mutation remain App-owned callback/ref/state wiring.
- 9.5 smoke/source checks now read save payload and starter-state invariants from `webapp/state/frontendAppState.ts`, save key/version/migration/autosave invariants from `webapp/utils/frontendSaveStorage.ts`, stash normalization/id/removal invariants from `webapp/components/inventory/stashState.ts`, and drop calculation/item creation invariants from `webapp/state/frontendDropState.ts`. App checks remain limited to sanitizer and stash-transfer orchestration.
- 9.6 verification passed `cmd /c npm run build`, sequential `npm test`, `node webapp/smoke-test.mjs` via that script, and OpenSpec strict validation. A focused Python run against `tests/test_webapp_map_run_boundary.py` and `tests/test_client_only_game_runtime_boundary.py` still fails because many legacy tests read moved owner code directly from `webapp/App.tsx`; that is recorded as the remaining 12.x source-boundary migration work rather than a 9.x behavior failure. Actual WebApp verification used `run.bat` on `http://127.0.0.1:8766/` and Playwright screenshots: `artifacts/screenshots/9-6-title-flow.png`, `artifacts/screenshots/9-6-save-flow.png`, and `artifacts/screenshots/9-6-rest-stash-flow.png`. The final screenshot shows the rest-area stash workbench and inventory overlay open, and browser storage contained `poe2.v1.frontend.active_save_slot`, `poe2.v1.frontend.autosave`, and `poe2.v1.frontend.save.slot.1`. Logs are `artifacts/logs/runbat-webapp-9-6-out.log` and `artifacts/logs/runbat-webapp-9-6-err.log`; no skill-editor route or port was used.

## UI Shell And Entry Flow Review

- 10.1 created focused layout presentation modules for the title entry screen and non-gameplay top HUD: `webapp/components/layout/EntryTitleScreen.tsx` and `webapp/components/layout/AppTopHud.tsx`. They accept explicit props and do not own mode state, save state, pause state, runtime logs, storage writes, or gameplay refs.
- 10.2 rewired the title screen display to `EntryTitleScreen`. The component preserves `entry-title-screen`, `entry-title-copy`, `entry-primary-button`, the title rendering, button label, and the original title-screen aria label; `App.tsx` still owns the click transition by refreshing save slots, setting `entryStep` to `save`, and updating `notice`.
- 10.3 extracted non-gameplay shell composition into `AppTopHud` and `GameShellOverlays`. The layout module composes the release-debug HUD, map debug toggle, procedural spawn debug panel, spawn warnings, game failure overlay, battle pause overlay, portal confirm overlay, help text, disabled skill-editor debug toggles, map selection gate, and combat feed from explicit props. App still owns all mode/save/pause/failure/portal/debug/runtime state and all callbacks.
- 10.4 ownership review confirms shell extraction did not move state ownership: `entryStep`, `saveSlots`, `selectedSaveSlotId`, `saveStartMode`, `newPlayerName`, `battlePauseOpen`, `battlePauseView`, `gameFailureOpen`, `bossPortalConfirm`, `skillEditorMode`, `skillEditorDebugOptions`, `skillEditorCameraSettings`, `combatLogs`, `runtimeBoundaryScan`, and `runtimeDebugCornerSummary` remain initialized and mutated in `App.tsx`.
- 10.5 verification used the latest `run.bat` WebApp build on `http://127.0.0.1:8766/`, with logs in `artifacts/logs/runbat-webapp-10-5-out.log` and `artifacts/logs/runbat-webapp-10-5-err.log`. Playwright exercised the actual title screen, save selection, new-save rest-area entry, stash overlay, map selection overlay, battle entry, and battle pause overlay. Screenshots are `artifacts/screenshots/10-5-title-screen.png`, `artifacts/screenshots/10-5-save-selection.png`, `artifacts/screenshots/10-5-rest-area.png`, `artifacts/screenshots/10-5-stash-overlay.png`, `artifacts/screenshots/10-5-map-selection.png`, and `artifacts/screenshots/10-5-battle-pause.png`. The final observed DOM contained `.battle-pause-overlay` and `.help-text`; no skill-editor route or port was used.

## App Boundary Cleanup Review

- 11.1 cleanup review found no additional unused App imports, local helper families, constants, or callbacks to remove after the inventory, monster skill, player damage, save/drop, title, and shell extraction batches. Current build and smoke checks pass with the focused module imports.
- 11.2 App function review confirms the helper families moved in this change are no longer locally owned by App: inventory/equipment/board render JSX is in inventory components, title and shell overlay composition is in layout components, monster skill pure presentation helpers are in `monsterSkillPresentation.ts`, monster event payload builders are in `monsterSkillEventBuilder.ts`, player damage formulas are in `playerDamageRuntime.ts`, and save/drop/stash deterministic helpers remain in state/helper owners. Remaining App functions are cross-domain state/ref setup, callback adapters, runtime queues, battle loop/event consumption, gameplay side effects, tooltip/battle adapters, save/rest/map orchestration, or legacy frontend playable skill runtime code that was outside this change's extraction scope.
- 11.3 reverse-import scan found no extracted WebApp module importing `webapp/App.tsx`. Fixed-string scans for `../App` and `webapp/App` under `webapp/components`, `webapp/runtime`, `webapp/state`, `webapp/utils`, `webapp/features`, and `webapp/types` returned no matches; the only `./App` token was the legitimate sibling import of `./AppShellPanels` inside `GameShellOverlays.tsx`.
- 11.4 App import review confirms focused owners are now imported instead of redefined locally for the completed batches: `InventoryOverlay`, `EquipmentPanel`, `InventoryBagPanel`, `InventorySkillBoardPanel`, `EntryTitleScreen`, `AppTopHud`, `GameShellOverlays`, `monsterSkillPresentation`, `monsterSkillEventBuilder`, `playerDamageRuntime`, `frontendAppState`, `frontendDropState`, `stashState`, and `frontendSaveStorage`.
- 11.5 duplicate-runtime review found no new extracted presentation/state modules owning gameplay runtime, target selection, hit timing, damage application, projectile trajectory decisions, or event consumption. Scans of the new layout/inventory modules and moved runtime/state owners found no `consumeSkillEvent`, `applyDamageEventBatch`, `setEnemies`, `setRuntimePlayer`, `activeDamageZones`, `pendingBossDamageZoneHits`, backend request calls, or duplicated frontend damage-event generation in the extracted presentation modules.
- 11.6 comment review did not add new code comments. Ownership guidance is already centralized in `docs/webapp-module-boundaries.md` and `docs/webapp-app-decomposition-map.md`, and the extracted modules expose their boundaries through focused names, explicit props, and existing imports without needing broad explanatory comments that repeat code.
