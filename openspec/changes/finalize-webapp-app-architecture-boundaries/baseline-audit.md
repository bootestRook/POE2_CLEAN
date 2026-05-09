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
