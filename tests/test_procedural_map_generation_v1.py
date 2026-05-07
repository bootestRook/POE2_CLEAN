from __future__ import annotations

import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _node_eval(script: str) -> dict[str, object]:
    out_dir = ROOT / ".vite" / "procedural-map-tests"
    out_dir.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "node",
            str(ROOT / "node_modules" / "typescript" / "bin" / "tsc"),
            "webapp/proceduralMapGeneration.ts",
            "webapp/mapSpawnRuntime.ts",
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
            str(out_dir),
            "--noEmitOnError",
            "true",
        ],
        cwd=ROOT,
        check=True,
        text=True,
    )
    output = subprocess.check_output(["node", "-e", script], cwd=ROOT, text=True)
    return json.loads(output)


def test_map_001_baseline_and_minimum_size_are_measured() -> None:
    result = _node_eval(
        r"""
const map001 = require("./map/map_001.json");
const { measureMapEditorDocument, minimumProceduralMapMetrics } = require("./.vite/procedural-map-tests/proceduralMapGeneration.js");
console.log(JSON.stringify({
  baseline: measureMapEditorDocument(map001),
  minimum: minimumProceduralMapMetrics(map001)
}));
"""
    )

    assert result["baseline"] == {"width": 256, "height": 144, "groundCells": 2286}
    assert result["minimum"] == {"width": 204, "height": 115, "groundCells": 1828}


def test_generated_map_is_deterministic_and_can_vary_by_seed() -> None:
    result = _node_eval(
        r"""
const map001 = require("./map/map_001.json");
const { generateProceduralMapDocument } = require("./.vite/procedural-map-tests/proceduralMapGeneration.js");
const a = generateProceduralMapDocument("seed-a", map001);
const b = generateProceduralMapDocument("seed-a", map001);
const c = generateProceduralMapDocument("seed-c", map001);
console.log(JSON.stringify({
  sameTiles: JSON.stringify(a.document.tiles) === JSON.stringify(b.document.tiles),
  sameZones: JSON.stringify(a.document.zones) === JSON.stringify(b.document.zones),
  sameSpawn: JSON.stringify(a.document.spawn) === JSON.stringify(b.document.spawn),
  differentSeedVaries: JSON.stringify(a.document.zones) !== JSON.stringify(c.document.zones)
    || a.metrics.groundCells !== c.metrics.groundCells,
  usedFallback: a.usedFallback || b.usedFallback || c.usedFallback
}));
"""
    )

    assert result["sameTiles"] is True
    assert result["sameZones"] is True
    assert result["sameSpawn"] is True
    assert result["differentSeedVaries"] is True
    assert result["usedFallback"] is False


def test_generated_map_has_required_regions_size_and_connectivity() -> None:
    result = _node_eval(
        r"""
const map001 = require("./map/map_001.json");
const {
  generateProceduralMapDocument,
  minimumProceduralMapMetrics,
  validateProceduralMapDocument
} = require("./.vite/procedural-map-tests/proceduralMapGeneration.js");
const generated = generateProceduralMapDocument("region-proof", map001);
const zones = generated.document.zones.reduce((counts, zone) => {
  counts[zone.zoneType] = (counts[zone.zoneType] || 0) + 1;
  return counts;
}, {});
const minimum = minimumProceduralMapMetrics(map001);
const validation = validateProceduralMapDocument(generated.document, map001);
console.log(JSON.stringify({
  usedFallback: generated.usedFallback,
  metrics: generated.metrics,
  minimum,
  zones,
  valid: validation.valid,
  warnings: validation.warnings
}));
"""
    )

    assert result["usedFallback"] is False
    assert result["valid"] is True
    assert result["warnings"] == []
    assert result["zones"]["entrance"] >= 4
    assert result["zones"]["boss_room"] >= 1
    assert result["zones"]["corridor"] > 0
    assert result["zones"]["main_room"] + result["zones"]["large_room"] > 0
    assert result["metrics"]["width"] >= result["minimum"]["width"]
    assert result["metrics"]["height"] >= result["minimum"]["height"]
    assert result["metrics"]["groundCells"] >= result["minimum"]["groundCells"]


def test_invalid_generated_candidates_fall_back_to_local_template() -> None:
    result = _node_eval(
        r"""
const map001 = require("./map/map_001.json");
const {
  DEFAULT_PROCEDURAL_MAP_PROFILE,
  generateProceduralMapDocument
} = require("./.vite/procedural-map-tests/proceduralMapGeneration.js");
const impossibleProfile = {
  ...DEFAULT_PROCEDURAL_MAP_PROFILE,
  minimumSizeRatio: 1.2,
  retryLimit: 1
};
const generated = generateProceduralMapDocument("impossible", map001, impossibleProfile);
console.log(JSON.stringify({
  usedFallback: generated.usedFallback,
  name: generated.document.name,
  metrics: generated.metrics,
  warningText: generated.warnings.join("\n")
}));
"""
    )

    assert result["usedFallback"] is True
    assert result["name"] == "map_001"
    assert result["metrics"] == {"width": 256, "height": 144, "groundCells": 2286}
    assert "fell back to the local map_001 template" in result["warningText"]


def test_generated_entrance_zones_remain_safe_for_spawn_runtime() -> None:
    result = _node_eval(
        r"""
const map001 = require("./map/map_001.json");
const { generateProceduralMapDocument } = require("./.vite/procedural-map-tests/proceduralMapGeneration.js");
const { generateProceduralMonsterSpawns } = require("./.vite/procedural-map-tests/mapSpawnRuntime.js");
const generated = generateProceduralMapDocument("spawn-runtime", map001).document;
const gridSize = generated.cellSize;
const point = (x, y) => ({ x: x * gridSize + gridSize / 2, y: y * gridSize + gridSize / 2, gridX: x, gridY: y });
const center = (zone) => {
  const rect = zone.rects[0];
  return point(
    Math.floor((Math.min(rect.start.x, rect.end.x) + Math.max(rect.start.x, rect.end.x)) / 2),
    Math.floor((Math.min(rect.start.y, rect.end.y) + Math.max(rect.start.y, rect.end.y)) / 2)
  );
};
const walkableGrid = generated.tiles.map((row) => row.map((tile) => tile === "ground"));
const blockerGrid = generated.tiles.map((row) => row.map((tile) => tile !== "ground"));
const walkablePoints = [];
for (let y = 0; y < generated.height; y += 1) {
  for (let x = 0; x < generated.width; x += 1) {
    if (walkableGrid[y][x]) walkablePoints.push(point(x, y));
  }
}
const zones = generated.zones.map((zone) => ({
  id: zone.id,
  zoneType: zone.zoneType,
  shape: zone.shape,
  points: zone.points.map((item) => point(item.x, item.y)),
  rects: zone.rects.map((rect) => ({ start: point(rect.start.x, rect.start.y), end: point(rect.end.x, rect.end.y) }))
}));
const bossPoints = generated.zones.filter((zone) => zone.zoneType === "boss_room").map(center);
const spawnMap = {
  id: "generated_spawn_map",
  displayName: "generated spawn map",
  meta: { grid_size: gridSize, world_width: generated.width * gridSize, world_height: generated.height * gridSize },
  gridWidth: generated.width,
  gridHeight: generated.height,
  walkableGrid,
  blockerGrid,
  walkablePoints,
  playerSpawn: point(generated.spawn.x, generated.spawn.y),
  enemySpawnPoints: generated.zones.filter((zone) => zone.zoneType !== "entrance").map(center),
  eliteSpawnPoints: [],
  bossPoints,
  exitPoints: [],
  zones
};
const config = {
  map_spawn_profiles: [{
    map_type: "default",
    base_pack_budget: 8,
    min_distance_from_player_spawn: 32,
    min_distance_between_packs: 1,
    max_active_packs: 3,
    max_boss_packs: 1,
    zone_rules: {
      entrance: { enabled: false, allowed_pack_tags: [] },
      corridor: { enabled: true, allowed_pack_tags: ["small"] },
      main_room: { enabled: true, allowed_pack_tags: ["small"] },
      large_room: { enabled: true, allowed_pack_tags: ["small"] },
      dead_end: { enabled: true, allowed_pack_tags: ["small"] },
      boss_room: { enabled: true, allowed_pack_tags: ["boss"], fixed_pack_id: "boss_pack" },
      exit_area: { enabled: true, allowed_pack_tags: ["small"] }
    }
  }],
  monster_packs: [
    { pack_id: "small_pack", tags: ["small"], weight: 1, budget_cost: 1, entries: [{ monster_id: "mon_100101", count_min: 1, count_max: 1 }] },
    { pack_id: "boss_pack", tags: ["boss"], weight: 1, budget_cost: 1, entries: [{ monster_id: "mon_400001", count_min: 1, count_max: 1, boss: true, boss_rarity: "legendary_boss" }] }
  ],
  monster_definitions: [
    { id: "mon_100101", base_life: 10, base_attack: 2, monster_type: "minion" },
    { id: "mon_400001", base_life: 100, base_attack: 8, monster_type: "tank", boss_pool: true, boss_rarity: "legendary_boss" }
  ],
  monster_rarity_rules: {
    normal_weight: 100,
    magic_weight: 0,
    rare_weight: 0,
    max_rare_per_map: 0,
    max_magic_packs_per_map: 0,
    magic_allowed_zone_types: [],
    rare_allowed_zone_types: [],
    multipliers: {
      normal: { life_multiplier: 1, damage_multiplier: 1 },
      magic: { life_multiplier: 1, damage_multiplier: 1 },
      rare: { life_multiplier: 1, damage_multiplier: 1 },
      boss: { life_multiplier: 1, damage_multiplier: 1 },
      legendary_boss: { life_multiplier: 1, damage_multiplier: 1 },
      supreme_boss: { life_multiplier: 1, damage_multiplier: 1 }
    }
  }
};
const spawn = generateProceduralMonsterSpawns(spawnMap, config, { seed: "generated-spawn", maxCandidatePoints: 20 });
const acceptedZones = spawn.debug.spawn_points.filter((item) => item.accepted).map((item) => item.zone_type);
console.log(JSON.stringify({
  enemyCount: spawn.enemies.length,
  acceptedZones,
  hasBoss: spawn.enemies.some((enemy) => enemy.boss && enemy.zone_type === "boss_room"),
  acceptedEntrance: acceptedZones.includes("entrance")
}));
"""
    )

    assert result["enemyCount"] > 0
    assert result["acceptedEntrance"] is False
    assert result["hasBoss"] is True


def test_map_editor_json_generator_writes_valid_preview_file(tmp_path: Path) -> None:
    output_path = tmp_path / "procedural_map_v1.json"
    completed = subprocess.run(
        [
            "node",
            str(ROOT / "scripts" / "generate-procedural-map-json.mjs"),
            "--seed",
            "pytest-map-editor-preview",
            "--out",
            str(output_path),
        ],
        cwd=ROOT,
        check=True,
        text=True,
        capture_output=True,
    )
    generated = json.loads(output_path.read_text(encoding="utf-8"))
    zone_counts: dict[str, int] = {}
    for zone in generated["zones"]:
        zone_type = zone["zoneType"]
        zone_counts[zone_type] = zone_counts.get(zone_type, 0) + 1

    assert "Generated" in completed.stdout
    assert generated["format"] == "poe.tilemap.editor"
    assert generated["version"] == 1
    assert generated["name"] == "procedural_map_v1"
    assert generated["width"] >= 204
    assert generated["height"] >= 115
    assert sum(1 for row in generated["tiles"] for tile in row if tile == "ground") >= 1828
    assert zone_counts["entrance"] >= 4
    assert zone_counts["boss_room"] >= 1


def test_procedural_map_json_generation_is_not_registered_as_playable_template() -> None:
    app_source = (ROOT / "webapp" / "App.tsx").read_text(encoding="utf-8")
    registry_source = (ROOT / "webapp" / "mapTemplateRegistry.ts").read_text(encoding="utf-8")

    assert "createAuthoredMapTemplateDocument" not in app_source
    assert "runtimeDebugMapTemplateId" not in app_source
    assert "debugMapTemplate" not in app_source
    assert "generateProceduralMapDocument" not in registry_source
    assert "procedural_map_v1" not in registry_source
    assert 'requestState("/api/map/start"' not in app_source
    assert 'requestState("/api/combat/tick"' not in app_source
    assert 'requestState("/api/save/restore", { save })' not in app_source
