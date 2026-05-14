import type { GeneratedCellPoint, GeneratedCorridorEdge, GeneratedRoomNode } from "./mapGenerationTypes";
import type { SeededRandom } from "./seededRandom";
import type { GeneratedTopologyDraft } from "./topologyGenerator";

export function generateCorridors(draft: GeneratedTopologyDraft, rooms: GeneratedRoomNode[], rng: SeededRandom): GeneratedCorridorEdge[] {
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  return draft.corridors.map((edge, index) => {
    const from = roomById.get(edge.fromRoomId);
    const to = roomById.get(edge.toRoomId);
    if (!from || !to) throw new Error(`通道生成失败：找不到房间 ${edge.fromRoomId} 或 ${edge.toRoomId}。`);
    const start = roomDoorPoint(from, to);
    const end = roomDoorPoint(to, from);
    return {
      ...edge,
      path: corridorPath(
        start,
        end,
        rng.fork(`${edge.id}:${index}`),
        edge.width,
        rooms,
        from,
        to
      )
    };
  });
}

function roomDoorPoint(room: GeneratedRoomNode, target: GeneratedRoomNode): GeneratedCellPoint {
  const dx = target.centerX - room.centerX;
  const dy = target.centerY - room.centerY;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return {
      x: dx >= 0 ? room.x + room.width - 1 : room.x,
      y: Math.max(room.y, Math.min(room.y + room.height - 1, room.centerY))
    };
  }
  return {
    x: Math.max(room.x, Math.min(room.x + room.width - 1, room.centerX)),
    y: dy >= 0 ? room.y + room.height - 1 : room.y
  };
}

function corridorPath(
  from: GeneratedCellPoint,
  to: GeneratedCellPoint,
  rng: SeededRandom,
  width: number,
  rooms: GeneratedRoomNode[],
  fromRoom: GeneratedRoomNode,
  toRoom: GeneratedRoomNode
): GeneratedCellPoint[] {
  const midX = Math.round((from.x + to.x) / 2);
  const midY = Math.round((from.y + to.y) / 2);
  const randomMidX = midX + rng.int(-5, 5);
  const randomMidY = midY + rng.int(-5, 5);
  const candidates = [
    [from, { x: to.x, y: from.y }, to],
    [from, { x: from.x, y: to.y }, to],
    [from, { x: randomMidX, y: from.y }, { x: randomMidX, y: to.y }, to],
    [from, { x: from.x, y: randomMidY }, { x: to.x, y: randomMidY }, to],
    [from, { x: midX - 8, y: from.y }, { x: midX - 8, y: to.y }, to],
    [from, { x: midX + 8, y: from.y }, { x: midX + 8, y: to.y }, to],
    [from, { x: from.x, y: midY - 8 }, { x: to.x, y: midY - 8 }, to],
    [from, { x: from.x, y: midY + 8 }, { x: to.x, y: midY + 8 }, to]
  ];
  return candidates
    .map((path) => ({ path, score: corridorPathScore(path, width, rooms, fromRoom, toRoom) }))
    .sort((a, b) => a.score - b.score)[0]?.path ?? candidates[0];
}

function corridorPathScore(path: GeneratedCellPoint[], width: number, rooms: GeneratedRoomNode[], fromRoom: GeneratedRoomNode, toRoom: GeneratedRoomNode) {
  const rects = pathRects(path, width);
  let score = pathLength(path);
  for (const room of rooms) {
    if (room.roomType !== "dead_end") continue;
    const isEndpoint = room.id === fromRoom.id || room.id === toRoom.id;
    for (const rect of rects) {
      if (touchesExpandedRoom(rect, room, isEndpoint ? 0 : 1)) score += isEndpoint ? 25 : 10000;
      if (overlapsRoom(rect, room)) score += isEndpoint ? 0 : 50000;
    }
  }
  return score;
}

function pathRects(path: GeneratedCellPoint[], width: number) {
  const halfBefore = Math.floor((width - 1) / 2);
  const halfAfter = Math.ceil((width - 1) / 2);
  const rects: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  for (let index = 1; index < path.length; index += 1) {
    const from = path[index - 1];
    const to = path[index];
    if (from.x === to.x) {
      rects.push({ x1: from.x - halfBefore, y1: Math.min(from.y, to.y), x2: from.x + halfAfter, y2: Math.max(from.y, to.y) });
    } else if (from.y === to.y) {
      rects.push({ x1: Math.min(from.x, to.x), y1: from.y - halfBefore, x2: Math.max(from.x, to.x), y2: from.y + halfAfter });
    }
  }
  return rects;
}

function pathLength(path: GeneratedCellPoint[]) {
  return path.reduce((total, point, index) => {
    const previous = path[index - 1];
    return previous ? total + Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y) : total;
  }, 0);
}

function touchesExpandedRoom(rect: { x1: number; y1: number; x2: number; y2: number }, room: GeneratedRoomNode, padding: number) {
  return !(
    rect.x2 < room.x - padding
    || rect.x1 > room.x + room.width - 1 + padding
    || rect.y2 < room.y - padding
    || rect.y1 > room.y + room.height - 1 + padding
  );
}

function overlapsRoom(rect: { x1: number; y1: number; x2: number; y2: number }, room: GeneratedRoomNode) {
  return !(
    rect.x2 < room.x
    || rect.x1 > room.x + room.width - 1
    || rect.y2 < room.y
    || rect.y1 > room.y + room.height - 1
  );
}
