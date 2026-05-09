import type { DragEvent, MouseEvent, ReactNode } from "react";
import { BoardCell, SupportLines, SupportPreviewLines } from "../skill-board/SkillBoardPresentation";
import type { PreviewRelationType, SupportLine, SupportPreview } from "../skill-board/SkillBoardPresentation";

type BoardPanelGem = {
  instance_id: string;
};

type BoardPanelCell<TGem extends BoardPanelGem> = {
  row: number;
  column: number;
  box: number;
  gem: TGem | null;
};

type BoardOrigin = {
  kind: "board";
  row: number;
  column: number;
};

type PlacementPreviewSummary = {
  previewSkillSummary: string;
};

export function InventorySkillBoardPanel<TGem extends BoardPanelGem>({
  cells,
  fullGemById,
  hoveredBoardGemId,
  linkedGemIds,
  supportPreview,
  floatingGemId,
  selectedGemInstanceId,
  legalPlacementCells,
  hoveredBoardCell,
  previewCell,
  previewAffectedCells,
  previewInvalidReason,
  persistentSupportLines,
  activeTargetLines,
  showPersistentSupportLines,
  placementPreview,
  renderGem,
  onHoverCell,
  onDropGem,
  onDragGem,
  onPointerDragGem,
  onHoverGem,
  onLeaveGem,
  onUnmountGem,
  onTogglePersistentSupportLines
}: {
  cells: BoardPanelCell<TGem>[][];
  fullGemById: Map<string, TGem>;
  hoveredBoardGemId: string | null;
  linkedGemIds: Set<string>;
  supportPreview: SupportPreview | null;
  floatingGemId: string | null;
  selectedGemInstanceId: string | null;
  legalPlacementCells: Set<string>;
  hoveredBoardCell: string | null;
  previewCell: string | null;
  previewAffectedCells: Map<string, { types: PreviewRelationType[] }>;
  previewInvalidReason: string | null;
  persistentSupportLines: SupportLine[];
  activeTargetLines: SupportLine[] | null;
  showPersistentSupportLines: boolean;
  placementPreview: PlacementPreviewSummary | null;
  renderGem: (gem: TGem) => ReactNode;
  onHoverCell: (cellKey: string | null) => void;
  onDropGem: (instanceId: string, row: number, column: number) => Promise<boolean>;
  onDragGem: (event: DragEvent) => void;
  onPointerDragGem: (event: MouseEvent, gem: TGem, origin: BoardOrigin) => void;
  onHoverGem: (event: MouseEvent, gem: TGem, source: "board") => void;
  onLeaveGem: () => void;
  onUnmountGem: (instanceId: string) => void;
  onTogglePersistentSupportLines: (checked: boolean) => void;
}) {
  return (
    <section className="board-panel">
      <div className="board-grid">
        {cells.flat().map((cell) => (
          <BoardCell
            key={`${cell.row}-${cell.column}`}
            cell={cell}
            fullGem={cell.gem ? fullGemById.get(cell.gem.instance_id) ?? cell.gem : null}
            hoveredGemId={hoveredBoardGemId}
            linkedGemIds={linkedGemIds}
            supportPreview={supportPreview}
            floatingGemId={floatingGemId}
            selectedGemInstanceId={selectedGemInstanceId}
            legalPlacementCells={legalPlacementCells}
            hoveredBoardCell={hoveredBoardCell}
            previewCell={previewCell}
            previewAffectedCell={previewAffectedCells.get(cellKey(cell.row, cell.column)) ?? null}
            previewInvalidReason={hoveredBoardCell === cellKey(cell.row, cell.column) ? previewInvalidReason : null}
            onHoverCell={onHoverCell}
            onDropGem={onDropGem}
            onDragGem={onDragGem}
            onPointerDragGem={onPointerDragGem}
            onHoverGem={onHoverGem}
            onLeaveGem={onLeaveGem}
            onUnmountGem={onUnmountGem}
            renderGem={renderGem}
          />
        ))}
        {supportPreview
          ? supportPreview.targets.length > 0 && <SupportPreviewLines preview={supportPreview} />
          : activeTargetLines
            ? activeTargetLines.length > 0 && <SupportLines lines={activeTargetLines} className="support-hover-lines" />
          : showPersistentSupportLines && persistentSupportLines.length > 0 && <SupportLines lines={persistentSupportLines} />}
        {placementPreview && (
          <div className="placement-preview-summary" data-preview-skill-refresh={previewCell ?? ""}>
            <strong>放下后预计影响</strong>
            <span>{placementPreview.previewSkillSummary}</span>
          </div>
        )}
      </div>
      <label className="support-line-toggle">
        <input
          type="checkbox"
          checked={showPersistentSupportLines}
          onChange={(event) => onTogglePersistentSupportLines(event.currentTarget.checked)}
        />
        <span>常驻显示连线</span>
      </label>
    </section>
  );
}

function cellKey(row: number, column: number) {
  return `${row}-${column}`;
}
