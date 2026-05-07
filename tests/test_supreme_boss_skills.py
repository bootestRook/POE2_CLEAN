from __future__ import annotations

import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "configs" / "bosses" / "supreme_boss_skills.json"
OUT_DIR = ROOT / ".vite" / "supreme-boss-skill-tests"


def _compile_runtime() -> Path:
    subprocess.run(
        [
            "node",
            str(ROOT / "node_modules" / "typescript" / "bin" / "tsc"),
            "webapp/supremeBossSkillRuntime.ts",
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
            str(OUT_DIR),
            "--noEmitOnError",
            "true",
        ],
        cwd=ROOT,
        check=True,
        text=True,
        encoding="utf-8",
        capture_output=True,
    )
    return OUT_DIR / "supremeBossSkillRuntime.js"


def _runtime_report() -> dict:
    runtime_path = _compile_runtime()
    script = f"""
const fs = require("node:fs");
const runtime = require({json.dumps(str(runtime_path))});
const raw = JSON.parse(fs.readFileSync({json.dumps(str(CONFIG_PATH))}, "utf8"));
const config = runtime.normalizeSupremeBossSkillConfig(raw);
const errors = runtime.validateSupremeBossSkillConfig(config);
const summaries = config.skills.map((skill) => runtime.simulateSupremeBossSkillTimeline(skill));
const events = Object.fromEntries(config.skills.map((skill) => [skill.id, runtime.buildSupremeBossSkillEvents(skill, {{
  boss: {{ id: 1, x: 640, y: 420, monsterId: skill.boss_id, damageType: "lightning" }},
  player: {{ x: 700, y: 480 }},
  arena: {{ width: 1280, height: 840 }},
  castStartMs: 1000,
  sequence: 0
}})]));
console.log(JSON.stringify({{ config, errors, summaries, events }}));
"""
    result = subprocess.run(
        ["node", "-e", script],
        cwd=ROOT,
        check=True,
        text=True,
        encoding="utf-8",
        capture_output=True,
    )
    return json.loads(result.stdout)


def test_supreme_boss_skill_config_loads() -> None:
    report = _runtime_report()
    config = report["config"]
    ids = [skill["id"] for skill in config["skills"]]

    assert report["errors"] == []
    assert len(ids) == 6
    assert len(ids) == len(set(ids))
    assert ids == [
        "supreme_star_arbiter_sudoku_orbit",
        "supreme_duality_judge_polarity_rings",
        "supreme_insect_empress_thousand_needles",
        "supreme_thunder_machine_kaleidoscope",
        "supreme_void_crown_closing_flower",
        "supreme_final_converger_all_returns_zero",
    ]
    assert "supreme_thunder_machine_reflecting_grid" not in ids
    assert all(any("\u3400" <= char <= "\u9fff" for char in skill["display_name"]) for skill in config["skills"])


def test_supreme_boss_skill_timeline_completes() -> None:
    report = _runtime_report()

    for summary in report["summaries"]:
        assert summary["completed"], summary["skill_id"]
        assert summary["residual_after_end"] == 0, summary["skill_id"]
        assert summary["projectile_count"] > 0, summary["skill_id"]
        if summary["skill_id"] in {
            "supreme_star_arbiter_sudoku_orbit",
            "supreme_insect_empress_thousand_needles",
            "supreme_final_converger_all_returns_zero",
        }:
            assert summary["damage_zone_count"] > 0, summary["skill_id"]


def test_warning_before_damage() -> None:
    report = _runtime_report()

    for summary in report["summaries"]:
        assert summary["warning_count"] > 0, summary["skill_id"]
        assert summary["first_warning_ms"] < summary["first_damage_ms"], summary["skill_id"]


def test_projectile_cleanup_after_skill_end() -> None:
    report = _runtime_report()

    for skill in report["config"]["skills"]:
        events = report["events"][skill["id"]]
        assert all(event["delay_ms"] <= skill["cast_duration_ms"] for event in events)
        assert not any(
            event["type"] in {"projectile_spawn", "damage_zone", "damage_zone_prime"}
            and event["delay_ms"] > skill["cast_duration_ms"]
            for event in events
        )


def test_thousand_needles_projectile_travel_is_extended() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_insect_empress_thousand_needles"]
    needle_events = [
        event for event in events
        if event["type"] == "projectile_spawn"
        and str(event.get("vfx_key", "")).startswith("supreme_insect_")
    ]

    assert needle_events
    assert min(event["payload"]["projectile_range"] for event in needle_events) >= 620 * 8
    spiral_events = [event for event in needle_events if event.get("vfx_key") == "supreme_insect_spiral_needle"]
    assert spiral_events
    assert {event["payload"]["projectile_speed"] for event in spiral_events} == {500}
    assert min(event["payload"]["lifetime_ms"] for event in needle_events) >= round(620 * 8 / 820 * 1000)


def test_sudoku_orbit_config_loads() -> None:
    report = _runtime_report()
    skill = next(
        item for item in report["config"]["skills"]
        if item["id"] == "supreme_star_arbiter_sudoku_orbit"
    )

    assert skill["display_name"] == "九宫星轨"
    assert skill["boss_id"] == "mon_500001"
    assert skill["cast_duration_ms"] == 9000
    assert skill["params"]["gate_count"] == 9
    assert skill["params"]["show_full_9x9_grid"] is False
    assert [phase["id"] for phase in skill["phases"]] == [
        "cast",
        "nine_star_gates",
        "grid_to_orbit",
        "nine_star_array",
        "star_chain_warning",
        "star_chain_gaps",
        "palace_ring_warning",
        "palace_rings",
        "nine_star_return_warning",
        "nine_star_return",
        "end",
    ]


def test_sudoku_orbit_timeline_completes() -> None:
    report = _runtime_report()
    summary = next(
        item for item in report["summaries"]
        if item["skill_id"] == "supreme_star_arbiter_sudoku_orbit"
    )
    events = report["events"]["supreme_star_arbiter_sudoku_orbit"]
    phases = {
        event["payload"].get("phase")
        for event in events
        if event["type"] == "projectile_spawn"
    }

    assert summary["cast_duration_ms"] == 9000
    assert summary["completed"]
    assert summary["residual_after_end"] == 0
    assert {
        "阶段一：九星布阵",
        "阶段二：星链缺口",
        "阶段三：三宫开合",
        "阶段四：九星归位",
    }.issubset(phases)


def test_nine_star_gate_count() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_star_arbiter_sudoku_orbit"]
    gate_events = [
        event for event in events
        if event["payload"].get("emitter_kind") == "nine_star_gate"
        and event["payload"].get("layout_state") in {"grid_3x3", "orbit"}
    ]

    assert len([event for event in gate_events if event["payload"]["layout_state"] == "grid_3x3"]) == 9
    assert len([event for event in gate_events if event["payload"]["layout_state"] == "orbit"]) == 9


def test_grid_to_orbit_transition() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_star_arbiter_sudoku_orbit"]
    grid_gates = [
        event for event in events
        if event["payload"].get("emitter_kind") == "nine_star_gate"
        and event["payload"].get("layout_state") == "grid_3x3"
    ]
    orbit_gates = [
        event for event in events
        if event["payload"].get("emitter_kind") == "nine_star_gate"
        and event["payload"].get("layout_state") == "orbit"
    ]

    assert grid_gates and orbit_gates
    assert max(event["delay_ms"] for event in grid_gates) == 250
    assert min(event["delay_ms"] for event in orbit_gates) == 700
    assert {event["payload"]["grid_position"]["row"] for event in grid_gates} == {1, 2, 3}
    assert {event["payload"]["grid_position"]["column"] for event in grid_gates} == {1, 2, 3}


def test_star_chain_has_gap() -> None:
    report = _runtime_report()
    skill = next(item for item in report["config"]["skills"] if item["id"] == "supreme_star_arbiter_sudoku_orbit")
    events = report["events"]["supreme_star_arbiter_sudoku_orbit"]
    chain_events = [
        event for event in events
        if event["payload"].get("phase") == "阶段二：星链缺口"
    ]

    assert chain_events
    for event in chain_events:
        inactive_count = event["payload"]["inactive_chain_count"]
        assert skill["params"]["phase2_inactive_chain_count_min"] <= inactive_count <= skill["params"]["phase2_inactive_chain_count_max"]
        assert len(event["payload"]["inactive_chains"]) == inactive_count


def test_star_chain_gap_prefer_continuous() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_star_arbiter_sudoku_orbit"]
    samples = [
        event["payload"]["inactive_chains"]
        for event in events
        if event["payload"].get("phase") == "阶段二：星链缺口"
    ]

    assert samples
    for gap in samples:
        assert all(((gap[index] % 9) + 1) == gap[index + 1] for index in range(len(gap) - 1))


def test_palace_ring_warning_before_damage() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_star_arbiter_sudoku_orbit"]
    warnings = [
        event for event in events
        if event["vfx_key"] == "supreme_star_palace_ring_warning"
    ]
    ring_projectiles = [
        event for event in events
        if event["payload"].get("phase") == "阶段三：三宫开合"
    ]

    assert warnings and ring_projectiles
    assert {event["delay_ms"] for event in warnings} == {4600}
    assert min(event["delay_ms"] for event in ring_projectiles) == 5200
    assert all(event["payload"]["warning_remaining_ms"] == 600 for event in warnings)


def test_palace_ring_has_gap() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_star_arbiter_sudoku_orbit"]
    ring_projectiles = [
        event for event in events
        if event["payload"].get("phase") == "阶段三：三宫开合"
    ]
    by_ring: dict[int, list[dict]] = {}
    for event in ring_projectiles:
        by_ring.setdefault(event["payload"]["ring_index"], []).append(event)

    assert set(by_ring) == {1, 2, 3}
    for ring_index, items in by_ring.items():
        bullet_count = [24, 32, 40][ring_index - 1]
        gap_count = items[0]["payload"]["gap_bullet_count"]
        assert 0 < gap_count < bullet_count
        assert len(items) == bullet_count - gap_count


def test_palace_ring_gap_never_below_min() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_star_arbiter_sudoku_orbit"]
    ring_events = [
        event for event in events
        if event["payload"].get("phase") == "阶段三：三宫开合"
    ]

    assert ring_events
    for event in ring_events:
        assert event["payload"]["gap_bullet_count"] >= event["payload"]["min_gap_bullet_count"]


def test_nine_star_return_has_safe_band() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_star_arbiter_sudoku_orbit"]
    safe_bands = [
        event for event in events
        if event["vfx_key"] == "supreme_star_safe_band"
    ]

    assert len(safe_bands) == 1
    payload = safe_bands[0]["payload"]
    assert payload["safe_band_inner_radius"] < payload["safe_band_outer_radius"]
    assert payload["debug_label"] == "旋转安全带"


def test_return_projectiles_do_not_home_to_player() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_star_arbiter_sudoku_orbit"]
    return_events = [
        event for event in events
        if event["payload"].get("phase") == "阶段四：九星归位"
    ]

    assert return_events
    assert all(event["payload"].get("homing_target") != "player" for event in return_events)
    assert {event["payload"]["return_phase"] for event in return_events} == {"outward", "inward"}


def test_cleanup_after_sudoku_orbit_end() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_star_arbiter_sudoku_orbit"]

    assert all(event["delay_ms"] <= 9000 for event in events)
    assert not any(
        event["type"] in {"projectile_spawn", "damage_zone", "damage_zone_prime"}
        and event["delay_ms"] > 9000
        for event in events
    )


def test_final_converger_invulnerability_window() -> None:
    report = _runtime_report()
    windows = {summary["skill_id"]: summary["invulnerable_window_ms"] for summary in report["summaries"]}

    assert windows["supreme_final_converger_all_returns_zero"] == 9000
    for skill_id, window in windows.items():
        if skill_id != "supreme_final_converger_all_returns_zero":
            assert window == 0


def test_final_converger_config_loads() -> None:
    report = _runtime_report()
    skill = next(
        item for item in report["config"]["skills"]
        if item["id"] == "supreme_final_converger_all_returns_zero"
    )

    assert skill["display_name"] == "万象归零"
    assert skill["boss_id"] == "mon_500006"
    assert skill["cast_duration_ms"] == 9000
    assert [phase["id"] for phase in skill["phases"]] == [
        "cast",
        "zero_gates",
        "star_gate_flower",
        "reposition_1",
        "reverse_star_petals",
        "zero_ring_warning",
        "zero_rings",
        "return_stasis",
        "return_to_zero",
        "end",
    ]


def test_final_converger_timeline_completes() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_final_converger_all_returns_zero"]
    labels = set()
    for event in events:
        labels.add(str(event["payload"].get("debug_label") or ""))
        labels.add(str(event["payload"].get("skill_name") or ""))

    assert any("阶段一：星门花轮" in label for label in labels)
    assert any("阶段二：逆相星瓣" in label for label in labels)
    assert any("阶段三：零环开阖" in label for label in labels)
    assert any("阶段四：归零回流" in label for label in labels)
    assert max(event["delay_ms"] for event in events) <= 9000
    assert not any("boss 背后安全扇形" in label or "万象归零：双色交错" in label for label in labels)


def test_zero_gate_count() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_final_converger_all_returns_zero"]
    gates = [
        event for event in events
        if event["type"] == "damage_zone_prime"
        and event["payload"].get("emitter_kind") == "zero_gate"
    ]

    assert len(gates) == 8
    assert {event["payload"]["emitter_index"] for event in gates} == {1, 2, 3, 4, 5, 6, 7, 8}
    assert all(event["delay_ms"] + event["duration_ms"] <= 9000 for event in gates)


def test_zero_ring_has_gap() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_final_converger_all_returns_zero"]
    ring_projectiles = [
        event for event in events
        if event["type"] == "projectile_spawn"
        and event["payload"].get("phase") == "阶段三：零环开阖"
    ]
    expected_counts = {1: 16, 2: 23, 3: 30, 4: 37}
    counts_by_ring: dict[int, int] = {}
    for event in ring_projectiles:
        ring_index = int(event["payload"]["ring_index"])
        counts_by_ring[ring_index] = counts_by_ring.get(ring_index, 0) + 1

    assert counts_by_ring == expected_counts
    assert all(event["payload"]["gap_bullet_count"] > 0 for event in ring_projectiles)


def test_zero_ring_warning_before_damage() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_final_converger_all_returns_zero"]
    warnings = [
        event for event in events
        if event["type"] == "damage_zone_prime"
        and event["payload"].get("debug_label") == "零环缺口"
    ]
    ring_projectiles = [
        event for event in events
        if event["type"] == "projectile_spawn"
        and event["payload"].get("phase") == "阶段三：零环开阖"
    ]

    assert len(warnings) == 4
    assert ring_projectiles
    assert min(event["delay_ms"] for event in warnings) == 4400
    assert min(event["delay_ms"] for event in ring_projectiles) == 5000


def test_gap_never_below_minimum() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_final_converger_all_returns_zero"]
    ring_events = [
        event for event in events
        if event["payload"].get("phase") == "阶段三：零环开阖"
    ]

    assert ring_events
    assert all(
        int(event["payload"]["gap_bullet_count"]) >= int(event["payload"]["min_gap_bullet_count"])
        for event in ring_events
    )


def test_return_to_zero_has_safe_band() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_final_converger_all_returns_zero"]
    safe_band = next(
        event for event in events
        if event["type"] == "damage_zone_prime"
        and event["payload"].get("debug_label") == "旋转安全带"
    )

    assert safe_band["delay_ms"] == 6800
    assert safe_band["payload"]["safe_band_inner_radius"] < safe_band["payload"]["safe_band_outer_radius"]


def test_return_projectiles_do_not_directly_home_to_player() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_final_converger_all_returns_zero"]
    returns = [
        event for event in events
        if event["type"] == "projectile_spawn"
        and event["payload"].get("phase") == "阶段四：归零回流"
    ]

    assert len(returns) == 64
    assert all(event["payload"].get("homing_target") == "geometric_center" for event in returns)
    assert not any(event["payload"].get("aim_policy") == "target_current_position" for event in returns)


def test_cleanup_after_final_converger_end() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_final_converger_all_returns_zero"]

    assert all(event["delay_ms"] <= 9000 for event in events)
    assert not any(
        event["type"] in {"projectile_spawn", "damage_zone", "damage_zone_prime"}
        and event["delay_ms"] > 9000
        for event in events
    )


def test_thunder_kaleidoscope_config_loads() -> None:
    report = _runtime_report()
    skill = next(
        item for item in report["config"]["skills"]
        if item["id"] == "supreme_thunder_machine_kaleidoscope"
    )

    assert skill["display_name"] == "雷纹万花筒"
    assert skill["boss_id"] == "mon_500004"
    assert skill["cast_duration_ms"] == 8000
    assert [phase["id"] for phase in skill["phases"]] == [
        "cast",
        "orbit_start",
        "thunder_needles",
        "reposition",
        "lightning_serpents",
        "ring_warning",
        "kaleidoscope_return",
        "end",
    ]


def test_thunder_kaleidoscope_timeline_completes() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_thunder_machine_kaleidoscope"]
    labels = set()
    for event in events:
        labels.add(str(event["payload"].get("debug_label") or ""))
        labels.add(str(event["payload"].get("skill_name") or ""))

    assert any("阶段一：雷针花轮" in label for label in labels)
    assert any("阶段二：折线电蛇" in label for label in labels)
    assert any("阶段三：雷环切割" in label for label in labels)
    assert any("阶段四：万花筒回流" in label for label in labels)
    assert max(event["delay_ms"] for event in events) <= 8000


def test_orbit_cannon_count() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_thunder_machine_kaleidoscope"]
    cannons = [
        event for event in events
        if event["type"] == "damage_zone_prime"
        and event["payload"].get("emitter_kind") == "orbit_cannon"
    ]

    assert len(cannons) == 6
    assert {event["payload"]["emitter_index"] for event in cannons} == {1, 2, 3, 4, 5, 6}
    assert all(event["delay_ms"] + event["duration_ms"] <= 8000 for event in cannons)


def test_rotating_ring_has_gap() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_thunder_machine_kaleidoscope"]
    ring_projectiles = [
        event for event in events
        if event["type"] == "projectile_spawn"
        and event["payload"].get("phase") == "阶段三：雷环切割"
    ]
    counts_by_ring: dict[int, int] = {}
    for event in ring_projectiles:
        ring_index = int(event["payload"]["ring_index"])
        counts_by_ring[ring_index] = counts_by_ring.get(ring_index, 0) + 1

    assert counts_by_ring == {1: 24, 2: 24, 3: 24}
    assert all(event["payload"]["gap_bullet_count"] == 4 for event in ring_projectiles)


def test_warning_before_ring_damage() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_thunder_machine_kaleidoscope"]
    warnings = [
        event for event in events
        if event["type"] == "damage_zone_prime"
        and event["payload"].get("debug_label") == "雷环缺口"
    ]
    ring_projectiles = [
        event for event in events
        if event["type"] == "projectile_spawn"
        and event["payload"].get("phase") == "阶段三：雷环切割"
    ]

    assert len(warnings) == 3
    assert ring_projectiles
    assert min(event["delay_ms"] for event in warnings) == 4800
    assert min(event["delay_ms"] for event in ring_projectiles) == 5300


def test_return_projectile_turnaround() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_thunder_machine_kaleidoscope"]
    returns = [
        event for event in events
        if event["type"] == "projectile_spawn"
        and event["payload"].get("phase") == "阶段四：万花筒回流"
    ]
    by_id: dict[str, list[dict]] = {}
    for event in returns:
        by_id.setdefault(str(event["payload"]["return_id"]), []).append(event)

    assert len(by_id) == 48
    for pair in by_id.values():
        phases = {event["payload"]["return_phase"] for event in pair}
        assert phases == {"outward", "inward"}
        outward = next(event for event in pair if event["payload"]["return_phase"] == "outward")
        inward = next(event for event in pair if event["payload"]["return_phase"] == "inward")
        assert outward["delay_ms"] < inward["delay_ms"]
        assert outward["position"] != inward["position"]


def test_thunder_kaleidoscope_cleanup_after_skill_end() -> None:
    report = _runtime_report()
    events = report["events"]["supreme_thunder_machine_kaleidoscope"]

    assert all(event["delay_ms"] <= 8000 for event in events)
    assert not any(
        event["type"] in {"projectile_spawn", "damage_zone", "damage_zone_prime"}
        and event["delay_ms"] > 8000
        for event in events
    )


def test_sudoku_orbit_has_safe_route() -> None:
    report = _runtime_report()
    summary = next(
        item for item in report["summaries"]
        if item["skill_id"] == "supreme_star_arbiter_sudoku_orbit"
    )

    assert summary["has_safe_route"]
