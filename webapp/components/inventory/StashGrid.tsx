import type { DragEvent, MouseEvent, ReactNode } from "react";

type StashItem = {
  instance_id: string;
};

type StashOrigin = {
  kind: "stash";
  pageIndex: number;
  slotIndex: number;
  instanceId: string;
};

export function StashGrid<TItem extends StashItem, TFloatingGem>({
  pageIndex,
  activeSlots,
  fullGemById,
  floatingGem,
  slotCount,
  columns,
  cellClassName,
  isFloatingOrigin,
  renderGem,
  renderGhost,
  onBeginDrag,
  onPointerDrag,
  onHoverGem,
  onLeaveGem
}: {
  pageIndex: number;
  activeSlots: (string | null)[];
  fullGemById: Map<string, TItem>;
  floatingGem: TFloatingGem | null;
  slotCount: number;
  columns: number;
  cellClassName: (slotIndex: number, gem: TItem) => string;
  isFloatingOrigin: (floatingGem: TFloatingGem | null, origin: StashOrigin) => boolean;
  renderGem: (gem: TItem) => ReactNode;
  renderGhost: () => ReactNode;
  onBeginDrag: (event: DragEvent) => void;
  onPointerDrag: (event: MouseEvent, gem: TItem, origin: StashOrigin) => void;
  onHoverGem: (event: MouseEvent, gem: TItem, source: "stash", slotIndex?: number) => void;
  onLeaveGem: () => void;
}) {
  return (
    <div className="stash-grid" data-stash-columns={columns} data-stash-drop-target="true">
      {Array.from({ length: slotCount }, (_, slotIndex) => {
        const instanceId = activeSlots[slotIndex];
        const gem = instanceId ? fullGemById.get(instanceId) ?? null : null;
        const origin = gem ? { kind: "stash" as const, pageIndex, slotIndex, instanceId: gem.instance_id } : null;
        return gem ? (
          <button
            key={`stash-${slotIndex}`}
            className={cellClassName(slotIndex, gem)}
            data-stash-page-index={pageIndex}
            data-stash-slot-index={slotIndex}
            data-item-instance-id={gem.instance_id}
            draggable={false}
            onDragStart={onBeginDrag}
            onMouseDown={(event) => origin && onPointerDrag(event, gem, origin)}
            onMouseEnter={(event) => onHoverGem(event, gem, "stash", slotIndex)}
            onMouseMove={(event) => onHoverGem(event, gem, "stash", slotIndex)}
            onMouseLeave={onLeaveGem}
          >
            {origin && isFloatingOrigin(floatingGem, origin) ? renderGhost() : renderGem(gem)}
          </button>
        ) : (
          <div
            key={`stash-${slotIndex}`}
            className="stash-empty-cell"
            data-stash-page-index={pageIndex}
            data-stash-slot-index={slotIndex}
          />
        );
      })}
    </div>
  );
}
