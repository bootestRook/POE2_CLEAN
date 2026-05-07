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
      className={className}
      data-equipment-drop-target="true"
      data-equipment-slot-index={slotIndex}
      data-equipment-slot-id={slot.id}
      data-item-instance-id={item.instance_id}
      draggable={false}
      onDragStart={onBeginDrag}
      onMouseDown={onPointerDrag}
      onMouseEnter={onHover}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
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
  onHover,
  onLeave
}: {
  slot: EquipmentSlot;
  slotIndex: number;
  className: string;
  onHover: () => void;
  onLeave: () => void;
}) {
  return (
    <div
      className={className}
      data-equipment-drop-target="true"
      data-equipment-slot-index={slotIndex}
      data-equipment-slot-id={slot.id}
      title={slot.label}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <span className="equipment-slot-label">{slot.label}</span>
    </div>
  );
}
