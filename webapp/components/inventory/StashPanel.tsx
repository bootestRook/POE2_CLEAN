import type { DragEvent, MouseEvent, ReactNode } from "react";
import { StashGrid } from "./StashGrid";

type StashPanelItem = {
  instance_id: string;
};

type StashOrigin = {
  kind: "stash";
  pageIndex: number;
  slotIndex: number;
  instanceId: string;
};

export function StashPanel<TItem extends StashPanelItem, TFloatingGem>({
  pageIndex,
  pages,
  activeSlots,
  fullGemById,
  floatingGem,
  hoveredGemId,
  slotCount,
  columns,
  cellClassName,
  isFloatingOrigin,
  renderGem,
  renderGhost,
  onPageChange,
  onClose,
  onBeginDrag,
  onPointerDrag,
  onHoverGem,
  onLeaveGem
}: {
  pageIndex: number;
  pages: (string | null)[][];
  activeSlots: (string | null)[];
  fullGemById: Map<string, TItem>;
  floatingGem: TFloatingGem | null;
  hoveredGemId: string | null;
  slotCount: number;
  columns: number;
  cellClassName: (slotIndex: number, gem: TItem, hoveredGemId: string | null, floatingGem: TFloatingGem | null) => string;
  isFloatingOrigin: (floatingGem: TFloatingGem | null, origin: StashOrigin) => boolean;
  renderGem: (gem: TItem) => ReactNode;
  renderGhost: () => ReactNode;
  onPageChange: (pageIndex: number) => void;
  onClose: () => void;
  onBeginDrag: (event: DragEvent) => void;
  onPointerDrag: (event: MouseEvent, gem: TItem, origin: StashOrigin) => void;
  onHoverGem: (event: MouseEvent, gem: TItem, source: "stash", slotIndex?: number) => void;
  onLeaveGem: () => void;
}) {
  return (
    <section className="stash-workbench" aria-label="浠撳簱">
      <header className="stash-header">
        <div>
          <h2>浠撳簱</h2>
          <span>姣忛〉 10x10锛屽叡 5 椤?</span>
        </div>
        <button type="button" onClick={onClose}>杩斿洖浼戞伅鍖?</button>
      </header>
      <div className="stash-page-tabs" role="tablist" aria-label="浠撳簱椤电">
          {pages.map((_, index) => (
            <button
              key={`stash-page-${index}`}
              type="button"
              className={index === pageIndex ? "active" : ""}
              onClick={() => onPageChange(index)}
            >
              {index + 1}
            </button>
          ))}
      </div>
      <StashGrid
        pageIndex={pageIndex}
        activeSlots={activeSlots}
        fullGemById={fullGemById}
        floatingGem={floatingGem}
        slotCount={slotCount}
        columns={columns}
        cellClassName={(slotIndex, gem) => cellClassName(slotIndex, gem, hoveredGemId, floatingGem)}
        isFloatingOrigin={isFloatingOrigin}
        renderGem={renderGem}
        renderGhost={renderGhost}
        onBeginDrag={onBeginDrag}
        onPointerDrag={onPointerDrag}
        onHoverGem={onHoverGem}
        onLeaveGem={onLeaveGem}
      />
    </section>
  );
}
