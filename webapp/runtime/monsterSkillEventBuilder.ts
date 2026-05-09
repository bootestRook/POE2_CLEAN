import type { MonsterBossPatternSkill, MonsterDamageForm, MonsterSkillDefinition } from "../monsterSkillRuntime";
import {
  monsterSkillDamageForm,
  monsterSkillDamageType,
  monsterSkillProjectileAimPolicy,
  monsterSkillProjectileSpreadAngles,
  monsterSkillSuppressHitVfx,
  monsterSkillVfxKey,
  monsterSkillZoneCenter,
  monsterSkillZoneCenters
} from "./monsterSkillPresentation";

type MonsterSkillBuilderSkill = MonsterSkillDefinition | MonsterBossPatternSkill;

type WorldPoint = {
  x: number;
  y: number;
};

type MonsterSkillSource = WorldPoint & {
  id: number;
};

export type MonsterSkillBuilderEvent = {
  event_id: string;
  type: "projectile_spawn" | "damage_zone_prime" | "damage_zone" | "melee_arc";
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
    skill_name?: string;
    [key: string]: unknown;
  };
};

export type MonsterSkillPendingDamageZoneHit = {
  id: string;
  boss: MonsterSkillSource;
  zones: {
    x: number;
    y: number;
    radius: number;
  }[];
  remainingMs: number;
  damageMultiplier: number;
  hitKind: string;
  damageType: string;
  damageForm?: MonsterDamageForm;
  leashRange?: number;
  sourceText?: string;
  hitMarkerId?: string;
  suppressHitVfx?: boolean;
};

export function buildMonsterSkillProjectileEvents({
  enemy,
  target,
  skill,
  sequence,
  nowMs
}: {
  enemy: MonsterSkillSource;
  target: WorldPoint;
  skill: MonsterSkillBuilderSkill;
  sequence: number;
  nowMs: number;
}): MonsterSkillBuilderEvent[] {
  const count = Math.max(1, Math.round(Number(skill.projectile_count ?? 1)));
  const baseDirection = guideDirection(enemy, target);
  const spreadAngles = monsterSkillProjectileSpreadAngles(skill, count, sequence);
  const events: MonsterSkillBuilderEvent[] = [];
  for (let index = 0; index < count; index += 1) {
    const offset = spreadAngles[index] ?? 0;
    const direction = normalizedWorldDirection(rotateDirection(baseDirection, offset));
    const speed = Math.max(1, Number(skill.projectile_speed ?? 300));
    const travel = Math.max(1, Number(skill.range.effect_range));
    const lifetimeMs = Math.round(travel / speed * 1000);
    const projectileId = `monster_${enemy.id}_${skill.id}_${sequence}_${index + 1}_${nowMs}`;
    const targetWorldPosition = { x: enemy.x + direction.x * travel, y: enemy.y + direction.y * travel };
    const aimPolicy = monsterSkillProjectileAimPolicy(skill);
    events.push({
      event_id: `${projectileId}.spawn`,
      type: "projectile_spawn",
      timestamp_ms: nowMs,
      source_entity: "boss",
      target_entity: "player",
      position: { x: enemy.x, y: enemy.y },
      direction,
      delay_ms: Math.max(0, Number(skill.windup_ms ?? 0)),
      duration_ms: lifetimeMs,
      amount: null,
      damage_type: monsterSkillDamageType(skill),
      skill_instance_id: skill.id,
      vfx_key: monsterSkillVfxKey(skill),
      sfx_key: "",
      reason_key: "monster_skill_projectile",
      payload: {
        skill_name: skill.chinese_form,
        skill_id: skill.id,
        projectile_id: projectileId,
        projectile_index: index + 1,
        projectile_count: count,
        spawn_world_position: { x: enemy.x, y: enemy.y },
        target_world_position: targetWorldPosition,
        expire_world_position: targetWorldPosition,
        direction_world: direction,
        velocity_world: { x: direction.x * speed, y: direction.y * speed },
        aim_policy: aimPolicy,
        spawn_policy: aimPolicy === "target_current_position" ? "source_current_position" : "authored_spawn_position",
        projectile_speed: speed,
        projectile_range: travel,
        projectile_width: Number(skill.projectile_width ?? skill.projectile_radius ?? 18) * 2,
        projectile_height: Number(skill.projectile_width ?? skill.projectile_radius ?? 18) * 2,
        projectile_radius: Number(skill.projectile_radius ?? 12),
        collision_radius: Number(skill.projectile_radius ?? 12),
        impact_radius: Number(skill.projectile_radius ?? 12),
        lifetime_ms: lifetimeMs,
        local_spread_angle: offset,
        projectile_visual_mode: "standard",
        trajectory: "linear",
        area_scale: 1,
        can_hit_player: true,
        source_enemy_id: enemy.id,
        player_damage_multiplier: Math.max(0, Number(skill.damage_multiplier ?? 1)),
        player_hit_kind: skill.hit_kind ?? "attack",
        player_leash_range: skill.range.leash_range,
        damage_form: monsterSkillDamageForm(skill),
        hit_marker_id: skill.hit_marker_id,
        suppress_hit_vfx: monsterSkillSuppressHitVfx(skill)
      }
    });
  }
  return events;
}

export function buildMonsterSkillMeleeZoneEvents({
  enemy,
  target,
  skill,
  sequence,
  nowMs,
  repeatIndex,
  repeatCount,
  damageAmount
}: {
  enemy: MonsterSkillSource;
  target: WorldPoint;
  skill: MonsterSkillBuilderSkill;
  sequence: number;
  nowMs: number;
  repeatIndex: number;
  repeatCount: number;
  damageAmount: number;
}): {
  events: MonsterSkillBuilderEvent[];
  pendingDamageZoneHit: MonsterSkillPendingDamageZoneHit;
} {
  const radius = Math.max(1, Number(skill.radius ?? skill.range.effect_range));
  const warningMs = Math.max(0, Number(skill.warning_ms ?? 0));
  const windupMs = Math.max(0, Number(skill.windup_ms ?? 0));
  const delayMs = warningMs > 0 ? warningMs : windupMs;
  const centers = monsterSkillZoneCenters(enemy, target, skill, repeatIndex);
  const zoneId = `monster_${enemy.id}_${skill.id}_${sequence}_${repeatIndex}_${Math.round(nowMs)}`;
  const events: MonsterSkillBuilderEvent[] = [];
  centers.forEach((center, zoneIndex) => {
    const directionTarget = skill.module === "monster_melee_arc" ? target : center;
    const direction = guideDirection(enemy, directionTarget);
    const indexedZoneId = centers.length > 1 ? `${zoneId}_${zoneIndex + 1}` : zoneId;
    const basePayload = {
      skill_name: skill.chinese_form,
      skill_id: skill.id,
      zone_id: indexedZoneId,
      zone_index: zoneIndex + 1,
      zone_count: centers.length,
      repeat_index: repeatIndex,
      repeat_count: repeatCount,
      shape: "circle",
      radius,
      origin_world_position: center,
      direction_world: direction,
      vfx_key: monsterSkillVfxKey(skill),
      damage_amount: damageAmount * Math.max(0, Number(skill.damage_multiplier ?? 1)),
      max_hits: 1,
      max_hits_per_target: 1,
      damage_form: monsterSkillDamageForm(skill),
      hit_marker_id: skill.hit_marker_id,
      trigger_marker_id: skill.trigger_marker_id,
      suppress_hit_vfx: monsterSkillSuppressHitVfx(skill)
    };
    if (warningMs > 0) {
      events.push({
        event_id: `${indexedZoneId}.prime`,
        type: "damage_zone_prime",
        timestamp_ms: nowMs,
        source_entity: "boss",
        target_entity: "player",
        position: center,
        direction,
        delay_ms: 0,
        duration_ms: warningMs,
        amount: null,
        damage_type: monsterSkillDamageType(skill),
        skill_instance_id: skill.id,
        vfx_key: monsterSkillVfxKey(skill),
        sfx_key: "",
        reason_key: "monster_skill_damage_zone_prime",
        payload: basePayload
      });
    }
    events.push({
      event_id: `${indexedZoneId}.damage_zone`,
      type: skill.module === "monster_melee_arc" ? "melee_arc" : "damage_zone",
      timestamp_ms: nowMs,
      source_entity: "boss",
      target_entity: "player",
      position: center,
      direction,
      delay_ms: delayMs,
      duration_ms: Math.max(220, Number(skill.duration_ms ?? 420)),
      amount: null,
      damage_type: monsterSkillDamageType(skill),
      skill_instance_id: skill.id,
      vfx_key: monsterSkillVfxKey(skill),
      sfx_key: "",
      reason_key: "monster_skill_damage_zone",
      payload: {
        ...basePayload,
        arc_angle: Number(skill.arc_angle ?? 120),
        arc_radius: radius,
        range: radius
      }
    });
  });
  const center = centers[0] ?? monsterSkillZoneCenter(enemy, target, skill);
  return {
    events,
    pendingDamageZoneHit: {
      id: zoneId,
      boss: enemy,
      zones: centers.length === 1 ? [{ ...center, radius }] : centers.map((center) => ({ ...center, radius })),
      remainingMs: delayMs,
      damageMultiplier: Math.max(0, Number(skill.damage_multiplier ?? 1)),
      hitKind: skill.hit_kind ?? "attack",
      damageType: monsterSkillDamageType(skill),
      damageForm: monsterSkillDamageForm(skill),
      leashRange: skill.range.leash_range,
      sourceText: skill.chinese_form,
      hitMarkerId: skill.hit_marker_id,
      suppressHitVfx: monsterSkillSuppressHitVfx(skill)
    }
  };
}

function guideDirection(source: WorldPoint, target: WorldPoint) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

function normalizedWorldDirection(direction: WorldPoint) {
  const length = Math.hypot(direction.x, direction.y) || 1;
  return { x: direction.x / length, y: direction.y / length };
}

function rotateDirection(direction: WorldPoint, angleDeg: number) {
  if (!angleDeg) return direction;
  const radians = angleDeg * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: direction.x * cos - direction.y * sin,
    y: direction.x * sin + direction.y * cos
  };
}
