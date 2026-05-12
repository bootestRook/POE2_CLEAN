export type GeneratedTileKind = "empty" | "ground" | "wall";

export type GeneratedCellPoint = {
  x: number;
  y: number;
};

export type MapTopologyPreset = "hub_spoke" | "main_path_branches" | "loop_with_branches";

export type GeneratedRoomType = "entrance" | "normal_room" | "large_room" | "dead_end" | "boss_room";

export type EditorZoneType = "entrance" | "main_room" | "large_room" | "dead_end" | "boss_room" | "corridor";

export type GeneratedZoneRect = {
  start: GeneratedCellPoint;
  end: GeneratedCellPoint;
};

export interface GeneratedRoomNode {
  id: string;
  roomType: GeneratedRoomType;
  zoneType: EditorZoneType;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  graphDepth: number;
  tags: string[];
}

export interface GeneratedCorridorEdge {
  id: string;
  fromRoomId: string;
  toRoomId: string;
  width: number;
  path: GeneratedCellPoint[];
  zoneType: "corridor";
  tags: string[];
}

export interface GeneratedZone {
  id: string;
  name: string;
  zoneType: EditorZoneType;
  x: number;
  y: number;
  width: number;
  height: number;
  tags?: string[];
  shape: "rectangle";
  points: GeneratedCellPoint[];
  rects: GeneratedZoneRect[];
}

export interface GeneratedEditorMap {
  format: "poe.tilemap.editor";
  version: 1;
  name: string;
  savedAt: string;
  tiles: GeneratedTileKind[][];
  cellSize: number;
  spawn: GeneratedCellPoint;
  colliders: Record<GeneratedTileKind, { enabled: boolean; x: number; y: number; width: number; height: number }>;
  zones: GeneratedZone[];
  width: number;
  height: number;
}

export interface GeneratedMapGraph {
  seed: string;
  topologyPreset: MapTopologyPreset;
  rooms: GeneratedRoomNode[];
  corridors: GeneratedCorridorEdge[];
  entranceRoomIds: string[];
  bossRoomId: string;
  mainPathRoomIds: string[];
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    width: number;
    height: number;
    entranceCount: number;
    normalRoomCount: number;
    largeRoomCount: number;
    deadEndCount: number;
    bossRoomCount: number;
    corridorCount: number;
    groundTileCount: number;
    wallTileCount: number;
    emptyTileCount: number;
  };
}

export interface GeneratedMapResult {
  map: GeneratedEditorMap;
  graph: GeneratedMapGraph;
  validation: ValidationResult;
  debugText: string[];
}

export type GenerateProceduralEditorMapOptions = {
  seed?: string;
  topologyPreset?: MapTopologyPreset;
};
