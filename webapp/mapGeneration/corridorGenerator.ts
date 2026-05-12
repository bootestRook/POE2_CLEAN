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
        rng.fork(`${edge.id}:${index}`)
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

function corridorPath(from: GeneratedCellPoint, to: GeneratedCellPoint, rng: SeededRandom): GeneratedCellPoint[] {
  const style = rng.int(0, 3);
  if (style === 0) {
    return [from, { x: to.x, y: from.y }, to];
  }
  if (style === 1) {
    return [from, { x: from.x, y: to.y }, to];
  }
  if (style === 2) {
    const midX = Math.round((from.x + to.x) / 2) + rng.int(-5, 5);
    return [from, { x: midX, y: from.y }, { x: midX, y: to.y }, to];
  }
  const midY = Math.round((from.y + to.y) / 2) + rng.int(-5, 5);
  return [from, { x: from.x, y: midY }, { x: to.x, y: midY }, to];
}
