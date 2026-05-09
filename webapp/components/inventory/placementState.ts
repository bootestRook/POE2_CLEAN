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

type InventoryPlacementOrigin =
  | { kind: "bag"; slotIndex: number }
  | { kind: "equipment"; slotIndex: number }
  | { kind: "stash"; pageIndex: number; slotIndex: number }
  | { kind: "board"; row: number; column: number };

type InventoryPlacementFloatingItem<TItem extends InventoryPlacementItem> = {
  gem: TItem;
  origin: InventoryPlacementOrigin;
};

type InventoryPlacementDropTarget =
  | { kind: "bag"; slotIndex: number }
  | { kind: "equipment"; slotIndex: number }
  | { kind: "stash"; pageIndex: number; slotIndex: number }
  | { kind: "board"; row: number; column: number }
  | { kind: string };

export function inventoryItemById<TState extends { inventory: TItem[] }, TItem extends InventoryPlacementItem>(
  state: TState,
  instanceId: string | null | undefined
) {
  if (!instanceId) return null;
  return state.inventory.find((item) => item.instance_id === instanceId) ?? null;
}

export function isDropBackToOrigin<TState extends InventoryPlacementState<TItem>, TItem extends InventoryPlacementItem>(
  floatingItem: InventoryPlacementFloatingItem<TItem>,
  target: InventoryPlacementDropTarget,
  state: TState | null,
  inventorySlots: (string | null)[],
  equipmentSlots: (string | null)[],
  stashPages: (string | null)[][] | undefined
) {
  const origin = floatingItem.origin;
  if (origin.kind === "bag") {
    return target.kind === "bag" && origin.slotIndex === target.slotIndex && inventorySlots[target.slotIndex] === floatingItem.gem.instance_id;
  }
  if (origin.kind === "equipment") {
    return target.kind === "equipment" && origin.slotIndex === target.slotIndex && equipmentSlots[target.slotIndex] === floatingItem.gem.instance_id;
  }
  if (origin.kind === "stash") {
    return target.kind === "stash"
      && origin.pageIndex === target.pageIndex
      && origin.slotIndex === target.slotIndex
      && stashPages?.[target.pageIndex]?.[target.slotIndex] === floatingItem.gem.instance_id;
  }
  return (
    target.kind === "board" &&
    origin.row === target.row &&
    origin.column === target.column &&
    state?.board.cells[target.row]?.[target.column]?.gem?.instance_id === floatingItem.gem.instance_id
  );
}

export function reconcileInventorySlots<TState extends { inventory: TItem[] }, TItem extends InventoryPlacementItem>(
  current: (string | null)[],
  state: TState,
  floatingItemId: string | null,
  reservedIds: Set<string> = new Set(),
  slotCount: number
) {
  const unmountedIds = new Set(state.inventory.filter((item) => !item.board_position).map((item) => item.instance_id));
  const next = Array(slotCount).fill(null) as (string | null)[];
  const used = new Set<string>();

  current.slice(0, slotCount).forEach((instanceId, index) => {
    if (instanceId && instanceId !== floatingItemId && !reservedIds.has(instanceId) && unmountedIds.has(instanceId) && !used.has(instanceId)) {
      next[index] = instanceId;
      used.add(instanceId);
    }
  });

  for (const item of state.inventory) {
    if (item.board_position || item.instance_id === floatingItemId || reservedIds.has(item.instance_id) || used.has(item.instance_id)) continue;
    const emptyIndex = next.findIndex((instanceId) => instanceId === null);
    if (emptyIndex >= 0) {
      next[emptyIndex] = item.instance_id;
      used.add(item.instance_id);
    }
  }

  return next;
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
