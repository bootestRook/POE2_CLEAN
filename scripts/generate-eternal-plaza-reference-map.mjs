import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.resolve(root, "map/map_002.json");
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

function carveCorridor(points, corridorWidth = 4) {
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (from.x === to.x) {
      fillRect(from.x - Math.floor(corridorWidth / 2), Math.min(from.y, to.y), corridorWidth, Math.abs(to.y - from.y) + 1);
    } else if (from.y === to.y) {
      fillRect(Math.min(from.x, to.x), from.y - Math.floor(corridorWidth / 2), Math.abs(to.x - from.x) + 1, corridorWidth);
    } else {
      carveCorridor([from, { x: to.x, y: from.y }, to], corridorWidth);
    }
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

const entrance = { x: 18, y: 23, w: 17, h: 10 };
const upperVestibule = { x: 39, y: 29, w: 24, h: 13 };
const centralRoom = { x: 56, y: 50, w: 20, h: 18 };
const lowerLeftRoom = { x: 35, y: 73, w: 28, h: 18 };
const middleRoom = { x: 82, y: 58, w: 16, h: 14 };
const plazaRects = [
  { x: 121, y: 52, w: 78, h: 48 },
  { x: 145, y: 40, w: 38, h: 13 },
  { x: 198, y: 63, w: 19, h: 30 },
  { x: 172, y: 96, w: 22, h: 15 },
  { x: 113, y: 73, w: 10, h: 20 }
];
const bossNook = { x: 181, y: 90, w: 11, h: 10 };

for (const rect of [entrance, upperVestibule, centralRoom, lowerLeftRoom, middleRoom, bossNook, ...plazaRects]) {
  fillRect(rect.x, rect.y, rect.w, rect.h);
}

carveCorridor([{ x: 34, y: 28 }, { x: 41, y: 28 }, { x: 41, y: 35 }], 4);
carveCorridor([{ x: 62, y: 36 }, { x: 70, y: 36 }, { x: 70, y: 52 }], 4);
carveCorridor([{ x: 66, y: 66 }, { x: 66, y: 82 }, { x: 62, y: 82 }], 4);
carveCorridor([{ x: 75, y: 59 }, { x: 83, y: 59 }], 4);
carveCorridor([{ x: 97, y: 65 }, { x: 113, y: 65 }, { x: 113, y: 83 }, { x: 121, y: 83 }], 4);
carveCorridor([{ x: 187, y: 92 }, { x: 187, y: 100 }], 4);

addWallsAroundGround();

const map = {
  format: "poe.tilemap.editor",
  version: 1,
  name: "map_002",
  savedAt: new Date().toISOString(),
  tiles,
  cellSize,
  spawn: { x: 26, y: 28 },
  colliders: {
    empty: { enabled: true, x: 0, y: 0, width: 1, height: 1 },
    ground: { enabled: false, x: 0, y: 0, width: 1, height: 1 },
    wall: { enabled: true, x: 0, y: 0, width: 1, height: 1 }
  },
  zones: [
    zone("eternal_plaza_entrance", "入口", "entrance", [entrance], ["reference", "start"]),
    zone("eternal_plaza_upper_vestibule", "上层折线路口", "main_room", [upperVestibule], ["reference", "left_path"]),
    zone("eternal_plaza_central_room", "中央收束区", "main_room", [centralRoom], ["reference", "mid_path"]),
    zone("eternal_plaza_lower_left_room", "左下支路房间", "main_room", [lowerLeftRoom], ["reference", "side_room"]),
    zone("eternal_plaza_middle_room", "中部小房间", "main_room", [middleRoom], ["reference", "mid_path"]),
    zone("eternal_plaza_main_square", "永眠广场", "large_room", plazaRects, ["reference", "plaza"]),
    zone("eternal_plaza_objective", "右下目标点", "boss_room", [bossNook], ["reference", "objective"]),
    zone("eternal_plaza_corridor_1", "折线通道 1", "corridor", [{ x: 34, y: 26, w: 10, h: 12 }], ["reference"]),
    zone("eternal_plaza_corridor_2", "折线通道 2", "corridor", [{ x: 62, y: 34, w: 11, h: 20 }], ["reference"]),
    zone("eternal_plaza_corridor_3", "下探通道", "corridor", [{ x: 62, y: 66, w: 7, h: 19 }], ["reference"]),
    zone("eternal_plaza_corridor_4", "中部接续通道", "corridor", [{ x: 75, y: 57, w: 10, h: 5 }], ["reference"]),
    zone("eternal_plaza_corridor_5", "广场入口通道", "corridor", [{ x: 97, y: 63, w: 20, h: 23 }], ["reference"])
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
