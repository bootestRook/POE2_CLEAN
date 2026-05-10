export type InventoryLockRarity = "all" | "white" | "blue" | "purple" | "pink";

export type InventoryLockableItem = {
  item_kind?: string;
  rarity_text?: string;
  equipment_rarity?: string;
};

export const inventoryLockRarityOptions: { id: InventoryLockRarity; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "white", label: "白色" },
  { id: "blue", label: "蓝色" },
  { id: "purple", label: "紫色" },
  { id: "pink", label: "粉色" }
];

export function inventoryEquipmentLockRarity(item: InventoryLockableItem): Exclude<InventoryLockRarity, "all"> | null {
  if (item.item_kind !== "equipment") return null;
  const key = String(item.equipment_rarity ?? item.rarity_text ?? "").trim().toLowerCase();
  if (key === "white" || key === "白色" || key === "普通") return "white";
  if (key === "blue" || key === "蓝色" || key === "魔法") return "blue";
  if (key === "purple" || key === "紫色" || key === "稀有") return "purple";
  if (key === "pink" || key === "粉色" || key === "传奇") return "pink";
  return "white";
}

export function isInventoryItemLockedByRarity(item: InventoryLockableItem, activeRarities: Set<InventoryLockRarity>) {
  const rarity = inventoryEquipmentLockRarity(item);
  if (!rarity) return false;
  return activeRarities.has("all") || activeRarities.has(rarity);
}
