import {
  equipmentSourceSlotId,
  isActiveGem,
  isPassiveGem,
  isSupportGem,
  type EquipmentRuleItem
} from "./equipmentRules";
import { inventoryEquipmentLockRarity } from "./inventoryLocking";

export type InventorySortTab = "equipment" | "gem";

export type InventorySortableItem = EquipmentRuleItem & {
  instance_id: string;
  base_gem_id?: string;
  level?: number;
  sudoku_digit?: number;
  equipment_rarity?: string;
};

const EQUIPMENT_SLOT_ORDER: Record<string, number> = {
  weapon: 0,
  main_weapon: 0,
  off_weapon: 0,
  head: 1,
  chest: 2,
  gloves: 3,
  boots: 4,
  belt: 5,
  amulet: 6,
  ring: 7,
  ring_1: 7,
  ring_2: 7
};

const GEM_KIND_ORDER: Record<string, number> = {
  active: 0,
  passive: 1,
  support: 2,
  other: 3
};

const RARITY_ORDER = {
  white: 0,
  blue: 1,
  purple: 2,
  pink: 3
} as const;

export function organizeInventorySlots<TItem extends InventorySortableItem>(
  slots: readonly (string | null)[],
  itemsById: ReadonlyMap<string, TItem>,
  tab: InventorySortTab,
  lockedItemIds: ReadonlySet<string> = new Set()
) {
  const next = slots.map((instanceId) => instanceId ?? null);
  const sortable = next
    .map((instanceId, index) => ({ instanceId, index, item: instanceId ? itemsById.get(instanceId) ?? null : null }))
    .filter((entry): entry is { instanceId: string; index: number; item: TItem } => Boolean(entry.instanceId && entry.item && !lockedItemIds.has(entry.instanceId)));

  sortable.sort((left, right) => compareInventoryItems(left.item, right.item, tab) || left.index - right.index);

  const sortedIds = sortable.map((entry) => entry.instanceId);
  let cursor = 0;
  for (let index = 0; index < next.length; index += 1) {
    const instanceId = next[index];
    if (instanceId && lockedItemIds.has(instanceId)) continue;
    next[index] = cursor < sortedIds.length ? sortedIds[cursor++] : null;
  }
  return next;
}

function compareInventoryItems<TItem extends InventorySortableItem>(left: TItem, right: TItem, tab: InventorySortTab) {
  return tab === "gem" ? compareGemItems(left, right) : compareEquipmentItems(left, right);
}

function compareEquipmentItems<TItem extends InventorySortableItem>(left: TItem, right: TItem) {
  return (
    equipmentSlotRank(left) - equipmentSlotRank(right)
    || equipmentRarityRank(right) - equipmentRarityRank(left)
    || itemLevel(right) - itemLevel(left)
    || compareText(String(equipmentSourceText(left) ?? ""), String(equipmentSourceText(right) ?? ""))
    || compareText(left.name_text ?? "", right.name_text ?? "")
    || compareText(left.instance_id ?? "", right.instance_id ?? "")
  );
}

function compareGemItems<TItem extends InventorySortableItem>(left: TItem, right: TItem) {
  return (
    gemKindRank(left) - gemKindRank(right)
    || gemDigit(left) - gemDigit(right)
    || itemLevel(right) - itemLevel(left)
    || compareText(left.name_text ?? "", right.name_text ?? "")
    || compareText(left.base_gem_id ?? "", right.base_gem_id ?? "")
    || compareText(left.instance_id, right.instance_id)
  );
}

function equipmentSlotRank(item: InventorySortableItem) {
  const slotId = equipmentSourceSlotId(item);
  return EQUIPMENT_SLOT_ORDER[slotId] ?? 99;
}

function equipmentRarityRank(item: InventorySortableItem) {
  const rarity = inventoryEquipmentLockRarity(item);
  return rarity ? RARITY_ORDER[rarity] : 0;
}

function gemKindRank(item: InventorySortableItem) {
  if (isActiveGem(item)) return GEM_KIND_ORDER.active;
  if (isPassiveGem(item)) return GEM_KIND_ORDER.passive;
  if (isSupportGem(item)) return GEM_KIND_ORDER.support;
  return GEM_KIND_ORDER.other;
}

function gemDigit(item: InventorySortableItem) {
  const value = Number(item.sudoku_digit ?? item.gem_type?.number ?? 99);
  return Number.isFinite(value) ? value : 99;
}

function itemLevel(item: InventorySortableItem) {
  const value = Number(item.level ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function equipmentSourceText(item: InventorySortableItem) {
  return item.gem_type?.identity_text || item.gem_type?.display_text || item.category_text || item.name_text;
}

function compareText(left: string, right: string) {
  return left.localeCompare(right, "zh-Hans-CN", { numeric: true, sensitivity: "base" });
}
