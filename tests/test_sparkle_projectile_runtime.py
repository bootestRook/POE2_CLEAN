import json
import subprocess
import textwrap
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_sparkle_sustained_projectile_ticks_retarget_live_enemies_at_runtime() -> None:
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
            if (!specifier.startsWith(".")) return require(specifier);
            const candidate = path.resolve(path.dirname(resolved), specifier);
            return loadTs(fs.existsSync(`${candidate}.ts`) ? `${candidate}.ts` : candidate);
          };
          new Function("require", "module", "exports", compiled)(localRequire, module, module.exports);
          return module.exports;
        }

        const runtime = loadTs(path.join(root, "webapp", "runtime", "damageZoneLifecycleRuntime.ts"));
        const event = {
          event_id: "sparkle.projectile.spawn",
          type: "projectile_spawn",
          timestamp_ms: 0,
          source_entity: "player",
          target_entity: "",
          position: { x: 0, y: 0 },
          direction: { x: 1, y: 0 },
          delay_ms: 0,
          duration_ms: 1000,
          amount: null,
          damage_type: "lightning",
          skill_instance_id: "skill_sparkle",
          vfx_key: "skill_event.sparkle.vfx",
          sfx_key: "",
          reason_key: "",
          payload: {
            projectile_id: "sparkle.projectile.1",
            dynamic_tick_runtime: true,
            projectile_tick_runtime: true,
            spawn_world_position: { x: 0, y: 0 },
            expire_world_position: { x: 100, y: 0 },
            lifetime_ms: 1000,
            tick_interval_ms: 500,
            radius: 12,
            max_targets: 1,
            damage_amount: 10,
            damage_components: { lightning: 10 }
          }
        };
        const zone = runtime.createActiveDamageZoneRuntime(event, "sparkle.projectile.1", { x: 0, y: 0 }, { x: 1, y: 0 }, "circle", 2);
        const deps = {
          player: { x: 0, y: 0 },
          enemies: [
            { id: 1, x: 50, y: 0, hp: 0 },
            { id: 2, x: 51, y: 0, hp: 100 }
          ],
          frontendUniqueTargetsByDistance(enemies, origin, radius, maxTargets) {
            return enemies
              .filter((enemy) => enemy.hp > 0 && Math.hypot(enemy.x - origin.x, enemy.y - origin.y) <= radius)
              .sort((a, b) => Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y))
              .slice(0, maxTargets);
          },
          damageNumberText: (amount) => String(amount),
          stablePercent: () => 100,
          frontendBaseKnockbackDistance: 250,
          frontendKnockbackLockMs: 180
        };
        const advanced = runtime.advanceActiveDamageZoneRuntime(zone, 500, (activeZone) => runtime.buildActiveDamageZoneRuntimeTickEvents(activeZone, deps));
        const damage = advanced.events.find((item) => item.type === "damage");
        console.log(JSON.stringify({
          target: damage && damage.target_entity,
          impactX: damage && damage.payload && damage.payload.impact_world_position.x,
          projectileId: damage && damage.payload && damage.payload.projectile_id
        }));
        """
    )
    result = subprocess.run(
        ["node", "-e", script, str(ROOT)],
        check=True,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=ROOT,
    )
    payload = json.loads(result.stdout)
    assert payload == {"target": "2", "impactX": 50, "projectileId": "sparkle.projectile.1"}


def test_sparkle_builder_does_not_precompute_sustained_damage_targets() -> None:
    source = (ROOT / "webapp" / "runtime" / "frontendPlayableSkillEventBuilders.ts").read_text(encoding="utf-8")
    sustained_body = source.split("if (sustainedTicks || clippedHit.blocked) {", 1)[1].split("continue;", 1)[0]
    assert "frontendUniqueTargetsByDistance" not in sustained_body
    assert "dynamic_tick_runtime: sustainedTicks" in source
    assert "projectile_tick_runtime: sustainedTicks" in source
