import json
import subprocess
import textwrap
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_player_displacement_stops_at_walls_hits_swept_enemies_and_uses_cooldown() -> None:
    script = textwrap.dedent(
        r"""
        const fs = require("fs");
        const path = require("path");
        const ts = require("typescript");
        const root = process.argv[1];
        const cache = new Map();

        function loadTs(file) {
          const resolved = path.resolve(file);
          if (cache.has(resolved)) return cache.get(resolved).exports;
          const source = fs.readFileSync(resolved, "utf8");
          const compiled = ts.transpileModule(source, {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
          }).outputText;
          const module = { exports: {} };
          cache.set(resolved, module);
          const localRequire = (specifier) => {
            if (specifier.includes("frontendSaveStorage")) {
              return {
                clearFrontendAutosave: () => {},
                clearFrontendSaveSlot: () => {},
                frontendSavePayloadFromSanitizedState: (state) => state,
                frontendStateCandidateFromSave: () => null,
                saveFrontendAutosavePayload: () => {}
              };
            }
            if (specifier.includes("frontendSaveFormatting")) {
              return {
                DEFAULT_PLAYER_NAME: "player",
                normalizePlayerName: (value) => String(value || "player")
              };
            }
            if (!specifier.startsWith(".")) return require(specifier);
            const candidate = path.resolve(path.dirname(resolved), specifier);
            return loadTs(fs.existsSync(`${candidate}.ts`) ? `${candidate}.ts` : candidate);
          };
          new Function("require", "module", "exports", compiled)(localRequire, module, module.exports);
          return module.exports;
        }

        const runtime = loadTs(path.join(root, "webapp", "runtime", "playerDisplacementSkillRuntime.ts"));
        const skill = {
          active_gem_instance_id: "dash_a",
          base_gem_id: "active_phase_dash",
          skill_package_id: "active_phase_dash",
          skill_template_id: "skill_phase_dash",
          name_text: "phase dash",
          damage_type: "physical",
          behavior_type: "manual_displacement",
          behavior_template: "manual_displacement",
          visual_effect: "skill_event.phase_dash.vfx",
          final_damage: 20,
          final_cooldown_ms: 3000,
          projectile_count: 1,
          area_multiplier: 1,
          speed_multiplier: 1,
          shape_effects: [],
          applied_modifiers: [],
          tags: [{ id: "movement", text: "movement" }, { id: "displacement", text: "displacement" }],
          hit: { hit_radius: 36, base_damage: 20 },
          runtime_params: {
            player_displacement_skill: true,
            displacement_distance_px: 200,
            displacement_hit_radius: 36,
            displacement_duration_ms: 160
          },
          source_context: { board_mount_sequence: 2 }
        };
        const map = {
          meta: { grid_size: 20, world_width: 300, world_height: 120 },
          walkableGrid: [
            Array(15).fill(true),
            Array(15).fill(true),
            Array(15).fill(true),
            Array(15).fill(true),
            Array(15).fill(true),
            Array(15).fill(true)
          ]
        };
        for (let y = 0; y < map.walkableGrid.length; y += 1) map.walkableGrid[y][8] = false;
        const cooldowns = {};
        const first = runtime.releasePlayerDisplacementSkill({
          skill,
          player: { x: 60, y: 60, hp: 100, maxHp: 100, currentMana: 0, maxMana: 0, currentEnergyShield: 0, maxEnergyShield: 0 },
          aimWorld: { x: 260, y: 60 },
          map,
          enemies: [
            { id: 1, x: 118, y: 62, hp: 100, maxHp: 100 },
            { id: 2, x: 190, y: 60, hp: 100, maxHp: 100 }
          ],
          nowMs: 1000,
          cooldowns
        });
        const second = runtime.releasePlayerDisplacementSkill({
          skill,
          player: first.player,
          aimWorld: { x: 260, y: 60 },
          map,
          enemies: [],
          nowMs: 1100,
          cooldowns
        });
        console.log(JSON.stringify({
          released: first.released,
          x: first.player.x,
          damagedTargets: first.events.filter((event) => event.type === "damage").map((event) => event.target_entity),
          secondReason: second.reason,
          readyAtMs: cooldowns.dash_a
        }));
        """
    )
    result = subprocess.run(
        ["node", "-e", script, str(ROOT)],
        cwd=ROOT,
        check=True,
        text=True,
        encoding="utf-8",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    payload = json.loads(result.stdout)
    assert payload["released"] is True
    assert 150 <= payload["x"] < 160
    assert payload["damagedTargets"] == ["1"]
    assert payload["secondReason"] == "cooldown"
    assert payload["readyAtMs"] == 4000


def test_player_displacement_selects_earliest_mounted_skill() -> None:
    script = textwrap.dedent(
        r"""
        const fs = require("fs");
        const path = require("path");
        const ts = require("typescript");
        const root = process.argv[1];
        const cache = new Map();
        function loadTs(file) {
          const resolved = path.resolve(file);
          if (cache.has(resolved)) return cache.get(resolved).exports;
          const source = fs.readFileSync(resolved, "utf8");
          const compiled = ts.transpileModule(source, {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
          }).outputText;
          const module = { exports: {} };
          cache.set(resolved, module);
          const localRequire = (specifier) => {
            if (specifier.includes("frontendSaveStorage")) {
              return {
                clearFrontendAutosave: () => {},
                clearFrontendSaveSlot: () => {},
                frontendSavePayloadFromSanitizedState: (state) => state,
                frontendStateCandidateFromSave: () => null,
                saveFrontendAutosavePayload: () => {}
              };
            }
            if (specifier.includes("frontendSaveFormatting")) {
              return {
                DEFAULT_PLAYER_NAME: "player",
                normalizePlayerName: (value) => String(value || "player")
              };
            }
            if (!specifier.startsWith(".")) return require(specifier);
            const candidate = path.resolve(path.dirname(resolved), specifier);
            return loadTs(fs.existsSync(`${candidate}.ts`) ? `${candidate}.ts` : candidate);
          };
          new Function("require", "module", "exports", compiled)(localRequire, module, module.exports);
          return module.exports;
        }
        const runtime = loadTs(path.join(root, "webapp", "runtime", "playerDisplacementSkillRuntime.ts"));
        const base = {
          base_gem_id: "active_phase_dash",
          skill_package_id: "active_phase_dash",
          skill_template_id: "skill_phase_dash",
          name_text: "phase dash",
          damage_type: "physical",
          behavior_type: "manual_displacement",
          behavior_template: "manual_displacement",
          visual_effect: "skill_event.phase_dash.vfx",
          final_damage: 20,
          final_cooldown_ms: 3000,
          projectile_count: 1,
          area_multiplier: 1,
          speed_multiplier: 1,
          shape_effects: [],
          applied_modifiers: [],
          runtime_params: { player_displacement_skill: true },
          tags: []
        };
        const selected = runtime.selectPlayerDisplacementSkill([
          { ...base, active_gem_instance_id: "late", source_context: { board_mount_sequence: 9 } },
          { ...base, active_gem_instance_id: "early", source_context: { board_mount_sequence: 3 } }
        ]);
        console.log(JSON.stringify({ id: selected && selected.active_gem_instance_id }));
        """
    )
    result = subprocess.run(
        ["node", "-e", script, str(ROOT)],
        cwd=ROOT,
        check=True,
        text=True,
        encoding="utf-8",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    assert json.loads(result.stdout) == {"id": "early"}


def test_player_displacement_level_table_damage_scaling() -> None:
    script = textwrap.dedent(
        r"""
        const fs = require("fs");
        const path = require("path");
        const ts = require("typescript");
        const root = process.argv[1];
        const source = fs.readFileSync(path.join(root, "webapp", "data", "playerDisplacementSkillData.ts"), "utf8");
        const compiled = ts.transpileModule(source, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
        }).outputText;
        const module = { exports: {} };
        new Function("require", "module", "exports", compiled)((specifier) => {
          if (specifier.endsWith("skillPreviewTypes")) return {};
          return require(specifier);
        }, module, module.exports);
        const table = module.exports.FRONTEND_PHASE_DASH_SKILL_LEVEL_TABLE;
        console.log(JSON.stringify({
          level1: table[1].base_damage,
          level20: table[20].base_damage,
          level40: table[40].base_damage,
          cooldown40: table[40].base_cooldown_ms
        }));
        """
    )
    result = subprocess.run(
        ["node", "-e", script, str(ROOT)],
        cwd=ROOT,
        check=True,
        text=True,
        encoding="utf-8",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    assert json.loads(result.stdout) == {
        "level1": 20,
        "level20": 200,
        "level40": 220,
        "cooldown40": 3000,
    }


def test_player_displacement_tooltip_uses_active_gem_shape() -> None:
    script = textwrap.dedent(
        r"""
        const fs = require("fs");
        const path = require("path");
        const ts = require("typescript");
        const root = process.argv[1];
        const source = fs.readFileSync(path.join(root, "webapp", "data", "playerDisplacementSkillData.ts"), "utf8");
        const compiled = ts.transpileModule(source, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
        }).outputText;
        const module = { exports: {} };
        new Function("require", "module", "exports", compiled)((specifier) => {
          if (specifier.endsWith("skillPreviewTypes")) return {};
          return require(specifier);
        }, module, module.exports);
        const tooltip = module.exports.FRONTEND_PHASE_DASH_GEM.tooltip_view;
        console.log(JSON.stringify({
          variant: tooltip.variant,
          hasSummaryLines: Array.isArray(tooltip.summary_lines),
          descriptionLines: Array.isArray(tooltip.sections.description.lines),
          statsTitleOk: tooltip.sections.stats.title_text === "核心数值",
          statLabelsOk: JSON.stringify(tooltip.sections.stats.lines.map((line) => line.label_text)) === JSON.stringify(["等级", "物理伤害", "冷却时间", "位移距离"]),
          hasBaseSkillLevel: Array.isArray(tooltip.sections.base_skill_level.lines),
          hasSupportRichLines: Boolean(tooltip.sections.description.rich_lines)
        }));
        """
    )
    result = subprocess.run(
        ["node", "-e", script, str(ROOT)],
        cwd=ROOT,
        check=True,
        text=True,
        encoding="utf-8",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    assert json.loads(result.stdout) == {
        "variant": "active",
        "hasSummaryLines": False,
        "descriptionLines": True,
        "statsTitleOk": True,
        "statLabelsOk": True,
        "hasBaseSkillLevel": True,
        "hasSupportRichLines": False,
    }


def test_quick_mobility_level_table_matches_configured_support_values() -> None:
    script = textwrap.dedent(
        r"""
        const fs = require("fs");
        const path = require("path");
        const ts = require("typescript");
        const root = process.argv[1];
        const source = fs.readFileSync(path.join(root, "webapp", "frontendSkillLevelTables.ts"), "utf8");
        const compiled = ts.transpileModule(source, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
        }).outputText;
        const module = { exports: {} };
        new Function("require", "module", "exports", compiled)(require, module, module.exports);
        const table = module.exports.FRONTEND_SKILL_LEVEL_TABLES.support_quick_mobility;
        console.log(JSON.stringify({
          level1: table[1],
          level20: table[20],
          level40: table[40],
          adjacentCooldown1: table[1].cooldown_recovery_add_percent * 1.25
        }));
        """
    )
    result = subprocess.run(
        ["node", "-e", script, str(ROOT)],
        cwd=ROOT,
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    assert json.loads(result.stdout) == {
        "level1": {
            "attack_speed_add_percent": 10.5,
            "cast_speed_add_percent": 10.5,
            "cooldown_recovery_add_percent": 20.5,
        },
        "level20": {
            "attack_speed_add_percent": 20,
            "cast_speed_add_percent": 20,
            "cooldown_recovery_add_percent": 30,
        },
        "level40": {
            "attack_speed_add_percent": 30,
            "cast_speed_add_percent": 30,
            "cooldown_recovery_add_percent": 40,
        },
        "adjacentCooldown1": 25.625,
    }


def test_active_tooltip_preview_replaces_displacement_damage_and_cooldown_lines() -> None:
    script = textwrap.dedent(
        r"""
        const fs = require("fs");
        const path = require("path");
        const ts = require("typescript");
        const root = process.argv[1];
        const source = fs.readFileSync(path.join(root, "webapp", "components", "tooltips", "tooltipFormatting.ts"), "utf8");
        const compiled = ts.transpileModule(source, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
        }).outputText;
        const module = { exports: {} };
        new Function("require", "module", "exports", compiled)((specifier) => {
          if (specifier.includes("localization")) return { localize: (_key, fallback) => fallback ?? _key };
          return require(specifier);
        }, module, module.exports);
        const lines = module.exports.mergeFrontendSkillPreviewTooltipLines([
          { label_text: "\u7b49\u7ea7", value_text: "1" },
          { label_text: "\u7269\u7406\u4f24\u5bb3", value_text: "20" },
          { label_text: "\u51b7\u5374\u65f6\u95f4", value_text: "3\u79d2" },
          { label_text: "\u4f4d\u79fb\u8ddd\u79bb", value_text: "200px" }
        ], {
          final_damage: 31.25,
          final_cooldown_ms: 2388
        }, [], module.exports.formatPreviewNumber);
        console.log(JSON.stringify(lines));
        """
    )
    result = subprocess.run(
        ["node", "-e", script, str(ROOT)],
        cwd=ROOT,
        check=True,
        text=True,
        encoding="utf-8",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    lines = json.loads(result.stdout)
    assert lines[1] == {"label_text": "\u7269\u7406\u4f24\u5bb3", "value_text": "31.3"}
    assert lines[2] == {"label_text": "\u51b7\u5374\u65f6\u95f4", "value_text": "2.39\u79d2"}


def test_new_save_keeps_original_starter_and_adds_phase_dash_bonus() -> None:
    script = textwrap.dedent(
        r"""
        const fs = require("fs");
        const path = require("path");
        const ts = require("typescript");
        const root = process.argv[1];
        const cache = new Map();
        function loadTs(file) {
          const resolved = path.resolve(file);
          if (cache.has(resolved)) return cache.get(resolved).exports;
          const source = fs.readFileSync(resolved, "utf8");
          const compiled = ts.transpileModule(source, {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
          }).outputText;
          const module = { exports: {} };
          cache.set(resolved, module);
          const localRequire = (specifier) => {
            if (specifier.includes("frontendSaveStorage")) {
              return {
                clearFrontendAutosave: () => {},
                clearFrontendSaveSlot: () => {},
                frontendSavePayloadFromSanitizedState: (state) => state,
                frontendStateCandidateFromSave: () => null,
                saveFrontendAutosavePayload: () => {}
              };
            }
            if (specifier.includes("frontendSaveFormatting")) {
              return {
                DEFAULT_PLAYER_NAME: "player",
                normalizePlayerName: (value) => String(value || "player")
              };
            }
            if (!specifier.startsWith(".")) return require(specifier);
            const candidate = path.resolve(path.dirname(resolved), specifier);
            return loadTs(fs.existsSync(`${candidate}.ts`) ? `${candidate}.ts` : candidate);
          };
          new Function("require", "module", "exports", compiled)(localRequire, module, module.exports);
          return module.exports;
        }
        const { createFrontendAppStateHelpers } = loadTs(path.join(root, "webapp", "state", "frontendAppState.ts"));
        const board = () => ({ cells: Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => ({ gem: null }))) });
        const pool = [
          { instance_id: "random_template", base_gem_id: "active_random", gem_kind: "active_skill", level: 1 },
          { instance_id: "phase_template", base_gem_id: "active_phase_dash", gem_kind: "active_skill", level: 1 }
        ];
        const helpers = createFrontendAppStateHelpers({
          cloneFrontendData: (value) => JSON.parse(JSON.stringify(value)),
          cloneFrontendInitialAppStateSeed: () => ({
            player_name: "",
            inventory: [],
            stash_pages: [],
            drops: [],
            skill_preview: [],
            equipment_slots: [],
            board: board()
          }),
          frontendGemDropPool: () => pool,
          createEmptyStashPages: () => [[]],
          normalizeStashPages: (value) => value,
          sanitizeFrontendStorageState: (state) => state,
          recalculateFrontendSkillPreview: (state) => state,
          recalculateFrontendEquipmentState: (state) => state,
          starterGemBoardPosition: { row: 4, column: 4 },
          starterBonusBaseGemId: "active_phase_dash",
          starterBonusGemBoardPosition: { row: 8, column: 8 },
          excludedStarterBaseGemIds: new Set(["active_stoneskin"]),
          monsterTestPlayerLife: 999,
          equipmentSlotCount: 4
        });
        const state = helpers.createFrontendNewSaveStarterState(1, "tester");
        console.log(JSON.stringify({
          inventoryBaseIds: state.inventory.map((item) => item.base_gem_id),
          randomCell: state.board.cells[4][4].gem && state.board.cells[4][4].gem.base_gem_id,
          bonusCell: state.board.cells[8][8].gem && state.board.cells[8][8].gem.base_gem_id,
          sequences: state.inventory.map((item) => item.board_mount_sequence)
        }));
        """
    )
    result = subprocess.run(
        ["node", "-e", script, str(ROOT)],
        cwd=ROOT,
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    assert json.loads(result.stdout) == {
        "inventoryBaseIds": ["active_random", "active_phase_dash"],
        "randomCell": "active_random",
        "bonusCell": "active_phase_dash",
        "sequences": [1, 2],
    }
