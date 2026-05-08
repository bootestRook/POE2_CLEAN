import type { DragEvent, MouseEvent, ReactNode } from "react";

export type PreviewRelationType = "row" | "column" | "box" | "adjacent";

export type SupportPreview = {
  source: { row: number; column: number; instanceId: string };
  targets: { row: number; column: number; instanceId: string }[];
  color: string;
};

export type SupportLine = {
  id: string;
  source: { row: number; column: number };
  target: { row: number; column: number };
  color: string;
};

type SkillBoardGem = {
  instance_id: string;
};

type SkillBoardCell<TGem extends SkillBoardGem> = {
  row: number;
  column: number;
  box: number;
  gem: TGem | null;
};

type SkillBoardOrigin = {
  kind: "board";
  row: number;
  column: number;
};

export function BoardCell<TGem extends SkillBoardGem>({
  cell,
  fullGem,
  hoveredGemId,
  linkedGemIds,
  supportPreview,
  floatingGemId,
  selectedGemInstanceId,
  legalPlacementCells,
  hoveredBoardCell,
  previewCell,
  previewAffectedCell,
  previewInvalidReason,
  renderGem,
  onHoverCell,
  onDropGem,
  onDragGem,
  onPointerDragGem,
  onHoverGem,
  onLeaveGem,
  onUnmountGem
}: {
  cell: SkillBoardCell<TGem>;
  fullGem: TGem | null;
  hoveredGemId: string | null;
  linkedGemIds: Set<string>;
  supportPreview: SupportPreview | null;
  floatingGemId: string | null;
  selectedGemInstanceId: string | null;
  legalPlacementCells: Set<string>;
  hoveredBoardCell: string | null;
  previewCell: string | null;
  previewAffectedCell: { types: PreviewRelationType[] } | null;
  previewInvalidReason: string | null;
  renderGem: (gem: TGem) => ReactNode;
  onHoverCell: (cellKey: string | null) => void;
  onDropGem: (instanceId: string, row: number, column: number) => Promise<boolean>;
  onDragGem: (event: DragEvent) => void;
  onPointerDragGem: (event: MouseEvent, gem: TGem, origin: SkillBoardOrigin) => void;
  onHoverGem: (event: MouseEvent, gem: TGem, source: "board" | "inventory" | "equipment", slotIndex?: number) => void;
  onLeaveGem: () => void;
  onUnmountGem: (instanceId: string) => void;
}) {
  const gem = fullGem;
  const origin: SkillBoardOrigin = { kind: "board", row: cell.row, column: cell.column };
  const isGhost = Boolean(gem && floatingGemId === gem.instance_id);
  const previewClass = supportPreview ? boardSupportPreviewClass(cell, supportPreview) : "";
  const hoverClass = previewClass || (gem ? boardHoverClass(gem.instance_id, hoveredGemId, linkedGemIds) : "");
  const currentCellKey = cellKey(cell.row, cell.column);
  const legalClass = legalPlacementCells.has(currentCellKey) ? "legal-drop-cell" : "";
  const placementModeClass = selectedGemInstanceId ? "placement-mode-cell" : "";
  const invalidClass = previewInvalidReason ? "invalid-drop-cell" : "";
  const previewTargetClass = previewCell === currentCellKey ? "preview-target-cell" : "";
  const affectedCellClass = previewAffectedCell ? previewAffectedCellClass(previewAffectedCell.types) : "";
  const boardHoverClassName = hoveredBoardCell === currentCellKey ? "board-slot-hover" : "";
  const boxBoundaryClasses = boardBoxBoundaryClasses(cell.row, cell.column);
  return (
    <button
      className={`board-cell ${boxBoundaryClasses} ${placementModeClass} ${hoverClass} ${legalClass} ${invalidClass} ${previewTargetClass} ${affectedCellClass} ${boardHoverClassName}`}
      data-board-row={cell.row}
      data-board-column={cell.column}
      data-box-boundary={boxBoundaryClasses}
      data-preview-cell={previewTargetClass ? "预览落点" : undefined}
      data-preview-relations={previewAffectedCell?.types.map(previewRelationLabel).join(" / ")}
      data-preview-invalid-reason={previewInvalidReason ?? undefined}
      title={previewInvalidReason ?? undefined}
      onMouseEnter={() => onHoverCell(currentCellKey)}
      onMouseLeave={() => onHoverCell(null)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const instanceId = event.dataTransfer.getData("text/plain");
        if (instanceId) onDropGem(instanceId, cell.row, cell.column);
      }}
      onDoubleClick={() => gem && !isGhost && onUnmountGem(gem.instance_id)}
    >
      {gem && !isGhost ? (
        <span
          className="board-gem-drag-target"
          draggable={false}
          onDragStart={onDragGem}
          onMouseDown={(event) => onPointerDragGem(event, gem, origin)}
          onMouseEnter={(event) => onHoverGem(event, gem, "board")}
          onMouseMove={(event) => onHoverGem(event, gem, "board")}
          onMouseLeave={onLeaveGem}
        >
          {renderGem(gem)}
        </span>
      ) : isGhost ? (
        <GemGhost />
      ) : null}
      {previewTargetClass && (
        <span className="preview-ghost-gem" aria-label="预览落点">
          可放置
        </span>
      )}
      {previewInvalidReason && <span className="invalid-reason-badge">不可放置</span>}
    </button>
  );
}

function boardBoxBoundaryClasses(row: number, column: number) {
  const classes = [];
  if (row === 0 || row === 3 || row === 6) classes.push("box-border-top");
  if (row === 2 || row === 5 || row === 8) classes.push("box-border-bottom");
  if (column === 0 || column === 3 || column === 6) classes.push("box-border-left");
  if (column === 2 || column === 5 || column === 8) classes.push("box-border-right");
  return classes.join(" ");
}

export function previewRelationLabel(type: PreviewRelationType) {
  const labels: Record<PreviewRelationType, string> = {
    row: "影响同行",
    column: "影响同列",
    box: "影响同宫",
    adjacent: "影响相邻"
  };
  return labels[type];
}

function previewAffectedCellClass(types: PreviewRelationType[]) {
  if (types.includes("box")) return "preview-dot-cell";
  if (types.includes("row") || types.includes("column")) return "preview-dot-cell";
  return "";
}

export function GemGhost() {
  return <span className="gem-ghost" />;
}

export function SupportPreviewLines({ preview }: { preview: SupportPreview }) {
  return (
    <SupportLines
      className="support-hover-lines"
      lines={preview.targets.map((target) => ({
        id: target.instanceId,
        source: preview.source,
        target,
        color: preview.color
      }))}
    />
  );
}

export function SupportLines({ lines, className = "" }: { lines: SupportLine[]; className?: string }) {
  return (
    <svg className={`support-preview-lines ${className}`} viewBox="0 0 9 9" aria-hidden="true">
      {lines.map((line) => (
        <line
          key={line.id}
          x1={line.source.column + 0.5}
          y1={line.source.row + 0.5}
          x2={line.target.column + 0.5}
          y2={line.target.row + 0.5}
          style={{ stroke: line.color }}
        />
      ))}
    </svg>
  );
}

function boardHoverClass(instanceId: string, hoveredGemId: string | null, linkedGemIds: Set<string>) {
  if (!hoveredGemId) return "";
  if (instanceId === hoveredGemId) return "hover-self";
  if (linkedGemIds.has(instanceId)) return "hover-linked";
  return "hover-dim";
}

function boardSupportPreviewClass<TGem extends SkillBoardGem>(cell: SkillBoardCell<TGem>, preview: SupportPreview) {
  const instanceId = cell.gem?.instance_id ?? "";
  if (instanceId === preview.source.instanceId) return "support-preview-source";
  if (preview.targets.some((target) => target.instanceId === instanceId)) return "support-preview-target";
  return "support-preview-dim";
}

function cellKey(row: number, column: number) {
  return `${row}-${column}`;
}
