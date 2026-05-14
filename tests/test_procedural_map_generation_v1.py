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
    output = subprocess.check_output(["node", "-e", script], cwd=ROOT, text=True, encoding="utf-8")
    return json.loads(output)


def test_map_001_baseline_remains_editor_document() -> None:
    result = _node_eval(
        r"""
const map001 = require("./map/map_001.json");
const { measureMapEditorDocument } = require("./.vite/procedural-map-tests/proceduralMapGeneration.js");
console.log(JSON.stringify({
  format: map001.format,
  version: map001.version,
  cellSize: map001.cellSize,
  hasSpawn: Boolean(map001.spawn),
  hasColliders: Boolean(map001.colliders.empty && map001.colliders.ground && map001.colliders.wall),
  metrics: measureMapEditorDocument(map001)
}));
"""
    )

    assert result["format"] == "poe.tilemap.editor"
    assert result["version"] == 1
    assert result["cellSize"] == 96
    assert result["hasSpawn"] is True
    assert result["hasColliders"] is True
    assert result["metrics"] == {"width": 256, "height": 144, "groundCells": 2286}


def test_generated_map_uses_locked_v1_format_and_colliders() -> None:
    result = _node_eval(
        r"""
const { generateProceduralEditorMap } = require("./.vite/procedural-map-tests/proceduralMapGeneration.js");
const generated = generateProceduralEditorMap({ seed: "format-proof", topologyPreset: "hub_spoke" });
const map = generated.map;
const legalTiles = map.tiles.every((row) => row.length === 256 && row.every((tile) => ["empty", "ground", "wall"].includes(tile)));
console.log(JSON.stringify({
  ok: generated.validation.ok,
  errors: generated.validation.errors,
  format: map.format,
  width: map.width,
  height: map.height,
  cellSize: map.cellSize,
  legalTiles,
  colliders: map.colliders,
  stats: generated.validation.stats
}));
"""
    )

    assert result["ok"] is True, result["errors"]
    assert result["format"] == "poe.tilemap.editor"
    assert result["width"] == 256
    assert result["height"] == 144
    assert result["cellSize"] == 96
    assert result["legalTiles"] is True
    assert result["colliders"]["empty"]["enabled"] is True
    assert result["colliders"]["ground"]["enabled"] is False
    assert result["colliders"]["wall"]["enabled"] is True
    assert result["stats"]["groundTileCount"] > 0


def test_same_seed_is_fully_deterministic_and_different_seed_can_vary() -> None:
    result = _node_eval(
        r"""
const { generateProceduralEditorMap } = require("./.vite/procedural-map-tests/proceduralMapGeneration.js");
const a = generateProceduralEditorMap({ seed: "stable-seed", topologyPreset: "main_path_branches" });
const b = generateProceduralEditorMap({ seed: "stable-seed", topologyPreset: "main_path_branches" });
const c = generateProceduralEditorMap({ seed: "other-seed", topologyPreset: "main_path_branches" });
console.log(JSON.stringify({
  aOk: a.validation.ok,
  bOk: b.validation.ok,
  sameMap: JSON.stringify(a.map) === JSON.stringify(b.map),
  sameGraph: JSON.stringify(a.graph) === JSON.stringify(b.graph),
  sameValidation: JSON.stringify(a.validation) === JSON.stringify(b.validation),
  sameDebug: JSON.stringify(a.debugText) === JSON.stringify(b.debugText),
  differentSeedVaries: JSON.stringify(a.map.zones) !== JSON.stringify(c.map.zones)
    || JSON.stringify(a.graph.rooms) !== JSON.stringify(c.graph.rooms)
    || a.validation.stats.groundTileCount !== c.validation.stats.groundTileCount
}));
"""
    )

    assert result["aOk"] is True
    assert result["bOk"] is True
    assert result["sameMap"] is True
    assert result["sameGraph"] is True
    assert result["sameValidation"] is True
    assert result["sameDebug"] is True
    assert result["differentSeedVaries"] is True


def test_all_topology_presets_pass_v1_room_and_graph_rules() -> None:
    result = _node_eval(
        r"""
const { generateProceduralEditorMap } = require("./.vite/procedural-map-tests/proceduralMapGeneration.js");
const presets = ["hub_spoke", "main_path_branches", "loop_with_branches"];
const summaries = {};
for (const preset of presets) {
  const generated = generateProceduralEditorMap({ seed: `preset-${preset}`, topologyPreset: preset });
  const degree = Object.fromEntries(generated.graph.rooms.map((room) => [room.id, 0]));
  for (const edge of generated.graph.corridors) {
    degree[edge.fromRoomId] += 1;
    degree[edge.toRoomId] += 1;
  }
  const hub = generated.graph.rooms.find((room) => room.tags.includes("hub"));
  summaries[preset] = {
    ok: generated.validation.ok,
    errors: generated.validation.errors,
    stats: generated.validation.stats,
    bossDegree: degree[generated.graph.bossRoomId],
    deadEndsAreLeaves: generated.graph.rooms.filter((room) => room.roomType === "dead_end").every((room) => degree[room.id] === 1),
    largeRoomsHaveTwo: generated.graph.rooms.filter((room) => room.roomType === "large_room").every((room) => degree[room.id] >= 2),
    hubDegree: hub ? degree[hub.id] : null,
    hasLoopTaggedRooms: generated.graph.rooms.filter((room) => room.tags.includes("loop")).length >= 4
  };
}
console.log(JSON.stringify(summaries));
"""
    )

    for preset, summary in result.items():
        assert summary["ok"] is True, (preset, summary["errors"])
        stats = summary["stats"]
        assert 4 <= stats["entranceCount"] <= 6
        assert 8 <= stats["normalRoomCount"] <= 18
        assert 2 <= stats["largeRoomCount"] <= 5
        assert 3 <= stats["deadEndCount"] <= 8
        assert stats["bossRoomCount"] == 1
        assert summary["bossDegree"] in (1, 2)
        assert summary["deadEndsAreLeaves"] is True
        assert summary["largeRoomsHaveTwo"] is True

    assert result["hub_spoke"]["hubDegree"] >= 4
    assert result["loop_with_branches"]["hasLoopTaggedRooms"] is True


def test_validation_proves_spawn_and_ground_connectivity() -> None:
    result = _node_eval(
        r"""
const { generateProceduralEditorMap, validateGeneratedMap } = require("./.vite/procedural-map-tests/proceduralMapGeneration.js");
const generated = generateProceduralEditorMap({ seed: "connectivity-proof", topologyPreset: "loop_with_branches" });
const standalone = validateGeneratedMap(generated.map);
const tileAtSpawn = generated.map.tiles[generated.map.spawn.y][generated.map.spawn.x];
const spawnZone = generated.map.zones.find((zone) => zone.zoneType === "entrance"
  && zone.rects.some((rect) => generated.map.spawn.x >= Math.min(rect.start.x, rect.end.x)
    && generated.map.spawn.x <= Math.max(rect.start.x, rect.end.x)
    && generated.map.spawn.y >= Math.min(rect.start.y, rect.end.y)
    && generated.map.spawn.y <= Math.max(rect.start.y, rect.end.y)));
console.log(JSON.stringify({
  ok: generated.validation.ok,
  errors: generated.validation.errors,
  standaloneOk: standalone.ok,
  tileAtSpawn,
  spawnInEntrance: Boolean(spawnZone),
  stats: generated.validation.stats
}));
"""
    )

    assert result["ok"] is True, result["errors"]
    assert result["standaloneOk"] is True
    assert result["tileAtSpawn"] == "ground"
    assert result["spawnInEntrance"] is True
    assert result["stats"]["groundTileCount"] > 0


def test_corridor_zones_are_segmented_and_do_not_cover_rooms() -> None:
    result = _node_eval(
        r"""
const { generateProceduralEditorMap } = require("./.vite/procedural-map-tests/proceduralMapGeneration.js");
const presets = ["hub_spoke", "main_path_branches", "loop_with_branches"];
const summaries = {};
const overlaps = (a, b) => !(a.end.x < b.start.x || b.end.x < a.start.x || a.end.y < b.start.y || b.end.y < a.start.y);
for (const preset of presets) {
  const generated = generateProceduralEditorMap({ seed: `corridor-clean-${preset}`, topologyPreset: preset });
  const roomRects = generated.map.zones
    .filter((zone) => zone.zoneType !== "corridor")
    .flatMap((zone) => zone.rects);
  const corridorRects = generated.map.zones
    .filter((zone) => zone.zoneType === "corridor")
    .flatMap((zone) => zone.rects);
  summaries[preset] = {
    ok: generated.validation.ok,
    maxRectWidth: Math.max(...corridorRects.map((rect) => Math.abs(rect.end.x - rect.start.x) + 1)),
    maxRectHeight: Math.max(...corridorRects.map((rect) => Math.abs(rect.end.y - rect.start.y) + 1)),
    overlapCount: corridorRects.filter((rect) => roomRects.some((roomRect) => overlaps(rect, roomRect))).length,
    corridorZoneCount: generated.map.zones.filter((zone) => zone.zoneType === "corridor").length
  };
}
console.log(JSON.stringify(summaries));
"""
    )

    for preset, summary in result.items():
        assert summary["ok"] is True, preset
        assert summary["maxRectWidth"] <= 24, (preset, summary)
        assert summary["maxRectHeight"] <= 24, (preset, summary)
        assert summary["overlapCount"] == 0, (preset, summary)
        assert summary["corridorZoneCount"] <= 20, (preset, summary)


def test_dead_end_rooms_have_one_narrow_exterior_doorway() -> None:
    result = _node_eval(
        r"""
const { generateProceduralEditorMap } = require("./.vite/procedural-map-tests/proceduralMapGeneration.js");
const presets = ["hub_spoke", "main_path_branches", "loop_with_branches"];
const summaries = {};
function contactsFor(tiles, room) {
  const contacts = { top: 0, bottom: 0, left: 0, right: 0 };
  for (let x = room.x; x < room.x + room.width; x += 1) {
    if (tiles[room.y - 1]?.[x] === "ground") contacts.top += 1;
    if (tiles[room.y + room.height]?.[x] === "ground") contacts.bottom += 1;
  }
  for (let y = room.y; y < room.y + room.height; y += 1) {
    if (tiles[y]?.[room.x - 1] === "ground") contacts.left += 1;
    if (tiles[y]?.[room.x + room.width] === "ground") contacts.right += 1;
  }
  return contacts;
}
for (const preset of presets) {
  const generated = generateProceduralEditorMap({ seed: `dead-end-door-${preset}`, topologyPreset: preset });
  summaries[preset] = {
    ok: generated.validation.ok,
    errors: generated.validation.errors,
    deadEnds: generated.graph.rooms
      .filter((room) => room.roomType === "dead_end")
      .map((room) => {
        const contacts = contactsFor(generated.map.tiles, room);
        return {
          id: room.id,
          contacts,
          openSideCount: Object.values(contacts).filter((count) => count > 0).length,
          widestOpening: Math.max(...Object.values(contacts))
        };
      })
  };
}
console.log(JSON.stringify(summaries));
"""
    )

    for preset, summary in result.items():
        assert summary["ok"] is True, (preset, summary["errors"])
        for dead_end in summary["deadEnds"]:
            assert dead_end["openSideCount"] == 1, (preset, dead_end)
            assert dead_end["widestOpening"] <= 4, (preset, dead_end)


def test_debug_text_is_chinese_and_contains_required_labels() -> None:
    result = _node_eval(
        r"""
const { generateProceduralEditorMap } = require("./.vite/procedural-map-tests/proceduralMapGeneration.js");
const generated = generateProceduralEditorMap({ seed: "debug-proof", topologyPreset: "loop_with_branches" });
console.log(JSON.stringify({ debugText: generated.debugText.join("\n") }));
"""
    )

    debug_text = result["debugText"]
    for label in [
        "程序化地图生成",
        "Seed",
        "拓扑类型",
        "环路分支型",
        "地图尺寸",
        "入口区域",
        "普通房间",
        "大房间",
        "死胡同",
        "Boss 房",
        "Ground 连通性",
        "入口到 Boss",
        "校验结果",
    ]:
        assert label in debug_text


def test_map_editor_json_generator_writes_valid_v1_preview_file(tmp_path: Path) -> None:
    output_path = tmp_path / "procedural_map_v1.json"
    completed = subprocess.run(
        [
            "node",
            str(ROOT / "scripts" / "generate-procedural-map-json.mjs"),
            "--seed",
            "pytest-map-editor-preview",
            "--topology",
            "main_path_branches",
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
        zone_counts[zone["zoneType"]] = zone_counts.get(zone["zoneType"], 0) + 1

    assert "Generated" in completed.stdout
    assert "topology=main_path_branches" in completed.stdout
    assert generated["format"] == "poe.tilemap.editor"
    assert generated["name"] == "procedural_map_v1"
    assert generated["width"] == 256
    assert generated["height"] == 144
    assert generated["cellSize"] == 96
    assert zone_counts["entrance"] >= 4
    assert zone_counts["boss_room"] == 1
    assert zone_counts["dead_end"] >= 3


def test_procedural_map_is_additive_client_only_template_entry() -> None:
    registry_source = (ROOT / "webapp" / "mapTemplateRegistry.ts").read_text(encoding="utf-8")
    app_source = (ROOT / "webapp" / "App.tsx").read_text(encoding="utf-8")
    progression_source = (ROOT / "configs" / "maps" / "map_progression.toml").read_text(encoding="utf-8")

    assert "generateProceduralEditorMap" in registry_source
    assert "PROCEDURAL_MAP_TEMPLATE_ID" in registry_source
    assert '"procedural_map_v1"' in progression_source
    assert "generateProceduralEditorMap" not in app_source
    assert 'requestState("/api/map/start"' not in app_source
    assert 'requestState("/api/combat/tick"' not in app_source
    assert 'requestState("/api/save/restore", { save })' not in app_source
