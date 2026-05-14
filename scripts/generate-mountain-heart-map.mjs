import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.resolve(root, "map/map_004.json");
const width = 256;
const height = 144;
const cellSize = 96;
const sx = 0.17;
const sy = 0.13;
const ox = 34;
const oy = 4;
const tiles = Array.from({ length: height }, () => Array.from({ length: width }, () => "empty"));

function p(x, y) {
  return { x: Math.round(x * sx + ox), y: Math.round(y * sy + oy) };
}

function fillPolygon(points, tile = "ground") {
  const mapped = points.map(([x, y]) => p(x, y));
  const minX = Math.max(0, Math.min(...mapped.map((point) => point.x)));
  const maxX = Math.min(width - 1, Math.max(...mapped.map((point) => point.x)));
  const minY = Math.max(0, Math.min(...mapped.map((point) => point.y)));
  const maxY = Math.min(height - 1, Math.max(...mapped.map((point) => point.y)));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (pointInPolygon({ x, y }, mapped)) tiles[y][x] = tile;
    }
  }
}

function fillCircle(cx, cy, radius, tile = "ground") {
  const center = p(cx, cy);
  const rx = Math.max(1, Math.round(radius * sx));
  const ry = Math.max(1, Math.round(radius * sy));
  for (let y = center.y - ry; y <= center.y + ry; y += 1) {
    for (let x = center.x - rx; x <= center.x + rx; x += 1) {
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const nx = (x - center.x) / rx;
      const ny = (y - center.y) / ry;
      if (nx * nx + ny * ny <= 1) tiles[y][x] = tile;
    }
  }
}

function strokePolyline(points, radius) {
  const mapped = points.map(([x, y]) => p(x, y));
  const r = Math.max(1, Math.round(radius * Math.max(sx, sy)));
  for (let index = 1; index < mapped.length; index += 1) {
    strokeSegment(mapped[index - 1], mapped[index], r);
  }
}

function fillSourceRect(x, y, w, h, tile = "ground") {
  fillPolygon([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], tile);
}

function strokeSegment(a, b, radius) {
  const minX = Math.max(0, Math.min(a.x, b.x) - radius);
  const maxX = Math.min(width - 1, Math.max(a.x, b.x) + radius);
  const minY = Math.max(0, Math.min(a.y, b.y) - radius);
  const maxY = Math.min(height - 1, Math.max(a.y, b.y) + radius);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy || 1;
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / lengthSq));
      const closestX = a.x + dx * t;
      const closestY = a.y + dy * t;
      const distance = Math.hypot(x - closestX, y - closestY);
      if (distance <= radius) tiles[y][x] = "ground";
    }
  }
}

function carveVoid(points) {
  fillPolygon(points, "empty");
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
    start: p(rect.x, rect.y),
    end: p(rect.x + rect.w, rect.y + rect.h)
  })).map((rect) => ({
    start: { x: Math.min(rect.start.x, rect.end.x), y: Math.min(rect.start.y, rect.end.y) },
    end: { x: Math.max(rect.start.x, rect.end.x), y: Math.max(rect.start.y, rect.end.y) }
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

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const a = polygon[index];
    const b = polygon[previous];
    const intersects = ((a.y > point.y) !== (b.y > point.y))
      && point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || 1) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

// Lower-left block with the same angled outline and inner hole as the reference.
fillPolygon([
  [28, 654], [58, 628], [78, 641], [108, 615], [146, 644], [184, 610],
  [224, 658], [218, 706], [250, 756], [204, 790], [162, 806], [118, 758],
  [76, 780], [70, 742], [38, 724]
]);
carveVoid([[126, 704], [174, 672], [198, 700], [156, 744]]);
fillSourceRect(52, 688, 44, 38);

// Long rising spine from bottom-left into the left cluster.
fillPolygon([
  [118, 604], [172, 552], [204, 514], [234, 472], [270, 498], [242, 542],
  [198, 592], [162, 632]
]);

// Left complex cluster and upper room.
fillPolygon([
  [86, 354], [132, 312], [166, 348], [206, 316], [248, 356], [264, 432],
  [210, 470], [164, 428], [112, 460], [78, 416]
]);
fillPolygon([
  [54, 368], [106, 320], [128, 344], [84, 392], [136, 438], [112, 458],
  [62, 414]
]);
fillPolygon([
  [210, 300], [282, 238], [324, 260], [360, 326], [322, 396], [258, 374]
]);
fillPolygon([
  [248, 168], [318, 108], [350, 130], [392, 104], [426, 142], [456, 132],
  [486, 168], [478, 220], [500, 250], [468, 286], [424, 274], [366, 306],
  [322, 284], [290, 312], [236, 264]
]);
fillSourceRect(298, 116, 70, 54);
carveVoid([[132, 354], [190, 320], [236, 376], [174, 418]]);
carveVoid([[268, 318], [350, 284], [402, 356], [318, 402]]);

// Middle bridge, central platform and bottom chip.
fillPolygon([
  [358, 384], [410, 442], [472, 454], [540, 406], [586, 456], [544, 526],
  [470, 560], [402, 518], [336, 540], [300, 474]
]);
fillPolygon([
  [410, 462], [474, 418], [520, 454], [464, 506]
]);
fillPolygon([
  [522, 426], [600, 366], [680, 372], [676, 448], [628, 492], [566, 482]
]);
fillPolygon([[384, 544], [438, 508], [476, 562], [406, 626]]);
carveVoid([[538, 474], [606, 430], [574, 512]]);

// Right-side large chamber, lower branch and upper exit.
fillPolygon([
  [668, 432], [708, 386], [696, 360], [738, 318], [778, 356], [838, 284],
  [878, 320], [860, 380], [902, 412], [862, 472], [806, 492], [770, 566],
  [704, 588], [656, 528]
]);
fillPolygon([
  [720, 398], [782, 338], [836, 372], [800, 448], [742, 464]
]);
fillPolygon([
  [690, 586], [748, 548], [812, 572], [826, 648], [766, 704], [704, 664]
]);
fillPolygon([
  [838, 282], [882, 226], [940, 176], [976, 210], [936, 278], [884, 338]
]);
fillPolygon([
  [928, 132], [1002, 70], [1058, 116], [1004, 188], [952, 224], [904, 172]
]);
fillSourceRect(944, 112, 74, 58);

// Connectivity strokes smooth the traced pieces without making long straight halls.
strokePolyline([[146, 612], [210, 540], [242, 470], [210, 402], [260, 350], [328, 292], [392, 252]], 20);
strokePolyline([[382, 330], [420, 404], [462, 474], [542, 466], [640, 420], [706, 430], [778, 356], [862, 292], [942, 202]], 20);
strokePolyline([[540, 466], [652, 520], [766, 618]], 18);
strokePolyline([[110, 660], [150, 612]], 20);
strokePolyline([[330, 300], [382, 330], [430, 384]], 24);

// Re-cut the two reference holes after smoothing strokes.
carveVoid([[132, 354], [190, 320], [236, 376], [174, 418]]);
carveVoid([[538, 474], [606, 430], [574, 512]]);
carveVoid([[126, 704], [174, 672], [198, 700], [156, 744]]);
carveVoid([[704, 384], [732, 354], [764, 380], [734, 410]]);

addWallsAroundGround();

const map = {
  format: "poe.tilemap.editor",
  version: 1,
  name: "map_004",
  savedAt: new Date().toISOString(),
  tiles,
  cellSize,
  spawn: p(72, 662),
  colliders: {
    empty: { enabled: true, x: 0, y: 0, width: 1, height: 1 },
    ground: { enabled: false, x: 0, y: 0, width: 1, height: 1 },
    wall: { enabled: true, x: 0, y: 0, width: 1, height: 1 }
  },
  zones: [
    zone("mountain_heart_entrance", "左下入口", "entrance", [{ x: 28, y: 630, w: 150, h: 140 }], ["reference", "start"]),
    zone("mountain_heart_left_cluster", "左侧复杂区", "large_room", [{ x: 82, y: 304, w: 190, h: 180 }], ["reference", "left"]),
    zone("mountain_heart_upper_cluster", "左上高地区", "main_room", [{ x: 236, y: 104, w: 264, h: 210 }], ["reference", "upper"]),
    zone("mountain_heart_mid_bridge", "中心桥接区", "main_room", [{ x: 300, y: 384, w: 280, h: 210 }], ["reference", "mid"]),
    zone("mountain_heart_center_platform", "中心平台", "large_room", [{ x: 522, y: 360, w: 170, h: 140 }], ["reference", "core"]),
    zone("mountain_heart_right_chamber", "右侧大厅", "large_room", [{ x: 650, y: 284, w: 250, h: 300 }], ["reference", "right"]),
    zone("mountain_heart_lower_right", "右下支路", "main_room", [{ x: 690, y: 548, w: 140, h: 150 }], ["reference", "lower"]),
    zone("mountain_heart_right_upper_exit", "右上出口", "boss_room", [{ x: 900, y: 70, w: 160, h: 160 }], ["reference", "exit"]),
    zone("mountain_heart_corridor_1", "左下上行通道", "corridor", [{ x: 118, y: 470, w: 150, h: 165 }], ["reference"]),
    zone("mountain_heart_corridor_2", "左中连接通道", "corridor", [{ x: 240, y: 250, w: 180, h: 120 }], ["reference"]),
    zone("mountain_heart_corridor_3", "中央连接通道", "corridor", [{ x: 382, y: 330, w: 280, h: 175 }], ["reference"]),
    zone("mountain_heart_corridor_4", "右侧上行通道", "corridor", [{ x: 760, y: 200, w: 200, h: 210 }], ["reference"])
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
