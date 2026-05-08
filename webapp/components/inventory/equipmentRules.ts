import type { TooltipView } from "../tooltips/tooltipViewModel";

export type EquipmentRuleItem = {
  item_kind?: string;
  name_text: string;
  category_text: string;
  rarity_text: string;
  gem_kind?: string;
  gem_type?: { id?: string; display_text?: string; identity_text?: string };
  tags: readonly { id?: string; text: string }[];
  tooltip_view?: TooltipView;
  equipment_slot_id?: string;
};

export type EquipmentRuleSlot = {
  id: string;
  accepts: readonly string[];
};

const EQUIPMENT_SLOT_IDS = new Set([
  "head",
  "chest",
  "amulet",
  "gloves",
  "belt",
  "boots",
  "ring_1",
  "ring_2",
  "main_weapon",
  "off_weapon"
]);

export function removeItemsFromInventorySlots(slots: (string | null)[], instanceIds: string[]) {
  const idSet = new Set(instanceIds.filter(Boolean));
  return slots.map((slotInstanceId) => (slotInstanceId && idSet.has(slotInstanceId) ? null : slotInstanceId));
}

export function isGemItem(item: EquipmentRuleItem) {
  return item.item_kind === "gem" || item.tags.some((tag) => tag.id === "gem");
}

export function canPlaceItemInEquipmentSlot(item: EquipmentRuleItem, slot: EquipmentRuleSlot) {
  if (item.item_kind !== "equipment" || isGemItem(item)) return false;
  const sourceSlot = equipmentSourceSlotId(item);
  if (sourceSlot) {
    if (sourceSlot === "ring") return slot.id === "ring_1" || slot.id === "ring_2";
    if (sourceSlot === "weapon") return isWeaponSlot(slot);
    return slot.id === sourceSlot;
  }
  if (isWeaponSlot(slot)) return isWeaponItem(item);
  const searchable = equipmentSearchText(item);
  return slot.accepts.some((keyword) => searchable.includes(keyword.toLowerCase()));
}

export function isWeaponSlot(slot: EquipmentRuleSlot | undefined) {
  return slot?.id === "main_weapon" || slot?.id === "off_weapon";
}

export function isWeaponItem(item: EquipmentRuleItem) {
  if (equipmentSourceSlotId(item) === "weapon") return true;
  const source = equipmentSourceText(item);
  if ([
    "\u6b66\u5668",
    "\u76fe\u724c",
    "\u5315\u9996",
    "\u5355\u624b\u5251",
    "\u5355\u624b\u65a7",
    "\u5355\u624b\u9524",
    "\u53cc\u624b\u5251",
    "\u53cc\u624b\u65a7",
    "\u53cc\u624b\u9524",
    "\u5f13",
    "\u5f29",
    "\u624b\u6756",
    "\u624b\u67aa",
    "\u6b66\u6756",
    "\u6cd5\u6756",
    "\u706b\u67aa",
    "\u706b\u70ae",
    "\u7075\u6756",
    "\u722a",
    "\u9521\u6756",
    "\u9b54\u6756"
  ].some((keyword) => source.includes(keyword))) return true;
  const searchable = equipmentSearchText(item);
  return [
    "weapon",
    "weapons",
    "sword",
    "blade",
    "axe",
    "mace",
    "bow",
    "crossbow",
    "staff",
    "wand",
    "dagger",
    "claw",
    "spear",
    "gun",
    "\u6b66\u5668",
    "\u5251",
    "\u5200",
    "\u65a7",
    "\u9524",
    "\u5f13",
    "\u5f29",
    "\u6756",
    "\u6cd5\u6756",
    "\u5315\u9996",
    "\u722a",
    "\u67aa"
  ].some((keyword) => searchable.includes(keyword));
}

export function isTwoHandedWeapon(item: EquipmentRuleItem) {
  const source = equipmentSourceText(item);
  if (isTwoHandedEquipmentSource(source)) return true;
  const searchable = equipmentSearchText(item);
  return [
    "two_handed",
    "two-handed",
    "two handed",
    "2h",
    "greatsword",
    "greataxe",
    "greatmace",
    "longbow",
    "staff",
    "\u53cc\u624b",
    "\u53cc\u624b\u6b66\u5668",
    "\u53cc\u624b\u5251",
    "\u53cc\u624b\u65a7",
    "\u53cc\u624b\u9524",
    "\u957f\u5f13",
    "\u6cd5\u6756"
  ].some((keyword) => searchable.includes(keyword));
}

export function isTwoHandedEquipmentSource(source: string) {
  return [
    "\u53cc\u624b\u5251",
    "\u53cc\u624b\u65a7",
    "\u53cc\u624b\u9524",
    "\u5f13",
    "\u5f29",
    "\u6cd5\u6756",
    "\u706b\u70ae",
    "\u53cc\u624b\u5251",
    "\u53cc\u624b\u65a7",
    "\u53cc\u624b\u9524",
    "\u5f13",
    "\u5f29",
    "\u6cd5\u6756",
    "\u706b\u70ae"
  ].some((keyword) => source.includes(keyword));
}

export function equipmentSourceSlotId(item: EquipmentRuleItem): string {
  const explicitSlot = normalizeEquipmentSlotId(item.equipment_slot_id ?? "");
  if (explicitSlot) return explicitSlot;
  const source = equipmentSourceText(item);
  if (!source) return "";
  const sourceSlot = frontendEquipmentSourceSlotIdFromText(source);
  if (sourceSlot) return sourceSlot;
  if (source.includes("\u5934\u90e8")) return "head";
  if (source.includes("\u80f8\u7532")) return "chest";
  if (source.includes("\u624b\u5957")) return "gloves";
  if (source.includes("\u978b\u5b50")) return "boots";
  if (source.includes("\u8170\u5e26")) return "belt";
  if (source.includes("\u9879\u94fe")) return "amulet";
  if (source.includes("\u6212\u6307") || source.includes("\u7075\u6212")) return "ring";
  if (source.includes("\u76fe\u724c")) return "weapon";
  if ([
    "\u5315\u9996",
    "\u5355\u624b\u5251",
    "\u5355\u624b\u65a7",
    "\u5355\u624b\u9524",
    "\u53cc\u624b\u5251",
    "\u53cc\u624b\u65a7",
    "\u53cc\u624b\u9524",
    "\u5f13",
    "\u5f29",
    "\u624b\u6756",
    "\u624b\u67aa",
    "\u6b66\u6756",
    "\u6cd5\u6756",
    "\u706b\u67aa",
    "\u706b\u70ae",
    "\u7075\u6756",
    "\u722a",
    "\u9521\u6756",
    "\u9b54\u6756"
  ].some((keyword) => source.includes(keyword))) return "weapon";
  return "";
}

export function normalizeEquipmentSlotId(slotId: string) {
  if (slotId === "ring") return "ring";
  if (slotId === "weapon") return "weapon";
  if (EQUIPMENT_SLOT_IDS.has(slotId)) return slotId;
  return "";
}

export function equipmentSourceText(item: EquipmentRuleItem) {
  return [
    item.gem_type?.identity_text ?? "",
    item.gem_type?.display_text ?? "",
    item.category_text,
    item.tooltip_view?.type_identity_text ?? "",
    item.tooltip_view?.subtitle_text ?? "",
    item.name_text
  ].join(" ");
}

export function frontendEquipmentSourceSlotIdFromText(source: string) {
  if (source.includes("\u5934\u90e8")) return "head";
  if (source.includes("\u80f8\u7532")) return "chest";
  if (source.includes("\u624b\u5957")) return "gloves";
  if (source.includes("\u978b\u5b50")) return "boots";
  if (source.includes("\u8170\u5e26")) return "belt";
  if (source.includes("\u9879\u94fe")) return "amulet";
  if (source.includes("\u6212\u6307") || source.includes("\u7075\u6212")) return "ring";
  if (source.includes("\u76fe\u724c")) return "weapon";
  return [
    "\u5315\u9996",
    "\u5355\u624b\u5251",
    "\u5355\u624b\u65a7",
    "\u5355\u624b\u9524",
    "\u53cc\u624b\u5251",
    "\u53cc\u624b\u65a7",
    "\u53cc\u624b\u9524",
    "\u5f13",
    "\u5f29",
    "\u624b\u6756",
    "\u624b\u67aa",
    "\u6b66\u6756",
    "\u6cd5\u6756",
    "\u706b\u67aa",
    "\u706b\u70ae",
    "\u7075\u6756",
    "\u722a",
    "\u9521\u6756",
    "\u9b54\u6756"
  ].some((keyword) => source.includes(keyword)) ? "weapon" : "";
}

export function equipmentSearchText(item: EquipmentRuleItem) {
  return [
    item.item_kind ?? "",
    item.name_text,
    item.category_text,
    item.rarity_text,
    item.gem_kind ?? "",
    item.gem_type?.id ?? "",
    item.gem_type?.display_text ?? "",
    item.gem_type?.identity_text ?? "",
    item.tooltip_view?.subtitle_text ?? "",
    item.tooltip_view?.type_identity_text ?? "",
    ...item.tags.flatMap((tag) => [tag.id ?? "", tag.text])
  ].join(" ").toLowerCase();
}

export function isActiveGem(item: EquipmentRuleItem) {
  return item.gem_kind === "active_skill" || item.tags.some((tag) => tag.id === "active_skill_gem");
}

export function isPassiveGem(item: EquipmentRuleItem) {
  return item.gem_kind === "passive_skill" || item.tags.some((tag) => tag.id === "passive_skill_gem");
}

export function isSupportGem(item: EquipmentRuleItem) {
  return item.gem_kind === "support" || item.tags.some((tag) => tag.id === "support_gem");
}
