import type { BakedBattleMapData } from "../bakedMapLoader";

const PLAYABLE_MINIMAP_REVEAL_RADIUS_CELLS = 7;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function playableMinimapGridPoint(map: BakedBattleMapData, point: { x: number; y: number }) {
  return {
    x: clamp(Math.floor(point.x / Math.max(1, map.meta.grid_size)), 0, Math.max(0, map.gridWidth - 1)),
    y: clamp(Math.floor(point.y / Math.max(1, map.meta.grid_size)), 0, Math.max(0, map.gridHeight - 1))
  };
}

export function playableMinimapCellKey(gridX: number, gridY: number) {
  return `${gridX},${gridY}`;
}

export function playableMinimapCellKeyForPoint(map: BakedBattleMapData, point: { x: number; y: number }) {
  if (map.gridWidth <= 0 || map.gridHeight <= 0) return null;
  const grid = playableMinimapGridPoint(map, point);
  return playableMinimapCellKey(grid.x, grid.y);
}

export function playableMinimapRevealCells(
  map: BakedBattleMapData,
  point: { x: number; y: number },
  previous: ReadonlySet<string>,
  radius = PLAYABLE_MINIMAP_REVEAL_RADIUS_CELLS
) {
  const center = playableMinimapGridPoint(map, point);
  const cells = new Set(previous);
  let changed = false;
  const radiusSquared = radius * radius;
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      if (dx * dx + dy * dy > radiusSquared) continue;
      const gridX = center.x + dx;
      const gridY = center.y + dy;
      if (gridX < 0 || gridY < 0 || gridX >= map.gridWidth || gridY >= map.gridHeight) continue;
      const key = playableMinimapCellKey(gridX, gridY);
      if (cells.has(key)) continue;
      cells.add(key);
      changed = true;
    }
  }
  return { cells, changed };
}

export function playableMinimapUsesClientOnlyState() {
  return true;
}
