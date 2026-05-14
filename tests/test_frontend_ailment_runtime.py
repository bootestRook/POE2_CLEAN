import subprocess
import textwrap
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WEBAPP = ROOT / "webapp"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_deterioration_extra_stack_chance_is_runtime_param() -> None:
    source = _read(WEBAPP / "state" / "frontendSkillPreviewState.ts")
    runtime_param_body = source.split('for (const key of [', 1)[1].split("]) {", 1)[0]

    assert '"deterioration_chance_add_percent"' in runtime_param_body
    assert '"deterioration_extra_stack_chance_percent"' in runtime_param_body


def test_frontend_ailment_runtime_applies_deterioration_extra_stack() -> None:
    script = textwrap.dedent(
        r"""
        const fs = require("node:fs");
        const path = require("node:path");
        const vm = require("node:vm");
        const ts = require(path.join(process.cwd(), "node_modules", "typescript"));
        const source = fs.readFileSync(path.join(process.cwd(), "webapp", "runtime", "frontendAilmentRuntime.ts"), "utf8");
        const output = ts.transpileModule(source, {
          compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
        }).outputText;
        const sandbox = { exports: {}, module: { exports: {} } };
        vm.runInNewContext(output, sandbox);
        const api = sandbox.exports;
        const skill = {
          runtime_params: { deterioration_extra_stack_chance_percent: 40.6 },
          skill_stats: {}
        };
        if (api.frontendAilmentStackMode("deterioration", "refresh_duration") !== "stack_value") {
          throw new Error("deterioration must use stack_value stacking");
        }
        if (api.frontendAilmentStackCount(skill, "deterioration", 0.4) !== 2) {
          throw new Error("roll inside chance should add one deterioration stack");
        }
        if (api.frontendAilmentStackCount(skill, "deterioration", 0.41) !== 1) {
          throw new Error("roll outside chance should keep one deterioration stack");
        }
        if (api.frontendAilmentStackCount(skill, "ignite", 0.0) !== 1) {
          throw new Error("non-deterioration ailments should not use deterioration extra stacks");
        }
        """
    )
    subprocess.run(
        ["node", "-e", script],
        cwd=ROOT,
        check=True,
        text=True,
        encoding="utf-8",
        capture_output=True,
    )
