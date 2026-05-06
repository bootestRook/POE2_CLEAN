export type MapInstanceRotation = 0 | 90 | 180 | 270;

export type MapInstanceCellPoint = {
  x: number;
  y: number;
};

export type MapInstanceMetadata = {
  templateId: string;
  instanceSeed: string;
  rotation: MapInstanceRotation;
  playerSpawnSource: string;
};

export const MAP_INSTANCE_ROTATIONS: MapInstanceRotation[] = [0, 90, 180, 270];

export function createMapInstanceSeed(stageId: string, templateId: string, salt = "") {
  const suffix = salt || `${Date.now()}:${Math.random()}`;
  return `${stageId}:${templateId}:${suffix}`;
}

export function createSeededMapInstanceRandom(seedText: string): () => number {
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

export function chooseAuthoredMapTemplateId(
  stageTemplateIds: readonly string[] | undefined,
  availableTemplateIds: readonly string[],
  seedText: string,
  fallbackTemplateId: string
) {
  const available = new Set(availableTemplateIds);
  const eligible = (stageTemplateIds ?? []).filter((id) => available.has(id));
  const pool = eligible.length > 0 ? eligible : available.has(fallbackTemplateId) ? [fallbackTemplateId] : availableTemplateIds.slice(0, 1);
  if (pool.length === 0) return fallbackTemplateId;
  const rng = createSeededMapInstanceRandom(seedText);
  return pool[Math.floor(rng() * pool.length) % pool.length] ?? pool[0];
}

export function chooseMapInstanceRotation(seedText: string, allowedRotations: readonly MapInstanceRotation[] = MAP_INSTANCE_ROTATIONS) {
  const rotations = allowedRotations.filter((rotation): rotation is MapInstanceRotation => MAP_INSTANCE_ROTATIONS.includes(rotation));
  const pool = rotations.length > 0 ? rotations : MAP_INSTANCE_ROTATIONS;
  const rng = createSeededMapInstanceRandom(`${seedText}:rotation`);
  return pool[Math.floor(rng() * pool.length) % pool.length] ?? 0;
}

export function rotateGrid<T>(grid: readonly (readonly T[])[], rotation: MapInstanceRotation): T[][] {
  const height = grid.length;
  const width = Math.max(0, ...grid.map((row) => row.length));
  if (rotation === 0) return grid.map((row) => [...row]);
  const nextWidth = rotation === 180 ? width : height;
  const nextHeight = rotation === 180 ? height : width;
  const first = grid[0]?.[0];
  const result = Array.from({ length: nextHeight }, () => Array.from({ length: nextWidth }, () => first as T));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const target = rotateCellPoint({ x, y }, width, height, rotation);
      result[target.y][target.x] = grid[y]?.[x] as T;
    }
  }
  return result;
}

export function rotateCellPoint(
  point: MapInstanceCellPoint,
  width: number,
  height: number,
  rotation: MapInstanceRotation
): MapInstanceCellPoint {
  const x = Math.floor(point.x);
  const y = Math.floor(point.y);
  if (rotation === 90) return { x: height - 1 - y, y: x };
  if (rotation === 180) return { x: width - 1 - x, y: height - 1 - y };
  if (rotation === 270) return { x: y, y: width - 1 - x };
  return { x, y };
}

export function rotatedGridSize(width: number, height: number, rotation: MapInstanceRotation) {
  return rotation === 90 || rotation === 270
    ? { width: height, height: width }
    : { width, height };
}

export function chooseIndex(count: number, seedText: string) {
  if (count <= 0) return -1;
  const rng = createSeededMapInstanceRandom(seedText);
  return Math.floor(rng() * count) % count;
}
