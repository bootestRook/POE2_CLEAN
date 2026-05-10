import type { SkillEvent } from "../types/combatRuntimeTypes";

export type WorldPoint = { x: number; y: number };
export type ProjectileLifecycleEnemy = { id: number; x: number; y: number; hp?: number };

export function projectileSpawnWorldPosition(player: WorldPoint, runtimeParams: Record<string, unknown>) {
  const offset = runtimeParams.spawn_offset as { x?: unknown; y?: unknown } | undefined;
  return {
    x: player.x + Number(offset?.x ?? 0),
    y: player.y + Number(offset?.y ?? 0)
  };
}

export function projectileSpreadAngleDeg(
  behaviorTemplate: string | undefined,
  runtimeParams: Record<string, unknown>
) {
  return Math.max(0, Number(runtimeParams.spread_angle_deg ?? 0));
}

export function projectileAngleStepDeg(
  behaviorTemplate: string | undefined,
  runtimeParams: Record<string, unknown>
) {
  return behaviorTemplate === "projectile" ? Math.max(0, Number(runtimeParams.angle_step ?? 0)) : 0;
}

export function defaultFrontendExtraProjectileSpreadAngle(projectileCount: number) {
  return Math.min(60, 12 * Math.max(0, Math.round(projectileCount) - 1));
}

export function projectileSpreadDirections(
  direction: WorldPoint,
  projectileCount: number,
  spreadAngleDeg: number,
  angleStepDeg = 0
) {
  const count = Math.max(1, Math.min(12, Math.round(projectileCount)));
  if (count === 1 || spreadAngleDeg <= 0) return Array.from({ length: count }, () => direction);
  const center = (count - 1) / 2;
  const defaultStep = spreadAngleDeg / Math.max(1, count - 1);
  const step = angleStepDeg > 0 ? Math.min(angleStepDeg, defaultStep) : defaultStep;
  return Array.from({ length: count }, (_, index) => {
    const angleDeg = (index - center) * step;
    return rotateDirection(direction, angleDeg);
  });
}

export function rotateDirection(direction: WorldPoint, angleDeg: number) {
  const radians = angleDeg * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: direction.x * cos - direction.y * sin,
    y: direction.x * sin + direction.y * cos
  };
}

export function hitVfxTargetId(event: Pick<SkillEvent, "target_entity" | "payload">) {
  const payloadTarget = event.payload?.target_entity ?? event.payload?.to_target;
  const value = Number(event.target_entity || payloadTarget);
  return Number.isFinite(value) ? value : undefined;
}

export function targetedEnemyForEvent<TEnemy extends Pick<ProjectileLifecycleEnemy, "x" | "y">>(
  event: Pick<SkillEvent, "target_entity" | "payload">,
  enemyById: Map<number, TEnemy>
) {
  const targetId = hitVfxTargetId(event);
  return targetId === undefined ? undefined : enemyById.get(targetId);
}

export function projectileIdFromEvent(event: Pick<SkillEvent, "payload">) {
  return typeof event.payload?.projectile_id === "string" ? event.payload.projectile_id : "";
}

export function shouldSuppressProjectileFollowup(
  event: Pick<SkillEvent, "target_entity" | "payload">,
  projectedEnemyHp: Map<number, number>,
  liveProjectileHits: Set<string>,
  deadProjectileHits: Set<string>,
  acceptedProjectileDamageTicks: Set<string>
) {
  const projectileId = projectileIdFromEvent(event);
  if (!projectileId) return false;
  if (isProjectileTickFollowup(event)) return !acceptedProjectileDamageTicks.has(projectileFollowupKey(event));
  const hitTargetKey = projectileTargetFollowupKey(event);
  if (hitTargetKey && deadProjectileHits.has(hitTargetKey)) return true;
  if (hitTargetKey && liveProjectileHits.has(hitTargetKey)) return false;
  const targetId = Number(event.target_entity);
  if (Number.isFinite(targetId) && (projectedEnemyHp.get(targetId) ?? 0) <= 0) return true;
  return false;
}

export function isProjectileTickFollowup(event: Pick<SkillEvent, "payload">) {
  return event.payload?.tick_time_ms !== undefined || event.payload?.tick_interval_ms !== undefined;
}

export function projectileFollowupKey(event: Pick<SkillEvent, "target_entity" | "payload">) {
  return [
    projectileIdFromEvent(event),
    String(event.target_entity ?? event.payload?.target_entity ?? ""),
    String(event.payload?.tick_time_ms ?? event.payload?.tick_interval_ms ?? "")
  ].join("|");
}

export function projectileTargetFollowupKey(event: Pick<SkillEvent, "target_entity" | "payload">) {
  const projectileId = projectileIdFromEvent(event);
  const targetId = Number(event.target_entity);
  if (!projectileId || !Number.isFinite(targetId)) return "";
  return `${projectileId}|${targetId}`;
}

export function anchorHitVfxsToTargets<THitVfx extends { targetId?: number; x: number; y: number }>(
  hitVfxs: THitVfx[],
  enemies: ProjectileLifecycleEnemy[]
) {
  if (hitVfxs.length === 0) return hitVfxs;
  const enemyById = new Map(enemies.map((enemy) => [enemy.id, enemy]));
  return hitVfxs.map((vfx) => {
    if (vfx.targetId === undefined) return vfx;
    const target = enemyById.get(vfx.targetId);
    if (!target) return vfx;
    return { ...vfx, x: target.x, y: target.y };
  });
}

export function anchorProjectilesToTargets<TBolt extends { targetId?: number; targetX: number; targetY: number; projectileVisualMode?: string }>(
  bolts: TBolt[],
  enemies: ProjectileLifecycleEnemy[],
  usesCanvasProjectileVfx: (bolt: TBolt) => boolean
) {
  if (bolts.length === 0) return bolts;
  const enemyById = new Map(enemies.map((enemy) => [enemy.id, enemy]));
  return bolts.map((bolt) => {
    const shouldAnchor = bolt.projectileVisualMode === "falling_arrow" || usesCanvasProjectileVfx(bolt);
    if (!shouldAnchor || bolt.targetId === undefined) return bolt;
    const target = enemyById.get(bolt.targetId);
    if (!target || Number(target.hp ?? 1) <= 0) return bolt;
    return { ...bolt, targetX: target.x, targetY: target.y };
  });
}

export function finishCompletedProjectileBody<TBolt extends {
  projectileId?: string;
  fadeDuration?: number;
  ttl: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  velocityX?: number;
  velocityY?: number;
}>(
  bolt: TBolt,
  completedHits: Map<string, WorldPoint>,
  defaultFadeDuration: number
): TBolt {
  const hit = bolt.projectileId ? completedHits.get(bolt.projectileId) : undefined;
  if (!hit) return bolt;
  const fadeDuration = Math.max(0, bolt.fadeDuration ?? defaultFadeDuration);
  return {
    ...bolt,
    x: hit.x,
    y: hit.y,
    targetX: hit.x,
    targetY: hit.y,
    velocityX: 0,
    velocityY: 0,
    ttl: Math.min(bolt.ttl, fadeDuration)
  };
}

export function capRuntimeVisualBudget<T>(items: T[], maxCount: number) {
  if (items.length <= maxCount) return items;
  return items.slice(items.length - maxCount);
}
