import type { CSSProperties } from "react";
import { cssToken } from "../../utils/vfxTone";

export const FIRE_BOLT_FAKE_Z = 22;
export const FIRE_BOLT_PROJECTILE_FAKE_Z = 0;
export const FIRE_BOLT_TRAIL_LENGTH = 0;
export const FIRE_BOLT_IMPACT_DURATION_MS = 420;
export const FIRE_BOLT_PROJECTILE_FRAME_ROW = 0;
const FIRE_BOLT_PROJECTILE_ART_FACING_OFFSET_DEG = 0;
export const FIRE_BOLT_PROJECTILE_ART_FACING_OFFSET = FIRE_BOLT_PROJECTILE_ART_FACING_OFFSET_DEG * Math.PI / 180;
export const PROJECTILE_BODY_EXIT_FADE_DURATION = 0.16;
export const ICE_SHARDS_FAKE_Z = 24;
export const ICE_SHARDS_PROJECTILE_FAKE_Z = 0;
export const ICE_SHARDS_TRAIL_LENGTH = 8;
export const ICE_SHARDS_IMPACT_DURATION_MS = 420;
export const ICE_SHARDS_PROJECTILE_FRAME_ROW = 0;
const ICE_SHARDS_PROJECTILE_ART_FACING_OFFSET_DEG = 0;
export const ICE_SHARDS_PROJECTILE_ART_FACING_OFFSET = ICE_SHARDS_PROJECTILE_ART_FACING_OFFSET_DEG * Math.PI / 180;
export const PENETRATING_SHOT_PROJECTILE_FAKE_Z = 0;
export const PENETRATING_SHOT_TRAIL_LENGTH = 6;
export const PENETRATING_SHOT_IMPACT_DURATION_MS = 260;
export const PENETRATING_SHOT_PROJECTILE_FRAME_ROW = 0;
const PENETRATING_SHOT_ART_FACING_OFFSET_DEG = 0;
export const PENETRATING_SHOT_ART_FACING_OFFSET = PENETRATING_SHOT_ART_FACING_OFFSET_DEG * Math.PI / 180;

export type ProjectileVfxKind = "burning_shot" | "fire_bolt" | "ice_shards" | "penetrating_shot" | "rain_of_arrows" | "sparkle";

type ProjectileBodyScaleView = {
  projectileWidth?: unknown;
  projectileHeight?: unknown;
  vfxScale?: unknown;
};

type ProjectileMotionView = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  ttl: number;
  duration: number;
  fadeDuration?: number;
  projectileVisualMode?: string;
  trajectory?: string;
  arcHeight?: unknown;
  sineAmplitude?: unknown;
  sineFrequency?: unknown;
};

type HitImpactScaleView = {
  projectileWidth?: unknown;
  projectileHeight?: unknown;
  impactRadius?: unknown;
  vfxScale?: unknown;
};

type FloatingDamageEventView = {
  damage_type: string;
  amount?: unknown;
  payload?: Record<string, unknown>;
};

export function normalizedVfxScale(value: unknown) {
  const scale = Number(value ?? 1);
  return Number.isFinite(scale) ? clamp(scale, 0.1, 10) : 1;
}

export function projectileVfxKind(value: string | undefined): ProjectileVfxKind | null {
  const token = cssToken(value);
  if (token.includes("burning_shot") || token.includes("skill_event_burning_shot")) return "burning_shot";
  if (token.includes("sparkle") || token.includes("skill_event_sparkle")) return "sparkle";
  return null;
}

export function damageNumberText(amount: unknown) {
  const value = Number(amount ?? 0);
  if (!Number.isFinite(value)) return "0";
  return Math.max(0, Math.round(value)).toString();
}

export function floatingTextDamageComponents(event: FloatingDamageEventView): [string, number][] {
  const floatingComponents = event.payload?.floating_damage_components;
  if (Array.isArray(floatingComponents)) {
    const rows = floatingComponents
      .map((component) => {
        if (!component || typeof component !== "object" || Array.isArray(component)) return null;
        const record = component as Record<string, unknown>;
        return [String(record.damage_type ?? event.damage_type), Number(record.amount ?? 0)] as [string, number];
      })
      .filter((row): row is [string, number] => row !== null && Number.isFinite(row[1]) && row[1] > 0);
    if (rows.length > 0) return rows;
  }
  const components = event.payload?.damage_components;
  if (!components || typeof components !== "object" || Array.isArray(components)) {
    return [[event.damage_type, Number(event.amount ?? 0)]];
  }
  const rows = Object.entries(components as Record<string, unknown>)
    .map(([damageType, amount]) => [damageType, Number(amount ?? 0)] as [string, number])
    .filter(([, amount]) => Number.isFinite(amount) && amount > 0);
  return rows.length > 0 ? rows : [[event.damage_type, Number(event.amount ?? 0)]];
}

export function usesCanvasProjectileVfx(bolt: Pick<ProjectileMotionView, "projectileVisualMode"> & { vfxKey?: string; visualEffect?: string; skillTemplateId?: string }) {
  return projectileVfxKind(bolt.vfxKey) === "burning_shot"
    || projectileVfxKind(bolt.visualEffect) === "burning_shot"
    || projectileVfxKind(bolt.skillTemplateId) === "burning_shot";
}

export function usesCanvasHitVfx(vfx: { vfxKey?: string; skillTemplateId?: string }) {
  return projectileVfxKind(vfx.vfxKey) === "burning_shot"
    || projectileVfxKind(vfx.skillTemplateId) === "burning_shot";
}

function fireBoltExitFadeDuration(bolt: Pick<ProjectileMotionView, "fadeDuration">) {
  return Math.max(0, bolt.fadeDuration ?? PROJECTILE_BODY_EXIT_FADE_DURATION);
}

export function fireBoltAliveRemaining(bolt: Pick<ProjectileMotionView, "ttl" | "fadeDuration">) {
  return Math.max(0, bolt.ttl - fireBoltExitFadeDuration(bolt));
}

export function fireBoltTravel(bolt: Pick<ProjectileMotionView, "ttl" | "duration" | "fadeDuration">) {
  return clamp(1 - fireBoltAliveRemaining(bolt) / Math.max(0.001, bolt.duration), 0, 1);
}

export function projectileBodyOpacity(bolt: Pick<ProjectileMotionView, "ttl" | "fadeDuration">) {
  const fadeDuration = fireBoltExitFadeDuration(bolt);
  if (fadeDuration <= 0 || bolt.ttl > fadeDuration) return 1;
  return clamp(bolt.ttl / fadeDuration, 0, 1);
}

export function fireBoltWorldPoint(bolt: ProjectileMotionView, travel = fireBoltTravel(bolt)) {
  if (bolt.projectileVisualMode === "falling_arrow") {
    return {
      x: bolt.targetX,
      y: bolt.targetY
    };
  }
  const base = {
    x: bolt.x + (bolt.targetX - bolt.x) * travel,
    y: bolt.y + (bolt.targetY - bolt.y) * travel
  };
  if (bolt.trajectory !== "sine") return base;
  const amplitude = Number(bolt.sineAmplitude ?? 0);
  const frequency = Number(bolt.sineFrequency ?? 0);
  if (!Number.isFinite(amplitude) || !Number.isFinite(frequency) || amplitude === 0 || frequency === 0) return base;
  const dx = bolt.targetX - bolt.x;
  const dy = bolt.targetY - bolt.y;
  const length = Math.hypot(dx, dy) || 1;
  const wave = Math.sin(travel * frequency * Math.PI * 2) * amplitude;
  return {
    x: base.x + (-dy / length) * wave,
    y: base.y + (dx / length) * wave
  };
}

export function ballisticArcVisualLift(bolt: Pick<ProjectileMotionView, "projectileVisualMode" | "trajectory" | "arcHeight">, travel = 0) {
  if (bolt.projectileVisualMode === "falling_arrow") {
    const arcHeight = Math.max(0, Number(bolt.arcHeight ?? 0));
    return arcHeight * 2.8 * (1 - travel);
  }
  if (bolt.trajectory !== "ballistic") return 0;
  const arcHeight = Math.max(0, Number(bolt.arcHeight ?? 0));
  return arcHeight * 1.75 * 4 * travel * (1 - travel);
}

export function ballisticShadowStyle(
  bolt: ProjectileMotionView,
  point: { x: number; y: number },
  depthIndex: number,
  opacity: number,
  projectBattleWorldToScreen: (worldX: number, worldY: number) => { x: number; y: number },
  zIndexBase: number,
  travel = fireBoltTravel(bolt)
): CSSProperties | null {
  if (bolt.trajectory !== "ballistic") return null;
  const visualPoint = projectBattleWorldToScreen(point.x, point.y);
  const lift = ballisticArcVisualLift(bolt, travel);
  const scale = clamp(1 - lift / 260, 0.42, 0.9);
  return {
    left: visualPoint.x,
    top: visualPoint.y,
    opacity: opacity * clamp(0.5 + lift / 300, 0.5, 0.82),
    transform: `translate(-50%, -50%) scale(${scale})`,
    zIndex: zIndexBase + depthIndex - 1,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
