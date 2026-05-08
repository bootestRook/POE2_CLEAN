import type { CSSProperties } from "react";
import type { VfxSpriteSheet } from "../../vfxAssets";

export function vfxFrameIndex(sheet: VfxSpriteSheet, ttl: number, duration: number, loop: boolean) {
  const elapsed = Math.max(0, duration - ttl);
  const index = Math.floor(elapsed * sheet.fps);
  return loop ? index % sheet.frameCount : Math.min(sheet.frameCount - 1, index);
}

export function vfxFrameIndexInRow(
  sheet: VfxSpriteSheet,
  row: number,
  ttl: number,
  duration: number,
  clamp: (value: number, min: number, max: number) => number
) {
  const safeRow = clamp(Math.round(row), 0, Math.max(0, sheet.rows - 1));
  const elapsed = Math.max(0, duration - ttl);
  const column = Math.floor(elapsed * sheet.fps) % sheet.columns;
  return safeRow * sheet.columns + column;
}

export function vfxSpriteStyle(sheet: VfxSpriteSheet, frameIndex: number): CSSProperties {
  const column = frameIndex % sheet.columns;
  const row = Math.floor(frameIndex / sheet.columns);
  return {
    width: sheet.frameWidth,
    height: sheet.frameHeight,
    backgroundImage: `url(${sheet.src})`,
    backgroundPosition: `${-column * sheet.frameWidth}px ${-row * sheet.frameHeight}px`
  };
}
