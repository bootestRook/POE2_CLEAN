import type { GeneratedCellPoint, GeneratedCorridorEdge, GeneratedRoomNode, GeneratedTileKind, GeneratedZone, GeneratedZoneRect } from "./mapGenerationTypes";

const ROOM_NAME_PREFIX = {
  entrance: "入口区域",
  normal_room: "普通房间",
  large_room: "大房间",
  dead_end: "死胡同",
  boss_room: "Boss 房"
};

export function buildGeneratedZones(rooms: GeneratedRoomNode[], corridors: GeneratedCorridorEdge[]): GeneratedZone[] {
  const counts = new Map<string, number>();
  const roomZones = rooms.map((room) => {
    const prefix = ROOM_NAME_PREFIX[room.roomType];
    const index = (counts.get(room.roomType) ?? 0) + 1;
    counts.set(room.roomType, index);
    const name = room.roomType === "boss_room" ? "Boss 房" : `${prefix} ${index}`;
    return {
      id: room.id,
      name,
      zoneType: room.zoneType,
      x: room.x,
      y: room.y,
      width: room.width,
      height: room.height,
      tags: room.tags,
      shape: "rectangle" as const,
      points: [{ x: room.x, y: room.y }, { x: room.x + room.width - 1, y: room.y + room.height - 1 }],
      rects: [{ start: { x: room.x, y: room.y }, end: { x: room.x + room.width - 1, y: room.y + room.height - 1 } }]
    };
  });
  const roomRects = rooms.map((room) => ({
    start: { x: room.x, y: room.y },
    end: { x: room.x + room.width - 1, y: room.y + room.height - 1 }
  }));
  const corridorZones = corridors.flatMap((corridor, index) => {
    const rects = corridorRects(corridor, roomRects);
    if (rects.length === 0) return [];
    const bounds = rectBounds(rects);
    return [{
      id: corridor.id,
      name: `通道 ${index + 1}`,
      zoneType: "corridor" as const,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      tags: corridor.tags,
      shape: "rectangle" as const,
      points: [{ x: bounds.x, y: bounds.y }, { x: bounds.x + bounds.width - 1, y: bounds.y + bounds.height - 1 }],
      rects
    }];
  });
  return [...roomZones, ...corridorZones];
}

export function chooseSpawn(rooms: GeneratedRoomNode[], tiles: GeneratedTileKind[][]): GeneratedCellPoint {
  const entrance = rooms.find((room) => room.roomType === "entrance") ?? rooms[0];
  const center = { x: entrance.centerX, y: entrance.centerY };
  if (tiles[center.y]?.[center.x] === "ground") return center;
  for (let radius = 1; radius <= Math.max(entrance.width, entrance.height); radius += 1) {
    for (let y = entrance.y; y < entrance.y + entrance.height; y += 1) {
      for (let x = entrance.x; x < entrance.x + entrance.width; x += 1) {
        if (Math.abs(x - center.x) + Math.abs(y - center.y) > radius) continue;
        if (tiles[y]?.[x] === "ground") return { x, y };
      }
    }
  }
  return center;
}

function corridorRects(corridor: GeneratedCorridorEdge, roomRects: GeneratedZoneRect[]): GeneratedZoneRect[] {
  const rects: GeneratedZoneRect[] = [];
  for (let index = 1; index < corridor.path.length; index += 1) {
    const from = corridor.path[index - 1];
    const to = corridor.path[index];
    const halfBefore = Math.floor((corridor.width - 1) / 2);
    const halfAfter = Math.ceil((corridor.width - 1) / 2);
    if (from.x === to.x) {
      rects.push({
        start: { x: from.x - halfBefore, y: Math.min(from.y, to.y) },
        end: { x: from.x + halfAfter, y: Math.max(from.y, to.y) }
      });
    } else {
      rects.push({
        start: { x: Math.min(from.x, to.x), y: from.y - halfBefore },
        end: { x: Math.max(from.x, to.x), y: from.y + halfAfter }
      });
    }
  }
  return rects
    .flatMap((rect) => subtractRoomRects(normalizeRect(rect), roomRects))
    .flatMap((rect) => splitLongRect(rect, 24))
    .filter((rect) => rect.end.x >= rect.start.x && rect.end.y >= rect.start.y);
}

function splitLongRect(rect: GeneratedZoneRect, maxLength: number): GeneratedZoneRect[] {
  const width = rect.end.x - rect.start.x + 1;
  const height = rect.end.y - rect.start.y + 1;
  if (width <= maxLength && height <= maxLength) return [rect];
  const pieces: GeneratedZoneRect[] = [];
  if (width >= height) {
    for (let x = rect.start.x; x <= rect.end.x; x += maxLength) {
      pieces.push({
        start: { x, y: rect.start.y },
        end: { x: Math.min(rect.end.x, x + maxLength - 1), y: rect.end.y }
      });
    }
    return pieces;
  }
  for (let y = rect.start.y; y <= rect.end.y; y += maxLength) {
    pieces.push({
      start: { x: rect.start.x, y },
      end: { x: rect.end.x, y: Math.min(rect.end.y, y + maxLength - 1) }
    });
  }
  return pieces;
}

function subtractRoomRects(rect: GeneratedZoneRect, roomRects: GeneratedZoneRect[]) {
  let pieces = [rect];
  for (const roomRect of roomRects) {
    pieces = pieces.flatMap((piece) => subtractRect(piece, normalizeRect(roomRect)));
    if (pieces.length === 0) break;
  }
  return pieces;
}

function subtractRect(rect: GeneratedZoneRect, blocker: GeneratedZoneRect): GeneratedZoneRect[] {
  const overlap = {
    start: {
      x: Math.max(rect.start.x, blocker.start.x),
      y: Math.max(rect.start.y, blocker.start.y)
    },
    end: {
      x: Math.min(rect.end.x, blocker.end.x),
      y: Math.min(rect.end.y, blocker.end.y)
    }
  };
  if (overlap.start.x > overlap.end.x || overlap.start.y > overlap.end.y) return [rect];
  const pieces: GeneratedZoneRect[] = [];
  if (rect.start.y <= overlap.start.y - 1) {
    pieces.push({ start: rect.start, end: { x: rect.end.x, y: overlap.start.y - 1 } });
  }
  if (overlap.end.y + 1 <= rect.end.y) {
    pieces.push({ start: { x: rect.start.x, y: overlap.end.y + 1 }, end: rect.end });
  }
  if (rect.start.x <= overlap.start.x - 1) {
    pieces.push({
      start: { x: rect.start.x, y: overlap.start.y },
      end: { x: overlap.start.x - 1, y: overlap.end.y }
    });
  }
  if (overlap.end.x + 1 <= rect.end.x) {
    pieces.push({
      start: { x: overlap.end.x + 1, y: overlap.start.y },
      end: { x: rect.end.x, y: overlap.end.y }
    });
  }
  return pieces;
}

function normalizeRect(rect: GeneratedZoneRect): GeneratedZoneRect {
  return {
    start: {
      x: Math.min(rect.start.x, rect.end.x),
      y: Math.min(rect.start.y, rect.end.y)
    },
    end: {
      x: Math.max(rect.start.x, rect.end.x),
      y: Math.max(rect.start.y, rect.end.y)
    }
  };
}

function rectBounds(rects: GeneratedZoneRect[]) {
  const xs = rects.flatMap((rect) => [rect.start.x, rect.end.x]);
  const ys = rects.flatMap((rect) => [rect.start.y, rect.end.y]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}
