import { DEFAULT_PROCEDURAL_MAP_SEED, LAYOUT_CONFIG, MAP_SIZE_CONFIG, PROCEDURAL_MAP_DOCUMENT_ID, STANDARD_COLLIDERS } from "./mapGenerationConfig";
import { generateCorridors } from "./corridorGenerator";
import { createGeneratedMapDebugText } from "./generatedMapDebug";
import { validateGeneratedMap } from "./mapValidation";
import { layoutRooms } from "./roomLayoutGenerator";
import { createSeededRandom, chooseTopologyPreset } from "./seededRandom";
import { carveTileMap } from "./tileMapCarver";
import { finalizeTopologyGraph, generateTopologyDraft } from "./topologyGenerator";
import { buildGeneratedZones, chooseSpawn } from "./zoneBuilder";
import type { GenerateProceduralEditorMapOptions, GeneratedEditorMap, GeneratedMapResult, MapTopologyPreset, ValidationResult } from "./mapGenerationTypes";

export function generateProceduralEditorMap(options: GenerateProceduralEditorMapOptions = {}): GeneratedMapResult {
  const seed = options.seed ?? DEFAULT_PROCEDURAL_MAP_SEED;
  const topologyPreset = chooseTopologyPreset(seed, options.topologyPreset);
  const attemptErrors: string[] = [];
  for (let attempt = 0; attempt < LAYOUT_CONFIG.maxGenerationAttempts; attempt += 1) {
    try {
      const result = generateCandidate(seed, topologyPreset, attempt);
      if (result.validation.ok) return result;
      attemptErrors.push(`第 ${attempt + 1} 次失败：${result.validation.errors.join("；")}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      attemptErrors.push(`第 ${attempt + 1} 次异常：${message}`);
    }
  }
  const failed = generateCandidate(seed, topologyPreset, 0);
  const validation: ValidationResult = {
    ...failed.validation,
    ok: false,
    errors: [`程序化地图生成失败，已达到 ${LAYOUT_CONFIG.maxGenerationAttempts} 次上限。`, ...attemptErrors.slice(-5), ...failed.validation.errors]
  };
  return {
    ...failed,
    validation,
    debugText: createGeneratedMapDebugText(failed.graph, validation)
  };
}

export function generateProceduralEditorMapWithPreset(seed: string, topologyPreset: MapTopologyPreset) {
  return generateProceduralEditorMap({ seed, topologyPreset });
}

function generateCandidate(seed: string, topologyPreset: MapTopologyPreset, attempt: number): GeneratedMapResult {
  const attemptSeed = `${seed}:attempt:${attempt}`;
  const rng = createSeededRandom(attemptSeed);
  const draft = generateTopologyDraft(seed, topologyPreset, rng.fork("topology"));
  const rooms = layoutRooms(draft, rng.fork("layout"));
  const corridors = generateCorridors(draft, rooms, rng.fork("corridor"));
  const tiles = carveTileMap(rooms, corridors);
  const zones = buildGeneratedZones(rooms, corridors);
  const spawn = chooseSpawn(rooms, tiles);
  const graph = finalizeTopologyGraph(draft, rooms, corridors);
  const map: GeneratedEditorMap = {
    format: "poe.tilemap.editor",
    version: 1,
    name: PROCEDURAL_MAP_DOCUMENT_ID,
    savedAt: "1970-01-01T00:00:00.000Z",
    tiles,
    cellSize: MAP_SIZE_CONFIG.cellSize,
    spawn,
    colliders: STANDARD_COLLIDERS,
    zones,
    width: MAP_SIZE_CONFIG.width,
    height: MAP_SIZE_CONFIG.height
  };
  const validation = validateGeneratedMap(map, graph);
  return {
    map,
    graph,
    validation,
    debugText: createGeneratedMapDebugText(graph, validation)
  };
}
