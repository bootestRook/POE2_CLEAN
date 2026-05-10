import { useMemo } from "react";
import { localize, localizeTemplate } from "../../localization";
import { isActiveGem, isGemItem, isPassiveGem, isSupportGem } from "../inventory/equipmentRules";
import { previewRelationLabel } from "./SkillBoardPresentation";
import type { PreviewRelationType } from "./SkillBoardPresentation";

export type BoardPlacementGem = {
  instance_id: string;
  item_kind?: string;
  name_text: string;
  category_text: string;
  rarity_text: string;
  gem_kind?: string;
  gem_type: { id?: string; number?: number; display_text?: string; identity_text?: string };
  sudoku_digit?: number;
  tags: readonly { id?: string; text: string }[];
};

type BoardPlacementCell<TGem extends BoardPlacementGem> = {
  row: number;
  column: number;
  box: number;
  gem: TGem | null;
};

type BoardPlacementState<TGem extends BoardPlacementGem> = {
  board: {
    cells: BoardPlacementCell<TGem>[][];
  };
};

type FloatingPlacementItem<TGem extends BoardPlacementGem> = {
  gem: TGem;
};

export type PlacementPreview = {
  previewCell: { row: number; column: number };
  previewAffectedCells: Map<string, { types: PreviewRelationType[] }>;
  previewAffectedGems: Map<string, { labels: string[]; modifierCount: number }>;
  previewRelations: { row: number; column: number; types: PreviewRelationType[]; instanceId?: string }[];
  previewSkillSummary: string;
};

export function usePlacementInvalidReason<TState extends BoardPlacementState<TGem>, TGem extends BoardPlacementGem>(
  state: TState | null,
  floatingGem: FloatingPlacementItem<TGem> | null,
  hoveredBoardCell: string | null,
  legalPlacementCells: Set<string>
) {
  return useMemo(() => {
    if (!state || !floatingGem || !hoveredBoardCell || legalPlacementCells.has(hoveredBoardCell)) return null;
    if (!isGemItem(floatingGem.gem)) return localize("ui.skill_board.invalid.only_gems");
    const cell = boardCellByKey(state, hoveredBoardCell);
    if (!cell) return localize("ui.skill_board.invalid.out_of_bounds");
    const ignoredInstanceIds = new Set([floatingGem.gem.instance_id, cell.gem?.instance_id ?? ""]);
    if (cell.gem && cell.gem.instance_id !== floatingGem.gem.instance_id && !ignoredInstanceIds.has(cell.gem.instance_id)) {
      return localize("ui.skill_board.invalid.target_occupied");
    }
    return localize("ui.skill_board.invalid.duplicate_digit");
  }, [state, floatingGem, hoveredBoardCell, legalPlacementCells]);
}

export function usePlacementPreview<TState extends BoardPlacementState<TGem>, TGem extends BoardPlacementGem>(
  state: TState | null,
  fullGemById: ReadonlyMap<string, TGem>,
  floatingGem: FloatingPlacementItem<TGem> | null,
  previewCell: string | null
) {
  return useMemo<PlacementPreview | null>(() => {
    if (!state || !floatingGem || !previewCell) return null;
    const targetCell = boardCellByKey(state, previewCell);
    if (!targetCell) return null;

    const previewAffectedCells = new Map<string, { types: PreviewRelationType[] }>();
    const previewAffectedGems = new Map<string, { labels: string[]; modifierCount: number }>();
    const previewRelations: PlacementPreview["previewRelations"] = [];

    for (const row of state.board.cells) {
      for (const cell of row) {
        if (cell.row === targetCell.row && cell.column === targetCell.column) continue;
        const types = previewRelationTypes(targetCell, cell);
        if (types.length === 0) continue;
        const key = cellKey(cell.row, cell.column);
        previewAffectedCells.set(key, { types });

        const affectedGem = cell.gem ? fullGemById.get(cell.gem.instance_id) ?? cell.gem : null;
        const labels = types.map(previewRelationLabel);
        previewRelations.push({ row: cell.row, column: cell.column, types, instanceId: affectedGem?.instance_id });
        if (affectedGem && affectedGem.instance_id !== floatingGem.gem.instance_id) {
          previewAffectedGems.set(affectedGem.instance_id, {
            labels,
            modifierCount: estimatePreviewModifierCount(floatingGem.gem, affectedGem, types)
          });
        }
      }
    }

    const affectedGemCount = previewAffectedGems.size;
    const previewSkillSummary = affectedGemCount > 0
      ? localizeTemplate("ui.skill_board.preview.summary", { gemCount: affectedGemCount, relationCount: previewRelations.length })
      : localize("ui.skill_board.preview.none");

    return {
      previewCell: { row: targetCell.row, column: targetCell.column },
      previewAffectedCells,
      previewAffectedGems,
      previewRelations,
      previewSkillSummary
    };
  }, [state, fullGemById, floatingGem, previewCell]);
}

export function boardCellByKey<TState extends BoardPlacementState<TGem>, TGem extends BoardPlacementGem>(state: TState, key: string) {
  const [rowText, columnText] = key.split("-");
  const row = Number(rowText);
  const column = Number(columnText);
  return state.board.cells[row]?.[column] ?? null;
}

function previewRelationTypes<TGem extends BoardPlacementGem>(
  source: BoardPlacementCell<TGem>,
  target: BoardPlacementCell<TGem>
) {
  const types: PreviewRelationType[] = [];
  if (target.row === source.row) types.push("row");
  if (target.column === source.column) types.push("column");
  if (target.box === source.box) types.push("box");
  if (Math.abs(target.row - source.row) + Math.abs(target.column - source.column) === 1) types.push("adjacent");
  return types;
}

function estimatePreviewModifierCount<TGem extends BoardPlacementGem>(
  sourceGem: TGem,
  targetGem: TGem,
  types: PreviewRelationType[]
) {
  if (isAllowedPlacementRoute(sourceGem, targetGem)) return Math.max(1, types.length);
  return types.length;
}

export function useLegalDropCells<TState extends BoardPlacementState<TGem>, TGem extends BoardPlacementGem>(
  state: TState | null,
  floatingGem: TGem | null
) {
  return useMemo(() => {
    const result = new Set<string>();
    if (!state || !floatingGem) return result;

    const floatingSudokuDigit = sudokuDigitKey(floatingGem);
    for (const row of state.board.cells) {
      for (const cell of row) {
        const target = cell.gem;
        const ignoredInstanceIds = new Set([floatingGem.instance_id, target?.instance_id ?? ""]);

        const hasConflict = state.board.cells.some((otherRow) =>
          otherRow.some((otherCell) => {
            const otherGem = otherCell.gem;
            if (!otherGem || ignoredInstanceIds.has(otherGem.instance_id)) return false;
            if (sudokuDigitKey(otherGem) !== floatingSudokuDigit) return false;
            return otherCell.row === cell.row || otherCell.column === cell.column || otherCell.box === cell.box;
          })
        );
        if (!hasConflict) result.add(cellKey(cell.row, cell.column));
      }
    }

    return result;
  }, [state, floatingGem]);
}

export function canPlaceGemOnBoard<TState extends BoardPlacementState<TGem>, TGem extends BoardPlacementGem>(
  state: TState,
  gem: TGem,
  row: number,
  column: number,
  ignoredInstanceIds = new Set<string>()
) {
  const target = state.board.cells[row]?.[column];
  if (!target) return false;
  if (target.gem && target.gem.instance_id !== gem.instance_id && !ignoredInstanceIds.has(target.gem.instance_id)) return false;

  const sudokuDigit = sudokuDigitKey(gem);
  return !state.board.cells.some((boardRow) =>
    boardRow.some((cell) => {
      const otherGem = cell.gem;
      if (!otherGem || otherGem.instance_id === gem.instance_id || ignoredInstanceIds.has(otherGem.instance_id)) return false;
      if (sudokuDigitKey(otherGem) !== sudokuDigit) return false;
      return cell.row === row || cell.column === column || cell.box === target.box;
    })
  );
}

export function cellKey(row: number, column: number) {
  return `${row}-${column}`;
}

export function sudokuDigitKey(gem: BoardPlacementGem) {
  return gem.sudoku_digit ?? gem.gem_type.number ?? (Number(gem.gem_type.id?.split("_").pop()) || 0);
}

function isAllowedPlacementRoute(source: BoardPlacementGem, target: BoardPlacementGem) {
  if (isSupportGem(source)) return isActiveGem(target) || isPassiveGem(target);
  if (isPassiveGem(source)) return isActiveGem(target);
  return false;
}
