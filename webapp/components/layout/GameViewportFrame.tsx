import type { CSSProperties, ReactNode } from "react";

type GameResolutionMode = "original" | "fullscreen" | "4k" | "2k" | "1080p";

type GameViewport = {
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
};

export function GameViewportFrame({
  viewport,
  mode,
  children
}: {
  viewport: GameViewport;
  mode: GameResolutionMode;
  children: ReactNode;
}) {
  const inventoryFitScale = mode === "original"
    ? Math.min(1, viewport.width / 1800, viewport.height / 1200)
    : 1;
  const inventoryStageScale = inventoryFitScale;
  const inventoryStageWidth = mode === "original" ? viewport.width / inventoryStageScale : viewport.width;
  const inventoryStageHeight = mode === "original" ? viewport.height / inventoryStageScale : viewport.height;
  const style = {
    "--game-viewport-width": `${viewport.width}px`,
    "--game-viewport-height": `${viewport.height}px`,
    "--game-viewport-scale": viewport.scale,
    "--game-viewport-offset-x": `${viewport.offsetX}px`,
    "--game-viewport-offset-y": `${viewport.offsetY}px`,
    "--inventory-fit-scale": inventoryFitScale,
    "--inventory-stage-scale": inventoryStageScale,
    "--inventory-stage-width": `${inventoryStageWidth}px`,
    "--inventory-stage-height": `${inventoryStageHeight}px`
  } as CSSProperties;

  return (
    <div className="game-viewport-shell" data-resolution-mode={mode} style={style}>
      <div
        className="game-viewport-content"
        data-game-viewport-content="true"
        data-viewport-width={viewport.width}
        data-viewport-height={viewport.height}
      >
        {children}
      </div>
    </div>
  );
}
