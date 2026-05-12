import type { GeneratedTileKind, MapTopologyPreset } from "./mapGenerationTypes";

export const PROCEDURAL_MAP_DOCUMENT_ID = "procedural_map_v1";
export const DEFAULT_PROCEDURAL_MAP_SEED = "v1_map_seed_001";

export const MAP_SIZE_CONFIG = {
  width: 256,
  height: 144,
  cellSize: 96
};

export const STANDARD_COLLIDERS: Record<GeneratedTileKind, { enabled: boolean; x: number; y: number; width: number; height: number }> = {
  empty: { enabled: true, x: 0, y: 0, width: 1, height: 1 },
  ground: { enabled: false, x: 0, y: 0, width: 1, height: 1 },
  wall: { enabled: true, x: 0, y: 0, width: 1, height: 1 }
};

export const ROOM_SIZE_CONFIG = {
  entrance: { minWidth: 6, maxWidth: 12, minHeight: 5, maxHeight: 10 },
  normalRoom: { minWidth: 8, maxWidth: 16, minHeight: 8, maxHeight: 14 },
  largeRoom: { minWidth: 14, maxWidth: 28, minHeight: 14, maxHeight: 24 },
  deadEnd: { minWidth: 6, maxWidth: 12, minHeight: 6, maxHeight: 12 },
  bossRoom: { minWidth: 16, maxWidth: 28, minHeight: 14, maxHeight: 24 }
};

export const ROOM_COUNT_CONFIG = {
  entrance: { minCount: 4, maxCount: 6 },
  normalRoom: { minCount: 8, maxCount: 18 },
  largeRoom: { minCount: 2, maxCount: 5 },
  deadEnd: { minCount: 3, maxCount: 8 },
  bossRoom: { fixedCount: 1 }
};

export const CORRIDOR_CONFIG = {
  minWidth: 2,
  maxWidth: 3,
  mainPathWidth: 3,
  branchPathWidth: 2,
  minLength: 6,
  maxLength: 36
};

export const LAYOUT_CONFIG = {
  mapPadding: 4,
  minRoomGap: 3,
  maxGenerationAttempts: 100,
  maxLayoutAttemptsPerGraph: 80
};

export const TOPOLOGY_PRESETS: MapTopologyPreset[] = ["hub_spoke", "main_path_branches", "loop_with_branches"];

export const TOPOLOGY_PRESET_NAME_ZH: Record<MapTopologyPreset, string> = {
  hub_spoke: "中心枢纽型",
  main_path_branches: "主路径分支型",
  loop_with_branches: "环路分支型"
};
