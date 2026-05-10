import { clamp, guideDirection } from "../utils/math2d";

export type WorldPoint = { x: number; y: number };
export type DamageZoneLifecycleEnemy = WorldPoint & { id: number; hp: number };
export type DamageZoneLifecycleSkillEvent = {
  event_id: string;
  type: string;
  timestamp_ms: number;
  source_entity: string;
  target_entity: string;
  position: WorldPoint;
  direction: WorldPoint;
  delay_ms: number;
  duration_ms: number;
  amount: number | null;
  damage_type: string;
  skill_instance_id: string;
  vfx_key: string;
  sfx_key: string;
  reason_key: string;
  payload?: {
    end_position?: WorldPoint;
    text?: string;
    skill_name?: string;
    [key: string]: unknown;
  };
};
export type ActiveDamageZoneRuntime = {
  zoneId: string;
  event: DamageZoneLifecycleSkillEvent;
  payload: NonNullable<DamageZoneLifecycleSkillEvent["payload"]>;
  origin: WorldPoint;
  direction: WorldPoint;
  shape: "circle" | "rectangle";
  radius: number;
  length: number;
  width: number;
  followPlayer: boolean;
  remainingMs: number;
  tickIntervalMs: number;
  nextTickMs: number;
  tickIndex: number;
  maxTargets: number;
  maxHits: number;
  maxHitsPerTarget: number;
  totalHits: number;
  hitCounts: Map<number, number>;
};
export type UniqueTargetsByDistance = (
  enemies: DamageZoneLifecycleEnemy[],
  origin: WorldPoint,
  radius: number,
  maxTargets: number
) => DamageZoneLifecycleEnemy[];
export type StablePercentRoll = (seed: string) => number;

export type ActiveDamageZoneRuntimeTickDeps = {
  player: WorldPoint;
  enemies: DamageZoneLifecycleEnemy[];
  frontendUniqueTargetsByDistance: UniqueTargetsByDistance;
  damageNumberText: (amount: number) => string;
  stablePercent: StablePercentRoll;
  frontendBaseKnockbackDistance: number;
  frontendKnockbackLockMs: number;
};

export function createActiveDamageZoneRuntime(
  event: DamageZoneLifecycleSkillEvent,
  zoneId: string,
  origin: WorldPoint,
  direction: WorldPoint,
  shape: "circle" | "rectangle",
  enemyCount: number
) {
  if (event.type !== "damage_zone") return null;
  const payload = event.payload ?? {};
  if (payload.dynamic_tick_runtime !== true) return null;
  const tickIntervalMs = Math.max(0, Math.round(Number(payload.tick_interval_ms ?? 0)));
  const damageAmount = Math.max(0, Number(payload.damage_amount ?? event.amount ?? 0));
  if (tickIntervalMs <= 0 || event.duration_ms <= 0 || damageAmount <= 0) return null;
  const firstTickMs = Math.max(0, Math.round(Number(payload.hit_at_ms ?? tickIntervalMs)));
  return {
    zoneId,
    event,
    payload,
    origin,
    direction,
    shape,
    radius: Math.max(1, Number(payload.radius ?? 120)),
    length: Math.max(1, Number(payload.length ?? payload.radius ?? 160)),
    width: Math.max(1, Number(payload.width ?? payload.radius ?? 80)),
    followPlayer: event.source_entity === "player" && payload.origin_policy === "caster",
    remainingMs: Math.max(0, event.duration_ms),
    tickIntervalMs,
    nextTickMs: firstTickMs > 0 ? firstTickMs : tickIntervalMs,
    tickIndex: 0,
    maxTargets: Math.max(1, Math.round(Number(payload.max_targets ?? (enemyCount || 1)))),
    maxHits: Math.max(1, Math.round(Number(payload.max_hits ?? Number.MAX_SAFE_INTEGER))),
    maxHitsPerTarget: Math.max(1, Math.round(Number(payload.max_hits_per_target ?? Number.MAX_SAFE_INTEGER))),
    totalHits: 0,
    hitCounts: new Map()
  } satisfies ActiveDamageZoneRuntime;
}

export function replaceActiveDamageZoneRuntime(
  zones: ActiveDamageZoneRuntime[],
  runtime: ActiveDamageZoneRuntime
) {
  return [
    ...zones.filter((zone) => zone.zoneId !== runtime.zoneId),
    runtime
  ];
}

export function advanceActiveDamageZoneRuntime(
  zone: ActiveDamageZoneRuntime,
  deltaMs: number,
  buildTickEvents: (zone: ActiveDamageZoneRuntime) => ActiveDamageZoneRuntimeTickResult
) {
  let nextZone = cloneActiveDamageZoneRuntime({
    ...zone,
    remainingMs: zone.remainingMs - deltaMs,
    nextTickMs: zone.nextTickMs - deltaMs
  });
  const events: DamageZoneLifecycleSkillEvent[] = [];
  while (nextZone.nextTickMs <= 0 && nextZone.remainingMs >= 0 && nextZone.tickIntervalMs > 0) {
    nextZone = { ...nextZone, tickIndex: nextZone.tickIndex + 1 };
    const tick = buildTickEvents(nextZone);
    events.push(...tick.events);
    nextZone = {
      ...tick.zone,
      nextTickMs: tick.zone.nextTickMs + tick.zone.tickIntervalMs
    };
  }
  return {
    zone: nextZone,
    events,
    active: nextZone.remainingMs > 0 && nextZone.totalHits < nextZone.maxHits
  };
}

export type ActiveDamageZoneRuntimeTickResult = {
  zone: ActiveDamageZoneRuntime;
  events: DamageZoneLifecycleSkillEvent[];
};

export function buildActiveDamageZoneRuntimeTickEvents(
  zone: ActiveDamageZoneRuntime,
  deps: ActiveDamageZoneRuntimeTickDeps
): ActiveDamageZoneRuntimeTickResult {
  let nextZone = cloneActiveDamageZoneRuntime(zone);
  const origin = nextZone.followPlayer ? { x: deps.player.x, y: deps.player.y } : nextZone.origin;
  const maxTargets = Math.max(1, nextZone.maxTargets);
  const targets = nextZone.shape === "circle"
    ? deps.frontendUniqueTargetsByDistance(deps.enemies, origin, nextZone.radius, maxTargets)
    : deps.frontendUniqueTargetsByDistance(deps.enemies, origin, Math.max(nextZone.length, nextZone.width), maxTargets)
        .filter((enemy) => damageZoneRectangleContains(enemy, origin, nextZone.direction, nextZone.length, nextZone.width));
  const damageAmount = Math.max(0, Number(nextZone.payload.damage_amount ?? nextZone.event.amount ?? 0));
  if (damageAmount <= 0 || targets.length === 0) return { zone: nextZone, events: [] };
  const tickTimeMs = nextZone.tickIndex * nextZone.tickIntervalMs;
  const events: DamageZoneLifecycleSkillEvent[] = [];
  for (const target of targets) {
    if (nextZone.totalHits >= nextZone.maxHits) break;
    const previousHits = nextZone.hitCounts.get(target.id) ?? 0;
    if (previousHits >= nextZone.maxHitsPerTarget) continue;
    nextZone.totalHits += 1;
    nextZone.hitCounts.set(target.id, previousHits + 1);
    const position = { x: target.x, y: target.y };
    const direction = guideDirection(origin, target);
    const tickDamageComponents = nextZone.payload.damage_components && typeof nextZone.payload.damage_components === "object" && !Array.isArray(nextZone.payload.damage_components)
      ? nextZone.payload.damage_components
      : { [nextZone.event.damage_type]: damageAmount };
    const basePayload = {
      ...nextZone.payload,
      zone_id: nextZone.zoneId,
      tick_index: nextZone.tickIndex,
      tick_time_ms: tickTimeMs,
      tick_interval_ms: nextZone.tickIntervalMs,
      hit_world_position: position,
      impact_world_position: position,
      target_world_position: position,
      origin_world_position: origin,
      damage_components: tickDamageComponents,
      armor_reduction_penetration_percent: nextZone.payload.armor_reduction_penetration_percent,
      resistance_penetration_percent: nextZone.payload.resistance_penetration_percent,
      cull_threshold_percent: nextZone.payload.cull_threshold_percent,
      double_damage_chance_percent: nextZone.payload.double_damage_chance_percent,
      hit_vfx_key: nextZone.event.vfx_key,
      emit_hit_vfx: nextZone.payload.dynamic_tick_hit_vfx === true || nextZone.payload.emit_hit_vfx === true
    };
    const baseId = `${nextZone.event.event_id}.runtime_tick.${nextZone.tickIndex}.${target.id}`;
    events.push({
      ...nextZone.event,
      event_id: `${baseId}.damage_zone_hit`,
      type: "damage_zone_hit",
      target_entity: String(target.id),
      position,
      direction,
      delay_ms: 0,
      duration_ms: 0,
      amount: damageAmount,
      payload: basePayload
    });
    events.push({
      ...nextZone.event,
      event_id: `${baseId}.damage`,
      type: "damage",
      target_entity: String(target.id),
      position,
      direction,
      delay_ms: 0,
      duration_ms: 0,
      amount: damageAmount,
      payload: basePayload
    });
    if (basePayload.emit_hit_vfx) {
      events.push({
        ...nextZone.event,
        event_id: `${baseId}.hit_vfx`,
        type: "hit_vfx",
        target_entity: String(target.id),
        position,
        direction,
        delay_ms: 0,
        duration_ms: 420,
        amount: null,
        payload: basePayload
      });
    }
    events.push({
      ...nextZone.event,
      event_id: `${baseId}.floating_text`,
      type: "floating_text",
      target_entity: String(target.id),
      position: { x: position.x, y: position.y - 28 },
      direction,
      delay_ms: 0,
      duration_ms: 800,
      amount: damageAmount,
      payload: { ...basePayload, text: deps.damageNumberText(damageAmount) }
    });
    const knockbackChancePercent = clamp(Number(nextZone.payload.knockback_chance_percent ?? 0), 0, 100);
    const knockbackDistanceAddPercent = Number(nextZone.payload.knockback_distance_add_percent ?? 0);
    const knockbackDistance = deps.frontendBaseKnockbackDistance * Math.max(0, 1 + knockbackDistanceAddPercent / 100);
    if (knockbackChancePercent > 0 && knockbackDistance > 0 && deps.stablePercent(`${baseId}.knockback`) <= knockbackChancePercent) {
      const knockbackOrigin = deps.player;
      const knockbackDirection = guideDirection(knockbackOrigin, target);
      const knockbackPayload = {
        ...basePayload,
        origin_world_position: knockbackOrigin,
        movement_policy: "push_along_direction",
        movement_distance: knockbackDistance,
        knockback_chance_percent: knockbackChancePercent,
        knockback_distance_add_percent: knockbackDistanceAddPercent,
        knockback_lock_ms: Number(nextZone.payload.knockback_lock_ms ?? deps.frontendKnockbackLockMs)
      };
      events.push({
        ...nextZone.event,
        event_id: `${baseId}.forced_movement`,
        type: "forced_movement",
        target_entity: String(target.id),
        position,
        direction: knockbackDirection,
        delay_ms: 0,
        duration_ms: 0,
        amount: knockbackDistance,
        payload: knockbackPayload
      });
      events.push({
        ...nextZone.event,
        event_id: `${baseId}.knockback_text`,
        type: "floating_text",
        target_entity: String(target.id),
        position: { x: position.x, y: position.y - 52 },
        direction: knockbackDirection,
        delay_ms: 0,
        duration_ms: 650,
        amount: 0,
        payload: { ...knockbackPayload, text: "\u51fb\u9000" }
      });
    }
    const dynamicBuffApply = typeof nextZone.payload.dynamic_buff_apply === "object" && nextZone.payload.dynamic_buff_apply
      ? nextZone.payload.dynamic_buff_apply as Record<string, unknown>
      : null;
    if (dynamicBuffApply && deps.stablePercent(`${baseId}.buff_apply`) <= Number(dynamicBuffApply.chance_percent ?? 0)) {
      events.push({
        ...nextZone.event,
        event_id: `${baseId}.buff_apply`,
        type: "buff_apply",
        target_entity: String(target.id),
        position,
        direction,
        delay_ms: Math.max(0, Number(dynamicBuffApply.trigger_delay_ms ?? 0)),
        duration_ms: Math.max(0, Number(dynamicBuffApply.duration_ms ?? 0)),
        amount: null,
        payload: {
          ...basePayload,
          trigger_event_type: dynamicBuffApply.trigger_event_type ?? "damage_zone_hit",
          buff_type: dynamicBuffApply.buff_type ?? "",
          effect_type: dynamicBuffApply.effect_type ?? "damage_taken_increase",
          chance_percent: Number(dynamicBuffApply.chance_percent ?? 0),
          effect_per_stack: Number(dynamicBuffApply.effect_per_stack ?? 0),
          duration_ms: Math.max(0, Number(dynamicBuffApply.duration_ms ?? 0)),
          source_skill_id: dynamicBuffApply.source_skill_id ?? nextZone.event.skill_instance_id
        }
      });
    }
    const aggravationValue = Number(nextZone.payload.aggravation_value ?? 0);
    const aggravationCooldownMs = Math.max(1, Number(nextZone.payload.aggravation_cooldown_ms ?? 1000));
    if (aggravationValue > 0 && tickTimeMs % aggravationCooldownMs === 0) {
      events.push({
        ...nextZone.event,
        event_id: `${baseId}.status_apply`,
        type: "status_apply",
        target_entity: String(target.id),
        position,
        direction,
        delay_ms: 0,
        duration_ms: nextZone.event.duration_ms,
        amount: null,
        payload: {
          ...basePayload,
          status_type: "aggravation",
          source_skill_id: nextZone.event.skill_instance_id,
          base_value: aggravationValue,
          effect_per_stack: Number(nextZone.payload.dot_damage_bonus_per_10_aggravation_percent ?? 0),
          duration_ms: nextZone.event.duration_ms
        }
      });
    }
  }
  return { zone: nextZone, events };
}

export function damageZoneRectangleContains(
  point: WorldPoint,
  origin: WorldPoint,
  direction: WorldPoint,
  length: number,
  width: number
) {
  const facing = normalizedWorldDirection(direction);
  const right = { x: -facing.y, y: facing.x };
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const forward = dx * facing.x + dy * facing.y;
  const lateral = dx * right.x + dy * right.y;
  return forward >= 0 && forward <= length && Math.abs(lateral) <= width / 2;
}

export function activeDamageZoneTickProgressForZone(zone: ActiveDamageZoneRuntime | undefined) {
  if (!zone || zone.tickIntervalMs <= 0) return undefined;
  return 1 - clamp(zone.nextTickMs / zone.tickIntervalMs, 0, 1);
}

function cloneActiveDamageZoneRuntime(zone: ActiveDamageZoneRuntime): ActiveDamageZoneRuntime {
  return {
    ...zone,
    hitCounts: new Map(zone.hitCounts)
  };
}

function normalizedWorldDirection(direction: WorldPoint) {
  const length = Math.hypot(direction.x, direction.y) || 1;
  return { x: direction.x / length, y: direction.y / length };
}
