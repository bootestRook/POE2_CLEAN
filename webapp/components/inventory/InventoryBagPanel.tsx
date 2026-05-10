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

export type InventoryBagTab = "equipment" | "gem";

export function InventoryBagPanel<TItem extends BagPanelItem, TFloatingGem>({
  activeTab,
  slots,
  floatingGem,
  hoveredBagSlot,
  hoveredGemId,
  lockModeActive,
  lockedItemIds,
  cellClassName,
  emptyCellClassName,
  isFloatingOrigin,
  renderGem,
  renderGhost,
  onTabChange,
  onBeginDrag,
  onPointerDrag,
  onToggleLockMode,
  onToggleItemLock,
  onOrganize,
  onHoverSlot,
  onHoverGem,
  onLeaveSlot,
  onLeaveGem
}: {
  activeTab: InventoryBagTab;
  slots: (TItem | null)[];
  floatingGem: TFloatingGem | null;
  hoveredBagSlot: number | null;
  hoveredGemId: string | null;
  lockModeActive: boolean;
  lockedItemIds: Set<string>;
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
  onTabChange: (tab: InventoryBagTab) => void;
  onBeginDrag: (event: DragEvent) => void;
  onPointerDrag: (event: MouseEvent, gem: TItem, origin: BagOrigin) => void;
  onToggleLockMode: () => void;
  onToggleItemLock: (instanceId: string) => void;
  onOrganize: () => void;
  onHoverSlot: (slotIndex: number) => void;
  onHoverGem: (event: MouseEvent, gem: TItem, source: "inventory", slotIndex?: number) => void;
  onLeaveSlot: () => void;
  onLeaveGem: () => void;
}) {
  return (
    <section className="bag-panel">
      <div className="bag-tab-row" aria-label="物品栏页签">
        <button
          className={`bag-tab-button${activeTab === "equipment" ? " active" : ""}`}
          type="button"
          aria-pressed={activeTab === "equipment"}
          onClick={() => onTabChange("equipment")}
        >
          装备
        </button>
        <button
          className={`bag-tab-button${activeTab === "gem" ? " active" : ""}`}
          type="button"
          aria-pressed={activeTab === "gem"}
          onClick={() => onTabChange("gem")}
        >
          宝石
        </button>
      </div>
      <BagGrid
        slots={slots}
        floatingGem={floatingGem}
        lockModeActive={lockModeActive}
        lockedItemIds={lockedItemIds}
        cellClassName={(slotIndex, gem) => cellClassName(slotIndex, hoveredBagSlot, gem, hoveredGemId, floatingGem, isFloatingOrigin)}
        emptyCellClassName={(slotIndex) => emptyCellClassName(slotIndex, hoveredBagSlot)}
        isFloatingOrigin={isFloatingOrigin}
        renderGem={renderGem}
        renderGhost={renderGhost}
        onBeginDrag={onBeginDrag}
        onPointerDrag={onPointerDrag}
        onToggleItemLock={onToggleItemLock}
        onHoverSlot={onHoverSlot}
        onHoverGem={onHoverGem}
        onLeaveSlot={onLeaveSlot}
        onLeaveGem={onLeaveGem}
      />
      <div className="bag-action-row" aria-label="物品栏操作">
        <button className={`bag-action-button${lockModeActive ? " active" : ""}`} type="button" aria-pressed={lockModeActive} onClick={onToggleLockMode}>锁定</button>
        <button className="bag-action-button" type="button">回收</button>
        <button className="bag-action-button" type="button" onClick={onOrganize}>整理</button>
      </div>
    </section>
  );
}
