import {
  frontendOrdinaryItemDefinitionById,
  frontendOrdinaryItemIconSprite,
} from "../../frontendOrdinaryItemData";

export type ForgeMaterialLibrary = "initial" | "advanced" | "pinnacle";

export type ForgeMaterialCostEntry = {
  itemId: string;
  itemName: string;
  iconSprite?: string;
  required: number;
  owned: number;
  enough: boolean;
};

export type ForgeMaterialCost = {
  entries: readonly ForgeMaterialCostEntry[];
  enough: boolean;
};

export type ForgeMaterialInventoryItem = {
  instance_id: string;
  item_kind?: string;
  name_text?: string;
  stack_count?: number;
  gem_type?: { id?: string; display_text?: string; identity_text?: string };
};

export type ForgeMaterialCostItem = {
  level?: number;
};

type ForgeMaterialCostRule = {
  library: ForgeMaterialLibrary;
  costs: readonly { itemId: string; count: number }[];
  minItemLevel?: number;
  maxItemLevel?: number;
};

export const FORGE_MATERIAL_COST_RULES: readonly ForgeMaterialCostRule[] = [
  { library: "initial", costs: [{ itemId: "ash_fine", count: 10 }, { itemId: "stardust_sand", count: 10 }], maxItemLevel: 75 },
  { library: "advanced", costs: [{ itemId: "ash_fine", count: 30 }, { itemId: "stardust_sand", count: 30 }], maxItemLevel: 75 },
  { library: "initial", costs: [{ itemId: "ash_precious", count: 10 }, { itemId: "stardust_core", count: 1 }], minItemLevel: 76 },
  { library: "advanced", costs: [{ itemId: "ash_peerless", count: 10 }, { itemId: "stardust_core", count: 3 }], minItemLevel: 76 },
  { library: "pinnacle", costs: [{ itemId: "ash_supreme", count: 1 }, { itemId: "stardust_core", count: 30 }] },
];

export function forgeMaterialCostFor(
  item: ForgeMaterialCostItem,
  library: ForgeMaterialLibrary,
  inventoryItems: readonly ForgeMaterialInventoryItem[]
): ForgeMaterialCost | null {
  const rule = forgeMaterialCostRuleFor(item, library);
  if (!rule) return null;
  const entries = rule.costs.map((cost) => {
    const definition = frontendOrdinaryItemDefinitionById(cost.itemId);
    const owned = forgeMaterialQuantity(inventoryItems, cost.itemId);
    return {
      itemId: cost.itemId,
      itemName: definition?.nameText ?? cost.itemId,
      iconSprite: frontendOrdinaryItemIconSprite(cost.itemId),
      required: cost.count,
      owned,
      enough: owned >= cost.count,
    };
  });
  return {
    entries,
    enough: entries.every((entry) => entry.enough),
  };
}

export function consumeForgeMaterialCost<TItem extends ForgeMaterialInventoryItem>(
  inventoryItems: readonly TItem[],
  cost: ForgeMaterialCost
): TItem[] {
  const remainingByItemId = new Map(cost.entries.map((entry) => [entry.itemId, entry.required]));
  const next: TItem[] = [];

  for (const item of inventoryItems) {
    const itemId = forgeMaterialItemId(item);
    const remaining = itemId ? remainingByItemId.get(itemId) ?? 0 : 0;
    if (remaining <= 0 || !itemId) {
      next.push(item);
      continue;
    }
    const stackCount = forgeMaterialStackCount(item);
    const consumed = Math.min(stackCount, remaining);
    remainingByItemId.set(itemId, remaining - consumed);
    const nextStackCount = stackCount - consumed;
    if (nextStackCount > 0) {
      next.push({ ...item, stack_count: nextStackCount });
    }
  }

  return next;
}

export function forgeMaterialCostRuleFor(item: ForgeMaterialCostItem, library: ForgeMaterialLibrary) {
  const itemLevel = Math.max(1, Math.floor(Number(item.level ?? 1)));
  return FORGE_MATERIAL_COST_RULES.find((rule) => {
    if (rule.library !== library) return false;
    if (rule.minItemLevel !== undefined && itemLevel < rule.minItemLevel) return false;
    if (rule.maxItemLevel !== undefined && itemLevel > rule.maxItemLevel) return false;
    return true;
  }) ?? null;
}

function forgeMaterialQuantity(inventoryItems: readonly ForgeMaterialInventoryItem[], itemId: string) {
  return inventoryItems.reduce((total, item) => (
    forgeMaterialItemId(item) === itemId ? total + forgeMaterialStackCount(item) : total
  ), 0);
}

function forgeMaterialItemId(item: ForgeMaterialInventoryItem) {
  return frontendOrdinaryItemDefinitionById(item.gem_type?.id)
    ? item.gem_type?.id
    : frontendOrdinaryItemDefinitionById(item.gem_type?.identity_text)
      ? item.gem_type?.identity_text
      : frontendOrdinaryItemDefinitionById(item.gem_type?.display_text)
        ? item.gem_type?.display_text
        : frontendOrdinaryItemDefinitionById(item.name_text)
          ? item.name_text
          : null;
}

function forgeMaterialStackCount(item: ForgeMaterialInventoryItem) {
  return Math.max(1, Math.floor(Number(item.stack_count ?? 1)));
}
