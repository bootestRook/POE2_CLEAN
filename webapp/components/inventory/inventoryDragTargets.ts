export type FloatingOrigin =
  | { kind: "board"; row: number; column: number }
  | { kind: "bag"; slotIndex: number; instanceId: string }
  | { kind: "equipment"; slotIndex: number; slotId: string; instanceId: string }
  | { kind: "stash"; pageIndex: number; slotIndex: number; instanceId: string };

export type DropTarget =
  | { kind: "board"; row: number; column: number }
  | { kind: "bag"; slotIndex: number }
  | { kind: "equipment"; slotIndex: number; slotId: string }
  | { kind: "forge" }
  | { kind: "stash"; pageIndex: number; slotIndex: number }
  | { kind: "map"; position: { x: number; y: number } }
  | { kind: "invalid" };

type FloatingOriginItem = {
  origin: FloatingOrigin;
} | null;

export function isFloatingOrigin(floatingItem: FloatingOriginItem, origin: FloatingOrigin) {
  if (!floatingItem) return false;
  const current = floatingItem.origin;
  if (current.kind !== origin.kind) return false;
  if (current.kind === "bag" && origin.kind === "bag") return current.slotIndex === origin.slotIndex && current.instanceId === origin.instanceId;
  if (current.kind === "board" && origin.kind === "board") return current.row === origin.row && current.column === origin.column;
  if (current.kind === "equipment" && origin.kind === "equipment") {
    return current.slotIndex === origin.slotIndex && current.slotId === origin.slotId && current.instanceId === origin.instanceId;
  }
  if (current.kind === "stash" && origin.kind === "stash") {
    return current.pageIndex === origin.pageIndex && current.slotIndex === origin.slotIndex && current.instanceId === origin.instanceId;
  }
  return false;
}

export function resolveDropTarget(element: Element | null): DropTarget {
  const boardCell = element?.closest("[data-board-row][data-board-column]") as HTMLElement | null;
  if (boardCell) {
    return {
      kind: "board",
      row: Number(boardCell.dataset.boardRow),
      column: Number(boardCell.dataset.boardColumn)
    };
  }

  const bagCell = element?.closest("[data-bag-slot-index]") as HTMLElement | null;
  if (bagCell) return { kind: "bag", slotIndex: Number(bagCell.dataset.bagSlotIndex) };

  if (element?.closest("[data-forge-drop-target]")) return { kind: "forge" };

  const stashCell = element?.closest("[data-stash-slot-index][data-stash-page-index]") as HTMLElement | null;
  if (stashCell) {
    return {
      kind: "stash",
      pageIndex: Number(stashCell.dataset.stashPageIndex),
      slotIndex: Number(stashCell.dataset.stashSlotIndex)
    };
  }

  const equipmentCell = element?.closest("[data-equipment-slot-index]") as HTMLElement | null;
  if (equipmentCell) {
    return {
      kind: "equipment",
      slotIndex: Number(equipmentCell.dataset.equipmentSlotIndex),
      slotId: equipmentCell.dataset.equipmentSlotId ?? ""
    };
  }
  return { kind: "invalid" };
}

export function isInventoryDropBlockedByInterface(element: Element | null) {
  return Boolean(element?.closest([
    "[data-board-row][data-board-column]",
    "[data-bag-slot-index]",
    "[data-forge-drop-target]",
    "[data-stash-slot-index]",
    "[data-equipment-slot-index]",
    ".right-workbench",
    ".character-info-panel",
    ".bottom-hud",
    ".top-hud",
    ".combat-feed",
    ".gm-tool-anchor",
    ".gm-tool-panel",
    ".gem-tooltip",
    ".placement-prompt",
    ".item-discard-overlay",
    ".game-failure-overlay",
    ".ground-drop",
    "button",
    "input",
    "select",
    "textarea"
  ].join(",")));
}
