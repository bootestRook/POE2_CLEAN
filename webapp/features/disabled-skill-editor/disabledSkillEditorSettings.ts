import { clampNumber } from "../../utils/number";
import type { SkillEditorCameraSettings, SkillEditorDebugOptions } from "../../types/skillEditorTypes";

export const DEFAULT_SKILL_EDITOR_DEBUG_OPTIONS: SkillEditorDebugOptions = {
  showLaunchPoints: true,
  showTargetPoint: true,
  showDirectionLines: true,
  showCollisionRadius: true,
  showSearchRange: true
};

export const SKILL_EDITOR_CAMERA_STORAGE_KEY = "poe.skillEditor.camera";
export const SKILL_EDITOR_CAMERA_MIN_ZOOM = 0.18;
export const SKILL_EDITOR_CAMERA_MAX_ZOOM = 0.6;
export const DEFAULT_SKILL_EDITOR_CAMERA_SETTINGS: SkillEditorCameraSettings = {
  zoom: 0.34
};

export function normalizeSkillEditorCameraSettings(value: unknown): SkillEditorCameraSettings {
  const source = value && typeof value === "object" ? value as Partial<SkillEditorCameraSettings> : {};
  return {
    zoom: clampNumber(Number(source.zoom ?? DEFAULT_SKILL_EDITOR_CAMERA_SETTINGS.zoom), SKILL_EDITOR_CAMERA_MIN_ZOOM, SKILL_EDITOR_CAMERA_MAX_ZOOM)
  };
}

export function loadSkillEditorCameraSettings(): SkillEditorCameraSettings {
  if (typeof window === "undefined") return DEFAULT_SKILL_EDITOR_CAMERA_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SKILL_EDITOR_CAMERA_STORAGE_KEY);
    return normalizeSkillEditorCameraSettings(raw ? JSON.parse(raw) : DEFAULT_SKILL_EDITOR_CAMERA_SETTINGS);
  } catch {
    return DEFAULT_SKILL_EDITOR_CAMERA_SETTINGS;
  }
}

export function saveSkillEditorCameraSettings(settings: SkillEditorCameraSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SKILL_EDITOR_CAMERA_STORAGE_KEY, JSON.stringify(normalizeSkillEditorCameraSettings(settings)));
}
