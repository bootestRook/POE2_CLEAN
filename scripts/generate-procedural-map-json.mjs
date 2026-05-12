import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);
const args = new Map();

for (let index = 2; index < process.argv.length; index += 1) {
  const value = process.argv[index];
  if (!value.startsWith("--")) continue;
  const key = value.slice(2);
  const next = process.argv[index + 1];
  if (next && !next.startsWith("--")) {
    args.set(key, next);
    index += 1;
  } else {
    args.set(key, "1");
  }
}

const seed = args.get("seed") ?? "map-editor-preview";
const outputPath = path.resolve(root, args.get("out") ?? "map/procedural_map_v1.json");
const topologyPreset = args.get("topology");
const sourcePath = path.resolve(root, "webapp/proceduralMapGeneration.ts");
const outDir = path.resolve(root, ".vite/procedural-map-json");

await fs.rm(outDir, { recursive: true, force: true });
await execFileAsync(
  process.execPath,
  [
    path.resolve(root, "node_modules/typescript/bin/tsc"),
    sourcePath,
    "--target",
    "ES2020",
    "--module",
    "CommonJS",
    "--moduleResolution",
    "Node",
    "--skipLibCheck",
    "--esModuleInterop",
    "--resolveJsonModule",
    "--outDir",
    outDir,
    "--noEmitOnError",
    "true"
  ],
  { cwd: root }
);

const { generateProceduralEditorMap } = require(path.resolve(outDir, "proceduralMapGeneration.js"));
const result = generateProceduralEditorMap({ seed, topologyPreset });

if (!result.validation.ok) {
  throw new Error(`程序化地图生成失败：${result.debugText.join("; ")}`);
}

result.map.name = path.basename(outputPath, ".json");
result.map.savedAt = new Date().toISOString();

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(result.map, null, 2)}\n`, "utf8");

console.log(`Generated ${path.relative(root, outputPath)}`);
console.log(`seed=${seed}`);
console.log(`topology=${result.graph.topologyPreset}`);
console.log(`width=${result.validation.stats.width} height=${result.validation.stats.height} ground=${result.validation.stats.groundTileCount}`);
console.log(`zones=${result.map.zones.length}`);
