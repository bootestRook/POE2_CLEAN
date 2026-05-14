import { isMapPointWalkable } from "../bakedMapLoader";
import type { BakedBattleMapData } from "../bakedMapLoader";

export type BattleLinePoint = { x: number; y: number };

export type BattleLineBlocker = {
  point: BattleLinePoint;
  blockedPoint: BattleLinePoint;
  distance: number;
  ratio: number;
};

export type BattleLineClipResult = {
  blocked: boolean;
  point: BattleLinePoint;
  blocker: BattleLineBlocker | null;
};

export function hasUnblockedBattleLine(
  map: BakedBattleMapData | null | undefined,
  from: BattleLinePoint,
  to: BattleLinePoint
) {
  return firstBattleLineBlocker(map, from, to) === null;
}

export function firstBattleLineBlocker(
  map: BakedBattleMapData | null | undefined,
  from: BattleLinePoint,
  to: BattleLinePoint
): BattleLineBlocker | null {
  if (!map) return null;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length <= 0.001) {
    return isMapPointWalkable(map, from.x, from.y)
      ? null
      : { point: from, blockedPoint: from, distance: 0, ratio: 0 };
  }
  const step = Math.max(4, map.meta.grid_size * 0.35);
  const samples = Math.max(1, Math.ceil(length / step));
  let previous = from;
  for (let index = 1; index <= samples; index += 1) {
    const ratio = index / samples;
    const sample = {
      x: from.x + dx * ratio,
      y: from.y + dy * ratio
    };
    if (!isMapPointWalkable(map, sample.x, sample.y)) {
      return {
        point: previous,
        blockedPoint: sample,
        distance: Math.hypot(previous.x - from.x, previous.y - from.y),
        ratio: (index - 1) / samples
      };
    }
    previous = sample;
  }
  return null;
}

export function clipBattleLineToBlocker(
  map: BakedBattleMapData | null | undefined,
  from: BattleLinePoint,
  to: BattleLinePoint
): BattleLineClipResult {
  const blocker = firstBattleLineBlocker(map, from, to);
  if (!blocker) return { blocked: false, point: to, blocker: null };
  return { blocked: true, point: blocker.point, blocker };
}
