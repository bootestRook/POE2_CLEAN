import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
const sourcePath = path.resolve(root, "webapp/proceduralMapGeneration.ts");
const referencePath = path.resolve(root, "map/map_001.json");

const source = await fs.readFile(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    esModuleInterop: true
  }
}).outputText;

const sandbox = {
  exports: {},
  module: { exports: {} },
  require,
  console
};
sandbox.module.exports = sandbox.exports;
vm.runInNewContext(transpiled, sandbox, { filename: sourcePath });

const referenceDocument = JSON.parse(await fs.readFile(referencePath, "utf8"));
const { generateProceduralMapDocument, validateProceduralMapDocument } = sandbox.module.exports;
const result = generateProceduralMapDocument(seed, referenceDocument);
const validation = validateProceduralMapDocument(result.document, referenceDocument);

if (!validation.valid || result.usedFallback) {
  throw new Error(`Procedural map generation failed: ${validation.warnings.concat(result.warnings).join("; ")}`);
}

result.document.name = path.basename(outputPath, ".json");
result.document.savedAt = new Date().toISOString();

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(result.document, null, 2)}\n`, "utf8");

console.log(`Generated ${path.relative(root, outputPath)}`);
console.log(`seed=${seed}`);
console.log(`width=${result.metrics.width} height=${result.metrics.height} ground=${result.metrics.groundCells}`);
console.log(`zones=${result.document.zones.length}`);
