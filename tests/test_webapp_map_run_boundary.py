from __future__ import annotations

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
