import type { Enemy } from "../types/enemyTypes";
import type { PlayerRuntimeState, SkillEvent } from "../types/combatRuntimeTypes";
import type { SkillPreview } from "../types/skillPreviewTypes";
import { clamp, distance, guideDirection } from "../utils/math2d";
import { frontendPlayableSkillRuntimeFamilyForBehavior } from "../frontendPlayableSkillRuntime";

export type FrontendPlayableSkillPoint = { x: number; y: number };
export type FrontendProjectileLineClip = {
  blocked: boolean;
  point: FrontendPlayableSkillPoint;
};

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

export type FrontendPlayableSkillDispatcherDeps = {
  buildFrontendChainSkillEvents: (
    skill: SkillPreview,
    caster: PlayerRuntimeState,
    initialTargets: Enemy[],
    current: Enemy[]
  ) => SkillEvent[];
  buildFrontendDamageZoneSkillEvents: (
    skill: SkillPreview,
    caster: PlayerRuntimeState,
    initialTargets: Enemy[],
    current: Enemy[]
  ) => SkillEvent[];
  buildFrontendMeleeArcSkillEvents: (
    skill: SkillPreview,
    caster: PlayerRuntimeState,
    initialTargets: Enemy[],
    current: Enemy[]
  ) => SkillEvent[];
  buildFrontendModuleChainSkillEvents: (
    skill: SkillPreview,
    caster: PlayerRuntimeState,
    initialTargets: Enemy[],
    current: Enemy[]
  ) => SkillEvent[];
  buildFrontendNovaSkillEvents: (
    skill: SkillPreview,
    caster: PlayerRuntimeState,
    current: Enemy[]
  ) => SkillEvent[];
  buildFrontendProjectileSkillEvents: (
    skill: SkillPreview,
    caster: PlayerRuntimeState,
    initialTargets: Enemy[],
    current: Enemy[]
  ) => SkillEvent[];
  frontendDamageEventsForTarget: (
    skill: SkillPreview,
    target: Enemy,
    position: FrontendPlayableSkillPoint,
    direction: FrontendPlayableSkillPoint,
    amount: number,
    hitConfig?: Record<string, unknown>
  ) => SkillEvent[];
  isProjectileSkillTemplate: (behaviorTemplate: string | undefined) => boolean;
  skillHasProjectileDamageZoneModules: (skill: SkillPreview) => boolean;
};

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
  clipProjectileLine: (from: FrontendPlayableSkillPoint, to: FrontendPlayableSkillPoint) => FrontendProjectileLineClip;
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

export type FrontendChainSkillEventBuilderDeps = Pick<
  FrontendProjectileSkillEventBuilderDeps,
  | "damagePayloadComponents"
  | "frontendDamageEventsForTarget"
  | "frontendSkillEvent"
  | "frontendSkillVfxKey"
  | "clipProjectileLine"
  | "frontendUniqueTargetsByDistance"
  | "projectileSpawnWorldPosition"
  | "stablePercent"
> & {
  frontendScaledSkillConfigDamageAmount: (skill: SkillPreview, baseAmount: number) => number;
  frontendSkillDotDamageMultiplier: (skill: SkillPreview) => number;
};

export type FrontendAreaSkillEventBuilderDeps = Pick<
  FrontendProjectileSkillEventBuilderDeps,
  | "convertedDamageType"
  | "damagePayloadComponents"
  | "frontendDamageEventsForTarget"
  | "frontendSkillEvent"
  | "frontendSkillVfxKey"
  | "frontendUniqueTargetsByDistance"
> & {
  frontendKnockbackLockMs: number;
  frontendMeleeArcTargets: (
    current: Enemy[],
    origin: FrontendPlayableSkillPoint,
    direction: FrontendPlayableSkillPoint,
    radius: number,
    arcAngleDeg: number,
    maxTargets: number
  ) => Enemy[];
  frontendRuntimeRoll: (skill: SkillPreview, target: Enemy, salt: number) => number;
  frontendSkillDotDamageMultiplier: (skill: SkillPreview) => number;
  isThundercloudSkill: (skill: SkillPreview) => boolean;
  statValue: (stats: SkillPreview["skill_stats"], statId: string) => number;
};

export function buildFrontendPlayableSkillEvents(
  skill: SkillPreview,
  caster: PlayerRuntimeState,
  initialTargets: Enemy[],
  current: Enemy[],
  behavior: string | undefined,
  deps: FrontendPlayableSkillDispatcherDeps
) {
  const runtimeFamily = frontendPlayableSkillRuntimeFamilyForBehavior(
    deps.isProjectileSkillTemplate(behavior) ? "projectile" : behavior,
    deps.skillHasProjectileDamageZoneModules(skill)
  );
  if (runtimeFamily === "module_chain") return deps.buildFrontendModuleChainSkillEvents(skill, caster, initialTargets, current);
  if (runtimeFamily === "projectile") return deps.buildFrontendProjectileSkillEvents(skill, caster, initialTargets, current);
  if (runtimeFamily === "chain") return deps.buildFrontendChainSkillEvents(skill, caster, initialTargets, current);
  if (runtimeFamily === "damage_zone") return deps.buildFrontendDamageZoneSkillEvents(skill, caster, initialTargets, current);
  if (runtimeFamily === "melee_arc") return deps.buildFrontendMeleeArcSkillEvents(skill, caster, initialTargets, current);
  if (runtimeFamily === "player_nova") return deps.buildFrontendNovaSkillEvents(skill, caster, current);
  return initialTargets.flatMap((target) => deps.frontendDamageEventsForTarget(skill, target, { x: target.x, y: target.y }, guideDirection(caster, target), skill.final_damage, skill.hit as Record<string, unknown>));
}

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
    const clippedHit = deps.clipProjectileLine(spawn, hitPosition);
    const sustainedTicks = Boolean(params.sustained_ticks);
    const unclippedExpirePosition = {
      x: spawn.x + direction.x * Number(params.max_distance ?? distance(spawn, hitPosition)),
      y: spawn.y + direction.y * Number(params.max_distance ?? distance(spawn, hitPosition))
    };
    const clippedExpire = deps.clipProjectileLine(spawn, sustainedTicks ? unclippedExpirePosition : hitPosition);
    const projectileEndPosition = sustainedTicks ? clippedExpire.point : clippedHit.point;
    const projectileBlocked = sustainedTicks ? clippedExpire.blocked : clippedHit.blocked;
    const projectileTravelDistance = Math.max(1, distance(spawn, projectileEndPosition));
    const lifetimeMs = Math.max(
      Number(params.min_duration_ms ?? 80),
      Number(params.duration_ms ?? params.travel_time_ms ?? Math.min(Number(params.max_duration_ms ?? 2200), projectileTravelDistance / Math.max(1, Number(params.projectile_speed ?? 600)) * 1000))
    );
    const sustainedTickIntervalMs = Math.max(1, Number(params.tick_interval_ms ?? 0));
    const sustainedActiveDurationMs = Math.max(sustainedTickIntervalMs, Number(params.duration_ms ?? lifetimeMs));
    const sustainedTickRadius = Math.max(1, Number(params.impact_radius ?? skill.hit?.hit_radius ?? 20));
    const sustainedTickMaxTargets = Math.max(1, Math.round(Number(params.max_targets ?? 1)));
    const sustainedDamageComponents = forcedElement
      ? { [damageType]: amount }
      : deps.damagePayloadComponents(skill, amount, damageType, skill.hit as Record<string, unknown>);
    events.push(deps.frontendSkillEvent(skill, "projectile_spawn", target, spawn, direction, null, damageType, {
      vfx_key: deps.frontendSkillVfxKey(skill, "projectile"),
      projectile_id: projectileId,
      projectile_index: index + 1,
      projectile_count: projectileCount,
      target_world_position: projectileEndPosition,
      expire_world_position: projectileEndPosition,
      spawn_world_position: spawn,
      spawn_policy: "caster_current_position",
      vfx_spawn_policy: "caster_current_position",
      direction_world: direction,
      velocity_world: { x: direction.x * Number(params.projectile_speed ?? 600), y: direction.y * Number(params.projectile_speed ?? 600) },
      projectile_speed: Number(params.projectile_speed ?? 600),
      max_distance: projectileTravelDistance,
      projectile_width: Number(params.projectile_width ?? 38),
      projectile_height: Number(params.projectile_height ?? 24),
      impact_radius: Number(params.impact_radius ?? skill.hit?.hit_radius ?? 24) * skill.area_multiplier,
      radius: sustainedTickRadius * skill.area_multiplier,
      max_targets: sustainedTickMaxTargets,
      damage_amount: amount,
      damage_components: sustainedDamageComponents,
      dynamic_tick_runtime: sustainedTicks,
      projectile_tick_runtime: sustainedTicks,
      dynamic_tick_hit_vfx: sustainedTicks,
      tick_interval_ms: sustainedTickIntervalMs,
      duration_ms: sustainedActiveDurationMs,
      area_scale: skill.area_multiplier,
      projectile_visual_mode: String(params.projectile_visual_mode ?? "standard"),
      trajectory: String(params.trajectory ?? "linear"),
      arc_height: Number(params.arc_height ?? 0),
      lifetime_ms: lifetimeMs,
      wall_blocked: projectileBlocked || undefined,
      local_spread_angle: index === 0 ? 0 : undefined,
      burst_interval_ms: burstIntervalMs
    }, lifetimeMs, projectileDelayMs));
    if (sustainedTicks || clippedHit.blocked) {
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

export function buildFrontendChainSkillEvents(
  skill: SkillPreview,
  caster: PlayerRuntimeState,
  initialTargets: Enemy[],
  current: Enemy[],
  deps: FrontendChainSkillEventBuilderDeps,
  elapsedMs: number
) {
  const params = skill.runtime_params ?? {};
  const maxSegments = Math.max(1, Math.round(Number(params.chain_count ?? 1)));
  const chainRadius = Math.max(1, Number(params.chain_radius ?? skill.cast?.search_range ?? 180));
  const chainDelayMs = Math.max(0, Number(params.chain_delay_ms ?? 90));
  const events: SkillEvent[] = [];
  const hitIds = new Set<number>();
  let start: { x: number; y: number } = caster;
  let target = initialTargets[0];
  for (let index = 0; index < maxSegments && target; index += 1) {
    const segmentDelayMs = index * chainDelayMs;
    hitIds.add(target.id);
    const direction = guideDirection(start, target);
    const segmentId = `${skill.active_gem_instance_id}.chain.${Math.round(elapsedMs)}.${index + 1}`;
    events.push(deps.frontendSkillEvent(skill, "chain_segment", target, start, direction, skill.final_damage, skill.damage_type, {
      vfx_key: deps.frontendSkillVfxKey(skill, "segment"),
      segment_id: segmentId,
      segment_index: index,
      start_position: { x: start.x, y: start.y },
      end_position: { x: target.x, y: target.y },
      target_world_position: { x: target.x, y: target.y },
      hit_at_ms: segmentDelayMs
    }, 180, segmentDelayMs));
    events.push(...deps.frontendDamageEventsForTarget(skill, target, { x: target.x, y: target.y }, direction, skill.final_damage, skill.hit as Record<string, unknown>, {
      hit_vfx_key: deps.frontendSkillVfxKey(skill, "hit"),
      chain_segment_id: segmentId,
      segment_index: index
    }, segmentDelayMs));
    start = target;
    target = deps.frontendUniqueTargetsByDistance(current, start, chainRadius, 1, hitIds)[0];
  }
  return events;
}

export function buildFrontendModuleChainSkillEvents(
  skill: SkillPreview,
  caster: PlayerRuntimeState,
  initialTargets: Enemy[],
  current: Enemy[],
  deps: FrontendChainSkillEventBuilderDeps,
  elapsedMs: number
) {
  const params = skill.runtime_params ?? {};
  const modules = Array.isArray(params.modules) ? params.modules as Array<{ id?: string; type?: string; params?: Record<string, unknown>; trigger?: Record<string, unknown> }> : [];
  const projectileModule = modules.find((module) => module.type === "projectile");
  const zoneModule = modules.find((module) => module.type === "damage_zone");
  const buffModule = modules.find((module) => module.type === "buff");
  if (!projectileModule || !zoneModule) return buildFrontendChainSkillEvents(skill, caster, initialTargets, current, deps, elapsedMs);
  const target = initialTargets[0];
  const projectileParams = projectileModule.params ?? {};
  const zoneParams = zoneModule.params ?? {};
  const spawn = deps.projectileSpawnWorldPosition(caster, projectileParams);
  const direction = guideDirection(spawn, target);
  const impact = { x: target.x, y: target.y };
  const clippedImpact = deps.clipProjectileLine(spawn, impact);
  const projectileEnd = clippedImpact.point;
  const projectileId = `${skill.active_gem_instance_id}.module_projectile.${Math.round(elapsedMs)}`;
  const travelTimeMs = Number(projectileParams.travel_time_ms ?? 520);
  const events: SkillEvent[] = [
    deps.frontendSkillEvent(skill, "projectile_spawn", target, spawn, direction, null, skill.damage_type, {
      vfx_key: projectileParams.vfx_key ?? deps.frontendSkillVfxKey(skill, "projectile"),
      projectile_id: projectileId,
      target_world_position: projectileEnd,
      expire_world_position: projectileEnd,
      spawn_world_position: spawn,
      direction_world: direction,
      velocity_world: {
        x: direction.x * Number(projectileParams.projectile_speed ?? params.projectile_speed ?? 540),
        y: direction.y * Number(projectileParams.projectile_speed ?? params.projectile_speed ?? 540)
      },
      projectile_speed: Number(projectileParams.projectile_speed ?? params.projectile_speed ?? 540),
      projectile_width: Number(projectileParams.projectile_width ?? params.projectile_width ?? 46),
      projectile_height: Number(projectileParams.projectile_height ?? params.projectile_height ?? 30),
      impact_radius: Number(projectileParams.impact_radius ?? params.impact_radius ?? skill.hit?.hit_radius ?? 24) * skill.area_multiplier,
      area_scale: skill.area_multiplier,
      trajectory: String(projectileParams.trajectory ?? "linear"),
      arc_height: Number(projectileParams.arc_height ?? 0),
      lifetime_ms: travelTimeMs,
      wall_blocked: clippedImpact.blocked || undefined
    }, travelTimeMs)
  ];
  if (clippedImpact.blocked) return events;
  events.push(
    deps.frontendSkillEvent(skill, "projectile_hit", target, impact, direction, Number(skill.final_damage ?? 0), skill.damage_type, {
      vfx_key: projectileParams.vfx_key ?? deps.frontendSkillVfxKey(skill, "hit"),
      projectile_id: projectileId,
      projectile_continues: false,
      marker_id: projectileParams.impact_marker_id ?? "corrosive_impact",
      hit_marker_id: projectileParams.impact_marker_id ?? "corrosive_impact",
      hit_world_position: impact,
      target_world_position: impact,
      impact_radius: Number(projectileParams.impact_radius ?? params.impact_radius ?? skill.hit?.hit_radius ?? 24) * skill.area_multiplier,
      area_scale: skill.area_multiplier,
      impact_position: impact
    }, 180, travelTimeMs)
  );
  const impactDelayMs = travelTimeMs;
  events.push(...deps.frontendDamageEventsForTarget(skill, target, impact, direction, skill.final_damage, skill.hit as Record<string, unknown>, {
    projectile_id: projectileId,
    hit_vfx_key: deps.frontendSkillVfxKey(skill, "hit", projectileParams.vfx_key),
    marker_id: projectileParams.impact_marker_id ?? "corrosive_impact"
  }, impactDelayMs));
  const radius = Number(zoneParams.radius ?? 80) * skill.area_multiplier;
  const tickIntervalMs = Math.max(1, Number(zoneParams.tick_interval_ms ?? 1000));
  const durationMs = Math.max(tickIntervalMs, Number(zoneParams.duration_ms ?? 3000));
  const tickCount = Math.max(1, Math.floor(durationMs / tickIntervalMs));
  const zoneTargets = deps.frontendUniqueTargetsByDistance(current, impact, radius, Math.max(1, Number(zoneParams.max_targets ?? 8)));
  const zoneBaseDamageAmount = deps.frontendScaledSkillConfigDamageAmount(skill, Number(zoneParams.damage_amount ?? 0));
  const zoneDamageAmount = zoneBaseDamageAmount * deps.frontendSkillDotDamageMultiplier(skill);
  const zoneId = `${skill.active_gem_instance_id}.corrosive_ground.${Math.round(elapsedMs)}`;
  const zoneDelayMs = impactDelayMs + Math.max(0, Number(zoneModule.trigger?.trigger_delay_ms ?? zoneParams.trigger_delay_ms ?? 0));
  const hitAtMs = Math.max(0, Number(zoneParams.hit_at_ms ?? 0));
  const useDynamicTickRuntime = tickIntervalMs > 0 && durationMs > 0;
  const dynamicBuffApply = buffModule?.params ? {
    trigger_event_type: "damage_zone_hit",
    buff_type: "",
    effect_type: buffModule.params.effect_type ?? "damage_taken_increase",
    chance_percent: Number(buffModule.params.chance_percent ?? 0),
    effect_per_stack: Number(buffModule.params.effect_per_stack ?? 0),
    duration_ms: Number(buffModule.params.duration_ms ?? 2000),
    trigger_delay_ms: Math.max(0, Number(buffModule.trigger?.trigger_delay_ms ?? 0)),
    source_skill_id: skill.skill_package_id ?? skill.skill_template_id
  } : null;
  events.push(deps.frontendSkillEvent(skill, "damage_zone", null, impact, direction, zoneDamageAmount, skill.damage_type, {
    vfx_key: zoneParams.vfx_key ?? deps.frontendSkillVfxKey(skill, "zone"),
    zone_id: zoneId,
    marker_id: "corrosive_ground",
    trigger_marker_id: zoneModule.trigger?.trigger_marker_id ?? projectileParams.impact_marker_id,
    shape: zoneParams.shape ?? "circle",
    radius,
    hit_at_ms: hitAtMs,
    tick_interval_ms: tickIntervalMs,
    tick_count: tickCount,
    max_targets: Number(zoneParams.max_targets ?? 8),
    hit_target_count: zoneTargets.length,
    max_hits: Number(zoneParams.max_hits ?? Number.MAX_SAFE_INTEGER),
    max_hits_per_target: Number(zoneParams.max_hits_per_target ?? Number.MAX_SAFE_INTEGER),
    dynamic_tick_runtime: useDynamicTickRuntime,
    damage_amount: zoneDamageAmount,
    emit_hit_vfx: Boolean(zoneParams.emit_hit_vfx ?? false),
    dynamic_buff_apply: dynamicBuffApply
  }, durationMs, zoneDelayMs));
  if (useDynamicTickRuntime) return events;
  for (let tick = 1; tick <= tickCount; tick += 1) {
    for (const zoneTarget of zoneTargets) {
      const tickTimeMs = hitAtMs + (tick - 1) * tickIntervalMs;
      const eventDelayMs = zoneDelayMs + tickTimeMs;
      const tickPayload = { zone_id: zoneId, marker_id: "corrosive_ground_hit", tick_time_ms: tickTimeMs, tick_interval_ms: tickIntervalMs };
      events.push(deps.frontendSkillEvent(skill, "damage_zone_hit", zoneTarget, { x: zoneTarget.x, y: zoneTarget.y }, direction, zoneDamageAmount, skill.damage_type, { ...tickPayload, vfx_key: zoneParams.vfx_key ?? deps.frontendSkillVfxKey(skill, "zone") }, 0, eventDelayMs));
      events.push(...deps.frontendDamageEventsForTarget(skill, zoneTarget, { x: zoneTarget.x, y: zoneTarget.y }, direction, zoneDamageAmount, {
        damage_components: deps.damagePayloadComponents(skill, zoneDamageAmount, skill.damage_type, skill.hit as Record<string, unknown>)
      }, { ...tickPayload, emit_hit_vfx: false }, eventDelayMs));
      if (buffModule?.params && deps.stablePercent(`${zoneId}:${zoneTarget.id}:${tick}:buff_apply`) <= Number(buffModule.params.chance_percent ?? 0)) {
        events.push(deps.frontendSkillEvent(skill, "buff_apply", zoneTarget, { x: zoneTarget.x, y: zoneTarget.y }, direction, null, skill.damage_type, {
          trigger_event_type: "damage_zone_hit",
          buff_type: "",
          effect_type: buffModule.params.effect_type ?? "damage_taken_increase",
          chance_percent: Number(buffModule.params.chance_percent ?? 0),
          effect_per_stack: Number(buffModule.params.effect_per_stack ?? 0),
          duration_ms: Number(buffModule.params.duration_ms ?? 2000),
          source_skill_id: skill.skill_package_id ?? skill.skill_template_id
        }, Number(buffModule.params.duration_ms ?? 2000), eventDelayMs + Math.max(0, Number(buffModule.trigger?.trigger_delay_ms ?? 0))));
      }
    }
  }
  return events;
}

export function buildFrontendDamageZoneSkillEvents(
  skill: SkillPreview,
  caster: PlayerRuntimeState,
  initialTargets: Enemy[],
  current: Enemy[],
  deps: FrontendAreaSkillEventBuilderDeps,
  elapsedMs: number
) {
  const params = skill.runtime_params ?? {};
  const originPolicy = String(params.origin_policy ?? "target_position");
  const originTarget = initialTargets[0];
  if (!originTarget && originPolicy !== "caster") return [];
  const origin = originPolicy === "caster" ? caster : { x: originTarget.x, y: originTarget.y };
  const direction = originTarget ? guideDirection(caster, originTarget) : { x: 1, y: 0 };
  const channelMaxStacks = Math.max(1, Math.round(Number(params.channel_max_stacks ?? 1)));
  const channelStack = Math.max(
    1,
    Math.min(
      channelMaxStacks,
      Math.round(Number(params.current_channel_stack ?? Number(params.channel_min_stacks ?? 0) + 1))
    )
  );
  const channelRadiusScale = channelMaxStacks > 1
    ? 1 + ((channelStack - 1) / Math.max(1, channelMaxStacks - 1)) * 0.45
    : 1;
  const radius = Number(params.radius ?? skill.hit?.hit_radius ?? 120) * skill.area_multiplier * channelRadiusScale;
  const waveCount = Math.max(1, Math.round(Number(params.wave_count ?? 1)));
  const tickIntervalMs = Math.max(0, Number(params.tick_interval_ms ?? 0));
  const durationMs = Math.max(Number(params.duration_ms ?? params.hit_at_ms ?? 240), tickIntervalMs || 1);
  const tickCount = tickIntervalMs > 0 ? Math.max(1, Math.floor(durationMs / tickIntervalMs)) : 1;
  const hitAtMs = Math.max(0, Number(params.hit_at_ms ?? 0));
  const waveIntervalMs = Math.max(0, Number(params.wave_interval_ms ?? 0));
  const events: SkillEvent[] = [];
  for (let wave = 0; wave < waveCount; wave += 1) {
    const waveDelayMs = wave * waveIntervalMs;
    const waveOriginTarget = String(params.target_lock_policy ?? "") === "nearest_unique_enemy"
      ? (deps.frontendUniqueTargetsByDistance(current, caster, Number(skill.cast?.search_range ?? 630), waveCount)[wave] ?? originTarget)
      : originTarget;
    if (!waveOriginTarget && originPolicy !== "caster") continue;
    const center = originPolicy === "caster" ? caster : { x: waveOriginTarget!.x, y: waveOriginTarget!.y };
    const zoneTargets = deps.frontendUniqueTargetsByDistance(current, center, radius, Math.max(1, Number(params.max_targets ?? 8)));
    const zoneId = `${skill.active_gem_instance_id}.zone.${Math.round(elapsedMs)}.${wave + 1}`;
    const useDynamicTickRuntime = tickIntervalMs > 0 && durationMs > 0;
    const tickDamageBaseAmount = tickIntervalMs > 0 && skill.damage_type === "chaos" ? Number(skill.final_damage) * (tickIntervalMs / 1000) : Number(skill.final_damage);
    const tickDamageAmount = tickIntervalMs > 0 ? tickDamageBaseAmount * deps.frontendSkillDotDamageMultiplier(skill) : tickDamageBaseAmount;
    events.push(deps.frontendSkillEvent(skill, "damage_zone", null, center, direction, skill.final_damage, skill.damage_type, {
      vfx_key: deps.frontendSkillVfxKey(skill, "zone"),
      zone_id: zoneId,
      shape: params.shape ?? "circle",
      radius,
      ring_width: Number(params.ring_width ?? 48),
      tick_interval_ms: tickIntervalMs,
      tick_count: tickCount,
      duration_ms: durationMs,
      max_targets: Number(params.max_targets ?? 8),
      hit_target_count: zoneTargets.length,
      wave_index: wave + 1,
      target_lock_policy: params.target_lock_policy,
      origin_policy: originPolicy,
      dynamic_tick_runtime: useDynamicTickRuntime,
      dynamic_tick_hit_vfx: deps.isThundercloudSkill(skill),
      damage_amount: tickDamageAmount,
      damage_components: deps.damagePayloadComponents(skill, tickDamageAmount, skill.damage_type, skill.hit as Record<string, unknown>),
      knockback_chance_percent: deps.statValue(skill.skill_stats, "knockback_chance_percent"),
      knockback_distance_add_percent: deps.statValue(skill.skill_stats, "knockback_distance_add_percent"),
      knockback_lock_ms: deps.frontendKnockbackLockMs,
      max_hits: Number(params.max_hits ?? Number.MAX_SAFE_INTEGER),
      max_hits_per_target: Number(params.max_hits_per_target ?? Number.MAX_SAFE_INTEGER),
      channel_stack: channelStack,
      channel_max_stacks: params.channel_max_stacks,
      channel_radius_scale: channelRadiusScale,
      channel_move_speed_multiplier: params.channel_move_speed_multiplier,
      knockback_policy: params.knockback_policy,
      knockback_interval_ms: params.knockback_interval_ms,
      aggravation_value: params.aggravation_value,
      aggravation_cooldown_ms: params.aggravation_cooldown_ms,
      dot_damage_bonus_per_10_aggravation_percent: params.dot_damage_bonus_per_10_aggravation_percent
    }, durationMs, waveDelayMs));
    if (String(params.knockback_policy ?? "") === "reverse") {
      for (let pullMs = Number(params.knockback_interval_ms ?? 100); pullMs <= durationMs; pullMs += Number(params.knockback_interval_ms ?? 100)) {
        events.push(deps.frontendSkillEvent(skill, "forced_movement", null, center, direction, Number(params.knockback_distance ?? 0), skill.damage_type, {
          origin_world_position: center,
          origin: center,
          radius,
          movement_policy: "pull_to_origin",
          movement_scope: "damage_zone",
          movement_distance: Number(params.knockback_distance ?? 0),
          pull_time_ms: pullMs
        }, 120, waveDelayMs + pullMs));
      }
    }
    if (useDynamicTickRuntime) continue;
    for (let tick = 1; tick <= tickCount; tick += 1) {
      for (const target of zoneTargets) {
        const baseAmount = tickIntervalMs > 0 && skill.damage_type === "chaos" ? Number(skill.final_damage) * (tickIntervalMs / 1000) : Number(skill.final_damage);
        const amount = tickIntervalMs > 0 ? baseAmount * deps.frontendSkillDotDamageMultiplier(skill) : baseAmount;
        const tickTimeMs = tickIntervalMs > 0 ? hitAtMs + (tick - 1) * tickIntervalMs : hitAtMs;
        const eventDelayMs = waveDelayMs + tickTimeMs;
        const tickPayload = {
          vfx_key: deps.frontendSkillVfxKey(skill, "zone"),
          zone_id: zoneId,
          tick_time_ms: tickTimeMs,
          tick_interval_ms: tickIntervalMs,
          dot_damage_bonus_per_10_aggravation_percent: params.dot_damage_bonus_per_10_aggravation_percent
        };
        events.push(deps.frontendSkillEvent(skill, "damage_zone_hit", target, { x: target.x, y: target.y }, direction, amount, skill.damage_type, tickPayload, 0, eventDelayMs));
        events.push(...deps.frontendDamageEventsForTarget(skill, target, { x: target.x, y: target.y }, direction, amount, skill.hit as Record<string, unknown>, {
          ...tickPayload,
          hit_vfx_key: deps.frontendSkillVfxKey(skill, "hit"),
          emit_hit_vfx: tickIntervalMs <= 0 || deps.isThundercloudSkill(skill)
        }, eventDelayMs));
        if (Number(params.aggravation_value ?? 0) > 0 && tickIntervalMs > 0 && tickTimeMs % Math.max(1, Number(params.aggravation_cooldown_ms ?? 1000)) === hitAtMs % Math.max(1, Number(params.aggravation_cooldown_ms ?? 1000))) {
          events.push(deps.frontendSkillEvent(skill, "status_apply", target, { x: target.x, y: target.y }, direction, null, skill.damage_type, {
            status_type: "aggravation",
            source_skill_id: skill.skill_package_id ?? skill.skill_template_id,
            base_value: Number(params.aggravation_value ?? 0),
            effect_per_stack: Number(params.dot_damage_bonus_per_10_aggravation_percent ?? 0),
            duration_ms: durationMs
          }, durationMs, eventDelayMs));
        }
      }
    }
  }
  return events;
}

export function buildFrontendMeleeArcSkillEvents(
  skill: SkillPreview,
  caster: PlayerRuntimeState,
  initialTargets: Enemy[],
  current: Enemy[],
  deps: FrontendAreaSkillEventBuilderDeps
) {
  const params = skill.runtime_params ?? {};
  const target = initialTargets[0];
  const direction = guideDirection(caster, target);
  const radius = Number(params.arc_radius ?? params.radius ?? 160) * skill.area_multiplier;
  const arcAngle = Number(params.arc_angle ?? 120);
  const hitAtMs = Math.max(0, Number(params.hit_at_ms ?? skill.hit?.hit_delay_ms ?? 0));
  const maxTargets = Math.max(1, Number(params.max_targets ?? 6));
  const targets = deps.frontendMeleeArcTargets(current, caster, direction, radius, arcAngle, maxTargets);
  const events: SkillEvent[] = [
    deps.frontendSkillEvent(skill, "melee_arc", null, caster, direction, skill.final_damage, deps.convertedDamageType(skill, skill.hit as Record<string, unknown>), {
      vfx_key: deps.frontendSkillVfxKey(skill, "hit", params.slash_vfx_key),
      arc_radius: radius,
      arc_angle: arcAngle,
      origin_world_position: caster,
      direction_world: direction,
      hit_at_ms: hitAtMs,
      slash_triggered: deps.frontendRuntimeRoll(skill, target, 901) * 100 <= Number(params.slash_chance_percent ?? 0)
    }, 220)
  ];
  for (const hitTarget of targets) {
    events.push(...deps.frontendDamageEventsForTarget(skill, hitTarget, { x: hitTarget.x, y: hitTarget.y }, direction, skill.final_damage, skill.hit as Record<string, unknown>, {
      hit_vfx_key: deps.frontendSkillVfxKey(skill, "hit", params.slash_vfx_key)
    }, hitAtMs));
  }
  const slashTriggered = Boolean(events[0].payload?.slash_triggered);
  if (slashTriggered) {
    const flameWaveCount = Math.max(1, Math.round(Number(params.flame_wave_count ?? 3)));
    const waveRadius = Number(params.flame_wave_distance ?? radius);
    const waveTargets = deps.frontendMeleeArcTargets(current, caster, direction, waveRadius, Number(params.flame_wave_arc_angle ?? arcAngle), Math.max(maxTargets, 8));
    const sequenceByTarget = new Map<number, number>();
    for (let wave = 0; wave < flameWaveCount; wave += 1) {
      events.push(deps.frontendSkillEvent(skill, "melee_arc", null, caster, direction, skill.final_damage, deps.convertedDamageType(skill, skill.hit as Record<string, unknown>), {
        vfx_key: deps.frontendSkillVfxKey(skill, "hit", params.slash_vfx_key),
        arc_radius: waveRadius,
        arc_angle: Number(params.flame_wave_arc_angle ?? arcAngle),
        flame_wave_index: wave + 1,
        origin_world_position: caster,
        direction_world: direction
      }, 220));
      for (const waveTarget of waveTargets) {
        const seq = sequenceByTarget.get(waveTarget.id) ?? 0;
        sequenceByTarget.set(waveTarget.id, seq + 1);
        const amount = Number(skill.final_damage) * (seq > 0 ? 1 - Number(params.shotgun_falloff_coeff ?? 0.5) : 1);
        events.push(...deps.frontendDamageEventsForTarget(skill, waveTarget, { x: waveTarget.x, y: waveTarget.y }, direction, amount, skill.hit as Record<string, unknown>, {
          hit_vfx_key: deps.frontendSkillVfxKey(skill, "hit", params.slash_vfx_key),
          flame_wave_index: wave + 1,
          same_target_hit_sequence: seq
        }));
      }
    }
  }
  return events;
}

export function buildFrontendNovaSkillEvents(
  skill: SkillPreview,
  caster: PlayerRuntimeState,
  current: Enemy[],
  deps: FrontendAreaSkillEventBuilderDeps,
  elapsedMs: number
) {
  const params = skill.runtime_params ?? {};
  const radius = Number(params.radius ?? skill.hit?.hit_radius ?? 118) * skill.area_multiplier;
  const direction = { x: 1, y: 0 };
  const targets = deps.frontendUniqueTargetsByDistance(current, caster, radius, Math.max(1, Number(params.max_targets ?? 8)));
  const areaId = `${skill.active_gem_instance_id}.nova.${Math.round(elapsedMs)}`;
  const hitAtMs = Math.max(0, Number(params.hit_at_ms ?? skill.hit?.hit_delay_ms ?? 0));
  return [
    deps.frontendSkillEvent(skill, "area_spawn", null, caster, direction, skill.final_damage, skill.damage_type, {
      vfx_key: deps.frontendSkillVfxKey(skill, "zone"),
      area_id: areaId,
      center_world_position: caster,
      center_policy: params.center_policy ?? "player_center",
      radius,
      ring_width: Number(params.ring_width ?? 48),
      on_kill_recast_chance_percent: params.on_kill_recast_chance_percent,
      on_kill_recast_max_per_area: params.on_kill_recast_max_per_area,
      suppress_hit_vfx: params.suppress_hit_vfx
    }, Math.max(250, Number(params.expand_duration_ms ?? 250))),
    ...targets.flatMap((target) => deps.frontendDamageEventsForTarget(skill, target, { x: target.x, y: target.y }, guideDirection(caster, target), skill.final_damage, skill.hit as Record<string, unknown>, {
      hit_vfx_key: deps.frontendSkillVfxKey(skill, "hit"),
      area_id: areaId,
      hit_at_ms: hitAtMs,
      on_kill_recast_chance_percent: params.on_kill_recast_chance_percent,
      on_kill_recast_max_per_area: params.on_kill_recast_max_per_area,
      radius,
      ring_width: Number(params.ring_width ?? 48)
    }, hitAtMs))
  ];
}
