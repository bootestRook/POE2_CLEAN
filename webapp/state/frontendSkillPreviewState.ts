import { FRONTEND_INITIAL_APP_STATE, FRONTEND_SKILL_PREVIEWS_BY_SKILL_TAG } from "../frontendGameData";
import { FRONTEND_SKILL_LEVEL_TABLES } from "../frontendSkillLevelTables";
import {
  applyFrontendEquipmentStatModifiers,
  frontendEquipmentStatModifiers,
} from "../frontendEquipmentRuntime";
import type { FrontendEquipmentAffixRoll, FrontendEquipmentItem, FrontendEquipmentStatModifier } from "../frontendEquipmentRuntime";
import { isActiveGem, isPassiveGem, isSupportGem } from "../components/inventory/equipmentRules";
import type { CharacterPanelView } from "../components/character/CharacterInfoPanel";
import type { TooltipView } from "../components/tooltips/tooltipViewModel";
import type {
  FrontendPassiveEffect,
  ShapeEffectPreview,
  SkillAppliedModifier,
  SkillPreview
} from "../types/skillPreviewTypes";
import { clamp } from "../utils/math2d";

export type { FrontendPassiveEffect, ShapeEffectPreview, SkillAppliedModifier, SkillPreview } from "../types/skillPreviewTypes";

export type FrontendPreviewGem = {
  instance_id: string;
  base_gem_id?: string;
  item_kind?: "gem" | "ordinary" | "equipment";
  name_text: string;
  description_text?: string;
  category_text: string;
  rarity_text: string;
  gem_kind?: "active_skill" | "passive_skill" | "support" | "";
  sudoku_digit?: number;
  gem_type: { id?: string; number?: number; display_text: string; identity_text: string };
  tags: readonly { id?: string; text: string }[];
  current_effective_targets: readonly { name_text: string }[];
  board_position: { row: number; column: number } | null;
  visual_effect?: string;
  shape_effect?: string;
  shape_effect_text?: string;
  tooltip_view?: TooltipView;
  base_effect?: {
    base_release_interval_ms?: number;
    release_interval_ms?: number;
  };
  level?: number;
  equipment_affixes?: FrontendEquipmentAffixRoll[];
  equipment_stat_modifiers?: FrontendEquipmentStatModifier[];
  equipment_slot_id?: string;
  equipment_rarity?: string;
  passive_effects?: FrontendPassiveEffect[];
  locked?: boolean;
};

type FrontendPreviewCell = {
  row: number;
  column: number;
  box: number;
  gem: FrontendPreviewGem | null;
};

export type FrontendPreviewPlayerStatView = {
  label_text: string;
  value: number | boolean;
  value_type: string;
  category: string;
  v1_status: string;
  runtime_effective: boolean;
  affix_spawn_enabled_v1: boolean;
};

export type FrontendPreviewState = {
  inventory: FrontendPreviewGem[];
  board: {
    cells: FrontendPreviewCell[][];
  };
  skill_preview: SkillPreview[];
  skill_error: string | null;
  player_stats?: Record<string, FrontendPreviewPlayerStatView>;
  character_panel?: CharacterPanelView;
  equipment_slots?: (string | null)[];
};

function cloneFrontendData<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

export function frontendSkillPreviewsBySkillTag(): Record<string, SkillPreview> {
  return FRONTEND_SKILL_PREVIEWS_BY_SKILL_TAG as unknown as Record<string, SkillPreview>;
}

function statNumber(stat: FrontendPreviewPlayerStatView | undefined, fallback: number) {
  return typeof stat?.value === "number" ? stat.value : fallback;
}

function statValue(stats: Record<string, number | boolean> | undefined, stat: string) {
  const value = stats?.[stat];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function isAllowedRoute(source: FrontendPreviewGem, target: FrontendPreviewGem) {
  if (isSupportGem(source)) return isActiveGem(target) || isPassiveGem(target);
  if (isPassiveGem(source)) return isActiveGem(target);
  return false;
}

function defaultFrontendExtraProjectileSpreadAngle(projectileCount: number) {
  return Math.min(60, 12 * Math.max(0, Math.round(projectileCount) - 1));
}

function frontendSkillTagForGem(gem: FrontendPreviewGem) {
  return gem.tags.find((tag) => typeof tag.id === "string" && tag.id.startsWith("skill_"))?.id ?? "";
}

function frontendEquippedEquipmentModifiers(state: FrontendPreviewState, equipmentSlotCount: number) {
  const byId = new Map(state.inventory.map((item) => [item.instance_id, item]));
  const equippedIds = new Set((state.equipment_slots ?? []).slice(0, equipmentSlotCount).filter(Boolean) as string[]);
  const modifiers: FrontendEquipmentStatModifier[] = [];
  equippedIds.forEach((instanceId) => {
    const item = byId.get(instanceId);
    modifiers.push(...frontendEquipmentModifiersForInventoryItem(item));
  });
  return modifiers;
}

function frontendEquipmentModifiersForInventoryItem(item: FrontendPreviewGem | undefined): FrontendEquipmentStatModifier[] {
  if (!item || item.item_kind !== "equipment") return [];
  const affixes = item.equipment_affixes ?? [];
  if (affixes.length === 0) return item.equipment_stat_modifiers ?? [];
  const equipmentItem: FrontendEquipmentItem = {
    source: item.category_text,
    level: Number(item.level ?? 1),
    rarity: item.equipment_rarity ?? item.rarity_text,
    base_affix: affixes.find((affix) => affix.gen === "base") ?? affixes[0],
    prefix_affixes: affixes.filter((affix) => affix.gen === "prefix"),
    suffix_affixes: affixes.filter((affix) => affix.gen === "suffix"),
  };
  return frontendEquipmentStatModifiers(equipmentItem);
}

function frontendAuraEffectAddPercent(modifiers: readonly FrontendEquipmentStatModifier[]) {
  return modifiers
    .filter((modifier) => modifier.kind !== "runtime_hook" && modifier.stat === "aura_effect_add_percent")
    .reduce((total, modifier) => total + modifier.value, 0);
}

function isFrontendAuraEffectGem(gem: FrontendPreviewGem) {
  const gemType = frontendRecord(gem.gem_type);
  const tags = gem.tags.map((tag) => tag.id ?? tag.text);
  return Number(gem.sudoku_digit ?? gemType.number) === 2
    || String(gemType.id ?? "") === "gem_type_2"
    || String(gemType.color_key ?? "") === "blue"
    || tags.includes("gem_type_2")
    || tags.includes("aura");
}

function frontendAuraEffectMultiplier(gem: FrontendPreviewGem, auraEffectAddPercent: number) {
  return isFrontendAuraEffectGem(gem) ? Math.max(0, 1 + auraEffectAddPercent / 100) : 1;
}

function frontendMountedPassiveSelfStatModifiers(state: FrontendPreviewState, auraEffectAddPercent = 0): FrontendEquipmentStatModifier[] {
  const itemById = new Map(state.inventory.map((item) => [item.instance_id, item]));
  const modifiers: FrontendEquipmentStatModifier[] = [];
  for (const cell of state.board.cells.flat()) {
    const gem = cell.gem ? itemById.get(cell.gem.instance_id) ?? cell.gem : null;
    if (!gem || !isPassiveGem(gem)) continue;
    const auraMultiplier = frontendAuraEffectMultiplier(gem, auraEffectAddPercent);
    const baseGemId = String(gem.base_gem_id ?? gem.instance_id);
    const level = Math.max(1, Math.floor(Number(gem.level ?? 1)));
    for (const effect of frontendPassiveSelfStatEffects(gem)) {
      const stat = String(effect.stat ?? "");
      if (!stat) continue;
      const baseValue = Number(effect.value ?? 0);
      const value = frontendSkillLevelTableValueById(baseGemId, level, stat) ?? baseValue;
      if (!Number.isFinite(value) || value === 0) continue;
      modifiers.push({
        source_modifier_id: `${gem.instance_id}:self_stat:${stat}`,
        kind: "player_stat",
        stat,
        value: value * auraMultiplier,
        reason_key: "modifier.passive_self_stat",
      });
    }
  }
  return modifiers;
}

export function recalculateFrontendSkillPreview<TState extends FrontendPreviewState>(state: TState, equipmentSlotCount: number): TState {
  const nextSkills: SkillPreview[] = [];
  const equipmentSkillModifiers = frontendEquippedEquipmentModifiers(state, equipmentSlotCount).filter((modifier) => modifier.kind !== "player_stat");
  const itemById = new Map(state.inventory.map((item) => [item.instance_id, item]));
  for (const row of state.board.cells) {
    for (const cell of row) {
      const gem = cell.gem;
      if (!gem || gem.gem_kind !== "active_skill") continue;
      const skillTag = frontendSkillTagForGem(gem);
      const template = frontendSkillPreviewsBySkillTag()[skillTag];
      if (!template) continue;
      const fullGem = itemById.get(gem.instance_id) ?? gem;
      const supportModifiers = frontendSupportSkillModifiersForTarget(state, fullGem, template, equipmentSkillModifiers, itemById);
      nextSkills.push(applyFrontendEquipmentSkillModifiers({
        ...frontendSkillPreviewForGemLevel(cloneFrontendData(template), fullGem),
        active_gem_instance_id: fullGem.instance_id,
        name_text: fullGem.name_text,
      }, fullGem, [...supportModifiers.modifiers, ...equipmentSkillModifiers], supportModifiers.appliedModifiers));
    }
  }
  return {
    ...state,
    skill_preview: nextSkills,
    skill_error: null,
  } as TState;
}

function frontendSupportSkillModifiersForTarget(
  state: FrontendPreviewState,
  targetGem: FrontendPreviewGem,
  skill: SkillPreview,
  equipmentSkillModifiers: FrontendEquipmentStatModifier[],
  itemById: Map<string, FrontendPreviewGem>
) {
  const modifiers: FrontendEquipmentStatModifier[] = [];
  const appliedModifiers: SkillAppliedModifier[] = [];
  const targetTags = new Set(targetGem.tags.map((tag) => tag.id ?? tag.text));
  const auraEffectAddPercent = frontendAuraEffectAddPercent(equipmentSkillModifiers);
  const supportLevelAdd = Math.max(0, Math.floor(equipmentSkillModifiers
    .filter((modifier) => modifier.kind !== "runtime_hook" && modifier.stat === "support_gem_level_add")
    .reduce((total, modifier) => total + modifier.value, 0)));
  for (const sourceCell of state.board.cells.flat()) {
    const sourceGem = sourceCell.gem ? itemById.get(sourceCell.gem.instance_id) ?? sourceCell.gem : null;
    if (!sourceGem || sourceGem.instance_id === targetGem.instance_id || !(isSupportGem(sourceGem) || isPassiveGem(sourceGem))) continue;
    if (!isAllowedRoute(sourceGem, targetGem)) continue;
    const relation = frontendModifierRelation(sourceGem, targetGem);
    if (!relation) continue;
    if (!frontendConduitCanUseTarget(sourceGem, targetGem)) continue;
    if (!frontendSupportCanAffect(sourceGem, targetTags)) continue;
    const sourceLevel = frontendModifierSourceLevel(sourceGem, supportLevelAdd);
    const auraMultiplier = frontendAuraEffectMultiplier(sourceGem, auraEffectAddPercent);
    for (const modifier of frontendSkillTargetModifiers(sourceGem, sourceLevel)) {
      const modifierStat = frontendRecord(modifier.stat);
      const stat = String(modifierStat.id ?? "");
      if (!stat) continue;
      const baseValue = Number(modifier.value ?? 0);
      const tableKey = String(modifier.table_key ?? stat);
      const value = frontendSkillLevelTableValueById(frontendSupportLevelTableId(sourceGem), sourceLevel, tableKey) ?? baseValue;
      if (!Number.isFinite(value) || value === 0) continue;
      const appliedValue = frontendSupportModifierAppliedValue(stat, value, relation) * auraMultiplier;
      modifiers.push({
        source_modifier_id: `${sourceGem.instance_id}:${targetGem.instance_id}:${stat}`,
        kind: "skill_stat",
        stat,
        value: appliedValue,
        reason_key: "modifier.support_base",
      });
      appliedModifiers.push({
        source_instance_id: sourceGem.instance_id,
        source_name_text: sourceGem.name_text,
        target_instance_id: targetGem.instance_id,
        stat: { id: stat, text: String(modifierStat.text ?? stat) },
        value: appliedValue,
        relation_text: frontendRelationText(relation),
        reason_text: frontendModifierReasonText(sourceGem, sourceLevel, supportLevelAdd),
        applied: true,
      });
    }
  }
  return { modifiers, appliedModifiers };
}

function frontendModifierRelation(sourceGem: FrontendPreviewGem, targetGem: FrontendPreviewGem) {
  if (isPassiveGem(sourceGem) && isActiveGem(targetGem)) {
    return sourceGem.board_position && targetGem.board_position ? "board_wide" : "";
  }
  return frontendBoardRelation(sourceGem.board_position, targetGem.board_position);
}

function frontendModifierSourceLevel(sourceGem: FrontendPreviewGem, supportLevelAdd: number) {
  if (isSupportGem(sourceGem)) return frontendSupportEffectiveLevel(sourceGem, supportLevelAdd);
  return Math.max(1, Math.floor(Number(sourceGem.level ?? 1)));
}

function frontendModifierReasonText(sourceGem: FrontendPreviewGem, sourceLevel: number, supportLevelAdd: number) {
  if (isPassiveGem(sourceGem)) return "\u88ab\u52a8\u6280\u80fd\u6548\u679c";
  return supportLevelAdd ? `\u8f85\u52a9\u7b49\u7ea7 ${sourceLevel}` : "\u8f85\u52a9\u57fa\u7840\u6548\u679c";
}

function frontendSkillTargetModifiers(sourceGem: FrontendPreviewGem, sourceLevel: number) {
  const modifiers = frontendSupportBaseModifiers(sourceGem, sourceLevel);
  if (!isPassiveGem(sourceGem)) return modifiers;
  return modifiers.filter((modifier) => String(modifier.target_text ?? "").includes("\u5f71\u54cd\u4e3b\u52a8\u6280\u80fd"));
}

function frontendSkillPreviewForGemLevel(skill: SkillPreview, gem: FrontendPreviewGem): SkillPreview {
  const sourceContext = frontendRecord(skill.source_context);
  const templateLevel = Math.max(1, Math.floor(Number(sourceContext.effective_gem_level ?? sourceContext.base_gem_level ?? 1)));
  const targetLevel = frontendSkillClampedLevel(skill, Math.max(1, Math.floor(Number(gem.level ?? templateLevel))));
  const levelValues = frontendSkillLevelTableValues(skill, targetLevel);

  const currentBaseDamage = frontendSkillLevelValue(skill, "base_damage", templateLevel, Number(skill.base_damage ?? skill.final_damage ?? 0), templateLevel);
  const targetBaseDamage = frontendLevelValueNumber(levelValues, "base_damage", frontendSkillLevelValue(skill, "base_damage", targetLevel, currentBaseDamage, templateLevel));
  const damageScale = currentBaseDamage > 0 && targetBaseDamage > 0 ? targetBaseDamage / currentBaseDamage : 1;
  const nextHit = { ...(skill.hit ?? {}) };
  const hitComponentTotal = frontendDamageMapTotal(nextHit.damage_components);
  const hitConfigScale = hitComponentTotal > 0 && targetBaseDamage > 0 ? targetBaseDamage / hitComponentTotal : damageScale;
  if (typeof nextHit.base_damage === "number") nextHit.base_damage = targetBaseDamage;
  if (nextHit.damage_components && typeof nextHit.damage_components === "object" && !Array.isArray(nextHit.damage_components)) {
    nextHit.damage_components = frontendLevelDamageComponents(levelValues, "hit_damage_component_") ?? normalizeFrontendDamageMapTotal(nextHit.damage_components, targetBaseDamage);
  }
  if (Array.isArray(nextHit.ailments)) {
    nextHit.ailments = applyFrontendAilmentLevelValues(nextHit.ailments, levelValues, "hit_ailment_");
  }
  if (Array.isArray(nextHit.secondary_hits)) {
    nextHit.secondary_hits = nextHit.secondary_hits.map((secondary) => scaleFrontendSkillHitDamage(secondary, hitConfigScale, levelValues));
  }
  const nextRuntimeParams = { ...(skill.runtime_params ?? {}) };
  for (const [key, value] of Object.entries(levelValues)) {
    if (["base_damage", "mana_cost", "release_interval_ms", "base_cooldown_ms", "trigger_interval_ms"].includes(key)) continue;
    nextRuntimeParams[key] = value;
  }
  if (Array.isArray(nextRuntimeParams.modules)) {
    nextRuntimeParams.modules = applyFrontendModuleLevelValues(nextRuntimeParams.modules, levelValues);
  }
  if (Number(nextRuntimeParams.split_projectile_base_damage ?? 0) > 0 && targetBaseDamage > 0) {
    nextRuntimeParams.split_projectile_damage_multiplier = Number(nextRuntimeParams.split_projectile_base_damage) / targetBaseDamage;
  }
  const baseReleaseIntervalMs = typeof levelValues.release_interval_ms === "number" ? levelValues.release_interval_ms : skill.base_release_interval_ms;
  const baseCooldownMs = typeof levelValues.base_cooldown_ms === "number" ? levelValues.base_cooldown_ms : skill.base_cooldown_ms;
  const timing = frontendSkillTiming(skill, new Set(skill.tags?.map((tag) => tag.id ?? tag.text) ?? []), skill.skill_stats, {
    baseReleaseIntervalMs,
    baseCooldownMs,
  });
  return {
    ...skill,
    base_damage: targetBaseDamage,
    final_damage: Number(skill.final_damage ?? 0) * damageScale,
    non_crit_damage: Number(skill.non_crit_damage ?? skill.final_damage ?? 0) * damageScale,
    expected_hit_damage: Number(skill.expected_hit_damage ?? skill.final_damage ?? 0) * damageScale,
    preview_dps: Number(skill.preview_dps ?? 0) * damageScale,
    base_damage_components: scaleFrontendDamageMap(skill.base_damage_components, damageScale),
    final_damage_components: scaleFrontendDamageMap(skill.final_damage_components, damageScale),
    hit: nextHit,
    cast: {
      ...(skill.cast ?? {}),
      ...(typeof levelValues.release_interval_ms === "number" ? { release_interval_ms: levelValues.release_interval_ms } : {}),
      ...(typeof levelValues.base_cooldown_ms === "number" ? { base_cooldown_ms: levelValues.base_cooldown_ms } : {}),
      ...(typeof levelValues.trigger_interval_ms === "number" ? { trigger_interval_ms: levelValues.trigger_interval_ms } : {}),
      ...(typeof levelValues.mana_cost === "number" ? { mana_cost: levelValues.mana_cost } : {}),
    },
    base_release_interval_ms: timing.baseReleaseIntervalMs,
    release_interval_ms: timing.releaseIntervalMs,
    base_cooldown_ms: timing.baseCooldownMs,
    final_cooldown_ms: timing.finalCooldownMs,
    actual_interval_ms: timing.actualIntervalMs,
    trigger_interval_ms: typeof levelValues.trigger_interval_ms === "number" ? levelValues.trigger_interval_ms : skill.trigger_interval_ms,
    mana_cost: typeof levelValues.mana_cost === "number" ? levelValues.mana_cost : skill.mana_cost,
    runtime_params: nextRuntimeParams,
    source_context: {
      ...sourceContext,
      base_gem_level: targetLevel,
      effective_gem_level: targetLevel,
      level_values: levelValues,
    } as SkillPreview["source_context"],
  };
}

function frontendSkillClampedLevel(skill: SkillPreview, level: number) {
  const table = (FRONTEND_SKILL_LEVEL_TABLES as Record<string, Record<number, Record<string, number>>>)[String(skill.base_gem_id ?? skill.skill_package_id ?? "")];
  const levels = table ? Object.keys(table).map(Number).filter(Number.isFinite).sort((a, b) => a - b) : [];
  if (levels.length === 0) return Math.max(1, Math.min(40, level));
  return clamp(level, levels[0], levels[levels.length - 1]);
}

function frontendSkillLevelTableValues(skill: SkillPreview, level: number): Record<string, number> {
  const table = (FRONTEND_SKILL_LEVEL_TABLES as Record<string, Record<number, Record<string, number>>>)[String(skill.base_gem_id ?? skill.skill_package_id ?? "")];
  return { ...(table?.[level] ?? {}) };
}

function frontendLevelValueNumber(levelValues: Record<string, number>, key: string, fallback: number) {
  const value = levelValues[key];
  return Number.isFinite(value) ? value : fallback;
}

function frontendSkillTiming(
  skill: SkillPreview,
  tags: Set<string>,
  skillStats: Record<string, number | boolean> | undefined,
  overrides: { baseReleaseIntervalMs?: number; baseCooldownMs?: number } = {}
) {
  const baseReleaseIntervalMs = Math.max(0, Math.round(Number(
    overrides.baseReleaseIntervalMs
    ?? skill.base_release_interval_ms
    ?? skill.release_interval_ms
    ?? skill.actual_interval_ms
    ?? 0
  )));
  const baseCooldownMs = Math.max(0, Math.round(Number(
    overrides.baseCooldownMs
    ?? skill.base_cooldown_ms
    ?? skill.final_cooldown_ms
    ?? 0
  )));
  let releaseSpeedAddPercent = 0;
  if (tags.has("attack")) {
    releaseSpeedAddPercent = statValue(skillStats, "attack_speed_add_percent");
  } else if (tags.has("spell")) {
    releaseSpeedAddPercent = statValue(skillStats, "cast_speed_add_percent");
  }
  const speedMultiplier = Math.max(
    0.01,
    1 + releaseSpeedAddPercent / 100
  ) * Math.max(0.01, 1 + statValue(skillStats, "skill_speed_final_percent") / 100);
  const releaseIntervalMs = baseReleaseIntervalMs > 0 && (tags.has("attack") || tags.has("spell"))
    ? Math.max(1, Math.round(baseReleaseIntervalMs / speedMultiplier))
    : 0;
  const movementCooldownRecovery = tags.has("movement") || tags.has("skill_movement")
    ? statValue(skillStats, "movement_skill_cooldown_recovery_add_percent")
    : 0;
  const cooldownRecoveryMultiplier = Math.max(
    0.01,
    1 + (statValue(skillStats, "cooldown_recovery_add_percent") + movementCooldownRecovery) / 100
  );
  const addedCooldownMs = statValue(skillStats, "added_cooldown_ms");
  const hasCooldownConstraint = baseCooldownMs > 0 || addedCooldownMs !== 0;
  const finalCooldownMs = hasCooldownConstraint
    ? Math.max(0, Math.round(Math.max(100, baseCooldownMs / cooldownRecoveryMultiplier + addedCooldownMs)))
    : 0;
  return {
    baseReleaseIntervalMs,
    releaseIntervalMs,
    baseCooldownMs,
    finalCooldownMs,
    actualIntervalMs: Math.max(releaseIntervalMs, finalCooldownMs),
    speedMultiplier,
  };
}

function scaleFrontendDamageMap(value: unknown, scale: number): Record<string, number> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([damageType, amount]) => [damageType, Number(amount ?? 0) * scale])
  );
}

function normalizeFrontendDamageMapTotal(value: unknown, targetTotal: number): Record<string, number> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([damageType, amount]) => [damageType, Number(amount ?? 0)] as const)
    .filter(([, amount]) => Number.isFinite(amount) && amount > 0);
  const currentTotal = frontendDamageMapEntriesTotal(entries);
  if (currentTotal <= 0 || targetTotal <= 0) return Object.fromEntries(entries);
  const scale = targetTotal / currentTotal;
  return Object.fromEntries(entries.map(([damageType, amount]) => [damageType, amount * scale]));
}

export function frontendDamageMapTotal(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  return frontendDamageMapEntriesTotal(
    Object.entries(value as Record<string, unknown>)
      .map(([, amount]) => Number(amount ?? 0))
      .filter((amount) => Number.isFinite(amount) && amount > 0)
  );
}

function frontendDamageMapEntriesTotal(entries: readonly (readonly [string, number] | number)[]): number {
  return entries.reduce<number>((total, entry) => total + (Array.isArray(entry) ? entry[1] : entry), 0);
}

type FrontendScalableHit = Record<string, unknown> & {
  id?: string;
  base_damage?: number;
  weapon_attack_percent?: number;
  damage_components?: Record<string, number>;
  ailments?: Record<string, unknown>[];
};

export type FrontendAilmentConfig = Record<string, unknown> & {
  type?: string;
  chance_percent?: number;
  duration_ms?: number;
  base_value?: number;
  effect_per_stack?: number;
  base_damage_per_second?: number;
  damage_over_time_more_percent?: number;
  source_damage_type?: string;
  max_stacks?: number;
  threshold?: number;
  max_value?: number;
};

function scaleFrontendSkillHitDamage<T extends FrontendScalableHit>(hit: T, scale: number, levelValues: Record<string, number> = {}): T {
  const next = { ...hit };
  const hitId = frontendSafeLevelKeyFragment(String(next.id ?? "secondary_hit"));
  const prefix = `secondary_hit_${hitId}`;
  const levelBaseDamage = frontendOptionalLevelNumber(levelValues, `${prefix}_base_damage`);
  const levelWeaponAttackPercent = frontendOptionalLevelNumber(levelValues, `${prefix}_weapon_attack_percent`);
  if (typeof next.base_damage === "number") next.base_damage = levelBaseDamage ?? next.base_damage * scale;
  if (typeof next.weapon_attack_percent === "number") next.weapon_attack_percent = levelWeaponAttackPercent ?? next.weapon_attack_percent * scale;
  if (next.damage_components && typeof next.damage_components === "object" && !Array.isArray(next.damage_components)) {
    next.damage_components = frontendLevelDamageComponents(levelValues, `${prefix}_damage_component_`) ?? scaleFrontendDamageMap(next.damage_components, scale);
  }
  if (Array.isArray(next.ailments)) {
    next.ailments = applyFrontendAilmentLevelValues(next.ailments, levelValues, `${prefix}_ailment_`);
  }
  return next;
}

function frontendLevelDamageComponents(levelValues: Record<string, number>, prefix: string): Record<string, number> | null {
  const entries = Object.entries(levelValues)
    .filter(([key, value]) => key.startsWith(prefix) && Number.isFinite(value))
    .map(([key, value]) => [key.slice(prefix.length), value] as const)
    .filter(([damageType]) => damageType.length > 0);
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function frontendOptionalLevelNumber(levelValues: Record<string, number>, key: string): number | null {
  const value = levelValues[key];
  return Number.isFinite(value) ? value : null;
}

function frontendSafeLevelKeyFragment(value: string) {
  return value.replace(/[^0-9A-Za-z_]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

function applyFrontendAilmentLevelValues(ailments: readonly unknown[], levelValues: Record<string, number>, prefix: string): Record<string, unknown>[] {
  return ailments.flatMap((ailment) => {
    if (!ailment || typeof ailment !== "object" || Array.isArray(ailment)) return [];
    const next = { ...(ailment as Record<string, unknown>) };
    const type = frontendSafeLevelKeyFragment(String(next.type ?? "unknown"));
    const baseDamagePerSecond = frontendOptionalLevelNumber(levelValues, `${prefix}${type}_base_damage_per_second`);
    if (baseDamagePerSecond !== null) next.base_damage_per_second = baseDamagePerSecond;
    return [next];
  });
}

function applyFrontendModuleLevelValues(modules: unknown[], levelValues: Record<string, number>): unknown[] {
  return modules.map((module) => {
    if (!module || typeof module !== "object" || Array.isArray(module)) return module;
    const next = { ...(module as Record<string, unknown>) };
    const moduleId = frontendSafeLevelKeyFragment(String(next.id ?? "module"));
    const params = next.params;
    if (params && typeof params === "object" && !Array.isArray(params)) {
      const nextParams = { ...(params as Record<string, unknown>) };
      for (const key of Object.keys(nextParams)) {
        const levelValue = frontendOptionalLevelNumber(levelValues, `module_${moduleId}_${key}`);
        if (levelValue !== null) nextParams[key] = levelValue;
      }
      next.params = nextParams;
    }
    return next;
  });
}

export function frontendSupportEffectiveLevel(sourceGem: FrontendPreviewGem, supportLevelAdd: number) {
  const baseGemId = frontendSupportLevelTableId(sourceGem);
  const table = (FRONTEND_SKILL_LEVEL_TABLES as Record<string, Record<number, Record<string, number>>>)[baseGemId];
  const levels = table ? Object.keys(table).map(Number).filter(Number.isFinite).sort((a, b) => a - b) : [];
  const currentLevel = Math.max(1, Math.floor(Number(sourceGem.level ?? 1)));
  if (levels.length === 0) return currentLevel + supportLevelAdd;
  return clamp(currentLevel + supportLevelAdd, levels[0], levels[levels.length - 1]);
}

export function frontendGemBaseModifiers(gem: FrontendPreviewGem) {
  const baseEffect = frontendRecord(frontendRecord(gem).base_effect);
  const modifiers = baseEffect.modifiers;
  return Array.isArray(modifiers) ? modifiers.map(frontendRecord) : [];
}

function frontendPassiveSelfStatEffects(gem: FrontendPreviewGem): FrontendPassiveEffect[] {
  const passiveEffects = frontendRecord(gem).passive_effects;
  if (Array.isArray(passiveEffects)) {
    return passiveEffects
      .map(frontendRecord)
      .filter((effect) => String(effect.target ?? "") === "self_stat")
      .map((effect) => ({
        target: "self_stat",
        stat: String(effect.stat ?? ""),
        value: Number(effect.value ?? 0),
        layer: String(effect.layer ?? "additive")
      }));
  }
  return frontendGemBaseModifiers(gem)
    .filter((modifier) => String(modifier.target_text ?? "") === "影响玩家属性")
    .map((modifier) => {
      const stat = frontendRecord(modifier.stat);
      return {
        target: "self_stat",
        stat: String(stat.id ?? ""),
        value: Number(modifier.value ?? 0),
        layer: "additive"
      };
    });
}

function frontendSupportBaseModifiers(gem: FrontendPreviewGem, supportLevel: number) {
  const modifiers = frontendGemBaseModifiers(gem);
  if (modifiers.length > 0 || !frontendConduitRelation(gem)) return modifiers;
  const skillLevelAdd = frontendSkillLevelTableValueById(frontendSupportLevelTableId(gem), supportLevel, "skill_level_add");
  if (!skillLevelAdd) return modifiers;
  return [{
    stat: { id: "active_gem_level_add", text: "\u6280\u80fd\u7b49\u7ea7" },
    table_key: "skill_level_add",
    value: skillLevelAdd,
  }];
}

export function frontendSupportLevelTableId(gem: FrontendPreviewGem) {
  return frontendConduitBaseGemId(gem) || String(gem.base_gem_id ?? gem.instance_id);
}

function frontendConduitBaseGemId(gem: FrontendPreviewGem) {
  const baseGemId = String(gem.base_gem_id ?? gem.instance_id);
  if (baseGemId === "support_row_conduit" || baseGemId === "support_column_conduit" || baseGemId === "support_box_conduit") {
    return baseGemId;
  }
  const text = `${gem.name_text ?? ""} ${gem.description_text ?? ""}`.toLowerCase();
  if (text.includes("\u884c\u5bfc\u7ba1") || text.includes("\u540c\u884c\u8fde\u63a5")) return "support_row_conduit";
  if (text.includes("\u5217\u5bfc\u7ba1") || text.includes("\u540c\u5217\u8fde\u63a5")) return "support_column_conduit";
  if (text.includes("\u5bab\u5bfc\u7ba1") || text.includes("\u540c\u5bab\u8fde\u63a5")) return "support_box_conduit";
  return "";
}

export function frontendConduitRelation(gem: FrontendPreviewGem) {
  const baseGemId = frontendConduitBaseGemId(gem);
  if (baseGemId === "support_row_conduit") return "same_row";
  if (baseGemId === "support_column_conduit") return "same_column";
  if (baseGemId === "support_box_conduit") return "same_box";
  return "";
}

function frontendConduitCanUseTarget(gem: FrontendPreviewGem, targetGem: FrontendPreviewGem) {
  const conduitRelation = frontendConduitRelation(gem);
  if (!conduitRelation) return true;
  const source = gem.board_position;
  const target = targetGem.board_position;
  if (!source || !target) return false;
  if (conduitRelation === "same_row") return source.row === target.row;
  if (conduitRelation === "same_column") return source.column === target.column;
  if (conduitRelation === "same_box") {
    return Math.floor(source.row / 3) === Math.floor(target.row / 3)
      && Math.floor(source.column / 3) === Math.floor(target.column / 3);
  }
  return false;
}

function frontendSupportCanAffect(sourceGem: FrontendPreviewGem, targetTags: Set<string>) {
  const canAffect = frontendRecord(frontendRecord(sourceGem).can_affect);
  const anyTags = frontendTagIds(canAffect.tags_any);
  const allTags = frontendTagIds(canAffect.tags_all);
  const noneTags = frontendTagIds(canAffect.tags_none);
  if (anyTags.length > 0 && !anyTags.some((tag) => targetTags.has(tag))) return false;
  if (allTags.some((tag) => !targetTags.has(tag))) return false;
  if (noneTags.some((tag) => targetTags.has(tag))) return false;
  return true;
}

function frontendTagIds(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry) => String(frontendRecord(entry).id ?? frontendRecord(entry).text ?? "")).filter(Boolean)
    : [];
}

function frontendBoardRelation(source: FrontendPreviewGem["board_position"], target: FrontendPreviewGem["board_position"]) {
  if (!source || !target) return "";
  if (Math.abs(source.row - target.row) + Math.abs(source.column - target.column) === 1) return "adjacent";
  if (source.row === target.row) return "same_row";
  if (source.column === target.column) return "same_column";
  if (Math.floor(source.row / 3) === Math.floor(target.row / 3) && Math.floor(source.column / 3) === Math.floor(target.column / 3)) return "same_box";
  return "";
}

function frontendRelationCoefficient(relation: string) {
  return relation === "adjacent" ? 1.25 : 1;
}

function frontendSupportModifierAppliedValue(stat: string, value: number, relation: string) {
  return isFrontendDamageConversionStat(stat) ? value : value * frontendRelationCoefficient(relation);
}

function frontendRelationText(relation: string) {
  if (relation === "board_wide") return "\u5168\u76d8";
  if (relation === "adjacent") return "相邻";
  if (relation === "same_row") return "同行";
  if (relation === "same_column") return "同列";
  if (relation === "same_box") return "同宫";
  return relation;
}

function applyFrontendEquipmentSkillModifiers(
  skill: SkillPreview,
  gem: FrontendPreviewGem,
  modifiers: FrontendEquipmentStatModifier[],
  appliedModifiers: readonly SkillAppliedModifier[] = []
): SkillPreview {
  if (modifiers.length === 0) return skill;
  const skillStats = { ...(skill.skill_stats ?? {}) };
  for (const modifier of modifiers) {
    if (modifier.kind === "runtime_hook") continue;
    const stat = modifier.reason_key === "modifier.equipment_affix"
      ? frontendEquipmentAttackAddedDamageStat(modifier) || modifier.stat
      : modifier.stat;
    skillStats[stat] = Number(skillStats[stat] ?? 0) + modifier.value;
  }
  const tags = new Set(gem.tags.map((tag) => tag.id ?? tag.text));
  const damageType = skill.damage_type;
  const skillLevelAdd = frontendEquipmentSkillLevelAdd(skill, gem, skillStats, tags);
  const levelDamageScale = frontendSkillLevelDamageScale(skill, gem, skillLevelAdd);
  if (skillLevelAdd) skillStats.equipment_skill_level_add = skillLevelAdd;
  const finalPercent =
    statValue(skillStats, "damage_final_percent")
    + statValue(skillStats, "hit_damage_final_percent")
    + (tags.has("attack") ? statValue(skillStats, "attack_damage_final_percent") : 0)
    + (tags.has("spell") ? statValue(skillStats, "spell_damage_final_percent") : 0);
  const baselineDamage = Number(skill.final_damage ?? 0) * levelDamageScale;
  const addedDamageEffectiveness = Math.max(0, statValue(skillStats, "added_damage_effectiveness_percent") || 100) / 100;
  const baseComponents = frontendSkillBaseDamageComponents(skill, damageType, baselineDamage);
  addFrontendDamageComponent(baseComponents, damageType, statValue(skillStats, "added_damage") * addedDamageEffectiveness);
  addFrontendDamageComponent(baseComponents, "physical", statValue(skillStats, "added_physical_damage") * addedDamageEffectiveness);
  addFrontendDamageComponent(baseComponents, "fire", statValue(skillStats, "added_fire_damage") * addedDamageEffectiveness);
  addFrontendDamageComponent(baseComponents, "cold", statValue(skillStats, "added_cold_damage") * addedDamageEffectiveness);
  addFrontendDamageComponent(baseComponents, "lightning", statValue(skillStats, "added_lightning_damage") * addedDamageEffectiveness);
  addFrontendDamageComponent(baseComponents, "chaos", statValue(skillStats, "added_chaos_damage") * addedDamageEffectiveness);
  if (tags.has("attack")) {
    addFrontendDamageComponent(baseComponents, "physical", statValue(skillStats, "weapon_attack_base_damage"));
  }
  const damageConversions = [
    ...frontendDamageConversions(skill),
    ...frontendStatDamageConversions(skillStats),
  ];
  const convertedComponents = convertFrontendDamageComponents(baseComponents, damageConversions);
  const finalDamageComponents: Record<string, number> = Object.fromEntries(Object.entries(convertedComponents)
    .map(([componentType, componentAmount]) => [
      componentType,
      Math.max(0, componentAmount * (1 + frontendComponentAdditivePercent(componentType, skillStats, tags) / 100) * (1 + finalPercent / 100))
    ])
    .filter((entry): entry is [string, number] => typeof entry[1] === "number" && entry[1] > 0));
  const nextDamage = Object.values(finalDamageComponents).reduce<number>((total, value) => total + value, 0);
  const runtimeParams = { ...(skill.runtime_params ?? {}) };
  for (const modifier of modifiers) {
    if (modifier.kind === "runtime_hook" && modifier.payload && typeof modifier.payload === "object") {
      Object.assign(runtimeParams, modifier.payload);
    }
  }
  const grantedEffects = frontendEquipmentGrantedEffects(modifiers, skillStats, tags, finalPercent, addedDamageEffectiveness, damageType);
  if (grantedEffects.length > 0) runtimeParams.frontend_equipment_granted_effects = grantedEffects;
  for (const key of [
    "armor_reduction_penetration_percent",
    "cull_threshold_percent",
    "double_damage_chance_percent",
    "continuous_attack_chance_percent",
    "continuous_attack_damage_step_percent",
    "continuous_attack_damage_step_final_percent",
    "duration_add_percent",
    "resistance_penetration_percent",
    "movement_skill_cooldown_recovery_add_percent",
    "aura_effect_add_percent",
    "dot_damage_add_percent",
    "ailment_damage_add_percent",
    "ailment_damage_deepen_percent",
    "numbed_effect_add_percent",
    "deterioration_chance_add_percent",
    "deterioration_damage_add_percent",
    "deterioration_duration_add_percent",
    "added_base_ignite_damage_per_second",
    "added_base_trauma_damage_per_second",
    "added_base_ailment_damage_per_second",
    "aggravation_value_add",
    "aggravation_effect_add_percent",
    "frostbite_max_value_add",
    "ailment_duration_add_percent",
    "ignite_duration_add_percent",
    "trauma_duration_add_percent",
    "ignite_stacks_add",
  ]) {
    const value = statValue(skillStats, key);
    if (value) runtimeParams[key] = value;
  }
  addRuntimeParam(runtimeParams, "split_projectile_count", statValue(skillStats, "split_projectile_count_add"));
  addRuntimeParam(runtimeParams, "pierce_count", statValue(skillStats, "pierce_count_add"));
  addRuntimeParam(runtimeParams, "chain_count", statValue(skillStats, "chain_count_add"));
  addRuntimeParam(runtimeParams, "channel_max_stacks", statValue(skillStats, "channel_max_stacks_add"));
  addRuntimeParam(runtimeParams, "channel_min_stacks", statValue(skillStats, "channel_min_stacks_add"));
  addRuntimeParam(runtimeParams, "slash_chance_percent", statValue(skillStats, "slash_chance_add_percent"));
  runtimeParams.frontend_skill_tags = [...tags];
  scaleRuntimeParam(runtimeParams, "projectile_speed", statValue(skillStats, "projectile_speed_add_percent"));
  scaleFrontendRuntimeDurations(runtimeParams, statValue(skillStats, "duration_add_percent"));
  const projectileCountAdd = statValue(skillStats, "projectile_count_add");
  const projectileCount = Math.max(1, Math.round(Number(skill.projectile_count ?? 1) + projectileCountAdd));
  if (projectileCountAdd !== 0 || runtimeParams.projectile_count !== undefined) {
    runtimeParams.projectile_count = projectileCount;
  }
  if (
    projectileCountAdd > 0
    && projectileCount > 1
    && Number(runtimeParams.spread_angle_deg ?? 0) <= 0
    && Number(runtimeParams.angle_step ?? 0) <= 0
  ) {
    runtimeParams.spread_angle_deg = defaultFrontendExtraProjectileSpreadAngle(projectileCount);
  }
  const critChance = frontendExpectedCritChance(skill, skillStats);
  const critMultiplier = frontendExpectedCritMultiplier(skill, skillStats);
  const expectedHitDamage = nextDamage * ((1 - critChance) + critChance * critMultiplier);
  const timing = frontendSkillTiming(skill, tags, skillStats);
  return {
    ...skill,
    skill_stats: skillStats,
    source_context: skillLevelAdd ? frontendSkillSourceContextWithEquipmentLevel(skill, gem, skillLevelAdd) : skill.source_context,
    final_damage: nextDamage,
    final_damage_components: finalDamageComponents,
    hit: damageConversions.length > 0
      ? { ...(skill.hit ?? {}), damage_conversions: damageConversions }
      : skill.hit,
    non_crit_damage: nextDamage,
    crit_chance: critChance,
    crit_multiplier: critMultiplier,
    expected_hit_damage: expectedHitDamage,
    preview_dps: timing.actualIntervalMs > 0 ? expectedHitDamage * (1000 / timing.actualIntervalMs) : 0,
    base_release_interval_ms: timing.baseReleaseIntervalMs,
    release_interval_ms: timing.releaseIntervalMs,
    base_cooldown_ms: timing.baseCooldownMs,
    final_cooldown_ms: timing.finalCooldownMs,
    actual_interval_ms: timing.actualIntervalMs,
    uses_per_second: timing.actualIntervalMs > 0 ? 1000 / timing.actualIntervalMs : 0,
    speed_multiplier: timing.speedMultiplier,
    projectile_count: projectileCount,
    area_multiplier: Number(skill.area_multiplier ?? 1) * Math.max(0.05, 1 + statValue(skillStats, "area_add_percent") / 100),
    runtime_params: runtimeParams,
    applied_modifiers: [...(skill.applied_modifiers ?? []), ...appliedModifiers],
  };
}

function frontendEquipmentAttackAddedDamageStat(modifier: FrontendEquipmentStatModifier) {
  if (modifier.kind !== "damage_stat") return "";
  if (modifier.stat === "added_damage") return "equipment_attack_added_damage";
  const match = modifier.stat.match(/^added_(physical|fire|cold|lightning|chaos)_damage$/);
  return match ? `equipment_attack_added_${match[1]}_damage` : "";
}

function frontendEquipmentGrantedEffects(
  modifiers: FrontendEquipmentStatModifier[],
  skillStats: Record<string, number | boolean>,
  tags: Set<string>,
  finalPercent: number,
  addedDamageEffectiveness: number,
  primaryDamageType: string
) {
  return modifiers
    .map((modifier) => frontendEquipmentGrantedEffect(modifier, skillStats, tags, finalPercent, addedDamageEffectiveness, primaryDamageType))
    .filter((effect): effect is FrontendEquipmentGrantedEffect => Boolean(effect));
}

type FrontendEquipmentGrantedEffect = {
  id: string;
  effect_kind: string;
  trigger_condition: string;
  direct_damage_module_id: string;
  damage_type: string;
  value: number;
  value_min: number;
  value_max: number;
  damage_multiplier: number;
  source_modifier_id: string;
};

function frontendEquipmentGrantedEffect(
  modifier: FrontendEquipmentStatModifier,
  skillStats: Record<string, number | boolean>,
  tags: Set<string>,
  finalPercent: number,
  addedDamageEffectiveness: number,
  primaryDamageType: string
) {
  if (modifier.reason_key !== "modifier.equipment_affix" || modifier.kind !== "damage_stat") return null;
  const damageType = frontendAddedDamageStatType(modifier.stat);
  if (!damageType) return null;
  const resolvedDamageType = damageType === "generic" ? primaryDamageType : damageType;
  const multiplier = addedDamageEffectiveness * (1 + frontendComponentAdditivePercent(resolvedDamageType, skillStats, tags) / 100) * (1 + finalPercent / 100);
  const triggerCondition = frontendEquipmentGrantedEffectTriggerCondition(modifier);
  if (!frontendEquipmentGrantedEffectMatchesTags(triggerCondition, tags)) return null;
  return {
    id: `equipment_affix.${modifier.source_modifier_id}.${modifier.stat}`,
    effect_kind: "direct_damage",
    trigger_condition: triggerCondition,
    direct_damage_module_id: `equipment_affix.${modifier.source_modifier_id}.direct_damage`,
    damage_type: damageType,
    value: modifier.value,
    value_min: modifier.value_min ?? modifier.value,
    value_max: modifier.value_max ?? modifier.value,
    damage_multiplier: multiplier,
    source_modifier_id: modifier.source_modifier_id,
  };
}

function frontendAddedDamageStatType(stat: string) {
  if (stat === "added_damage") return "generic";
  const match = stat.match(/^added_(physical|fire|cold|lightning|chaos)_damage$/);
  return match?.[1] ?? "";
}

function frontendEquipmentGrantedEffectTriggerCondition(modifier: FrontendEquipmentStatModifier) {
  const payloadCondition = modifier.payload?.trigger_condition;
  if (typeof payloadCondition === "string" && payloadCondition) return payloadCondition;
  const sourceText = modifier.source_text ?? "";
  if (sourceText.includes("法术附加") || sourceText.includes("娉曟湳闄勫姞")) return "spell_hit";
  if (sourceText.includes("攻击附加") || sourceText.includes("鏀诲嚮闄勫姞")) return "attack_hit";
  return "attack_hit";
}

function frontendEquipmentGrantedEffectMatchesTags(condition: string, tags: Set<string>) {
  if (condition === "hit") return true;
  if (condition === "attack_hit") return tags.has("attack");
  if (condition === "spell_hit") return tags.has("spell");
  return false;
}

function attributeScaledDamageAddPercent(skillStats: Record<string, number | boolean>) {
  const attributes = statValue(skillStats, "strength") + statValue(skillStats, "dexterity") + statValue(skillStats, "intelligence");
  return Math.floor(attributes / 12) * statValue(skillStats, "damage_add_percent_per_12_attributes")
    + Math.floor(attributes / 27) * statValue(skillStats, "damage_add_percent_per_27_attributes");
}

function frontendSkillBaseDamageComponents(skill: SkillPreview, fallbackDamageType: string, baselineDamage: number) {
  const existing = skill.final_damage_components;
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    return Object.fromEntries(Object.entries(existing).map(([damageType, value]) => [damageType, Number(value ?? 0)]));
  }
  return { [fallbackDamageType]: baselineDamage };
}

export function addFrontendDamageComponent(components: Record<string, number>, damageType: string, amount: number) {
  if (!Number.isFinite(amount) || amount === 0) return;
  components[damageType] = (components[damageType] ?? 0) + amount;
}

export function frontendDamageConversions(skill: SkillPreview, hitConfig?: Record<string, unknown>) {
  return Array.isArray(hitConfig?.damage_conversions)
    ? hitConfig.damage_conversions as Record<string, unknown>[]
    : Array.isArray(skill.hit?.damage_conversions)
      ? skill.hit.damage_conversions as Record<string, unknown>[]
      : [];
}

export function frontendStatDamageConversions(skillStats: Record<string, number | boolean>) {
  const conversions: Record<string, unknown>[] = [];
  for (const [stat, value] of Object.entries(skillStats)) {
    const match = frontendDamageConversionStatMatch(stat);
    if (!match) continue;
    const percent = Math.max(0, Number(value ?? 0));
    if (!Number.isFinite(percent) || percent <= 0) continue;
    conversions.push({ from: match[1], to: match[2], percent });
  }
  return conversions;
}

function isFrontendDamageConversionStat(stat: string) {
  return Boolean(frontendDamageConversionStatMatch(stat));
}

function frontendDamageConversionStatMatch(stat: string) {
  return stat.match(/^conversion_(physical|fire|cold|lightning|chaos)_to_(physical|fire|cold|lightning|chaos)_percent$/);
}

export function convertFrontendDamageComponents(components: Record<string, number>, conversions: Record<string, unknown>[]) {
  const converted: Record<string, number> = { ...components };
  const sourceOrder = Array.from(new Set(conversions.map((conversion) => String(conversion.from ?? "")).filter(Boolean)));
  for (const damageType of sourceOrder) {
    const rawAmount = Math.max(0, Number(converted[damageType] ?? 0));
    if (rawAmount <= 0) continue;
    const matchingConversions = conversions
      .filter((conversion) => String(conversion.from ?? "") === damageType && typeof conversion.to === "string")
      .map((conversion) => ({ to: String(conversion.to), percent: Math.max(0, Number(conversion.percent ?? 0)) }))
      .filter((conversion) => conversion.percent > 0);
    if (matchingConversions.length === 0) continue;
    delete converted[damageType];
    let remainder = rawAmount;
    const totalPercent = matchingConversions.reduce((total, conversion) => total + conversion.percent, 0);
    const scale = totalPercent > 100 ? 100 / totalPercent : 1;
    for (const conversion of matchingConversions) {
      const amount = Math.max(0, rawAmount * conversion.percent * scale / 100);
      remainder -= amount;
      addFrontendDamageComponent(converted, conversion.to, amount);
    }
    if (remainder > 0.000001) addFrontendDamageComponent(converted, damageType, remainder);
  }
  return converted;
}

function frontendComponentAdditivePercent(
  damageType: string,
  skillStats: Record<string, number | boolean>,
  tags: Set<string>
) {
  const elementalDamageAdd = ["fire", "cold", "lightning"].includes(damageType)
    ? statValue(skillStats, "elemental_damage_add_percent")
    : 0;
  return statValue(skillStats, "damage_add_percent")
    + statValue(skillStats, `${damageType}_damage_add_percent`)
    + elementalDamageAdd
    + statValue(skillStats, "hit_damage_add_percent")
    + (tags.has("attack") ? statValue(skillStats, "attack_damage_add_percent") : 0)
    + (tags.has("spell") ? statValue(skillStats, "spell_damage_add_percent") : 0)
    + (tags.has("projectile") ? statValue(skillStats, "projectile_damage_add_percent") : 0)
    + (tags.has("projectile") || tags.has("ranged") ? statValue(skillStats, "ranged_damage_add_percent") : 0)
    + (tags.has("melee") ? statValue(skillStats, "melee_damage_add_percent") : 0)
    + attributeScaledDamageAddPercent(skillStats);
}

function frontendEquipmentSkillLevelAdd(
  skill: SkillPreview,
  gem: FrontendPreviewGem,
  skillStats: Record<string, number | boolean>,
  tags: Set<string>
) {
  let total = statValue(skillStats, "active_gem_level_add");
  const damageType = skill.damage_type;
  if (tags.has("attack")) total += statValue(skillStats, "attack_skill_level_add");
  if (tags.has("spell")) total += statValue(skillStats, "spell_skill_level_add");
  if (tags.has("core")) total += statValue(skillStats, "core_skill_level_add");
  if (damageType === "physical" || tags.has("physical")) total += statValue(skillStats, "physical_skill_level_add");
  if (damageType === "fire" || tags.has("fire")) total += statValue(skillStats, "fire_skill_level_add");
  if (damageType === "cold" || tags.has("cold")) total += statValue(skillStats, "cold_skill_level_add");
  if (damageType === "lightning" || tags.has("lightning")) total += statValue(skillStats, "lightning_skill_level_add");
  if (damageType === "chaos" || tags.has("chaos")) total += statValue(skillStats, "chaos_skill_level_add");
  if (["fire", "cold", "lightning"].includes(damageType) || tags.has("elemental")) {
    total += statValue(skillStats, "elemental_skill_level_add");
  }
  if (statValue(skillStats, "support_gem_level_add")) {
    skillStats.equipment_support_gem_level_add = statValue(skillStats, "support_gem_level_add");
  }
  return Math.max(0, Math.floor(total));
}

function frontendSkillSourceContextWithEquipmentLevel(skill: SkillPreview, gem: FrontendPreviewGem, skillLevelAdd: number) {
  const sourceContext = frontendRecord(skill.source_context);
  const currentLevel = frontendSkillCurrentLevel(skill, gem);
  return {
    ...sourceContext,
    equipment_skill_level_add: skillLevelAdd,
    effective_gem_level: currentLevel + skillLevelAdd,
  } as SkillPreview["source_context"];
}

function frontendSkillLevelDamageScale(skill: SkillPreview, gem: FrontendPreviewGem, skillLevelAdd: number) {
  if (skillLevelAdd <= 0) return 1;
  const currentLevel = frontendSkillCurrentLevel(skill, gem);
  const targetLevel = Math.min(40, currentLevel + skillLevelAdd);
  const currentBaseDamage = frontendSkillLevelValue(skill, "base_damage", currentLevel, Number(skill.final_damage ?? 0), currentLevel);
  const targetBaseDamage = frontendSkillLevelValue(skill, "base_damage", targetLevel, currentBaseDamage, currentLevel);
  if (currentBaseDamage > 0 && targetBaseDamage > 0) {
    return Math.max(0, targetBaseDamage / currentBaseDamage);
  }
  return 1;
}

function frontendSkillCurrentLevel(skill: SkillPreview, gem: FrontendPreviewGem) {
  const sourceContext = frontendRecord(skill.source_context);
  return Math.max(1, Math.floor(Number(sourceContext.effective_gem_level ?? sourceContext.base_gem_level ?? gem.level ?? 1)));
}

function frontendSkillLevelValue(skill: SkillPreview, key: string, targetLevel: number, fallback: number, currentLevel: number) {
  const tableValue = frontendSkillLevelTableValue(skill, targetLevel, key);
  if (tableValue !== null) return tableValue;
  const anchors = frontendSkillLevelAnchors(skill, key);
  const levelValues = frontendRecord(frontendRecord(skill.source_context).level_values);
  const currentValue = Number(levelValues[key] ?? fallback);
  const points = [...anchors];
  if (Number.isFinite(currentValue)) {
    const existingCurrent = points.findIndex(([level]) => level === currentLevel);
    if (existingCurrent >= 0) {
      points[existingCurrent] = [currentLevel, currentValue];
    } else {
      points.push([currentLevel, currentValue]);
    }
  }
  points.sort((a, b) => a[0] - b[0]);
  if (points.length === 0) return fallback;
  const exact = points.find(([level]) => level === targetLevel);
  if (exact) return exact[1];
  if (points.length === 1) {
    const [anchorLevel, anchorValue] = points[0];
    if (anchorLevel <= 0 || anchorValue <= 0) return fallback;
    return Math.max(0, anchorValue * (targetLevel / anchorLevel));
  }
  let lower = points[0];
  let upper = points[points.length - 1];
  for (let index = 0; index < points.length - 1; index += 1) {
    if (targetLevel >= points[index][0] && targetLevel <= points[index + 1][0]) {
      lower = points[index];
      upper = points[index + 1];
      break;
    }
  }
  const [lowerLevel, lowerValue] = lower;
  const [upperLevel, upperValue] = upper;
  if (upperLevel === lowerLevel) return lowerValue;
  const ratio = (targetLevel - lowerLevel) / (upperLevel - lowerLevel);
  return Math.max(0, lowerValue + (upperValue - lowerValue) * ratio);
}

function frontendSkillLevelTableValue(skill: SkillPreview, targetLevel: number, key: string) {
  const sourceContext = frontendRecord(skill.source_context);
  const tableId = String(sourceContext.base_gem_id ?? skill.skill_template_id ?? "");
  return frontendSkillLevelTableValueById(tableId, targetLevel, key);
}

export function frontendSkillLevelTableValueById(tableId: string, targetLevel: number, key: string) {
  const table = (FRONTEND_SKILL_LEVEL_TABLES as Record<string, Record<number, Record<string, number>>>)[tableId];
  if (!table) return null;
  const levels = Object.keys(table).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (levels.length === 0) return null;
  const clampedLevel = clamp(Math.floor(targetLevel), levels[0], levels[levels.length - 1]);
  const value = table[clampedLevel]?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function frontendSkillLevelAnchors(skill: SkillPreview, key: string): [number, number][] {
  const sourceContext = frontendRecord(skill.source_context);
  const sourceValues = frontendRecord(sourceContext.tlidb_source_values);
  const parsedValues = frontendRecord(sourceValues.parsed_values);
  const anchorsByKey = frontendRecord(parsedValues.anchors);
  const anchors = frontendRecord(anchorsByKey[key]);
  return Object.entries(anchors)
    .map(([level, value]) => [Number(level), Number(value)] as [number, number])
    .filter(([level, value]) => Number.isFinite(level) && Number.isFinite(value));
}

export function frontendRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function normalizeFrontendStatusType(statusType: string) {
  const normalized = statusType.trim().toLowerCase();
  const aliases: Record<string, string> = {
    freeze: "frozen",
    frozen: "frozen",
    frostbite: "frostbite",
    chill: "chill",
    chilled: "chill",
    ignite: "ignite",
    burning: "ignite",
    shock: "shock",
    numbed: "numbed",
    paralysis: "numbed",
    trauma: "trauma",
    wilt: "wilt",
    wither: "wilt",
    weakened: "weakened",
    weak: "weakened",
    scorch: "scorch",
    scorched: "scorch",
    rot: "rot",
    rotten: "rot",
    maimed: "maimed"
  };
  return aliases[normalized] ?? normalized;
}

export function frontendPlayerStatusImmunityStats(statusType: string) {
  const normalized = normalizeFrontendStatusType(statusType);
  const aliases: Record<string, string[]> = {
    ignite: ["immune_ignite", "immune_scorch"],
    frostbite: ["immune_frostbite", "immune_chill", "immune_frozen"],
    frozen: ["immune_frozen"],
    chill: ["immune_chill", "immune_frostbite"],
    shock: ["immune_shock"],
    numbed: ["immune_numbed"],
    trauma: ["immune_trauma", "immune_maimed"],
    wilt: ["immune_wilt", "immune_wither", "immune_rot"],
    weakened: ["immune_weakened"],
    scorch: ["immune_scorch", "immune_ignite"],
    rot: ["immune_rot", "immune_wilt", "immune_wither"],
    maimed: ["immune_maimed", "immune_trauma"]
  };
  return aliases[normalized] ?? [`immune_${normalized}`];
}

export function frontendElementalAilmentTypes() {
  return new Set(["ignite", "frostbite", "frozen", "chill", "shock", "numbed", "scorch"]);
}

export function frontendSkillDotDamageMultiplier(skill: SkillPreview) {
  return Math.max(0, 1 + Number(skill.runtime_params?.dot_damage_add_percent ?? 0) / 100);
}

export function frontendSkillAilmentDamageMultiplier(skill: SkillPreview) {
  const addPercent =
    Number(skill.runtime_params?.dot_damage_add_percent ?? 0)
    + Number(skill.runtime_params?.ailment_damage_add_percent ?? 0)
    + Number(skill.runtime_params?.ailment_damage_deepen_percent ?? 0);
  return Math.max(0, 1 + addPercent / 100);
}

function addRuntimeParam(runtimeParams: Record<string, unknown>, key: string, value: number) {
  if (!value) return;
  runtimeParams[key] = Number(runtimeParams[key] ?? 0) + value;
}

function scaleRuntimeParam(runtimeParams: Record<string, unknown>, key: string, addPercent: number) {
  if (!addPercent || runtimeParams[key] === undefined) return;
  runtimeParams[key] = Number(runtimeParams[key] ?? 0) * (1 + addPercent / 100);
}

function scaleFrontendRuntimeDurations(runtimeParams: Record<string, unknown>, addPercent: number) {
  if (!addPercent) return;
  const multiplier = Math.max(0.01, 1 + addPercent / 100);
  for (const key of ["duration_ms", "cloud_duration_per_stack_ms"]) {
    if (runtimeParams[key] !== undefined) runtimeParams[key] = Math.max(1, Number(runtimeParams[key] ?? 0) * multiplier);
  }
  const modules = runtimeParams.modules;
  if (!Array.isArray(modules)) return;
  for (const module of modules) {
    if (!module || typeof module !== "object") continue;
    const params = (module as { params?: Record<string, unknown> }).params;
    if (!params || typeof params !== "object") continue;
    for (const key of ["duration_ms", "cloud_duration_per_stack_ms"]) {
      if (params[key] !== undefined) params[key] = Math.max(1, Number(params[key] ?? 0) * multiplier);
    }
  }
}

export function frontendExpectedCritChance(skill: SkillPreview, skillStats: Record<string, number | boolean>) {
  if (skillStats.cannot_crit === true) return 0;
  const baseCritPercent = Number(skill.crit_chance ?? 0) * 100;
  const directCritPercent = statValue(skillStats, "crit_chance_add_percent");
  const critRating = statValue(skillStats, "crit_rating");
  const ratingCritPercent = critRating > 0 ? 45 * critRating / (critRating + 600) : 0;
  return clamp((baseCritPercent + directCritPercent + ratingCritPercent) / 100, 0, 0.95);
}

export function frontendExpectedCritMultiplier(skill: SkillPreview, skillStats: Record<string, number | boolean>) {
  const baseCritDamagePercent = Number(skill.crit_multiplier ?? 1.5) * 100;
  const critDamageRating = statValue(skillStats, "crit_damage_rating");
  const ratingCritDamagePercent = critDamageRating > 0 ? 200 * critDamageRating / (critDamageRating + 1000) : 0;
  return Math.max(1, (baseCritDamagePercent + statValue(skillStats, "crit_damage_add_percent") + ratingCritDamagePercent) / 100);
}

export function recalculateFrontendEquipmentState<TState extends FrontendPreviewState>(state: TState, equipmentSlotCount: number): TState {
  const baseStats = cloneFrontendData(FRONTEND_INITIAL_APP_STATE.player_stats ?? {}) as Record<string, FrontendPreviewPlayerStatView>;
  const equipmentModifiers = frontendEquippedEquipmentModifiers(state, equipmentSlotCount);
  const auraEffectAddPercent = frontendAuraEffectAddPercent(equipmentModifiers);
  const modifiers = [
    ...equipmentModifiers,
    ...frontendMountedPassiveSelfStatModifiers(state, auraEffectAddPercent),
  ];
  const playerStats = applyFrontendEquipmentStatModifiers(baseStats, modifiers);
  return {
    ...state,
    player_stats: playerStats,
    character_panel: recalculateFrontendCharacterPanel(playerStats)
  } as TState;
}

function recalculateFrontendCharacterPanel(playerStats: Record<string, FrontendPreviewPlayerStatView>): CharacterPanelView | undefined {
  const basePanel = cloneFrontendData(FRONTEND_INITIAL_APP_STATE.character_panel) as CharacterPanelView | undefined;
  if (!basePanel) return undefined;
  return {
    ...basePanel,
    sections: basePanel.sections.map((section) => ({
      ...section,
      rows: section.rows.map((row) => {
        const stat = playerStats[row.stat_id];
        if (["fire_resistance_percent", "cold_resistance_percent", "lightning_resistance_percent"].includes(row.stat_id)) {
          const value = statNumber(stat, 0) + statNumber(playerStats.elemental_resistance_percent, 0);
          return { ...row, value };
        }
        if (row.stat_id === "life_regen_flat") {
          const value = Math.max(0, statNumber(playerStats.life_regen_flat, 0) * (1 + Math.max(0, statNumber(playerStats.life_regen_add_percent, 0)) / 100))
            + Math.max(0, statNumber(playerStats.max_life, 0) * statNumber(playerStats.life_regen_percent_per_second, 0) / 100);
          return { ...row, value };
        }
        if (row.stat_id === "mana_regen_flat") {
          const value = Math.max(0, statNumber(playerStats.mana_regen_flat, 0) * (1 + Math.max(0, statNumber(playerStats.mana_regen_add_percent, 0)) / 100));
          return { ...row, value };
        }
        if (row.stat_id === "armor") {
          const value = Math.max(0, statNumber(playerStats.armor, 0) * (1 + Math.max(0, statNumber(playerStats.armor_add_percent, 0)) / 100));
          return { ...row, value };
        }
        if (row.stat_id === "evasion") {
          const value = Math.max(0, statNumber(playerStats.evasion, 0) * (1 + Math.max(0, statNumber(playerStats.evasion_add_percent, 0)) / 100));
          return { ...row, value };
        }
        return typeof stat?.value === "number" || typeof stat?.value === "boolean"
          ? { ...row, value: stat.value }
          : row;
      })
    }))
  };
}
