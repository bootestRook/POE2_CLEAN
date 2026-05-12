import type { DragEvent, MouseEvent, ReactNode } from "react";

type BagItem = {
  instance_id: string;
};

type BagOrigin = {
  kind: "bag";
  slotIndex: number;
  instanceId: string;
};

export function BagGrid<TItem extends BagItem, TFloatingGem>({
  slots,
  floatingGem,
  lockModeActive,
  salvageModeActive,
  lockedItemIds,
  selectedSalvageItemIds,
  cellClassName,
  emptyCellClassName,
  isFloatingOrigin,
  renderGem,
  renderGhost,
  onBeginDrag,
  onPointerDrag,
  onToggleItemLock,
  onToggleSalvageItem,
  onHoverSlot,
  onHoverGem,
  onLeaveSlot,
  onLeaveGem
}: {
  slots: (TItem | null)[];
  floatingGem: TFloatingGem | null;
  lockModeActive: boolean;
  salvageModeActive: boolean;
  lockedItemIds: Set<string>;
  selectedSalvageItemIds: Set<string>;
  cellClassName: (slotIndex: number, gem: TItem) => string;
  emptyCellClassName: (slotIndex: number) => string;
  isFloatingOrigin: (floatingGem: TFloatingGem | null, origin: BagOrigin) => boolean;
  renderGem: (gem: TItem) => ReactNode;
  renderGhost: () => ReactNode;
  onBeginDrag: (event: DragEvent) => void;
  onPointerDrag: (event: MouseEvent, gem: TItem, origin: BagOrigin) => void;
  onToggleItemLock: (instanceId: string) => void;
  onToggleSalvageItem: (instanceId: string) => void;
  onHoverSlot: (slotIndex: number) => void;
  onHoverGem: (event: MouseEvent, gem: TItem, source: "inventory", slotIndex?: number) => void;
  onLeaveSlot: () => void;
  onLeaveGem: () => void;
}) {
  const editModeActive = lockModeActive || salvageModeActive;
  return (
    <div className="bag-grid" data-bag-drop-target="true">
      {slots.map((gem, slotIndex) => (
        gem ? (
          <button
            key={`bag-${slotIndex}`}
            className={`${cellClassName(slotIndex, gem)}${lockedItemIds.has(gem.instance_id) ? " item-locked-cell" : ""}${selectedSalvageItemIds.has(gem.instance_id) ? " item-salvage-selected-cell" : ""}${lockModeActive ? " inventory-lock-edit-cell" : ""}${salvageModeActive ? " inventory-salvage-edit-cell" : ""}`}
            data-bag-drop-target="true"
            data-bag-slot-index={slotIndex}
            data-item-instance-id={gem.instance_id}
            draggable={false}
            onDragStart={onBeginDrag}
            onMouseDown={(event) => {
              if (editModeActive) {
                event.preventDefault();
                event.stopPropagation();
                return;
              }
              onPointerDrag(event, gem, { kind: "bag", slotIndex, instanceId: gem.instance_id });
            }}
            onClick={(event) => {
              if (!editModeActive) return;
              event.preventDefault();
              event.stopPropagation();
              if (lockModeActive) onToggleItemLock(gem.instance_id);
              else onToggleSalvageItem(gem.instance_id);
            }}
            onMouseEnter={(event) => {
              onHoverSlot(slotIndex);
              onHoverGem(event, gem, "inventory", slotIndex);
            }}
            onMouseMove={(event) => onHoverGem(event, gem, "inventory", slotIndex)}
            onMouseLeave={onLeaveGem}
          >
            {isFloatingOrigin(floatingGem, { kind: "bag", slotIndex, instanceId: gem.instance_id }) ? renderGhost() : renderGem(gem)}
            {lockedItemIds.has(gem.instance_id) && <span className="inventory-lock-badge" aria-label="已锁定" />}
            {selectedSalvageItemIds.has(gem.instance_id) && <span className="inventory-salvage-badge" aria-label="已选择回收" />}
          </button>
        ) : (
          <div
            key={`bag-${slotIndex}`}
            className={emptyCellClassName(slotIndex)}
            data-bag-drop-target="true"
            data-bag-slot-index={slotIndex}
            onMouseEnter={() => onHoverSlot(slotIndex)}
            onMouseLeave={onLeaveSlot}
          />
        )
      ))}
    </div>
  );
}
