import { frontendEquipmentRarities } from "../../frontendEquipmentRuntime";
import { equipmentSourceSlotId, isWeaponItem } from "../inventory/equipmentRules";
import {
  buildEquipmentTooltipBonusLines,
  buildEquipmentTooltipRarityTone,
  buildEquipmentTooltipStatLines,
  buildNormalizedEquipmentTooltipTags
} from "./tooltipFormatting";
import type { TooltipStatLine, TooltipView } from "./tooltipViewModel";

type EquipmentTooltipGem = {
  item_kind?: string;
  name_text: string;
  category_text: string;
  rarity_text: string;
  gem_type?: { id?: string; display_text?: string; identity_text?: string };
  tags: readonly { id?: string; text: string }[];
  tooltip_view?: TooltipView;
  equipment_slot_id?: string;
  equipment_rarity?: string;
  equipment_affixes?: readonly { effect: string; tier: unknown }[];
};

export function equipmentTooltipRarityTone(gem: EquipmentTooltipGem, view?: TooltipView) {
  return buildEquipmentTooltipRarityTone(gem, view);
}

export function normalizedEquipmentTooltipTags(gem: EquipmentTooltipGem, view: TooltipView, rarityTone: string) {
  return buildNormalizedEquipmentTooltipTags(gem, view, rarityTone, frontendEquipmentRarities);
}

export function equipmentTooltipStatLines(gem: EquipmentTooltipGem, lines: TooltipStatLine[]) {
  return buildEquipmentTooltipStatLines(gem, lines, equipmentSourceSlotId, isWeaponItem);
}

export function equipmentTooltipBonusLines(gem: EquipmentTooltipGem, lines: string[]) {
  return buildEquipmentTooltipBonusLines(gem, lines);
}
