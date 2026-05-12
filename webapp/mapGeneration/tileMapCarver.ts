import { MAP_SIZE_CONFIG } from "./mapGenerationConfig";
import type { GeneratedCellPoint, GeneratedCorridorEdge, GeneratedRoomNode, GeneratedTileKind } from "./mapGenerationTypes";

export function carveTileMap(rooms: GeneratedRoomNode[], corridors: GeneratedCorridorEdge[]): GeneratedTileKind[][] {
  const tiles = Array.from({ length: MAP_SIZE_CONFIG.height }, () => Array.from({ length: MAP_SIZE_CONFIG.width }, () => "empty" as GeneratedTileKind));
  for (const room of rooms) fillRect(tiles, room.x, room.y, room.x + room.width - 1, room.y + room.height - 1, "ground");
  for (const corridor of corridors) carveCorridor(tiles, corridor);
  addWallsAroundGround(tiles);
  return tiles;
}

export function addWallsAroundGround(tiles: GeneratedTileKind[][]) {
  const wallPoints: GeneratedCellPoint[] = [];
  for (let y = 0; y < tiles.length; y += 1) {
    for (let x = 0; x < (tiles[0]?.length ?? 0); x += 1) {
      if (tiles[y][x] !== "empty") continue;
      const nearGround = [
        tiles[y - 1]?.[x - 1], tiles[y - 1]?.[x], tiles[y - 1]?.[x + 1],
        tiles[y]?.[x - 1], tiles[y]?.[x + 1],
        tiles[y + 1]?.[x - 1], tiles[y + 1]?.[x], tiles[y + 1]?.[x + 1]
      ].some((tile) => tile === "ground");
      if (nearGround) wallPoints.push({ x, y });
    }
  }
  for (const point of wallPoints) tiles[point.y][point.x] = "wall";
}

function carveCorridor(tiles: GeneratedTileKind[][], corridor: GeneratedCorridorEdge) {
  for (let index = 1; index < corridor.path.length; index += 1) {
    carveSegment(tiles, corridor.path[index - 1], corridor.path[index], corridor.width);
  }
}

function carveSegment(tiles: GeneratedTileKind[][], from: GeneratedCellPoint, to: GeneratedCellPoint, width: number) {
  const halfBefore = Math.floor((width - 1) / 2);
  const halfAfter = Math.ceil((width - 1) / 2);
  if (from.x === to.x) {
    fillRect(tiles, from.x - halfBefore, Math.min(from.y, to.y), from.x + halfAfter, Math.max(from.y, to.y), "ground");
    return;
  }
  if (from.y === to.y) {
    fillRect(tiles, Math.min(from.x, to.x), from.y - halfBefore, Math.max(from.x, to.x), from.y + halfAfter, "ground");
    return;
  }
  carveSegment(tiles, from, { x: to.x, y: from.y }, width);
  carveSegment(tiles, { x: to.x, y: from.y }, to, width);
}

function fillRect(tiles: GeneratedTileKind[][], x1: number, y1: number, x2: number, y2: number, tile: GeneratedTileKind) {
  const minX = Math.max(0, Math.min(x1, x2));
  const maxX = Math.min(MAP_SIZE_CONFIG.width - 1, Math.max(x1, x2));
  const minY = Math.max(0, Math.min(y1, y2));
  const maxY = Math.min(MAP_SIZE_CONFIG.height - 1, Math.max(y1, y2));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      tiles[y][x] = tile;
    }
  }
}
