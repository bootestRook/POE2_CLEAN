import type { BakedBattleMapData } from "../bakedMapLoader";
import { clampToMapBounds, isMapPointWalkable } from "../bakedMapLoader";
import { FRONTEND_PHASE_DASH_BASE_GEM_ID } from "../data/playerDisplacementSkillData";
import type { PlayerRuntimeState, SkillEvent } from "../types/combatRuntimeTypes";
import type { Enemy } from "../types/enemyTypes";
import type { SkillPreview } from "../types/skillPreviewTypes";

export type PlayerDisplacementCooldowns = Record<string, number | undefined>;

type Point = { x: number; y: number };

export type PlayerDisplacementReleaseOptions = {
  skill: SkillPreview | null;
  player: PlayerRuntimeState;
  aimWorld: Point | null;
  map: BakedBattleMapData | null;
  enemies: Enemy[];
  nowMs: number;
  cooldowns: PlayerDisplacementCooldowns;
};

export type PlayerDisplacementReleaseResult = {
  released: boolean;
  reason?: "missing_skill" | "cooldown" | "blocked" | "invalid_direction";
  player: PlayerRuntimeState;
  events: SkillEvent[];
  readyAtMs?: number;
};

export function isPlayerDisplacementSkill(skill: SkillPreview | null | undefined) {
  if (!skill) return false;
  if (skill.base_gem_id === FRONTEND_PHASE_DASH_BASE_GEM_ID || skill.skill_package_id === FRONTEND_PHASE_DASH_BASE_GEM_ID) return true;
  const runtimeParams = skill.runtime_params ?? {};
  if (runtimeParams.player_displacement_skill === true) return true;
  const tags = skillTagSet(skill);
  return tags.has("movement") && tags.has("displacement") && Number(runtimeParams.displacement_distance_px ?? 0) > 0;
}

export function selectPlayerDisplacementSkill(skills: readonly SkillPreview[]) {
  const candidates = skills.filter(isPlayerDisplacementSkill);
  if (candidates.length === 0) return null;
  return candidates.sort(compareDisplacementSkillInstallOrder)[0];
}

export function releasePlayerDisplacementSkill({
  skill,
  player,
  aimWorld,
  map,
  enemies,
  nowMs,
  cooldowns
}: PlayerDisplacementReleaseOptions): PlayerDisplacementReleaseResult {
  if (!skill || !isPlayerDisplacementSkill(skill)) return { released: false, reason: "missing_skill", player, events: [] };
  const readyAtMs = cooldowns[skill.active_gem_instance_id] ?? 0;
  if (nowMs < readyAtMs) return { released: false, reason: "cooldown", player, events: [], readyAtMs };

  const direction = displacementDirection(player, aimWorld);
  if (!direction) return { released: false, reason: "invalid_direction", player, events: [] };

  const maxDistance = Math.max(1, Number(skill.runtime_params?.displacement_distance_px ?? 200));
  const destination = resolvePlayerDisplacementDestination(map, player, direction, maxDistance);
  const traveled = distance(player, destination);
  if (traveled < 1) return { released: false, reason: "blocked", player, events: [] };

  const nextPlayer = { ...player, x: destination.x, y: destination.y };
  const hitRadius = Math.max(1, Number(skill.runtime_params?.displacement_hit_radius ?? skill.hit?.hit_radius ?? 36));
  const maxTargets = Math.max(1, Math.round(Number(skill.runtime_params?.displacement_max_targets ?? 999)));
  const amount = Math.max(0, Number(skill.final_damage ?? skill.hit?.base_damage ?? 0));
  const damageType = String(skill.damage_type || "physical");
  const durationMs = Math.max(40, Math.round(Number(skill.runtime_params?.displacement_duration_ms ?? 160)));
  const targets = sweptDisplacementTargets(enemies, player, destination, hitRadius, maxTargets);
  const events = buildPlayerDisplacementEvents(skill, player, destination, direction, targets, amount, damageType, hitRadius, durationMs, nowMs);
  cooldowns[skill.active_gem_instance_id] = nowMs + Math.max(100, Number(skill.final_cooldown_ms ?? skill.base_cooldown_ms ?? 3000));
  return { released: true, player: nextPlayer, events, readyAtMs: cooldowns[skill.active_gem_instance_id] };
}

export function resolvePlayerDisplacementDestination(
  map: BakedBattleMapData | null,
  start: Point,
  direction: Point,
  maxDistance: number
) {
  if (!map) return { x: start.x + direction.x * maxDistance, y: start.y + direction.y * maxDistance };
  const normalized = normalizeDirection(direction);
  if (!normalized) return start;
  const step = Math.max(2, Math.min(8, map.meta.grid_size / 4));
  const steps = Math.max(1, Math.ceil(maxDistance / step));
  let lastWalkable = clampToMapBounds(map, start);
  for (let index = 1; index <= steps; index += 1) {
    const distancePx = Math.min(maxDistance, index * step);
    const candidate = clampToMapBounds(map, {
      x: start.x + normalized.x * distancePx,
      y: start.y + normalized.y * distancePx
    });
    if (!isMapPointWalkable(map, candidate.x, candidate.y)) break;
    lastWalkable = candidate;
  }
  return lastWalkable;
}

export function sweptDisplacementTargets(
  enemies: readonly Enemy[],
  start: Point,
  end: Point,
  radius: number,
  maxTargets: number
) {
  return enemies
    .map((enemy) => ({
      enemy,
      progress: rawSegmentProgress(enemy, start, end),
      distance: distancePointToSegment(enemy, start, end)
    }))
    .filter(({ enemy, progress, distance }) => enemy.hp > 0 && progress >= 0 && progress <= 1 && distance <= radius + enemyDisplacementRadius(enemy))
    .sort((left, right) => left.progress - right.progress || left.distance - right.distance || left.enemy.id - right.enemy.id)
    .slice(0, maxTargets)
    .map((item) => item.enemy);
}

function buildPlayerDisplacementEvents(
  skill: SkillPreview,
  start: Point,
  end: Point,
  direction: Point,
  targets: readonly Enemy[],
  amount: number,
  damageType: string,
  radius: number,
  durationMs: number,
  nowMs: number
): SkillEvent[] {
  const basePayload = {
    skill_id: skill.skill_package_id ?? skill.skill_template_id,
    skill_name: skill.name_text,
    damage_components: { [damageType]: amount },
    origin_world_position: start,
    impact_world_position: end,
    direction_world: direction,
    hit_radius: radius,
    radius,
    vfx_scale: 1
  };
  const base = {
    timestamp_ms: nowMs,
    source_entity: "player",
    target_entity: "",
    position: start,
    direction,
    delay_ms: 0,
    duration_ms: durationMs,
    amount: null,
    damage_type: damageType,
    skill_instance_id: skill.active_gem_instance_id,
    vfx_key: skill.visual_effect,
    sfx_key: "",
    reason_key: "player_displacement"
  };
  const events: SkillEvent[] = [{
    ...base,
    event_id: `${skill.active_gem_instance_id}.displacement.${Math.round(nowMs)}.trail`,
    type: "chain_segment",
    payload: {
      ...basePayload,
      start_position: start,
      end_position: end,
      segment_id: `${skill.active_gem_instance_id}.displacement.trail`,
      segment_index: 1,
      hit_at_ms: durationMs
    }
  }];
  for (const target of targets) {
    const hitPosition = closestPointOnSegment(target, start, end);
    const eventId = `${skill.active_gem_instance_id}.displacement.${Math.round(nowMs)}.${target.id}`;
    events.push({
      ...base,
      event_id: `${eventId}.damage`,
      type: "damage",
      target_entity: String(target.id),
      position: hitPosition,
      amount,
      payload: {
        ...basePayload,
        hit_world_position: hitPosition,
        target_world_position: { x: target.x, y: target.y },
        marker_id: `${eventId}.hit`
      }
    });
    events.push({
      ...base,
      event_id: `${eventId}.hit_vfx`,
      type: "hit_vfx",
      target_entity: String(target.id),
      position: hitPosition,
      amount,
      duration_ms: 220,
      payload: {
        ...basePayload,
        hit_world_position: hitPosition,
        impact_radius: radius,
        marker_id: `${eventId}.hit`
      }
    });
    events.push({
      ...base,
      event_id: `${eventId}.text`,
      type: "floating_text",
      target_entity: String(target.id),
      position: { x: target.x, y: target.y - 28 },
      amount,
      duration_ms: 800,
      payload: {
        ...basePayload,
        marker_id: `${eventId}.hit`
      }
    });
  }
  return events;
}

function compareDisplacementSkillInstallOrder(left: SkillPreview, right: SkillPreview) {
  return displacementInstallSequence(left) - displacementInstallSequence(right)
    || displacementBoardIndex(left) - displacementBoardIndex(right)
    || left.active_gem_instance_id.localeCompare(right.active_gem_instance_id);
}

function displacementInstallSequence(skill: SkillPreview) {
  const value = Number(skill.source_context?.board_mount_sequence ?? Number.POSITIVE_INFINITY);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function displacementBoardIndex(skill: SkillPreview) {
  const position = skill.source_context?.board_position as { row?: unknown; column?: unknown } | undefined;
  const row = Number(position?.row ?? Number.POSITIVE_INFINITY);
  const column = Number(position?.column ?? Number.POSITIVE_INFINITY);
  return (Number.isFinite(row) ? row : Number.POSITIVE_INFINITY) * 100 + (Number.isFinite(column) ? column : Number.POSITIVE_INFINITY);
}

function skillTagSet(skill: SkillPreview) {
  const tags = new Set<string>();
  for (const tag of skill.tags ?? []) {
    if (tag.id) tags.add(String(tag.id));
    tags.add(String(tag.text));
  }
  const runtimeTags = skill.runtime_params?.frontend_skill_tags;
  if (Array.isArray(runtimeTags)) {
    for (const tag of runtimeTags) tags.add(String(tag));
  }
  return tags;
}

function displacementDirection(player: Point, aimWorld: Point | null) {
  if (!aimWorld) return null;
  return normalizeDirection({ x: aimWorld.x - player.x, y: aimWorld.y - player.y });
}

function normalizeDirection(vector: Point) {
  const length = Math.hypot(vector.x, vector.y);
  if (!Number.isFinite(length) || length <= 0.0001) return null;
  return { x: vector.x / length, y: vector.y / length };
}

function distance(left: Point, right: Point) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function segmentProgress(point: Point, start: Point, end: Point) {
  return Math.max(0, Math.min(1, rawSegmentProgress(point, start, end)));
}

function rawSegmentProgress(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq <= 0) return 0;
  return ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq;
}

function closestPointOnSegment(point: Point, start: Point, end: Point) {
  const progress = segmentProgress(point, start, end);
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress
  };
}

function distancePointToSegment(point: Point, start: Point, end: Point) {
  return distance(point, closestPointOnSegment(point, start, end));
}

function enemyDisplacementRadius(enemy: Enemy) {
  const sizedEnemy = enemy as Enemy & { collisionRadius?: unknown; visualRadius?: unknown };
  return Math.max(8, Number(sizedEnemy.collisionRadius ?? sizedEnemy.visualRadius ?? 18));
}
