from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def _app_source() -> str:
    return (ROOT / "webapp" / "App.tsx").read_text(encoding="utf-8")


def test_playable_map_run_stays_frontend_owned() -> None:
    source = _app_source()
    start_game_body = source.split("function startGame", 1)[1].split("async function openSkillEditorPanel", 1)[0]

    assert "const mapInstance = createRuntimeMapInstanceForStage(selectedStage)" in start_game_body
    assert "const spawnPlan = createProceduralSpawnPlanEnemies(mapInstance" in start_game_body
    assert "setEnemies(spawnPlan.enemies)" in start_game_body
    assert "setAuthoredSpawnPlanActive(true)" in start_game_body
    assert "setAuthoredAggroSources(spawnPlan.aggroSources)" in start_game_body
    assert "spawnFrontendDrops(killedEnemies)" in source
    assert "processFrontendProjectileImpacts(dt)" in source
    assert "applyFrontendPickup(dropId, current)" in source
    assert 'requestState("/api/map/start"' not in source
    assert 'requestState("/api/combat/tick"' not in source
    assert 'requestState("/api/pickup"' not in source
    assert 'window.localStorage.setItem(FRONTEND_AUTOSAVE_STORAGE_KEY' in source
    assert 'requestState("/api/save/continue"' not in source
    assert 'requestState("/api/save/restore", { save })' not in source


def test_webapp_runner_uses_vite_preview_without_backend_api_server() -> None:
    run_script = (ROOT / "run.bat").read_text(encoding="utf-8")
    vite_config = (ROOT / "vite.config.mts").read_text(encoding="utf-8")

    assert "vite preview" in run_script
    assert "webapp_server.py" not in run_script
    assert '"/api"' not in vite_config


def test_playable_map_run_keeps_frontend_real_combat_calculation() -> None:
    source = _app_source()
    step_game_body = source.split("function stepGame", 1)[1].split("function recordRuntimePerf", 1)[0]
    consume_skill_event_body = source.split("function consumeSkillEventBatch", 1)[1].split("function applyEnemyBuffApplyEvent", 1)[0]

    assert "backendCanonicalMapRunActive" not in step_game_body
    assert "if (!skillEditorMode)" in step_game_body
    assert "requestBackendCombatTick" not in source
    assert "advanceEnemyBuffs(dt);" in step_game_body
    assert "processFrontendProjectileImpacts(dt)" in step_game_body
    assert "return projectileImpactEvents + bossProjectileImpactEvents + bossDamageZoneEvents + activeDamageZoneEvents + consumeScheduledSkillEvents(dt);" in step_game_body
    assert "activeDamageZoneTickEvents" not in source
    assert "playerAttachedAreaDamageEvents" not in consume_skill_event_body
    assert "orbitHitTargets" not in consume_skill_event_body
    assert "damageEvents.push({" not in consume_skill_event_body


def test_frontend_loot_is_not_guaranteed_for_every_normal_kill() -> None:
    source = _app_source()

    assert "function frontendMonsterDropChance" in source
    assert "function frontendMonsterDropAttempts" in source
    assert "drop_quantity_multiplier" in source
    assert "stage.base_drop_chance + (enemy.boss ? 0.35 : 0)" not in source
    assert '"base_drop_chance": 1.0' not in (ROOT / "webapp" / "frontendGameData.ts").read_text(encoding="utf-8")


def test_frontend_equipment_drop_level_rolls_inside_stage_map_level_range() -> None:
    source = _app_source()
    create_drop_body = source.split("function createFrontendDrop", 1)[1].split("function spawnFrontendDrops", 1)[0]

    assert "function frontendRandomMapLevel" in source
    assert "stage.map_level_min" in source
    assert "stage.map_level_max" in source
    assert "const equipmentLevel = frontendRandomMapLevel(stage, enemy, index + 83)" in create_drop_body
    assert "generateFrontendEquipment(equipmentSource, equipmentLevel, equipmentRarity, seed)" in create_drop_body
    assert 'level: lootKind === "equipment" ? equipmentLevel : level' in create_drop_body
    assert "generateFrontendEquipment(equipmentSource, stage.monster_level" not in create_drop_body
    assert 'level: lootKind === "equipment" ? stage.monster_level : level' not in create_drop_body


def test_frontend_equipment_rarity_uses_weights_with_normal_as_largest_share() -> None:
    source = _app_source()
    rarity_body = source.split("function frontendEquipmentDropRarity", 1)[1].split("function createFrontendDrop", 1)[0]
    create_drop_body = source.split("function createFrontendDrop", 1)[1].split("function spawnFrontendDrops", 1)[0]
    frontend_data = (ROOT / "webapp" / "frontendGameData.ts").read_text(encoding="utf-8")

    assert "stage.equipment_rarity_weights" in rarity_body
    assert "resolveFrontendMonsterDropRule(enemy.spawnRarity, enemy.monsterType, enemy.boss)" in rarity_body
    assert "scaleFrontendDropRarityWeights(" in rarity_body
    assert 'if (enemy.boss) return "purple"' not in rarity_body
    assert "kindRoll > 0.88" not in create_drop_body
    assert "kindRoll > 0.62" not in create_drop_body
    assert "frontendEquipmentDropRarity(stage, enemy" in create_drop_body
    assert '"white": 340' in frontend_data
    assert '"blue": 330' in frontend_data


def test_frontend_drop_kind_weights_use_stage_config() -> None:
    source = _app_source()
    create_drop_body = source.split("function createFrontendDrop", 1)[1].split("function spawnFrontendDrops", 1)[0]
    drop_kind_body = source.split("function frontendDropKind", 1)[1].split("function createFrontendDrop", 1)[0]
    frontend_data = (ROOT / "webapp" / "frontendGameData.ts").read_text(encoding="utf-8")

    assert "stage.equipment_weight" in drop_kind_body
    assert "stage.gem_weight" in drop_kind_body
    assert "stage.map_entry_weight" in drop_kind_body
    assert "allowedFrontendLootKindsForPool(dropPoolId)" in drop_kind_body
    assert "frontendDropKind(stage, kindRoll, Boolean(mapEntryStage), dropRule.drop_pool_id)" in create_drop_body
    assert '"equipment_weight": 50' in frontend_data
    assert '"gem_weight": 40' in frontend_data
    assert '"map_entry_weight": 10' in frontend_data
    assert "gemDropThreshold" not in create_drop_body
    assert "kindRoll < 0.16" not in create_drop_body
    assert "kindRoll < 0.48" not in create_drop_body


def test_frontend_monster_drop_rules_use_rarity_type_pool_and_currency_fields() -> None:
    app_source = _app_source()
    rules_source = (ROOT / "webapp" / "frontendMonsterDropRules.ts").read_text(encoding="utf-8")
    rules_config = (ROOT / "configs" / "loot" / "monster_drop_rules.toml").read_text(encoding="utf-8")

    assert "resolveFrontendMonsterDropRule(enemy.spawnRarity, enemy.monsterType, enemy.boss)" in app_source
    assert "drop_quantity_multiplier" in rules_source
    assert "drop_rarity_multiplier" in rules_source
    assert "drop_pool_id" in rules_source
    assert "currency_drop_weight" in rules_source
    assert "DROP_POOLS" in rules_source
    assert "allowedFrontendLootKindsForPool" in rules_source
    assert "MONSTER_TYPE_DROP_RULES" in rules_source
    assert "RARITY_DROP_RULES" in rules_source
    assert "[drop_pool.map_default]" in rules_config
    assert 'allowed_loot_kinds = ["equipment", "gem", "map_entry"]' in rules_config
    assert "[monster_type.minion]" in rules_config
    assert "[rarity.magic]" in rules_config
    assert "currency_drop_weight = 0" in rules_config


def test_frontend_quantity_multiplier_creates_multiple_drop_attempts() -> None:
    source = _app_source()
    attempts_body = source.split("function frontendMonsterDropAttempts", 1)[1].split("function frontendRandomMapLevel", 1)[0]
    spawn_body = source.split("function spawnFrontendDrops", 1)[1].split("function nextFrontendInventoryItemId", 1)[0]

    assert "Math.floor(quantityMultiplier)" in attempts_body
    assert "fractionalAttempt" in attempts_body
    assert "frontendDropRoll(enemy, salt + 191) < fractionalAttempt" in attempts_body
    assert ".flatMap((enemy, index) =>" in spawn_body
    assert "const attempts = frontendMonsterDropAttempts(enemy, index)" in spawn_body
    assert "Array.from({ length: attempts }" in spawn_body


def test_frontend_equipment_source_rolls_category_then_internal_source() -> None:
    source = (ROOT / "webapp" / "frontendEquipmentRuntime.ts").read_text(encoding="utf-8")
    choose_body = source.split("export function chooseFrontendEquipmentSource", 1)[1].split("export function generateFrontendEquipment", 1)[0]

    assert "frontendEquipmentSourceDropBuckets()" in choose_body
    assert "buckets.length" in choose_body
    assert "bucket.length" in choose_body
    assert "export function frontendEquipmentSourceDropBuckets()" in source
    assert "const weaponSources = SOURCE_OPTIONS.filter(isWeaponEquipmentSource)" in source
    assert "const otherSources = SOURCE_OPTIONS.filter((source) => !isWeaponEquipmentSource(source))" in source
    assert "WEAPON_EQUIPMENT_SOURCE_KEYWORDS" in source


def test_frontend_map_entry_uses_original_current_or_next_rule_except_major_final() -> None:
    source = _app_source()
    target_body = source.split("function frontendMapEntryTargetStage", 1)[1].split("function frontendMajorFinalBossNextStage", 1)[0]
    create_drop_body = source.split("function createFrontendDrop", 1)[1].split("function createGuaranteedNextMapEntryDrop", 1)[0]

    assert 'stage.stage_scope === "major_final" && stage.phase !== "timemark"' in target_body
    assert "return stage" in target_body
    assert "...(stage.order > 1 ? [stage] : [])" in target_body
    assert "candidate.order === stage.order + 1" in target_body
    assert "frontendMapEntryTargetStage(stage, stages, enemy, index + 109)" in create_drop_body


def test_major_final_non_timemark_boss_guarantees_next_stage_ticket() -> None:
    source = _app_source()
    next_stage_body = source.split("function frontendMajorFinalBossNextStage", 1)[1].split("function frontendGemDropWeight", 1)[0]
    guaranteed_body = source.split("function createGuaranteedNextMapEntryDrop", 1)[1].split("function spawnBossPortalForKilledEnemies", 1)[0]
    spawn_body = source.split("function spawnFrontendDrops", 1)[1].split("function nextFrontendInventoryItemId", 1)[0]

    assert "if (!enemy.boss) return null" in next_stage_body
    assert 'stage.stage_scope !== "major_final" || stage.phase === "timemark"' in next_stage_body
    assert "candidate.order === stage.order + 1" in next_stage_body
    assert "frontendMajorFinalBossNextStage(stage, stages, enemy)" in guaranteed_body
    assert 'loot_kind: "map_entry"' in guaranteed_body
    assert "target_stage_id: targetStage.id" in guaranteed_body
    assert "const guaranteedDrops = killedEnemies" in spawn_body
    assert "createGuaranteedNextMapEntryDrop(enemy, stage, stages, index)" in spawn_body
    assert "const allDrops = [...guaranteedDrops, ...drops]" in spawn_body


def test_frontend_gem_drop_penalizes_active_skill_and_sudoku_nine() -> None:
    source = _app_source()
    gem_weight_body = source.split("function frontendGemDropWeight", 1)[1].split("function chooseFrontendGemDropOption", 1)[0]

    assert "if (Number(gem.sudoku_digit) === 9) return weight * 0.35" in gem_weight_body
    assert 'if (gem.kind === "active_skill") return weight * 0.35' in gem_weight_body
    assert 'if (gem.kind === "active_skill") weight *= 0.35' not in gem_weight_body
    assert "chooseFrontendGemDropOption(gemOptions, enemy, index + 41)" in source


def test_frontend_skill_preview_recalculates_template_damage_for_gem_level() -> None:
    source = _app_source()
    recalculate_body = source.split("function recalculateFrontendSkillPreview", 1)[1].split("function frontendSupportSkillModifiersForTarget", 1)[0]
    level_adapter_body = source.split("function frontendSkillPreviewForGemLevel", 1)[1].split("function frontendSkillClampedLevel", 1)[0]
    timing_body = source.split("function frontendSkillTiming", 1)[1].split("function scaleFrontendDamageMap", 1)[0]
    equipment_body = source.split("function applyFrontendEquipmentSkillModifiers", 1)[1].split("function frontendEquipmentAttackAddedDamageStat", 1)[0]

    assert "frontendSkillPreviewForGemLevel(cloneFrontendData(template), fullGem)" in recalculate_body
    assert "const levelValues = frontendSkillLevelTableValues(skill, targetLevel)" in level_adapter_body
    assert "frontendLevelValueNumber(levelValues, \"base_damage\"" in level_adapter_body
    assert "targetLevel = frontendSkillClampedLevel" in level_adapter_body
    assert "damageScale = currentBaseDamage > 0 && targetBaseDamage > 0" in level_adapter_body
    assert "frontendLevelDamageComponents(levelValues, \"hit_damage_component_\")" in level_adapter_body
    assert "scaleFrontendSkillHitDamage(secondary, hitConfigScale, levelValues)" in level_adapter_body
    assert "applyFrontendModuleLevelValues(nextRuntimeParams.modules, levelValues)" in level_adapter_body
    assert "targetLevel === templateLevel" not in level_adapter_body
    assert "base_gem_level: targetLevel" in level_adapter_body
    assert "effective_gem_level: targetLevel" in level_adapter_body
    assert "actualIntervalMs: Math.max(releaseIntervalMs, finalCooldownMs)" in timing_body
    assert 'statValue(skillStats, "attack_speed_add_percent")' in timing_body
    assert 'statValue(skillStats, "cast_speed_add_percent")' in timing_body
    assert 'statValue(skillStats, "cooldown_recovery_add_percent")' in timing_body
    assert 'statValue(skillStats, "added_cooldown_ms")' in timing_body
    assert "actual_interval_ms: timing.actualIntervalMs" in level_adapter_body
    assert "actual_interval_ms: timing.actualIntervalMs" in equipment_body
    assert "actual_interval_ms: typeof levelValues.release_interval_ms" not in level_adapter_body
    assert "actual_interval_ms: Math.max(1, Number(skill.actual_interval_ms" not in equipment_body


def test_frontend_self_centered_damage_zone_releases_after_event_validation() -> None:
    source = _app_source()
    release_body = source.split("function releaseFrontendCanonicalSkill", 1)[1].split("function buildFrontendCanonicalSkillEvents", 1)[0]
    hit_body = source.split("function hitEnemies", 1)[1].split("function buildFrontendProjectileSkillEvents", 1)[0]
    damage_zone_body = source.split("function buildFrontendDamageZoneSkillEvents", 1)[1].split("function buildFrontendMeleeArcSkillEvents", 1)[0]

    assert 'runtimeSkill.cast?.target_selector === "self"' in release_body
    assert 'String(runtimeSkill.runtime_params?.origin_policy ?? "") === "caster"' in release_body
    assert "if (targets.length === 0 && !canReleaseWithoutEnemyTarget) return false" in release_body
    assert "if (events.length === 0) return false" in release_body
    assert "if (!options.manaAlreadySpent && !trySpendSkillMana(skill)) return false" in release_body
    assert "if (!trySpendSkillMana(skill)) return false" not in hit_body
    assert 'if (!originTarget && originPolicy !== "caster") return []' in damage_zone_body
    assert 'const direction = originTarget ? guideDirection(caster, originTarget) : { x: 1, y: 0 }' in damage_zone_body


def test_frontend_damage_zone_pull_events_survive_dynamic_tick_runtime() -> None:
    source = _app_source()
    damage_zone_body = source.split("function buildFrontendDamageZoneSkillEvents", 1)[1].split("function buildFrontendMeleeArcSkillEvents", 1)[0]
    dynamic_tick_continue = damage_zone_body.index("if (useDynamicTickRuntime) continue")
    pull_event = damage_zone_body.index('"forced_movement"')

    assert pull_event < dynamic_tick_continue


def test_monster_melee_arcs_use_monster_visual_contract() -> None:
    source = _app_source()
    release_body = source.split("function releaseMonsterSkillMeleeZone", 1)[1].split("function clampMonsterSkillZoneCenter", 1)[0]
    vfx_body = source.split("function monsterSkillVfxKey", 1)[1].split("function updateBossSkillRuntime", 1)[0]
    renderer_source = (ROOT / "webapp" / "battleGeometryRenderer.ts").read_text(encoding="utf-8")
    monster_skill_config = json.loads((ROOT / "configs" / "monsters" / "monster_skills.json").read_text(encoding="utf-8"))
    all_monster_skills = [
        *(monster_skill_config["skills"]),
        *(skill for pattern in monster_skill_config["boss_patterns"] for skill in pattern["skills"]),
    ]
    melee_arc_ids = [skill["id"] for skill in all_monster_skills if skill.get("module") == "monster_melee_arc"]

    assert 'const directionTarget = skill.module === "monster_melee_arc" ? playerNow : center' in release_body
    assert "const direction = guideDirection(enemy, directionTarget)" in release_body
    assert "arc_radius: radius" in release_body
    assert "suppress_hit_vfx: monsterSkillSuppressHitVfx(skill)" in release_body
    assert "suppressHitVfx: monsterSkillSuppressHitVfx(skill)" in release_body
    assert 'skill.module === "monster_melee_arc") return `monster_melee_arc_${monsterSkillDamageType(skill) ?? "physical"}`' in vfx_body
    assert 'return skill.module === "monster_melee_arc"' in vfx_body
    assert 'skill.id === "mon_skill_dust_ring_scrape") return "monster_dust_scrape"' in vfx_body
    assert 'if (value.includes("monster_melee_arc")) return "monster_melee_arc"' in renderer_source
    assert 'if (value.includes("monster_dust_scrape")) return "monster_dust_scrape"' in renderer_source
    assert "drawMonsterMeleeArc" in renderer_source
    assert "drawMonsterDustScrape" in renderer_source
    assert set(melee_arc_ids) == {
        "mon_skill_dust_ring_scrape",
        "mon_skill_angle_horn_stab",
        "mon_skill_double_fang_bite",
        "mon_skill_tri_crown_sweep",
        "boss_geo_king_blades",
        "boss_crimson_tyrant_cleave",
        "boss_crack_crown_slash",
    }


def test_damaging_guard_counters_warn_and_cast_inside_hit_radius() -> None:
    source = _app_source()
    runtime_source = (ROOT / "webapp" / "monsterSkillRuntime.ts").read_text(encoding="utf-8")
    monster_skill_config = json.loads((ROOT / "configs" / "monsters" / "monster_skills.json").read_text(encoding="utf-8"))
    release_body = source.split("function releaseMonsterSkillMeleeZone", 1)[1].split("function clampMonsterSkillZoneCenter", 1)[0]
    suppress_body = source.split("function monsterSkillSuppressHitVfx", 1)[1].split("function updateBossSkillRuntime", 1)[0]
    all_monster_skills = [
        *(monster_skill_config["skills"]),
        *(skill for pattern in monster_skill_config["boss_patterns"] for skill in pattern["skills"]),
    ]
    damaging_guard_skills = [
        skill for skill in all_monster_skills
        if skill.get("module") == "monster_guard" and float(skill.get("damage_multiplier", 0)) > 0
    ]

    assert {skill["id"] for skill in damaging_guard_skills} == {
        "mon_skill_stone_shell_counter",
        "mon_skill_blood_mark_guard",
        "mon_skill_core_guard_field",
    }
    for skill in damaging_guard_skills:
        hit_radius = skill.get("radius", skill["range"]["effect_range"])
        assert skill["range"]["cast_range"] <= hit_radius
        assert skill["warning_ms"] > 0
    assert "monsterSkillEffectiveCastRange(skill)" in runtime_source
    assert 'skill.module === "monster_guard" && Number(skill.damage_multiplier ?? 0) > 0' in runtime_source
    assert "return Math.max(1, Number(skill.radius ?? skill.range.effect_range))" in runtime_source
    assert "return true" in suppress_body
    assert 'type: "damage_zone_prime"' in release_body


def test_all_monster_skill_hits_suppress_hit_vfx() -> None:
    source = _app_source()
    projectile_body = source.split("function releaseMonsterSkillProjectiles", 1)[1].split("function releaseMonsterSkillMeleeZone", 1)[0]
    melee_body = source.split("function releaseMonsterSkillMeleeZone", 1)[1].split("function monsterSkillZoneCenter", 1)[0]
    suppress_body = source.split("function monsterSkillSuppressHitVfx", 1)[1].split("function monsterSkillProjectileAimPolicy", 1)[0]
    hit_body = source.split("function applyBossSkillHitToPlayer", 1)[1].split("setTexts((items) =>", 1)[0]

    assert "suppress_hit_vfx: monsterSkillSuppressHitVfx(skill)" in projectile_body
    assert "suppress_hit_vfx: monsterSkillSuppressHitVfx(skill)" in melee_body
    assert "suppressHitVfx: monsterSkillSuppressHitVfx(skill)" in melee_body
    assert "return true" in suppress_body
    assert "if (options.suppressHitVfx === false)" in hit_body
    assert "setHitVfxs((items) =>" in hit_body
    assert "suppressHitVfx: false" not in source
    assert "suppress_hit_vfx: false" not in source


def test_monster_damage_zone_warnings_render_red() -> None:
    renderer_source = (ROOT / "webapp" / "battleGeometryRenderer.ts").read_text(encoding="utf-8")
    styles_source = (ROOT / "webapp" / "styles.css").read_text(encoding="utf-8")
    draw_area_body = renderer_source.split("function drawAreaMarkers", 1)[1].split("function drawHitMarkers", 1)[0]
    draw_zone_body = renderer_source.split("function drawDamageZoneCircle", 1)[1].split("function isBurningShotIgnitedExplosion", 1)[0]

    assert 'const MONSTER_WARNING_COLOR = "#ff3d3d"' in renderer_source
    assert "const color = area.warning ? MONSTER_WARNING_COLOR : geometricToneColor(area.vfxKey || area.damageType)" in draw_area_body
    assert "if (area.warning) {" in draw_zone_body
    assert "drawGenericDamageZoneCircle(context, area, radius, color, progress)" in draw_zone_body
    assert ".damage-zone-vfx-warning" in styles_source
    assert "rgba(255, 61, 61, 0.98)" in styles_source
    assert ".damage-zone-vfx-warning.damage-zone-vfx-circle::before" in styles_source
    assert ".damage-zone-vfx-warning.damage-zone-vfx-rectangle" in styles_source


def test_blood_mark_guard_has_active_damage_counter() -> None:
    source = _app_source()
    runtime_source = (ROOT / "webapp" / "monsterSkillRuntime.ts").read_text(encoding="utf-8")
    monster_skill_config = json.loads((ROOT / "configs" / "monsters" / "monster_skills.json").read_text(encoding="utf-8"))
    release_body = source.split("function releaseMonsterSkill", 1)[1].split("function moveMonsterBySkill", 1)[0]
    melee_body = source.split("function releaseMonsterSkillMeleeZone", 1)[1].split("function clampMonsterSkillZoneCenter", 1)[0]
    monster_skills = {skill["id"]: skill for skill in monster_skill_config["skills"]}
    monster_assignments = {
        assignment["monster_id"]: assignment["skill_id"]
        for assignment in monster_skill_config["assignments"]
        if "skill_id" in assignment
    }
    blood_mark = monster_skills["mon_skill_blood_mark_guard"]

    assert monster_assignments["mon_200106"] == "mon_skill_blood_mark_guard"
    assert blood_mark["module"] == "monster_guard"
    assert blood_mark["damage_multiplier"] > 0
    assert blood_mark["radius"] == blood_mark["range"]["effect_range"]
    assert blood_mark["range"]["cast_range"] <= blood_mark["radius"]
    assert blood_mark["warning_ms"] > 0
    assert blood_mark["guard_damage_reduction_percent"] > 0
    assert "releaseMonsterSkillMeleeZone(updatedEnemy, skill, sequence, nowMs)" in release_body
    assert "damage_amount: monsterOutgoingDamage(enemy) * Math.max(0, Number(skill.damage_multiplier ?? 1))" in melee_body
    assert "pendingBossDamageZoneHits.current.push" in melee_body
    assert "monsterSkillEffectiveCastRange(skill)" in runtime_source


def test_mirror_amplify_is_active_monster_projectile() -> None:
    source = _app_source()
    renderer_source = (ROOT / "webapp" / "battleGeometryRenderer.ts").read_text(encoding="utf-8")
    monster_skill_config = json.loads((ROOT / "configs" / "monsters" / "monster_skills.json").read_text(encoding="utf-8"))
    release_body = source.split("function releaseMonsterSkill", 1)[1].split("function moveMonsterBySkill", 1)[0]
    projectile_body = source.split("function releaseMonsterSkillProjectiles", 1)[1].split("function releaseMonsterSkillMeleeZone", 1)[0]
    vfx_body = source.split("function monsterSkillVfxKey", 1)[1].split("function monsterSkillSuppressHitVfx", 1)[0]
    monster_skills = {skill["id"]: skill for skill in monster_skill_config["skills"]}
    monster_assignments = {
        assignment["monster_id"]: assignment["skill_id"]
        for assignment in monster_skill_config["assignments"]
        if "skill_id" in assignment
    }
    mirror = monster_skills["mon_skill_mirror_amplify"]

    assert monster_assignments["mon_200108"] == "mon_skill_mirror_amplify"
    assert mirror["module"] == "monster_projectile"
    assert mirror["damage_multiplier"] > 0
    assert mirror["projectile_speed"] > 0
    assert mirror["projectile_count"] == 1
    assert 'if (skill.module === "monster_projectile")' in release_body
    assert "releaseMonsterSkillProjectiles(updatedEnemy, skill, sequence, nowMs)" in release_body
    assert "player_damage_multiplier: Math.max(0, Number(skill.damage_multiplier ?? 1))" in projectile_body
    assert 'skill.id === "mon_skill_mirror_amplify") return "monster_mirror_shard"' in vfx_body
    assert 'if (value.includes("monster_mirror_shard")) return "monster_mirror_shard"' in renderer_source
    assert "drawMonsterMirrorShardProjectile" in renderer_source


def test_star_hunter_mark_is_ally_heal_support() -> None:
    source = _app_source()
    runtime_source = (ROOT / "webapp" / "monsterSkillRuntime.ts").read_text(encoding="utf-8")
    visual_tokens_source = (ROOT / "webapp" / "visualTokens.ts").read_text(encoding="utf-8")
    monster_skill_config = json.loads((ROOT / "configs" / "monsters" / "monster_skills.json").read_text(encoding="utf-8"))
    release_body = source.split("function releaseMonsterSkill", 1)[1].split("function moveMonsterBySkill", 1)[0]
    monster_skills = {skill["id"]: skill for skill in monster_skill_config["skills"]}
    monster_assignments = {
        assignment["monster_id"]: assignment["skill_id"]
        for assignment in monster_skill_config["assignments"]
        if "skill_id" in assignment
    }
    star_heal = monster_skills["mon_skill_star_hunter_mark"]

    assert monster_assignments["mon_300103"] == "mon_skill_star_hunter_mark"
    assert star_heal["module"] == "monster_support"
    assert star_heal["damage_multiplier"] == 0
    assert star_heal["heal_percent_max_life"] == 5
    assert star_heal["buff_radius"] == star_heal["range"]["effect_range"]
    assert star_heal["range"]["cast_range"] >= 430
    assert "heal_percent_max_life?: number" in runtime_source
    assert "const healPercent = Math.max(0, Number(skill.heal_percent_max_life ?? 0))" in release_body
    assert "supportedTargets += 1" in release_body
    assert "ally.maxHp * healPercent / 100" in release_body
    assert "hp: nextHp" in release_body
    assert 'damageType: "heal"' in release_body
    assert 'vfxKey: "monster_heal_pulse"' in release_body
    assert "setCombatLogs((logs) => [" in release_body
    assert "token.includes(\"heal\")" in visual_tokens_source


def test_geo_king_boss_skills_cover_their_cast_range() -> None:
    monster_skill_config = json.loads((ROOT / "configs" / "monsters" / "monster_skills.json").read_text(encoding="utf-8"))
    pattern = next(pattern for pattern in monster_skill_config["boss_patterns"] if pattern["id"] == "boss_pattern_geo_king")
    assignments = {
        assignment["monster_id"]: assignment["boss_pattern_id"]
        for assignment in monster_skill_config["assignments"]
        if "boss_pattern_id" in assignment
    }

    assert assignments["mon_400001"] == "boss_pattern_geo_king"
    for skill in pattern["skills"]:
        cast_range = skill["range"]["cast_range"]
        hit_radius = skill.get("radius", skill["range"]["effect_range"])
        assert skill["range"]["effect_range"] >= cast_range
        assert hit_radius >= cast_range
        assert skill["range"]["leash_range"] >= hit_radius


def test_phase_void_bolt_is_buffed_boss_projectile_barrage() -> None:
    monster_skill_config = json.loads((ROOT / "configs" / "monsters" / "monster_skills.json").read_text(encoding="utf-8"))
    pattern = next(pattern for pattern in monster_skill_config["boss_patterns"] if pattern["id"] == "boss_pattern_phase_void")
    assignments = {
        assignment["monster_id"]: assignment["boss_pattern_id"]
        for assignment in monster_skill_config["assignments"]
        if "boss_pattern_id" in assignment
    }
    bolt = next(skill for skill in pattern["skills"] if skill["id"] == "boss_phase_void_bolt")

    assert assignments["mon_400002"] == "boss_pattern_phase_void"
    assert bolt["module"] == "monster_projectile"
    assert bolt["projectile_pattern"] == "ring"
    assert bolt["projectile_count"] >= 8
    assert bolt["projectile_speed"] >= 500
    assert bolt["projectile_radius"] >= 16
    assert bolt["damage_multiplier"] >= 0.92
    assert bolt["cooldown_ms"] <= 2300
    assert bolt["windup_ms"] <= 320
    assert bolt["range"]["effect_range"] >= 680
    assert bolt["range"]["leash_range"] >= bolt["range"]["effect_range"]


def test_star_mother_has_repeated_player_locked_warning_zone() -> None:
    source = _app_source()
    runtime_source = (ROOT / "webapp" / "monsterSkillRuntime.ts").read_text(encoding="utf-8")
    monster_skill_config = json.loads((ROOT / "configs" / "monsters" / "monster_skills.json").read_text(encoding="utf-8"))
    pattern = next(pattern for pattern in monster_skill_config["boss_patterns"] if pattern["id"] == "boss_pattern_star_mother")
    assignments = {
        assignment["monster_id"]: assignment["boss_pattern_id"]
        for assignment in monster_skill_config["assignments"]
        if "boss_pattern_id" in assignment
    }
    triple_mark = next(skill for skill in pattern["skills"] if skill["id"] == "boss_star_mother_triple_mark")
    release_body = source.split("function releaseMonsterSkillMeleeZone", 1)[1].split("function monsterSkillDamageType", 1)[0]

    assert assignments["mon_400004"] == "boss_pattern_star_mother"
    assert "三连星标" in pattern["chinese_form"]
    assert triple_mark["module"] == "monster_damage_zone"
    assert triple_mark["repeat_count"] == 3
    assert triple_mark["repeat_interval_ms"] == 1000
    assert triple_mark["warning_ms"] > 0
    assert triple_mark["damage_multiplier"] > 0
    assert triple_mark["radius"] >= 120
    assert "repeat_count?: number" in runtime_source
    assert "repeat_interval_ms?: number" in runtime_source
    assert "const repeatCount = Math.max(1, Math.round(Number(skill.repeat_count ?? 1)))" in release_body
    assert "window.setTimeout(() => {" in release_body
    assert "playerStateRef.current.hp <= 0" in release_body
    assert "releaseMonsterSkillMeleeZoneInstance(liveEnemy, skill, sequence, performance.now(), repeatIndex + 1, repeatCount)" in release_body
    assert 'skill.id === "boss_star_mother_triple_mark") return { x: target.x, y: target.y }' in release_body
    assert "repeat_index: repeatIndex" in release_body
    assert "type: \"damage_zone_prime\"" in release_body


def test_iron_judicator_bolt_is_buffed_boss_projectile_barrage() -> None:
    monster_skill_config = json.loads((ROOT / "configs" / "monsters" / "monster_skills.json").read_text(encoding="utf-8"))
    pattern = next(pattern for pattern in monster_skill_config["boss_patterns"] if pattern["id"] == "boss_pattern_iron_judicator")
    assignments = {
        assignment["monster_id"]: assignment["boss_pattern_id"]
        for assignment in monster_skill_config["assignments"]
        if "boss_pattern_id" in assignment
    }
    bolt = next(skill for skill in pattern["skills"] if skill["id"] == "boss_iron_judicator_bolt")

    assert assignments["mon_400005"] == "boss_pattern_iron_judicator"
    assert bolt["module"] == "monster_projectile"
    assert bolt["projectile_pattern"] == "cross"
    assert bolt["projectile_count"] >= 4
    assert bolt["projectile_speed"] >= 520
    assert bolt["projectile_radius"] >= 17
    assert bolt["projectile_width"] >= 26
    assert bolt["damage_multiplier"] >= 0.98
    assert bolt["cooldown_ms"] <= 2350
    assert bolt["windup_ms"] <= 320
    assert bolt["range"]["effect_range"] >= 690
    assert bolt["range"]["leash_range"] >= bolt["range"]["effect_range"]


def test_all_boss_projectile_skills_are_buffed() -> None:
    monster_skill_config = json.loads((ROOT / "configs" / "monsters" / "monster_skills.json").read_text(encoding="utf-8"))
    boss_projectiles = [
        (pattern, skill)
        for pattern in monster_skill_config["boss_patterns"]
        for skill in pattern["skills"]
        if skill["module"] == "monster_projectile"
    ]
    toxic_eclipse = next(
        skill
        for pattern, skill in boss_projectiles
        if pattern["monster_id"] == "mon_500001" and skill["id"] == "boss_toxic_eclipse_bolt"
    )

    assert len(boss_projectiles) == 16
    for pattern, skill in boss_projectiles:
        assert skill["projectile_count"] >= 4, skill["id"]
        assert skill["projectile_radius"] >= 15, skill["id"]
        assert skill["projectile_width"] >= 22, skill["id"]
        assert skill["damage_multiplier"] >= 0.82, skill["id"]
        assert skill["projectile_speed"] <= 600, skill["id"]
        assert skill["range"]["effect_range"] >= skill["range"]["cast_range"], skill["id"]
        assert skill["range"]["leash_range"] >= skill["range"]["effect_range"], skill["id"]
        if skill["role"] == "major":
            assert skill["projectile_speed"] >= 430, skill["id"]
            assert skill["projectile_count"] >= 8, skill["id"]
        else:
            assert skill["projectile_speed"] >= 500, skill["id"]
            assert skill["damage_multiplier"] >= 0.92, skill["id"]

    assert toxic_eclipse["projectile_pattern"] == "wide_fan"
    assert toxic_eclipse["projectile_count"] == 5
    assert toxic_eclipse["projectile_speed"] >= 520
    assert toxic_eclipse["damage_multiplier"] >= 0.98
    assert toxic_eclipse["cooldown_ms"] <= 2150
    assert toxic_eclipse["chinese_form"].startswith("毒蚀扇幕")


def test_boss_skill_patterns_are_diverse() -> None:
    source = _app_source()
    runtime_source = (ROOT / "webapp" / "monsterSkillRuntime.ts").read_text(encoding="utf-8")
    monster_skill_config = json.loads((ROOT / "configs" / "monsters" / "monster_skills.json").read_text(encoding="utf-8"))
    boss_skills = [
        skill
        for pattern in monster_skill_config["boss_patterns"]
        for skill in pattern["skills"]
    ]
    projectile_patterns = {
        skill["projectile_pattern"]
        for skill in boss_skills
        if skill.get("module") == "monster_projectile" and "projectile_pattern" in skill
    }
    zone_patterns = {
        skill["zone_pattern"]
        for skill in boss_skills
        if skill.get("module") == "monster_damage_zone" and "zone_pattern" in skill
    }

    assert 'projectile_pattern?: "fan" | "wide_fan" | "ring" | "spiral" | "cross"' in runtime_source
    assert 'zone_pattern?: "single" | "around_player" | "ring" | "cross" | "line"' in runtime_source
    assert "function monsterSkillProjectileSpreadAngles" in source
    assert 'pattern === "ring"' in source
    assert 'pattern === "spiral"' in source
    assert 'pattern === "cross"' in source
    assert 'pattern === "wide_fan"' in source
    assert "function monsterSkillZoneCenters" in source
    assert 'pattern === "ring" || pattern === "around_player"' in source
    assert 'pattern === "line"' in source
    assert "zones: centers.map" in source
    assert {"wide_fan", "ring", "spiral", "cross"}.issubset(projectile_patterns)
    assert {"around_player", "ring", "cross", "line"}.issubset(zone_patterns)
    assert sum(1 for skill in boss_skills if "projectile_pattern" in skill or "zone_pattern" in skill) >= 20


def test_twilight_sentry_bolt_uses_monster_projectile_contract() -> None:
    source = _app_source()
    renderer_source = (ROOT / "webapp" / "battleGeometryRenderer.ts").read_text(encoding="utf-8")
    monster_skill_config = json.loads((ROOT / "configs" / "monsters" / "monster_skills.json").read_text(encoding="utf-8"))
    release_body = source.split("function releaseMonsterSkillProjectiles", 1)[1].split("function releaseMonsterSkillMeleeZone", 1)[0]
    vfx_body = source.split("function monsterSkillVfxKey", 1)[1].split("function updateBossSkillRuntime", 1)[0]
    projectile_spawn_body = source.split('if (event.type === "projectile_spawn")', 1)[1].split('if (event.type === "projectile_hit")', 1)[0]
    impact_body = source.split("function processBossProjectilePlayerImpacts", 1)[1].split("function processPendingBossDamageZoneHits", 1)[0]
    monster_skills = {skill["id"]: skill for skill in monster_skill_config["skills"]}
    monster_assignments = {
        assignment["monster_id"]: assignment["skill_id"]
        for assignment in monster_skill_config["assignments"]
        if "skill_id" in assignment
    }
    sentry_bolt = monster_skills["mon_skill_twilight_sentry_bolt"]

    assert monster_assignments["mon_100106"] == "mon_skill_twilight_sentry_bolt"
    assert sentry_bolt["module"] == "monster_projectile"
    assert 'skill.id === "mon_skill_twilight_sentry_bolt") return "monster_twilight_sentry_bolt"' in vfx_body
    assert 'skill.id === "mon_skill_twilight_sentry_bolt"' in vfx_body
    assert "suppress_hit_vfx: monsterSkillSuppressHitVfx(skill)" in release_body
    assert "suppressHitVfx: event.payload?.suppress_hit_vfx === true" in projectile_spawn_body
    assert "x: point.x" in impact_body
    assert "targetX: point.x" in impact_body
    assert "velocityX: 0" in impact_body
    assert "ttl: Math.min(bolt.ttl, 0.02)" in impact_body
    assert "suppressHitVfx: bolt.suppressHitVfx" in impact_body
    assert 'if (value.includes("monster_twilight_sentry_bolt")) return "monster_twilight_sentry_bolt"' in renderer_source
    assert "drawMonsterTwilightSentryProjectile" in renderer_source


def test_frost_crystal_slow_bolt_reaims_on_projectile_spawn() -> None:
    source = _app_source()
    monster_skill_config = json.loads((ROOT / "configs" / "monsters" / "monster_skills.json").read_text(encoding="utf-8"))
    release_body = source.split("function releaseMonsterSkillProjectiles", 1)[1].split("function releaseMonsterSkillMeleeZone", 1)[0]
    aim_policy_body = source.split("function monsterSkillProjectileAimPolicy", 1)[1].split("function updateBossSkillRuntime", 1)[0]
    spawn_position_body = source.split("function projectileSpawnPositionForEvent", 1)[1].split("function liveOrbitCenter", 1)[0]
    projectile_spawn_body = source.split('if (event.type === "projectile_spawn")', 1)[1].split('if (event.type === "projectile_hit")', 1)[0]
    monster_skills = {skill["id"]: skill for skill in monster_skill_config["skills"]}
    monster_assignments = {
        assignment["monster_id"]: assignment["skill_id"]
        for assignment in monster_skill_config["assignments"]
        if "skill_id" in assignment
    }
    frost_bolt = monster_skills["mon_skill_frost_crystal_slow_bolt"]

    assert monster_assignments["mon_200103"] == "mon_skill_frost_crystal_slow_bolt"
    assert frost_bolt["module"] == "monster_projectile"
    assert frost_bolt["windup_ms"] <= 240
    assert frost_bolt["projectile_speed"] >= 380
    assert frost_bolt["cooldown_ms"] <= 2550
    assert frost_bolt["range"]["effect_range"] >= 540
    assert 'skill.id === "mon_skill_frost_crystal_slow_bolt" ? "target_current_position"' in aim_policy_body
    assert "aim_policy: aimPolicy" in release_body
    assert 'spawn_policy: aimPolicy === "target_current_position" ? "source_current_position" : "authored_spawn_position"' in release_body
    assert "projectile_range: travel" in release_body
    assert 'event.payload?.spawn_policy === "source_current_position"' in spawn_position_body
    assert "function liveMonsterProjectileTrajectoryForEvent" in spawn_position_body
    assert 'event.payload?.aim_policy !== "target_current_position"' in spawn_position_body
    assert "guideDirection(spawnPosition, playerStateRef.current)" in spawn_position_body
    assert "liveMonsterProjectileTrajectoryForEvent(event, spawnPosition, projectileSpeed)" in projectile_spawn_body
    assert "liveMonsterTrajectory?.target" in projectile_spawn_body


def test_poison_weave_mist_locks_zone_to_player_position() -> None:
    source = _app_source()
    monster_skill_config = json.loads((ROOT / "configs" / "monsters" / "monster_skills.json").read_text(encoding="utf-8"))
    release_body = source.split("function releaseMonsterSkillMeleeZone", 1)[1].split("function clampMonsterSkillZoneCenter", 1)[0]
    monster_skills = {skill["id"]: skill for skill in monster_skill_config["skills"]}
    monster_assignments = {
        assignment["monster_id"]: assignment["skill_id"]
        for assignment in monster_skill_config["assignments"]
        if "skill_id" in assignment
    }
    poison_mist = monster_skills["mon_skill_poison_weave_mist"]

    assert monster_assignments["mon_200104"] == "mon_skill_poison_weave_mist"
    assert poison_mist["module"] == "monster_damage_zone"
    assert poison_mist["range"]["cast_range"] > poison_mist["range"]["effect_range"]
    assert 'const center = monsterSkillZoneCenter(enemy, playerNow, skill)' in release_body
    assert 'skill.id === "mon_skill_poison_weave_mist") return { x: target.x, y: target.y }' in release_body
    assert "origin_world_position: center" in release_body
    assert "position: center" in release_body
    assert "zones: [{ ...center, radius }]" in release_body


def test_frontend_gem_drop_pool_is_not_seed_inventory() -> None:
    source = _app_source()
    options_body = source.split("async function requestGmOptions", 1)[1].split("async function requestGmEquipmentAffixes", 1)[0]
    pickup_body = source.split("function createFrontendInventoryItem", 1)[1].split("function applyFrontendPickup", 1)[0]
    drop_pool_source = (ROOT / "webapp" / "frontendGemDropData.ts").read_text(encoding="utf-8")

    assert "FRONTEND_GEM_DROP_POOL" in options_body
    assert "FRONTEND_INITIAL_APP_STATE.inventory" not in options_body
    assert "FRONTEND_GEM_DROP_POOL" in pickup_body
    assert '"sudoku_digit": 9' in drop_pool_source
    assert '"gem_type_9"' in drop_pool_source
    assert drop_pool_source.count('"base_gem_id"') >= 60
