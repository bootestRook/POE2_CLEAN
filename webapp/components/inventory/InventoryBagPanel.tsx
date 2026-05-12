import type { CSSProperties, DragEvent, MouseEvent, ReactNode } from "react";
import { BagGrid } from "./BagGrid";
import { inventoryLockRarityOptions, type InventoryLockRarity } from "./inventoryLocking";
import type { InventorySalvageProduct } from "./inventorySalvage";

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
  salvageModeActive,
  lockedItemIds,
  selectedSalvageItemIds,
  activeLockRarities,
  activeSalvageRarities,
  salvageProducts,
  cellClassName,
  emptyCellClassName,
  isFloatingOrigin,
  renderGem,
  renderGhost,
  onTabChange,
  onBeginDrag,
  onPointerDrag,
  onToggleLockMode,
  onToggleSalvageMode,
  onRequestSalvage,
  onToggleItemLock,
  onToggleSalvageItem,
  onToggleLockRarity,
  onToggleSalvageRarity,
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
  salvageModeActive: boolean;
  lockedItemIds: Set<string>;
  selectedSalvageItemIds: Set<string>;
  activeLockRarities: Set<InventoryLockRarity>;
  activeSalvageRarities: Set<InventoryLockRarity>;
  salvageProducts: InventorySalvageProduct[];
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
  onToggleSalvageMode: () => void;
  onRequestSalvage: () => void;
  onToggleItemLock: (instanceId: string) => void;
  onToggleSalvageItem: (instanceId: string) => void;
  onToggleLockRarity: (rarity: InventoryLockRarity) => void;
  onToggleSalvageRarity: (rarity: InventoryLockRarity) => void;
  onOrganize: () => void;
  onHoverSlot: (slotIndex: number) => void;
  onHoverGem: (event: MouseEvent, gem: TItem, source: "inventory", slotIndex?: number) => void;
  onLeaveSlot: () => void;
  onLeaveGem: () => void;
}) {
  const rarityModeActive = (lockModeActive || salvageModeActive) && activeTab === "equipment";
  const activeRarities = salvageModeActive ? activeSalvageRarities : activeLockRarities;
  const onToggleRarity = salvageModeActive ? onToggleSalvageRarity : onToggleLockRarity;

  return (
    <section className={`bag-panel${salvageModeActive ? " inventory-salvage-mode-panel" : ""}`}>
      {rarityModeActive && (
        <div className="inventory-rarity-lock-column" aria-label={salvageModeActive ? "按稀有度选择回收装备" : "按稀有度锁定装备"}>
          {inventoryLockRarityOptions.map((option) => (
            <button
              key={option.id}
              className={`inventory-rarity-lock-button rarity-${option.id}${activeRarities.has(option.id) ? " active" : ""}`}
              type="button"
              aria-label={`${salvageModeActive ? "选择回收" : "锁定"}${option.label}装备`}
              aria-pressed={activeRarities.has(option.id)}
              title={option.label}
              onClick={() => onToggleRarity(option.id)}
            />
          ))}
        </div>
      )}
      <div className="bag-tab-row" aria-label="物品栏页签">
        <button
          className={`bag-tab-button${activeTab === "equipment" ? " active" : ""}`}
          type="button"
          aria-label="装备"
          aria-pressed={activeTab === "equipment"}
          onClick={() => onTabChange("equipment")}
        >
          <span className="bag-tab-icon bag-tab-icon-equipment" aria-hidden="true" />
        </button>
        <button
          className={`bag-tab-button${activeTab === "gem" ? " active" : ""}`}
          type="button"
          aria-label="宝石"
          aria-pressed={activeTab === "gem"}
          onClick={() => onTabChange("gem")}
        >
          <span className="bag-tab-icon bag-tab-icon-gem" aria-hidden="true" />
        </button>
      </div>
      <BagGrid
        slots={slots}
        floatingGem={floatingGem}
        lockModeActive={lockModeActive}
        salvageModeActive={salvageModeActive}
        lockedItemIds={lockedItemIds}
        selectedSalvageItemIds={selectedSalvageItemIds}
        cellClassName={(slotIndex, gem) => cellClassName(slotIndex, hoveredBagSlot, gem, hoveredGemId, floatingGem, isFloatingOrigin)}
        emptyCellClassName={(slotIndex) => emptyCellClassName(slotIndex, hoveredBagSlot)}
        isFloatingOrigin={isFloatingOrigin}
        renderGem={renderGem}
        renderGhost={renderGhost}
        onBeginDrag={onBeginDrag}
        onPointerDrag={onPointerDrag}
        onToggleItemLock={onToggleItemLock}
        onToggleSalvageItem={onToggleSalvageItem}
        onHoverSlot={onHoverSlot}
        onHoverGem={onHoverGem}
        onLeaveSlot={onLeaveSlot}
        onLeaveGem={onLeaveGem}
      />
      {salvageModeActive ? (
        <>
          <div className="bag-action-row bag-action-row-salvage" aria-label="回收操作">
            {selectedSalvageItemIds.size > 0 && (
              <button className="bag-action-button active" type="button" onClick={onRequestSalvage}>回收</button>
            )}
            <button className="bag-action-button active" type="button" onClick={onToggleSalvageMode}>取消</button>
          </div>
          <InventorySalvageOutputPanel products={salvageProducts} />
        </>
      ) : (
        <div className="bag-action-row" aria-label="物品栏操作">
          <button className={`bag-action-button${lockModeActive ? " active" : ""}`} type="button" aria-pressed={lockModeActive} onClick={onToggleLockMode}>锁定</button>
          <button className="bag-action-button" type="button" onClick={onToggleSalvageMode}>回收</button>
          <button className="bag-action-button" type="button" onClick={onOrganize}>整理</button>
        </div>
      )}
    </section>
  );
}

function InventorySalvageOutputPanel({ products }: { products: InventorySalvageProduct[] }) {
  const emptyCellCount = Math.max(0, 6 - products.length);
  const cells = [...products, ...Array.from({ length: emptyCellCount }, (_, index) => ({
    id: `empty-${index}`,
    nameText: "",
    count: 0,
    iconText: "",
    iconSprite: "",
    tone: "white" as const
  }))];

  return (
    <section className="inventory-salvage-output-panel" aria-label="回收产物">
      <div className="inventory-salvage-output-header">
        <span>回收产物</span>
      </div>
      <div className="inventory-salvage-output-scroll">
        <div className="inventory-salvage-output-grid">
          {cells.map((product) => (
            <div
              key={product.id}
              className={`inventory-salvage-output-cell${product.count > 0 ? ` has-product product-${product.tone}` : ""}`}
              title={product.nameText}
            >
              {product.count > 0 && (
                <>
                  <span
                    className={`gem-orb item-orb item-orb-rarity-${product.tone} gem-orb-sprite inventory-salvage-product-orb`}
                    style={{ "--gem-icon-sprite": `url(${product.iconSprite})` } as CSSProperties}
                  >
                    <span className="gem-orb-label">{product.iconText}</span>
                    <span className="gem-orb-stack-count">{product.count}</span>
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
