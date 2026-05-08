export type VfxBlendMode = "screen" | "normal";

export type VfxSpriteSheet = {
  image: string;
  src: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  rows: number;
  frameCount: number;
  fps: number;
  anchorX: number;
  anchorY: number;
  blendMode: VfxBlendMode;
};
