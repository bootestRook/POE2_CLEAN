import type { Enemy } from "../types/enemyTypes";
import type { PlayerRuntimeState, SkillEvent } from "../types/combatRuntimeTypes";
import type { SkillPreview } from "../types/skillPreviewTypes";
import { clamp, distance, guideDirection } from "../utils/math2d";

export type FrontendPlayableSkillPoint = { x: number; y: number };

export type FrontendPlayableSkillEventBuilderContext = {
  elapsedMs: number;
  player: PlayerRuntimeState;
  enemies: readonly Enemy[];
};

export type FrontendPlayableSkillEventBuilderResult = {
  events: SkillEvent[];
};

export type FrontendPlayableSkillFamilyBuilder = (
  skill: SkillPreview,
  caster: PlayerRuntimeState,
  initialTargets: readonly Enemy[],
  currentEnemies: readonly Enemy[],
  context: FrontendPlayableSkillEventBuilderContext
) => FrontendPlayableSkillEventBuilderResult;

export type FrontendPlayableSkillEventFactory = (
  skill: SkillPreview,
  type: SkillEvent["type"],
  target: Enemy | null,
  position: FrontendPlayableSkillPoint,
  direction: FrontendPlayableSkillPoint,
  amount: number | null,
  damageType: string,
  payload?: Record<string, unknown>,
  durationMs?: number,
  delayMs?: number
) => SkillEvent;

export type FrontendProjectileSkillEventBuilderDeps = {
  convertedDamageType: (skill: SkillPreview, hitConfig?: Record<string, unknown>) => string;
  damagePayloadComponents: (skill: SkillPreview, amount: number, damageType: string, hitConfig?: Record<string, unknown>) => Record<string, number>;
  forcedElementDamageType: (skill: SkillPreview, timestampMs: number) => string;
  frontendDamageEventsForTarget: (
    skill: SkillPreview,
    target: Enemy,
    position: FrontendPlayableSkillPoint,
    direction: FrontendPlayableSkillPoint,
    amount: number,
    hitConfig?: Record<string, unknown>,
    payload?: Record<string, unknown>,
    delayMs?: number
  ) => SkillEvent[];
  frontendRuntimeRange: (skill: SkillPreview, fallback: number) => number;
  frontendSkillEvent: FrontendPlayableSkillEventFactory;
  frontendSkillVfxKey: (skill: SkillPreview, role: "cast" | "projectile" | "hit" | "zone" | "segment", fallback?: unknown) => string;
  frontendUniqueTargetsByDistance: (
    current: Enemy[],
    origin: FrontendPlayableSkillPoint,
    radius: number,
    maxTargets: number,
    excludeIds?: Set<number>
  ) => Enemy[];
  projectileSpawnWorldPosition: (player: FrontendPlayableSkillPoint, runtimeParams: Record<string, unknown>) => FrontendPlayableSkillPoint;
  projectileSpreadDirections: (
    baseDirection: FrontendPlayableSkillPoint,
    projectileCount: number,
    spreadAngleDeg?: number,
    angleStepDeg?: number
  ) => FrontendPlayableSkillPoint[];
  rotateDirection: (direction: FrontendPlayableSkillPoint, angleDeg: number) => FrontendPlayableSkillPoint;
  stablePercent: (seed: string) => number;
  buildFrontendSecondaryHitEvents: (
    skill: SkillPreview,
    triggerTarget: Enemy,
    triggerPosition: FrontendPlayableSkillPoint,
    direction: FrontendPlayableSkillPoint,
    current: Enemy[],
    triggerDelayMs?: number
  ) => SkillEvent[];
  buildFrontendSplitProjectileEvents: (
    skill: SkillPreview,
    triggerTarget: Enemy,
    triggerPosition: FrontendPlayableSkillPoint,
    direction: FrontendPlayableSkillPoint,
    current: Enemy[],
    parentProjectileId: string,
    triggerDelayMs?: number
  ) => SkillEvent[];
  buildFrontendIgnitedHitExplosionEvents: (
    skill: SkillPreview,
    triggerTarget: Enemy,
    triggerPosition: FrontendPlayableSkillPoint,
    direction: FrontendPlayableSkillPoint,
    current: Enemy[],
    triggerDelayMs?: number
  ) => SkillEvent[];
};

export function buildFrontendProjectileSkillEvents(
  skill: SkillPreview,
  caster: PlayerRuntimeState,
  initialTargets: Enemy[],
  current: Enemy[],
  deps: FrontendProjectileSkillEventBuilderDeps,
  elapsedMs: number
) {
  const params = skill.runtime_params ?? {};
  const events: SkillEvent[] = [];
  const timestampMs = Math.round(elapsedMs);
  const projectileCount = Math.max(1, Math.round(Number(params.projectile_count ?? skill.projectile_count ?? 1)));
  const allowSameTargetHits = Boolean(params.allow_same_target_projectile_hits);
  const targetPolicy = String(params.target_policy ?? "");
  const forcedElements = Array.isArray(params.forced_element_types) ? params.forced_element_types.map(String) : [];
  const forcedElement = forcedElements.length > 0 ? deps.forcedElementDamageType(skill, timestampMs) : null;
  const burstIntervalMs = Math.max(0, Number(params.burst_interval_ms ?? 0));
  const targetPool = targetPolicy === "nearest_unique_enemy"
    ? deps.frontendUniqueTargetsByDistance(current, caster, deps.frontendRuntimeRange(skill, 520), projectileCount)
    : initialTargets;
  const firstTarget = targetPool[0] ?? initialTargets[0];
  const baseDirection = guideDirection(caster, firstTarget);
  const spreadDirections = deps.projectileSpreadDirections(baseDirection, projectileCount, Number(params.spread_angle_deg ?? 0), Number(params.angle_step ?? 0));
  const hitSequences = new Map<number, number>();

  for (let index = 0; index < projectileCount; index += 1) {
    const target = allowSameTargetHits
      ? (targetPool[index % targetPool.length] ?? firstTarget)
      : (targetPool[index] ?? firstTarget);
    if (!target) continue;
    const spawn = deps.projectileSpawnWorldPosition(caster, params);
    const directDirection = targetPolicy === "nearest_unique_enemy" || targetPolicy === "random_enemy"
      ? guideDirection(spawn, target)
      : (spreadDirections[index] ?? baseDirection);
    const jitter = Number(params.random_angle_jitter_deg ?? 0);
    const jitterRoll = jitter > 0 ? deps.stablePercent(`${skill.active_gem_instance_id}:${timestampMs}:${index + 1}:angle_jitter`) / 100 : 0.5;
    const direction = jitter > 0 ? deps.rotateDirection(directDirection, (jitterRoll * 2 - 1) * jitter) : directDirection;
    const projectileDelayMs = index * burstIntervalMs;
    const projectileId = `${skill.active_gem_instance_id}.projectile.${timestampMs}.${index + 1}`;
    const sameTargetSequence = hitSequences.get(target.id) ?? 0;
    hitSequences.set(target.id, sameTargetSequence + 1);
    const shotgunCoeff = Number(params.shotgun_falloff_coeff ?? 0);
    const damageScale = sameTargetSequence > 0 && shotgunCoeff > 0 ? 1 - shotgunCoeff : 1;
    const damageType = forcedElement ?? deps.convertedDamageType(skill, skill.hit as Record<string, unknown>);
    const amount = Math.max(0, Number(skill.final_damage ?? 0)) * damageScale;
    const hitPosition = { x: target.x, y: target.y };
    const sustainedTicks = Boolean(params.sustained_ticks);
    const lifetimeMs = Math.max(
      Number(params.min_duration_ms ?? 80),
      Number(params.duration_ms ?? params.travel_time_ms ?? Math.min(Number(params.max_duration_ms ?? 2200), distance(spawn, hitPosition) / Math.max(1, Number(params.projectile_speed ?? 600)) * 1000))
    );
    const expirePosition = {
      x: spawn.x + direction.x * Number(params.max_distance ?? distance(spawn, hitPosition)),
      y: spawn.y + direction.y * Number(params.max_distance ?? distance(spawn, hitPosition))
    };
    events.push(deps.frontendSkillEvent(skill, "projectile_spawn", target, spawn, direction, null, damageType, {
      vfx_key: deps.frontendSkillVfxKey(skill, "projectile"),
      projectile_id: projectileId,
      projectile_index: index + 1,
      projectile_count: projectileCount,
      target_world_position: sustainedTicks ? expirePosition : hitPosition,
      expire_world_position: sustainedTicks ? expirePosition : hitPosition,
      spawn_world_position: spawn,
      spawn_policy: "caster_current_position",
      vfx_spawn_policy: "caster_current_position",
      direction_world: direction,
      velocity_world: { x: direction.x * Number(params.projectile_speed ?? 600), y: direction.y * Number(params.projectile_speed ?? 600) },
      projectile_speed: Number(params.projectile_speed ?? 600),
      projectile_width: Number(params.projectile_width ?? 38),
      projectile_height: Number(params.projectile_height ?? 24),
      impact_radius: Number(params.impact_radius ?? skill.hit?.hit_radius ?? 24) * skill.area_multiplier,
      area_scale: skill.area_multiplier,
      projectile_visual_mode: String(params.projectile_visual_mode ?? "standard"),
      trajectory: String(params.trajectory ?? "linear"),
      arc_height: Number(params.arc_height ?? 0),
      lifetime_ms: lifetimeMs,
      local_spread_angle: index === 0 ? 0 : undefined,
      burst_interval_ms: burstIntervalMs
    }, lifetimeMs, projectileDelayMs));
    if (sustainedTicks) {
      const tickIntervalMs = Math.max(1, Number(params.tick_interval_ms ?? 0));
      const activeDurationMs = Math.max(tickIntervalMs, Number(params.duration_ms ?? lifetimeMs));
      const tickCount = Math.max(1, Math.floor(activeDurationMs / tickIntervalMs));
      const tickRadius = Math.max(1, Number(params.impact_radius ?? skill.hit?.hit_radius ?? 20));
      const tickMaxTargets = Math.max(1, Math.round(Number(params.max_targets ?? 1)));
      for (let tick = 0; tick < tickCount; tick += 1) {
        const tickTimeMs = (tick + 1) * tickIntervalMs;
        const progress = clamp(tickTimeMs / Math.max(1, lifetimeMs), 0, 1);
        const tickPosition = {
          x: spawn.x + (hitPosition.x - spawn.x) * progress,
          y: spawn.y + (hitPosition.y - spawn.y) * progress
        };
        const tickDelayMs = projectileDelayMs + tickTimeMs;
        const tickTargets = deps.frontendUniqueTargetsByDistance(current, tickPosition, tickRadius, tickMaxTargets);
        for (const tickTarget of tickTargets) {
          const tickTargetPosition = { x: tickTarget.x, y: tickTarget.y };
          const tickDamageComponents = forcedElement
            ? { [damageType]: amount }
            : deps.damagePayloadComponents(skill, amount, damageType, skill.hit as Record<string, unknown>);
          const tickPayload = {
            projectile_id: projectileId,
            projectile_index: index + 1,
            projectile_count: projectileCount,
            tick_index: tick + 1,
            tick_time_ms: tickTimeMs,
            tick_interval_ms: tickIntervalMs,
            duration_ms: activeDurationMs,
            hit_world_position: tickTargetPosition,
            impact_world_position: tickPosition,
            projectile_world_position: tickPosition,
            target_world_position: tickTargetPosition,
            damage_components: tickDamageComponents,
            armor_reduction_penetration_percent: skill.runtime_params?.armor_reduction_penetration_percent,
            resistance_penetration_percent: skill.runtime_params?.resistance_penetration_percent,
            cull_threshold_percent: skill.runtime_params?.cull_threshold_percent,
            double_damage_chance_percent: skill.runtime_params?.double_damage_chance_percent,
            hit_vfx_key: deps.frontendSkillVfxKey(skill, "hit")
          };
          events.push(deps.frontendSkillEvent(skill, "damage", tickTarget, tickTargetPosition, direction, amount, damageType, tickPayload, 0, tickDelayMs));
          events.push(deps.frontendSkillEvent(skill, "hit_vfx", tickTarget, tickTargetPosition, direction, null, damageType, {
            ...tickPayload,
            vfx_key: deps.frontendSkillVfxKey(skill, "hit")
          }, 420, tickDelayMs));
          events.push(deps.frontendSkillEvent(skill, "floating_text", tickTarget, { x: tickTargetPosition.x, y: tickTargetPosition.y - 28 }, direction, amount, damageType, tickPayload, 800, tickDelayMs));
        }
      }
      continue;
    }
    events.push(deps.frontendSkillEvent(skill, "projectile_hit", target, hitPosition, direction, amount, damageType, {
      vfx_key: deps.frontendSkillVfxKey(skill, "hit"),
      projectile_id: projectileId,
      projectile_index: index + 1,
      projectile_count: projectileCount,
      projectile_continues: false,
      hit_world_position: hitPosition,
      target_world_position: hitPosition,
      marker_id: params.impact_marker_id ?? `${skill.active_gem_instance_id}.hit`,
      hit_marker_id: params.impact_marker_id ?? `${skill.active_gem_instance_id}.hit`
    }, 0, projectileDelayMs + lifetimeMs));
    events.push(...deps.frontendDamageEventsForTarget(skill, target, hitPosition, direction, amount, {
      ...(skill.hit as Record<string, unknown>),
      damage_conversions: forcedElement ? [] : skill.hit?.damage_conversions
    }, {
      projectile_id: projectileId,
      projectile_index: index + 1,
      projectile_count: projectileCount,
      forced_element_type: forcedElement ?? undefined,
      same_target_hit_sequence: sameTargetSequence,
      shotgun_falloff_coeff: shotgunCoeff,
      damage_components: forcedElement
        ? { [damageType]: amount }
        : deps.damagePayloadComponents(skill, amount, damageType, skill.hit as Record<string, unknown>),
      hit_vfx_key: deps.frontendSkillVfxKey(skill, "hit"),
      marker_id: params.impact_marker_id ?? `${skill.active_gem_instance_id}.hit`,
      on_kill_explosion_chance_percent: params.on_kill_explosion_chance_percent,
      on_kill_explosion_radius: Number(params.on_kill_explosion_radius ?? 0) * skill.area_multiplier,
      on_kill_explosion_max_life_percent: params.on_kill_explosion_max_life_percent,
      on_kill_explosion_damage_type: params.on_kill_explosion_damage_type
    }, projectileDelayMs + lifetimeMs));
    events.push(...deps.buildFrontendSecondaryHitEvents(skill, target, hitPosition, direction, current, projectileDelayMs + lifetimeMs));
    events.push(...deps.buildFrontendSplitProjectileEvents(skill, target, hitPosition, direction, current, projectileId, projectileDelayMs + lifetimeMs));
    events.push(...deps.buildFrontendIgnitedHitExplosionEvents(skill, target, hitPosition, direction, current, projectileDelayMs + lifetimeMs));
  }
  return events;
}
