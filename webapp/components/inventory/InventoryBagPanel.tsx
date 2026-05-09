import type { DragEvent, MouseEvent, ReactNode } from "react";
import { BagGrid } from "./BagGrid";

type BagPanelItem = {
  instance_id: string;
};

type BagOrigin = {
  kind: "bag";
  slotIndex: number;
  instanceId: string;
};

export function InventoryBagPanel<TItem extends BagPanelItem, TFloatingGem>({
  slots,
  floatingGem,
  hoveredBagSlot,
  hoveredGemId,
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
  hoveredBagSlot: number | null;
  hoveredGemId: string | null;
  cellClassName: (
    slotIndex: number,
    hoveredBagSlot: number | null,
    gem: TItem,
    hoveredGemId: string | null,
    floatingGem: TFloatingGem | null,
    isFloatingOrigin: (floatingGem: TFloatingGem | null, origin: BagOrigin) => boolean
  ) => string;
  emptyCellClassName: (slotIndex: number, hoveredBagSlot: number | null) => string;
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
    <section className="bag-panel">
      <BagGrid
        slots={slots}
        floatingGem={floatingGem}
        cellClassName={(slotIndex, gem) => cellClassName(slotIndex, hoveredBagSlot, gem, hoveredGemId, floatingGem, isFloatingOrigin)}
        emptyCellClassName={(slotIndex) => emptyCellClassName(slotIndex, hoveredBagSlot)}
        isFloatingOrigin={isFloatingOrigin}
        renderGem={renderGem}
        renderGhost={renderGhost}
        onBeginDrag={onBeginDrag}
        onPointerDrag={onPointerDrag}
        onHoverSlot={onHoverSlot}
        onHoverGem={onHoverGem}
        onLeaveSlot={onLeaveSlot}
        onLeaveGem={onLeaveGem}
      />
    </section>
  );
}
