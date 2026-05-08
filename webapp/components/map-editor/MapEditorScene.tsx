import { CSSProperties, ReactNode, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { BakedBattleMapData, MapPoint } from "../../bakedMapLoader";
import type { ProceduralZoneType } from "../../mapSpawnRuntime";
import { AUTHORED_MAP_TEMPLATES, DEFAULT_AUTHORED_MAP_TEMPLATE_ID, REST_AREA_MAP_TEMPLATE_ID, defaultAuthoredMapTemplate } from "../../mapTemplateRegistry";
import { chooseIndex, rotateCellPoint, rotateGrid, rotatedGridSize } from "../../mapInstanceRuntime";
import type { MapInstanceMetadata, MapInstanceRotation } from "../../mapInstanceRuntime";
import { resolveUnitAnimation } from "../../unitAnimation";
import type { UnitAnimationFrame } from "../../unitAnimation";
import type { UnitDirection } from "../../unitAssets";
import { UnitAnimationSprite } from "../battle/UnitAnimationSprite";
import { clampNumber } from "../../utils/number";
import { playerInputVector, projectMovementVectorForAnimation, resolveAnimationDirection, unitMovementState } from "../../utils/runtimeMotion";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export type MapEditorTileKind = "empty" | "ground" | "wall";
export type MapEditorBrush = Exclude<MapEditorTileKind, "empty">;
export type MapEditorPaintMode = "single" | "rectangle";
export type MapEditorPaintAction = "fill" | "clear";
export type MapEditorCellPoint = { x: number; y: number };
export type MapEditorWorldPoint = { x: number; y: number };
export type MapEditorSpawnPlanTool = "tiles" | "zone";
export type MapEditorZoneRect = {
  start: MapEditorCellPoint;
  end: MapEditorCellPoint;
};
export type MapEditorZone = {
  id: string;
  zoneType: ProceduralZoneType;
  shape: "rectangle";
  points: MapEditorCellPoint[];
  rects: MapEditorZoneRect[];
};
export type MapEditorZoneDraft = {
  zoneType: ProceduralZoneType;
  start: MapEditorCellPoint;
  current: MapEditorCellPoint;
};
export type MapEditorCollider = {
  enabled: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};
export type MapEditorColliderNumericField = "x" | "y" | "width" | "height";
export type MapEditorTileColliderConfig = Record<MapEditorTileKind, MapEditorCollider>;
export type MapEditorDragState = {
  start: MapEditorCellPoint;
  current: MapEditorCellPoint;
};
export type MapEditorSavedState = {
  tiles: MapEditorTileKind[][];
  cellSize: number;
  spawn: MapEditorCellPoint;
  colliders: MapEditorTileColliderConfig;
  zones: MapEditorZone[];
  width: number;
  height: number;
};
export type MapEditorFileDocument = MapEditorSavedState & {
  format: "poe.tilemap.editor";
  version: 1;
  name: string;
  savedAt: string;
};
export type EditorRuntimeBattleMapData = BakedBattleMapData & {
  editorTiles: MapEditorTileKind[][];
  editorZones: MapEditorZone[];
  mapInstance?: MapInstanceMetadata;
};
export type RuntimeBattleMapOption = {
  id: string;
  displayName: string;
  biome: string;
  worldWidth: number;
  worldHeight: number;
};
export type MapEditorVisibleBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};
const MAP_EDITOR_WALL_SIDES = ["n", "e", "s", "w"] as const;
export type MapEditorWallSide = typeof MAP_EDITOR_WALL_SIDES[number];
const MAP_EDITOR_WALL_CORNERS = ["nw", "ne", "se", "sw"] as const;
export type MapEditorWallCorner = typeof MAP_EDITOR_WALL_CORNERS[number];
export type MapEditorAutotileRole = "empty" | "isolated" | "connected" | "interior";
export type MapEditorAutotileState = {
  role: MapEditorAutotileRole;
  sameSides: MapEditorWallSide[];
  edgeSides: MapEditorWallSide[];
  boundarySides: MapEditorWallSide[];
  innerCorners: MapEditorWallCorner[];
  outerCorners: MapEditorWallCorner[];
};
export type MapEditorFileHandle = {
  kind: "file";
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }>;
};
export type MapEditorDirectoryHandle = {
  kind: "directory";
  name: string;
  values: () => AsyncIterable<MapEditorFileHandle | MapEditorDirectoryHandle>;
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<MapEditorFileHandle>;
  queryPermission?: (descriptor?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (descriptor?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
};
export type MapEditorWindowWithFilePickers = Window & {
  showDirectoryPicker?: (options?: { id?: string; mode?: "read" | "readwrite" }) => Promise<MapEditorDirectoryHandle>;
  showOpenFilePicker?: (options?: {
    id?: string;
    multiple?: boolean;
    startIn?: "desktop" | "documents" | "downloads" | MapEditorDirectoryHandle;
    types?: Array<{ description: string; accept: Record<string, string[]> }>;
  }) => Promise<MapEditorFileHandle[]>;
};

const MAP_EDITOR_COLUMNS = 256;
const MAP_EDITOR_ROWS = 144;
const MAP_EDITOR_MIN_CELL_SIZE = 32;
const MAP_EDITOR_MAX_CELL_SIZE = 96;
const MAP_EDITOR_DEFAULT_CELL_SIZE = 64;
const MAP_EDITOR_PLAYER_SPEED = 260 * 5;
export const MAP_EDITOR_PLAYER_RENDER_SCALE = 0.35;
export const MAP_EDITOR_STORAGE_KEY = "poe.mapEditor.tilemap.v1";
export const MAP_EDITOR_CURRENT_FILE_STORAGE_KEY = "poe.mapEditor.currentFile.v1";
const MAP_EDITOR_HANDLE_DB_NAME = "poe-map-editor-handles";
const MAP_EDITOR_HANDLE_STORE_NAME = "handles";
const MAP_EDITOR_DIRECTORY_HANDLE_KEY = "mapDirectory";
const MAP_EDITOR_VISIBLE_RADIUS_X = 18;
const MAP_EDITOR_VISIBLE_RADIUS_Y = 12;
const MAP_EDITOR_DEFAULT_SPAWN: MapEditorCellPoint = { x: 55, y: 35 };
const MAP_EDITOR_SAMPLE_OFFSET: MapEditorCellPoint = { x: 48, y: 28 };
const MAP_EDITOR_MINIMAP_WIDTH = 256;
const MAP_EDITOR_MINIMAP_HEIGHT = 144;
const MAP_EDITOR_PLAYER_COLLIDER: MapEditorCollider = { enabled: true, x: 0.29, y: 0.42, width: 0.42, height: 0.36 };
const MAP_EDITOR_CAMERA_PAN_SPEED = 900;
const MAP_EDITOR_ZONE_TYPES: Array<{ id: ProceduralZoneType; label: string }> = [
  { id: "entrance", label: "入口区域" },
  { id: "corridor", label: "通道" },
  { id: "main_room", label: "普通房间" },
  { id: "large_room", label: "大房间" },
  { id: "dead_end", label: "死胡同" },
  { id: "boss_room", label: "Boss 房" },
  { id: "exit_area", label: "出口区域" }
];
const EDITOR_RUNTIME_MAP_ID = DEFAULT_AUTHORED_MAP_TEMPLATE_ID;
export const DEFAULT_RUNTIME_MAP_ID = REST_AREA_MAP_TEMPLATE_ID;
const MAP_EDITOR_TILE_OPTIONS: Array<{ id: MapEditorBrush; label: string }> = [
  { id: "ground", label: "地面" },
  { id: "wall", label: "墙壁" }
];

export function MapEditorScene() {
  const initialEditorState = useMemo(() => loadMapEditorState(), []);
  const [tiles, setTiles] = useState<MapEditorTileKind[][]>(() => initialEditorState.tiles);
  const [brush, setBrush] = useState<MapEditorBrush>("ground");
  const [paintMode, setPaintMode] = useState<MapEditorPaintMode>("single");
  const [paintAction, setPaintAction] = useState<MapEditorPaintAction>("fill");
  const [cellSize, setCellSize] = useState(initialEditorState.cellSize);
  const [spawn, setSpawn] = useState<MapEditorCellPoint>(() => initialEditorState.spawn);
  const [colliders, setColliders] = useState<MapEditorTileColliderConfig>(() => initialEditorState.colliders);
  const [zones, setZones] = useState<MapEditorZone[]>(() => initialEditorState.zones);
  const [zoneType, setZoneType] = useState<ProceduralZoneType>("main_room");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [zoneDrafts, setZoneDrafts] = useState<MapEditorZoneDraft[]>([]);
  const [activeZoneDraft, setActiveZoneDraft] = useState<MapEditorZoneDraft | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [spawnPlanTool, setSpawnPlanTool] = useState<MapEditorSpawnPlanTool>("tiles");
  const [editorCamera, setEditorCamera] = useState<MapEditorWorldPoint>(() => mapEditorCellCenter(initialEditorState.spawn.x, initialEditorState.spawn.y, initialEditorState.cellSize));
  const [showMinimap, setShowMinimap] = useState(true);
  const [showGridLines, setShowGridLines] = useState(true);
  const [showCollisionOverlay, setShowCollisionOverlay] = useState(false);
  const [mapDirectory, setMapDirectory] = useState<MapEditorDirectoryHandle | null>(null);
  const [mapFiles, setMapFiles] = useState<string[]>([]);
  const [currentMapFileName, setCurrentMapFileName] = useState(() => loadMapEditorCurrentFileName());
  const [currentMapFileHandle, setCurrentMapFileHandle] = useState<MapEditorFileHandle | null>(null);
  const [dragState, setDragState] = useState<MapEditorDragState | null>(null);
  const [player, setPlayer] = useState(() => mapEditorCellCenter(initialEditorState.spawn.x, initialEditorState.spawn.y, initialEditorState.cellSize));
  const [elapsedMs, setElapsedMs] = useState(0);
  const [saveNotice, setSaveNotice] = useState("自动保存已开启");
  const [undoStack, setUndoStack] = useState<MapEditorSavedState[]>([]);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const keys = useRef(new Set<string>());
  const lastFrame = useRef<number | null>(null);
  const playerVisual = useRef<UnitVisualRuntime>({ direction: "down", movementVector: { x: 0, y: 0 } });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (isMapEditorTypingTarget(target)) return;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "z") {
        event.preventDefault();
        undoLastMapEditorEdit();
        return;
      }
      if (!["w", "a", "s", "d"].includes(key)) return;
      event.preventDefault();
      keys.current.add(key);
    }
    function onKeyUp(event: KeyboardEvent) {
      keys.current.delete(event.key.toLowerCase());
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    saveMapEditorState({ tiles, cellSize, spawn, colliders, zones, width: MAP_EDITOR_COLUMNS, height: MAP_EDITOR_ROWS });
  }, [tiles, cellSize, spawn, colliders, zones]);

  useEffect(() => {
    let cancelled = false;
    loadMapEditorDirectoryHandle().then(async (handle) => {
      if (!handle || cancelled) return;
      setMapDirectory(handle);
      const files = await listMapEditorFiles(handle).catch(() => []);
      if (!cancelled) setMapFiles(files);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentEditorState = useCallback((): MapEditorSavedState => ({
    tiles,
    cellSize,
    spawn,
    colliders,
    zones,
    width: MAP_EDITOR_COLUMNS,
    height: MAP_EDITOR_ROWS
  }), [cellSize, colliders, spawn, tiles, zones]);

  async function selectMapDirectory() {
    const pickerWindow = window as MapEditorWindowWithFilePickers;
    if (!pickerWindow.showDirectoryPicker) {
      setSaveNotice("当前浏览器不支持直接保存本地文件，请使用 Chromium/Edge/Chrome。");
      return null;
    }
    try {
      const handle = await pickerWindow.showDirectoryPicker({ id: "poe-map-editor-maps", mode: "readwrite" });
      await storeMapEditorDirectoryHandle(handle);
      setMapDirectory(handle);
      const files = await refreshMapFileList(handle);
      if (currentMapFileName && !files.includes(currentMapFileName)) {
        setCurrentMapFileName(null);
        setCurrentMapFileHandle(null);
        clearMapEditorCurrentFileName();
      }
      setSaveNotice(`地图目录已设为 ${handle.name}，发现 ${files.length} 个地图文件。`);
      return handle;
    } catch (error) {
      if (!isMapEditorAbortError(error)) setSaveNotice("设置地图目录失败。");
      return null;
    }
  }

  async function ensureMapDirectory() {
    const handle = mapDirectory ?? await selectMapDirectory();
    if (!handle) return null;
    const granted = await requestMapEditorDirectoryWritePermission(handle);
    if (!granted) {
      setSaveNotice("没有地图目录写入权限，保存已取消。");
      return null;
    }
    return handle;
  }

  async function refreshMapFileList(handle = mapDirectory) {
    if (!handle) return [];
    const files = await listMapEditorFiles(handle);
    setMapFiles(files);
    return files;
  }

  async function saveCurrentMapFile() {
    saveMapEditorState(currentEditorState());
    const handle = currentMapFileHandle ? mapDirectory : await ensureMapDirectory();
    if (!handle && !currentMapFileHandle) return null;
    const fileName = currentMapFileName ?? await nextMapEditorFileName(handle as MapEditorDirectoryHandle);
    const fileHandle = currentMapFileHandle ?? await (handle as MapEditorDirectoryHandle).getFileHandle(fileName, { create: true });
    await writeMapEditorFileHandle(fileHandle, fileName, currentEditorState());
    setCurrentMapFileName(fileName);
    setCurrentMapFileHandle(fileHandle);
    saveMapEditorCurrentFileName(fileName);
    if (handle) await refreshMapFileList(handle);
    setSaveNotice(`已保存到 ${fileName} ${new Date().toLocaleTimeString()}`);
    return { directory: handle, fileName };
  }

  async function saveNow() {
    await saveCurrentMapFile();
  }

  async function createNewMap() {
    const saved = await saveCurrentMapFile();
    if (!saved) return;
    const directory = saved.directory ?? await ensureMapDirectory();
    if (!directory) return;
    const nextFileName = await nextMapEditorFileName(directory);
    const nextSpawn = { x: 0, y: 0 };
    pushMapEditorUndo();
    setTiles(createEmptyMapEditorTiles());
    setSpawn(nextSpawn);
    setColliders(createDefaultMapEditorColliders());
    setZones([]);
    setCellSize(MAP_EDITOR_DEFAULT_CELL_SIZE);
    setPlayer(mapEditorCellCenter(nextSpawn.x, nextSpawn.y, MAP_EDITOR_DEFAULT_CELL_SIZE));
    setEditorCamera(mapEditorCellCenter(nextSpawn.x, nextSpawn.y, MAP_EDITOR_DEFAULT_CELL_SIZE));
    setSelectedZoneId(null);
    setZoneDrafts([]);
    setActiveZoneDraft(null);
    setCurrentMapFileName(nextFileName);
    setCurrentMapFileHandle(null);
    saveMapEditorCurrentFileName(nextFileName);
    setSaveNotice(`已新建地图 ${nextFileName}，点击保存会写入该文件。`);
  }

  async function openMapFile(fileName: string) {
    const saved = await saveCurrentMapFile();
    if (!saved || !saved.directory) return;
    try {
      const fileHandle = await saved.directory.getFileHandle(fileName);
      const state = await readMapEditorFile(fileHandle);
      applyLoadedMapEditorState(state, fileName, fileHandle);
      setSaveNotice(`已打开 ${fileName}，之前的地图已自动保存。`);
    } catch {
      setSaveNotice(`打开 ${fileName} 失败。`);
    }
  }

  async function browseMapFile() {
    const saved = await saveCurrentMapFile();
    if (!saved) return;
    const pickerWindow = window as MapEditorWindowWithFilePickers;
    if (!pickerWindow.showOpenFilePicker) {
      setSaveNotice("当前浏览器不支持选择本地地图文件。");
      return;
    }
    try {
      const [fileHandle] = await pickerWindow.showOpenFilePicker({
        id: "poe-map-editor-maps",
        multiple: false,
        startIn: saved.directory ?? undefined,
        types: [{ description: "POE tilemap JSON", accept: { "application/json": [".json"] } }]
      });
      if (!fileHandle) return;
      const state = await readMapEditorFile(fileHandle);
      applyLoadedMapEditorState(state, fileHandle.name, fileHandle);
      setSaveNotice(`已打开 ${fileHandle.name}，之前的地图已自动保存。`);
    } catch (error) {
      if (!isMapEditorAbortError(error)) setSaveNotice("浏览打开地图失败。");
    }
  }

  function applyLoadedMapEditorState(state: MapEditorSavedState, fileName: string, fileHandle: MapEditorFileHandle | null = null) {
    applyMapEditorState(state);
    setPlayer(mapEditorCellCenter(state.spawn.x, state.spawn.y, state.cellSize));
    setEditorCamera(mapEditorCellCenter(state.spawn.x, state.spawn.y, state.cellSize));
    setSelectedZoneId(null);
    setZoneDrafts([]);
    setActiveZoneDraft(null);
    setCurrentMapFileName(fileName);
    setCurrentMapFileHandle(fileHandle);
    saveMapEditorCurrentFileName(fileName);
    saveMapEditorState(state);
  }

  function currentMapEditorState(): MapEditorSavedState {
    return cloneMapEditorState({ tiles, cellSize, spawn, colliders, zones, width: MAP_EDITOR_COLUMNS, height: MAP_EDITOR_ROWS });
  }

  function pushMapEditorUndo() {
    setUndoStack((current) => [...current.slice(-49), currentMapEditorState()]);
  }

  function applyMapEditorState(state: MapEditorSavedState) {
    const snapshot = cloneMapEditorState(state);
    setTiles(snapshot.tiles);
    setCellSize(snapshot.cellSize);
    setSpawn(snapshot.spawn);
    setColliders(snapshot.colliders);
    setZones(snapshot.zones);
  }

  function undoLastMapEditorEdit() {
    const previous = undoStack[undoStack.length - 1];
    if (!previous) return;
    applyMapEditorState(previous);
    setUndoStack((current) => current.slice(0, -1));
    setSelectedZoneId(null);
    setZoneDrafts([]);
    setActiveZoneDraft(null);
    setPlayer(mapEditorCellCenter(previous.spawn.x, previous.spawn.y, previous.cellSize));
    setEditorCamera(mapEditorCellCenter(previous.spawn.x, previous.spawn.y, previous.cellSize));
    setSaveNotice("已撤销上一步操作。");
  }

  useEffect(() => {
    let frame = 0;
    function tick(now: number) {
      if (lastFrame.current === null) lastFrame.current = now;
      const dt = Math.min(0.05, (now - lastFrame.current) / 1000);
      lastFrame.current = now;
      const moveVector = playerInputVector(keys.current);
      const hasMoveInput = Math.hypot(moveVector.x, moveVector.y) > 0.001;
      const projectedMoveVector = projectMovementVectorForAnimation(moveVector);
      playerVisual.current = {
        direction: resolveAnimationDirection(projectedMoveVector, playerVisual.current.direction),
        movementVector: projectedMoveVector
      };
      if (editMode) {
        playerVisual.current = {
          direction: playerVisual.current.direction,
          movementVector: { x: 0, y: 0 }
        };
        if (hasMoveInput) {
          setEditorCamera((current) => clampMapEditorWorldPoint({
            x: current.x + moveVector.x * MAP_EDITOR_CAMERA_PAN_SPEED * dt,
            y: current.y + moveVector.y * MAP_EDITOR_CAMERA_PAN_SPEED * dt
          }, cellSize));
        }
      } else if (hasMoveInput) {
        setPlayer((current) => resolveMapEditorMove(tiles, cellSize, current, moveVector, MAP_EDITOR_PLAYER_SPEED * dt, colliders));
      }
      if (hasMoveInput) setElapsedMs(now);
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [tiles, cellSize, colliders, editMode]);

  const tileCounts = useMemo(() => ({
    ground: countMapEditorTiles(tiles, "ground"),
    wall: countMapEditorTiles(tiles, "wall")
  }), [tiles]);
  const blockedCount = useMemo(() => countMapEditorBlockingTiles(tiles, colliders), [colliders, tiles]);
  const playerGrid = mapEditorWorldToGrid(player, cellSize);
  const cameraGrid = mapEditorWorldToGrid(editMode ? editorCamera : player, cellSize);
  const visibleBounds = useMemo(
    () => mapEditorVisibleBounds(cameraGrid),
    [cameraGrid.x, cameraGrid.y]
  );
  const moving = Math.hypot(playerVisual.current.movementVector.x, playerVisual.current.movementVector.y) > 0.001;
  const playerFrame = resolveUnitAnimation({
    unitId: "player_adventurer",
    requestedState: unitMovementState(moving, MAP_EDITOR_PLAYER_SPEED, moving ? MAP_EDITOR_PLAYER_SPEED : 0),
    movementVector: playerVisual.current.movementVector,
    fallbackDirection: playerVisual.current.direction,
    elapsedMs,
    baseMoveSpeed: MAP_EDITOR_PLAYER_SPEED,
    currentMoveSpeed: moving ? MAP_EDITOR_PLAYER_SPEED : 0
  });

  function changeCellSize(value: number) {
    const nextCellSize = Math.round(clampNumber(value, MAP_EDITOR_MIN_CELL_SIZE, MAP_EDITOR_MAX_CELL_SIZE));
    if (nextCellSize === cellSize) return;
    pushMapEditorUndo();
    setPlayer((current) => ({
      x: (current.x / cellSize) * nextCellSize,
      y: (current.y / cellSize) * nextCellSize
    }));
    setEditorCamera((current) => ({
      x: (current.x / cellSize) * nextCellSize,
      y: (current.y / cellSize) * nextCellSize
    }));
    setCellSize(nextCellSize);
  }

  function updateSelectedTileCollider(field: "enabled", value: boolean): void;
  function updateSelectedTileCollider(field: MapEditorColliderNumericField, value: number): void;
  function updateSelectedTileCollider(field: keyof MapEditorCollider, value: number | boolean) {
    pushMapEditorUndo();
    setColliders((current) => ({
      ...current,
      [brush]: normalizeMapEditorCollider({
        ...current[brush],
        [field]: typeof value === "boolean" ? value : value / 100
      })
    }));
  }

  const applyCells = useCallback((start: MapEditorCellPoint, end: MapEditorCellPoint) => {
    pushMapEditorUndo();
    setTiles((current) => paintMapEditorTiles(current, start, end, paintAction === "clear" ? "empty" : brush));
  }, [brush, paintAction, pushMapEditorUndo]);

  const placeSpawnAtPlayer = useCallback(() => {
    const point = mapEditorWorldToGrid(player, cellSize);
    if (point.x === spawn.x && point.y === spawn.y) return;
    pushMapEditorUndo();
    setSpawn(point);
    setDragState(null);
    setSaveNotice(`出生点已设为角色当前位置 ${point.x}, ${point.y}`);
  }, [cellSize, player, pushMapEditorUndo, spawn.x, spawn.y]);

  const beginPaint = useCallback((event: ReactPointerEvent<HTMLButtonElement>, x: number, y: number) => {
    event.preventDefault();
    event.stopPropagation();
    if (editMode && spawnPlanTool === "zone") {
      const point = { x, y };
      setDragState(null);
      setSelectedZoneId(null);
      setActiveZoneDraft({ zoneType, start: point, current: point });
      return;
    }
    const point = { x, y };
    setDragState({ start: point, current: point });
    if (paintMode === "single") applyCells(point, point);
  }, [applyCells, editMode, spawnPlanTool, paintMode, zoneType]);

  const updatePaint = useCallback((x: number, y: number) => {
    setActiveZoneDraft((current) => current ? { ...current, current: { x, y } } : current);
    setDragState((current) => current ? { ...current, current: { x, y } } : current);
  }, []);

  const finishPaint = useCallback(() => {
    if (activeZoneDraft) {
      setZoneDrafts((current) => [...current, normalizeMapEditorZoneDraft(activeZoneDraft)]);
      setActiveZoneDraft(null);
      setSaveNotice("已加入待确定区域。");
      return;
    }
    if (dragState && paintMode === "rectangle") applyCells(dragState.start, dragState.current);
    setDragState(null);
  }, [activeZoneDraft, applyCells, dragState, paintMode]);

  function setMapEditorEditMode(enabled: boolean) {
    setEditMode(enabled);
    setDragState(null);
    setActiveZoneDraft(null);
    setZoneDrafts([]);
    if (enabled) {
      setEditorCamera(player);
    } else {
      setSpawnPlanTool("tiles");
      setSelectedZoneId(null);
    }
  }

  function confirmZoneDrafts() {
    const pending = activeZoneDraft ? [...zoneDrafts, normalizeMapEditorZoneDraft(activeZoneDraft)] : zoneDrafts;
    if (pending.length === 0) return;
    pushMapEditorUndo();
    const zone = createMapEditorZone(zoneType, pending.map(mapEditorZoneRectFromDraft));
    setZones((current) => [...current, zone]);
    setSelectedZoneId(zone.id);
    setZoneDrafts([]);
    setActiveZoneDraft(null);
    setSaveNotice(`已新增 1 个 ${mapEditorZoneTypeLabel(zoneType)} 区域，包含 ${pending.length} 个框选范围。`);
  }

  function clearZoneDrafts() {
    setZoneDrafts([]);
    setActiveZoneDraft(null);
    setSaveNotice("已清空待确定区域。");
  }

  function updateSelectedZoneType(nextZoneType: ProceduralZoneType) {
    if (!selectedZoneId) return;
    const currentZone = zones.find((zone) => zone.id === selectedZoneId);
    if (!currentZone || currentZone.zoneType === nextZoneType) return;
    pushMapEditorUndo();
    setZones((current) => current.map((zone) => zone.id === selectedZoneId ? { ...zone, zoneType: nextZoneType } : zone));
  }

  function deleteSelectedZone() {
    if (!selectedZoneId) return;
    pushMapEditorUndo();
    setZones((current) => current.filter((zone) => zone.id !== selectedZoneId));
    setSelectedZoneId(null);
    setSaveNotice("已删除区域。");
  }

  function clearAll() {
    const nextSpawn = { x: 0, y: 0 };
    pushMapEditorUndo();
    setTiles(createEmptyMapEditorTiles());
    setSpawn(nextSpawn);
    setColliders(createDefaultMapEditorColliders());
    setZones([]);
    setSelectedZoneId(null);
    setZoneDrafts([]);
    setActiveZoneDraft(null);
    setPlayer(mapEditorCellCenter(nextSpawn.x, nextSpawn.y, cellSize));
    setEditorCamera(mapEditorCellCenter(nextSpawn.x, nextSpawn.y, cellSize));
  }

  function resetSample() {
    pushMapEditorUndo();
    const restored = createDefaultMapEditorState();
    applyMapEditorState(restored);
    setSelectedZoneId(null);
    setZoneDrafts([]);
    setActiveZoneDraft(null);
    setPlayer(mapEditorCellCenter(restored.spawn.x, restored.spawn.y, restored.cellSize));
    setEditorCamera(mapEditorCellCenter(restored.spawn.x, restored.spawn.y, restored.cellSize));
    setCurrentMapFileName("map_001.json");
    setCurrentMapFileHandle(null);
    saveMapEditorCurrentFileName("map_001.json");
    saveMapEditorState(restored);
    setSaveNotice("已从内置 map_001 恢复。");
  }

  function movePlayerToSpawn() {
    setPlayer(mapEditorCellCenter(spawn.x, spawn.y, cellSize));
  }

  function shiftWholeMap(dx: number, dy: number) {
    pushMapEditorUndo();
    setTiles((current) => shiftMapEditorTiles(current, dx, dy));
    setSpawn((current) => shiftMapEditorPoint(current, dx, dy));
    setZones((current) => shiftMapEditorZones(current, dx, dy));
    setPlayer((current) => clampMapEditorWorldPoint({
      x: current.x + dx * cellSize,
      y: current.y + dy * cellSize
    }, cellSize));
    setEditorCamera((current) => clampMapEditorWorldPoint({
      x: current.x + dx * cellSize,
      y: current.y + dy * cellSize
    }, cellSize));
  }

  const selectedTileCollider = colliders[brush];
  const selectedZone = selectedZoneId ? zones.find((zone) => zone.id === selectedZoneId) ?? null : null;

  return (
    <main className="map-editor-screen" data-mode="map-editor" data-no-monsters="true" data-spawnPlan-editor="true">
      <aside className="map-editor-toolbar" aria-label="地图编辑器工具栏">
        <header>
          <h1>Tilemap 地图编辑器</h1>
          <p>独立入口：编辑地形、碰撞、出生点和刷怪区域。</p>
        </header>

        <section>
          <h2>编辑模式</h2>
          <label className="map-editor-checkbox">
            <input
              type="checkbox"
              checked={editMode}
              onChange={(event) => setMapEditorEditMode(event.currentTarget.checked)}
            />
            <span>{editMode ? "编辑模式：WASD 控制视图" : "预览模式：WASD 控制角色"}</span>
          </label>
          <div className="map-editor-segment">
            <button type="button" className={spawnPlanTool === "tiles" ? "active" : ""} onClick={() => setSpawnPlanTool("tiles")}>
              地形
            </button>
            <button type="button" className={spawnPlanTool === "zone" ? "active" : ""} disabled={!editMode} onClick={() => setSpawnPlanTool("zone")}>
              区域
            </button>
          </div>
        </section>

        <section>
          <h2>文件</h2>
          <p>地图目录：{mapDirectory?.name ?? "未设置"}</p>
          <p>当前地图：{currentMapFileName ?? "未命名"}</p>
          <div className="map-editor-actions">
            <button type="button" onClick={() => void selectMapDirectory()}>设置目录</button>
            <button type="button" onClick={() => void saveNow()}>保存地图</button>
            <button type="button" onClick={() => void createNewMap()}>新建地图</button>
            <button type="button" onClick={() => void browseMapFile()}>浏览打开</button>
          </div>
          <div className="map-editor-file-list" aria-label="本地地图文件">
            {mapFiles.length > 0 ? mapFiles.map((fileName) => (
              <button
                key={fileName}
                type="button"
                className={fileName === currentMapFileName ? "active" : ""}
                onClick={() => void openMapFile(fileName)}
              >
                {fileName}
              </button>
            )) : <span>设置目录后显示 map_XXX.json</span>}
          </div>
        </section>

        <section>
          <h2>Tiles</h2>
          <label className="map-editor-select-field">
            <span>目标 Tile</span>
            <select value={brush} onChange={(event) => setBrush(event.currentTarget.value as MapEditorBrush)}>
              {MAP_EDITOR_TILE_OPTIONS.map((tile) => (
                <option key={tile.id} value={tile.id}>{tile.label}</option>
              ))}
            </select>
          </label>
        </section>

        <section>
          <h2>刷怪区域</h2>
          <dl className="map-editor-stats">
            <div><dt>区域数量</dt><dd>{zones.length}</dd></div>
            <div><dt>待确定</dt><dd>{zoneDrafts.length + (activeZoneDraft ? 1 : 0)}</dd></div>
            <div><dt>当前类型</dt><dd>{mapEditorZoneTypeLabel(zoneType)}</dd></div>
            <div><dt>当前工具</dt><dd>{mapEditorSpawnPlanToolLabel(spawnPlanTool)}</dd></div>
          </dl>
          <label className="map-editor-select-field">
            <span>zone_type</span>
            <select value={zoneType} onChange={(event) => setZoneType(event.currentTarget.value as ProceduralZoneType)}>
              {MAP_EDITOR_ZONE_TYPES.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="map-editor-select-field" data-spawnPlan-jump="true">
            <span>选择区域</span>
            <select value={selectedZoneId ?? ""} onChange={(event) => setSelectedZoneId(event.currentTarget.value || null)}>
              <option value="">选择刷怪区域</option>
              {zones.map((zone, index) => (
                <option key={zone.id} value={zone.id}>{index + 1}. {mapEditorZoneTypeLabel(zone.zoneType)}</option>
              ))}
            </select>
          </label>
          <div className="map-editor-actions">
            <button type="button" disabled={zoneDrafts.length + (activeZoneDraft ? 1 : 0) === 0} onClick={confirmZoneDrafts}>确定</button>
            <button type="button" disabled={zoneDrafts.length + (activeZoneDraft ? 1 : 0) === 0} onClick={clearZoneDrafts}>清空待确定</button>
          </div>
          {selectedZone ? (
            <div className="map-editor-spawnPlan-controls" data-selected-spawnPlan="zone">
              <strong>区域 {selectedZone.id}</strong>
              <label>
                <span>zone_type</span>
                <select value={selectedZone.zoneType} onChange={(event) => updateSelectedZoneType(event.currentTarget.value as ProceduralZoneType)}>
                  {MAP_EDITOR_ZONE_TYPES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </label>
              <span>范围：{selectedZone.points.length} 点矩形</span>
              <button type="button" onClick={deleteSelectedZone}>删除区域</button>
            </div>
          ) : (
            <p>进入编辑模式后选择“区域”，可连续框选多个待确定区域，最后点击“确定”。</p>
          )}
        </section>

        <section>
          <h2>碰撞范围</h2>
          <label className="map-editor-checkbox">
            <input
              type="checkbox"
              checked={selectedTileCollider.enabled}
              onChange={(event) => updateSelectedTileCollider("enabled", event.currentTarget.checked)}
            />
            <span>{mapEditorTileLabel(brush)} 阻挡</span>
          </label>
          <div className="map-editor-collider-grid">
            {(["x", "y", "width", "height"] as MapEditorColliderNumericField[]).map((field) => (
              <label key={field}>
                <span>{mapEditorColliderFieldLabel(field)}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={mapEditorColliderPercent(selectedTileCollider[field])}
                  onChange={(event) => updateSelectedTileCollider(field, Number(event.currentTarget.value))}
                />
              </label>
            ))}
          </div>
        </section>

        <section>
          <h2>绘制</h2>
          <div className="map-editor-segment">
            <button type="button" className={paintAction === "fill" ? "active" : ""} onClick={() => setPaintAction("fill")}>
              填充
            </button>
            <button type="button" className={paintAction === "clear" ? "active" : ""} onClick={() => setPaintAction("clear")}>
              清除
            </button>
          </div>
          <div className="map-editor-segment">
            <button type="button" className={paintMode === "single" ? "active" : ""} onClick={() => setPaintMode("single")}>
              单格
            </button>
            <button type="button" className={paintMode === "rectangle" ? "active" : ""} onClick={() => setPaintMode("rectangle")}>
              框选
            </button>
          </div>
        </section>

        <section>
          <h2>单位大小</h2>
          <label className="map-editor-cell-size">
            <input
              type="range"
              min={MAP_EDITOR_MIN_CELL_SIZE}
              max={MAP_EDITOR_MAX_CELL_SIZE}
              step="4"
              value={cellSize}
              onChange={(event) => changeCellSize(Number(event.currentTarget.value))}
            />
            <span>{cellSize}px / cell</span>
          </label>
        </section>

        <section>
          <h2>视图</h2>
          <div className="map-editor-segment">
            <button type="button" className={showMinimap ? "active" : ""} onClick={() => setShowMinimap((current) => !current)}>
              {showMinimap ? "隐藏小地图" : "显示小地图"}
            </button>
            <button type="button" className={showCollisionOverlay ? "active" : ""} onClick={() => setShowCollisionOverlay((current) => !current)}>
              {showCollisionOverlay ? "隐藏碰撞" : "显示碰撞"}
            </button>
          </div>
        </section>

        <section>
          <h2>玩家出生点</h2>
          <div className="map-editor-segment">
            <button type="button" onClick={placeSpawnAtPlayer}>
              放置出生点
            </button>
            <button type="button" onClick={movePlayerToSpawn}>
              回到出生点
            </button>
          </div>
        </section>

        <section>
          <h2>整体移动</h2>
          <div className="map-editor-shift-controls" aria-label="地图整体移动">
            <span />
            <button type="button" onClick={() => shiftWholeMap(0, -1)} aria-label="整体上移一格">上移</button>
            <span />
            <button type="button" onClick={() => shiftWholeMap(-1, 0)} aria-label="整体左移一格">左移</button>
            <button type="button" onClick={() => shiftWholeMap(0, 1)} aria-label="整体下移一格">下移</button>
            <button type="button" onClick={() => shiftWholeMap(1, 0)} aria-label="整体右移一格">右移</button>
          </div>
        </section>

        <section>
          <h2>派生层</h2>
          <dl className="map-editor-stats">
            <div><dt>地图范围</dt><dd>{MAP_EDITOR_COLUMNS} x {MAP_EDITOR_ROWS}</dd></div>
            <div><dt>可行走</dt><dd>{tileCounts.ground}</dd></div>
            <div><dt>阻挡/虚空</dt><dd>{blockedCount}</dd></div>
            <div><dt>墙壁</dt><dd>{tileCounts.wall}</dd></div>
            <div><dt>角色格</dt><dd>{playerGrid.x}, {playerGrid.y}</dd></div>
            <div><dt>视图格</dt><dd>{cameraGrid.x}, {cameraGrid.y}</dd></div>
            <div><dt>出生点</dt><dd>{spawn.x}, {spawn.y}</dd></div>
          </dl>
        </section>

        <section>
          <h2>场景</h2>
          <p>草稿仍会自动备份到浏览器本地；正式保存会写入地图 JSON 文件。</p>
          <div className="map-editor-actions">
            <button type="button" onClick={undoLastMapEditorEdit} disabled={undoStack.length === 0}>撤销</button>
            <button type="button" onClick={resetSample}>恢复 map_001</button>
            <button type="button" onClick={clearAll}>清空</button>
          </div>
          <p>{saveNotice}</p>
        </section>
      </aside>

      <section
        className="map-editor-stage"
        aria-label="tilemap 编辑场景"
      >
        <div
          ref={gridRef}
          className="map-editor-grid"
          style={{
            width: MAP_EDITOR_COLUMNS * cellSize,
            height: MAP_EDITOR_ROWS * cellSize,
            gridTemplateColumns: `repeat(${MAP_EDITOR_COLUMNS}, ${cellSize}px)`,
            transform: mapEditorCameraTransform(editMode ? editorCamera : player),
            ["--map-editor-cell-size" as string]: `${cellSize}px`
          } as CSSProperties}
        >
          <MapEditorTileCells
            tiles={tiles}
            cellSize={cellSize}
            dragState={dragState}
            visibleBounds={visibleBounds}
            onBeginPaint={beginPaint}
            onUpdatePaint={updatePaint}
            onFinishPaint={finishPaint}
          />
          <span
            className="map-editor-spawn-marker"
            style={mapEditorSpawnMarkerStyle(spawn, cellSize)}
            title={`玩家出生点 x:${spawn.x} y:${spawn.y}`}
          />
          <MapEditorZoneOverlay
            zones={zones}
            drafts={activeZoneDraft ? [...zoneDrafts, activeZoneDraft] : zoneDrafts}
            cellSize={cellSize}
            selectedZoneId={selectedZoneId}
            onSelect={setSelectedZoneId}
          />
          {showGridLines ? (
            <div
              className="map-editor-grid-line-overlay"
              style={{ backgroundSize: `${cellSize}px ${cellSize}px` }}
              aria-hidden="true"
            />
          ) : null}
          {showCollisionOverlay ? (
            <MapEditorCollisionOverlay
              tiles={tiles}
              cellSize={cellSize}
              colliders={colliders}
              player={player}
              visibleBounds={visibleBounds}
            />
          ) : null}
          <div
            className="map-editor-player player unit-visual unit-visual-player"
            style={mapEditorPlayerStyle(player, playerFrame)}
            data-animation-state={playerFrame.animation.state}
            data-animation-direction={playerFrame.animation.direction}
            aria-label="可移动角色大小参照物"
          >
            <UnitAnimationSprite frame={playerFrame} />
          </div>
        </div>
        {showMinimap ? (
          <MapEditorMinimap
            tiles={tiles}
            playerGrid={playerGrid}
            spawn={spawn}
            visibleBounds={visibleBounds}
            showGridLines={showGridLines}
            onToggleGridLines={() => setShowGridLines((current) => !current)}
            onClose={() => setShowMinimap(false)}
          />
        ) : null}
      </section>

    </main>
  );
}

export function MapEditorMinimap({
  tiles,
  playerGrid,
  spawn,
  visibleBounds,
  showGridLines,
  onToggleGridLines,
  onClose
}: {
  tiles: MapEditorTileKind[][];
  playerGrid: MapEditorCellPoint;
  spawn: MapEditorCellPoint;
  visibleBounds: MapEditorVisibleBounds;
  showGridLines: boolean;
  onToggleGridLines: () => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const image = context.createImageData(MAP_EDITOR_COLUMNS, MAP_EDITOR_ROWS);
    for (let y = 0; y < MAP_EDITOR_ROWS; y += 1) {
      for (let x = 0; x < MAP_EDITOR_COLUMNS; x += 1) {
        const offset = (y * MAP_EDITOR_COLUMNS + x) * 4;
        const tile = tiles[y]?.[x] ?? "empty";
        const color = mapEditorMinimapTileColor(tile);
        image.data[offset] = color.r;
        image.data[offset + 1] = color.g;
        image.data[offset + 2] = color.b;
        image.data[offset + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
  }, [tiles]);

  return (
    <aside className="map-editor-minimap" aria-label="小地图">
      <div className="map-editor-minimap-header">
        <strong>小地图</strong>
        <div className="map-editor-minimap-actions">
          <button
            type="button"
            className={showGridLines ? "active" : ""}
            onClick={onToggleGridLines}
            aria-pressed={showGridLines}
            aria-label="切换地图格子线框"
          >
            {showGridLines ? "隐藏线框" : "显示线框"}
          </button>
          <button type="button" onClick={onClose} aria-label="关闭小地图">关闭</button>
        </div>
      </div>
      <div className="map-editor-minimap-body">
        <canvas
          ref={canvasRef}
          width={MAP_EDITOR_COLUMNS}
          height={MAP_EDITOR_ROWS}
          style={{ width: MAP_EDITOR_MINIMAP_WIDTH, height: MAP_EDITOR_MINIMAP_HEIGHT }}
        />
        <span className="map-editor-minimap-viewport" style={mapEditorMinimapBoundsStyle(visibleBounds)} />
        <span className="map-editor-minimap-spawn" style={mapEditorMinimapPointStyle(spawn)} />
        <span className="map-editor-minimap-player" style={mapEditorMinimapPointStyle(playerGrid)} />
      </div>
    </aside>
  );
}

export const MapEditorCollisionOverlay = memo(function MapEditorCollisionOverlay({
  tiles,
  cellSize,
  colliders,
  player,
  visibleBounds
}: {
  tiles: MapEditorTileKind[][];
  cellSize: number;
  colliders: MapEditorTileColliderConfig;
  player: { x: number; y: number };
  visibleBounds: MapEditorVisibleBounds;
}) {
  const nodes: ReactNode[] = [];
  for (let y = visibleBounds.minY; y <= visibleBounds.maxY; y += 1) {
    for (let x = visibleBounds.minX; x <= visibleBounds.maxX; x += 1) {
      const tile = tiles[y]?.[x] ?? "empty";
      const collider = mapEditorColliderForTile(tile, colliders);
      if (!collider.enabled || collider.width <= 0 || collider.height <= 0) continue;
      nodes.push(
        <span
          key={`${x}-${y}`}
          className={`map-editor-collider-box map-editor-collider-${tile}`}
          style={mapEditorTileColliderStyle(x, y, collider, cellSize)}
        />
      );
    }
  }
  nodes.push(
    <span
      key="player"
      className="map-editor-collider-box map-editor-collider-player"
      style={mapEditorWorldColliderStyle(mapEditorPlayerColliderWorld(player, cellSize))}
    />
  );
  return <div className="map-editor-collision-layer" aria-label="碰撞体范围">{nodes}</div>;
});

export const MapEditorZoneOverlay = memo(function MapEditorZoneOverlay({
  zones,
  drafts,
  cellSize,
  selectedZoneId,
  onSelect
}: {
  zones: MapEditorZone[];
  drafts: MapEditorZoneDraft[];
  cellSize: number;
  selectedZoneId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="map-editor-zone-layer" aria-label="刷怪区域">
      {zones.map((zone) => (
        mapEditorZoneRects(zone).map((rect, rectIndex, rects) => (
          <button
            key={`${zone.id}-${rectIndex}`}
            type="button"
            className={`map-editor-zone map-editor-zone-${zone.zoneType} ${selectedZoneId === zone.id ? "selected" : ""}`}
            style={mapEditorZoneRectStyle(rect, cellSize, rects)}
            data-zone-type={zone.zoneType}
            title={`${mapEditorZoneTypeLabel(zone.zoneType)} / 区域 ${zone.id}`}
            onPointerDown={(event) => {
              event.stopPropagation();
              onSelect(zone.id);
            }}
          >
            {rectIndex === 0 ? <span>{mapEditorZoneTypeLabel(zone.zoneType)}</span> : null}
          </button>
        ))
      ))}
      {drafts.map((draft, index) => (
        <div
          key={`draft-${index}`}
          className={`map-editor-zone map-editor-zone-draft map-editor-zone-${draft.zoneType}`}
          style={mapEditorZoneRectStyle(mapEditorZoneRectFromDraft(draft), cellSize, drafts.map(mapEditorZoneRectFromDraft))}
          data-zone-type={draft.zoneType}
        >
          <span>待确定 {index + 1}</span>
        </div>
      ))}
    </div>
  );
});

export const MapEditorTileCells = memo(function MapEditorTileCells({
  tiles,
  cellSize,
  dragState,
  visibleBounds,
  onBeginPaint,
  onUpdatePaint,
  onFinishPaint
}: {
  tiles: MapEditorTileKind[][];
  cellSize: number;
  dragState: MapEditorDragState | null;
  visibleBounds: MapEditorVisibleBounds;
  onBeginPaint: (event: ReactPointerEvent<HTMLButtonElement>, x: number, y: number) => void;
  onUpdatePaint: (x: number, y: number) => void;
  onFinishPaint: () => void;
}) {
  const selection = dragState ? mapEditorSelectionSet(dragState.start, dragState.current) : null;
  const cells: ReactNode[] = [];
  for (let y = visibleBounds.minY; y <= visibleBounds.maxY; y += 1) {
    for (let x = visibleBounds.minX; x <= visibleBounds.maxX; x += 1) {
      const tile = tiles[y]?.[x] ?? "empty";
      const selected = selection?.has(mapEditorPointKey(x, y)) ?? false;
      const autotile = mapEditorAutotileState(tiles, x, y, tile);
      const connectionClass = mapEditorTileConnectionClass(tiles, x, y, tile, autotile);
      cells.push(
        <button
          key={`${x}-${y}`}
          type="button"
          className={`map-editor-cell map-editor-tile-${tile} ${connectionClass} ${selected ? "map-editor-cell-selected" : ""}`}
          data-autotile-role={autotile.role}
          data-autotile-same={mapEditorAutotileSideValue(autotile.sameSides)}
          data-autotile-edge={mapEditorAutotileSideValue(autotile.edgeSides)}
          data-autotile-boundary={mapEditorAutotileSideValue(autotile.boundarySides)}
          data-autotile-inner-corner={mapEditorAutotileCornerValue(autotile.innerCorners)}
          data-autotile-outer-corner={mapEditorAutotileCornerValue(autotile.outerCorners)}
          title={`x:${x} y:${y} ${mapEditorTileLabel(tile)}`}
          style={{
            left: x * cellSize,
            top: y * cellSize,
            backgroundPosition: `${-x * cellSize}px ${-y * cellSize}px`,
            backgroundSize: `${cellSize * 4}px ${cellSize * 4}px`
          }}
          onPointerDown={(event) => onBeginPaint(event, x, y)}
          onPointerEnter={() => onUpdatePaint(x, y)}
          onPointerUp={onFinishPaint}
        />
      );
    }
  }
  return <>{cells}</>;
});

function isMapEditorTypingTarget(target: HTMLElement | null) {
  if (!target) return false;
  if (target.tagName === "TEXTAREA" || target.tagName === "SELECT") return true;
  if (target instanceof HTMLInputElement) return target.type !== "range";
  return false;
}

function loadMapEditorState(): MapEditorSavedState {
  if (typeof window === "undefined") {
    return createDefaultMapEditorState();
  }
  try {
    const raw = window.localStorage.getItem(MAP_EDITOR_STORAGE_KEY);
    if (!raw) return createDefaultMapEditorState();
    const parsed = JSON.parse(raw) as Partial<MapEditorSavedState>;
    const sourceSize = mapEditorTileSourceSize(parsed.tiles);
    const expansionOffset = mapEditorExpansionOffset(sourceSize.width, sourceSize.height);
    return {
      tiles: normalizeMapEditorTiles(parsed.tiles),
      cellSize: Math.round(clampNumber(Number(parsed.cellSize ?? MAP_EDITOR_DEFAULT_CELL_SIZE), MAP_EDITOR_MIN_CELL_SIZE, MAP_EDITOR_MAX_CELL_SIZE)),
      spawn: normalizeMapEditorSpawn(parsed.spawn, expansionOffset),
      colliders: normalizeMapEditorColliders(parsed.colliders),
      zones: normalizeMapEditorZones(parsed.zones, expansionOffset),
      width: MAP_EDITOR_COLUMNS,
      height: MAP_EDITOR_ROWS
    };
  } catch {
    return createDefaultMapEditorState();
  }
}

function saveMapEditorState(state: MapEditorSavedState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MAP_EDITOR_STORAGE_KEY, JSON.stringify({
    tiles: normalizeMapEditorTiles(state.tiles),
    cellSize: Math.round(clampNumber(state.cellSize, MAP_EDITOR_MIN_CELL_SIZE, MAP_EDITOR_MAX_CELL_SIZE)),
    spawn: clampMapEditorPoint(state.spawn),
    colliders: normalizeMapEditorColliders(state.colliders),
    zones: normalizeMapEditorZones(state.zones),
    width: MAP_EDITOR_COLUMNS,
    height: MAP_EDITOR_ROWS
  }));
}

function loadMapEditorCurrentFileName() {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(MAP_EDITOR_CURRENT_FILE_STORAGE_KEY);
  return value && value.endsWith(".json") ? value : null;
}

function saveMapEditorCurrentFileName(fileName: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MAP_EDITOR_CURRENT_FILE_STORAGE_KEY, fileName);
}

function clearMapEditorCurrentFileName() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(MAP_EDITOR_CURRENT_FILE_STORAGE_KEY);
}

async function requestMapEditorDirectoryWritePermission(handle: MapEditorDirectoryHandle) {
  const descriptor = { mode: "readwrite" as const };
  if (handle.queryPermission && await handle.queryPermission(descriptor) === "granted") return true;
  if (!handle.requestPermission) return true;
  return await handle.requestPermission(descriptor) === "granted";
}

async function listMapEditorFiles(handle: MapEditorDirectoryHandle) {
  const files: string[] = [];
  for await (const entry of handle.values()) {
    if (entry.kind === "file" && entry.name.toLowerCase().endsWith(".json")) files.push(entry.name);
  }
  return files.sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

async function nextMapEditorFileName(handle: MapEditorDirectoryHandle) {
  const files = await listMapEditorFiles(handle).catch(() => []);
  const maxIndex = files.reduce((max, fileName) => {
    const match = /^map_(\d+)\.json$/i.exec(fileName);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `map_${String(maxIndex + 1).padStart(3, "0")}.json`;
}

async function writeMapEditorFile(handle: MapEditorDirectoryHandle, fileName: string, state: MapEditorSavedState) {
  const fileHandle = await handle.getFileHandle(fileName, { create: true });
  await writeMapEditorFileHandle(fileHandle, fileName, state);
}

async function writeMapEditorFileHandle(fileHandle: MapEditorFileHandle, fileName: string, state: MapEditorSavedState) {
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(createMapEditorFileDocument(fileName, state), null, 2));
  await writable.close();
}

async function readMapEditorFile(fileHandle: MapEditorFileHandle): Promise<MapEditorSavedState> {
  const file = await fileHandle.getFile();
  const parsed = JSON.parse(await file.text()) as Partial<MapEditorFileDocument>;
  return normalizeMapEditorFileDocument(parsed);
}

function normalizeMapEditorFileDocument(parsed: Partial<MapEditorFileDocument>): MapEditorSavedState {
  return {
    tiles: normalizeMapEditorTiles(parsed.tiles),
    cellSize: Math.round(clampNumber(Number(parsed.cellSize ?? MAP_EDITOR_DEFAULT_CELL_SIZE), MAP_EDITOR_MIN_CELL_SIZE, MAP_EDITOR_MAX_CELL_SIZE)),
    spawn: normalizeMapEditorSpawn(parsed.spawn),
    colliders: normalizeMapEditorColliders(parsed.colliders),
    zones: normalizeMapEditorZones(parsed.zones),
    width: MAP_EDITOR_COLUMNS,
    height: MAP_EDITOR_ROWS
  };
}

function createMapEditorFileDocument(fileName: string, state: MapEditorSavedState): MapEditorFileDocument {
  return {
    format: "poe.tilemap.editor",
    version: 1,
    name: fileName.replace(/\.json$/i, ""),
    savedAt: new Date().toISOString(),
    tiles: normalizeMapEditorTiles(state.tiles),
    cellSize: Math.round(clampNumber(state.cellSize, MAP_EDITOR_MIN_CELL_SIZE, MAP_EDITOR_MAX_CELL_SIZE)),
    spawn: clampMapEditorPoint(state.spawn),
    colliders: normalizeMapEditorColliders(state.colliders),
    zones: normalizeMapEditorZones(state.zones),
    width: MAP_EDITOR_COLUMNS,
    height: MAP_EDITOR_ROWS
  };
}

function isMapEditorAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

async function loadMapEditorDirectoryHandle() {
  if (typeof indexedDB === "undefined") return null;
  try {
    const db = await openMapEditorHandleDatabase();
    const transaction = db.transaction(MAP_EDITOR_HANDLE_STORE_NAME, "readonly");
    const request = transaction.objectStore(MAP_EDITOR_HANDLE_STORE_NAME).get(MAP_EDITOR_DIRECTORY_HANDLE_KEY);
    const handle = await mapEditorIdbRequest<unknown>(request);
    db.close();
    return isMapEditorDirectoryHandle(handle) ? handle : null;
  } catch {
    return null;
  }
}

async function storeMapEditorDirectoryHandle(handle: MapEditorDirectoryHandle) {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await openMapEditorHandleDatabase();
    const transaction = db.transaction(MAP_EDITOR_HANDLE_STORE_NAME, "readwrite");
    await mapEditorIdbRequest(transaction.objectStore(MAP_EDITOR_HANDLE_STORE_NAME).put(handle, MAP_EDITOR_DIRECTORY_HANDLE_KEY));
    db.close();
  } catch {
    // Directory handles are an enhancement; saving still works for the current session without persistence.
  }
}

function openMapEditorHandleDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(MAP_EDITOR_HANDLE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MAP_EDITOR_HANDLE_STORE_NAME)) db.createObjectStore(MAP_EDITOR_HANDLE_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function mapEditorIdbRequest<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function isMapEditorDirectoryHandle(value: unknown): value is MapEditorDirectoryHandle {
  return Boolean(value && typeof value === "object" && (value as Partial<MapEditorDirectoryHandle>).kind === "directory");
}

function normalizeMapEditorTiles(value: unknown): MapEditorTileKind[][] {
  if (!Array.isArray(value)) return createDefaultMapEditorTiles();
  const sourceSize = mapEditorTileSourceSize(value);
  const offset = mapEditorExpansionOffset(sourceSize.width, sourceSize.height);
  const next = createEmptyMapEditorTiles();
  for (let sourceY = 0; sourceY < sourceSize.height; sourceY += 1) {
    const row = (value as unknown[][])[sourceY];
    if (!Array.isArray(row)) continue;
    for (let sourceX = 0; sourceX < sourceSize.width; sourceX += 1) {
      const tile = row[sourceX];
      if (tile !== "ground" && tile !== "wall" && tile !== "empty") continue;
      const targetX = sourceX + offset.x;
      const targetY = sourceY + offset.y;
      if (targetX < 0 || targetX >= MAP_EDITOR_COLUMNS || targetY < 0 || targetY >= MAP_EDITOR_ROWS) continue;
      next[targetY][targetX] = tile;
    }
  }
  return next;
}

function createDefaultMapEditorColliders(): MapEditorTileColliderConfig {
  return {
    empty: { enabled: true, x: 0, y: 0, width: 1, height: 1 },
    ground: { enabled: false, x: 0, y: 0, width: 1, height: 1 },
    wall: { enabled: true, x: 0, y: 0, width: 1, height: 1 }
  };
}

function normalizeMapEditorColliders(value: unknown): MapEditorTileColliderConfig {
  const defaults = createDefaultMapEditorColliders();
  if (!value || typeof value !== "object") return defaults;
  const source = value as Partial<Record<MapEditorTileKind, Partial<MapEditorCollider>>>;
  return {
    empty: normalizeMapEditorCollider({ ...defaults.empty, ...source.empty }),
    ground: normalizeMapEditorCollider({ ...defaults.ground, ...source.ground }),
    wall: normalizeMapEditorCollider({ ...defaults.wall, ...source.wall })
  };
}

function normalizeMapEditorZones(value: unknown, offset: MapEditorCellPoint = { x: 0, y: 0 }): MapEditorZone[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeMapEditorZone(item, offset)).filter((zone): zone is MapEditorZone => Boolean(zone));
}

function normalizeMapEditorZone(value: unknown, offset: MapEditorCellPoint = { x: 0, y: 0 }): MapEditorZone | null {
  const source = value && typeof value === "object" ? value as Partial<MapEditorZone> : {};
  const rects = normalizeMapEditorZoneRects(source, offset);
  if (rects.length === 0) return null;
  return {
    id: safeMapEditorId(source.id, "zone"),
    zoneType: normalizeMapEditorZoneType(source.zoneType),
    shape: "rectangle",
    points: rects.flatMap((rect) => [rect.start, rect.end]),
    rects
  };
}

function normalizeMapEditorZoneRects(source: Partial<MapEditorZone>, offset: MapEditorCellPoint): MapEditorZoneRect[] {
  if (Array.isArray(source.rects)) {
    return source.rects
      .map((rect) => normalizeMapEditorZoneRect(rect, offset))
      .filter((rect): rect is MapEditorZoneRect => Boolean(rect));
  }
  const points = Array.isArray(source.points)
    ? source.points.map((point) => normalizeMapEditorZonePoint(point, offset)).filter((point): point is MapEditorCellPoint => Boolean(point))
    : [];
  const rects: MapEditorZoneRect[] = [];
  for (let index = 0; index + 1 < points.length; index += 2) {
    rects.push({ start: points[index], end: points[index + 1] });
  }
  return rects;
}

function normalizeMapEditorZoneRect(value: unknown, offset: MapEditorCellPoint): MapEditorZoneRect | null {
  if (!value || typeof value !== "object") return null;
  const rect = value as Partial<MapEditorZoneRect>;
  const start = normalizeMapEditorZonePoint(rect.start, offset);
  const end = normalizeMapEditorZonePoint(rect.end, offset);
  return start && end ? { start, end } : null;
}

function normalizeMapEditorZonePoint(value: unknown, offset: MapEditorCellPoint): MapEditorCellPoint | null {
  if (!value || typeof value !== "object") return null;
  const point = value as Partial<MapEditorCellPoint>;
  const x = Number(point.x);
  const y = Number(point.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return clampMapEditorPoint({ x: Math.round(x) + offset.x, y: Math.round(y) + offset.y });
}

function normalizeMapEditorZoneType(value: unknown): ProceduralZoneType {
  return MAP_EDITOR_ZONE_TYPES.some((option) => option.id === value) ? value as ProceduralZoneType : "main_room";
}

function normalizeMapEditorZoneDraft(draft: MapEditorZoneDraft): MapEditorZoneDraft {
  return {
    zoneType: draft.zoneType,
    start: clampMapEditorPoint(draft.start),
    current: clampMapEditorPoint(draft.current)
  };
}

function mapEditorZoneRectFromDraft(draft: MapEditorZoneDraft): MapEditorZoneRect {
  return {
    start: clampMapEditorPoint(draft.start),
    end: clampMapEditorPoint(draft.current)
  };
}

function safeMapEditorId(value: unknown, prefix: string) {
  return typeof value === "string" && /^[a-z0-9_-]+$/i.test(value)
    ? value
    : `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function runtimeBattleMapOptions(): RuntimeBattleMapOption[] {
  return AUTHORED_MAP_TEMPLATES.map((template) => {
    const editorMap = template.document as unknown as MapEditorFileDocument;
    const gridSize = editorRuntimeGridSize(editorMap);
    return {
      id: template.id,
      displayName: editorMap.name || template.id,
      biome: "map editor",
      worldWidth: (editorMap.width || MAP_EDITOR_COLUMNS) * gridSize,
      worldHeight: (editorMap.height || MAP_EDITOR_ROWS) * gridSize
    };
  });
}

export type EditorRuntimeBattleMapOptions = {
  templateId?: string;
  instance?: MapInstanceMetadata;
  rotation?: MapInstanceRotation;
  playerSpawnRegionIndex?: number;
};

export function createEditorRuntimeBattleMap(source: MapEditorFileDocument, options: EditorRuntimeBattleMapOptions = {}): EditorRuntimeBattleMapData {
  const baseTiles = normalizeMapEditorTiles(source.tiles);
  const colliders = normalizeMapEditorColliders(source.colliders);
  const baseZones = normalizeMapEditorZones(source.zones);
  const sourceGridWidth = source.width || MAP_EDITOR_COLUMNS;
  const sourceGridHeight = source.height || MAP_EDITOR_ROWS;
  const gridSize = editorRuntimeGridSize(source);
  const rotation = options.rotation ?? options.instance?.rotation ?? 0;
  const tiles = rotateGrid(baseTiles, rotation);
  const rotatedSize = rotatedGridSize(sourceGridWidth, sourceGridHeight, rotation);
  const gridWidth = rotatedSize.width;
  const gridHeight = rotatedSize.height;
  const zones = rotateMapEditorZones(baseZones, sourceGridWidth, sourceGridHeight, rotation);
  const worldWidth = gridWidth * gridSize;
  const worldHeight = gridHeight * gridSize;
  const walkableGrid = Array.from({ length: gridHeight }, () => Array.from({ length: gridWidth }, () => false));
  const blockerGrid = Array.from({ length: gridHeight }, () => Array.from({ length: gridWidth }, () => true));
  const walkablePoints: MapPoint[] = [];
  for (let gridY = 0; gridY < gridHeight; gridY += 1) {
    for (let gridX = 0; gridX < gridWidth; gridX += 1) {
      const tile = tiles[gridY]?.[gridX] ?? "empty";
      const blocked = mapEditorRuntimeTileBlocks(tile, colliders);
      walkableGrid[gridY][gridX] = !blocked;
      blockerGrid[gridY][gridX] = blocked;
      if (!blocked) walkablePoints.push(editorRuntimeMapPoint(gridX, gridY, gridSize));
    }
  }

  const meta = {
    id: options.templateId ?? options.instance?.templateId ?? EDITOR_RUNTIME_MAP_ID,
    biome: "map editor",
    display_name: source.name || options.templateId || "map_001",
    background: "map_001.json",
    walkable_mask: "map_001.json tiles",
    blocker_mask: "map_001.json colliders",
    spawn_mask: "map_001.json zones",
    pixel_width: worldWidth,
    pixel_height: worldHeight,
    world_width: worldWidth,
    world_height: worldHeight,
    grid_size: gridSize,
    player_spawn_policy: "map_001.json spawn",
    enemy_spawn_policy: "map_001.json zones",
    elite_spawn_policy: "map_001.json zones",
    boss_spawn_policy: "map_001.json boss_room zones",
    exit_policy: "map_001.json exit_area zones",
    collision_source: "map_001.json colliders",
    navigation_source: "map_001.json tiles"
  };
  const spawnCandidates = mapEditorPlayerSpawnCandidates(source, baseZones);
  const spawnIndex = options.playerSpawnRegionIndex ?? chooseIndex(spawnCandidates.length, `${options.instance?.instanceSeed ?? "default"}:player-spawn`);
  const spawnCandidate = spawnCandidates[Math.max(0, spawnIndex)] ?? { id: "spawn", point: source.spawn ?? MAP_EDITOR_DEFAULT_SPAWN };
  const mapInstance = options.instance
    ? { ...options.instance, playerSpawnSource: spawnCandidate.id }
    : undefined;
  const requestedSpawn = rotateMapEditorCellPoint(spawnCandidate.point, sourceGridWidth, sourceGridHeight, rotation);
  const playerSpawn = nearestEditorRuntimeWalkablePoint(
    editorRuntimeMapPoint(Math.floor(requestedSpawn.x), Math.floor(requestedSpawn.y), gridSize),
    walkablePoints
  );
  const zoneCenters = zones.map((zone) => mapEditorZoneCenter(zone));
  const enemySpawnPoints = zoneCenters.map((point) => editorRuntimeCoordinatePoint(point.x, point.y, gridSize));
  const bossPoints = zones
    .filter((zone) => zone.zoneType === "boss_room")
    .map((zone) => mapEditorZoneCenter(zone))
    .map((point) => editorRuntimeCoordinatePoint(point.x, point.y, gridSize));

  return {
    id: meta.id,
    displayName: source.name || meta.id,
    backgroundUrl: "",
    meta,
    gridWidth,
    gridHeight,
    walkableGrid,
    blockerGrid,
    walkablePoints,
    playerSpawn,
    enemySpawnPoints,
    eliteSpawnPoints: [],
    bossPoints,
    exitPoints: [],
    interactionPoints: [],
    debugWarnings: playerSpawn.gridX !== Math.floor(requestedSpawn.x) || playerSpawn.gridY !== Math.floor(requestedSpawn.y)
      ? [`Player spawn source ${spawnCandidate.id} moved to nearest walkable point.`]
      : [],
    editorTiles: tiles,
    editorZones: zones,
    mapInstance
  };
}

function rotateMapEditorZones(zones: MapEditorZone[], width: number, height: number, rotation: MapInstanceRotation) {
  return zones.map((zone) => ({
    ...zone,
    points: zone.points.map((point) => rotateMapEditorCellPoint(point, width, height, rotation)),
    rects: zone.rects?.map((rect) => ({
      start: rotateMapEditorCellPoint(rect.start, width, height, rotation),
      end: rotateMapEditorCellPoint(rect.end, width, height, rotation)
    }))
  }));
}

function rotateMapEditorCellPoint(point: MapEditorCellPoint, width: number, height: number, rotation: MapInstanceRotation): MapEditorCellPoint {
  return rotateCellPoint(point, width, height, rotation);
}

function mapEditorPlayerSpawnCandidates(source: MapEditorFileDocument, zones: MapEditorZone[]) {
  const entranceRegions = zones
    .filter((zone) => zone.zoneType === "entrance")
    .map((zone) => ({ id: zone.id, point: mapEditorZoneCenter(zone) }));
  if (entranceRegions.length > 0) return entranceRegions;
  return [{ id: "spawn", point: source.spawn ?? MAP_EDITOR_DEFAULT_SPAWN }];
}

function editorRuntimeGridSize(source: Partial<MapEditorSavedState>) {
  return Number.isFinite(source.cellSize) && Number(source.cellSize) > 0
    ? Number(source.cellSize)
    : MAP_EDITOR_DEFAULT_CELL_SIZE;
}

function mapEditorRuntimeTileBlocks(tile: MapEditorTileKind, colliders: MapEditorTileColliderConfig) {
  const collider = mapEditorColliderForTile(tile, colliders);
  return collider.enabled && collider.width > 0 && collider.height > 0;
}

function editorRuntimeMapPoint(gridX: number, gridY: number, gridSize: number): MapPoint {
  return {
    x: gridX * gridSize + gridSize / 2,
    y: gridY * gridSize + gridSize / 2,
    gridX,
    gridY
  };
}

export function editorRuntimeCoordinatePoint(x: number, y: number, gridSize: number, gridWidth = MAP_EDITOR_COLUMNS, gridHeight = MAP_EDITOR_ROWS): MapPoint {
  return {
    x: clamp(x * gridSize, 0, gridWidth * gridSize - 1),
    y: clamp(y * gridSize, 0, gridHeight * gridSize - 1),
    gridX: clamp(Math.floor(x), 0, gridWidth - 1),
    gridY: clamp(Math.floor(y), 0, gridHeight - 1)
  };
}

function nearestEditorRuntimeWalkablePoint(point: MapPoint, walkablePoints: MapPoint[]) {
  if (walkablePoints.length === 0) return point;
  let nearest = walkablePoints[0];
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of walkablePoints) {
    const candidateDistance = Math.hypot(candidate.x - point.x, candidate.y - point.y);
    if (candidateDistance < nearestDistance) {
      nearest = candidate;
      nearestDistance = candidateDistance;
    }
  }
  return nearest;
}

export function isEditorRuntimeBattleMap(map: BakedBattleMapData): map is EditorRuntimeBattleMapData {
  return Array.isArray((map as Partial<EditorRuntimeBattleMapData>).editorTiles);
}

function normalizeMapEditorCollider(value: Partial<MapEditorCollider>): MapEditorCollider {
  const x = clampNumber(Number(value.x ?? 0), 0, 1);
  const y = clampNumber(Number(value.y ?? 0), 0, 1);
  return {
    enabled: Boolean(value.enabled),
    x,
    y,
    width: clampNumber(Number(value.width ?? 1), 0, 1 - x),
    height: clampNumber(Number(value.height ?? 1), 0, 1 - y)
  };
}

function mapEditorTileSourceSize(value: unknown) {
  if (!Array.isArray(value)) return { width: 0, height: 0 };
  const height = value.length;
  const width = value.reduce((maxWidth, row) => Array.isArray(row) ? Math.max(maxWidth, row.length) : maxWidth, 0);
  return { width, height };
}

function mapEditorExpansionOffset(width: number, height: number): MapEditorCellPoint {
  return {
    x: width > 0 && width < MAP_EDITOR_COLUMNS ? Math.floor((MAP_EDITOR_COLUMNS - width) / 2) : 0,
    y: height > 0 && height < MAP_EDITOR_ROWS ? Math.floor((MAP_EDITOR_ROWS - height) / 2) : 0
  };
}

function normalizeMapEditorSpawn(value: unknown, offset: MapEditorCellPoint = { x: 0, y: 0 }): MapEditorCellPoint {
  if (value && typeof value === "object" && "x" in value && "y" in value) {
    const point = value as Partial<MapEditorCellPoint>;
    const x = Number(point.x);
    const y = Number(point.y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return clampMapEditorPoint({ x: Math.round(x) + offset.x, y: Math.round(y) + offset.y });
    }
  }
  return { ...MAP_EDITOR_DEFAULT_SPAWN };
}

function createDefaultMapEditorState(): MapEditorSavedState {
  return normalizeMapEditorFileDocument(defaultAuthoredMapTemplate().document as unknown as MapEditorFileDocument);
}

function cloneMapEditorState(state: MapEditorSavedState): MapEditorSavedState {
  return {
    tiles: state.tiles.map((row) => [...row]),
    cellSize: state.cellSize,
    spawn: { ...state.spawn },
    colliders: normalizeMapEditorColliders(state.colliders),
    zones: state.zones.map((zone) => ({
      ...zone,
      points: zone.points.map((point) => ({ ...point }))
    })),
    width: MAP_EDITOR_COLUMNS,
    height: MAP_EDITOR_ROWS
  };
}

function createEmptyMapEditorTiles(): MapEditorTileKind[][] {
  return Array.from({ length: MAP_EDITOR_ROWS }, () => Array.from({ length: MAP_EDITOR_COLUMNS }, () => "empty" as const));
}

function createDefaultMapEditorTiles(): MapEditorTileKind[][] {
  const tiles = createEmptyMapEditorTiles();
  const paint = (start: MapEditorCellPoint, end: MapEditorCellPoint, tile: MapEditorTileKind) => {
    paintMapEditorTilesInPlace(
      tiles,
      { x: start.x + MAP_EDITOR_SAMPLE_OFFSET.x, y: start.y + MAP_EDITOR_SAMPLE_OFFSET.y },
      { x: end.x + MAP_EDITOR_SAMPLE_OFFSET.x, y: end.y + MAP_EDITOR_SAMPLE_OFFSET.y },
      tile
    );
  };
  paint({ x: 5, y: 5 }, { x: 44, y: 28 }, "ground");
  paint({ x: 5, y: 5 }, { x: 44, y: 5 }, "wall");
  paint({ x: 5, y: 28 }, { x: 44, y: 28 }, "wall");
  paint({ x: 5, y: 5 }, { x: 5, y: 28 }, "wall");
  paint({ x: 44, y: 5 }, { x: 44, y: 28 }, "wall");
  paint({ x: 70, y: 32 }, { x: 118, y: 62 }, "ground");
  paint({ x: 70, y: 32 }, { x: 118, y: 32 }, "wall");
  paint({ x: 70, y: 62 }, { x: 118, y: 62 }, "wall");
  paint({ x: 70, y: 32 }, { x: 70, y: 62 }, "wall");
  paint({ x: 118, y: 32 }, { x: 118, y: 62 }, "wall");
  paint({ x: 44, y: 15 }, { x: 70, y: 15 }, "ground");
  paint({ x: 44, y: 14 }, { x: 70, y: 14 }, "wall");
  paint({ x: 44, y: 16 }, { x: 70, y: 16 }, "wall");
  paint({ x: 88, y: 44 }, { x: 94, y: 50 }, "wall");
  paint({ x: 23, y: 5 }, { x: 26, y: 5 }, "ground");
  paint({ x: 5, y: 16 }, { x: 5, y: 19 }, "ground");
  paint({ x: 118, y: 46 }, { x: 118, y: 49 }, "ground");
  return tiles;
}

function paintMapEditorTiles(current: MapEditorTileKind[][], start: MapEditorCellPoint, end: MapEditorCellPoint, tile: MapEditorTileKind) {
  const next = current.map((row) => [...row]);
  paintMapEditorTilesInPlace(next, start, end, tile);
  return next;
}

function shiftMapEditorTiles(current: MapEditorTileKind[][], dx: number, dy: number) {
  const next = createEmptyMapEditorTiles();
  for (let y = 0; y < MAP_EDITOR_ROWS; y += 1) {
    for (let x = 0; x < MAP_EDITOR_COLUMNS; x += 1) {
      const tile = current[y]?.[x] ?? "empty";
      const targetX = x + dx;
      const targetY = y + dy;
      if (targetX < 0 || targetX >= MAP_EDITOR_COLUMNS || targetY < 0 || targetY >= MAP_EDITOR_ROWS) continue;
      next[targetY][targetX] = tile;
    }
  }
  return next;
}

function shiftMapEditorPoint(point: MapEditorCellPoint, dx: number, dy: number): MapEditorCellPoint {
  return clampMapEditorPoint({ x: point.x + dx, y: point.y + dy });
}

function mapEditorSpawnPlanToolLabel(tool: MapEditorSpawnPlanTool) {
  if (tool === "zone") return "刷怪区域";
  return "地形";
}

function paintMapEditorTilesInPlace(tiles: MapEditorTileKind[][], start: MapEditorCellPoint, end: MapEditorCellPoint, tile: MapEditorTileKind) {
  const minX = clamp(Math.min(start.x, end.x), 0, MAP_EDITOR_COLUMNS - 1);
  const maxX = clamp(Math.max(start.x, end.x), 0, MAP_EDITOR_COLUMNS - 1);
  const minY = clamp(Math.min(start.y, end.y), 0, MAP_EDITOR_ROWS - 1);
  const maxY = clamp(Math.max(start.y, end.y), 0, MAP_EDITOR_ROWS - 1);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      tiles[y][x] = tile;
    }
  }
}

function mapEditorSelectionSet(start: MapEditorCellPoint, end: MapEditorCellPoint) {
  const result = new Set<string>();
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) result.add(mapEditorPointKey(x, y));
  }
  return result;
}

function mapEditorPointKey(x: number, y: number) {
  return `${x}-${y}`;
}

function mapEditorWallNeighborPoint(x: number, y: number, side: MapEditorWallSide) {
  switch (side) {
    case "n":
      return { x, y: y - 1 };
    case "e":
      return { x: x + 1, y };
    case "s":
      return { x, y: y + 1 };
    case "w":
      return { x: x - 1, y };
  }
}

function mapEditorWallHasNeighbor(tiles: MapEditorTileKind[][], x: number, y: number, side: MapEditorWallSide) {
  const next = mapEditorWallNeighborPoint(x, y, side);
  return next.x >= 0 && next.x < MAP_EDITOR_COLUMNS && next.y >= 0 && next.y < MAP_EDITOR_ROWS && tiles[next.y]?.[next.x] === "wall";
}

function mapEditorTileAt(tiles: MapEditorTileKind[][], x: number, y: number): MapEditorTileKind {
  if (x < 0 || x >= MAP_EDITOR_COLUMNS || y < 0 || y >= MAP_EDITOR_ROWS) return "empty";
  return tiles[y]?.[x] ?? "empty";
}

function mapEditorCornerNeighborPoint(x: number, y: number, corner: MapEditorWallCorner) {
  switch (corner) {
    case "nw":
      return { x: x - 1, y: y - 1 };
    case "ne":
      return { x: x + 1, y: y - 1 };
    case "se":
      return { x: x + 1, y: y + 1 };
    case "sw":
      return { x: x - 1, y: y + 1 };
  }
}

function mapEditorCornerSides(corner: MapEditorWallCorner): [MapEditorWallSide, MapEditorWallSide] {
  switch (corner) {
    case "nw":
      return ["n", "w"];
    case "ne":
      return ["n", "e"];
    case "se":
      return ["s", "e"];
    case "sw":
      return ["s", "w"];
  }
}

function mapEditorAutotileState(tiles: MapEditorTileKind[][], x: number, y: number, tile: MapEditorTileKind): MapEditorAutotileState {
  if (tile === "empty") {
    return { role: "empty", sameSides: [], edgeSides: [], boundarySides: [], innerCorners: [], outerCorners: [] };
  }

  const sameSides = MAP_EDITOR_WALL_SIDES.filter((side) => mapEditorTileAt(tiles, mapEditorWallNeighborPoint(x, y, side).x, mapEditorWallNeighborPoint(x, y, side).y) === tile);
  const edgeSides = MAP_EDITOR_WALL_SIDES.filter((side) => {
    const point = mapEditorWallNeighborPoint(x, y, side);
    return mapEditorTileAt(tiles, point.x, point.y) === "empty";
  });
  const boundarySides = MAP_EDITOR_WALL_SIDES.filter((side) => {
    const point = mapEditorWallNeighborPoint(x, y, side);
    const neighbor = mapEditorTileAt(tiles, point.x, point.y);
    return neighbor !== "empty" && neighbor !== tile;
  });
  const innerCorners = MAP_EDITOR_WALL_CORNERS.filter((corner) => {
    const [first, second] = mapEditorCornerSides(corner);
    const diagonal = mapEditorCornerNeighborPoint(x, y, corner);
    return sameSides.includes(first)
      && sameSides.includes(second)
      && mapEditorTileAt(tiles, diagonal.x, diagonal.y) !== tile;
  });
  const outerCorners = MAP_EDITOR_WALL_CORNERS.filter((corner) => {
    const [first, second] = mapEditorCornerSides(corner);
    return (edgeSides.includes(first) || boundarySides.includes(first))
      && (edgeSides.includes(second) || boundarySides.includes(second));
  });
  const role: MapEditorAutotileRole = sameSides.length === 4 && innerCorners.length === 0
    ? "interior"
    : sameSides.length > 0
      ? "connected"
      : "isolated";

  return { role, sameSides, edgeSides, boundarySides, innerCorners, outerCorners };
}

function mapEditorAutotileSideValue(sides: MapEditorWallSide[]) {
  return sides.length > 0 ? sides.join(" ") : "none";
}

function mapEditorAutotileCornerValue(corners: MapEditorWallCorner[]) {
  return corners.length > 0 ? corners.join(" ") : "none";
}

function mapEditorAutotileClass(autotile: MapEditorAutotileState) {
  return [
    `map-editor-autotile-${autotile.role}`,
    ...autotile.edgeSides.map((side) => `map-editor-edge-${side}`),
    ...autotile.boundarySides.map((side) => `map-editor-boundary-${side}`),
    ...autotile.innerCorners.map((corner) => `map-editor-corner-inner-${corner}`),
    ...autotile.outerCorners.map((corner) => `map-editor-corner-outer-${corner}`)
  ].join(" ");
}

function mapEditorTileConnectionClass(
  tiles: MapEditorTileKind[][],
  x: number,
  y: number,
  tile: MapEditorTileKind,
  autotile: MapEditorAutotileState = mapEditorAutotileState(tiles, x, y, tile)
) {
  const autotileClass = mapEditorAutotileClass(autotile);
  if (tile !== "wall") return autotileClass;
  return [
    autotileClass,
    ...MAP_EDITOR_WALL_SIDES
      .map((side) => mapEditorWallHasNeighbor(tiles, x, y, side) ? `map-editor-wall-${side}` : `map-editor-wall-open-${side}`),
    ...MAP_EDITOR_WALL_CORNERS
      .map((corner) => mapEditorWallNeedsCornerCap(tiles, x, y, corner) ? `map-editor-wall-corner-${corner}` : "")
  ].filter(Boolean).join(" ");
}

function mapEditorWallNeedsCornerCap(tiles: MapEditorTileKind[][], x: number, y: number, corner: MapEditorWallCorner) {
  switch (corner) {
    case "nw":
      return !mapEditorWallHasNeighbor(tiles, x, y, "n") || !mapEditorWallHasNeighbor(tiles, x, y, "w");
    case "ne":
      return !mapEditorWallHasNeighbor(tiles, x, y, "n") || !mapEditorWallHasNeighbor(tiles, x, y, "e");
    case "se":
      return !mapEditorWallHasNeighbor(tiles, x, y, "s") || !mapEditorWallHasNeighbor(tiles, x, y, "e");
    case "sw":
      return !mapEditorWallHasNeighbor(tiles, x, y, "s") || !mapEditorWallHasNeighbor(tiles, x, y, "w");
  }
}

function mapEditorCellCenter(x: number, y: number, cellSize: number) {
  return {
    x: x * cellSize + cellSize / 2,
    y: y * cellSize + cellSize / 2
  };
}

function clampMapEditorPoint(point: MapEditorCellPoint): MapEditorCellPoint {
  return {
    x: clamp(point.x, 0, MAP_EDITOR_COLUMNS - 1),
    y: clamp(point.y, 0, MAP_EDITOR_ROWS - 1)
  };
}

function clampMapEditorWorldPoint(point: { x: number; y: number }, cellSize: number) {
  return {
    x: clamp(point.x, 0, MAP_EDITOR_COLUMNS * cellSize - 1),
    y: clamp(point.y, 0, MAP_EDITOR_ROWS * cellSize - 1)
  };
}

function mapEditorWorldToGrid(point: { x: number; y: number }, cellSize: number) {
  return {
    x: clamp(Math.floor(point.x / cellSize), 0, MAP_EDITOR_COLUMNS - 1),
    y: clamp(Math.floor(point.y / cellSize), 0, MAP_EDITOR_ROWS - 1)
  };
}

function mapEditorVisibleBounds(center: MapEditorCellPoint): MapEditorVisibleBounds {
  return {
    minX: clamp(center.x - MAP_EDITOR_VISIBLE_RADIUS_X, 0, MAP_EDITOR_COLUMNS - 1),
    maxX: clamp(center.x + MAP_EDITOR_VISIBLE_RADIUS_X, 0, MAP_EDITOR_COLUMNS - 1),
    minY: clamp(center.y - MAP_EDITOR_VISIBLE_RADIUS_Y, 0, MAP_EDITOR_ROWS - 1),
    maxY: clamp(center.y + MAP_EDITOR_VISIBLE_RADIUS_Y, 0, MAP_EDITOR_ROWS - 1)
  };
}

function mapEditorColliderForTile(tile: MapEditorTileKind, colliders: MapEditorTileColliderConfig) {
  return colliders[tile] ?? createDefaultMapEditorColliders()[tile];
}

function mapEditorTileColliderWorld(x: number, y: number, collider: MapEditorCollider, cellSize: number) {
  const left = (x + collider.x) * cellSize;
  const top = (y + collider.y) * cellSize;
  const width = collider.width * cellSize;
  const height = collider.height * cellSize;
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height
  };
}

function mapEditorPlayerColliderWorld(player: { x: number; y: number }, cellSize: number) {
  const width = MAP_EDITOR_PLAYER_COLLIDER.width * cellSize;
  const height = MAP_EDITOR_PLAYER_COLLIDER.height * cellSize;
  const left = player.x - width / 2;
  const top = player.y - height / 2 + (MAP_EDITOR_PLAYER_COLLIDER.y - 0.5) * cellSize;
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height
  };
}

function rectanglesIntersect(
  left: { left: number; right: number; top: number; bottom: number },
  right: { left: number; right: number; top: number; bottom: number }
) {
  return left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;
}

function isMapEditorWalkable(
  tiles: MapEditorTileKind[][],
  cellSize: number,
  point: { x: number; y: number },
  colliders: MapEditorTileColliderConfig
) {
  const playerCollider = mapEditorPlayerColliderWorld(point, cellSize);
  const minGridX = clamp(Math.floor(playerCollider.left / cellSize), 0, MAP_EDITOR_COLUMNS - 1);
  const maxGridX = clamp(Math.floor(playerCollider.right / cellSize), 0, MAP_EDITOR_COLUMNS - 1);
  const minGridY = clamp(Math.floor(playerCollider.top / cellSize), 0, MAP_EDITOR_ROWS - 1);
  const maxGridY = clamp(Math.floor(playerCollider.bottom / cellSize), 0, MAP_EDITOR_ROWS - 1);
  for (let y = minGridY; y <= maxGridY; y += 1) {
    for (let x = minGridX; x <= maxGridX; x += 1) {
      const tileCollider = mapEditorColliderForTile(tiles[y]?.[x] ?? "empty", colliders);
      if (!tileCollider.enabled || tileCollider.width <= 0 || tileCollider.height <= 0) continue;
      if (rectanglesIntersect(playerCollider, mapEditorTileColliderWorld(x, y, tileCollider, cellSize))) return false;
    }
  }
  return true;
}

function resolveMapEditorMove(
  tiles: MapEditorTileKind[][],
  cellSize: number,
  current: { x: number; y: number },
  moveVector: { x: number; y: number },
  distancePx: number,
  colliders: MapEditorTileColliderConfig
) {
  const length = Math.hypot(moveVector.x, moveVector.y);
  if (length <= 0) return current;
  const next = {
    x: clamp(current.x + (moveVector.x / length) * distancePx, 0, MAP_EDITOR_COLUMNS * cellSize - 1),
    y: clamp(current.y + (moveVector.y / length) * distancePx, 0, MAP_EDITOR_ROWS * cellSize - 1)
  };
  if (isMapEditorWalkable(tiles, cellSize, next, colliders)) return next;
  const xOnly = { x: next.x, y: current.y };
  if (isMapEditorWalkable(tiles, cellSize, xOnly, colliders)) return xOnly;
  const yOnly = { x: current.x, y: next.y };
  if (isMapEditorWalkable(tiles, cellSize, yOnly, colliders)) return yOnly;
  return current;
}

function countMapEditorTiles(tiles: MapEditorTileKind[][], tile: MapEditorTileKind) {
  return tiles.reduce((total, row) => total + row.filter((cell) => cell === tile).length, 0);
}

function countMapEditorBlockingTiles(tiles: MapEditorTileKind[][], colliders: MapEditorTileColliderConfig) {
  return tiles.reduce((total, row) => (
    total + row.filter((cell) => {
      const collider = mapEditorColliderForTile(cell, colliders);
      return collider.enabled && collider.width > 0 && collider.height > 0;
    }).length
  ), 0);
}

function mapEditorTileLabel(tile: MapEditorTileKind) {
  if (tile === "ground") return "地面 / 可行走";
  if (tile === "wall") return "墙壁 / 阻挡";
  return "空 / 阻挡";
}

function mapEditorColliderFieldLabel(field: MapEditorColliderNumericField) {
  if (field === "x") return "X";
  if (field === "y") return "Y";
  if (field === "width") return "W";
  return "H";
}

function mapEditorColliderPercent(value: number) {
  return Math.round(clampNumber(value, 0, 1) * 100);
}

function mapEditorMinimapTileColor(tile: MapEditorTileKind) {
  if (tile === "ground") return { r: 199, g: 201, b: 195 };
  if (tile === "wall") return { r: 94, g: 99, b: 97 };
  return { r: 7, g: 8, b: 8 };
}

function mapEditorMinimapPointStyle(point: MapEditorCellPoint): CSSProperties {
  return {
    left: `${((point.x + 0.5) / MAP_EDITOR_COLUMNS) * 100}%`,
    top: `${((point.y + 0.5) / MAP_EDITOR_ROWS) * 100}%`
  };
}

function mapEditorMinimapBoundsStyle(bounds: MapEditorVisibleBounds): CSSProperties {
  return {
    left: `${(bounds.minX / MAP_EDITOR_COLUMNS) * 100}%`,
    top: `${(bounds.minY / MAP_EDITOR_ROWS) * 100}%`,
    width: `${((bounds.maxX - bounds.minX + 1) / MAP_EDITOR_COLUMNS) * 100}%`,
    height: `${((bounds.maxY - bounds.minY + 1) / MAP_EDITOR_ROWS) * 100}%`
  };
}

function mapEditorPlayerStyle(player: { x: number; y: number }, frame: UnitAnimationFrame): CSSProperties {
  return {
    ...battleUnitStyle(player, frame, 60),
    "--unit-render-scale": MAP_EDITOR_PLAYER_RENDER_SCALE,
    pointerEvents: "none"
  };
}

function mapEditorSpawnMarkerStyle(spawn: MapEditorCellPoint, cellSize: number): CSSProperties {
  const size = clampNumber(cellSize * 0.42, 18, 34);
  return {
    left: spawn.x * cellSize + cellSize / 2,
    top: spawn.y * cellSize + cellSize / 2,
    width: size,
    height: size
  };
}

function mapEditorZoneStyle(zone: MapEditorZone, cellSize: number): CSSProperties {
  return mapEditorZoneRectStyle(mapEditorZoneRects(zone)[0], cellSize);
}

function mapEditorZoneRectStyle(rect: MapEditorZoneRect, cellSize: number, groupRects: MapEditorZoneRect[] = [rect]): CSSProperties {
  const minX = Math.min(rect.start.x, rect.end.x);
  const minY = Math.min(rect.start.y, rect.end.y);
  const maxX = Math.max(rect.start.x, rect.end.x);
  const maxY = Math.max(rect.start.y, rect.end.y);
  const hiddenBorders = mapEditorZoneRectInternalBorders(rect, groupRects);
  return {
    left: minX * cellSize,
    top: minY * cellSize,
    width: (maxX - minX + 1) * cellSize,
    height: (maxY - minY + 1) * cellSize,
    borderTopWidth: hiddenBorders.top ? 0 : undefined,
    borderRightWidth: hiddenBorders.right ? 0 : undefined,
    borderBottomWidth: hiddenBorders.bottom ? 0 : undefined,
    borderLeftWidth: hiddenBorders.left ? 0 : undefined
  };
}

function mapEditorZoneRectInternalBorders(rect: MapEditorZoneRect, groupRects: MapEditorZoneRect[]) {
  const current = mapEditorZoneRectBounds(rect);
  const hidden = { top: false, right: false, bottom: false, left: false };
  for (const otherRect of groupRects) {
    if (otherRect === rect) continue;
    const other = mapEditorZoneRectBounds(otherRect);
    const verticalOverlap = current.minY <= other.maxY && current.maxY >= other.minY;
    const horizontalOverlap = current.minX <= other.maxX && current.maxX >= other.minX;
    if (verticalOverlap && other.maxX + 1 === current.minX) hidden.left = true;
    if (verticalOverlap && other.minX - 1 === current.maxX) hidden.right = true;
    if (horizontalOverlap && other.maxY + 1 === current.minY) hidden.top = true;
    if (horizontalOverlap && other.minY - 1 === current.maxY) hidden.bottom = true;
  }
  return hidden;
}

function mapEditorZoneRectBounds(rect: MapEditorZoneRect) {
  return {
    minX: Math.min(rect.start.x, rect.end.x),
    minY: Math.min(rect.start.y, rect.end.y),
    maxX: Math.max(rect.start.x, rect.end.x),
    maxY: Math.max(rect.start.y, rect.end.y)
  };
}

function mapEditorPointerToCell(clientX: number, clientY: number, grid: HTMLDivElement | null, cellSize: number): MapEditorWorldPoint | null {
  if (!grid) return null;
  const bounds = grid.getBoundingClientRect();
  return {
    x: clampNumber((clientX - bounds.left) / cellSize, 0, MAP_EDITOR_COLUMNS - 1),
    y: clampNumber((clientY - bounds.top) / cellSize, 0, MAP_EDITOR_ROWS - 1)
  };
}

function mapEditorTileColliderStyle(x: number, y: number, collider: MapEditorCollider, cellSize: number): CSSProperties {
  return mapEditorWorldColliderStyle(mapEditorTileColliderWorld(x, y, collider, cellSize));
}

function mapEditorWorldColliderStyle(rect: { left: number; top: number; width: number; height: number }): CSSProperties {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height
  };
}

function mapEditorCameraTransform(player: { x: number; y: number }) {
  return `translate(${-player.x}px, ${-player.y}px)`;
}

export function createMapEditorZone(zoneType: ProceduralZoneType, rects: MapEditorZoneRect[]): MapEditorZone {
  const normalizedRects = rects.map((rect) => ({
    start: clampMapEditorPoint(rect.start),
    end: clampMapEditorPoint(rect.end)
  }));
  const normalized = normalizeMapEditorZone({
    id: safeMapEditorId(null, "zone"),
    zoneType,
    shape: "rectangle",
    rects: normalizedRects
  });
  return normalized ?? {
    id: safeMapEditorId(null, "zone"),
    zoneType,
    shape: "rectangle",
    points: normalizedRects.flatMap((rect) => [rect.start, rect.end]),
    rects: normalizedRects
  };
}

export function mapEditorZoneTypeLabel(zoneType: ProceduralZoneType) {
  return MAP_EDITOR_ZONE_TYPES.find((option) => option.id === zoneType)?.label ?? zoneType;
}

export function mapEditorZoneCenter(zone: MapEditorZone): MapEditorCellPoint {
  const rects = mapEditorZoneRects(zone);
  const totals = rects.reduce((sum, rect) => ({
    x: sum.x + (rect.start.x + rect.end.x) / 2,
    y: sum.y + (rect.start.y + rect.end.y) / 2
  }), { x: 0, y: 0 });
  return clampMapEditorPoint({
    x: Math.round(totals.x / rects.length),
    y: Math.round(totals.y / rects.length)
  });
}

export function mapEditorZoneRects(zone: MapEditorZone): MapEditorZoneRect[] {
  if (Array.isArray(zone.rects) && zone.rects.length > 0) return zone.rects;
  const rects: MapEditorZoneRect[] = [];
  for (let index = 0; index + 1 < zone.points.length; index += 2) {
    rects.push({ start: zone.points[index], end: zone.points[index + 1] });
  }
  return rects.length > 0 ? rects : [{ start: MAP_EDITOR_DEFAULT_SPAWN, end: MAP_EDITOR_DEFAULT_SPAWN }];
}

export function shiftMapEditorZones(zones: MapEditorZone[], dx: number, dy: number): MapEditorZone[] {
  return zones.map((zone) => ({
    ...zone,
    points: zone.points.map((point) => shiftMapEditorPoint(point, dx, dy)),
    rects: mapEditorZoneRects(zone).map((rect) => ({
      start: shiftMapEditorPoint(rect.start, dx, dy),
      end: shiftMapEditorPoint(rect.end, dx, dy)
    }))
  }));
}
