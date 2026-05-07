import { useMemo } from "react";

type MountedPassiveGem = {
  instance_id: string;
  visual_effect?: string;
};

type BoardCell<TGem extends MountedPassiveGem> = {
  gem?: TGem | null;
};

type MountedPassiveState<TGem extends MountedPassiveGem> = {
  board: {
    cells: BoardCell<TGem>[][];
  };
};

export function useMountedPassiveVisualEffects<TState extends MountedPassiveState<TGem>, TGem extends MountedPassiveGem>(
  state: TState | null,
  fullGemById: Map<string, TGem>,
  isPassiveGem: (gem: TGem) => boolean
) {
  return useMemo(() => {
    if (!state) return [];
    return state.board.cells
      .flat()
      .map((cell) => (cell.gem ? fullGemById.get(cell.gem.instance_id) ?? cell.gem : null))
      .filter((gem): gem is TGem => Boolean(gem && isPassiveGem(gem) && gem.visual_effect));
  }, [fullGemById, isPassiveGem, state]);
}
