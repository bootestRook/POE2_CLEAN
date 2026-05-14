import json
import math
import subprocess
import textwrap
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def _frontend_skill_level_tables() -> dict[str, dict[str, dict[str, object]]]:
    script = textwrap.dedent(
        r"""
        const fs = require("node:fs");
        const path = require("node:path");
        const vm = require("node:vm");
        const ts = require(path.join(process.cwd(), "node_modules", "typescript"));
        const source = fs.readFileSync(path.join(process.cwd(), "webapp", "frontendSkillLevelTables.ts"), "utf8");
        const output = ts.transpileModule(source, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
        }).outputText;
        const sandbox = { exports: {}, module: { exports: {} } };
        vm.runInNewContext(output, sandbox);
        process.stdout.write(JSON.stringify(sandbox.exports.FRONTEND_SKILL_LEVEL_TABLES));
        """
    )
    result = subprocess.run(
        ["node", "-e", script],
        cwd=ROOT,
        check=True,
        text=True,
        encoding="utf-8",
        capture_output=True,
    )
    return json.loads(result.stdout)


def _frontend_gem_drop_pool() -> list[dict[str, object]]:
    script = textwrap.dedent(
        r"""
        const fs = require("node:fs");
        const path = require("node:path");
        const vm = require("node:vm");
        const ts = require(path.join(process.cwd(), "node_modules", "typescript"));
        const source = fs.readFileSync(path.join(process.cwd(), "webapp", "frontendGemDropData.ts"), "utf8");
        const output = ts.transpileModule(source, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
        }).outputText;
        const sandbox = { exports: {}, module: { exports: {} } };
        vm.runInNewContext(output, sandbox);
        process.stdout.write(JSON.stringify(sandbox.exports.FRONTEND_GEM_DROP_POOL));
        """
    )
    result = subprocess.run(
        ["node", "-e", script],
        cwd=ROOT,
        check=True,
        text=True,
        encoding="utf-8",
        capture_output=True,
    )
    return json.loads(result.stdout)


def _frontend_level_table_value(value: object) -> object:
    if isinstance(value, bool):
        return 1 if value else 0
    return value


def _config_skill_level_tables() -> dict[str, dict[str, dict[str, object]]]:
    tables: dict[str, dict[str, dict[str, object]]] = {}
    for path in sorted((ROOT / "configs" / "skills").rglob("skill.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        levels = (data.get("level_table") or {}).get("levels") or {}
        if not levels:
            continue
        skill_id = str(data["id"])
        tables[skill_id] = {
            str(level): {
                str(stat): _frontend_level_table_value(value)
                for stat, value in stats.items()
            }
            for level, stats in levels.items()
        }
    return tables


def _values_match(expected: object, actual: object) -> bool:
    if isinstance(expected, (int, float)) and isinstance(actual, (int, float)):
        return math.isclose(float(expected), float(actual), rel_tol=0, abs_tol=1e-9)
    return expected == actual


def test_frontend_skill_level_tables_match_skill_configs() -> None:
    expected = _config_skill_level_tables()
    actual = _frontend_skill_level_tables()

    problems: list[str] = []
    if set(expected) != set(actual):
        missing = sorted(set(expected) - set(actual))
        extra = sorted(set(actual) - set(expected))
        if missing:
            problems.append(f"missing frontend tables: {missing[:10]}")
        if extra:
            problems.append(f"extra frontend tables: {extra[:10]}")

    for skill_id in sorted(set(expected) & set(actual)):
        expected_levels = expected[skill_id]
        actual_levels = actual[skill_id]
        if set(expected_levels) != set(actual_levels):
            problems.append(
                f"{skill_id}: level keys differ, missing={sorted(set(expected_levels) - set(actual_levels))[:10]}, "
                f"extra={sorted(set(actual_levels) - set(expected_levels))[:10]}"
            )
            continue
        for level in sorted(expected_levels, key=int):
            expected_stats = expected_levels[level]
            actual_stats = actual_levels[level]
            if set(expected_stats) != set(actual_stats):
                problems.append(
                    f"{skill_id} level {level}: stat keys differ, "
                    f"missing={sorted(set(expected_stats) - set(actual_stats))}, "
                    f"extra={sorted(set(actual_stats) - set(expected_stats))}"
                )
                continue
            for stat in sorted(expected_stats):
                if not _values_match(expected_stats[stat], actual_stats[stat]):
                    problems.append(
                        f"{skill_id} level {level} {stat}: "
                        f"config={expected_stats[stat]!r}, frontend={actual_stats[stat]!r}"
                    )

    assert not problems, "frontend skill level tables drifted from configs:\n" + "\n".join(problems[:40])


def test_frontend_gem_drop_base_effects_match_config_level_one() -> None:
    expected = _config_skill_level_tables()
    pool = _frontend_gem_drop_pool()

    problems: list[str] = []
    for gem in pool:
        skill_id = str(gem.get("base_gem_id") or gem.get("instance_id") or "")
        level_one_stats = expected.get(skill_id, {}).get("1", {})
        if not level_one_stats:
            continue
        base_effect = gem.get("base_effect")
        if not isinstance(base_effect, dict):
            continue
        modifiers = base_effect.get("modifiers")
        if not isinstance(modifiers, list):
            continue
        for modifier in modifiers:
            if not isinstance(modifier, dict):
                continue
            stat = modifier.get("stat")
            if not isinstance(stat, dict):
                continue
            stat_id = str(stat.get("id") or "")
            if stat_id not in level_one_stats:
                continue
            actual = modifier.get("value")
            expected_value = level_one_stats[stat_id]
            if not _values_match(expected_value, actual):
                problems.append(
                    f"{skill_id} base_effect {stat_id}: "
                    f"config level 1={expected_value!r}, frontend={actual!r}"
                )

    assert not problems, "frontend gem drop base effects drifted from config level 1:\n" + "\n".join(problems[:40])
