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
  lockedItemIds,
  cellClassName,
  emptyCellClassName,
  isFloatingOrigin,
  renderGem,
  renderGhost,
  onBeginDrag,
  onPointerDrag,
  onToggleItemLock,
  onHoverSlot,
  onHoverGem,
  onLeaveSlot,
  onLeaveGem
}: {
  slots: (TItem | null)[];
  floatingGem: TFloatingGem | null;
  lockModeActive: boolean;
  lockedItemIds: Set<string>;
  cellClassName: (slotIndex: number, gem: TItem) => string;
  emptyCellClassName: (slotIndex: number) => string;
  isFloatingOrigin: (floatingGem: TFloatingGem | null, origin: BagOrigin) => boolean;
  renderGem: (gem: TItem) => ReactNode;
  renderGhost: () => ReactNode;
  onBeginDrag: (event: DragEvent) => void;
  onPointerDrag: (event: MouseEvent, gem: TItem, origin: BagOrigin) => void;
  onToggleItemLock: (instanceId: string) => void;
  onHoverSlot: (slotIndex: number) => void;
  onHoverGem: (event: MouseEvent, gem: TItem, source: "inventory", slotIndex?: number) => void;
  onLeaveSlot: () => void;
  onLeaveGem: () => void;
}) {
  return (
    <div className="bag-grid" data-bag-drop-target="true">
      {slots.map((gem, slotIndex) => (
        gem ? (
          <button
            key={`bag-${slotIndex}`}
            className={`${cellClassName(slotIndex, gem)}${lockedItemIds.has(gem.instance_id) ? " item-locked-cell" : ""}${lockModeActive ? " inventory-lock-edit-cell" : ""}`}
            data-bag-drop-target="true"
            data-bag-slot-index={slotIndex}
            data-item-instance-id={gem.instance_id}
            draggable={false}
            onDragStart={onBeginDrag}
            onMouseDown={(event) => {
              if (lockModeActive) {
                event.preventDefault();
                event.stopPropagation();
                return;
              }
              onPointerDrag(event, gem, { kind: "bag", slotIndex, instanceId: gem.instance_id });
            }}
            onClick={(event) => {
              if (!lockModeActive) return;
              event.preventDefault();
              event.stopPropagation();
              onToggleItemLock(gem.instance_id);
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
