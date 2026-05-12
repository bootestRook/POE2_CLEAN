import { CORRIDOR_CONFIG, ROOM_COUNT_CONFIG } from "./mapGenerationConfig";
import type { GeneratedCorridorEdge, GeneratedMapGraph, GeneratedRoomNode, GeneratedRoomType, MapTopologyPreset } from "./mapGenerationTypes";
import type { SeededRandom } from "./seededRandom";

type RoomDraft = Omit<GeneratedRoomNode, "x" | "y" | "width" | "height" | "centerX" | "centerY"> & {
  anchorX: number;
  anchorY: number;
};

type EdgeDraft = Omit<GeneratedCorridorEdge, "path">;

export type GeneratedTopologyDraft = {
  seed: string;
  topologyPreset: MapTopologyPreset;
  rooms: RoomDraft[];
  corridors: EdgeDraft[];
  entranceRoomIds: string[];
  bossRoomId: string;
  mainPathRoomIds: string[];
};

type RoomCounts = {
  entrance: number;
  normal: number;
  large: number;
  deadEnd: number;
};

export function generateTopologyDraft(seed: string, topologyPreset: MapTopologyPreset, rng: SeededRandom): GeneratedTopologyDraft {
  const counts = {
    entrance: ROOM_COUNT_CONFIG.entrance.minCount,
    normal: rng.int(ROOM_COUNT_CONFIG.normalRoom.minCount, Math.min(ROOM_COUNT_CONFIG.normalRoom.minCount + 1, ROOM_COUNT_CONFIG.normalRoom.maxCount)),
    large: ROOM_COUNT_CONFIG.largeRoom.minCount,
    deadEnd: ROOM_COUNT_CONFIG.deadEnd.minCount
  };
  if (topologyPreset === "hub_spoke") return generateHubSpoke(seed, topologyPreset, counts, rng);
  if (topologyPreset === "loop_with_branches") return generateLoopWithBranches(seed, topologyPreset, counts, rng);
  return generateMainPathBranches(seed, topologyPreset, counts, rng);
}

export function finalizeTopologyGraph(draft: GeneratedTopologyDraft, rooms: GeneratedRoomNode[], corridors: GeneratedCorridorEdge[]): GeneratedMapGraph {
  return {
    seed: draft.seed,
    topologyPreset: draft.topologyPreset,
    rooms,
    corridors,
    entranceRoomIds: draft.entranceRoomIds,
    bossRoomId: draft.bossRoomId,
    mainPathRoomIds: draft.mainPathRoomIds
  };
}

function generateHubSpoke(seed: string, topologyPreset: MapTopologyPreset, counts: RoomCounts, rng: SeededRandom): GeneratedTopologyDraft {
  const rooms: RoomDraft[] = [];
  const corridors: EdgeDraft[] = [];
  const entranceRoomIds: string[] = [];
  const mainPathRoomIds: string[] = [];
  const hub = addRoom(rooms, "large_room", "hub", 116, 72, 1, ["hub", "large_room"]);
  mainPathRoomIds.push(hub.id);

  const entranceAnchors = [
    [30, 72], [54, 31], [54, 113], [118, 22], [32, 36], [32, 108]
  ];
  for (let index = 0; index < counts.entrance; index += 1) {
    const [x, y] = entranceAnchors[index];
    const room = addRoom(rooms, "entrance", `entrance_${index + 1}`, x, y, 0, ["entrance"]);
    entranceRoomIds.push(room.id);
    addEdge(corridors, room.id, hub.id, `corridor_${room.id}_hub`, CORRIDOR_CONFIG.branchPathWidth, ["entrance"]);
  }

  const branchAnchors = [
    [153, 42], [153, 72], [153, 103], [188, 34], [190, 79], [190, 118],
    [89, 35], [88, 110], [221, 82], [218, 116], [130, 119], [133, 27]
  ];
  const branchRooms = createMixedRooms(rooms, counts, branchAnchors, 1, rng);
  const pathRooms = branchRooms.filter((room) => room.roomType !== "dead_end").slice(0, 5);
  for (let index = 0; index < pathRooms.length; index += 1) {
    const previous = index === 0 ? hub : pathRooms[index - 1];
    const current = pathRooms[index];
    const isMain = index < Math.min(4, pathRooms.length);
    if (isMain) mainPathRoomIds.push(current.id);
    addEdge(corridors, previous.id, current.id, `corridor_${previous.id}_${current.id}`, isMain ? CORRIDOR_CONFIG.mainPathWidth : CORRIDOR_CONFIG.branchPathWidth, isMain ? ["main_path"] : ["branch"]);
    if (current.roomType === "large_room") addEdge(corridors, hub.id, current.id, `corridor_hub_extra_${current.id}`, CORRIDOR_CONFIG.branchPathWidth, ["branch", "large_room"]);
  }
  branchRooms
    .filter((room) => !pathRooms.includes(room))
    .forEach((room, index) => {
      const parent = room.roomType === "dead_end" ? (pathRooms[index % Math.max(1, pathRooms.length)] ?? hub) : hub;
      addEdge(corridors, parent.id, room.id, `corridor_branch_${index + 1}_${room.id}`, CORRIDOR_CONFIG.branchPathWidth, ["branch"]);
      if (room.roomType === "large_room") addEdge(corridors, room.id, pathRooms[(index + 1) % pathRooms.length]?.id ?? hub.id, `corridor_large_extra_${room.id}`, CORRIDOR_CONFIG.branchPathWidth, ["branch", "large_room"]);
    });

  const boss = addRoom(rooms, "boss_room", "boss", 224, 42, 8, ["boss"]);
  mainPathRoomIds.push(boss.id);
  const bossParent = pathRooms.find((room) => room.roomType !== "dead_end") ?? hub;
  addEdge(corridors, bossParent.id, boss.id, "corridor_boss_access", CORRIDOR_CONFIG.mainPathWidth, ["main_path", "boss_access"]);
  return { seed, topologyPreset, rooms, corridors, entranceRoomIds, bossRoomId: boss.id, mainPathRoomIds };
}

function generateMainPathBranches(seed: string, topologyPreset: MapTopologyPreset, counts: RoomCounts, rng: SeededRandom): GeneratedTopologyDraft {
  const rooms: RoomDraft[] = [];
  const corridors: EdgeDraft[] = [];
  const entranceRoomIds: string[] = [];
  const mainPathRoomIds: string[] = [];
  const entranceAnchors = [[25, 72], [44, 35], [44, 111], [83, 20], [24, 105], [24, 39]];
  for (let index = 0; index < counts.entrance; index += 1) {
    const [x, y] = entranceAnchors[index];
    const room = addRoom(rooms, "entrance", `entrance_${index + 1}`, x, y, 0, ["entrance"]);
    entranceRoomIds.push(room.id);
  }

  const pathAnchors = [[70, 72], [99, 57], [126, 82], [155, 62], [184, 84], [210, 63]];
  const pathRooms = pathAnchors.map(([x, y], index) => {
    const roomType: GeneratedRoomType = index === 2 || index === 4 ? "large_room" : "normal_room";
    return addRoom(rooms, roomType, `main_${index + 1}`, x, y, index + 1, ["main_path"]);
  });
  pathRooms.forEach((room) => mainPathRoomIds.push(room.id));

  entranceRoomIds.forEach((id, index) => {
    const target = pathRooms[Math.min(pathRooms.length - 1, index % 3)];
    addEdge(corridors, id, target.id, `corridor_${id}_${target.id}`, CORRIDOR_CONFIG.branchPathWidth, ["entrance"]);
  });
  for (let index = 1; index < pathRooms.length; index += 1) {
    addEdge(corridors, pathRooms[index - 1].id, pathRooms[index].id, `corridor_main_${index}`, CORRIDOR_CONFIG.mainPathWidth, ["main_path"]);
  }

  const branchAnchors = [[92, 25], [101, 111], [139, 29], [145, 118], [178, 34], [199, 115], [61, 116], [60, 30], [166, 103], [118, 101]];
  const branchRooms = createMixedRooms(rooms, counts, branchAnchors, 2, rng, pathRooms.filter((room) => room.roomType === "normal_room").length);
  branchRooms.forEach((room, index) => {
    const parent = pathRooms[(index + 1) % pathRooms.length];
    addEdge(corridors, parent.id, room.id, `corridor_branch_${index + 1}`, CORRIDOR_CONFIG.branchPathWidth, ["branch"]);
    if (room.roomType === "large_room") {
      const secondParent = pathRooms[(index + 3) % pathRooms.length];
      addEdge(corridors, secondParent.id, room.id, `corridor_large_branch_${index + 1}`, CORRIDOR_CONFIG.branchPathWidth, ["branch", "large_room"]);
    }
  });

  const boss = addRoom(rooms, "boss_room", "boss", 229, 64, 9, ["boss"]);
  mainPathRoomIds.push(boss.id);
  addEdge(corridors, pathRooms[pathRooms.length - 1].id, boss.id, "corridor_boss_access", CORRIDOR_CONFIG.mainPathWidth, ["main_path", "boss_access"]);
  return { seed, topologyPreset, rooms, corridors, entranceRoomIds, bossRoomId: boss.id, mainPathRoomIds };
}

function generateLoopWithBranches(seed: string, topologyPreset: MapTopologyPreset, counts: RoomCounts, rng: SeededRandom): GeneratedTopologyDraft {
  const rooms: RoomDraft[] = [];
  const corridors: EdgeDraft[] = [];
  const entranceRoomIds: string[] = [];
  const mainPathRoomIds: string[] = [];
  const loopRooms = [
    addRoom(rooms, "normal_room", "loop_1", 88, 50, 2, ["loop", "main_path"]),
    addRoom(rooms, "large_room", "loop_2", 129, 43, 3, ["loop", "main_path"]),
    addRoom(rooms, "normal_room", "loop_3", 162, 76, 4, ["loop", "main_path"]),
    addRoom(rooms, "normal_room", "loop_4", 122, 103, 5, ["loop", "main_path"])
  ];
  loopRooms.forEach((room) => mainPathRoomIds.push(room.id));
  for (let index = 0; index < loopRooms.length; index += 1) {
    const next = loopRooms[(index + 1) % loopRooms.length];
    addEdge(corridors, loopRooms[index].id, next.id, `corridor_loop_${index + 1}`, CORRIDOR_CONFIG.mainPathWidth, ["loop", "main_path"]);
  }

  const entranceAnchors = [[30, 70], [55, 30], [52, 113], [121, 20], [31, 36], [31, 108]];
  for (let index = 0; index < counts.entrance; index += 1) {
    const [x, y] = entranceAnchors[index];
    const room = addRoom(rooms, "entrance", `entrance_${index + 1}`, x, y, 0, ["entrance"]);
    entranceRoomIds.push(room.id);
    addEdge(corridors, room.id, loopRooms[index % loopRooms.length].id, `corridor_${room.id}_loop`, CORRIDOR_CONFIG.branchPathWidth, ["entrance"]);
  }

  const branchAnchors = [[86, 112], [85, 22], [159, 24], [180, 112], [210, 98], [200, 38], [136, 122], [54, 93], [186, 72], [103, 82]];
  const branchRooms = createMixedRooms(rooms, counts, branchAnchors, 1, rng, loopRooms.length);
  branchRooms.forEach((room, index) => {
    const parent = loopRooms[index % loopRooms.length];
    addEdge(corridors, parent.id, room.id, `corridor_loop_branch_${index + 1}`, CORRIDOR_CONFIG.branchPathWidth, ["branch"]);
    if (room.roomType === "large_room") {
      const secondParent = loopRooms[(index + 2) % loopRooms.length];
      addEdge(corridors, secondParent.id, room.id, `corridor_loop_large_${index + 1}`, CORRIDOR_CONFIG.branchPathWidth, ["branch", "large_room"]);
    }
  });

  const boss = addRoom(rooms, "boss_room", "boss", 223, 64, 8, ["boss"]);
  mainPathRoomIds.push(boss.id);
  addEdge(corridors, loopRooms[2].id, boss.id, "corridor_boss_access", CORRIDOR_CONFIG.mainPathWidth, ["boss_access"]);
  return { seed, topologyPreset, rooms, corridors, entranceRoomIds, bossRoomId: boss.id, mainPathRoomIds };
}

function createMixedRooms(
  rooms: RoomDraft[],
  counts: RoomCounts,
  anchors: number[][],
  existingLarge: number,
  rng: SeededRandom,
  existingNormal = 0
) {
  const created: RoomDraft[] = [];
  const normalTarget = Math.max(0, counts.normal - existingNormal);
  const largeTarget = Math.max(0, counts.large - existingLarge);
  const deadTarget = counts.deadEnd;
  const sequence: GeneratedRoomType[] = [
    ...Array.from({ length: largeTarget }, () => "large_room" as const),
    ...Array.from({ length: normalTarget }, () => "normal_room" as const),
    ...Array.from({ length: deadTarget }, () => "dead_end" as const)
  ];
  sequence.forEach((roomType, index) => {
    const [x, y] = anchors[index % anchors.length];
    created.push(addRoom(rooms, roomType, `${roomType}_${index + 1}`, x, y, 4 + index, [roomType === "dead_end" ? "dead_end" : "branch"]));
  });
  return created;
}

function addRoom(rooms: RoomDraft[], roomType: GeneratedRoomType, suffix: string, anchorX: number, anchorY: number, graphDepth: number, tags: string[]): RoomDraft {
  const room: RoomDraft = {
    id: `room_${suffix}`,
    roomType,
    zoneType: roomType === "normal_room" ? "main_room" : roomType,
    anchorX,
    anchorY,
    graphDepth,
    tags
  };
  rooms.push(room);
  return room;
}

function addEdge(corridors: EdgeDraft[], fromRoomId: string, toRoomId: string, id: string, width: number, tags: string[]) {
  if (fromRoomId === toRoomId) return;
  if (corridors.some((edge) => (
    (edge.fromRoomId === fromRoomId && edge.toRoomId === toRoomId)
    || (edge.fromRoomId === toRoomId && edge.toRoomId === fromRoomId)
  ))) return;
  corridors.push({
    id,
    fromRoomId,
    toRoomId,
    width,
    zoneType: "corridor",
    tags
  });
}
