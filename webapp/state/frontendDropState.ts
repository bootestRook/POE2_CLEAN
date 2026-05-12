import { allowedFrontendLootKindsForPool, resolveFrontendMonsterDropRule, scaleFrontendDropRarityWeights } from "../frontendMonsterDropRules";
import {
  chooseFrontendEquipmentSource,
  frontendEquipmentAffixTexts,
  frontendEquipmentRarityText,
  frontendEquipmentStatModifiers,
  generateFrontendEquipment,
  type FrontendEquipmentAffixRoll,
  type FrontendEquipmentStatModifier
} from "../frontendEquipmentRuntime";
import { frontendEquipmentIconSprite } from "../frontendEquipmentIconSprites";
import { createFrontendOrdinaryItem, frontendOrdinaryItemDefinitionById } from "../frontendOrdinaryItemData";
import { equipmentTooltipAffixLine, equipmentRarityTone } from "../components/tooltips/tooltipFormatting";
import { createFrontendItemTooltipView, type TooltipView } from "../components/tooltips/tooltipViewModel";
import { frontendEquipmentSourceSlotIdFromText, isTwoHandedEquipmentSource } from "../components/inventory/equipmentRules";
import { FRONTEND_SKILL_LEVEL_TABLES } from "../frontendSkillLevelTables";
import { localize, localizeTemplate } from "../localization";
import { clamp } from "../utils/math2d";
import type { Enemy } from "../types/enemyTypes";

type FrontendDropGem = {
  instance_id: string;
  base_gem_id?: string;
  item_kind?: "gem" | "ordinary" | "equipment";
  name_text: string;
  description_text?: string;
  category_text: string;
  rarity_text: string;
  gem_kind?: string;
  gem_type: { id?: string; number?: number; display_text: string; identity_text: string };
  tags: readonly { id?: string; text: string; tone?: string }[];
  current_effective_targets: readonly { name_text: string }[];
  board_position: { row: number; column: number } | null;
  tooltip_view?: TooltipView;
  level?: number;
  stack_count?: number;
  max_stack_count?: number;
  equipment_affixes?: FrontendEquipmentAffixRoll[];
  equipment_stat_modifiers?: FrontendEquipmentStatModifier[];
  equipment_slot_id?: string;
  equipment_rarity?: string;
  [key: string]: unknown;
};

type FrontendSkillLevelValues = Record<string, number>;

export type FrontendDropAppState<TGem extends FrontendDropGem> = {
  inventory: TGem[];
  map_progression?: {
    stages: FrontendMapProgressionStageView[];
  };
};

export type FrontendDropPrompt<TGem extends FrontendDropGem = FrontendDropGem> = {
  drop_id: string;
  loot_kind?: "gem" | "equipment" | "map_entry" | string;
  name_text: string;
  rarity_text: string;
  picked_up: boolean;
  status_text: string;
  position?: { x: number; y: number };
  level?: number;
  equipment_source?: string;
  equipment_rarity?: string;
  equipment_affixes?: FrontendEquipmentAffixRoll[];
  equipment_stat_modifiers?: FrontendEquipmentStatModifier[];
  base_gem_instance_id?: string;
  ordinary_item_id?: string;
  stack_count?: number;
  max_stack_count?: number;
  target_stage_id?: string;
  dropped_item?: TGem;
};

export type FrontendMapProgressionStageView = {
  id: string;
  display_name: string;
  phase: string;
  order: number;
  map_level_min: number;
  map_level_max: number;
  gem_level_min: number;
  gem_level_max: number;
  base_drop_chance: number;
  stage_scope?: "minor" | "major_final" | "timemark";
  equipment_weight?: number;
  gem_weight?: number;
  map_entry_weight?: number;
  equipment_rarity_weights?: Record<string, number>;
  selected?: boolean;
  enterable?: boolean;
};

export type FrontendDropGemOption = {
  id: string;
  name_text: string;
  kind: string;
  sudoku_digit: number;
};

type CreateFrontendDropOptions = {
  stage: FrontendMapProgressionStageView;
  stages: FrontendMapProgressionStageView[];
  gmGems: FrontendDropGemOption[];
  elapsedSeconds: number;
  nextDropId: () => number;
  fallbackBaseGemInstanceId?: string;
};

type CreateFrontendInventoryItemOptions<TState extends FrontendDropAppState<TGem>, TGem extends FrontendDropGem> = {
  cloneFrontendData: <T>(value: T) => T;
  cloneFrontendInitialAppStateSeed: () => TState;
  frontendGemDropPool: () => readonly TGem[];
  gmEquipmentSources: readonly { id: string; name_text: string }[];
  nextItemId: () => number;
};

export function selectedFrontendMapStage(stages: FrontendMapProgressionStageView[], stageIdOverride?: string) {
  return stages.find((stage) => stage.id === stageIdOverride)
    ?? stages.find((stage) => stage.selected)
    ?? stages.find((stage) => stage.enterable)
    ?? null;
}

export function frontendDropRoll(enemy: Pick<Enemy, "id">, salt: number, elapsedSeconds: number) {
  const raw = Math.sin(enemy.id * 12.9898 + salt * 78.233 + Math.floor(elapsedSeconds * 10) * 37.719) * 43758.5453;
  return raw - Math.floor(raw);
}

export function frontendMonsterDropChance(stage: FrontendMapProgressionStageView, enemy: Enemy) {
  const baseChance = clamp(stage.base_drop_chance, 0, 0.6);
  return clamp(baseChance, 0, enemy.boss ? 0.95 : 0.75);
}

export function frontendMonsterDropAttempts(enemy: Enemy, salt: number, elapsedSeconds: number) {
  const dropRule = resolveFrontendMonsterDropRule(enemy.spawnRarity, enemy.monsterType, Boolean(enemy.boss));
  const quantityMultiplier = Math.max(0, Number(dropRule.drop_quantity_multiplier ?? 0));
  const guaranteedAttempts = Math.floor(quantityMultiplier);
  const fractionalAttempt = quantityMultiplier - guaranteedAttempts;
  return guaranteedAttempts + (frontendDropRoll(enemy, salt + 191, elapsedSeconds) < fractionalAttempt ? 1 : 0);
}

export function frontendRandomMapLevel(stage: FrontendMapProgressionStageView, enemy: Enemy, salt: number, elapsedSeconds: number) {
  const minLevel = Math.max(1, Math.round(Math.min(stage.map_level_min, stage.map_level_max)));
  const maxLevel = Math.max(minLevel, Math.round(Math.max(stage.map_level_min, stage.map_level_max)));
  return Math.floor(minLevel + frontendDropRoll(enemy, salt, elapsedSeconds) * (maxLevel - minLevel + 1));
}

export function frontendEquipmentDropRarity(stage: FrontendMapProgressionStageView, enemy: Enemy, roll: number) {
  const dropRule = resolveFrontendMonsterDropRule(enemy.spawnRarity, enemy.monsterType, Boolean(enemy.boss));
  const weights = scaleFrontendDropRarityWeights(
    stage.equipment_rarity_weights ?? { white: 700, blue: 250, purple: 50, pink: 0 },
    dropRule.drop_rarity_multiplier,
    ["blue", "purple", "pink"]
  );
  const white = Math.max(0, Number(weights.white ?? 0));
  const blue = Math.max(0, Number(weights.blue ?? 0));
  const purple = Math.max(0, Number(weights.purple ?? 0));
  const pink = Math.max(0, Number(weights.pink ?? 0));
  const total = white + blue + purple + pink;
  if (total <= 0) return "white";
  const cursor = roll * total;
  if (cursor < white) return "white";
  if (cursor < white + blue) return "blue";
  if (cursor < white + blue + purple) return "purple";
  return "pink";
}

export function frontendDropKind(stage: FrontendMapProgressionStageView, roll: number, canDropMapEntry: boolean, dropPoolId: string | undefined): FrontendDropPrompt["loot_kind"] {
  const allowedKinds = new Set(allowedFrontendLootKindsForPool(dropPoolId));
  const equipment = allowedKinds.has("equipment") ? Math.max(0, Number(stage.equipment_weight ?? 0)) : 0;
  const gem = allowedKinds.has("gem") ? Math.max(0, Number(stage.gem_weight ?? 0)) : 0;
  const mapEntry = allowedKinds.has("map_entry") && canDropMapEntry ? Math.max(0, Number(stage.map_entry_weight ?? 0)) : 0;
  const total = equipment + gem + mapEntry;
  if (total <= 0) return "equipment";
  const cursor = roll * total;
  if (cursor < equipment) return "equipment";
  if (cursor < equipment + gem) return "gem";
  return "map_entry";
}

export function frontendMapEntryTargetStage(stage: FrontendMapProgressionStageView, stages: FrontendMapProgressionStageView[], enemy: Enemy, salt: number, elapsedSeconds: number) {
  if (stage.stage_scope === "major_final" && stage.phase !== "timemark") return stage;
  const candidates = [
    ...(stage.order > 1 ? [stage] : []),
    ...stages.filter((candidate) => candidate.order === stage.order + 1 && candidate.id !== stage.id)
  ];
  if (candidates.length === 0) return null;
  return candidates[Math.floor(frontendDropRoll(enemy, salt, elapsedSeconds) * candidates.length) % candidates.length];
}

export function frontendMajorFinalBossNextStage(stage: FrontendMapProgressionStageView, stages: FrontendMapProgressionStageView[], enemy: Enemy) {
  if (!enemy.boss) return null;
  if (stage.stage_scope !== "major_final" || stage.phase === "timemark") return null;
  return stages.find((candidate) => candidate.order === stage.order + 1 && candidate.id !== stage.id) ?? null;
}

export function frontendGemDropWeight(gem: FrontendDropGemOption) {
  let weight = 1;
  if (Number(gem.sudoku_digit) === 9) return weight * 0.35;
  if (gem.kind === "active_skill") return weight * 0.35;
  return weight;
}

export function chooseFrontendGemDropOption(gems: FrontendDropGemOption[], enemy: Enemy, salt: number, elapsedSeconds: number) {
  if (gems.length === 0) return null;
  const weighted = gems.map((gem) => ({ gem, weight: frontendGemDropWeight(gem) }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return gems[Math.floor(frontendDropRoll(enemy, salt, elapsedSeconds) * gems.length) % gems.length];
  let cursor = frontendDropRoll(enemy, salt, elapsedSeconds) * total;
  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) return item.gem;
  }
  return weighted[weighted.length - 1]?.gem ?? null;
}

export function createFrontendDrop(enemy: Enemy, index: number, options: CreateFrontendDropOptions): FrontendDropPrompt | null {
  const { stage, stages, gmGems, elapsedSeconds, nextDropId, fallbackBaseGemInstanceId } = options;
  const dropChance = frontendMonsterDropChance(stage, enemy);
  if (frontendDropRoll(enemy, index, elapsedSeconds) > dropChance) return null;
  const mapEntryStage = frontendMapEntryTargetStage(stage, stages, enemy, index + 109, elapsedSeconds);
  const kindRoll = frontendDropRoll(enemy, index + 17, elapsedSeconds);
  const dropRule = resolveFrontendMonsterDropRule(enemy.spawnRarity, enemy.monsterType, Boolean(enemy.boss));
  const level = Math.round(clamp(stage.gem_level_min + frontendDropRoll(enemy, index + 29, elapsedSeconds) * (stage.gem_level_max - stage.gem_level_min), stage.gem_level_min, stage.gem_level_max));
  const equipmentLevel = frontendRandomMapLevel(stage, enemy, index + 83, elapsedSeconds);
  let lootKind = frontendDropKind(stage, kindRoll, Boolean(mapEntryStage), dropRule.drop_pool_id);
  let nameText = `Lv${equipmentLevel} ${localize("ui.drop.equipment")}`;
  let equipmentRarity = frontendEquipmentDropRarity(stage, enemy, frontendDropRoll(enemy, index + 97, elapsedSeconds));
  let rarityText = frontendEquipmentRarityText(equipmentRarity);
  let targetStageId: string | undefined;
  let baseGemInstanceId: string | undefined;
  let equipmentSource = chooseFrontendEquipmentSource(Math.floor(frontendDropRoll(enemy, index + 53, elapsedSeconds) * 1000000000));
  let equipmentAffixes: FrontendEquipmentAffixRoll[] | undefined;
  let equipmentStatModifiers: FrontendEquipmentStatModifier[] | undefined;
  let statusText = localize("ui.drop.click_pickup");
  if (lootKind === "map_entry" && mapEntryStage) {
    lootKind = "map_entry";
    nameText = localizeTemplate("ui.drop.map_ticket", { stage: mapEntryStage.display_name });
    rarityText = localize("ui.drop.map");
    targetStageId = mapEntryStage.id;
  } else if (lootKind === "gem") {
    lootKind = "gem";
    const gemOption = chooseFrontendGemDropOption(gmGems, enemy, index + 41, elapsedSeconds);
    baseGemInstanceId = gemOption?.id ?? fallbackBaseGemInstanceId;
    nameText = gemOption ? `Lv${level} ${gemOption.name_text}` : `Lv${level} ${localize("ui.drop.skill_gem")}`;
    rarityText = localize("ui.drop.gem");
  } else {
    const seed = enemy.id * 1000003 + index * 9176 + Math.floor(frontendDropRoll(enemy, index + 71, elapsedSeconds) * 1000000);
    const generated = generateFrontendEquipment(equipmentSource, equipmentLevel, equipmentRarity, seed);
    equipmentAffixes = [generated.base_affix, ...generated.prefix_affixes, ...generated.suffix_affixes];
    equipmentStatModifiers = frontendEquipmentStatModifiers(generated);
    const affixTexts = frontendEquipmentAffixTexts(generated);
    nameText = `Lv${equipmentLevel} ${generated.source}`;
    rarityText = frontendEquipmentRarityText(generated.rarity);
    equipmentRarity = generated.rarity;
    equipmentSource = generated.source;
    statusText = affixTexts.join(localize("ui.drop.affix_separator"));
  }
  return {
    drop_id: `frontend_drop_${nextDropId()}`,
    loot_kind: lootKind,
    name_text: nameText,
    rarity_text: rarityText,
    picked_up: false,
    status_text: statusText,
    position: { x: enemy.x, y: enemy.y },
    level: lootKind === "equipment" ? equipmentLevel : level,
    equipment_source: equipmentSource,
    equipment_rarity: equipmentRarity,
    equipment_affixes: equipmentAffixes,
    equipment_stat_modifiers: equipmentStatModifiers,
    base_gem_instance_id: baseGemInstanceId,
    target_stage_id: targetStageId
  };
}

export function createGuaranteedNextMapEntryDrop(enemy: Enemy, stage: FrontendMapProgressionStageView, stages: FrontendMapProgressionStageView[], index: number, nextDropId: () => number): FrontendDropPrompt | null {
  const targetStage = frontendMajorFinalBossNextStage(stage, stages, enemy);
  if (!targetStage) return null;
  return {
    drop_id: `frontend_drop_${nextDropId()}`,
    loot_kind: "map_entry",
    name_text: localizeTemplate("ui.drop.map_ticket", { stage: targetStage.display_name }),
    rarity_text: localize("ui.drop.map"),
    picked_up: false,
    status_text: localize("ui.drop.click_pickup"),
    position: { x: enemy.x + 28 + (index % 2) * 12, y: enemy.y },
    level: stage.gem_level_max,
    target_stage_id: targetStage.id
  };
}

export function nextFrontendInventoryItemId<TState extends FrontendDropAppState<TGem>, TGem extends FrontendDropGem>(current: TState, nextItemId: () => number) {
  const existingIds = new Set(current.inventory.map((item) => item.instance_id));
  let id = `frontend_item_${nextItemId()}`;
  while (existingIds.has(id)) {
    id = `frontend_item_${nextItemId()}`;
  }
  return id;
}

function frontendGemLevelTableValues(gem: FrontendDropGem, level: number): FrontendSkillLevelValues {
  const tableId = String(gem.base_gem_id ?? gem.instance_id ?? "");
  const table = (FRONTEND_SKILL_LEVEL_TABLES as Record<string, Record<number, FrontendSkillLevelValues>>)[tableId];
  if (!table) return {};
  const levels = Object.keys(table).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (levels.length === 0) return {};
  const clampedLevel = Math.round(clamp(level, levels[0], levels[levels.length - 1]));
  return { ...(table[clampedLevel] ?? {}) };
}

function frontendStatId(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return String((value as { id?: unknown }).id ?? "");
  }
  return "";
}

function frontendMaterializedLevelValue(levelValues: FrontendSkillLevelValues, key: string, fallback: unknown) {
  const value = levelValues[key];
  return Number.isFinite(value) ? value : fallback;
}

function materializeFrontendGemModifiers(modifiers: unknown, levelValues: FrontendSkillLevelValues) {
  if (!Array.isArray(modifiers)) return modifiers;
  return modifiers.map((modifier) => {
    if (!modifier || typeof modifier !== "object" || Array.isArray(modifier)) return modifier;
    const record = modifier as Record<string, unknown>;
    const key = String(record.table_key ?? frontendStatId(record.stat));
    if (!key) return modifier;
    return {
      ...record,
      value: frontendMaterializedLevelValue(levelValues, key, record.value),
    };
  });
}

function materializeFrontendPassiveEffects(passiveEffects: unknown, levelValues: FrontendSkillLevelValues) {
  if (!Array.isArray(passiveEffects)) return passiveEffects;
  return passiveEffects.map((effect) => {
    if (!effect || typeof effect !== "object" || Array.isArray(effect)) return effect;
    const record = effect as Record<string, unknown>;
    const key = String(record.table_key ?? record.stat ?? "");
    if (!key) return effect;
    return {
      ...record,
      value: frontendMaterializedLevelValue(levelValues, key, record.value),
    };
  });
}

function materializeFrontendGemBaseEffect(baseEffect: unknown, levelValues: FrontendSkillLevelValues) {
  if (!baseEffect || typeof baseEffect !== "object" || Array.isArray(baseEffect)) return baseEffect;
  const next = { ...(baseEffect as Record<string, unknown>) };
  for (const [key, value] of Object.entries(levelValues)) {
    if (key.startsWith("hit_damage_component_") || key.startsWith("hit_ailment_")) continue;
    next[key] = value;
  }
  next.modifiers = materializeFrontendGemModifiers(next.modifiers, levelValues);
  return next;
}

function materializeFrontendGemTlidb(tlidb: unknown, levelValues: FrontendSkillLevelValues) {
  if (!tlidb || typeof tlidb !== "object" || Array.isArray(tlidb)) return tlidb;
  return {
    ...(tlidb as Record<string, unknown>),
    level_values: {
      ...(((tlidb as Record<string, unknown>).level_values as Record<string, unknown> | undefined) ?? {}),
      ...levelValues,
    },
  };
}

function materializeFrontendGemTooltipView(tooltipView: unknown, level: number, levelValues: FrontendSkillLevelValues) {
  if (!tooltipView || typeof tooltipView !== "object" || Array.isArray(tooltipView)) return tooltipView;
  const view = tooltipView as TooltipView;
  if (view.variant !== "active") return tooltipView;
  const damage = levelValues.base_damage;
  return {
    ...view,
    sections: {
      ...view.sections,
      stats: {
        ...view.sections.stats,
        lines: view.sections.stats.lines.map((line) => (
          Number.isFinite(damage) && activeTooltipPrimaryDamageLine(line.label_text)
            ? { ...line, value_text: materializedTooltipNumber(damage) }
            : line
        )),
      },
      base_skill_level: {
        ...view.sections.base_skill_level,
        lines: [`\u57fa\u7840\u6280\u80fd\u7b49\u7ea7\u4e3a ${level}`],
      },
    },
  };
}

function activeTooltipPrimaryDamageLine(labelText: string) {
  return labelText.includes("\u4f24\u5bb3") || labelText.includes("\u6d5c\u3085");
}

function materializedTooltipNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 100) return Math.round(value).toString();
  if (Math.abs(value) >= 10) return value.toFixed(1).replace(/\.0$/, "");
  return value.toFixed(2).replace(/\.00$/, "").replace(/0$/, "");
}

function materializeFrontendGemLevel<TGem extends FrontendDropGem>(gem: TGem, level: number): TGem {
  const normalizedLevel = Math.max(1, Math.floor(Number(level) || 1));
  const levelValues = frontendGemLevelTableValues(gem, normalizedLevel);
  if (Object.keys(levelValues).length === 0) {
    return {
      ...gem,
      level: normalizedLevel,
    };
  }
  return {
    ...gem,
    level: normalizedLevel,
    base_effect: materializeFrontendGemBaseEffect(gem.base_effect, levelValues),
    passive_effects: materializeFrontendPassiveEffects(gem.passive_effects, levelValues),
    tlidb: materializeFrontendGemTlidb(gem.tlidb, levelValues),
    tooltip_view: materializeFrontendGemTooltipView(gem.tooltip_view, normalizedLevel, levelValues),
  };
}

export function createFrontendInventoryItem<TState extends FrontendDropAppState<TGem>, TGem extends FrontendDropGem>(
  drop: FrontendDropPrompt<TGem>,
  current: TState,
  options: CreateFrontendInventoryItemOptions<TState, TGem>
): FrontendDropGem {
  const { cloneFrontendData, cloneFrontendInitialAppStateSeed, frontendGemDropPool, gmEquipmentSources, nextItemId } = options;
    if (drop.dropped_item) {
      const existingIds = new Set(current.inventory.map((item) => item.instance_id));
      return {
        ...cloneFrontendData(drop.dropped_item),
        instance_id: existingIds.has(drop.dropped_item.instance_id)
          ? nextFrontendInventoryItemId(current, nextItemId)
          : drop.dropped_item.instance_id,
        board_position: null
      };
    }
    const id = nextFrontendInventoryItemId(current, nextItemId);
    if (drop.loot_kind === "gem") {
      const seedInventory = cloneFrontendInitialAppStateSeed().inventory;
      const template = current.inventory.find((item) => item.instance_id === drop.base_gem_instance_id)
        ?? seedInventory.find((item) => item.instance_id === drop.base_gem_instance_id)
        ?? frontendGemDropPool().find((item) => item.base_gem_id === drop.base_gem_instance_id || item.instance_id === drop.base_gem_instance_id)
        ?? current.inventory.find((item) => item.item_kind !== "equipment")
        ?? seedInventory.find((item) => item.item_kind !== "equipment");
      if (template) {
        return materializeFrontendGemLevel({
          ...template,
          instance_id: id,
          name_text: drop.name_text,
          rarity_text: drop.rarity_text || template.rarity_text,
          board_position: null,
        }, drop.level ?? template.level ?? 1);
      }
    }
    if (drop.loot_kind === "equipment") {
      const rarityText = drop.rarity_text || "普通";
      const rarityTone = equipmentRarityTone(drop.equipment_rarity ?? rarityText);
      const sourceText = gmEquipmentSources.find((source) => source.id === drop.equipment_source)?.name_text
        ?? drop.equipment_source
        ?? "装备";
      const bonusLines = drop.equipment_affixes?.map((affix) => {
        return equipmentTooltipAffixLine(affix.effect, affix.tier);
      }) ?? (drop.status_text && drop.status_text !== "点击拾取" && drop.status_text !== "GM 添加"
        ? drop.status_text.split(/[、；]/).map((line) => line.trim()).filter(Boolean)
        : []);
      const descriptionText = `${rarityText}${sourceText}。等级 ${drop.level ?? 1}。`;
      const equipmentSlotId = frontendEquipmentSourceSlotIdFromText(sourceText);
      const iconSprite = frontendEquipmentIconSprite(drop.equipment_source ?? sourceText);
      const tags = [
        { id: "equipment", text: "装备", tone: "category" },
        { id: drop.equipment_source ?? "equipment", text: sourceText, tone: "type" },
        ...(isTwoHandedEquipmentSource(drop.equipment_source ?? sourceText) ? [{ id: "two_handed", text: "双手", tone: "type" as const }] : []),
        { id: String(drop.equipment_rarity ?? "rarity"), text: rarityText, tone: `rarity-${rarityTone}` }
      ];
      return {
        instance_id: id,
        item_kind: "equipment",
        name_text: drop.name_text,
        description_text: bonusLines.length > 0 ? `${descriptionText} ${bonusLines.join("；")}` : descriptionText,
        category_text: sourceText,
        rarity_text: rarityText,
        gem_kind: "",
        gem_type: { id: drop.equipment_source ?? "equipment", display_text: sourceText, identity_text: drop.equipment_source ?? "equipment" },
        tags,
        current_effective_targets: [],
        board_position: null,
        level: drop.level,
        equipment_slot_id: equipmentSlotId,
        equipment_rarity: drop.equipment_rarity,
        tooltip_view: createFrontendItemTooltipView({
          nameText: drop.name_text,
          rarityText,
          categoryText: sourceText,
          identityText: `${sourceText} / ${rarityText}`,
          descriptionText,
          iconText: sourceText.slice(0, 1),
          iconColorKey: drop.equipment_rarity === "blue" ? "blue" : drop.equipment_rarity === "purple" ? "orange" : "white",
          iconSprite,
          rarityTone,
          tags,
          statLines: [
            { label_text: "等级", value_text: String(drop.level ?? 1) },
            { label_text: "来源", value_text: sourceText }
          ],
          bonusLines
        }),
        equipment_affixes: drop.equipment_affixes,
        equipment_stat_modifiers: drop.equipment_stat_modifiers ?? []
      };
    }
    if (drop.loot_kind === "ordinary") {
      const definition = frontendOrdinaryItemDefinitionById(
        String(drop.ordinary_item_id ?? drop.base_gem_instance_id ?? drop.name_text ?? "")
      );
      if (definition) {
        return createFrontendOrdinaryItem(definition, {
          instanceId: id,
          stackCount: Number(drop.stack_count ?? 1),
          maxStackCount: Number(drop.max_stack_count ?? definition.maxStackCount),
        });
      }
    }
    const rarityText = drop.rarity_text || "普通";
    const descriptionText = `${rarityText}掉落物。`;
    return {
      instance_id: id,
      item_kind: "ordinary",
      name_text: drop.name_text,
      description_text: descriptionText,
      category_text: "地图门票",
      rarity_text: rarityText,
      gem_kind: "",
      gem_type: { display_text: "地图门票", identity_text: String(drop.loot_kind ?? "loot") },
      tags: [{ id: "drop", text: "掉落" }],
      current_effective_targets: [],
      board_position: null,
      level: drop.level,
      tooltip_view: createFrontendItemTooltipView({
        nameText: drop.name_text,
        rarityText,
        categoryText: "地图门票",
        identityText: "地图门票",
        descriptionText,
        iconText: "图",
        iconColorKey: "cyan",
        tags: [{ id: "drop", text: "掉落", tone: "category" }],
        statLines: drop.target_stage_id ? [{ label_text: "解锁地图", value_text: drop.target_stage_id }] : []
      })
    };
  }
