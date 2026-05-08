export const MONSTER_SKILL_PLAYER_MOVE_SPEED_BASELINE = 250;
export const MONSTER_PROJECTILE_SPEED_CAP_NON_BOSS = MONSTER_SKILL_PLAYER_MOVE_SPEED_BASELINE * 2;
export const MONSTER_PROJECTILE_SPEED_CAP_BOSS = MONSTER_SKILL_PLAYER_MOVE_SPEED_BASELINE * 2.4;

export type MonsterSkillModule =
  | "monster_projectile"
  | "monster_damage_zone"
  | "monster_melee_arc"
  | "monster_charge"
  | "monster_ambush"
  | "monster_guard"
  | "monster_support";

export type MonsterSkillRole = "basic" | "pressure" | "major" | "movement" | "defensive" | "support";

export type MonsterDamageType = "physical" | "fire" | "cold" | "lightning" | "chaos";

export type MonsterDamageForm = "hit" | "dot" | "secondary" | "reflection";

export type MonsterSkillRange = {
  cast_range: number;
  min_cast_range?: number;
  effect_range: number;
  leash_range: number;
};

export type MonsterSkillDefinition = {
  id: string;
  module: MonsterSkillModule;
  chinese_form: string;
  range: MonsterSkillRange;
  cooldown_ms: number;
  windup_ms?: number;
  duration_ms?: number;
  damage_multiplier?: number;
  damage_type: MonsterDamageType;
  damage_form: MonsterDamageForm;
  hit_kind?: "attack" | "spell";
  projectile_speed?: number;
  projectile_count?: number;
  projectile_width?: number;
  projectile_radius?: number;
  projectile_pattern?: "fan" | "wide_fan" | "ring" | "spiral" | "cross";
  radius?: number;
  arc_angle?: number;
  warning_ms?: number;
  repeat_count?: number;
  repeat_interval_ms?: number;
  zone_pattern?: "single" | "around_player" | "ring" | "cross" | "line";
  zone_count?: number;
  zone_spacing?: number;
  buff_radius?: number;
  buff_damage_multiplier?: number;
  buff_duration_ms?: number;
  heal_percent_max_life?: number;
  guard_damage_reduction_percent?: number;
  guard_duration_ms?: number;
  hit_marker_id?: string;
  trigger_marker_id?: string;
};

export type MonsterBossPatternSkill = MonsterSkillDefinition & {
  role: MonsterSkillRole;
  initial_cooldown_ms?: number;
};

export type MonsterBossPattern = {
  id: string;
  monster_id: string;
  chinese_form: string;
  skills: MonsterBossPatternSkill[];
};

export type MonsterSkillAssignment = {
  monster_id: string;
  skill_id?: string;
  boss_pattern_id?: string;
  chinese_form: string;
};

export type MonsterSkillConfig = {
  version: number;
  player_move_speed_px_per_sec: number;
  skills: MonsterSkillDefinition[];
  boss_patterns: MonsterBossPattern[];
  assignments: MonsterSkillAssignment[];
};

export type MonsterSkillRuntimeTimer = {
  aggroStartedAtMs?: number;
  readyAtBySkillId: Record<string, number>;
  sequenceBySkillId: Record<string, number>;
};

export type MonsterSkillReleaseCandidate = {
  skill: MonsterSkillDefinition | MonsterBossPatternSkill;
  pattern?: MonsterBossPattern;
  sequence: number;
  readyAtMs: number;
};

const MODULES = new Set<MonsterSkillModule>([
  "monster_projectile",
  "monster_damage_zone",
  "monster_melee_arc",
  "monster_charge",
  "monster_ambush",
  "monster_guard",
  "monster_support"
]);

const MONSTER_DAMAGE_TYPES = new Set<MonsterDamageType>(["physical", "fire", "cold", "lightning", "chaos"]);

const MONSTER_DAMAGE_FORMS = new Set<MonsterDamageForm>(["hit", "dot", "secondary", "reflection"]);

export function validateMonsterSkillConfig(config: MonsterSkillConfig, monsterIds: string[]) {
  const errors: string[] = [];
  const monsterIdSet = new Set(monsterIds);
  const skillIds = new Set<string>();
  const patternIds = new Set<string>();
  const assignmentsByMonster = new Map<string, MonsterSkillAssignment[]>();

  if (!Number.isFinite(config.player_move_speed_px_per_sec) || config.player_move_speed_px_per_sec !== MONSTER_SKILL_PLAYER_MOVE_SPEED_BASELINE) {
    errors.push("monster skill config must use the 250 px/s player speed baseline");
  }

  for (const skill of config.skills ?? []) {
    validateSkillDefinition(skill, false, errors);
    if (skillIds.has(skill.id)) errors.push(`duplicate monster skill id: ${skill.id}`);
    skillIds.add(skill.id);
  }

  for (const pattern of config.boss_patterns ?? []) {
    if (!pattern.id) errors.push("boss pattern missing id");
    if (patternIds.has(pattern.id)) errors.push(`duplicate boss pattern id: ${pattern.id}`);
    patternIds.add(pattern.id);
    if (!monsterIdSet.has(pattern.monster_id)) errors.push(`boss pattern references missing monster: ${pattern.monster_id}`);
    if (!hasChineseText(pattern.chinese_form)) errors.push(`boss pattern missing Chinese form: ${pattern.id}`);
    if (!Array.isArray(pattern.skills) || pattern.skills.length < 3) errors.push(`boss pattern requires at least three skills: ${pattern.id}`);
    for (const skill of pattern.skills ?? []) {
      validateSkillDefinition(skill, true, errors);
      if (skill.role === "major") {
        if (!finitePositive(skill.initial_cooldown_ms)) errors.push(`major boss skill missing positive initial_cooldown_ms: ${pattern.id}/${skill.id}`);
        if (!finitePositive(skill.cooldown_ms)) errors.push(`major boss skill missing positive cooldown_ms: ${pattern.id}/${skill.id}`);
      }
    }
  }

  for (const assignment of config.assignments ?? []) {
    if (!monsterIdSet.has(assignment.monster_id)) errors.push(`assignment references missing monster: ${assignment.monster_id}`);
    if (!hasChineseText(assignment.chinese_form)) errors.push(`assignment missing Chinese skill form: ${assignment.monster_id}`);
    const targets = [assignment.skill_id, assignment.boss_pattern_id].filter(Boolean);
    if (targets.length !== 1) errors.push(`assignment must reference exactly one skill or boss pattern: ${assignment.monster_id}`);
    if (assignment.skill_id && !skillIds.has(assignment.skill_id)) errors.push(`assignment references missing skill: ${assignment.monster_id}/${assignment.skill_id}`);
    if (assignment.boss_pattern_id && !patternIds.has(assignment.boss_pattern_id)) errors.push(`assignment references missing boss pattern: ${assignment.monster_id}/${assignment.boss_pattern_id}`);
    const existing = assignmentsByMonster.get(assignment.monster_id) ?? [];
    existing.push(assignment);
    assignmentsByMonster.set(assignment.monster_id, existing);
  }

  for (const monsterId of monsterIds) {
    const count = assignmentsByMonster.get(monsterId)?.length ?? 0;
    if (count !== 1) errors.push(`monster must have exactly one skill assignment: ${monsterId}`);
  }

  return errors;
}

export function monsterSkillAssignmentFor(config: MonsterSkillConfig, monsterId?: string) {
  return monsterId ? config.assignments.find((assignment) => assignment.monster_id === monsterId) ?? null : null;
}

export function monsterSkillDefinitionFor(config: MonsterSkillConfig, skillId?: string) {
  return skillId ? config.skills.find((skill) => skill.id === skillId) ?? null : null;
}

export function monsterBossPatternFor(config: MonsterSkillConfig, patternId?: string) {
  return patternId ? config.boss_patterns.find((pattern) => pattern.id === patternId) ?? null : null;
}

export function monsterSkillDistanceAllowed(skill: Pick<MonsterSkillDefinition, "range" | "module" | "damage_multiplier" | "radius">, distancePx: number) {
  if (!Number.isFinite(distancePx)) return false;
  if (distancePx > monsterSkillEffectiveCastRange(skill)) return false;
  if (skill.range.min_cast_range !== undefined && distancePx < skill.range.min_cast_range) return false;
  return true;
}

function monsterSkillEffectiveCastRange(skill: Pick<MonsterSkillDefinition, "range" | "module" | "damage_multiplier" | "radius">) {
  if (skill.module === "monster_guard" && Number(skill.damage_multiplier ?? 0) > 0) {
    return Math.max(1, Number(skill.radius ?? skill.range.effect_range));
  }
  return skill.range.cast_range;
}

export function monsterSkillHitAllowed(skill: Pick<MonsterSkillDefinition, "range">, distancePx: number) {
  return Number.isFinite(distancePx) && distancePx <= skill.range.leash_range;
}

export function nextMonsterSkillCandidate(
  config: MonsterSkillConfig,
  assignment: MonsterSkillAssignment | null,
  timer: MonsterSkillRuntimeTimer,
  nowMs: number,
  distancePx: number,
  aggroLocked: boolean
): MonsterSkillReleaseCandidate | null {
  if (!assignment || !aggroLocked) return null;
  if (assignment.skill_id) {
    const skill = monsterSkillDefinitionFor(config, assignment.skill_id);
    if (!skill || !monsterSkillDistanceAllowed(skill, distancePx)) return null;
    const readyAtMs = timer.readyAtBySkillId[skill.id] ?? 0;
    if (nowMs < readyAtMs) return null;
    const sequence = timer.sequenceBySkillId[skill.id] ?? 0;
    return { skill, sequence, readyAtMs };
  }
  const pattern = monsterBossPatternFor(config, assignment.boss_pattern_id);
  if (!pattern) return null;
  const aggroStartedAtMs = timer.aggroStartedAtMs;
  const candidates = pattern.skills
    .filter((skill) => monsterSkillDistanceAllowed(skill, distancePx))
    .map((skill) => {
      const firstReadyAt = skill.role === "major"
        ? (aggroStartedAtMs === undefined ? Number.POSITIVE_INFINITY : aggroStartedAtMs + Math.max(1, Number(skill.initial_cooldown_ms ?? skill.cooldown_ms)))
        : (aggroStartedAtMs ?? nowMs) + Math.max(0, Number(skill.initial_cooldown_ms ?? 0));
      const readyAtMs = timer.readyAtBySkillId[skill.id] ?? firstReadyAt;
      return { skill, pattern, sequence: timer.sequenceBySkillId[skill.id] ?? 0, readyAtMs };
    })
    .filter((candidate) => nowMs >= candidate.readyAtMs)
    .sort((left, right) => {
      const roleWeight = (role: MonsterSkillRole) => role === "major" ? 0 : role === "pressure" ? 1 : 2;
      return roleWeight(left.skill.role) - roleWeight(right.skill.role) || left.readyAtMs - right.readyAtMs || left.skill.id.localeCompare(right.skill.id);
    });
  return candidates[0] ?? null;
}

export function markMonsterSkillReleased(timer: MonsterSkillRuntimeTimer, skill: MonsterSkillDefinition | MonsterBossPatternSkill, nowMs: number) {
  timer.readyAtBySkillId[skill.id] = nowMs + Math.max(1, Number(skill.cooldown_ms));
  timer.sequenceBySkillId[skill.id] = (timer.sequenceBySkillId[skill.id] ?? 0) + 1;
}

export function createMonsterSkillTimer(): MonsterSkillRuntimeTimer {
  return { readyAtBySkillId: {}, sequenceBySkillId: {} };
}

function validateSkillDefinition(skill: MonsterSkillDefinition, boss: boolean, errors: string[]) {
  if (!skill.id) errors.push("monster skill missing id");
  if (!MODULES.has(skill.module)) errors.push(`invalid monster skill module: ${skill.id}/${skill.module}`);
  if (!hasChineseText(skill.chinese_form)) errors.push(`monster skill missing Chinese form: ${skill.id}`);
  validateDamageClassification(skill, errors);
  validateRange(skill.id, skill.range, errors);
  if (!finitePositive(skill.cooldown_ms)) errors.push(`monster skill missing positive cooldown_ms: ${skill.id}`);
  if (skill.projectile_speed !== undefined) validateProjectileSpeed(skill, boss, errors);
}

function validateDamageClassification(skill: MonsterSkillDefinition, errors: string[]) {
  const damageType = skill.damage_type as string | undefined;
  if (damageType === undefined) {
    errors.push(`monster skill missing damage_type: ${skill.id}`);
  } else if (damageType === "attack" || damageType === "spell") {
    errors.push(`hit_kind must not be used as damage_type: ${skill.id}`);
  } else if (!MONSTER_DAMAGE_TYPES.has(damageType as MonsterDamageType)) {
    errors.push(`invalid monster skill damage_type: ${skill.id}/${damageType}`);
  }

  const damageForm = skill.damage_form as string | undefined;
  if (damageForm === undefined) {
    errors.push(`monster skill missing damage_form: ${skill.id}`);
  } else if (!MONSTER_DAMAGE_FORMS.has(damageForm as MonsterDamageForm)) {
    errors.push(`invalid monster skill damage_form: ${skill.id}/${damageForm}`);
  }
}

function validateRange(id: string, range: MonsterSkillRange | undefined, errors: string[]) {
  if (!range) {
    errors.push(`monster skill missing range: ${id}`);
    return;
  }
  if (!finitePositive(range.cast_range)) errors.push(`monster skill invalid cast_range: ${id}`);
  if (!finitePositive(range.effect_range)) errors.push(`monster skill invalid effect_range: ${id}`);
  if (!finitePositive(range.leash_range)) errors.push(`monster skill invalid leash_range: ${id}`);
  if (range.min_cast_range !== undefined && (!Number.isFinite(range.min_cast_range) || range.min_cast_range < 0)) errors.push(`monster skill invalid min_cast_range: ${id}`);
  if (finitePositive(range.cast_range) && finitePositive(range.leash_range) && range.leash_range < range.cast_range) errors.push(`monster skill leash_range below cast_range: ${id}`);
}

function validateProjectileSpeed(skill: MonsterSkillDefinition, boss: boolean, errors: string[]) {
  const speed = Number(skill.projectile_speed);
  if (!finitePositive(speed)) {
    errors.push(`monster projectile invalid speed: ${skill.id}`);
    return;
  }
  if (!boss && speed > MONSTER_PROJECTILE_SPEED_CAP_NON_BOSS) errors.push(`non-boss projectile exceeds ${MONSTER_PROJECTILE_SPEED_CAP_NON_BOSS}px/s: ${skill.id}`);
  if (boss && speed > MONSTER_PROJECTILE_SPEED_CAP_BOSS) errors.push(`boss projectile exceeds ${MONSTER_PROJECTILE_SPEED_CAP_BOSS}px/s: ${skill.id}`);
  if (speed > MONSTER_PROJECTILE_SPEED_CAP_NON_BOSS) {
    const warning = Math.max(0, Number(skill.warning_ms ?? 0));
    const windup = Math.max(0, Number(skill.windup_ms ?? 0));
    const width = Math.max(0, Number(skill.projectile_width ?? skill.projectile_radius ?? 99));
    const count = Math.max(1, Number(skill.projectile_count ?? 1));
    const cooldown = Math.max(0, Number(skill.cooldown_ms ?? 0));
    if (warning + windup < 700 && width > 26 && count > 3 && cooldown < 2500) {
      errors.push(`fast projectile lacks counterplay budget: ${skill.id}`);
    }
  }
}

function finitePositive(value: unknown) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function hasChineseText(value: unknown) {
  return typeof value === "string" && /[\u3400-\u9FFF]/.test(value);
}
