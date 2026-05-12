import { MAP_SIZE_CONFIG, ROOM_COUNT_CONFIG, STANDARD_COLLIDERS } from "./mapGenerationConfig";
import type { GeneratedCellPoint, GeneratedEditorMap, GeneratedMapGraph, GeneratedTileKind, GeneratedZone, ValidationResult } from "./mapGenerationTypes";

export function validateGeneratedMap(map: Partial<GeneratedEditorMap>, graph?: GeneratedMapGraph): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const tiles = Array.isArray(map.tiles) ? map.tiles as GeneratedTileKind[][] : [];
  const zones = Array.isArray(map.zones) ? map.zones as GeneratedZone[] : [];
  const stats = countStats(map, tiles, zones);

  if (map.format !== "poe.tilemap.editor") errors.push("格式必须为 poe.tilemap.editor。");
  if (map.width !== MAP_SIZE_CONFIG.width) errors.push(`地图宽度必须为 ${MAP_SIZE_CONFIG.width}。`);
  if (map.height !== MAP_SIZE_CONFIG.height) errors.push(`地图高度必须为 ${MAP_SIZE_CONFIG.height}。`);
  if (map.cellSize !== MAP_SIZE_CONFIG.cellSize) errors.push(`cellSize 必须为 ${MAP_SIZE_CONFIG.cellSize}。`);
  if (tiles.length !== MAP_SIZE_CONFIG.height) errors.push("tiles 高度不正确。");
  if (tiles.some((row) => !Array.isArray(row) || row.length !== MAP_SIZE_CONFIG.width)) errors.push("tiles 行宽不正确。");
  if (tiles.some((row) => row.some((tile) => tile !== "empty" && tile !== "ground" && tile !== "wall"))) errors.push("tiles 只能包含 empty / ground / wall。");
  validateColliders(map, errors);
  validateCounts(stats, errors);
  validateZoneCenters(tiles, zones, errors);
  validateSpawn(map.spawn, tiles, zones, errors);
  validateGroundConnectivity(tiles, stats.groundTileCount, errors);
  if (graph) validateGraph(graph, errors, warnings);

  return { ok: errors.length === 0, errors, warnings, stats };
}

export function reachableGroundDistances(tiles: GeneratedTileKind[][], start: GeneratedCellPoint) {
  const distances = new Map<string, number>();
  if (tiles[start.y]?.[start.x] !== "ground") return distances;
  const queue: GeneratedCellPoint[] = [start];
  distances.set(pointKey(start), 0);
  for (let index = 0; index < queue.length; index += 1) {
    const point = queue[index];
    const distance = distances.get(pointKey(point)) ?? 0;
    for (const next of [
      { x: point.x + 1, y: point.y },
      { x: point.x - 1, y: point.y },
      { x: point.x, y: point.y + 1 },
      { x: point.x, y: point.y - 1 }
    ]) {
      if (next.x < 0 || next.y < 0 || next.y >= tiles.length || next.x >= (tiles[0]?.length ?? 0)) continue;
      if (tiles[next.y]?.[next.x] !== "ground") continue;
      const key = pointKey(next);
      if (distances.has(key)) continue;
      distances.set(key, distance + 1);
      queue.push(next);
    }
  }
  return distances;
}

export function pointKey(point: GeneratedCellPoint) {
  return `${point.x},${point.y}`;
}

function countStats(map: Partial<GeneratedEditorMap>, tiles: GeneratedTileKind[][], zones: GeneratedZone[]): ValidationResult["stats"] {
  const tileCounts = { ground: 0, wall: 0, empty: 0 };
  for (const row of tiles) {
    for (const tile of row) {
      if (tile === "ground") tileCounts.ground += 1;
      if (tile === "wall") tileCounts.wall += 1;
      if (tile === "empty") tileCounts.empty += 1;
    }
  }
  return {
    width: Number(map.width) || 0,
    height: Number(map.height) || 0,
    entranceCount: zones.filter((zone) => zone.zoneType === "entrance").length,
    normalRoomCount: zones.filter((zone) => zone.zoneType === "main_room").length,
    largeRoomCount: zones.filter((zone) => zone.zoneType === "large_room").length,
    deadEndCount: zones.filter((zone) => zone.zoneType === "dead_end").length,
    bossRoomCount: zones.filter((zone) => zone.zoneType === "boss_room").length,
    corridorCount: zones.filter((zone) => zone.zoneType === "corridor").length,
    groundTileCount: tileCounts.ground,
    wallTileCount: tileCounts.wall,
    emptyTileCount: tileCounts.empty
  };
}

function validateCounts(stats: ValidationResult["stats"], errors: string[]) {
  if (stats.entranceCount < ROOM_COUNT_CONFIG.entrance.minCount || stats.entranceCount > ROOM_COUNT_CONFIG.entrance.maxCount) errors.push("入口区域数量不在 4~6 范围内。");
  if (stats.normalRoomCount < ROOM_COUNT_CONFIG.normalRoom.minCount || stats.normalRoomCount > ROOM_COUNT_CONFIG.normalRoom.maxCount) errors.push("普通房间数量不在 8~18 范围内。");
  if (stats.largeRoomCount < ROOM_COUNT_CONFIG.largeRoom.minCount || stats.largeRoomCount > ROOM_COUNT_CONFIG.largeRoom.maxCount) errors.push("大房间数量不在 2~5 范围内。");
  if (stats.deadEndCount < ROOM_COUNT_CONFIG.deadEnd.minCount || stats.deadEndCount > ROOM_COUNT_CONFIG.deadEnd.maxCount) errors.push("死胡同数量不在 3~8 范围内。");
  if (stats.bossRoomCount !== ROOM_COUNT_CONFIG.bossRoom.fixedCount) errors.push("Boss 房数量必须等于 1。");
}

function validateColliders(map: Partial<GeneratedEditorMap>, errors: string[]) {
  for (const tile of ["empty", "ground", "wall"] as const) {
    const collider = map.colliders?.[tile];
    const expected = STANDARD_COLLIDERS[tile];
    if (!collider || collider.enabled !== expected.enabled) errors.push(`${tile} collider 阻挡语义不正确。`);
  }
}

function validateZoneCenters(tiles: GeneratedTileKind[][], zones: GeneratedZone[], errors: string[]) {
  for (const zone of zones) {
    if (zone.zoneType === "corridor") continue;
    const center = zoneCenter(zone);
    if (tiles[center.y]?.[center.x] !== "ground") errors.push(`${zone.name || zone.id} 中心点必须位于 ground。`);
  }
}

function validateSpawn(spawn: GeneratedCellPoint | undefined, tiles: GeneratedTileKind[][], zones: GeneratedZone[], errors: string[]) {
  if (!spawn || tiles[spawn.y]?.[spawn.x] !== "ground") {
    errors.push("spawn 必须位于 ground。");
    return;
  }
  const inEntrance = zones.some((zone) => zone.zoneType === "entrance" && pointInZone(spawn, zone));
  if (!inEntrance) errors.push("spawn 必须位于入口区域 ground。");
}

function validateGroundConnectivity(tiles: GeneratedTileKind[][], groundCount: number, errors: string[]) {
  let start: GeneratedCellPoint | null = null;
  for (let y = 0; y < tiles.length && !start; y += 1) {
    for (let x = 0; x < (tiles[0]?.length ?? 0); x += 1) {
      if (tiles[y][x] === "ground") {
        start = { x, y };
        break;
      }
    }
  }
  if (!start) {
    errors.push("地图必须包含 ground。");
    return;
  }
  const reachable = reachableGroundDistances(tiles, start);
  if (reachable.size !== groundCount) errors.push("所有 ground 必须连通，不能存在孤岛。");
}

function validateGraph(graph: GeneratedMapGraph, errors: string[], warnings: string[]) {
  const degree = new Map(graph.rooms.map((room) => [room.id, 0]));
  const adjacency = new Map(graph.rooms.map((room) => [room.id, [] as string[]]));
  for (const edge of graph.corridors) {
    degree.set(edge.fromRoomId, (degree.get(edge.fromRoomId) ?? 0) + 1);
    degree.set(edge.toRoomId, (degree.get(edge.toRoomId) ?? 0) + 1);
    adjacency.get(edge.fromRoomId)?.push(edge.toRoomId);
    adjacency.get(edge.toRoomId)?.push(edge.fromRoomId);
  }
  const boss = graph.rooms.find((room) => room.id === graph.bossRoomId);
  if (!boss) errors.push("缺少 Boss 房图节点。");
  for (const room of graph.rooms) {
    const roomDegree = degree.get(room.id) ?? 0;
    if (room.roomType === "dead_end" && roomDegree !== 1) errors.push(`${room.id} 必须是 degree 1 的死胡同。`);
    if (room.roomType === "large_room" && roomDegree < 2) errors.push(`${room.id} 大房间连接数必须至少为 2。`);
    if (room.roomType === "boss_room" && (roomDegree < 1 || roomDegree > 2)) errors.push("Boss 房连接数必须为 1 或 2。");
  }
  for (const edge of graph.corridors) {
    const from = graph.rooms.find((room) => room.id === edge.fromRoomId);
    const to = graph.rooms.find((room) => room.id === edge.toRoomId);
    if ((from?.roomType === "entrance" && to?.roomType === "boss_room") || (from?.roomType === "boss_room" && to?.roomType === "entrance")) {
      errors.push("入口区域不能直接连接 Boss 房。");
    }
    if (edge.width < 2 || edge.width > 3) errors.push(`${edge.id} 通道宽度必须为 2 或 3。`);
  }
  const reachable = graphReachable(adjacency, graph.entranceRoomIds[0]);
  if (reachable.size !== graph.rooms.length) errors.push("所有房间图节点必须连通。");
  for (const entranceId of graph.entranceRoomIds) {
    if (!graphReachable(adjacency, entranceId).has(graph.bossRoomId)) errors.push(`${entranceId} 必须可达 Boss 房。`);
  }
  if (graph.topologyPreset === "hub_spoke") {
    const hub = graph.rooms.find((room) => room.tags.includes("hub"));
    if (!hub || (degree.get(hub.id) ?? 0) < 4) errors.push("中心枢纽型必须包含连接数至少为 4 的大房间枢纽。");
  }
  if (graph.topologyPreset === "loop_with_branches" && !hasLoop(graph.rooms.map((room) => room.id), adjacency)) {
    errors.push("环路分支型必须包含至少一个局部环路。");
  }
  if (graph.mainPathRoomIds.length < 2) warnings.push("主路径节点数量偏少。");
}

function graphReachable(adjacency: Map<string, string[]>, start: string) {
  const visited = new Set<string>();
  const queue = [start];
  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index];
    if (visited.has(id)) continue;
    visited.add(id);
    for (const next of adjacency.get(id) ?? []) {
      if (!visited.has(next)) queue.push(next);
    }
  }
  return visited;
}

function hasLoop(roomIds: string[], adjacency: Map<string, string[]>) {
  const visited = new Set<string>();
  const visit = (id: string, parent: string | null): boolean => {
    visited.add(id);
    for (const next of adjacency.get(id) ?? []) {
      if (next === parent) continue;
      if (visited.has(next)) return true;
      if (visit(next, id)) return true;
    }
    return false;
  };
  return roomIds.some((id) => !visited.has(id) && visit(id, null));
}

function pointInZone(point: GeneratedCellPoint, zone: GeneratedZone) {
  return zone.rects.some((rect) => (
    point.x >= Math.min(rect.start.x, rect.end.x)
    && point.x <= Math.max(rect.start.x, rect.end.x)
    && point.y >= Math.min(rect.start.y, rect.end.y)
    && point.y <= Math.max(rect.start.y, rect.end.y)
  ));
}

function zoneCenter(zone: GeneratedZone): GeneratedCellPoint {
  return {
    x: Math.floor(zone.x + zone.width / 2),
    y: Math.floor(zone.y + zone.height / 2)
  };
}
