export type InventoryPlacementItem = {
  instance_id: string;
  board_position?: { row: number; column: number } | null;
};

type InventoryPlacementCell<TItem extends InventoryPlacementItem> = {
  row: number;
  column: number;
  gem: TItem | null;
};

export type InventoryPlacementState<TItem extends InventoryPlacementItem> = {
  inventory: TItem[];
  board: {
    cells: InventoryPlacementCell<TItem>[][];
  };
};

export function inventoryItemById<TState extends { inventory: TItem[] }, TItem extends InventoryPlacementItem>(
  state: TState,
  instanceId: string | null | undefined
) {
  if (!instanceId) return null;
  return state.inventory.find((item) => item.instance_id === instanceId) ?? null;
}

export function moveItemToInventorySlot(
  slots: (string | null)[],
  instanceId: string,
  slotIndex: number,
  slotCount: number
) {
  const next = slots.slice(0, slotCount);
  while (next.length < slotCount) next.push(null);
  for (let index = 0; index < next.length; index += 1) {
    if (next[index] === instanceId) next[index] = null;
  }
  next[slotIndex] = instanceId;
  return next;
}

export function moveItemToEquipmentSlot(
  slots: (string | null)[],
  instanceId: string,
  slotIndices: number | readonly number[],
  slotCount: number
) {
  const next = slots.slice(0, slotCount);
  while (next.length < slotCount) next.push(null);
  const indices = Array.isArray(slotIndices) ? slotIndices : [slotIndices];
  for (let index = 0; index < next.length; index += 1) {
    if (next[index] === instanceId) next[index] = null;
  }
  for (const slotIndex of indices) {
    next[slotIndex] = instanceId;
  }
  return next;
}

export function normalizeEquipmentSlots(slots: (string | null)[], slotCount: number) {
  const next = slots.slice(0, slotCount);
  while (next.length < slotCount) next.push(null);
  return next.map((instanceId) => instanceId ?? null);
}

export function removeItemsFromEquipmentSlots(slots: (string | null)[], instanceIds: string[]) {
  const idSet = new Set(instanceIds.filter(Boolean));
  return slots.map((slotInstanceId) => (slotInstanceId && idSet.has(slotInstanceId) ? null : slotInstanceId));
}

export function optimisticUnmountBoardItem<
  TState extends InventoryPlacementState<TItem>,
  TItem extends InventoryPlacementItem
>(state: TState, instanceId: string): TState {
  return {
    ...state,
    inventory: state.inventory.map((item) => (
      item.instance_id === instanceId ? { ...item, board_position: null } : item
    )),
    board: {
      ...state.board,
      cells: state.board.cells.map((row) =>
        row.map((cell) => (
          cell.gem?.instance_id === instanceId ? { ...cell, gem: null } : cell
        ))
      ),
    },
  };
}

export function optimisticPlaceItemOnBoard<
  TState extends InventoryPlacementState<TItem>,
  TItem extends InventoryPlacementItem
>(
  state: TState,
  instanceId: string,
  row: number,
  column: number,
  displacedInstanceId?: string
): TState {
  const dragged = state.inventory.find((item) => item.instance_id === instanceId);
  if (!dragged) return state;
  const placedGem = { ...dragged, board_position: { row, column } };
  return {
    ...state,
    inventory: state.inventory.map((item) => {
      if (item.instance_id === instanceId) return placedGem;
      if (item.instance_id === displacedInstanceId) return { ...item, board_position: null };
      return item;
    }),
    board: {
      ...state.board,
      cells: state.board.cells.map((boardRow) =>
        boardRow.map((cell) => {
          if (cell.row === row && cell.column === column) return { ...cell, gem: placedGem };
          if (cell.gem?.instance_id === instanceId || cell.gem?.instance_id === displacedInstanceId) return { ...cell, gem: null };
          return cell;
        })
      ),
    },
  };
}
