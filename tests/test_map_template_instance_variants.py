from __future__ import annotations

import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _node_eval(script: str) -> dict[str, object]:
    out_dir = ROOT / ".vite" / "map-instance-tests"
    out_dir.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "node",
            str(ROOT / "node_modules" / "typescript" / "bin" / "tsc"),
            "webapp/mapInstanceRuntime.ts",
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


def test_four_way_rotation_transforms_rectangular_grid() -> None:
    result = _node_eval(
        r"""
const { rotateGrid, rotateCellPoint, rotatedGridSize } = require("./.vite/map-instance-tests/mapInstanceRuntime.js");
const grid = [["a", "b", "c"], ["d", "e", "f"]];
console.log(JSON.stringify({
  size90: rotatedGridSize(3, 2, 90),
  grid90: rotateGrid(grid, 90),
  grid180: rotateGrid(grid, 180),
  p90: rotateCellPoint({ x: 2, y: 1 }, 3, 2, 90),
  p270: rotateCellPoint({ x: 2, y: 1 }, 3, 2, 270)
}));
"""
    )

    assert result["size90"] == {"width": 2, "height": 3}
    assert result["grid90"] == [["d", "a"], ["e", "b"], ["f", "c"]]
    assert result["grid180"] == [["f", "e", "d"], ["c", "b", "a"]]
    assert result["p90"] == {"x": 0, "y": 2}
    assert result["p270"] == {"x": 1, "y": 0}


def test_template_choice_and_spawn_region_hooks_are_deterministic() -> None:
    result = _node_eval(
        r"""
const { chooseAuthoredMapTemplateId, chooseIndex, chooseMapInstanceRotation } = require("./.vite/map-instance-tests/mapInstanceRuntime.js");
console.log(JSON.stringify({
  templateA: chooseAuthoredMapTemplateId(["map_001", "missing", "map_004"], ["map_001", "map_004"], "seed-a", "map_001"),
  templateB: chooseAuthoredMapTemplateId(["missing"], ["map_001"], "seed-b", "map_001"),
  spawnA: chooseIndex(3, "spawn-seed"),
  spawnB: chooseIndex(3, "spawn-seed"),
  rotation: chooseMapInstanceRotation("rotation-seed", [0, 90, 180, 270])
}));
"""
    )

    assert result["templateA"] in {"map_001", "map_004"}
    assert result["templateB"] == "map_001"
    assert result["spawnA"] == result["spawnB"]
    assert result["rotation"] in {0, 90, 180, 270}


def test_procedural_spawn_uses_transformed_player_spawn_and_zones() -> None:
    result = _node_eval(
        r"""
const { generateProceduralMonsterSpawns } = require("./.vite/map-instance-tests/mapSpawnRuntime.js");
const gridSize = 32;
const point = (x, y) => ({ x: x * gridSize + gridSize / 2, y: y * gridSize + gridSize / 2, gridX: x, gridY: y });
const walkableGrid = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => true));
const blockerGrid = Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => false));
const walkablePoints = [];
for (let y = 0; y < 8; y += 1) for (let x = 0; x < 8; x += 1) walkablePoints.push(point(x, y));
const map = {
  id: "instance_map",
  displayName: "instance map",
  meta: { grid_size: gridSize, world_width: 8 * gridSize, world_height: 8 * gridSize },
  gridWidth: 8,
  gridHeight: 8,
  walkableGrid,
  blockerGrid,
  walkablePoints,
  playerSpawn: point(6, 6),
  enemySpawnPoints: [point(1, 1), point(2, 2), point(3, 3)],
  eliteSpawnPoints: [],
  bossPoints: [],
  exitPoints: [],
  zones: [
    { id: "rotated_entrance", zoneType: "entrance", shape: "rectangle", points: [point(5, 5), point(7, 7)] },
    { id: "rotated_room", zoneType: "main_room", shape: "rectangle", points: [point(1, 1), point(4, 4)] }
  ]
};
const config = {
  map_spawn_profiles: [{
    map_type: "default",
    base_pack_budget: 4,
    min_distance_from_player_spawn: 100,
    min_distance_between_packs: 1,
    max_active_packs: 1,
    zone_rules: {
      entrance: { enabled: false, allowed_pack_tags: [] },
      corridor: { enabled: true, allowed_pack_tags: ["small"] },
      main_room: { enabled: true, allowed_pack_tags: ["small"] },
      large_room: { enabled: true, allowed_pack_tags: ["small"] },
      dead_end: { enabled: true, allowed_pack_tags: ["small"] },
      boss_room: { enabled: true, allowed_pack_tags: ["small"] },
      exit_area: { enabled: true, allowed_pack_tags: ["small"] }
    }
  }],
  monster_packs: [{ pack_id: "small_pack", tags: ["small"], weight: 1, budget_cost: 1, entries: [{ monster_id: "mon_100101", count_min: 1, count_max: 1 }] }],
  monster_definitions: [{ id: "mon_100101", base_life: 10, base_attack: 2 }],
  monster_rarity_rules: {
    normal_weight: 100,
    magic_weight: 0,
    rare_weight: 0,
    max_rare_per_map: 0,
    max_magic_packs_per_map: 0,
    magic_allowed_zone_types: [],
    rare_allowed_zone_types: [],
    multipliers: { normal: { life_multiplier: 1, damage_multiplier: 1 } }
  }
};
const result = generateProceduralMonsterSpawns(map, config, { seed: "instance-spawn", maxCandidatePoints: 8 });
console.log(JSON.stringify({
  accepted: result.debug.spawn_points.filter((point) => point.accepted).map((point) => point.zone_type),
  acceptedNearSpawn: result.debug.spawn_points.some((point) => point.accepted && Math.hypot(point.x - map.playerSpawn.x, point.y - map.playerSpawn.y) < config.map_spawn_profiles[0].min_distance_from_player_spawn),
  enemies: result.enemies.length
}));
"""
    )

    assert result["enemies"] == 1
    assert result["accepted"] == ["main_room"]
    assert result["acceptedNearSpawn"] is False


def test_pack_monsters_do_not_scatter_into_entrance_zones() -> None:
    result = _node_eval(
        r"""
const { generateProceduralMonsterSpawns } = require("./.vite/map-instance-tests/mapSpawnRuntime.js");
const gridSize = 32;
const point = (x, y) => ({ x: x * gridSize + gridSize / 2, y: y * gridSize + gridSize / 2, gridX: x, gridY: y });
const walkableGrid = Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => true));
const blockerGrid = Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => false));
const walkablePoints = [];
for (let y = 0; y < 10; y += 1) for (let x = 0; x < 10; x += 1) walkablePoints.push(point(x, y));
const entrance = { id: "side_entrance", zoneType: "entrance", shape: "rectangle", points: [point(2, 2), point(4, 4)] };
const map = {
  id: "entrance_scatter_map",
  displayName: "entrance scatter map",
  meta: { grid_size: gridSize, world_width: 10 * gridSize, world_height: 10 * gridSize },
  gridWidth: 10,
  gridHeight: 10,
  walkableGrid,
  blockerGrid,
  walkablePoints,
  playerSpawn: point(0, 0),
  enemySpawnPoints: [point(5, 3)],
  eliteSpawnPoints: [],
  bossPoints: [],
  exitPoints: [],
  zones: [
    entrance,
    { id: "spawn_room", zoneType: "main_room", shape: "rectangle", points: [point(5, 2), point(8, 5)] }
  ]
};
const config = {
  map_spawn_profiles: [{
    map_type: "default",
    base_pack_budget: 4,
    min_distance_from_player_spawn: 1,
    min_distance_between_packs: 1,
    max_active_packs: 1,
    zone_rules: {
      entrance: { enabled: false, allowed_pack_tags: [] },
      corridor: { enabled: true, allowed_pack_tags: ["small"] },
      main_room: { enabled: true, allowed_pack_tags: ["small"] },
      large_room: { enabled: true, allowed_pack_tags: ["small"] },
      dead_end: { enabled: true, allowed_pack_tags: ["small"] },
      boss_room: { enabled: true, allowed_pack_tags: ["small"] },
      exit_area: { enabled: true, allowed_pack_tags: ["small"] }
    }
  }],
  monster_packs: [{ pack_id: "small_pack", tags: ["small"], weight: 1, budget_cost: 1, entries: [{ monster_id: "mon_100101", count_min: 10, count_max: 10 }] }],
  monster_definitions: [{ id: "mon_100101", base_life: 10, base_attack: 2 }],
  monster_rarity_rules: {
    normal_weight: 100,
    magic_weight: 0,
    rare_weight: 0,
    max_rare_per_map: 0,
    max_magic_packs_per_map: 0,
    magic_allowed_zone_types: [],
    rare_allowed_zone_types: [],
    multipliers: { normal: { life_multiplier: 1, damage_multiplier: 1 } }
  }
};
const result = generateProceduralMonsterSpawns(map, config, { seed: "entrance-scatter", maxCandidatePoints: 12 });
const inEntrance = result.enemies.filter((enemy) => (
  Math.floor(enemy.x / gridSize) >= 2
  && Math.floor(enemy.x / gridSize) <= 4
  && Math.floor(enemy.y / gridSize) >= 2
  && Math.floor(enemy.y / gridSize) <= 4
));
console.log(JSON.stringify({
  enemies: result.enemies.length,
  inEntrance: inEntrance.map((enemy) => [Math.floor(enemy.x / gridSize), Math.floor(enemy.y / gridSize)]),
  acceptedZones: result.debug.spawn_points.filter((point) => point.accepted).map((point) => point.zone_type)
}));
"""
    )

    assert result["enemies"] > 0
    assert result["acceptedZones"] == ["main_room"]
    assert result["inEntrance"] == []


def test_app_uses_map_instance_before_procedural_spawn_and_keeps_spawn_fallback() -> None:
    source = (ROOT / "webapp" / "App.tsx").read_text(encoding="utf-8")

    assert "const mapInstance = createRuntimeMapInstanceForStage(selectedStage)" in source
    assert "const spawnPlan = createProceduralSpawnPlanEnemies(mapInstance" in source
    assert "source.spawn ?? MAP_EDITOR_DEFAULT_SPAWN" in source
    assert "zone.zoneType === \"entrance\"" in source
    assert "requestState(\"/api/map/start\"" not in source


def test_missing_debug_rotation_does_not_force_zero_degrees() -> None:
    source = (ROOT / "webapp" / "App.tsx").read_text(encoding="utf-8")
    debug_rotation_body = source.split("function runtimeDebugMapInstanceRotation", 1)[1].split(
        "function runtimeDebugCornerPlayerSpawn",
        1,
    )[0]

    assert 'get("debugMapRotation")' in debug_rotation_body
    assert "if (rawValue === null) return null;" in debug_rotation_body
    assert "Number(new URLSearchParams(window.location.search).get(\"debugMapRotation\"))" not in debug_rotation_body
