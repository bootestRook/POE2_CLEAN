import { clamp } from "../../utils/math2d";

type StashStateItem = {
  instance_id: string;
};

type StashStateCell<TItem extends StashStateItem> = {
  gem?: TItem | null;
};

type StashStateOwner<TItem extends StashStateItem> = {
  inventory: TItem[];
  equipment_slots?: (string | null)[];
  board: {
    cells: StashStateCell<TItem>[][];
  };
};

type StashStateHelpersDeps = {
  pageCount: number;
  pageSlotCount: number;
  normalizeEquipmentSlots: (slots: (string | null)[]) => (string | null)[];
};

export function createStashStateHelpers<TItem extends StashStateItem>({
  pageCount,
  pageSlotCount,
  normalizeEquipmentSlots
}: StashStateHelpersDeps) {
  function createEmptyStashPages() {
    return Array.from({ length: pageCount }, () => Array.from({ length: pageSlotCount }, () => null as string | null));
  }

  function normalizeStashPages(value: unknown, state?: StashStateOwner<TItem>) {
    const sourcePages = Array.isArray(value) ? value : [];
    const next = createEmptyStashPages();
    const used = new Set<string>();
    const inventoryIds = state ? new Set(state.inventory.map((item) => item.instance_id)) : null;
    const equippedIds = state ? new Set(normalizeEquipmentSlots(state.equipment_slots ?? []).filter(Boolean) as string[]) : new Set<string>();
    const boardedIds = state ? new Set(state.board.cells.flat().map((cell) => cell.gem?.instance_id).filter(Boolean) as string[]) : new Set<string>();
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const sourceSlots = Array.isArray(sourcePages[pageIndex]) ? sourcePages[pageIndex] : [];
      for (let slotIndex = 0; slotIndex < pageSlotCount; slotIndex += 1) {
        const instanceId = typeof sourceSlots[slotIndex] === "string" ? sourceSlots[slotIndex] : "";
        if (
          instanceId
          && !used.has(instanceId)
          && (!inventoryIds || inventoryIds.has(instanceId))
          && !equippedIds.has(instanceId)
          && !boardedIds.has(instanceId)
        ) {
          next[pageIndex][slotIndex] = instanceId;
          used.add(instanceId);
        }
      }
    }
    return next;
  }

  function stashItemIds(stashPages: (string | null)[][] | undefined) {
    return new Set(normalizeStashPages(stashPages).flat().filter(Boolean) as string[]);
  }

  function removeItemsFromStashPages(stashPages: (string | null)[][] | undefined, instanceIds: string[]) {
    const idSet = new Set(instanceIds.filter(Boolean));
    return normalizeStashPages(stashPages).map((page) => page.map((instanceId) => (instanceId && idSet.has(instanceId) ? null : instanceId)));
  }

  function moveItemToStashSlot(stashPages: (string | null)[][] | undefined, instanceId: string, pageIndex: number, slotIndex: number) {
    const next = removeItemsFromStashPages(stashPages, [instanceId]);
    const safePageIndex = clamp(Math.floor(pageIndex), 0, pageCount - 1);
    const safeSlotIndex = clamp(Math.floor(slotIndex), 0, pageSlotCount - 1);
    next[safePageIndex][safeSlotIndex] = instanceId;
    return next;
  }

  return {
    createEmptyStashPages,
    normalizeStashPages,
    stashItemIds,
    removeItemsFromStashPages,
    moveItemToStashSlot
  };
}
