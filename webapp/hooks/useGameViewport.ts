import { useEffect, useMemo, useState } from "react";

export type GameResolutionMode = "original" | "fullscreen" | "4k" | "2k" | "1080p";

export type GameResolutionPreset = {
  mode: GameResolutionMode;
  label: string;
  width: number | null;
  height: number | null;
};

export type GameViewport = {
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
};

export const GAME_RESOLUTION_STORAGE_KEY = "poe2.v1.game.resolution";
export const DEFAULT_GAME_RESOLUTION_MODE: GameResolutionMode = "fullscreen";
export const GAME_RESOLUTION_PRESETS: GameResolutionPreset[] = [
  { mode: "original", label: "鍘熷灏哄", width: null, height: null },
  { mode: "fullscreen", label: "鍏ㄥ睆", width: 1920, height: 1080 },
  { mode: "4k", label: "4K", width: 3840, height: 2160 },
  { mode: "2k", label: "2K", width: 2560, height: 1440 },
  { mode: "1080p", label: "1080p", width: 1920, height: 1080 }
];
export const GAME_RESOLUTION_PRESET_BY_MODE = new Map(GAME_RESOLUTION_PRESETS.map((preset) => [preset.mode, preset]));

export function isGameResolutionMode(value: unknown): value is GameResolutionMode {
  return typeof value === "string" && GAME_RESOLUTION_PRESET_BY_MODE.has(value as GameResolutionMode);
}

export function loadGameResolutionMode(): GameResolutionMode {
  if (typeof window === "undefined") return DEFAULT_GAME_RESOLUTION_MODE;
  try {
    const raw = window.localStorage.getItem(GAME_RESOLUTION_STORAGE_KEY);
    return isGameResolutionMode(raw) ? raw : DEFAULT_GAME_RESOLUTION_MODE;
  } catch {
    return DEFAULT_GAME_RESOLUTION_MODE;
  }
}

export function saveGameResolutionMode(mode: GameResolutionMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GAME_RESOLUTION_STORAGE_KEY, mode);
}

export function useGameViewport(mode: GameResolutionMode): GameViewport {
  const [windowSize, setWindowSize] = useState(() => ({
    width: typeof window === "undefined" ? 1920 : window.innerWidth,
    height: typeof window === "undefined" ? 1080 : window.innerHeight
  }));

  useEffect(() => {
    function resize() {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    }
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("fullscreenchange", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("fullscreenchange", resize);
    };
  }, []);

  return useMemo(() => {
    const preset = GAME_RESOLUTION_PRESET_BY_MODE.get(mode) ?? GAME_RESOLUTION_PRESET_BY_MODE.get(DEFAULT_GAME_RESOLUTION_MODE)!;
    const width = preset.width ?? Math.max(1, windowSize.width);
    const height = preset.height ?? Math.max(1, windowSize.height);
    const scale = Math.min(windowSize.width / width, windowSize.height / height);
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    return {
      width,
      height,
      scale: safeScale,
      offsetX: Math.max(0, (windowSize.width - width * safeScale) / 2),
      offsetY: Math.max(0, (windowSize.height - height * safeScale) / 2)
    };
  }, [mode, windowSize.height, windowSize.width]);
}
