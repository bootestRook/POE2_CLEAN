from __future__ import annotations

import json
from collections import deque
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_map_002_reference_layout_is_connected_and_shaped() -> None:
    document = json.loads((ROOT / "map" / "map_002.json").read_text(encoding="utf-8"))
    tiles = document["tiles"]
    zones = {zone["id"]: zone for zone in document["zones"]}
    spawn = document["spawn"]

    assert document["format"] == "poe.tilemap.editor"
    assert document["name"] == "map_002"
    assert document["width"] == 256
    assert document["height"] == 144
    assert tiles[spawn["y"]][spawn["x"]] == "ground"
    assert point_in_zone(spawn, zones["eternal_plaza_entrance"])

    ground_count = sum(tile == "ground" for row in tiles for tile in row)
    assert reachable_ground_count(tiles, spawn) == ground_count

    plaza = zones["eternal_plaza_main_square"]
    objective = zones["eternal_plaza_objective"]
    assert plaza["zoneType"] == "large_room"
    assert plaza["x"] >= 110
    assert plaza["width"] >= 90
    assert plaza["height"] >= 60
    assert objective["zoneType"] == "boss_room"
    assert objective["x"] > 170
    assert objective["y"] > 85
    assert len([zone for zone in document["zones"] if zone["zoneType"] == "corridor"]) >= 5


def test_map_003_molten_factory_reference_layout_is_connected_and_shaped() -> None:
    document = json.loads((ROOT / "map" / "map_003.json").read_text(encoding="utf-8"))
    tiles = document["tiles"]
    zones = {zone["id"]: zone for zone in document["zones"]}
    spawn = document["spawn"]

    assert document["format"] == "poe.tilemap.editor"
    assert document["name"] == "map_003"
    assert document["width"] == 256
    assert document["height"] == 144
    assert tiles[spawn["y"]][spawn["x"]] == "ground"
    assert point_in_zone(spawn, zones["molten_factory_entrance"])

    ground_count = sum(tile == "ground" for row in tiles for tile in row)
    assert reachable_ground_count(tiles, spawn) == ground_count

    core = zones["molten_factory_core"]
    objective = zones["molten_factory_objective"]
    dead_ends = [zone for zone in document["zones"] if zone["zoneType"] == "dead_end"]
    assert core["zoneType"] == "large_room"
    assert 60 <= core["x"] <= 80
    assert core["width"] >= 60
    assert core["height"] >= 45
    assert objective["zoneType"] == "boss_room"
    assert 90 <= objective["x"] <= 105
    assert 70 <= objective["y"] <= 85
    assert len(dead_ends) >= 3
    assert len([zone for zone in document["zones"] if zone["zoneType"] == "corridor"]) >= 6


def test_map_004_mountain_heart_reference_layout_is_connected_and_shaped() -> None:
    document = json.loads((ROOT / "map" / "map_004.json").read_text(encoding="utf-8"))
    tiles = document["tiles"]
    zones = {zone["id"]: zone for zone in document["zones"]}
    spawn = document["spawn"]

    assert document["format"] == "poe.tilemap.editor"
    assert document["name"] == "map_004"
    assert document["width"] == 256
    assert document["height"] == 144
    assert tiles[spawn["y"]][spawn["x"]] == "ground"
    assert point_in_zone(spawn, zones["mountain_heart_entrance"])

    ground_count = sum(tile == "ground" for row in tiles for tile in row)
    assert reachable_ground_count(tiles, spawn) == ground_count

    core = zones["mountain_heart_center_platform"]
    exit_zone = zones["mountain_heart_right_upper_exit"]
    assert core["zoneType"] == "large_room"
    assert 118 <= core["x"] <= 130
    assert core["width"] >= 30
    assert core["height"] >= 15
    assert exit_zone["zoneType"] == "boss_room"
    assert exit_zone["x"] >= 180
    assert exit_zone["y"] <= 30
    assert zones["mountain_heart_left_cluster"]["zoneType"] == "large_room"
    assert zones["mountain_heart_right_chamber"]["zoneType"] == "large_room"
    assert len([zone for zone in document["zones"] if zone["zoneType"] == "corridor"]) >= 4


def point_in_zone(point: dict[str, int], zone: dict[str, object]) -> bool:
    for rect in zone["rects"]:
        if (
            min(rect["start"]["x"], rect["end"]["x"]) <= point["x"] <= max(rect["start"]["x"], rect["end"]["x"])
            and min(rect["start"]["y"], rect["end"]["y"]) <= point["y"] <= max(rect["start"]["y"], rect["end"]["y"])
        ):
            return True
    return False


def reachable_ground_count(tiles: list[list[str]], start: dict[str, int]) -> int:
    queue: deque[tuple[int, int]] = deque([(start["x"], start["y"])])
    visited: set[tuple[int, int]] = set()
    while queue:
      x, y = queue.popleft()
      if (x, y) in visited:
          continue
      if y < 0 or y >= len(tiles) or x < 0 or x >= len(tiles[0]):
          continue
      if tiles[y][x] != "ground":
          continue
      visited.add((x, y))
      queue.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    return len(visited)
