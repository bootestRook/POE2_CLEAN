import type { DragEvent, MouseEvent, ReactNode } from "react";
import { EquipmentEmptyCell, EquipmentItemCell } from "./EquipmentCells";

type EquipmentPanelItem = {
  instance_id: string;
};

type EquipmentPanelSlot = {
  id: string;
  label: string;
};

type EquipmentOrigin = {
  kind: "equipment";
  slotIndex: number;
  slotId: string;
  instanceId: string;
};

export function EquipmentPanel<TItem extends EquipmentPanelItem, TFloatingGem>({
  slotSpecs,
  equippedItems,
  equipmentSlots,
  mainWeaponSlotIndex,
  offWeaponSlotIndex,
  hoveredEquipmentSlot,
  hoveredGemId,
  floatingGem,
  lockModeActive,
  isTwoHandedWeapon,
  isFloatingOrigin,
  itemCellClassName,
  emptyCellClassName,
  renderGem,
  renderGhost,
  onBeginDrag,
  onPointerDrag,
  onHoverGem,
  onHoverEquipmentSlot,
  onLeaveEquipmentSlot,
  onLeaveGem
}: {
  slotSpecs: EquipmentPanelSlot[];
  equippedItems: (TItem | null)[];
  equipmentSlots: (string | null)[];
  mainWeaponSlotIndex: number;
  offWeaponSlotIndex: number;
  hoveredEquipmentSlot: number | null;
  hoveredGemId: string | null;
  floatingGem: TFloatingGem | null;
  lockModeActive: boolean;
  isTwoHandedWeapon: (item: TItem) => boolean;
  isFloatingOrigin: (floatingGem: TFloatingGem | null, origin: EquipmentOrigin) => boolean;
  itemCellClassName: (
    slotIndex: number,
    hoveredEquipmentSlot: number | null,
    item: TItem,
    hoveredGemId: string | null,
    floatingGem: TFloatingGem | null,
    slot: EquipmentPanelSlot,
    isFloatingOrigin: (floatingGem: TFloatingGem | null, origin: EquipmentOrigin) => boolean,
    spansBothWeaponSlots: boolean
  ) => string;
  emptyCellClassName: (
    slotIndex: number,
    hoveredEquipmentSlot: number | null,
    floatingGem: TFloatingGem | null,
    slot: EquipmentPanelSlot
  ) => string;
  renderGem: (gem: TItem) => ReactNode;
  renderGhost: () => ReactNode;
  onBeginDrag: (event: DragEvent) => void;
  onPointerDrag: (event: MouseEvent, gem: TItem, origin: EquipmentOrigin) => void;
  onHoverGem: (event: MouseEvent, gem: TItem, source: "equipment", slotIndex: number) => void;
  onHoverEquipmentSlot: (slotIndex: number) => void;
  onLeaveEquipmentSlot: () => void;
  onLeaveGem: () => void;
}) {
  return (
    <section className={`equipment-panel${lockModeActive ? " inventory-lock-mode-panel" : ""}`} aria-label="装备栏">
      <div className="equipment-grid" data-equipment-drop-target="true">
        {slotSpecs.map((slot, slotIndex) => {
          const item = equippedItems[slotIndex];
          const spansBothWeaponSlots = Boolean(
            slotIndex === mainWeaponSlotIndex
            && item
            && isTwoHandedWeapon(item)
            && equipmentSlots[offWeaponSlotIndex] === item.instance_id
          );
          if (
            slotIndex === offWeaponSlotIndex
            && item
            && isTwoHandedWeapon(item)
            && equipmentSlots[mainWeaponSlotIndex] === item.instance_id
          ) {
            return (
              <div
                key={slot.id}
                className={`equipment-blocked-cell${lockModeActive ? " inventory-disabled-cell" : ""}`}
                data-equipment-drop-target="true"
                data-equipment-slot-index={slotIndex}
                data-equipment-slot-id={slot.id}
                title="双手武器占用，禁止摆放"
                onMouseEnter={() => {
                  if (!lockModeActive) onHoverEquipmentSlot(slotIndex);
                }}
                onMouseLeave={() => {
                  if (!lockModeActive) onLeaveEquipmentSlot();
                }}
              >
                <span className="equipment-slot-label">{slot.label}</span>
                <span className="equipment-blocked-mark" aria-hidden="true">X</span>
              </div>
            );
          }
          const origin = item
            ? { kind: "equipment" as const, slotIndex, slotId: slot.id, instanceId: item.instance_id }
            : null;
          const isGhost = Boolean(origin && isFloatingOrigin(floatingGem, origin));
          return item ? (
            <EquipmentItemCell
              key={slot.id}
              slot={slot}
              slotIndex={slotIndex}
              item={item}
              isGhost={isGhost}
              interactionDisabled={lockModeActive}
              className={itemCellClassName(slotIndex, hoveredEquipmentSlot, item, hoveredGemId, floatingGem, slot, isFloatingOrigin, spansBothWeaponSlots)}
              renderGem={renderGem}
              renderGhost={renderGhost}
              onBeginDrag={onBeginDrag}
              onPointerDrag={(event) => origin && onPointerDrag(event, item, origin)}
              onHover={(event) => {
                onHoverEquipmentSlot(slotIndex);
                onHoverGem(event, item, "equipment", slotIndex);
              }}
              onMove={(event) => onHoverGem(event, item, "equipment", slotIndex)}
              onLeave={() => {
                onLeaveEquipmentSlot();
                onLeaveGem();
              }}
            />
          ) : (
            <EquipmentEmptyCell
              key={slot.id}
              slot={slot}
              slotIndex={slotIndex}
              className={emptyCellClassName(slotIndex, hoveredEquipmentSlot, floatingGem, slot)}
              interactionDisabled={lockModeActive}
              onHover={() => onHoverEquipmentSlot(slotIndex)}
              onLeave={onLeaveEquipmentSlot}
            />
          );
        })}
      </div>
    </section>
  );
}
