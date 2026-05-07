export type ProceduralMapTileKind = "empty" | "ground" | "wall";

export type ProceduralMapCellPoint = {
  x: number;
  y: number;
};

export type ProceduralMapZoneType =
  | "entrance"
  | "corridor"
  | "main_room"
  | "large_room"
  | "dead_end"
  | "boss_room"
  | "exit_area";

export type ProceduralMapZoneRect = {
  start: ProceduralMapCellPoint;
  end: ProceduralMapCellPoint;
};

export type ProceduralMapZone = {
  id: string;
  zoneType: ProceduralMapZoneType;
  shape: "rectangle";
  points: ProceduralMapCellPoint[];
  rects: ProceduralMapZoneRect[];
};

export type ProceduralMapDocument = {
  format: "poe.tilemap.editor";
  version: 1;
  name: string;
  savedAt: string;
  tiles: ProceduralMapTileKind[][];
  cellSize: number;
  spawn: ProceduralMapCellPoint;
  colliders: Record<ProceduralMapTileKind, { enabled: boolean; x: number; y: number; width: number; height: number }>;
  zones: ProceduralMapZone[];
  width: number;
  height: number;
};

export type ProceduralMapGenerationProfile = {
  width: number;
  height: number;
  cellSize: number;
  minimumSizeRatio: number;
  corridorWidth: number;
  retryLimit: number;
  branchJitterCells: number;
  loopChance: number;
};

export type ProceduralMapMetrics = {
  width: number;
  height: number;
  groundCells: number;
};

export type ProceduralMapGenerationResult = {
  document: ProceduralMapDocument;
  metrics: ProceduralMapMetrics;
  warnings: string[];
  usedFallback: boolean;
};

type MutableRect = {
  id: string;
  zoneType: ProceduralMapZoneType;
  start: ProceduralMapCellPoint;
  end: ProceduralMapCellPoint;
};

export const PROCEDURAL_MAP_DOCUMENT_ID = "procedural_map_v1";

export const DEFAULT_PROCEDURAL_MAP_PROFILE: ProceduralMapGenerationProfile = {
  width: 256,
  height: 144,
  cellSize: 96,
  minimumSizeRatio: 0.8,
  corridorWidth: 4,
  retryLimit: 5,
  branchJitterCells: 6,
  loopChance: 0.55
};

export function measureMapEditorDocument(document: Partial<ProceduralMapDocument>): ProceduralMapMetrics {
  const tiles = Array.isArray(document.tiles) ? document.tiles : [];
  const groundCells = tiles.reduce((count, row) => (
    count + (Array.isArray(row) ? row.filter((tile) => tile === "ground").length : 0)
  ), 0);
  return {
    width: Math.max(0, Math.floor(Number(document.width) || Math.max(0, ...tiles.map((row) => row.length)))),
    height: Math.max(0, Math.floor(Number(document.height) || tiles.length)),
    groundCells
  };
}

export function minimumProceduralMapMetrics(
  referenceDocument: Partial<ProceduralMapDocument>,
  profile: ProceduralMapGenerationProfile = DEFAULT_PROCEDURAL_MAP_PROFILE
): ProceduralMapMetrics {
  const reference = measureMapEditorDocument(referenceDocument);
  return {
    width: Math.floor(reference.width * profile.minimumSizeRatio),
    height: Math.floor(reference.height * profile.minimumSizeRatio),
    groundCells: Math.floor(reference.groundCells * profile.minimumSizeRatio)
  };
}

export function createProceduralMapRandom(seedText: string): () => number {
  let seed = 2166136261;
  for (let index = 0; index < seedText.length; index += 1) {
    seed ^= seedText.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }
  return () => {
    seed += 0x6D2B79F5;
    let value = seed;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

export function generateProceduralMapDocument(
  seedText: string,
  referenceDocument: Partial<ProceduralMapDocument>,
  profile: ProceduralMapGenerationProfile = DEFAULT_PROCEDURAL_MAP_PROFILE
): ProceduralMapGenerationResult {
  const warnings: string[] = [];
  const attempts = Math.max(1, Math.floor(profile.retryLimit));
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const document = generateProceduralMapCandidate(`${seedText}:attempt:${attempt}`, profile);
    const validation = validateProceduralMapDocument(document, referenceDocument, profile);
    if (validation.valid) {
      return {
        document,
        metrics: validation.metrics,
        warnings: attempt > 0 ? [`Procedural map accepted after ${attempt + 1} deterministic attempts.`] : [],
        usedFallback: false
      };
    }
    warnings.push(`Attempt ${attempt + 1} rejected: ${validation.warnings.join("; ")}`);
  }

  return {
    document: normalizeFallbackMapDocument(referenceDocument),
    metrics: measureMapEditorDocument(referenceDocument),
    warnings: [...warnings, "Procedural map generation fell back to the local map_001 template."],
    usedFallback: true
  };
}

export function validateProceduralMapDocument(
  document: Partial<ProceduralMapDocument>,
  referenceDocument: Partial<ProceduralMapDocument>,
  profile: ProceduralMapGenerationProfile = DEFAULT_PROCEDURAL_MAP_PROFILE
) {
  const warnings: string[] = [];
  const metrics = measureMapEditorDocument(document);
  const minimum = minimumProceduralMapMetrics(referenceDocument, profile);
  const zones = Array.isArray(document.zones) ? document.zones : [];

  if (metrics.width < minimum.width) warnings.push(`width ${metrics.width} below minimum ${minimum.width}`);
  if (metrics.height < minimum.height) warnings.push(`height ${metrics.height} below minimum ${minimum.height}`);
  if (metrics.groundCells < minimum.groundCells) warnings.push(`ground cells ${metrics.groundCells} below minimum ${minimum.groundCells}`);
  if (zones.filter((zone) => zone.zoneType === "entrance").length < 4) warnings.push("fewer than four entrance zones");
  if (!zones.some((zone) => zone.zoneType === "boss_room")) warnings.push("missing boss_room zone");
  if (!zones.some((zone) => zone.zoneType === "corridor")) warnings.push("missing corridor zone");
  if (!zones.some((zone) => zone.zoneType === "main_room" || zone.zoneType === "large_room")) warnings.push("missing major room zone");

  const tiles = Array.isArray(document.tiles) ? document.tiles : [];
  const isGround = (point: ProceduralMapCellPoint) => (
    point.x >= 0
    && point.y >= 0
    && point.x < metrics.width
    && point.y < metrics.height
    && tiles[point.y]?.[point.x] === "ground"
  );
  const zoneCenters = zones.map((zone) => ({ zone, center: zoneCenter(zone) }));
  const outOfBounds = zoneCenters.filter(({ center }) => center.x < 0 || center.y < 0 || center.x >= metrics.width || center.y >= metrics.height);
  if (outOfBounds.length > 0) warnings.push(`zone center out of bounds: ${outOfBounds.map(({ zone }) => zone.id).join(",")}`);
  const unwalkableCenters = zoneCenters.filter(({ center }) => !isGround(center));
  if (unwalkableCenters.length > 0) warnings.push(`zone center not walkable: ${unwalkableCenters.map(({ zone }) => zone.id).join(",")}`);

  const entranceCenters = zoneCenters.filter(({ zone }) => zone.zoneType === "entrance").map(({ center }) => center);
  const bossCenters = zoneCenters.filter(({ zone }) => zone.zoneType === "boss_room").map(({ center }) => center);
  if (entranceCenters.length > 0 && bossCenters.length > 0) {
    for (const entrance of entranceCenters) {
      const reachable = reachableGroundCells(tiles, entrance, metrics.width, metrics.height);
      if (!bossCenters.some((boss) => reachable.has(pointKey(boss)))) warnings.push(`boss room unreachable from entrance ${pointKey(entrance)}`);
      const majorCenters = zoneCenters
        .filter(({ zone }) => zone.zoneType === "main_room" || zone.zoneType === "large_room" || zone.zoneType === "dead_end" || zone.zoneType === "boss_room")
        .map(({ center }) => center);
      if (!majorCenters.every((center) => reachable.has(pointKey(center)))) warnings.push(`major zone unreachable from entrance ${pointKey(entrance)}`);
    }
    const defaultEntrance = entranceCenters[0];
    const defaultReachableDistances = reachableGroundDistances(tiles, defaultEntrance, metrics.width, metrics.height);
    const nearestMajor = zoneCenters
      .filter(({ zone }) => zone.zoneType === "main_room" || zone.zoneType === "large_room")
      .map(({ center }) => defaultReachableDistances.get(pointKey(center)) ?? Number.POSITIVE_INFINITY)
      .sort((a, b) => a - b)[0] ?? Number.POSITIVE_INFINITY;
    const nearestBoss = bossCenters
      .map((center) => defaultReachableDistances.get(pointKey(center)) ?? Number.POSITIVE_INFINITY)
      .sort((a, b) => a - b)[0] ?? Number.POSITIVE_INFINITY;
    if (!(nearestBoss > nearestMajor)) warnings.push("boss room is not farther than the nearest major room from default entrance");
  }

  return {
    valid: warnings.length === 0,
    metrics,
    warnings
  };
}

export function generateProceduralMapCandidate(seedText: string, profile: ProceduralMapGenerationProfile = DEFAULT_PROCEDURAL_MAP_PROFILE): ProceduralMapDocument {
  const rng = createProceduralMapRandom(seedText);
  const width = Math.max(204, Math.floor(profile.width));
  const height = Math.max(115, Math.floor(profile.height));
  const tiles = Array.from({ length: height }, () => Array.from({ length: width }, () => "empty" as ProceduralMapTileKind));
  const jitter = () => Math.round((rng() - 0.5) * profile.branchJitterCells);
  const rects: MutableRect[] = [];
  const addZoneRect = (id: string, zoneType: ProceduralMapZoneType, start: ProceduralMapCellPoint, end: ProceduralMapCellPoint) => {
    const rect = {
      id,
      zoneType,
      start: clampPoint(start, width, height),
      end: clampPoint(end, width, height)
    };
    rects.push(rect);
    fillGround(tiles, rect.start, rect.end);
    return rect;
  };
  const corridor = (id: string, a: ProceduralMapCellPoint, b: ProceduralMapCellPoint, bendFirst = true) => {
    const half = Math.max(1, Math.floor(profile.corridorWidth / 2));
    if (bendFirst) {
      addZoneRect(`${id}_a`, "corridor", { x: Math.min(a.x, b.x), y: a.y - half }, { x: Math.max(a.x, b.x), y: a.y + half });
      addZoneRect(`${id}_b`, "corridor", { x: b.x - half, y: Math.min(a.y, b.y) }, { x: b.x + half, y: Math.max(a.y, b.y) });
    } else {
      addZoneRect(`${id}_a`, "corridor", { x: a.x - half, y: Math.min(a.y, b.y) }, { x: a.x + half, y: Math.max(a.y, b.y) });
      addZoneRect(`${id}_b`, "corridor", { x: Math.min(a.x, b.x), y: b.y - half }, { x: Math.max(a.x, b.x), y: b.y + half });
    }
  };

  const entranceA = addZoneRect("proc_entrance_west", "entrance", { x: 34 + jitter(), y: 67 + jitter() }, { x: 44 + jitter(), y: 76 + jitter() });
  const entranceB = addZoneRect("proc_entrance_northwest", "entrance", { x: 49 + jitter(), y: 45 + jitter() }, { x: 60 + jitter(), y: 54 + jitter() });
  const entranceC = addZoneRect("proc_entrance_southwest", "entrance", { x: 49 + jitter(), y: 91 + jitter() }, { x: 60 + jitter(), y: 101 + jitter() });
  const entranceD = addZoneRect("proc_entrance_inner", "entrance", { x: 64 + jitter(), y: 68 + jitter() }, { x: 74 + jitter(), y: 77 + jitter() });
  const hub = addZoneRect("proc_hub_large", "large_room", { x: 90 + jitter(), y: 61 + jitter() }, { x: 124 + jitter(), y: 85 + jitter() });
  const topRoom = addZoneRect("proc_north_room", "main_room", { x: 145 + jitter(), y: 34 + jitter() }, { x: 170 + jitter(), y: 56 + jitter() });
  const midRoom = addZoneRect("proc_mid_room", "main_room", { x: 137 + jitter(), y: 67 + jitter() }, { x: 165 + jitter(), y: 88 + jitter() });
  const southRoom = addZoneRect("proc_south_large", "large_room", { x: 145 + jitter(), y: 99 + jitter() }, { x: 179 + jitter(), y: 124 + jitter() });
  const deadEnd = addZoneRect("proc_dead_end", "dead_end", { x: 187 + jitter(), y: 92 + jitter() }, { x: 207 + jitter(), y: 113 + jitter() });
  const antechamber = addZoneRect("proc_boss_antechamber", "main_room", { x: 185 + jitter(), y: 45 + jitter() }, { x: 202 + jitter(), y: 62 + jitter() });
  const boss = addZoneRect("proc_boss_room", "boss_room", { x: 215 + jitter(), y: 40 + jitter() }, { x: 236 + jitter(), y: 63 + jitter() });

  corridor("proc_corridor_entrance_a_hub", zoneCenterFromRect(entranceA), zoneCenterFromRect(hub), true);
  corridor("proc_corridor_entrance_b_hub", zoneCenterFromRect(entranceB), zoneCenterFromRect(hub), false);
  corridor("proc_corridor_entrance_c_hub", zoneCenterFromRect(entranceC), zoneCenterFromRect(hub), false);
  corridor("proc_corridor_entrance_d_hub", zoneCenterFromRect(entranceD), zoneCenterFromRect(hub), true);
  corridor("proc_corridor_hub_mid", zoneCenterFromRect(hub), zoneCenterFromRect(midRoom), true);
  corridor("proc_corridor_mid_top", zoneCenterFromRect(midRoom), zoneCenterFromRect(topRoom), false);
  corridor("proc_corridor_mid_south", zoneCenterFromRect(midRoom), zoneCenterFromRect(southRoom), false);
  corridor("proc_corridor_south_dead", zoneCenterFromRect(southRoom), zoneCenterFromRect(deadEnd), true);
  corridor("proc_corridor_top_ante", zoneCenterFromRect(topRoom), zoneCenterFromRect(antechamber), true);
  corridor("proc_corridor_ante_boss", zoneCenterFromRect(antechamber), zoneCenterFromRect(boss), true);
  if (rng() < profile.loopChance) corridor("proc_corridor_loop_south_ante", zoneCenterFromRect(southRoom), zoneCenterFromRect(antechamber), true);

  addWallsAroundGround(tiles);
  const entranceCenter = zoneCenterFromRect(entranceA);
  return {
    format: "poe.tilemap.editor",
    version: 1,
    name: PROCEDURAL_MAP_DOCUMENT_ID,
    savedAt: "1970-01-01T00:00:00.000Z",
    tiles,
    cellSize: profile.cellSize,
    spawn: entranceCenter,
    colliders: createDefaultColliders(),
    zones: rects.map((rect) => rectToZone(rect)),
    width,
    height
  };
}

function normalizeFallbackMapDocument(document: Partial<ProceduralMapDocument>): ProceduralMapDocument {
  return {
    format: "poe.tilemap.editor",
    version: 1,
    name: typeof document.name === "string" ? document.name : "map_001",
    savedAt: typeof document.savedAt === "string" ? document.savedAt : "1970-01-01T00:00:00.000Z",
    tiles: Array.isArray(document.tiles) ? document.tiles as ProceduralMapTileKind[][] : [],
    cellSize: Number(document.cellSize) || DEFAULT_PROCEDURAL_MAP_PROFILE.cellSize,
    spawn: document.spawn ?? { x: 0, y: 0 },
    colliders: document.colliders ?? createDefaultColliders(),
    zones: Array.isArray(document.zones) ? document.zones as ProceduralMapZone[] : [],
    width: Number(document.width) || 0,
    height: Number(document.height) || 0
  };
}

function createDefaultColliders(): ProceduralMapDocument["colliders"] {
  return {
    empty: { enabled: true, x: 0, y: 0, width: 1, height: 1 },
    ground: { enabled: false, x: 0, y: 0, width: 1, height: 1 },
    wall: { enabled: true, x: 0, y: 0, width: 1, height: 1 }
  };
}

function fillGround(tiles: ProceduralMapTileKind[][], start: ProceduralMapCellPoint, end: ProceduralMapCellPoint) {
  for (let y = Math.min(start.y, end.y); y <= Math.max(start.y, end.y); y += 1) {
    for (let x = Math.min(start.x, end.x); x <= Math.max(start.x, end.x); x += 1) {
      if (tiles[y]?.[x] !== undefined) tiles[y][x] = "ground";
    }
  }
}

function addWallsAroundGround(tiles: ProceduralMapTileKind[][]) {
  const height = tiles.length;
  const width = tiles[0]?.length ?? 0;
  const wallPoints: ProceduralMapCellPoint[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
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

function rectToZone(rect: MutableRect): ProceduralMapZone {
  return {
    id: rect.id,
    zoneType: rect.zoneType,
    shape: "rectangle",
    points: [rect.start, rect.end],
    rects: [{ start: rect.start, end: rect.end }]
  };
}

function zoneCenter(zone: ProceduralMapZone): ProceduralMapCellPoint {
  const rect = zone.rects[0] ?? { start: zone.points[0], end: zone.points[1] };
  return zoneCenterFromRect(rect);
}

function zoneCenterFromRect(rect: { start: ProceduralMapCellPoint; end: ProceduralMapCellPoint }): ProceduralMapCellPoint {
  return {
    x: Math.floor((Math.min(rect.start.x, rect.end.x) + Math.max(rect.start.x, rect.end.x)) / 2),
    y: Math.floor((Math.min(rect.start.y, rect.end.y) + Math.max(rect.start.y, rect.end.y)) / 2)
  };
}

function clampPoint(point: ProceduralMapCellPoint, width: number, height: number): ProceduralMapCellPoint {
  return {
    x: Math.max(1, Math.min(width - 2, Math.floor(point.x))),
    y: Math.max(1, Math.min(height - 2, Math.floor(point.y)))
  };
}

function pointKey(point: ProceduralMapCellPoint) {
  return `${point.x},${point.y}`;
}

function reachableGroundCells(
  tiles: ProceduralMapTileKind[][],
  start: ProceduralMapCellPoint,
  width: number,
  height: number
) {
  return new Set(reachableGroundDistances(tiles, start, width, height).keys());
}

function reachableGroundDistances(
  tiles: ProceduralMapTileKind[][],
  start: ProceduralMapCellPoint,
  width: number,
  height: number
) {
  const distances = new Map<string, number>();
  if (tiles[start.y]?.[start.x] !== "ground") return distances;
  const queue: ProceduralMapCellPoint[] = [start];
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
      if (next.x < 0 || next.y < 0 || next.x >= width || next.y >= height) continue;
      if (tiles[next.y]?.[next.x] !== "ground") continue;
      const key = pointKey(next);
      if (distances.has(key)) continue;
      distances.set(key, distance + 1);
      queue.push(next);
    }
  }
  return distances;
}
