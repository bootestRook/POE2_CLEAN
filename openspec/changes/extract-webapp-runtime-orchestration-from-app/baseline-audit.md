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
