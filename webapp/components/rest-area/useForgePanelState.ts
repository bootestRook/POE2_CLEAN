import { useMemo, useState } from "react";

type ForgeStateItem = {
  instance_id: string;
  item_kind?: string;
  name_text: string;
};

type FloatingForgeItem<TItem extends ForgeStateItem> = {
  gem: TItem;
};

export function useForgePanelState<TItem extends ForgeStateItem>({
  itemsById,
  onSelectEquipmentTab,
  onNotice,
  onPlacementPrompt
}: {
  itemsById: Map<string, TItem>;
  onSelectEquipmentTab: () => void;
  onNotice: (text: string) => void;
  onPlacementPrompt: (text: string, x: number, y: number) => void;
}) {
  const [forgeItemId, setForgeItemId] = useState<string | null>(null);
  const [selectedForgeAffixSlots, setSelectedForgeAffixSlots] = useState<Set<string>>(() => new Set());
  const forgeItem = useMemo(() => forgeItemId ? itemsById.get(forgeItemId) ?? null : null, [forgeItemId, itemsById]);

  function resetForgePanel() {
    setForgeItemId(null);
    setSelectedForgeAffixSlots(new Set());
  }

  function toggleForgeAffixSlot(slotId: string) {
    setSelectedForgeAffixSlots((current) => {
      const next = new Set(current);
      if (next.has(slotId)) {
        next.delete(slotId);
      } else {
        next.add(slotId);
      }
      return next;
    });
  }

  function placeItemInForge(current: FloatingForgeItem<TItem>, event: globalThis.MouseEvent) {
    if (current.gem.item_kind !== "equipment") {
      onPlacementPrompt("只能放入装备。", event.clientX, event.clientY);
      return { type: "reject" as const };
    }
    setForgeItemId(current.gem.instance_id);
    setSelectedForgeAffixSlots(new Set());
    onSelectEquipmentTab();
    onNotice(`已将${current.gem.name_text}放入锻造台。`);
    return { type: "place" as const };
  }

  return {
    forgeItem,
    selectedForgeAffixSlots,
    resetForgePanel,
    toggleForgeAffixSlot,
    placeItemInForge
  };
}
