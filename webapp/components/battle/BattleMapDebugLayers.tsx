import type { CSSProperties, ReactNode } from "react";
import type { BakedBattleMapData, MapPoint } from "../../bakedMapLoader";
import { isEditorRuntimeBattleMap } from "../map-editor/MapEditorScene";
import type { EditorRuntimeBattleMapData } from "../map-editor/MapEditorScene";

export function BakedMapBackground({ map }: { map: BakedBattleMapData }) {
  if (isEditorRuntimeBattleMap(map)) return <EditorRuntimeMapBackground map={map} />;
  return (
    <img
      className="baked-map-background"
      src={map.backgroundUrl}
      alt={`${map.displayName}底图`}
      draggable={false}
      style={{ width: map.meta.world_width, height: map.meta.world_height }}
    />
  );
}

function EditorRuntimeMapBackground({ map }: { map: EditorRuntimeBattleMapData }) {
  return (
    <div
      className="editor-runtime-map-background"
      aria-hidden="true"
      data-renderer="canvas"
      data-visual-system="abstract-geometric-map-tiles"
      style={{ width: map.meta.world_width, height: map.meta.world_height }}
    />
  );
}

export function MapDebugOverlay({ map, enabled }: { map: BakedBattleMapData; enabled: boolean }) {
  if (!enabled) return null;
  const cells: ReactNode[] = [];
  for (let gridY = 0; gridY < map.gridHeight; gridY += 1) {
    for (let gridX = 0; gridX < map.gridWidth; gridX += 1) {
      if (map.walkableGrid[gridY]?.[gridX]) {
        cells.push(<span key={`walk-${gridX}-${gridY}`} className="map-debug-cell map-debug-walkable" style={mapDebugCellStyle(map, gridX, gridY)} />);
      }
      if (map.blockerGrid[gridY]?.[gridX]) {
        cells.push(<span key={`block-${gridX}-${gridY}`} className="map-debug-cell map-debug-blocker" style={mapDebugCellStyle(map, gridX, gridY)} />);
      }
    }
  }

  return (
    <div className="map-debug-overlay" aria-label="地图调试覆盖层">
      {cells}
      <MapDebugMarker point={map.playerSpawn} className="map-debug-marker-player" label="玩家出生点" />
      {map.enemySpawnPoints.map((point, index) => <MapDebugMarker key={`enemy-${index}`} point={point} className="map-debug-marker-enemy" label="普通怪刷新区" />)}
      {map.eliteSpawnPoints.map((point, index) => <MapDebugMarker key={`elite-${index}`} point={point} className="map-debug-marker-elite" label="精英怪刷新区" />)}
      {map.bossPoints.map((point, index) => <MapDebugMarker key={`boss-${index}`} point={point} className="map-debug-marker-boss" label="Boss 区域" />)}
      {map.exitPoints.map((point, index) => <MapDebugMarker key={`exit-${index}`} point={point} className="map-debug-marker-exit" label="出口" />)}
      {map.interactionPoints.map((point, index) => <MapDebugMarker key={`interaction-${index}`} point={point} className="map-debug-marker-interaction" label="交互点" />)}
    </div>
  );
}

function MapDebugMarker({ point, className, label }: { point: MapPoint; className: string; label: string }) {
  return (
    <span className={`map-debug-marker ${className}`} style={{ left: point.x, top: point.y }}>
      <span>{label}</span>
    </span>
  );
}

function mapDebugCellStyle(map: BakedBattleMapData, gridX: number, gridY: number): CSSProperties {
  return {
    left: gridX * map.meta.grid_size,
    top: gridY * map.meta.grid_size,
    width: map.meta.grid_size,
    height: map.meta.grid_size
  };
}
