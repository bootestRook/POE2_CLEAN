import { frontendOrdinaryItemDefinitionById } from "../../frontendOrdinaryItemData";
import { inventoryEquipmentLockRarity, type InventoryLockRarity } from "./inventoryLocking";

export type InventorySalvageItem = {
  instance_id: string;
  item_kind?: string;
  rarity_text?: string;
  equipment_rarity?: string;
};

export type InventorySalvageProduct = {
  id: string;
  nameText: string;
  count: number;
  iconText: string;
  iconSprite: string;
  tone: Exclude<InventoryLockRarity, "all">;
};

const SALVAGE_PRODUCT_BY_RARITY: Record<Exclude<InventoryLockRarity, "all">, string> = {
  white: "stardust_motes",
  blue: "stardust_sand",
  purple: "stardust_sand",
  pink: "stardust_sand"
};

export function resolveInventorySalvageProducts<TItem extends InventorySalvageItem>(
  inventoryItems: readonly TItem[],
  selectedItemIds: Set<string>
): InventorySalvageProduct[] {
  const counts = new Map<string, { count: number; tone: Exclude<InventoryLockRarity, "all"> }>();
  for (const item of inventoryItems) {
    if (!selectedItemIds.has(item.instance_id)) continue;
    const rarity = inventoryEquipmentLockRarity(item);
    if (!rarity) continue;
    const productId = SALVAGE_PRODUCT_BY_RARITY[rarity];
    const current = counts.get(productId);
    counts.set(productId, {
      count: (current?.count ?? 0) + 1,
      tone: current?.tone ?? rarity
    });
  }

  return Array.from(counts.entries()).map(([id, entry]) => {
    const definition = frontendOrdinaryItemDefinitionById(id);
    return {
      id,
      nameText: definition?.nameText ?? id,
      count: entry.count,
      iconText: definition?.iconText ?? id.slice(0, 1),
      iconSprite: definition?.iconSprite ?? "",
      tone: entry.tone
    };
  });
}

export function inventoryItemMatchesSalvageRarity<TItem extends InventorySalvageItem>(
  item: TItem,
  rarity: InventoryLockRarity
) {
  const itemRarity = inventoryEquipmentLockRarity(item);
  if (!itemRarity) return false;
  return rarity === "all" || rarity === itemRarity;
}
