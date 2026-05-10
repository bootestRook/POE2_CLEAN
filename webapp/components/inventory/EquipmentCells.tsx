import type { DragEvent, MouseEvent, ReactNode } from "react";

type EquipmentItem = {
  instance_id: string;
};

type EquipmentSlot = {
  id: string;
  label: string;
};

export function EquipmentItemCell<TItem extends EquipmentItem>({
  slot,
  slotIndex,
  item,
  isGhost,
  interactionDisabled,
  className,
  renderGem,
  renderGhost,
  onBeginDrag,
  onPointerDrag,
  onHover,
  onMove,
  onLeave
}: {
  slot: EquipmentSlot;
  slotIndex: number;
  item: TItem;
  isGhost: boolean;
  interactionDisabled: boolean;
  className: string;
  renderGem: (gem: TItem) => ReactNode;
  renderGhost: () => ReactNode;
  onBeginDrag: (event: DragEvent) => void;
  onPointerDrag: (event: MouseEvent) => void;
  onHover: (event: MouseEvent) => void;
  onMove: (event: MouseEvent) => void;
  onLeave: () => void;
}) {
  return (
    <button
      className={`${className}${interactionDisabled ? " inventory-disabled-cell" : ""}`}
      data-equipment-drop-target="true"
      data-equipment-slot-index={slotIndex}
      data-equipment-slot-id={slot.id}
      data-item-instance-id={item.instance_id}
      draggable={false}
      onDragStart={onBeginDrag}
      onMouseDown={(event) => {
        if (interactionDisabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onPointerDrag(event);
      }}
      onMouseEnter={(event) => {
        if (!interactionDisabled) onHover(event);
      }}
      onMouseMove={(event) => {
        if (!interactionDisabled) onMove(event);
      }}
      onMouseLeave={() => {
        if (!interactionDisabled) onLeave();
      }}
    >
      <span className="equipment-slot-label">{slot.label}</span>
      {isGhost ? renderGhost() : renderGem(item)}
    </button>
  );
}

export function EquipmentEmptyCell({
  slot,
  slotIndex,
  className,
  interactionDisabled,
  onHover,
  onLeave
}: {
  slot: EquipmentSlot;
  slotIndex: number;
  className: string;
  interactionDisabled: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  return (
    <div
      className={`${className}${interactionDisabled ? " inventory-disabled-cell" : ""}`}
      data-equipment-drop-target="true"
      data-equipment-slot-index={slotIndex}
      data-equipment-slot-id={slot.id}
      title={slot.label}
      onMouseEnter={() => {
        if (!interactionDisabled) onHover();
      }}
      onMouseLeave={() => {
        if (!interactionDisabled) onLeave();
      }}
    >
      <span className="equipment-slot-label">{slot.label}</span>
    </div>
  );
}
