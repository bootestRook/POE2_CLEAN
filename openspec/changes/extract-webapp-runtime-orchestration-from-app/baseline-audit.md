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

## 7.1-7.4 Damage-Zone, Melee, Nova, Status, And Movement Builder Ownership

- `webapp/runtime/frontendPlayableSkillEventBuilders.ts` now also owns `buildFrontendDamageZoneSkillEvents`, `buildFrontendMeleeArcSkillEvents`, and `buildFrontendNovaSkillEvents`.
- Damage-zone builder ownership now covers zone ids, origin policy, radius, ring width, tick interval/count, duration, max hit fields, dynamic tick flags, channel stack/radius scale fields, damage components, reverse pull `forced_movement` payloads, static tick damage-zone hits, and aggravation `status_apply` payloads.
- Melee-arc builder ownership now covers arc radius/angle, slash VFX key, hit timing, origin/direction payloads, slash-trigger roll result, flame-wave arc payloads, sequence fields, and shotgun falloff fields.
- Nova builder ownership now covers area spawn id, center policy, radius, ring width, expand duration, on-kill recast fields, suppress-hit-VFX flag, and per-target damage payloads.
- `webapp/App.tsx` keeps thin adapters that pass explicit dependencies into these builders and still owns active damage-zone refs, scheduled event queues, dynamic tick consumption, status application mutation, forced-movement mutation, player/enemy state mutation, combat logs, drops, and map progression.

## 7.6-7.7 Area Builder Verification

- `cmd /c npm run build`: passed. Vite reported the existing large chunk warning.
- `npm test`: passed. `webapp/smoke-test.mjs` reported `WebApp smoke test passed.`
- Focused builder source check confirmed representative damage-zone, damage-zone hit, melee-arc, area-spawn, status-apply, forced-movement, movement-scope, channel, flame-wave, and on-kill recast payload tokens live in `webapp/runtime/frontendPlayableSkillEventBuilders.ts`, with no setter, event-consumer, storage, backend API, `SkillRuntime`, or `CombatSession` matches in that module.
- `openspec validate extract-webapp-runtime-orchestration-from-app --strict`: passed.
- `run.bat` launched the playable WebApp at `http://127.0.0.1:8766/`; logs were stored in `artifacts/logs/runbat-area-builder-extraction.out.log` and `artifacts/logs/runbat-area-builder-extraction.err.log`.
- Playable WebApp verification followed title, new save, rest area, map selection, and battle entry in the normal playable path. Screenshot evidence was captured at `artifacts/screenshots/area-builder-extraction-playable-battle.png`.
- Screenshot observation: the battle view showed `map_001` running, procedural spawn debug information, two canvas elements, and the frontend-run combat feed line for monsters, kills, and drops.

## 8.1-8.5 Dispatcher Boundary

- `buildFrontendPlayableSkillEvents` moved into `webapp/runtime/frontendPlayableSkillEventBuilders.ts`.
- The moved dispatcher receives explicit family builder callbacks plus `frontendDamageEventsForTarget`, `isProjectileSkillTemplate`, and `skillHasProjectileDamageZoneModules`.
- The dispatcher preserves family resolution through `frontendPlayableSkillRuntimeFamilyForBehavior`, module-chain precedence through the projectile damage-zone module check, projectile/chain/damage-zone/melee/nova routing, and direct-hit fallback event creation.
- `webapp/App.tsx` keeps `releaseFrontendPlayableSkill`, guard runtime handling, target collection, mana spending, cooldown and continuous-attack runtime ownership, event timeline consumption, scheduled queues, combat logs, and all state mutation.
- `webapp/smoke-test.mjs` now reads dispatcher route tokens from `webapp/runtime/frontendPlayableSkillEventBuilders.ts` and checks that App calls `buildFrontendPlayableSkillEventsFromRuntime`.

## 8.6 Dispatcher Verification

- `cmd /c npm run build`: passed. Vite reported the existing large chunk warning.
- `npm test`: passed. `webapp/smoke-test.mjs` reported `WebApp smoke test passed.`
- Focused dispatcher check confirmed family routing tokens live in the runtime builder owner and that release, timeline consumption, state mutation, storage, and backend API tokens were not introduced into the dispatcher module.
- `openspec validate extract-webapp-runtime-orchestration-from-app --strict`: passed.
- `run.bat` launched the playable WebApp at `http://127.0.0.1:8766/`; logs were stored in `artifacts/logs/runbat-dispatcher-extraction.out.log` and `artifacts/logs/runbat-dispatcher-extraction.err.log`.
- Playable WebApp verification followed title, new save, rest area, map selection, battle entry, and hotkey skill attempts in the normal playable path. Screenshot evidence was captured at `artifacts/screenshots/dispatcher-extraction-playable-battle.png`.
- Screenshot/log observation: the battle view showed two canvas elements, procedural spawn debug information, automatic skill releases, direct hit/critical hit log entries, a kill entry, and a dropped item entry.

## 9.1-9.6 Enemy Damage Helper Ownership

- `webapp/runtime/enemyDamageRuntime.ts` now owns deterministic enemy damage/status/resource helpers.
- Moved helpers include enemy status apply resistance, enemy status duration multiplier, control status type classification, event damage amount scaling, double damage roll evaluation, damage-over-time aggravation multiplier, armor/resistance/final mitigation scaling, block/avoidance checks, block damage reduction, enemy energy-shield-before-life resource application, enemy resistance lookup, numeric stat lookup, and damage-taken status matching.
- `webapp/App.tsx` now imports these helpers and passes `stablePercent` plus an elemental ailment predicate explicitly where deterministic rolls or frontend status classification are required.
- `applyDamageEventBatch`, `applyEnemyStatusBuff`, enemy array mutation, kill-trigger processing, drop progression, war-intent gain, combat logs, visual queues, and React state mutation remain App-owned.
- `webapp/smoke-test.mjs` reads `webapp/runtime/enemyDamageRuntime.ts` for damage formula, armor, resistance, block, avoidance, status damage taken, energy shield, and life resource tokens, and guards the module against App imports, setters, combat logs, drops, storage, and backend API calls.

## 9.7 Enemy Damage Helper Verification

- `cmd /c npm run build`: passed. Vite reported the existing large chunk warning.
- `npm test`: passed. `webapp/smoke-test.mjs` reported `WebApp smoke test passed.`
- Focused enemy damage check confirmed representative damage component, double damage, armor, mitigation, resistance, block, avoidance, status, energy-shield, and life resource tokens live in `webapp/runtime/enemyDamageRuntime.ts`, with no App mutation, storage, or backend API tokens in that module.
- `openspec validate extract-webapp-runtime-orchestration-from-app --strict`: passed.
- `run.bat` launched the playable WebApp at `http://127.0.0.1:8766/`; logs were stored in `artifacts/logs/runbat-enemy-damage-helper-extraction.out.log` and `artifacts/logs/runbat-enemy-damage-helper-extraction.err.log`.
- Playable WebApp verification followed title, new save, rest area, map selection, battle entry, and repeated skill attempts in the normal playable path. Screenshot evidence was captured at `artifacts/screenshots/enemy-damage-helper-extraction-playable-battle.png`.
- Screenshot/log observation: the battle view showed two canvas elements, procedural spawn debug information, and repeated skill damage log entries in the playable battle path.

## 10.1-10.6 Player Resource Helper Ownership

- `webapp/runtime/playerDamageRuntime.ts` now also owns deterministic player resource helpers for energy-shield recharge speed/delay, life and mana regeneration, runtime resource normalization, energy-shield recharge application, block recovery, and hit recovery.
- App wrappers still own `energyShieldRechargeReadyMs`, block recovery ready refs, life/shield return ready refs, player React state mutation, defeat handling, floating text, and combat logs.
- Existing incoming damage helpers in `playerDamageRuntime.ts` continue to own mana-before-life, energy-shield-before-life, armor/resistance mitigation, block reduction, crit, double damage, evasion, and result shaping.
- `webapp/smoke-test.mjs` compiles and executes `playerDamageRuntime.ts` and now covers regeneration, recharge delay, recharge speed, block recovery gating, hit recovery, mana-before-life, energy-shield-before-life, life damage, and resource normalization.

## 10.7 Player Resource Helper Verification

- `cmd /c npm run build`: passed. Vite reported the existing large chunk warning.
- `npm test`: passed. `webapp/smoke-test.mjs` reported `WebApp smoke test passed.`
- Focused player resource check confirmed representative regeneration, recharge, block recovery, hit recovery, resource normalization, mana-before-life, energy-shield, and life ordering behavior through executable smoke cases.
- `openspec validate extract-webapp-runtime-orchestration-from-app --strict`: passed.
- `run.bat` launched the playable WebApp at `http://127.0.0.1:8766/`; logs were stored in `artifacts/logs/runbat-player-resource-helper-extraction.out.log` and `artifacts/logs/runbat-player-resource-helper-extraction.err.log`.
- Playable WebApp verification followed title, new save, rest area, map selection, battle entry, movement, and repeated skill attempts in the normal playable path. Screenshot evidence was captured at `artifacts/screenshots/player-resource-helper-extraction-playable-battle.png`.
- Screenshot/log observation: the battle view showed two canvas elements, procedural spawn debug information, automatic skill releases, multiple kill entries, and a dropped item entry.

## 11.1-11.6 Projectile Lifecycle Helper Ownership

- `webapp/runtime/projectileLifecycleRuntime.ts` now owns deterministic projectile lifecycle helpers for projectile spawn offsets, spread angle helpers, direction rotation, projectile id extraction, follow-up keys, follow-up suppression, hit VFX target ids, target lookup, hit VFX anchoring, projectile target anchoring, completed projectile body fade, and runtime visual budget caps.
- `webapp/App.tsx` still owns projectile spawn scheduling, active projectile arrays, `consumeSkillEventBatch`, damage application, projected HP maps, visual queues, and React state mutation.
- Projectile anchoring now receives `usesCanvasProjectileVfx` as an explicit dependency, and completed projectile body fade receives `PROJECTILE_BODY_EXIT_FADE_DURATION` explicitly.
- `webapp/smoke-test.mjs` now reads projectile lifecycle invariants from `webapp/runtime/projectileLifecycleRuntime.ts` and guards that module against App imports, setters, event consumption, damage calculation, storage, and backend API calls.

## 11.7 Projectile Lifecycle Verification

- `cmd /c npm run build`: passed. Vite reported the existing large chunk warning.
- `npm test`: passed. `webapp/smoke-test.mjs` reported `WebApp smoke test passed.`
- Focused lifecycle checks confirmed follow-up suppression, projectile target anchoring, hit VFX anchoring, completed projectile body fade, spread direction, rotation, and visual budget tokens live in `webapp/runtime/projectileLifecycleRuntime.ts`.
- `openspec validate extract-webapp-runtime-orchestration-from-app --strict`: passed.
- `run.bat` launched the playable WebApp at `http://127.0.0.1:8766/`; logs were stored in `artifacts/logs/runbat-projectile-lifecycle-extraction.out.log` and `artifacts/logs/runbat-projectile-lifecycle-extraction.err.log`.
- Playable WebApp verification followed title, new save, rest area, map selection, battle entry, and repeated skill attempts in the normal playable path. Screenshot evidence was captured at `artifacts/screenshots/projectile-lifecycle-extraction-playable-battle.png`.
- Screenshot/log observation: the battle view showed two canvas elements, procedural spawn debug information, automatic skill release, and multiple kill entries.

## 12.1-12.6 Damage-Zone Lifecycle Helper Ownership

- `webapp/runtime/damageZoneLifecycleRuntime.ts` now owns deterministic active damage-zone helper code for runtime creation, zone id replacement, zone advancement and expiration, dynamic tick event construction, rectangle containment, and tick progress math.
- The moved dynamic tick builder receives explicit player, enemy, target-selection, damage-text, stable-roll, and knockback timing inputs. It returns tick events plus an updated zone snapshot instead of mutating App refs.
- Dynamic tick payload ownership now covers `damage_zone_hit`, `damage`, optional `hit_vfx`, floating text, knockback `forced_movement`, dynamic buff apply, aggravation `status_apply`, zone ids, tick timing fields, damage components, origin/impact/target positions, and hit counters.
- `webapp/App.tsx` still owns `activeDamageZones.current`, scheduled event queue mutation, `consumeSkillEventBatch`, player/enemy refs, React visual state mutation, damage application, status application, forced-movement mutation, combat logs, drops, and map progression.
- `webapp/smoke-test.mjs` now reads damage-zone lifecycle invariants from `webapp/runtime/damageZoneLifecycleRuntime.ts`, guards the module against App refs, setters, event consumption, storage, and backend API calls, and compiles/executes representative lifecycle cases.

## 12.7 Damage-Zone Lifecycle Verification

- `cmd /c npm run build`: passed. Vite reported the existing large chunk warning.
- `npm test`: passed. `webapp/smoke-test.mjs` reported `WebApp smoke test passed.` The focused damage-zone lifecycle smoke compiled and executed `webapp/runtime/damageZoneLifecycleRuntime.ts` and covered unique zone replacement, expiration, dynamic tick generation, movement/status payloads, rectangle containment, hit counters, and tick progress.
- `openspec validate extract-webapp-runtime-orchestration-from-app --strict`: passed.
- `run.bat` launched the playable WebApp at `http://127.0.0.1:8766/`; logs were stored in `artifacts/logs/runbat-damage-zone-lifecycle-extraction.out.log` and `artifacts/logs/runbat-damage-zone-lifecycle-extraction.err.log`.
- Playable WebApp verification followed title, new save, rest area, map selection through the rest-area `王阳` interaction, map entry, and battle entry in the normal playable path. Screenshot evidence was captured at `artifacts/screenshots/damage-zone-lifecycle-extraction-playable-battle.png`.
- Screenshot/log observation: the battle view showed `map_001` running, two canvas elements, procedural spawn debug information, and the frontend-run combat feed line that monsters, kills, and drops are handled by the frontend.
- Root artifact check found no root-level screenshots, logs, traces, or generated test output files.

## 13.1-13.6 Event Consumer Boundary Review

- Reviewed `consumeSkillEventTimeline`, `consumeScheduledSkillEvents`, `consumeSkillEventBatch`, `updateActiveDamageZones`, and `applyDamageEventBatch` after helper extraction.
- Decision: no focused event consumer adapter was introduced in this batch. The remaining event consumer layer still couples scheduled queue mutation, active damage-zone queue mutation, projected enemy HP, projectile follow-up suppression sets, projectile completion, status application, forced movement, visual queue setters, damage batching, kill-trigger events, drop spawning, combat logs, and React state mutation.
- Extracting that layer now would create a wide callback/ref/setter adapter with hidden ordering risk rather than a smaller owner. It would also make it easier to accidentally create a second gameplay path for target filtering, damage acceptance, status application, or kill/drop progression.
- Responsibilities intentionally remaining App-owned: `scheduledSkillEvents.current`, `activeDamageZones.current`, `consumeSkillEventTimeline`, `consumeScheduledSkillEvents`, `consumeSkillEventBatch`, `activeDamageZoneRuntimeTickEvents` adapter, `applyDamageEventBatch`, player/enemy status application, forced movement application, visual queue setters, damage/kill/drop mutation, and on-kill event recursion through the same playable consumer.
- `webapp/smoke-test.mjs` now guards the retained boundary by checking that App still owns timeline scheduling, scheduled consumption, active-zone tick consumption, projected damage gating, projectile follow-up state, status/forced movement application, visual setters, damage batch application, kill/drop side effects, and on-kill recursive consumption.

## 13.7 Event Consumer Boundary Verification

- `cmd /c npm run build`: passed. Vite reported the existing large chunk warning.
- `npm test`: passed. `webapp/smoke-test.mjs` reported `WebApp smoke test passed.` The focused event consumer checks confirmed App intentionally retains timeline queues, scheduled event consumption, active-zone tick consumption, projected projectile/damage gating, status/forced movement side effects, visual setters, damage batching, kill/drop side effects, and on-kill recursive consumption.
- `openspec validate extract-webapp-runtime-orchestration-from-app --strict`: passed.
- `run.bat` launched the playable WebApp at `http://127.0.0.1:8766/`; logs were stored in `artifacts/logs/runbat-event-consumer-boundary-review.out.log` and `artifacts/logs/runbat-event-consumer-boundary-review.err.log`.
- Playable WebApp verification followed title, new save, rest area, map selection through the rest-area `王阳` interaction, and battle entry in the normal playable path. Screenshot evidence was captured at `artifacts/screenshots/event-consumer-boundary-review-playable-battle.png`.
- Screenshot/log observation: the battle view showed two canvas elements, a dropped item (`Lv3 敏捷胸甲`), procedural spawn debug information, automatic skill releases, kill entries, and monster attack log entries in the frontend-run playable path.
- Root artifact check found no root-level screenshots, logs, traces, or generated test output files.
