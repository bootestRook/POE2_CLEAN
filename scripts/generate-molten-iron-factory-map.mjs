import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.resolve(root, "map/map_003.json");
const width = 256;
const height = 144;
const cellSize = 96;
const tiles = Array.from({ length: height }, () => Array.from({ length: width }, () => "empty"));

function fillRect(x, y, w, h, tile = "ground") {
  const minX = Math.max(0, x);
  const maxX = Math.min(width - 1, x + w - 1);
  const minY = Math.max(0, y);
  const maxY = Math.min(height - 1, y + h - 1);
  for (let yy = minY; yy <= maxY; yy += 1) {
    for (let xx = minX; xx <= maxX; xx += 1) tiles[yy][xx] = tile;
  }
}

function carveCorridor(points, corridorWidth = 5) {
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (from.x === to.x) {
      fillRect(from.x - Math.floor(corridorWidth / 2), Math.min(from.y, to.y), corridorWidth, Math.abs(to.y - from.y) + 1);
      continue;
    }
    if (from.y === to.y) {
      fillRect(Math.min(from.x, to.x), from.y - Math.floor(corridorWidth / 2), Math.abs(to.x - from.x) + 1, corridorWidth);
      continue;
    }
    carveCorridor([from, { x: to.x, y: from.y }, to], corridorWidth);
  }
}

function addWallsAroundGround() {
  const walls = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (tiles[y][x] !== "empty") continue;
      const nearGround = [
        tiles[y - 1]?.[x - 1], tiles[y - 1]?.[x], tiles[y - 1]?.[x + 1],
        tiles[y]?.[x - 1], tiles[y]?.[x + 1],
        tiles[y + 1]?.[x - 1], tiles[y + 1]?.[x], tiles[y + 1]?.[x + 1]
      ].some((tile) => tile === "ground");
      if (nearGround) walls.push({ x, y });
    }
  }
  for (const wall of walls) tiles[wall.y][wall.x] = "wall";
}

function zone(id, name, zoneType, rects, tags = []) {
  const normalized = rects.map((rect) => ({
    start: { x: rect.x, y: rect.y },
    end: { x: rect.x + rect.w - 1, y: rect.y + rect.h - 1 }
  }));
  const minX = Math.min(...normalized.map((rect) => rect.start.x));
  const minY = Math.min(...normalized.map((rect) => rect.start.y));
  const maxX = Math.max(...normalized.map((rect) => rect.end.x));
  const maxY = Math.max(...normalized.map((rect) => rect.end.y));
  return {
    id,
    name,
    zoneType,
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    tags,
    shape: "rectangle",
    points: [{ x: minX, y: minY }, { x: maxX, y: maxY }],
    rects: normalized
  };
}

const entrance = { x: 30, y: 12, w: 16, h: 11 };
const upperGate = { x: 52, y: 27, w: 24, h: 13 };
const forgeCoreRects = [
  { x: 75, y: 44, w: 48, h: 34 },
  { x: 96, y: 30, w: 27, h: 16 },
  { x: 118, y: 48, w: 18, h: 22 },
  { x: 63, y: 56, w: 15, h: 16 }
];
const rightWorkshop = { x: 137, y: 54, w: 31, h: 21 };
const lowerCross = { x: 100, y: 86, w: 35, h: 15 };
const lowerLeft = { x: 50, y: 96, w: 28, h: 18 };
const lowerRight = { x: 146, y: 94, w: 33, h: 19 };
const bottomNook = { x: 92, y: 117, w: 20, h: 10 };
const leftDeadEnd = { x: 37, y: 70, w: 15, h: 12 };
const rightDeadEnd = { x: 186, y: 74, w: 15, h: 12 };
const bossNook = { x: 95, y: 76, w: 16, h: 12 };

for (const rect of [
  entrance,
  upperGate,
  ...forgeCoreRects,
  rightWorkshop,
  lowerCross,
  lowerLeft,
  lowerRight,
  bottomNook,
  leftDeadEnd,
  rightDeadEnd,
  bossNook
]) {
  fillRect(rect.x, rect.y, rect.w, rect.h);
}

carveCorridor([{ x: 42, y: 21 }, { x: 56, y: 21 }, { x: 56, y: 31 }], 5);
carveCorridor([{ x: 75, y: 34 }, { x: 88, y: 34 }, { x: 88, y: 44 }], 5);
carveCorridor([{ x: 121, y: 61 }, { x: 138, y: 61 }], 5);
carveCorridor([{ x: 101, y: 77 }, { x: 101, y: 88 }], 5);
carveCorridor([{ x: 101, y: 96 }, { x: 78, y: 104 }], 5);
carveCorridor([{ x: 132, y: 95 }, { x: 146, y: 101 }], 5);
carveCorridor([{ x: 102, y: 100 }, { x: 102, y: 117 }], 4);
carveCorridor([{ x: 63, y: 66 }, { x: 52, y: 76 }], 4);
carveCorridor([{ x: 168, y: 66 }, { x: 188, y: 80 }], 4);

addWallsAroundGround();

const map = {
  format: "poe.tilemap.editor",
  version: 1,
  name: "map_003",
  savedAt: new Date().toISOString(),
  tiles,
  cellSize,
  spawn: { x: 38, y: 17 },
  colliders: {
    empty: { enabled: true, x: 0, y: 0, width: 1, height: 1 },
    ground: { enabled: false, x: 0, y: 0, width: 1, height: 1 },
    wall: { enabled: true, x: 0, y: 0, width: 1, height: 1 }
  },
  zones: [
    zone("molten_factory_entrance", "入口", "entrance", [entrance], ["reference", "start"]),
    zone("molten_factory_upper_gate", "上层闸门", "main_room", [upperGate], ["reference", "upper"]),
    zone("molten_factory_core", "熔铁工厂核心", "large_room", forgeCoreRects, ["reference", "factory_core"]),
    zone("molten_factory_right_workshop", "右侧工坊", "main_room", [rightWorkshop], ["reference", "right"]),
    zone("molten_factory_lower_cross", "下层十字平台", "main_room", [lowerCross], ["reference", "lower"]),
    zone("molten_factory_lower_left", "左下支路", "main_room", [lowerLeft], ["reference", "lower"]),
    zone("molten_factory_lower_right", "右下支路", "main_room", [lowerRight], ["reference", "lower"]),
    zone("molten_factory_bottom_nook", "底部小室", "dead_end", [bottomNook], ["reference", "dead_end"]),
    zone("molten_factory_left_dead_end", "左侧死胡同", "dead_end", [leftDeadEnd], ["reference", "dead_end"]),
    zone("molten_factory_right_dead_end", "右侧死胡同", "dead_end", [rightDeadEnd], ["reference", "dead_end"]),
    zone("molten_factory_objective", "熔炉目标点", "boss_room", [bossNook], ["reference", "objective"]),
    zone("molten_factory_corridor_1", "入口接续通道", "corridor", [{ x: 42, y: 19, w: 17, h: 15 }], ["reference"]),
    zone("molten_factory_corridor_2", "上层接续通道", "corridor", [{ x: 75, y: 32, w: 16, h: 15 }], ["reference"]),
    zone("molten_factory_corridor_3", "右侧接续通道", "corridor", [{ x: 121, y: 59, w: 20, h: 5 }], ["reference"]),
    zone("molten_factory_corridor_4", "下层接续通道", "corridor", [{ x: 99, y: 77, w: 5, h: 23 }], ["reference"]),
    zone("molten_factory_corridor_5", "左下接续通道", "corridor", [{ x: 77, y: 94, w: 27, h: 13 }], ["reference"]),
    zone("molten_factory_corridor_6", "右下接续通道", "corridor", [{ x: 132, y: 93, w: 17, h: 11 }], ["reference"])
  ],
  width,
  height
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(map, null, 2)}\n`, "utf8");

const ground = tiles.flat().filter((tile) => tile === "ground").length;
console.log(`Generated ${path.relative(root, outputPath)}`);
console.log(`ground=${ground}`);
console.log(`zones=${map.zones.length}`);
