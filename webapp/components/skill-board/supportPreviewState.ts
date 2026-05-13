import { useMemo } from "react";
import { isActiveGem, isPassiveGem, isSupportGem } from "../inventory/equipmentRules";
import type { EquipmentRuleItem } from "../inventory/equipmentRules";
import type { SupportLine, SupportPreview } from "./SkillBoardPresentation";
import { gemColorValue } from "../../utils/gemDisplay";

type SupportPreviewBoardPosition = {
  row: number;
  column: number;
};

type SupportPreviewGem = EquipmentRuleItem & {
  instance_id: string;
  tags: readonly { id?: string; text: string }[];
  board_position: SupportPreviewBoardPosition | null;
};

type SupportPreviewCell<TGem extends SupportPreviewGem> = {
  row: number;
  column: number;
  gem: TGem | null;
};

type SupportPreviewState<TGem extends SupportPreviewGem> = {
  board: {
    highlights: Record<string, { instance_ids: string[] }[]>;
    cells: SupportPreviewCell<TGem>[][];
  };
  skill_preview: readonly {
    applied_modifiers: readonly {
      applied?: boolean;
      source_instance_id?: string;
      target_instance_id?: string;
    }[];
  }[];
};

type SupportPreviewFloatingItem = {
  gem: {
    instance_id: string;
  };
};

export function useLinkedGemIds<TState extends SupportPreviewState<TGem>, TGem extends SupportPreviewGem>(
  state: TState | null,
  hoveredGemId: string | null
) {
  return useMemo(() => {
    const result = new Set<string>();
    if (!state || !hoveredGemId) return result;
    result.add(hoveredGemId);
    for (const entries of Object.values(state.board.highlights)) {
      for (const entry of entries) {
        if (entry.instance_ids.includes(hoveredGemId)) {
          for (const instanceId of entry.instance_ids) result.add(instanceId);
        }
      }
    }
    return result;
  }, [state, hoveredGemId]);
}

export function useSupportPreview<TState extends SupportPreviewState<TGem>, TGem extends SupportPreviewGem>(
  state: TState | null,
  fullGemById: Map<string, TGem>,
  hoveredGemId: string | null,
  floatingGem: SupportPreviewFloatingItem | null
) {
  return useMemo<SupportPreview | null>(() => {
    if (!state || !hoveredGemId || floatingGem) return null;
    const sourceGem = fullGemById.get(hoveredGemId);
    if (!sourceGem || !sourceGem.board_position || !(isSupportGem(sourceGem) || isPassiveGem(sourceGem))) return null;

    const targetIds = new Set<string>();
    for (const skill of state.skill_preview) {
      for (const modifier of skill.applied_modifiers) {
        if (modifier.applied && modifier.source_instance_id === sourceGem.instance_id && modifier.target_instance_id) {
          targetIds.add(modifier.target_instance_id);
        }
      }
    }

    const targets = state.board.cells.flat()
      .map((cell) => {
        if (!cell.gem || !targetIds.has(cell.gem.instance_id)) return null;
        const gem = fullGemById.get(cell.gem.instance_id) ?? cell.gem;
        if (!isAllowedSupportRoute(sourceGem, gem)) return null;
        return { row: cell.row, column: cell.column, instanceId: gem.instance_id };
      })
      .filter((target): target is { row: number; column: number; instanceId: string } => Boolean(target));

    return {
      source: {
        row: sourceGem.board_position.row,
        column: sourceGem.board_position.column,
        instanceId: sourceGem.instance_id
      },
      targets,
      color: gemColorValue(sourceGem)
    };
  }, [state, fullGemById, hoveredGemId, floatingGem]);
}

export function useSupportLines<TState extends SupportPreviewState<TGem>, TGem extends SupportPreviewGem>(
  state: TState | null,
  fullGemById: Map<string, TGem>
) {
  return useMemo<SupportLine[]>(() => {
    if (!state) return [];
    const result = new Map<string, SupportLine>();
    for (const skill of state.skill_preview) {
      for (const modifier of skill.applied_modifiers) {
        if (!modifier.applied || !modifier.source_instance_id || !modifier.target_instance_id) continue;
        const sourceGem = fullGemById.get(modifier.source_instance_id);
        const targetGem = fullGemById.get(modifier.target_instance_id);
        if (!sourceGem?.board_position || !targetGem?.board_position) continue;
        if (!isAllowedSupportRoute(sourceGem, targetGem)) continue;
        const key = `${sourceGem.instance_id}-${targetGem.instance_id}`;
        if (result.has(key)) continue;
        result.set(key, {
          id: key,
          source: sourceGem.board_position,
          target: targetGem.board_position,
          color: gemColorValue(sourceGem)
        });
      }
    }
    return [...result.values()];
  }, [state, fullGemById]);
}

export function useActiveTargetLines<TGem extends SupportPreviewGem>(
  lines: SupportLine[],
  fullGemById: Map<string, TGem>,
  hoveredGemId: string | null,
  floatingGem: SupportPreviewFloatingItem | null
) {
  return useMemo<SupportLine[] | null>(() => {
    if (!hoveredGemId || floatingGem) return null;
    const hoveredGem = fullGemById.get(hoveredGemId);
    if (!hoveredGem?.board_position || !isActiveGem(hoveredGem)) return null;
    return lines.filter((line) => line.target.row === hoveredGem.board_position?.row && line.target.column === hoveredGem.board_position.column);
  }, [lines, fullGemById, hoveredGemId, floatingGem]);
}

function isAllowedSupportRoute(source: SupportPreviewGem, target: SupportPreviewGem) {
  if (isSupportGem(source)) return isActiveGem(target) || isPassiveGem(target);
  if (isPassiveGem(source)) return isActiveGem(target);
  return false;
}
