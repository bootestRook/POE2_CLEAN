import type { MonsterBossPatternSkill, MonsterDamageForm, MonsterDamageType, MonsterSkillDefinition } from "../monsterSkillRuntime";
import { distance } from "../utils/math2d";

type MonsterSkillPresentationSkill = MonsterSkillDefinition | MonsterBossPatternSkill;

type WorldPoint = {
  x: number;
  y: number;
};

type MonsterSkillSource = WorldPoint;

export function monsterSkillProjectileSpreadAngles(skill: MonsterSkillPresentationSkill, count: number, sequence: number) {
  const pattern = skill.projectile_pattern ?? "fan";
  if (count <= 1) return [0];
  if (pattern === "ring") {
    const step = 360 / count;
    const phase = (sequence % Math.max(1, count)) * step * 0.5;
    return Array.from({ length: count }, (_, index) => index * step + phase);
  }
  if (pattern === "spiral") {
    const step = Math.min(48, 360 / count);
    const start = -step * (count - 1) * 0.5 + (sequence % 5) * 14;
    return Array.from({ length: count }, (_, index) => start + index * step);
  }
  if (pattern === "cross") {
    const base = [0, 90, -90, 180, 45, -45, 135, -135];
    return Array.from({ length: count }, (_, index) => base[index % base.length]);
  }
  const spreadStep = pattern === "wide_fan"
    ? Math.min(30, 96 / Math.max(1, count - 1))
    : Math.min(16, 54 / Math.max(1, count - 1));
  return Array.from({ length: count }, (_, index) => (index - (count - 1) / 2) * spreadStep);
}

export function monsterSkillZoneCenters(
  enemy: MonsterSkillSource,
  target: WorldPoint,
  skill: MonsterSkillPresentationSkill,
  repeatIndex: number
) {
  const center = monsterSkillZoneCenter(enemy, target, skill);
  const pattern = skill.zone_pattern ?? "single";
  const count = Math.max(1, Math.round(Number(skill.zone_count ?? 1)));
  if (pattern === "single" || count <= 1 || skill.module === "monster_melee_arc") return [center];
  const spacing = Math.max(1, Number(skill.zone_spacing ?? Math.max(72, Number(skill.radius ?? skill.range.effect_range) * 1.35)));
  const direction = normalizedWorldDirection({ x: target.x - enemy.x, y: target.y - enemy.y });
  const perpendicular = { x: -direction.y, y: direction.x };
  if (pattern === "ring" || pattern === "around_player") {
    return Array.from({ length: count }, (_, index) => {
      const angle = (Math.PI * 2 * index) / count + repeatIndex * 0.38;
      return { x: center.x + Math.cos(angle) * spacing, y: center.y + Math.sin(angle) * spacing };
    });
  }
  if (pattern === "cross") {
    const offsets = [
      { x: 0, y: 0 },
      { x: spacing, y: 0 },
      { x: -spacing, y: 0 },
      { x: 0, y: spacing },
      { x: 0, y: -spacing },
      { x: spacing * 0.72, y: spacing * 0.72 },
      { x: -spacing * 0.72, y: -spacing * 0.72 },
      { x: spacing * 0.72, y: -spacing * 0.72 },
      { x: -spacing * 0.72, y: spacing * 0.72 }
    ];
    return offsets.slice(0, count).map((offset) => ({ x: center.x + offset.x, y: center.y + offset.y }));
  }
  if (pattern === "line") {
    return Array.from({ length: count }, (_, index) => {
      const offset = (index - (count - 1) / 2) * spacing;
      return { x: center.x + perpendicular.x * offset, y: center.y + perpendicular.y * offset };
    });
  }
  return [center];
}

export function monsterSkillZoneCenter(enemy: MonsterSkillSource, target: WorldPoint, skill: MonsterSkillPresentationSkill) {
  if (skill.id === "mon_skill_poison_weave_mist" || skill.id === "boss_star_mother_triple_mark") return { x: target.x, y: target.y };
  if (skill.module === "monster_damage_zone" && skill.range.min_cast_range !== undefined) {
    return clampMonsterSkillZoneCenter(enemy, target, skill);
  }
  return { x: enemy.x, y: enemy.y };
}

export function clampMonsterSkillZoneCenter(enemy: MonsterSkillSource, target: WorldPoint, skill: MonsterSkillPresentationSkill) {
  const direction = normalizedWorldDirection({ x: target.x - enemy.x, y: target.y - enemy.y });
  const placementDistance = Math.min(distance(enemy, target), Math.max(1, Number(skill.range.effect_range)));
  return {
    x: enemy.x + direction.x * placementDistance,
    y: enemy.y + direction.y * placementDistance
  };
}

export function monsterSkillDamageType(skill: MonsterSkillPresentationSkill): MonsterDamageType {
  return skill.damage_type;
}

export function monsterSkillDamageForm(skill: MonsterSkillPresentationSkill): MonsterDamageForm {
  return skill.damage_form;
}

export function monsterSkillVfxKey(skill: MonsterSkillPresentationSkill) {
  if (skill.id === "mon_skill_dust_ring_scrape") return "monster_dust_scrape";
  if (skill.id === "mon_skill_twilight_sentry_bolt") return "monster_twilight_sentry_bolt";
  if (skill.id === "mon_skill_mirror_amplify") return "monster_mirror_shard";
  if (skill.module === "monster_melee_arc") return `monster_melee_arc_${monsterSkillDamageType(skill) ?? "physical"}`;
  if (skill.damage_type === "fire") return "skill_event_ignite";
  if (skill.damage_type === "cold") return "skill_event_frost";
  if (skill.damage_type === "lightning") return "skill_event_sparkle_projectile";
  if (skill.damage_type === "chaos") return "skill_event_poison";
  return skill.module === "monster_projectile" ? "skill_event_sparkle_projectile" : "boss_damage_zone";
}

export function monsterSkillSuppressHitVfx(skill: MonsterSkillPresentationSkill) {
  return true;
}

export function monsterSkillProjectileAimPolicy(skill: MonsterSkillPresentationSkill) {
  return skill.id === "mon_skill_frost_crystal_slow_bolt" ? "target_current_position" : "authored_target_position";
}

function normalizedWorldDirection(direction: WorldPoint) {
  const length = Math.hypot(direction.x, direction.y) || 1;
  return { x: direction.x / length, y: direction.y / length };
}
