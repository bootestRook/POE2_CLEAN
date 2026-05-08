import { CSSProperties, useEffect, useRef } from "react";
import type { BakedBattleMapData } from "../../bakedMapLoader";
import { clampNumber } from "../../utils/number";

export type PlayableMinimapMode = "compact" | "expanded";

type PlayableBattleMinimapProps = {
  map: BakedBattleMapData;
  player: { x: number; y: number };
  exploredCells: ReadonlySet<string>;
  mode: PlayableMinimapMode;
};

type EditorMinimapMap = BakedBattleMapData & {
  editorTiles?: string[][];
};

export function PlayableBattleMinimap({
  map,
  player,
  exploredCells,
  mode
}: PlayableBattleMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapAspect = Math.max(0.1, map.meta.world_width / Math.max(1, map.meta.world_height));
  const minimapStyle = {
    "--playable-minimap-aspect-ratio": `${Math.max(1, map.meta.world_width)} / ${Math.max(1, map.meta.world_height)}`,
    "--playable-minimap-aspect-number": String(minimapAspect)
  } as CSSProperties;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    renderPlayableMinimapCanvas(context, map, exploredCells);
  }, [map, exploredCells]);

  return (
    <aside
      className={`playable-minimap playable-minimap-${mode}`}
      data-playable-minimap="true"
      data-minimap-mode={mode}
      data-minimap-explored-cells={exploredCells.size}
      style={minimapStyle}
      aria-label={mode === "expanded" ? "放大地图" : "小地图"}
    >
      <canvas
        ref={canvasRef}
        className="playable-minimap-canvas"
        width={Math.max(1, map.gridWidth)}
        height={Math.max(1, map.gridHeight)}
        aria-hidden="true"
      />
      <span className="playable-minimap-player" style={playableMinimapPlayerStyle(map, player)} aria-hidden="true" />
    </aside>
  );
}

function renderPlayableMinimapCanvas(
  context: CanvasRenderingContext2D,
  map: BakedBattleMapData,
  exploredCells: ReadonlySet<string>
) {
  const canvas = context.canvas;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(0, 0, 0, 0)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  for (const key of exploredCells) {
    const cell = playableMinimapCellFromKey(key);
    if (!cell) continue;
    const kind = playableMinimapTerrainKind(map, cell.x, cell.y);
    if (kind === "hidden") continue;
    context.fillStyle = kind === "wall"
      ? "rgba(169, 184, 176, 0.72)"
      : "rgba(78, 116, 96, 0.82)";
    context.fillRect(cell.x, cell.y, 1, 1);
  }
}

function playableMinimapTerrainKind(map: BakedBattleMapData, gridX: number, gridY: number): "ground" | "wall" | "hidden" {
  const editorTiles = (map as EditorMinimapMap).editorTiles;
  if (Array.isArray(editorTiles)) {
    const tile = editorTiles[gridY]?.[gridX] ?? "empty";
    if (tile === "ground") return "ground";
    if (tile === "wall") return "wall";
    return "hidden";
  }
  if (map.blockerGrid[gridY]?.[gridX]) return "wall";
  if (map.walkableGrid[gridY]?.[gridX]) return "ground";
  return "hidden";
}

function playableMinimapPlayerStyle(map: BakedBattleMapData, player: { x: number; y: number }): CSSProperties {
  return {
    left: `${clampNumber(player.x / Math.max(1, map.meta.world_width) * 100, 0, 100)}%`,
    top: `${clampNumber(player.y / Math.max(1, map.meta.world_height) * 100, 0, 100)}%`
  };
}

function playableMinimapCellFromKey(key: string) {
  const [xText, yText] = key.split(",");
  const x = Number(xText);
  const y = Number(yText);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}
