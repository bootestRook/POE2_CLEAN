import json
import subprocess
import textwrap
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _run_node(script: str) -> dict:
    result = subprocess.run(
        ["node", "-e", textwrap.dedent(script), str(ROOT)],
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=ROOT,
    )
    return json.loads(result.stdout)


TS_LOADER = r"""
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const root = process.argv[1];
const cache = new Map();

function loadTs(file) {
  const resolved = path.resolve(file);
  if (cache.has(resolved)) return cache.get(resolved).exports;
  const source = fs.readFileSync(resolved, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const module = { exports: {} };
  cache.set(resolved, module);
  const localRequire = (specifier) => {
    if (!specifier.startsWith(".")) return require(specifier);
    const candidate = path.resolve(path.dirname(resolved), specifier);
    return loadTs(fs.existsSync(`${candidate}.ts`) ? `${candidate}.ts` : candidate);
  };
  new Function("require", "module", "exports", compiled)(localRequire, module, module.exports);
  return module.exports;
}
"""


def test_battle_map_line_blocker_runtime_samples_null_blocked_diagonal_and_bounds() -> None:
    payload = _run_node(
        TS_LOADER
        + r"""
        const runtime = loadTs(path.join(root, "webapp", "runtime", "battleMapLineBlockerRuntime.ts"));
        const map = {
          meta: { grid_size: 10 },
          gridWidth: 5,
          gridHeight: 5,
          walkableGrid: Array.from({ length: 5 }, () => Array(5).fill(true))
        };
        map.walkableGrid[1][2] = false;
        map.walkableGrid[2][2] = false;
        const unblocked = runtime.hasUnblockedBattleLine(map, { x: 5, y: 5 }, { x: 15, y: 5 });
        const horizontalBlocker = runtime.firstBattleLineBlocker(map, { x: 5, y: 15 }, { x: 45, y: 15 });
        const diagonalBlocker = runtime.firstBattleLineBlocker(map, { x: 5, y: 5 }, { x: 45, y: 45 });
        const outOfBoundsBlocker = runtime.firstBattleLineBlocker(map, { x: 45, y: 45 }, { x: 65, y: 45 });
        const nullMapClip = runtime.clipBattleLineToBlocker(null, { x: 0, y: 0 }, { x: 100, y: 0 });
        console.log(JSON.stringify({
          unblocked,
          horizontalBlocked: Boolean(horizontalBlocker),
          horizontalClipBeforeWall: horizontalBlocker && horizontalBlocker.point.x < 20,
          diagonalBlocked: Boolean(diagonalBlocker),
          outOfBoundsBlocked: Boolean(outOfBoundsBlocker),
          nullMapBlocked: nullMapClip.blocked,
          nullMapX: nullMapClip.point.x
        }));
        """
    )

    assert payload == {
        "unblocked": True,
        "horizontalBlocked": True,
        "horizontalClipBeforeWall": True,
        "diagonalBlocked": True,
        "outOfBoundsBlocked": True,
        "nullMapBlocked": False,
        "nullMapX": 100,
    }


def test_blocked_player_projectile_and_module_chain_do_not_emit_damage() -> None:
    payload = _run_node(
        TS_LOADER
        + r"""
        const runtime = loadTs(path.join(root, "webapp", "runtime", "frontendPlayableSkillEventBuilders.ts"));
        const skill = {
          active_gem_instance_id: "wall_test",
          skill_package_id: "wall_test",
          skill_template_id: "wall_test",
          runtime_params: { projectile_speed: 1000 },
          final_damage: 10,
          damage_type: "fire",
          area_multiplier: 1,
          hit: {}
        };
        const caster = { x: 0, y: 0 };
        const target = { id: 1, x: 100, y: 0, hp: 100 };
        const makeEvent = (skill, type, target, position, direction, amount, damageType, payload = {}, durationMs = 0, delayMs = 0) => ({
          event_id: `${type}.${payload.projectile_id ?? payload.zone_id ?? "event"}`,
          type,
          timestamp_ms: 0,
          source_entity: "player",
          target_entity: target ? String(target.id) : "",
          position,
          direction,
          delay_ms: delayMs,
          duration_ms: durationMs,
          amount,
          damage_type: damageType,
          skill_instance_id: skill.active_gem_instance_id,
          vfx_key: String(payload.vfx_key ?? ""),
          sfx_key: "",
          reason_key: "",
          payload
        });
        const deps = {
          convertedDamageType: () => "fire",
          damagePayloadComponents: () => ({ fire: 10 }),
          forcedElementDamageType: () => "fire",
          frontendDamageEventsForTarget: (skill, target, position, direction, amount, hit, payload = {}, delayMs = 0) => [
            makeEvent(skill, "damage", target, position, direction, amount, "fire", payload, 0, delayMs)
          ],
          frontendRuntimeRange: () => 520,
          frontendSkillEvent: makeEvent,
          frontendSkillVfxKey: () => "test_vfx",
          clipProjectileLine: () => ({ blocked: true, point: { x: 50, y: 0 } }),
          frontendUniqueTargetsByDistance: () => [],
          projectileSpawnWorldPosition: () => caster,
          projectileSpreadDirections: () => [{ x: 1, y: 0 }],
          rotateDirection: (direction) => direction,
          stablePercent: () => 50,
          buildFrontendSecondaryHitEvents: () => [],
          buildFrontendSplitProjectileEvents: () => [],
          buildFrontendIgnitedHitExplosionEvents: () => [],
          frontendScaledSkillConfigDamageAmount: (_skill, amount) => amount,
          frontendSkillDotDamageMultiplier: () => 1
        };
        const projectileEvents = runtime.buildFrontendProjectileSkillEvents(skill, caster, [target], [target], deps, 0);
        const moduleSkill = {
          ...skill,
          runtime_params: {
            modules: [
              { id: "projectile", type: "projectile", params: { projectile_speed: 1000, travel_time_ms: 100 } },
              { id: "zone", type: "damage_zone", params: { radius: 80, tick_interval_ms: 1000, duration_ms: 1000 } }
            ]
          }
        };
        const moduleEvents = runtime.buildFrontendModuleChainSkillEvents(moduleSkill, caster, [target], [target], deps, 0);
        console.log(JSON.stringify({
          projectileTypes: projectileEvents.map((event) => event.type),
          projectileBlocked: projectileEvents[0].payload.wall_blocked === true,
          projectileEndX: projectileEvents[0].payload.target_world_position.x,
          moduleTypes: moduleEvents.map((event) => event.type),
          moduleBlocked: moduleEvents[0].payload.wall_blocked === true,
          moduleEndX: moduleEvents[0].payload.target_world_position.x
        }));
        """
    )

    assert payload == {
        "projectileTypes": ["projectile_spawn"],
        "projectileBlocked": True,
        "projectileEndX": 50,
        "moduleTypes": ["projectile_spawn"],
        "moduleBlocked": True,
        "moduleEndX": 50,
    }


def test_projectile_spawn_consumer_clips_boss_visual_and_dynamic_tick_runtime() -> None:
    payload = _run_node(
        TS_LOADER
        + r"""
        const runtime = loadTs(path.join(root, "webapp", "runtime", "skillEventConsumerRuntime.ts"));
        const refs = {
          scheduledSkillEvents: { current: [] },
          activeDamageZones: { current: [] },
          enemiesStateRef: { current: [] },
          playerStateRef: { current: { x: 100, y: 0, hp: 100 } },
          activePlayerBuffsRef: { current: [] }
        };
        let bolts = [];
        let registered = null;
        const setters = {
          setChainSegments: () => undefined,
          setDamageZones: () => undefined,
          setHitVfxs: () => undefined,
          setAreaNovas: () => undefined,
          setMeleeArcs: () => undefined,
          setTexts: () => undefined,
          setBolts: (update) => { bolts = typeof update === "function" ? update(bolts) : update; }
        };
        const deps = {
          refs,
          visualSetters: setters,
          consumeSkillEventBatch: () => undefined,
          updateActiveDamageZones: () => 0,
          applyChannelMovementBuff: () => undefined,
          applyDamageEventBatch: () => undefined,
          applyEnemyBuffApplyEvent: () => undefined,
          applyEnemyStatusBuff: () => undefined,
          applyForcedMovementEvent: () => undefined,
          applyPlayerStatusBuffEvent: () => undefined,
          activeDamageZoneRuntimeTickEvents: () => [],
          advanceActiveDamageZoneRuntime: () => ({ active: false, zone: null, events: [] }),
          capRuntimeVisualBudget: (items) => items,
          clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
          damageDisplayKey: () => "",
          damageEventAmountAgainstEnemy: (event) => Number(event.amount ?? 0),
          damageNumberText: (amount) => String(amount),
          finishCompletedProjectileBody: (bolt) => bolt,
          floatingTextDamageComponents: () => [],
          hitVfxTargetId: () => undefined,
          isFrontendPlayerStatusTarget: () => false,
          isProjectileTickFollowup: () => false,
          liveMonsterProjectileTrajectoryForEvent: () => null,
          liveOrbitCenter: () => ({ x: 0, y: 0 }),
          liveOrbitPosition: () => ({ x: 0, y: 0 }),
          normalizedVfxScale: () => 1,
          normalizedWorldDirection: (point) => {
            const length = Math.hypot(point.x, point.y) || 1;
            return { x: point.x / length, y: point.y / length };
          },
          playerAttachedAreaKey: () => null,
          playerAttachedAreaPosition: () => null,
          pointFromUnknown: (value) => value && Number.isFinite(Number(value.x)) && Number.isFinite(Number(value.y)) ? { x: Number(value.x), y: Number(value.y) } : null,
          projectileFollowupKey: () => "",
          projectileIdFromEvent: (event) => event.payload && event.payload.projectile_id,
          projectileSpawnPositionForEvent: (event) => event.payload.spawn_world_position,
          projectileTargetFollowupKey: () => "",
          projectileVfxKind: () => null,
          clipProjectileLine: () => ({ blocked: true, point: { x: 50, y: 0 } }),
          registerActiveDamageZone: (event) => { registered = event; },
          shapeEffectsFromUnknown: () => [],
          shouldSuppressProjectileFollowup: () => false,
          stablePercent: () => 100,
          targetedEnemyForEvent: () => null,
          uniqueDamageZonesByZoneId: (items) => items,
          MAX_RUNTIME_AREA_VFX: 50,
          MAX_RUNTIME_FLOATING_TEXT: 50,
          MAX_RUNTIME_HIT_VFX: 50,
          MAX_RUNTIME_PROJECTILE_VISUALS: 50,
          PENETRATING_SHOT_IMPACT_DURATION_MS: 180,
          PROJECTILE_BODY_EXIT_FADE_DURATION: 0,
          nextAreaNovaId: { current: 1 },
          nextBoltId: { current: 1 },
          nextChainSegmentId: { current: 1 },
          nextDamageZoneId: { current: 1 },
          nextHitVfxId: { current: 1 },
          nextMeleeArcId: { current: 1 },
          nextPlayerBuffId: { current: 1 },
          nextTextId: { current: 1 },
          setRuntimePlayerBuffs: () => undefined
        };
        const consumer = runtime.createSkillEventConsumerRuntime(deps);
        consumer.consumeSkillEventBatch([{
          event_id: "boss_projectile.spawn",
          type: "projectile_spawn",
          timestamp_ms: 0,
          source_entity: "boss",
          target_entity: "player",
          position: { x: 0, y: 0 },
          direction: { x: 1, y: 0 },
          delay_ms: 0,
          duration_ms: 1000,
          amount: null,
          damage_type: "fire",
          skill_instance_id: "boss_projectile",
          vfx_key: "boss_projectile",
          sfx_key: "",
          reason_key: "",
          payload: {
            projectile_id: "boss_projectile.1",
            spawn_world_position: { x: 0, y: 0 },
            target_world_position: { x: 100, y: 0 },
            expire_world_position: { x: 100, y: 0 },
            direction_world: { x: 1, y: 0 },
            projectile_speed: 100,
            lifetime_ms: 1000,
            can_hit_player: true,
            dynamic_tick_runtime: true
          }
        }]);
        console.log(JSON.stringify({
          targetX: bolts[0].targetX,
          duration: bolts[0].duration,
          canHitPlayer: bolts[0].canHitPlayer,
          registeredEndX: registered.payload.expire_world_position.x,
          registeredLifetime: registered.payload.lifetime_ms,
          registeredBlocked: registered.payload.wall_blocked
        }));
        """
    )

    assert payload == {
        "targetX": 50,
        "duration": 0.5,
        "canHitPlayer": True,
        "registeredEndX": 50,
        "registeredLifetime": 500,
        "registeredBlocked": True,
    }


def test_app_and_enemy_runtime_wire_wall_queries_into_aggro_targeting_and_projectiles() -> None:
    app_source = (ROOT / "webapp" / "App.tsx").read_text(encoding="utf-8")
    enemy_source = (ROOT / "webapp" / "runtime" / "enemyRuntime.ts").read_text(encoding="utf-8")
    consumer_source = (ROOT / "webapp" / "runtime" / "skillEventConsumerRuntime.ts").read_text(encoding="utf-8")

    assert "hasUnblockedBattleLine(battleMap, source, enemy)" in app_source
    assert "hasUnblockedBattleLine(battleMap, center, enemy)" in app_source
    assert "hasUnblockedBattleLine(battleMap, origin, enemy)" in app_source
    assert "candidate.skill.module === \"monster_projectile\" && !hasUnblockedBattleLine(battleMap, enemy, playerNow)" in app_source
    assert "bossCanTargetPlayer(boss: Enemy, range: number)" in app_source
    assert "hasUnblockedBattleLine(battleMap, boss, playerStateRef.current)" in app_source
    assert "clipProjectileLine: (from, to) => clipBattleLineToBlocker(battleMap, from, to)" in app_source
    assert "enemy.spawnPlanSourceId && hasUnblockedBattleLine(map, enemy, player)" in enemy_source
    assert "sourceCanSeePlayer = distance(source, player) <= source.aggroRadius && hasUnblockedBattleLine(map, source, player)" in enemy_source
    assert "return hasUnblockedBattleLine(map, from, to);" in enemy_source
    assert "runtimeProjectileEvent" in consumer_source
    assert "wall_blocked: true" in consumer_source
