# Runtime Orchestration Extraction Baseline Audit

## 1.1 Branch And Worktree

- Branch: `main`.
- Starting worktree status: clean.
- Last commit before implementation: `13f532b Propose App runtime orchestration extraction`.
- No unrelated dirty files overlap `webapp/App.tsx`, WebApp runtime modules, WebApp type modules, smoke tests, or this change's OpenSpec files.

## 1.2 Context Review

- Re-read `AGENTS.md`: the project remains client-only, WebApp changes must identify focused owner modules before editing, frontend-affecting work requires actual playable WebApp browser screenshots, and skill-editor verification is forbidden.
- Re-read `docs/webapp-module-boundaries.md`: `webapp/App.tsx` is limited to mode routing, App-owned state/ref initialization, viewport shell composition, imports, callback adapters, and unavoidable focused-module wiring.
- Re-read `docs/webapp-app-decomposition-map.md`: remaining App responsibilities are dominated by runtime/domain types, constants, playable skill event generation/consumption, damage/status/resource helpers, projectile/damage-zone lifecycle, battle-loop orchestration, and state/ref wiring.
- Re-read `docs/codex-skill-workflow.md`: skill runtime work must start from gameplay mechanisms, reuse existing frontend runtime/config/test paths, and prove runtime behavior rather than payload presence alone.
- Re-read this change's proposal, design, and spec deltas: extraction order is type/constant boundaries, pure deterministic helpers, playable event builders, damage/status/resource/lifecycle helpers, then orchestration only after dependencies are stable.
- Explicit non-goals remain unchanged: no backend/API/server runtime, Python `SkillRuntime`, save-schema or storage-key changes, dependencies, CSS redesign, copy edits, gameplay balance changes, or skill-editor acceptance path.

## 1.3 Pre-Implementation OpenSpec Validation

- `openspec validate extract-webapp-runtime-orchestration-from-app --strict`: passed before runtime extraction implementation began.

## 1.4 App Runtime Baseline

- `webapp/App.tsx` size: 426,761 bytes.
- `webapp/App.tsx` line count: 9,243 lines.

### Type And Constant Ranges

- Lines 251-282: App-local `Gem` and `Cell` shapes.
- Lines 318-929: App-local runtime/domain shapes including `SkillEvent`, `AppState`, `FrontendSavePayload`, map run, drop, boss portal, GM, player runtime, battle VFX, tooltip, floating item, placement prompt, camera, and visual runtime shapes.
- Lines 506-531: monster/boss numeric constants that still sit in App.
- Lines 929-1006: map, player, camera, runtime visual budget, inventory, storage, starter gem, and monster-test constants still in App.
- Lines 7883-7939: boss pack ids and monster skill config constants.
- Lines 8728-8729: frontend knockback constants.

### Major Runtime Function Ranges

- Lines 1175-2245: `GameApp` state/ref setup through battle tick wrapper and frame perf sync.
- Lines 2249-2281: `syncPlayerVisual`.
- Lines 2283-2397: `applyRuntimeMonsterAttacks` and monster skill candidate/timer dispatch.
- Lines 2398-2569: `releaseMonsterSkill`, support/guard application, projectile release, and repeated melee-zone scheduling.
- Lines 2573-2939: legacy boss skill timers, boss projectile/barrage/area event builders, and boss damage-zone pending queues.
- Lines 2960-3313: monster projectile impact, boss damage-zone hit, player hit adapter, buffs, and enemy visual sync.
- Lines 3947-4100: `frontendDamageEventsForTarget`.
- Lines 4101-4143: `consumeSkillEventTimeline` and `releaseFrontendPlayableSkill`.
- Lines 4145-4837: frontend playable skill event builders for projectile, secondary hit, split projectile, ignited hit explosion, chain, module-chain, damage-zone, melee-arc, and nova families.
- Lines 4840-5097: legacy `hitEnemies`, projectile impact processing, and immediate skill-event consumption adapter.
- Lines 5100-5369: scheduled skill events, active damage-zone runtime ticks, forced movement, damage-zone geometry, and zone target helpers.
- Lines 5374-5933: `consumeSkillEvent` and `consumeSkillEventBatch`, including projectile, chain, status, floating text, VFX, forced movement, and damage event routing.
- Lines 6141-6309: `applyDamageEventBatch`, enemy damage application, kill-triggered events, drops, and progression side effects.
- Lines 7732-7776: stat lookup and player resource regeneration helpers.
- Lines 7973-8095: map spawn plan, stage scope, and boss pack helpers.
- Lines 8101-8485: monster stats, mitigation, status, resistance, and damage/resource helpers.
- Lines 8485-8632: targeting, projectile launch, projectile spread, direction, and random angle helpers.
- Lines 8831-8954: stable hash, projectile follow-up suppression, VFX/projectile anchoring, projectile completion, and enemy creation helpers.
- Lines 9233-9240: runtime visual budget helpers.

### Smoke Checks Still Reading App-Owned Runtime Code

- `webapp/smoke-test.mjs` line 8 reads `webapp/App.tsx` as `app`.
- Lines 175, 188, and 217 still check App-owned starter/storage/stash behavior.
- Lines 453-596 still inspect App-owned projectile impact, anchoring, enemy buffs, skill event consumption, damage batch, enemy status, playable skill release, event builders, damage-zone ticks, forced movement, melee arc, and nova builders.
- Lines 873-918 still inspect App-owned damage-zone naming, playable hit release, backend-coupling guards, and `stepGame`.
- Lines 1077-1089 still assert App-owned playable map-run monster creation and forbidden coupling text.
- Lines 1521-1528 still assert App-owned canvas geometry flags and player geometry snapshot wiring.
- Lines 1738-1754 and 1830-1837 still assert App-owned monster skill dispatch, player hit adapters, support display mutations, timeline consumption, pending damage-zone queue ownership, repeated zone scheduling, and runtime refs.
- Lines 1858-1873 still inspect App-owned `applyRuntimeMonsterAttacks` and `syncEnemyVisuals`.

## 1.5 Scope Exclusions

- No backend APIs, backend services, web API layers, server runtime behavior, or server-generated gameplay behavior are required or allowed.
- No Python `SkillRuntime`, `CombatSession`, backend runtime reports, or backend-canonical gameplay path is required or allowed.
- No save-schema changes, storage-key changes, save migration, dependency changes, CSS redesign, copy changes, or gameplay balance changes are required.
- No skill-editor launch, `/skill-editor`, `?skill_editor=1`, `view=skill_editor`, port `8765`, `dist-skill-editor`, or skill-editor screenshot is required or allowed as acceptance evidence.
- The verification surface for frontend-affecting extraction remains the normal playable WebApp launched through the project `run.bat` flow, with artifacts under `artifacts/`.

## 1.6 Baseline Verification

- `cmd /c npm run build`: passed. Vite reported the existing large chunk warning.
- `npm test`: passed. `webapp/smoke-test.mjs` reported `WebApp smoke test passed.`
- `openspec validate extract-webapp-runtime-orchestration-from-app --strict`: passed.

## 2.2 Runtime Owner Category Decision

- No new focused runtime owner folder category is needed for this pass.
- Existing owner categories cover the planned work: `webapp/runtime/` for deterministic runtime helpers and event builders, `webapp/types/` for behavior-free shared shapes, `webapp/state/` for frontend state/save/drop helpers, `webapp/components/battle/` for battle presentation, and `webapp/features/playable-battle/` for playable battle scene composition.
- `docs/webapp-module-boundaries.md` already names these owners and does not need a new category for task 2.2.

## 2.5 Documentation Batch Verification

- `cmd /c npm run build`: passed. Vite reported the existing large chunk warning.
- `npm test`: passed. `webapp/smoke-test.mjs` reported `WebApp smoke test passed.`
- `openspec validate extract-webapp-runtime-orchestration-from-app --strict`: passed.

## 3.1 App-Local Type Extraction Candidates

- Existing type owners: `webapp/types/enemyTypes.ts` owns `Enemy`, `EnemyBuff`, `EncounterMonsterPalette`, runtime tier/engagement shapes, and scan summary shapes; `webapp/types/skillEditorTypes.ts` owns disabled skill-editor/tooling shapes; state modules own preview/drop helper generics.
- Immediate runtime-module candidates: `SkillEvent`, `PlayerRuntimeState`, `FloatingText`, `PlayerBuff`, `FireBolt`, `HitVfx`, `AreaNova`, `MeleeArcVfx`, `ChainSegmentVfx`, `DamageZoneVfx`, `ActiveDamageZoneRuntime`, `ThundercloudChannelRuntime`, `ScheduledSkillEvent`, `ContinuousAttackRuntime`, `RuntimeSkillEventsResponse`, `RuntimePerfSummary`, `Camera2D`, `UnitVisualRuntime`, and `EnemyVisualRuntime`.
- State/save/drop candidates needed by later state or orchestration boundaries: `Gem`, `AppState`, `FrontendSavePayload`, `FrontendMapRunMonster`, `DropPrompt`, `BossPortal`, `MapProgressionStageView`, `PlacementResult`, `PlacementPrompt`, `ItemDiscardPrompt`, and `FrontendSaveSlotSummary`.
- UI/tooling shapes to avoid moving into runtime modules unless a focused UI owner needs them: `Cell`, GM option/response shapes, `Tooltip`, and `FloatingGem`.
- `PendingBossDamageZoneHit`, `BossSkillTimers`, and `SupremeBossSkillTimer` are queue/timer orchestration shapes; they can move to type-only modules only if the related runtime owner receives all state explicitly and does not take over hidden App refs.

## 3.4 Type Module Dependency Check

- `webapp/types/combatRuntimeTypes.ts` imports type-only dependencies from `unitAssets`, `monsterSkillRuntime`, `types/enemyTypes`, and `state/frontendSkillPreviewState`.
- Checked for forbidden tokens: `App.tsx`, `../App`, React runtime/state hooks, browser storage, `fetch`, `/api/`, skill editor panel, setter-like mutation names, `window`, and `document`.
- Result: no forbidden dependency tokens found in `webapp/types/combatRuntimeTypes.ts`.

## 3.5 Type Rewire Check

- `webapp/App.tsx` now imports moved combat runtime shapes from `webapp/types/combatRuntimeTypes.ts`.
- Checked for old local type definitions in `webapp/App.tsx`: moved combat runtime type definitions are no longer defined there.
- Checked WebApp imports from App: only `webapp/main.tsx` imports the `App` entrypoint; extracted modules do not import moved combat runtime types from `App.tsx`.
- Existing battle/map-editor/disabled-editor files with similarly named local view/tooling types were left unchanged because they are local props/tooling shapes, not the moved App runtime owner definitions.

## 3.7 Type-Only Extraction Verification

- Focused source check: no forbidden App, state, generated data, React, storage, backend, browser, or runtime declaration tokens found in `webapp/types/combatRuntimeTypes.ts` or `webapp/types/skillPreviewTypes.ts`.
- `webapp/App.tsx` after type extraction: 419,701 bytes and 8,913 lines.
- `cmd /c npm run build`: passed. Vite reported the existing large chunk warning.
- `npm test`: passed. `webapp/smoke-test.mjs` reported `WebApp smoke test passed.`
- `openspec validate extract-webapp-runtime-orchestration-from-app --strict`: passed.

## 4.1 Stable Constant Extraction Candidates

- Battle camera/rendering: `MAP_WIDTH`, `MAP_HEIGHT`, `MAP_VISUAL_WIDTH`, `MAP_VISUAL_HEIGHT`, `PLAYER_SPEED`, `FLOATING_TEXT_VISUAL_RISE_SPEED`, `BATTLE_CAMERA_ZOOM`, `BATTLE_CAMERA_ANCHOR_X`, `BATTLE_CAMERA_ANCHOR_Y`, `BATTLE_CAMERA_FOLLOW_OFFSET_Y`, `BATTLE_ENTITY_Z_INDEX_BASE`, `CANVAS_GEOMETRY_BATTLE_OBJECTS`, and `CANVAS_GEOMETRY_SKILL_EFFECTS`.
- Runtime visual budgets and perf timing: `RUNTIME_PERF_SYNC_INTERVAL_MS`, `RUNTIME_DROPPED_FRAME_MS`, `RUNTIME_SLOW_LOGIC_MS`, `RUNTIME_MIN_FRAME_MS`, `MAX_RUNTIME_PROJECTILE_VISUALS`, `MAX_RUNTIME_HIT_VFX`, `MAX_RUNTIME_FLOATING_TEXT`, `MAX_RUNTIME_AREA_VFX`, and `DOT_FLOATING_TEXT_INTERVAL_SECONDS`.
- Skill timing: `TRIGGERED_SKILL_EVENT_MIN_DELAY_SECONDS`, `FRONTEND_BASE_KNOCKBACK_DISTANCE`, and `FRONTEND_KNOCKBACK_LOCK_MS`.
- Monster level formulas: `MONSTER_NORMAL_LIFE_BASE/GROWTH`, `MONSTER_NORMAL_DAMAGE_BASE/GROWTH`, `MONSTER_NORMAL_ACCURACY_BASE/GROWTH`, `MONSTER_NORMAL_ARMOR_BASE/GROWTH`, and `MONSTER_NORMAL_ENERGY_SHIELD_BASE/GROWTH`.
- Boss skill defaults: boss projectile interval/range/speed/radius constants, area warning/radius constants, barrage count/wave interval/offset constants, boss pack id sets, and supreme boss config constants.
- Inventory/stash constants: inventory slot/column counts, stash page counts, equipment slot specs, weapon slot indices, item discard preference key, and starter board position.
- Interaction radii and test/debug constants: keyboard pickup radius, click completion radius, monster test level/player life/dummy offsets, encounter palettes, and monster test spawn offsets.
- Constants already owned elsewhere: enemy movement/combat constants live in `webapp/runtime/enemyRuntime.ts`; projectile VFX constants live in `webapp/components/battle/projectileVfxPresentation.ts`.

## 4.3 Moved Constant Value Check

- `webapp/runtime/monsterStatConstants.ts` preserves all moved monster normal base/growth numeric values and exported names.
- `webapp/runtime/bossSkillConstants.ts` preserves all moved boss skill timing/range/projectile numeric values and `BOSS_BARRAGE_WAVE_OFFSETS_DEG = [0, 11.25, 22.5] as const`.
- `webapp/runtime/runtimeTimingConstants.ts` preserves runtime perf thresholds, visual caps, damage-over-time text interval, triggered skill minimum delay, and frontend knockback constants.
- `webapp/App.tsx` imports the moved constants by the same exported names and still references those names at the existing call sites.

## 4.4 Constants Intentionally Left In App

- Game resolution constants remain in App/hook-adjacent flow until resolution ownership is separately scoped.
- Map dimension and battle camera anchor constants remain in App because they derive from the selected baked map and viewport shell composition.
- Inventory, stash, equipment slot, tooltip, floating item, discard preference, and starter board constants remain in App because moving them cleanly requires a separate inventory/state ownership pass.
- Skill-editor timeline, skill-test dummy, monster-test spawn offsets, monster-test level/player life, and encounter palette constants remain in App because they are disabled-tooling/test/debug-adjacent and not part of the runtime owner extracted in this batch.
- Boss pack id lists and supreme boss config constants remain in App because they are tied to map-run stage selection, local config loading, and boss runtime orchestration rather than pure constant ownership alone.
- Keyboard pickup and click interaction radii remain in App because they sit in pickup/input orchestration that this pass has not moved.

## 4.6 Constant Extraction Verification

- `cmd /c npm run build`: passed. Vite reported the existing large chunk warning.
- `npm test`: passed. `webapp/smoke-test.mjs` reported `WebApp smoke test passed.`
- `openspec validate extract-webapp-runtime-orchestration-from-app --strict`: passed.
- `run.bat` flow launched the WebApp on `http://127.0.0.1:8766/`; logs were stored under `artifacts/logs/`.
- Playable WebApp browser verification captured `artifacts/screenshots/runtime-constants-playable-battle-final.png`.
- Screenshot observation: `map_001` was running in the playable battle view, procedural spawn debug information was visible, two canvas elements were present, and the combat feed reported that monsters, kills, and drops are frontend-run.

## 5.1 Frontend Playable Skill Function Map

- Shared event payload helpers: `frontendDamageEventsForTarget` at `webapp/App.tsx:3624`, `frontendKnockbackEventsForTarget` at `3688`, `frontendFloatingDamageComponentPayload` at `3730`, `frontendSkillHitImpactRadius` at `3740`, `frontendSecondaryHitAmount` at `3753`, and `frontendScaledSkillConfigDamageAmount` at `3758`.
- Targeting helper: `frontendUniqueTargetsByDistance` at `3765`.
- Timeline/release/dispatcher: `consumeSkillEventTimeline` at `3778`, `releaseFrontendPlayableSkill` at `3792`, `buildFrontendPlayableSkillEvents` at `3822`, and `hitEnemies` at `3842`.
- Projectile family: `buildFrontendProjectileSkillEvents` at `3851`, `buildFrontendSecondaryHitEvents` at `4010`, `buildFrontendSplitProjectileEvents` at `4060`, `buildFrontendIgnitedHitExplosionEvents` at `4142`, and `processFrontendProjectileImpacts` at `4656`.
- Chain family: `buildFrontendChainSkillEvents` at `4168`.
- Module-chain family: `buildFrontendModuleChainSkillEvents` at `4202`.
- Damage-zone/channel family: `buildFrontendDamageZoneSkillEvents` at `4317`, `consumeScheduledSkillEvents` at `4778`, and `activeDamageZoneRuntimeTickEvents` at `4850`.
- Melee and nova families: `buildFrontendMeleeArcSkillEvents` at `4436` and `buildFrontendNovaSkillEvents` at `4491`.
- Immediate/consumer family: `consumeImmediateSkillEvents` at `4774`, `consumeSkillEvent` at `5051`, `projectileSpawnPositionForEvent` at `5055`, and `consumeSkillEventBatch` at `5156`.
- Status and forced movement: `applyPlayerStatusBuffEvent` at `5638`, `applyEnemyStatusBuff` at `5695`, and `applyForcedMovementEvent` at `5753`.
- Damage application and kill-triggered effects: `applyDamageEventBatch` at `5818`, including direct damage, resource application, kill-triggered follow-up events, drops, progression, combat log, and visual side effects.
- Projectile follow-up suppression and VFX anchoring helpers remain near the tail of App: `hitVfxTargetId`, `targetedEnemyForEvent`, `projectileIdFromEvent`, `shouldSuppressProjectileFollowup`, `isProjectileTickFollowup`, `anchorHitVfxsToTargets`, `anchorProjectilesToTargets`, and `finishCompletedProjectileBody`.

## 5.2 Frontend Skill Runtime Classification

- Pure event builder candidates: projectile, secondary-hit, split-projectile, ignited-hit explosion, chain, module-chain, damage-zone, melee-arc, nova, status payload, hit VFX payload, floating text payload, and forced-movement payload construction can move once elapsed time, roll seeds, VFX key resolution, target helpers, and player-origin inputs are passed explicitly.
- Deterministic helper candidates: damage component payload shaping, hit impact radius, secondary-hit scaling, floating damage component payloads, projectile spread/direction math, projectile id extraction, projectile follow-up keys, VFX anchoring, projectile completion, stable hash/percent, and runtime visual budget caps.
- App-owned side effects: mana spending, cooldown/continuous attack refs, combat logs, scheduled skill queue mutation, active damage-zone refs, projectile arrays, hit VFX/text arrays, enemy array mutation, player runtime mutation, buffs, drops, map progression, pickup, and save/rest/map transitions.
- Intentionally deferred orchestration: `releaseFrontendPlayableSkill`, `hitEnemies`, `consumeSkillEventTimeline`, `consumeSkillEvent`, `consumeSkillEventBatch`, `activeDamageZoneRuntimeTickEvents`, `applyDamageEventBatch`, `applyEnemyStatusBuff`, `applyPlayerStatusBuffEvent`, `applyForcedMovementEvent`, and `processFrontendProjectileImpacts` remain App-owned until pure builders and lifecycle helpers are extracted and covered.
- Extraction order from this classification: move deterministic helper/event-builder families first, then lifecycle helpers, then review dispatcher/consumer boundaries; do not move mutation-heavy consumers solely to reduce App line count.

## 5.3 Existing Smoke Check Ownership

- Current App-owned runtime checks in `webapp/smoke-test.mjs` still slice or inspect `webapp/App.tsx` for projectile impact target anchoring, `anchorHitVfxsToTargets`, `advanceEnemyBuffs`, `consumeSkillEventBatch`, `applyDamageEventBatch`, `applyEnemyStatusBuff`, `releaseFrontendPlayableSkill`, dispatcher routing, projectile builder, chain builder, module-chain builder, damage-zone builder, dynamic damage-zone tick events, forced movement consumer, melee-arc builder, nova builder, `hitEnemies`, `stepGame`, `applyRuntimeMonsterAttacks`, and `syncEnemyVisuals`.
- Checks that should move with future event-builder modules: dispatcher family routing only if dispatcher moves, projectile builder payload tokens, chain/module-chain payload tokens, damage-zone builder payload tokens, melee-arc payload tokens, nova payload tokens, status payload tokens, forced-movement payload construction tokens, hit VFX payload construction, and floating text payload construction.
- Checks that should move with future lifecycle/helper modules: projectile follow-up suppression keys, projectile id extraction, projectile completion, hit VFX anchoring, projectile anchoring, runtime visual budget caps, spread direction helpers, dynamic damage-zone uniqueness/expiration/tick payload helpers, and stable hash/percent helpers.
- Checks that should stay App-owned until a later orchestration task: mana spending, actual release interval, continuous attack refs, timeline scheduling, `consumeSkillEventBatch` side effects, damage application, enemy/player status mutation, forced movement mutation, map-run monster creation, monster skill timeline consumption, pending monster damage-zone queues, repeated zone scheduling, player/enemy runtime refs, and `stepGame`.
- Any moved source check must read the new owning module in the same batch that moves the code; App checks should be reduced to App-owned wiring calls.

## 5.4 Audit Location

- The frontend skill runtime audit for this change is recorded in sections 5.1, 5.2, and 5.3 of this baseline audit before event-builder or consumer code is moved.

## 5.5 Frontend Skill Runtime Audit Verification

- `cmd /c npm run build`: passed. Vite reported the existing large chunk warning.
- `npm test`: passed. `webapp/smoke-test.mjs` reported `WebApp smoke test passed.`
- `openspec validate extract-webapp-runtime-orchestration-from-app --strict`: passed.

## 6.4 Projectile And Chain Payload Preservation

- `webapp/runtime/frontendPlayableSkillEventBuilders.ts` owns projectile event construction tokens for `projectile_spawn`, `projectile_hit`, `hit_vfx`, `floating_text`, `projectile_id`, `projectile_index`, `projectile_count`, `projectile_continues`, positions, velocity, widths, heights, impact radius, lifetime, damage components, forced element payloads, shotgun sequence, and on-kill explosion payloads.
- The same module owns chain payload tokens for `chain_segment`, `segment_id`, `segment_index`, start/end/target positions, segment hit timing, chain damage payloads, and hit VFX keys.
- The same module owns module-chain payload tokens for projectile spawn/impact, corrosive ground `damage_zone`, dynamic tick runtime fields, zone hit events, buff apply payloads, and zone damage components.
- `webapp/App.tsx` now keeps thin adapters that pass explicit dependencies into the runtime builder module and still owns timeline consumption, state mutation, refs, and scheduling.

## 6.5 App-Owned Side Effects Retained

- `consumeSkillEventTimeline`, `consumeSkillEvent`, `consumeSkillEventBatch`, `consumeImmediateSkillEvents`, `consumeScheduledSkillEvents`, `processFrontendProjectileImpacts`, `activeDamageZoneRuntimeTickEvents`, and `applyDamageEventBatch` remain in `webapp/App.tsx`.
- React setters for texts, bolts, enemies, hit VFX, area novas, melee arcs, chain segments, damage zones, player state, combat logs, drops, and map progression remain in `webapp/App.tsx`.
- Runtime refs including scheduled skill events, active damage zones, projectile/damage-zone queues, player/enemy refs, cooldown/continuous attack refs, and boss/monster skill timers remain in `webapp/App.tsx`.
- The extracted builder module returns event arrays only; it does not call setters, mutate refs, write storage, consume timelines, apply damage, or schedule events.

## 6.7 Smoke Ownership Migration

- `webapp/smoke-test.mjs` now reads `webapp/runtime/frontendPlayableSkillEventBuilders.ts`.
- Projectile payload checks use `functionBody(frontendPlayableSkillEventBuilders, "buildFrontendProjectileSkillEvents")`.
- Chain and module-chain payload checks use `functionBody(frontendPlayableSkillEventBuilders, "buildFrontendChainSkillEvents")` and `functionBody(frontendPlayableSkillEventBuilders, "buildFrontendModuleChainSkillEvents")`.
- App checks remain for explicit adapter calls and App-owned side-effect boundaries.

## 6.8 Projectile And Chain Builder Verification

- `cmd /c npm run build`: passed. Vite reported the existing large chunk warning.
- `npm test`: passed. `webapp/smoke-test.mjs` reported `WebApp smoke test passed.`
- Focused builder source check confirmed representative projectile, chain, module-chain, hit VFX, floating text, and follow-up payload tokens remain in `webapp/runtime/frontendPlayableSkillEventBuilders.ts`, with no setter, event-consumer, storage, backend API, `SkillRuntime`, or `CombatSession` matches in that module.
- `openspec validate extract-webapp-runtime-orchestration-from-app --strict`: passed.
- `run.bat` launched the playable WebApp at `http://127.0.0.1:8766/`; logs were stored in `artifacts/logs/runbat-builder-extraction.out.log` and `artifacts/logs/runbat-builder-extraction.err.log`.
- Playable WebApp verification followed title, new save, rest area, map selection, and battle entry in the normal playable path. Screenshot evidence was captured at `artifacts/screenshots/builder-extraction-playable-battle.png`.
- Screenshot observation: the battle view showed `map_001` running, procedural spawn debug information, two canvas elements, and the frontend-run combat feed line for monsters, kills, and drops.
