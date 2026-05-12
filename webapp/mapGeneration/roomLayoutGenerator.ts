import { LAYOUT_CONFIG, MAP_SIZE_CONFIG, ROOM_SIZE_CONFIG } from "./mapGenerationConfig";
import type { GeneratedRoomNode, GeneratedRoomType } from "./mapGenerationTypes";
import type { SeededRandom } from "./seededRandom";
import type { GeneratedTopologyDraft } from "./topologyGenerator";

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function layoutRooms(draft: GeneratedTopologyDraft, rng: SeededRandom): GeneratedRoomNode[] {
  const placed: GeneratedRoomNode[] = [];
  for (const room of draft.rooms) {
    const size = roomSize(room.roomType, rng);
    const jitter = room.roomType === "entrance" || room.roomType === "boss_room" ? 3 : 6;
    const desired = {
      x: Math.round(room.anchorX + rng.int(-jitter, jitter) - size.width / 2),
      y: Math.round(room.anchorY + rng.int(-jitter, jitter) - size.height / 2),
      width: size.width,
      height: size.height
    };
    const rect = placeWithoutOverlap(desired, placed);
    placed.push({
      id: room.id,
      roomType: room.roomType,
      zoneType: room.zoneType,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      centerX: Math.floor(rect.x + rect.width / 2),
      centerY: Math.floor(rect.y + rect.height / 2),
      graphDepth: room.graphDepth,
      tags: room.tags
    });
  }
  return placed;
}

function roomSize(roomType: GeneratedRoomType, rng: SeededRandom) {
  const config = roomType === "normal_room"
    ? ROOM_SIZE_CONFIG.normalRoom
    : roomType === "large_room"
      ? ROOM_SIZE_CONFIG.largeRoom
      : roomType === "dead_end"
        ? ROOM_SIZE_CONFIG.deadEnd
        : roomType === "boss_room"
          ? ROOM_SIZE_CONFIG.bossRoom
          : ROOM_SIZE_CONFIG.entrance;
  return {
    width: rng.int(config.minWidth, Math.min(config.maxWidth, roomType === "large_room" || roomType === "boss_room" ? 22 : config.maxWidth)),
    height: rng.int(config.minHeight, Math.min(config.maxHeight, roomType === "large_room" || roomType === "boss_room" ? 18 : config.maxHeight))
  };
}

function placeWithoutOverlap(desired: Rect, placed: Rect[]): Rect {
  const start = clampRect(desired);
  if (!overlapsAny(start, placed)) return start;
  for (let radius = 4; radius <= LAYOUT_CONFIG.maxLayoutAttemptsPerGraph; radius += 4) {
    for (const direction of [
      { x: radius, y: 0 },
      { x: -radius, y: 0 },
      { x: 0, y: radius },
      { x: 0, y: -radius },
      { x: radius, y: radius },
      { x: -radius, y: radius },
      { x: radius, y: -radius },
      { x: -radius, y: -radius }
    ]) {
      const candidate = clampRect({ ...desired, x: desired.x + direction.x, y: desired.y + direction.y });
      if (!overlapsAny(candidate, placed)) return candidate;
    }
  }
  for (let y = LAYOUT_CONFIG.mapPadding; y < MAP_SIZE_CONFIG.height - desired.height - LAYOUT_CONFIG.mapPadding; y += desired.height + LAYOUT_CONFIG.minRoomGap + 2) {
    for (let x = LAYOUT_CONFIG.mapPadding; x < MAP_SIZE_CONFIG.width - desired.width - LAYOUT_CONFIG.mapPadding; x += desired.width + LAYOUT_CONFIG.minRoomGap + 2) {
      const candidate = clampRect({ ...desired, x, y });
      if (!overlapsAny(candidate, placed)) return candidate;
    }
  }
  throw new Error("房间布局失败：无法在地图内放置所有房间。");
}

function clampRect(rect: Rect): Rect {
  const maxX = MAP_SIZE_CONFIG.width - LAYOUT_CONFIG.mapPadding - rect.width;
  const maxY = MAP_SIZE_CONFIG.height - LAYOUT_CONFIG.mapPadding - rect.height;
  return {
    ...rect,
    x: Math.max(LAYOUT_CONFIG.mapPadding, Math.min(maxX, rect.x)),
    y: Math.max(LAYOUT_CONFIG.mapPadding, Math.min(maxY, rect.y))
  };
}

function overlapsAny(rect: Rect, placed: Rect[]) {
  return placed.some((item) => rectanglesOverlap(rect, item, LAYOUT_CONFIG.minRoomGap));
}

function rectanglesOverlap(a: Rect, b: Rect, gap: number) {
  return !(
    a.x + a.width + gap < b.x
    || b.x + b.width + gap < a.x
    || a.y + a.height + gap < b.y
    || b.y + b.height + gap < a.y
  );
}
