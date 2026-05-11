import {
  craftFrontendEquipmentAffix,
  frontendEquipmentRarityText,
  frontendEquipmentSourceForAffixRoll,
  frontendEquipmentStatModifiers,
  rerollFrontendEquipmentAffix,
} from "../../frontendEquipmentRuntime";
import type { FrontendEquipmentAffixRoll, FrontendEquipmentItem, FrontendEquipmentStatModifier } from "../../frontendEquipmentRuntime";

export const FORGE_CRAFT_SUCCESS_RATE = 1;

type ForgeCraftItem = {
  instance_id: string;
  name_text: string;
  category_text: string;
  rarity_text: string;
  level?: number;
  gem_type?: { display_text?: string; identity_text?: string };
  equipment_rarity?: string;
  equipment_affixes?: FrontendEquipmentAffixRoll[];
  equipment_stat_modifiers?: FrontendEquipmentStatModifier[];
};

export function craftForgeEquipmentItem<TItem extends ForgeCraftItem>(
  item: TItem,
  slotId: string,
  library: string,
  seed: number
): TItem {
  const slot = parseForgeAffixSlotId(slotId);
  const equipmentItem = frontendEquipmentItemFromForgeItem(item);
  if (!slot || !equipmentItem) throw new Error("当前装备无法打造。");
  const affixes = slot.gen === "prefix" ? equipmentItem.prefix_affixes : equipmentItem.suffix_affixes;
  const nextEquipmentItem = affixes[slot.index]
    ? rerollFrontendEquipmentAffix(equipmentItem, library, slot.gen, slot.index, seed)
    : craftFrontendEquipmentAffix(equipmentItem, library, slot.gen, seed);
  return forgeItemWithFrontendEquipmentItem(item, nextEquipmentItem);
}

function parseForgeAffixSlotId(slotId: string): { gen: "prefix" | "suffix"; index: number } | null {
  const match = /^(prefix|suffix)-(\d+)$/.exec(slotId);
  if (!match) return null;
  return { gen: match[1] as "prefix" | "suffix", index: Number(match[2]) };
}

function frontendEquipmentItemFromForgeItem(item: ForgeCraftItem): FrontendEquipmentItem | null {
  const affixes = item.equipment_affixes ?? [];
  const baseAffix = affixes.find((affix) => affix.gen === "base" || affix.library === "base") ?? affixes[0];
  const affixSource = affixes.map(frontendEquipmentSourceForAffixRoll).find(Boolean);
  const nameSource = item.name_text.replace(/^Lv\d+\s+/, "");
  const source = affixSource || item.gem_type?.identity_text || item.gem_type?.display_text || nameSource || item.category_text;
  const level = Math.max(1, Math.floor(Number(item.level ?? 1)));
  if (!baseAffix || !source || !Number.isFinite(level)) return null;
  return {
    source,
    level,
    rarity: item.equipment_rarity ?? "white",
    base_affix: baseAffix,
    prefix_affixes: affixes.filter((affix) => affix.gen === "prefix"),
    suffix_affixes: affixes.filter((affix) => affix.gen === "suffix"),
  };
}

function forgeItemWithFrontendEquipmentItem<TItem extends ForgeCraftItem>(item: TItem, equipmentItem: FrontendEquipmentItem): TItem {
  return {
    ...item,
    level: equipmentItem.level,
    rarity_text: frontendEquipmentRarityText(equipmentItem.rarity),
    equipment_rarity: equipmentItem.rarity,
    equipment_affixes: [equipmentItem.base_affix, ...equipmentItem.prefix_affixes, ...equipmentItem.suffix_affixes],
    equipment_stat_modifiers: frontendEquipmentStatModifiers(equipmentItem),
  };
}
