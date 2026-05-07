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
  cellClassName,
  emptyCellClassName,
  isFloatingOrigin,
  renderGem,
  renderGhost,
  onBeginDrag,
  onPointerDrag,
  onHoverSlot,
  onHoverGem,
  onLeaveSlot,
  onLeaveGem
}: {
  slots: (TItem | null)[];
  floatingGem: TFloatingGem | null;
  cellClassName: (slotIndex: number, gem: TItem) => string;
  emptyCellClassName: (slotIndex: number) => string;
  isFloatingOrigin: (floatingGem: TFloatingGem | null, origin: BagOrigin) => boolean;
  renderGem: (gem: TItem) => ReactNode;
  renderGhost: () => ReactNode;
  onBeginDrag: (event: DragEvent) => void;
  onPointerDrag: (event: MouseEvent, gem: TItem, origin: BagOrigin) => void;
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
            className={cellClassName(slotIndex, gem)}
            data-bag-drop-target="true"
            data-bag-slot-index={slotIndex}
            data-item-instance-id={gem.instance_id}
            draggable={false}
            onDragStart={onBeginDrag}
            onMouseDown={(event) => onPointerDrag(event, gem, { kind: "bag", slotIndex, instanceId: gem.instance_id })}
            onMouseEnter={(event) => {
              onHoverSlot(slotIndex);
              onHoverGem(event, gem, "inventory", slotIndex);
            }}
            onMouseMove={(event) => onHoverGem(event, gem, "inventory", slotIndex)}
            onMouseLeave={onLeaveGem}
          >
            {isFloatingOrigin(floatingGem, { kind: "bag", slotIndex, instanceId: gem.instance_id }) ? renderGhost() : renderGem(gem)}
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
