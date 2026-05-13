import { canPlaceItemInEquipmentSlot, type EquipmentRuleItem, type EquipmentRuleSlot } from "./equipmentRules";

type InventoryCellItem = {
  instance_id: string;
};

type FloatingOrigin =
  | { kind: "bag"; slotIndex: number; instanceId: string }
  | { kind: "equipment"; slotIndex: number; slotId: string; instanceId: string };

type FloatingItem<TItem> = {
  gem: TItem;
} | null;

type BagFloatingOrigin = Extract<FloatingOrigin, { kind: "bag" }>;
type EquipmentFloatingOrigin = Extract<FloatingOrigin, { kind: "equipment" }>;

export function bagCellClass<TItem extends InventoryCellItem, TFloating>(
  slotIndex: number,
  hoveredBagSlot: number | null,
  gem: TItem,
  hoveredGemId: string | null,
  floatingGem: TFloating | null,
  isFloatingOrigin: (floatingItem: TFloating | null, origin: BagFloatingOrigin) => boolean
) {
  const classes = ["bag-cell"];
  if (hoveredBagSlot === slotIndex) classes.push("bag-slot-hover");
  if (hoveredGemId === gem.instance_id) classes.push("hover-self");
  if (isFloatingOrigin(floatingGem, { kind: "bag", slotIndex, instanceId: gem.instance_id })) classes.push("has-ghost");
  return classes.join(" ");
}

export function bagEmptyCellClass(slotIndex: number, hoveredBagSlot: number | null) {
  const classes = ["bag-empty-cell"];
  if (hoveredBagSlot === slotIndex) classes.push("bag-slot-hover");
  return classes.join(" ");
}

export function equipmentCellClass<TItem extends InventoryCellItem, TFloating>(
  slotIndex: number,
  hoveredEquipmentSlot: number | null,
  item: TItem,
  hoveredGemId: string | null,
  floatingGem: TFloating | null,
  slot: EquipmentRuleSlot | undefined,
  isFloatingOrigin: (floatingItem: TFloating | null, origin: EquipmentFloatingOrigin) => boolean,
  spansBothWeaponSlots = false
) {
  const classes = ["equipment-cell"];
  if (hoveredEquipmentSlot === slotIndex) classes.push("equipment-slot-hover");
  if (hoveredGemId === item.instance_id) classes.push("hover-self");
  if (spansBothWeaponSlots) classes.push("equipment-cell-two-hand");
  if (slot && isFloatingOrigin(floatingGem, { kind: "equipment", slotIndex, slotId: slot.id, instanceId: item.instance_id })) classes.push("has-ghost");
  return classes.join(" ");
}

export function equipmentEmptyCellClass<TItem extends EquipmentRuleItem, TFloating extends FloatingItem<TItem>>(
  slotIndex: number,
  hoveredEquipmentSlot: number | null,
  floatingGem: TFloating | null,
  slot: EquipmentRuleSlot
) {
  const classes = ["equipment-empty-cell"];
  if (hoveredEquipmentSlot === slotIndex) classes.push("equipment-slot-hover");
  if (floatingGem) classes.push(canPlaceItemInEquipmentSlot(floatingGem.gem, slot) ? "legal-equipment-cell" : "invalid-equipment-cell");
  return classes.join(" ");
}
