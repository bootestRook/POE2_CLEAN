export type {
  EditorZoneType,
  GenerateProceduralEditorMapOptions,
  GeneratedCellPoint,
  GeneratedCorridorEdge,
  GeneratedEditorMap,
  GeneratedMapGraph,
  GeneratedMapResult,
  GeneratedRoomNode,
  GeneratedRoomType,
  GeneratedTileKind,
  GeneratedZone,
  GeneratedZoneRect,
  MapTopologyPreset,
  ValidationResult
} from "./mapGeneration/mapGenerationTypes";

export {
  DEFAULT_PROCEDURAL_MAP_SEED,
  MAP_SIZE_CONFIG,
  PROCEDURAL_MAP_DOCUMENT_ID,
  STANDARD_COLLIDERS,
  TOPOLOGY_PRESET_NAME_ZH
} from "./mapGeneration/mapGenerationConfig";
export { createSeededRandom, chooseTopologyPreset } from "./mapGeneration/seededRandom";
export { generateProceduralEditorMap, generateProceduralEditorMapWithPreset } from "./mapGeneration/generateProceduralEditorMap";
export { validateGeneratedMap } from "./mapGeneration/mapValidation";

import { DEFAULT_PROCEDURAL_MAP_SEED, MAP_SIZE_CONFIG } from "./mapGeneration/mapGenerationConfig";
import { generateProceduralEditorMap } from "./mapGeneration/generateProceduralEditorMap";
import { validateGeneratedMap } from "./mapGeneration/mapValidation";
import { createSeededRandom } from "./mapGeneration/seededRandom";
import type { GeneratedEditorMap, GeneratedTileKind, GeneratedZone, MapTopologyPreset } from "./mapGeneration/mapGenerationTypes";

export type ProceduralMapTileKind = GeneratedTileKind;
export type ProceduralMapCellPoint = { x: number; y: number };
export type ProceduralMapZoneType = "entrance" | "corridor" | "main_room" | "large_room" | "dead_end" | "boss_room" | "exit_area";
export type ProceduralMapZoneRect = { start: ProceduralMapCellPoint; end: ProceduralMapCellPoint };
export type ProceduralMapZone = GeneratedZone & { zoneType: ProceduralMapZoneType };
export type ProceduralMapDocument = GeneratedEditorMap & { zones: ProceduralMapZone[] };

export type ProceduralMapGenerationProfile = {
  width: number;
  height: number;
  cellSize: number;
  minimumSizeRatio: number;
  corridorWidth: number;
  retryLimit: number;
  branchJitterCells: number;
  loopChance: number;
  topologyPreset?: MapTopologyPreset;
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
  debugText: string[];
};

export const DEFAULT_PROCEDURAL_MAP_PROFILE: ProceduralMapGenerationProfile = {
  width: MAP_SIZE_CONFIG.width,
  height: MAP_SIZE_CONFIG.height,
  cellSize: MAP_SIZE_CONFIG.cellSize,
  minimumSizeRatio: 1,
  corridorWidth: 3,
  retryLimit: 100,
  branchJitterCells: 0,
  loopChance: 1
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
  return createSeededRandom(seedText).next;
}

export function generateProceduralMapDocument(
  seedText = DEFAULT_PROCEDURAL_MAP_SEED,
  _referenceDocument: Partial<ProceduralMapDocument> = {},
  profile: ProceduralMapGenerationProfile = DEFAULT_PROCEDURAL_MAP_PROFILE
): ProceduralMapGenerationResult {
  const result = generateProceduralEditorMap({
    seed: seedText,
    topologyPreset: profile.topologyPreset
  });
  return {
    document: result.map as ProceduralMapDocument,
    metrics: measureMapEditorDocument(result.map as ProceduralMapDocument),
    warnings: result.validation.warnings,
    usedFallback: false,
    debugText: result.debugText
  };
}

export function validateProceduralMapDocument(
  document: Partial<ProceduralMapDocument>,
  _referenceDocument: Partial<ProceduralMapDocument> = {},
  _profile: ProceduralMapGenerationProfile = DEFAULT_PROCEDURAL_MAP_PROFILE
) {
  const validation = validateGeneratedMap(document as Partial<GeneratedEditorMap>);
  return {
    valid: validation.ok,
    metrics: measureMapEditorDocument(document),
    warnings: [...validation.errors, ...validation.warnings]
  };
}

export function generateProceduralMapCandidate(seedText: string, profile: ProceduralMapGenerationProfile = DEFAULT_PROCEDURAL_MAP_PROFILE): ProceduralMapDocument {
  return generateProceduralMapDocument(seedText, {}, profile).document;
}
