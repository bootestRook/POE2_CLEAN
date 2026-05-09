import { CSSProperties, DragEvent, MouseEvent, ReactNode, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { compareDimetricDepth, dimetricDepth } from "./isoDepth";
import React from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { APP_TITLE, RELEASE_DEBUG_TOOLS_ENABLED } from "./appMetadata";
import { unprojectScreenToWorld } from "./isoProjection";
import { BAKED_BATTLE_MAPS, bakedMapAssetById, DEFAULT_BAKED_BATTLE_MAP_ID } from "./bakedMapAssets";
import { BakedBattleMapData, isMapPointWalkable, loadBakedBattleMap, resolveWalkableMove } from "./bakedMapLoader";
import mapSpawnV1Config from "../configs/monsters/map_spawn_v1.json";
import monsterDefsToml from "../configs/monsters/monster_defs.toml?raw";
import { generateProceduralMonsterSpawns, isNemesisRarity, parseMonsterDefinitionsToml } from "./mapSpawnRuntime";
import type { MapSpawnV1Config, MonsterSkillShape, MonsterType, ProceduralSpawnDebugSummary, ProceduralSpawnRarity, ProceduralZoneType } from "./mapSpawnRuntime";
import monsterSkillsConfig from "../configs/monsters/monster_skills.json";
import supremeBossSkillsConfig from "../configs/bosses/supreme_boss_skills.json";
import { allowedFrontendLootKindsForPool, resolveFrontendMonsterDropRule, scaleFrontendDropRarityWeights } from "./frontendMonsterDropRules";
import {
  createMonsterSkillTimer,
  markMonsterSkillReleased,
  monsterSkillAssignmentFor,
  monsterSkillDefinitionFor,
  monsterSkillHitAllowed,
  nextMonsterSkillCandidate,
  validateMonsterSkillConfig
} from "./monsterSkillRuntime";
import type { MonsterBossPatternSkill, MonsterDamageForm, MonsterDamageType, MonsterSkillConfig, MonsterSkillDefinition, MonsterSkillRange, MonsterSkillRuntimeTimer } from "./monsterSkillRuntime";
import {
  buildSupremeBossSkillEvents,
  normalizeSupremeBossSkillConfig,
  supremeBossSkillForMonster,
  supremeBossSkillIds,
  validateSupremeBossSkillConfig
} from "./supremeBossSkillRuntime";
import type { SupremeBossSkillDefinition, SupremeBossRuntimeEvent } from "./supremeBossSkillRuntime";
import type { Enemy, EncounterMonsterPalette, RuntimeBoundaryScanSummary, RuntimeEncounterAggroSource } from "./types/enemyTypes";
import {
  AUTHORED_MAP_TEMPLATES,
  DEFAULT_AUTHORED_MAP_TEMPLATE_ID,
  MONSTER_TEST_MAP_TEMPLATE_ID,
  REST_AREA_MAP_TEMPLATE_ID,
  authoredMapTemplateById,
  defaultAuthoredMapTemplate
} from "./mapTemplateRegistry";
import {
  chooseAuthoredMapTemplateId,
  chooseIndex,
  chooseMapInstanceRotation,
  createMapInstanceSeed,
  rotateCellPoint,
  rotateGrid,
  rotatedGridSize
} from "./mapInstanceRuntime";
import type { MapInstanceMetadata, MapInstanceRotation } from "./mapInstanceRuntime";
import { resolveUnitAnimation, UnitAnimationContext, UnitAnimationFrame } from "./unitAnimation";
import { fallbackUnitVisualForMonster, MONSTER_GEOMETRY_VISUALS, MONSTER_RARITY_VISUALS, resolveMonsterGeometryVisual } from "./monsterGeometryVisuals";
import {
  selectEnemyUnitType,
  UnitDirection,
} from "./unitAssets";
import { frontendPlayableSkillRuntimeFamilyForBehavior } from "./frontendPlayableSkillRuntime";
import { FRONTEND_GEM_DROP_POOL } from "./frontendGemDropData";
import { FRONTEND_INITIAL_APP_STATE, FRONTEND_SKILL_PREVIEWS_BY_SKILL_TAG } from "./frontendGameData";
import { FRONTEND_SKILL_LEVEL_TABLES } from "./frontendSkillLevelTables";
import {
  applyFrontendEquipmentStatModifiers,
  chooseFrontendEquipmentSource,
  createSpecifiedFrontendEquipment,
  frontendEquipmentAffixOptions,
  frontendEquipmentAffixTexts,
  frontendEquipmentRarities,
  frontendEquipmentRarityText,
  frontendEquipmentSources,
  frontendEquipmentStatModifiers,
  generateFrontendEquipment,
  preloadFrontendEquipmentData,
  prefixSuffixCapacity,
} from "./frontendEquipmentRuntime";
import type { FrontendEquipmentAffixRoll, FrontendEquipmentItem, FrontendEquipmentStatModifier } from "./frontendEquipmentRuntime";
import { frontendEquipmentIconSprite } from "./frontendEquipmentIconSprites";
import type {
  SecondaryHitConfig,
  SkillEditorCameraSettings,
  SkillEditorDebugOptions,
  SkillEditorState,
  SkillPackageData
} from "./types/skillEditorTypes";
import { DEFAULT_SKILL_EDITOR_DEBUG_OPTIONS, loadSkillEditorCameraSettings, SKILL_EDITOR_CAMERA_STORAGE_KEY } from "./features/disabled-skill-editor/disabledSkillEditorSettings";
import { SkillEditorDebugToggles } from "./features/disabled-skill-editor/SkillEditorDebugToggles";
import { SkillEditorPanel } from "./features/disabled-skill-editor/SkillEditorPanel";
import { PlayableBattleScene } from "./features/playable-battle/PlayableBattleScene";
import {
  ENEMY_ATTACK_VISUAL_DURATION_MS,
  ENEMY_DAMAGE_FLASH_SECONDS,
  ENEMY_HEALTH_VISIBLE_SECONDS,
  ENEMY_MELEE_EDGE_CONTACT_TOLERANCE,
  ENEMY_WALK_VISUAL_DEADZONE,
  PLAYER_GEOMETRY_RADIUS,
  candidateEnemiesNear,
  canEnemyReachPlayerForMelee,
  canEnemyStartRuntimeAttack,
  defaultMonsterOffense,
  enemyCollisionRadius,
  enemyGridIndex,
  enemyHasWalkableLine,
  enemyReachableMeleeOccupancyTarget,
  enemyVisualRadius,
  enemyWorldToGrid,
  monsterAttackCadenceMs,
  monsterAttackRange,
  monsterMeleeReachRange,
  nearestRuntimeWalkablePoint,
  runRuntimeBoundaryMonsterAiScan,
  runtimeBoundaryMonsterScanLine,
  runtimeDebugMonsterCornerSummary,
  runtimeDebugMonsterDistances,
  selectRenderableEnemies,
  shouldRetainEnemyForGameplayOrDamageFlash,
  updateRuntimeEnemies
} from "./runtime/enemyRuntime";
import { CharacterInfoPanel } from "./components/character/CharacterInfoPanel";
import type { CharacterPanelView } from "./components/character/CharacterInfoPanel";
import type { TooltipRichLine } from "./components/tooltips/TooltipPrimitives";
import { createNormalizeActiveTooltipView } from "./components/tooltips/activeTooltipAdapters";
import { equipmentTooltipBonusLines, equipmentTooltipRarityTone, equipmentTooltipStatLines, normalizedEquipmentTooltipTags } from "./components/tooltips/equipmentTooltipAdapters";
import { GemOrb } from "./components/tooltips/GemOrb";
import { GemTooltipOverlay } from "./components/tooltips/GemTooltipOverlay";
import { activeDpsToneClass, buildGemTooltipViewModelWithNormalizers, equipmentRarityTone, equipmentTooltipAffixLine, frontendChannelStackTooltipLines, frontendDamageComponentTooltipLines, frontendEquipmentGrantedTooltipLines, frontendGemLevelText, frontendGuardTooltipLines, frontendProjectileCountTooltipLine, frontendSkillPreviewEffectiveLevelText, frontendSupportModifierTooltipLines, highlightTooltipText, mergeFrontendSkillPreviewBonusLines, mergeFrontendSkillPreviewTooltipLines } from "./components/tooltips/tooltipFormatting";
import { frontendDisplayGemKindTag, frontendTargetTagTexts, normalizeSupportConditionRichLineSection, replaceGemTagRichLines } from "./components/tooltips/tooltipGemTags";
import { getComparisonTooltipPosition as resolveComparisonTooltipPosition, resolveTooltipPosition as resolveTooltipAnchorPosition } from "./components/tooltips/tooltipPositioning";
import { createFrontendItemTooltipView } from "./components/tooltips/tooltipViewModel";
import type { TooltipTargetLine, TooltipView } from "./components/tooltips/tooltipViewModel";
import { gemColorValue } from "./utils/gemDisplay";
import { UnitAnimationSprite } from "./components/battle/UnitAnimationSprite";
import { StashPanel } from "./components/inventory/StashPanel";
import { BagGrid } from "./components/inventory/BagGrid";
import { EquipmentEmptyCell, EquipmentItemCell } from "./components/inventory/EquipmentCells";
import { isFloatingOrigin, isInventoryDropBlockedByInterface, resolveDropTarget, type DropTarget, type FloatingOrigin } from "./components/inventory/inventoryDragTargets";
import { bagCellClass as resolveBagCellClass, bagEmptyCellClass, equipmentCellClass as resolveEquipmentCellClass, equipmentEmptyCellClass } from "./components/inventory/inventoryCellClasses";
import { canPlaceItemInEquipmentSlot, comparisonGemForInventoryEquipment, equipmentSourceSlotId, equipmentTargetSlotIndices, frontendEquipmentSourceSlotIdFromText, isActiveGem, isGemItem, isPassiveGem, isSupportGem, isTwoHandedEquipmentSource, isTwoHandedWeapon, isWeaponItem, isWeaponSlot, removeItemsFromInventorySlots, uniqueEquipmentSlotIds } from "./components/inventory/equipmentRules";
import { FloatingGemView } from "./components/inventory/FloatingGemView";
import { GameViewportFrame } from "./components/layout/GameViewportFrame";
import { CombatFeed, HelpText, MapDebugToggle, SpawnPlanWarningPanel } from "./components/layout/AppShellPanels";
import { SaveSelectionPanel } from "./components/layout/SaveSelectionPanel";
import { useMountedPassiveVisualEffects } from "./hooks/useMountedPassiveVisualEffects";
import { GAME_RESOLUTION_STORAGE_KEY, useGameViewport, type GameResolutionMode, type GameResolutionPreset, type GameViewport } from "./hooks/useGameViewport";
import { initialMapEditorMode, initialMonsterTestMode, initialSkillEditorMode, initialSkillEditorOpen, initialSpriteTestMode } from "./utils/appModeFlags";
import { clearFrontendAutosave, clearFrontendSaveSlot, frontendSavePayloadFromSanitizedState, frontendStateCandidateFromSave, latestFrontendSaveSlotId, loadActiveFrontendSaveSlotId, loadFrontendAutosaveResult, loadFrontendSaveSlotSummaries, saveActiveFrontendSaveSlotId, saveFrontendAutosavePayload, type FrontendSaveSlotSummary as FrontendSaveStorageSlotSummary } from "./utils/frontendSaveStorage";
import { DEFAULT_PLAYER_NAME, formatFrontendSaveTime, normalizePlayerName } from "./utils/frontendSaveFormatting";
import { clientToGameViewportPoint, currentGameViewportMetrics } from "./utils/gameViewportMetrics";
import { playableMinimapCellKeyForPoint, playableMinimapRevealCells, playableMinimapUsesClientOnlyState } from "./utils/playableMinimapState";
import { runtimeDebugMapInstanceRotation, runtimeDebugMapInstanceSeed, runtimeDebugMonsterBoundaryTestEnabled, runtimeDebugMonsterCornerTestEnabled } from "./utils/runtimeDebugFlags";
import { clamp, distance, guideDirection } from "./utils/math2d";
import { cssToken, visualTone } from "./utils/vfxTone";
import { playerInputVector, projectMovementVectorForAnimation, resolveAnimationDirection, unitMovementState } from "./utils/runtimeMotion";
import { BattlePauseOverlay, GameFailureOverlay, PortalConfirmOverlay } from "./components/battle/BattleOverlays";
import { HitVfxView } from "./components/battle/HitAndBuffViews";
import { FireBoltView } from "./components/battle/ProjectileBodyViews";
import {
  FIRE_BOLT_FAKE_Z,
  FIRE_BOLT_IMPACT_DURATION_MS,
  ICE_SHARDS_IMPACT_DURATION_MS,
  PENETRATING_SHOT_IMPACT_DURATION_MS,
  PROJECTILE_BODY_EXIT_FADE_DURATION,
  ballisticArcVisualLift,
  ballisticShadowStyle,
  damageNumberText,
  fireBoltAliveRemaining,
  fireBoltTravel,
  fireBoltWorldPoint,
  floatingTextDamageComponents,
  normalizedVfxScale,
  projectileBodyOpacity,
  projectileVfxKind,
  usesCanvasHitVfx,
  usesCanvasProjectileVfx
} from "./components/battle/projectileVfxPresentation";
import { MapSelectionPanel } from "./components/battle/MapSelectionPanel";
import { MonsterTestPanel } from "./components/battle/MonsterTestPanel";
import type { PlayableMinimapMode } from "./components/battle/PlayableBattleMinimap";
import { ProceduralSpawnDebugPanel } from "./components/battle/ProceduralSpawnDebugPanel";
import { BoardCell, GemGhost, previewRelationLabel, SupportLines, SupportPreviewLines } from "./components/skill-board/SkillBoardPresentation";
import type { PreviewRelationType, SupportLine, SupportPreview } from "./components/skill-board/SkillBoardPresentation";
import { GmToolPanel } from "./components/layout/GmToolPanel";
import {
  DEFAULT_RUNTIME_MAP_ID,
  MAP_EDITOR_CURRENT_FILE_STORAGE_KEY,
  MAP_EDITOR_PLAYER_RENDER_SCALE,
  MAP_EDITOR_STORAGE_KEY,
  MapEditorScene,
  createEditorRuntimeBattleMap,
  editorRuntimeCoordinatePoint,
  isEditorRuntimeBattleMap,
  mapEditorZoneCenter,
  mapEditorZoneRects,
  runtimeBattleMapOptions,
} from "./components/map-editor/MapEditorScene";
import type {
  MapEditorFileDocument,
  MapEditorZone,
  MapEditorZoneRect,
} from "./components/map-editor/MapEditorScene";
import { SpriteTestScene } from "./components/sprite-test/SpriteTestScene";
import { REST_AREA_INTERACTION_RADIUS, RestAreaScene, restAreaInteractablePosition } from "./components/rest-area/RestAreaScene";

type Gem = {
  instance_id: string;
  base_gem_id?: string;
  item_kind?: "gem" | "ordinary" | "equipment";
  name_text: string;
  description_text?: string;
  category_text: string;
  rarity_text: string;
  gem_kind?: "active_skill" | "passive_skill" | "support" | "";
  sudoku_digit?: number;
  gem_type: { id?: string; number?: number; display_text: string; identity_text: string };
  tags: readonly { id?: string; text: string }[];
  current_effective_targets: readonly { name_text: string }[];
  board_position: { row: number; column: number } | null;
  visual_effect?: string;
  shape_effect?: string;
  shape_effect_text?: string;
  tooltip_view?: TooltipView;
  base_effect?: {
    base_release_interval_ms?: number;
    release_interval_ms?: number;
  };
  level?: number;
  equipment_affixes?: FrontendEquipmentAffixRoll[];
  equipment_stat_modifiers?: FrontendEquipmentStatModifier[];
  equipment_slot_id?: string;
  equipment_rarity?: string;
  passive_effects?: FrontendPassiveEffect[];
  locked?: boolean;
};

type FrontendPassiveEffect = {
  target?: string;
  stat?: string;
  value?: number;
  layer?: string;
};

type ShapeEffectPreview = { id: string; text: string };

type Cell = {
  row: number;
  column: number;
  box: number;
  gem: Gem | null;
};

type SkillAppliedModifier = {
  source_instance_id: string;
  source_name_text: string;
  target_instance_id: string;
  stat: { id?: string; text: string };
  value: number;
  relation_text: string;
  reason_text: string;
  applied: boolean;
  shape_effect?: string;
  shape_effect_text?: string;
};

type SkillPreview = {
  active_gem_instance_id: string;
  name_text: string;
  skill_template_id: string;
  skill_package_id?: string;
  skill_package_version?: string;
  base_gem_id?: string;
  template_text: string;
  damage_type: string;
  behavior_type: string;
  behavior_template?: string;
  visual_effect: string;
  cast?: Record<string, unknown>;
  hit?: Record<string, unknown>;
  runtime_params?: Record<string, unknown>;
  presentation_keys?: Record<string, unknown>;
  source_context?: Record<string, unknown>;
  skill_stats?: Record<string, number | boolean>;
  shape_effects: readonly ShapeEffectPreview[];
  final_damage: number;
  base_damage?: number;
  non_crit_damage?: number;
  increase_pool?: number;
  final_pool?: number;
  crit_chance?: number;
  crit_multiplier?: number;
  expected_hit_damage?: number;
  base_damage_components?: Record<string, number>;
  final_damage_components?: Record<string, number>;
  uses_per_second?: number;
  base_release_interval_ms?: number;
  release_interval_ms?: number;
  actual_interval_ms?: number;
  base_cooldown_ms?: number;
  trigger_interval_ms?: number;
  mana_cost?: number;
  hit_coverage_factor?: number;
  preview_dps?: number;
  final_cooldown_ms: number;
  projectile_count: number;
  area_multiplier: number;
  speed_multiplier: number;
  tags?: readonly { id?: string; text: string }[];
  applied_modifiers: readonly SkillAppliedModifier[];
};

const DEFAULT_GAME_RESOLUTION_MODE: GameResolutionMode = "fullscreen";
const GAME_RESOLUTION_PRESETS: GameResolutionPreset[] = [
  { mode: "original", label: "原始尺寸", width: null, height: null },
  { mode: "fullscreen", label: "全屏", width: 1920, height: 1080 },
  { mode: "4k", label: "4K", width: 3840, height: 2160 },
  { mode: "2k", label: "2K", width: 2560, height: 1440 },
  { mode: "1080p", label: "1080p", width: 1920, height: 1080 }
];
const GAME_RESOLUTION_PRESET_BY_MODE = new Map(GAME_RESOLUTION_PRESETS.map((preset) => [preset.mode, preset]));

function isGameResolutionMode(value: unknown): value is GameResolutionMode {
  return typeof value === "string" && GAME_RESOLUTION_PRESET_BY_MODE.has(value as GameResolutionMode);
}

function loadGameResolutionMode(): GameResolutionMode {
  if (typeof window === "undefined") return DEFAULT_GAME_RESOLUTION_MODE;
  try {
    const raw = window.localStorage.getItem(GAME_RESOLUTION_STORAGE_KEY);
    return isGameResolutionMode(raw) ? raw : DEFAULT_GAME_RESOLUTION_MODE;
  } catch {
    return DEFAULT_GAME_RESOLUTION_MODE;
  }
}

function saveGameResolutionMode(mode: GameResolutionMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GAME_RESOLUTION_STORAGE_KEY, mode);
}

type SkillEvent = {
  event_id: string;
  type:
    | "cast_start"
    | "projectile_spawn"
    | "projectile_hit"
    | "projectile_impact"
    | "target_search"
    | "chain_segment"
    | "area_spawn"
    | "melee_arc"
    | "damage_zone_prime"
    | "damage_zone"
    | "damage_zone_hit"
    | "orbit_spawn"
    | "orbit_tick"
    | "delayed_area_prime"
    | "delayed_area_explode"
    | "unit_killed"
    | "damage"
    | "status_apply"
    | "forced_movement"
    | "buff_apply"
    | "hit_vfx"
    | "floating_text"
    | "cooldown_update";
  timestamp_ms: number;
  source_entity: string;
  target_entity: string;
  position: { x: number; y: number };
  direction: { x: number; y: number };
  delay_ms: number;
  duration_ms: number;
  amount: number | null;
  damage_type: string;
  skill_instance_id: string;
  vfx_key: string;
  sfx_key: string;
  reason_key: string;
  payload?: {
    end_position?: { x: number; y: number };
    text?: string;
    skill_name?: string;
    [key: string]: unknown;
  };
};

type AppState = {
  player_name?: string;
  inventory: Gem[];
  stash_pages?: (string | null)[][];
  board: {
    cells: Cell[][];
    prompts: string[];
    highlights: Record<string, { instance_ids: string[]; relation_text: string }[]>;
  };
  skill_preview: SkillPreview[];
  skill_error: string | null;
  drops: DropPrompt[];
  logs: string[];
  player_stats?: Record<string, PlayerStatView>;
  character_panel?: CharacterPanelView;
  equipment_slots?: (string | null)[];
  map_progression?: {
    selected_stage_id: string;
    stages: MapProgressionStageView[];
  };
  current_map_run?: {
    run_id: string;
    stage_id: string;
    display_name: string;
    map_level: number;
    monster_level: number;
    map_template_id: string;
    map_instance?: MapInstanceMetadata;
    monsters?: FrontendMapRunMonster[];
  } | null;
  autosave?: {
    enabled: boolean;
    path: string;
  };
  frontend_save?: FrontendSavePayload;
  skill_editor?: SkillEditorState;
  ui_text?: {
    only_gems_on_board?: string;
  };
};

type FrontendSavePayload = {
  version: number;
  saved_at?: string;
  player_name?: string;
  inventory?: Gem[];
  stash_pages?: (string | null)[][];
  board?: AppState["board"];
  skill_preview?: SkillPreview[];
  skill_error?: string | null;
  drops?: DropPrompt[];
  logs?: string[];
  player_stats?: Record<string, PlayerStatView>;
  character_panel?: CharacterPanelView;
  equipment_slots?: (string | null)[];
  map_progression?: AppState["map_progression"];
  ui_text?: AppState["ui_text"];
  next_frontend_item_index?: number;
  [key: string]: unknown;
};

type FrontendMapRunMonster = {
  runtime_id: string;
  monster_id: string;
  pack_id: string;
  zone_type: string;
  spawn_rarity: ProceduralSpawnRarity;
  monster_type?: MonsterType;
  movement_speed_multiplier?: number;
  skill_shape?: MonsterSkillShape;
  nemesis?: boolean;
  boss: boolean;
  position: { x: number; y: number };
  current_life: number;
  max_life: number;
  base_damage: number;
  damage_multiplier: number;
  map_stage_id: string;
  map_level: number;
  monster_level: number;
  loot_context: {
    stage_id: string;
    loot_profile_id: string;
    monster_rarity: string;
    is_boss: boolean;
  };
};

type DropPrompt = {
  drop_id: string;
  loot_kind?: "gem" | "equipment" | "map_entry" | string;
  name_text: string;
  rarity_text: string;
  picked_up: boolean;
  status_text: string;
  position?: { x: number; y: number };
  level?: number;
  equipment_source?: string;
  equipment_rarity?: string;
  equipment_affixes?: FrontendEquipmentAffixRoll[];
  equipment_stat_modifiers?: FrontendEquipmentStatModifier[];
  base_gem_instance_id?: string;
  target_stage_id?: string;
  dropped_item?: Gem;
};

type BossPortal = {
  portal_id: string;
  position: { x: number; y: number };
  used: boolean;
};


type MapProgressionStageView = {
  id: string;
  display_name: string;
  phase: string;
  order: number;
  map_level_text: string;
  map_level_min: number;
  map_level_max: number;
  monster_level: number;
  entry_cost: number;
  free_entry: boolean;
  entry_count: number;
  unlocked: boolean;
  enterable: boolean;
  selected: boolean;
  boss_stage: boolean;
  stage_scope?: "minor" | "major_final" | "timemark";
  boss_pack_pool?: "legendary" | "supreme" | "mixed";
  map_template_ids?: string[];
  gem_level_min: number;
  gem_level_max: number;
  base_drop_chance: number;
  equipment_weight?: number;
  gem_weight?: number;
  map_entry_weight?: number;
  equipment_rarity_weights?: Record<string, number>;
};

const MONSTER_NORMAL_LIFE_BASE = 70;
const MONSTER_NORMAL_LIFE_GROWTH = 1.115;
const MONSTER_NORMAL_DAMAGE_BASE = 8;
const MONSTER_NORMAL_DAMAGE_GROWTH = 1.075;
const MONSTER_NORMAL_ACCURACY_BASE = 1000;
const MONSTER_NORMAL_ACCURACY_GROWTH = 1.07;
const MONSTER_NORMAL_ARMOR_BASE = 12;
const MONSTER_NORMAL_ARMOR_GROWTH = 1.09;
const MONSTER_NORMAL_ENERGY_SHIELD_BASE = 0;
const MONSTER_NORMAL_ENERGY_SHIELD_GROWTH = 1.1;
const BOSS_BASIC_PROJECTILE_INTERVAL_MIN_MS = 500;
const BOSS_BASIC_PROJECTILE_INTERVAL_MAX_MS = 1200;
const BOSS_AREA_SKILL_INTERVAL_MIN_MS = 16_000;
const BOSS_AREA_SKILL_INTERVAL_MAX_MS = 20_000;
const BOSS_BARRAGE_SKILL_INTERVAL_MIN_MS = 30_000;
const BOSS_BARRAGE_SKILL_INTERVAL_MAX_MS = 40_000;
const BOSS_PROJECTILE_SPEED = 390;
const BOSS_PROJECTILE_DISTANCE = 920;
const BOSS_PROJECTILE_RADIUS = 18;
const BOSS_BASIC_PROJECTILE_TARGET_RANGE = 760;
const BOSS_AREA_SKILL_TARGET_RANGE = 640;
const BOSS_BARRAGE_SKILL_TARGET_RANGE = 720;
const BOSS_AREA_WARNING_MS = 1250;
const BOSS_AREA_RADIUS = 118;
const BOSS_BARRAGE_PROJECTILE_COUNT = 16;
const BOSS_BARRAGE_WAVE_INTERVAL_MS = 420;
const BOSS_BARRAGE_WAVE_OFFSETS_DEG = [0, 11.25, 22.5] as const;

type GmGemOption = {
  id: string;
  name_text: string;
  kind: string;
  gem_type: string;
  sudoku_digit: number;
};

type GmEquipmentSourceOption = {
  id: string;
  name_text: string;
};

type GmEquipmentRarityOption = {
  id: string;
  name_text: string;
  affix_count: number;
};

type GmOptions = {
  gems: GmGemOption[];
  equipment_sources: GmEquipmentSourceOption[];
  equipment_rarities: GmEquipmentRarityOption[];
};

type GmEquipmentAffixOption = {
  id: string;
  name_text: string;
  effect_text: string;
  library: string;
  gen: string;
  tier: number;
  family_id: string;
  required_level: number;
};

type GmEquipmentAffixResponse = {
  source: string;
  level: number;
  capacity: { prefix: number; suffix: number };
  affixes: GmEquipmentAffixOption[];
};

type PlayerStatView = {
  label_text: string;
  value: number | boolean;
  value_type: string;
  category: string;
  v1_status: string;
  runtime_effective: boolean;
  affix_spawn_enabled_v1: boolean;
};

type PlayerRuntimeState = {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  currentMana: number;
  maxMana: number;
  currentEnergyShield: number;
  maxEnergyShield: number;
};

type FloatingText = {
  id: number;
  x: number;
  y: number;
  text: string;
  damageType: string;
  ttl: number;
  duration: number;
};

type PlayerBuff = {
  id: number;
  buffType: string;
  skillId: string;
  remaining: number;
  duration: number;
  remainingAmount: number;
  absorbPercent: number;
  excludeDamageOverTime: boolean;
  moveSpeedMultiplier?: number;
  vfxKey: string;
};

type FireBolt = {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  directionX: number;
  directionY: number;
  velocityX?: number;
  velocityY?: number;
  trajectory?: string;
  arcHeight?: number;
  sineAmplitude?: number;
  sineFrequency?: number;
  projectileVisualMode?: string;
  targetId?: number;
  projectileId?: string;
  skillId?: string;
  projectileIndex?: number;
  projectileCount?: number;
  fanAngle?: number;
  localSpreadAngle?: number;
  pierceRemaining?: number;
  projectileSpeed?: number;
  projectileWidth?: number;
  projectileHeight?: number;
  splitProjectile?: boolean;
  impactRadius?: number;
  ttl: number;
  duration: number;
  fadeDuration: number;
  skillTemplateId: string;
  behaviorType: string;
  damageType: string;
  visualEffect: string;
  vfxKey: string;
  shapeEffects: readonly ShapeEffectPreview[];
  areaScale: number;
  vfxScale?: number;
  pendingDamage?: boolean;
  damageAmount?: number;
  sourceSkillName?: string;
  sourceSkillInstanceId?: string;
  sourceEntity?: "player" | "boss";
  sourceEnemyId?: number;
  canHitPlayer?: boolean;
  playerDamageMultiplier?: number;
  playerHitKind?: MonsterHitKind;
  playerLeashRange?: number;
  playerHitMarkerId?: string;
  suppressHitVfx?: boolean;
  collisionRadius?: number;
};

type PendingBossDamageZoneHit = {
  id: string;
  boss: Enemy;
  zones: {
    x: number;
    y: number;
    radius: number;
    shape?: "circle" | "rectangle" | "sector";
    length?: number;
    width?: number;
    directionX?: number;
    directionY?: number;
    safeDirectionX?: number;
    safeDirectionY?: number;
    safeAngleDeg?: number;
  }[];
  remainingMs: number;
  damageMultiplier: number;
  hitKind: MonsterHitKind;
  damageType: string;
  damageForm?: MonsterDamageForm;
  leashRange?: number;
  sourceText?: string;
  hitMarkerId?: string;
  suppressHitVfx?: boolean;
};

type BossSkillTimers = {
  basicReadyMs: number;
  areaReadyMs: number;
  barrageReadyMs: number;
  basicSeq: number;
  areaSeq: number;
  barrageSeq: number;
};

type SupremeBossSkillTimer = {
  readyAtMs: number;
  sequence: number;
  activeSkillId?: string;
  activeUntilMs?: number;
};

type HitVfx = {
  id: number;
  x: number;
  y: number;
  targetId?: number;
  projectileId?: string;
  projectileIndex?: number;
  projectileCount?: number;
  pierceRemaining?: number;
  impactKind?: string;
  projectileWidth?: number;
  projectileHeight?: number;
  impactRadius?: number;
  ttl: number;
  duration: number;
  hitAtMs?: number;
  damageType: string;
  vfxKey: string;
  skillTemplateId?: string;
  shapeEffects: readonly ShapeEffectPreview[];
  vfxScale?: number;
};

type AreaNova = {
  id: number;
  x: number;
  y: number;
  radius: number;
  ringWidth: number;
  ttl: number;
  duration: number;
  damageType: string;
  vfxKey: string;
  areaId?: string;
  skillId?: string;
  followPlayer?: boolean;
  vfxScale?: number;
};

type MeleeArcVfx = {
  id: number;
  x: number;
  y: number;
  radius: number;
  arcAngle: number;
  directionX: number;
  directionY: number;
  ttl: number;
  duration: number;
  damageType: string;
  vfxKey: string;
  arcId?: string;
  skillId?: string;
  vfxScale?: number;
};

type ChainSegmentVfx = {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  ttl: number;
  duration: number;
  hitAtMs?: number;
  damageType: string;
  vfxKey: string;
  segmentIndex: number;
  segmentId?: string;
  skillId?: string;
  vfxScale?: number;
};

type DamageZoneVfx = {
  id: number;
  x: number;
  y: number;
  shape: "circle" | "rectangle";
  radius: number;
  length: number;
  width: number;
  directionX: number;
  directionY: number;
  ttl: number;
  duration: number;
  hitAtMs?: number;
  damageType: string;
  vfxKey: string;
  zoneId?: string;
  skillId?: string;
  warning?: boolean;
  followPlayer?: boolean;
  vfxScale?: number;
  tickProgress?: number;
};

type ActiveDamageZoneRuntime = {
  zoneId: string;
  event: SkillEvent;
  payload: NonNullable<SkillEvent["payload"]>;
  origin: { x: number; y: number };
  direction: { x: number; y: number };
  shape: "circle" | "rectangle";
  radius: number;
  length: number;
  width: number;
  followPlayer: boolean;
  remainingMs: number;
  tickIntervalMs: number;
  nextTickMs: number;
  tickIndex: number;
  maxTargets: number;
  maxHits: number;
  maxHitsPerTarget: number;
  totalHits: number;
  hitCounts: Map<number, number>;
};

type ThundercloudChannelRuntime = {
  stacks: number;
  progressMs: number;
  noChannelMs: number;
  lockedMs: number;
  releaseCooldownMs?: number;
};

type ScheduledSkillEvent = {
  event: SkillEvent;
  remaining: number;
};

type ContinuousAttackRuntime = {
  skillId: string;
  skill: SkillPreview;
  repeatsRemaining: number;
  nextRepeatIndex: number;
  remainingSeconds: number;
};

type RuntimeSkillEventsResponse = {
  ok: boolean;
  message_text: string;
  events: SkillEvent[];
};

type RuntimePerfSummary = {
  frame_ms: number;
  logic_ms: number;
  active_projectiles: number;
  active_hit_vfx: number;
  active_area_vfx: number;
  active_floating_text: number;
  active_enemies: number;
  scheduled_events: number;
  consumed_events_this_frame: number;
  dropped_frame_count: number;
};

type Tooltip = {
  gem: Gem;
  left: number;
  top: number;
  transform: string;
  comparisonGem?: Gem | null;
};

type FloatingGem = {
  gem: Gem;
  origin: FloatingOrigin;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
};

type PlacementResult =
  | { type: "place" }
  | { type: "swap"; nextFloatingItem: Gem; origin: FloatingOrigin }
  | { type: "reject"; reason?: "only_gems_on_board" };

type PlacementPrompt = {
  id: number;
  text: string;
  x: number;
  y: number;
};

type ItemDiscardPrompt = {
  item: Gem;
  origin: FloatingOrigin;
  position: { x: number; y: number };
};

type PlacementPreview = {
  previewCell: { row: number; column: number };
  previewAffectedCells: Map<string, { types: PreviewRelationType[] }>;
  previewAffectedGems: Map<string, { labels: string[]; modifierCount: number }>;
  previewRelations: { row: number; column: number; types: PreviewRelationType[]; instanceId?: string }[];
  previewSkillSummary: string;
};

type Camera2D = {
  screenX: number;
  screenY: number;
  zoom: number;
};

type UnitVisualRuntime = {
  direction: UnitDirection;
  movementVector: { x: number; y: number };
  attackStartedAtMs?: number;
  attackUntilMs?: number;
};

type EnemyVisualRuntime = UnitVisualRuntime & {
  lastX: number;
  lastY: number;
};

type BattleRenderEntity =
  | { kind: "enemy"; id: number; x: number; y: number; hp: number; maxHp: number; lastDamagedAt?: number; monsterId?: string; spawnRarity?: ProceduralSpawnRarity; runtimeTier?: EnemyRuntimeTier; playerDistance: number; renderScale: number }
  | { kind: "player"; id: "player"; x: number; y: number; hp: number; maxHp: number; renderScale: number; guardActive: boolean };

type BattleRenderItem =
  | BattleRenderEntity
  | { kind: "fire-bolt"; id: number; x: number; y: number; bolt: FireBolt }
  | { kind: "hit-vfx"; id: number; x: number; y: number; vfx: HitVfx };

type BattleAnimationContexts = {
  player: UnitAnimationContext;
  enemies: Map<number, UnitAnimationContext>;
};

const DEFAULT_BAKED_BATTLE_MAP = BAKED_BATTLE_MAPS[0];
const MAP_WIDTH = DEFAULT_BAKED_BATTLE_MAP.meta.world_width;
const MAP_HEIGHT = DEFAULT_BAKED_BATTLE_MAP.meta.world_height;
const MAP_VISUAL_WIDTH = MAP_WIDTH;
const MAP_VISUAL_HEIGHT = MAP_HEIGHT;
const PLAYER_SPEED = 250;
const FLOATING_TEXT_VISUAL_RISE_SPEED = 22;
const BATTLE_CAMERA_ZOOM = 0.22;
const BATTLE_CAMERA_ANCHOR_X = "calc(var(--game-viewport-width, 100vw) * 0.5)";
const BATTLE_CAMERA_ANCHOR_Y = "calc(var(--game-viewport-height, 100vh) * 0.54)";
const BATTLE_CAMERA_FOLLOW_OFFSET_Y = 0;
const BATTLE_ENTITY_Z_INDEX_BASE = 10;
const CANVAS_GEOMETRY_BATTLE_OBJECTS = true;
const CANVAS_GEOMETRY_SKILL_EFFECTS = true;
const RUNTIME_PERF_SYNC_INTERVAL_MS = 500;
const RUNTIME_DROPPED_FRAME_MS = 33;
const RUNTIME_SLOW_LOGIC_MS = 16;
const RUNTIME_MIN_FRAME_MS = 8;
const TRIGGERED_SKILL_EVENT_MIN_DELAY_SECONDS = 1 / 60;
const MAX_RUNTIME_PROJECTILE_VISUALS = 80;
const MAX_RUNTIME_HIT_VFX = 80;
const MAX_RUNTIME_FLOATING_TEXT = 60;
const MAX_RUNTIME_AREA_VFX = 80;
const DOT_FLOATING_TEXT_INTERVAL_SECONDS = 0.5;
const MAX_SKILL_EDITOR_TIMELINE_ROWS = 40;
const SKILL_TEST_DUMMY_MAX_HP = 9999999;
const SKILL_TEST_DUMMY_OFFSETS = [
  { x: 300, y: 0 },
  { x: 420, y: -120 },
  { x: 420, y: 120 },
  { x: 560, y: -220 },
  { x: 560, y: 220 }
];
const ENCOUNTER_MONSTER_PALETTES: EncounterMonsterPalette[] = [
  { primary: "#EF4444" },
  { primary: "#F97316" },
  { primary: "#EAB308" },
  { primary: "#84CC16" },
  { primary: "#14B8A6" },
  { primary: "#38BDF8" },
  { primary: "#818CF8" },
  { primary: "#A78BFA" },
  { primary: "#F472B6" },
  { primary: "#94A3B8" }
];
const UNIT_RENDER_SCALE = 0.7;
const FLOATING_GEM_OFFSET = { x: 18, y: 18 };
const INVENTORY_SLOT_COUNT = 60;
const INVENTORY_COLUMNS = 12;
const STASH_PAGE_COUNT = 5;
const STASH_PAGE_SLOT_COUNT = 100;
const STASH_PAGE_COLUMNS = 10;
const KEYBOARD_PICKUP_SCREEN_RADIUS = 250;
const CLICK_INTERACTION_COMPLETE_RADIUS = 10;
const EQUIPMENT_SLOT_SPECS = [
  { id: "head", label: "头部", accepts: ["head", "helmet", "helm", "头部", "头盔"] },
  { id: "chest", label: "胸甲", accepts: ["chest", "body", "armor", "armour", "胸甲", "护甲", "衣服"] },
  { id: "amulet", label: "项链", accepts: ["amulet", "necklace", "项链"] },
  { id: "gloves", label: "手套", accepts: ["gloves", "glove", "手套"] },
  { id: "belt", label: "腰带", accepts: ["belt", "腰带"] },
  { id: "boots", label: "鞋子", accepts: ["boots", "shoes", "鞋子", "鞋", "靴子"] },
  { id: "ring_1", label: "戒指1", accepts: ["ring", "戒指", "灵戒"] },
  { id: "ring_2", label: "戒指2", accepts: ["ring", "戒指", "灵戒"] },
  { id: "main_weapon", label: "主武器", accepts: ["main_weapon", "weapon", "weapons", "武器", "主武器"] },
  { id: "off_weapon", label: "副武器", accepts: ["off_weapon", "offhand", "off_hand", "weapon", "weapons", "武器", "副武器", "副手"] }
] as const;
const EQUIPMENT_SLOT_COUNT = EQUIPMENT_SLOT_SPECS.length;
const MAIN_WEAPON_SLOT_INDEX = 8;
const OFF_WEAPON_SLOT_INDEX = 9;
const WEAPON_SLOT_INDICES = [MAIN_WEAPON_SLOT_INDEX, OFF_WEAPON_SLOT_INDEX] as const;
const TOOLTIP_WIDTH = 410;
const TOOLTIP_COMPARISON_GAP = 0;
const TOOLTIP_SCREEN_PADDING = 8;
const ITEM_DISCARD_SKIP_CONFIRM_STORAGE_KEY = "poe2.v1.item_discard.skip_confirm";
const STARTER_GEM_BOARD_POSITION = { row: 4, column: 4 } as const;
const EXCLUDED_NEW_SAVE_STARTER_BASE_GEM_IDS = new Set(["active_stoneskin"]);

type FrontendSaveSlotSummary = FrontendSaveStorageSlotSummary<FrontendSavePayload>;

function cloneFrontendData<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneFrontendInitialAppStateSeed(): AppState {
  return cloneFrontendData(FRONTEND_INITIAL_APP_STATE) as unknown as AppState;
}

function frontendGemDropPool(): readonly Gem[] {
  return FRONTEND_GEM_DROP_POOL as unknown as readonly Gem[];
}

function frontendSkillPreviewsBySkillTag(): Record<string, SkillPreview> {
  return FRONTEND_SKILL_PREVIEWS_BY_SKILL_TAG as unknown as Record<string, SkillPreview>;
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadItemDiscardSkipConfirmPreference() {
  try {
    const raw = window.localStorage.getItem(ITEM_DISCARD_SKIP_CONFIRM_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { enabled?: unknown; date?: unknown };
    const active = parsed.enabled === true && parsed.date === localDateKey();
    if (!active) window.localStorage.removeItem(ITEM_DISCARD_SKIP_CONFIRM_STORAGE_KEY);
    return active;
  } catch {
    return false;
  }
}

function saveItemDiscardSkipConfirmPreference(enabled: boolean) {
  try {
    if (!enabled) {
      window.localStorage.removeItem(ITEM_DISCARD_SKIP_CONFIRM_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(ITEM_DISCARD_SKIP_CONFIRM_STORAGE_KEY, JSON.stringify({ enabled: true, date: localDateKey() }));
  } catch {
    // Ignore localStorage failures; the checkbox still works for the current dialog.
  }
}

function createEmptyStashPages() {
  return Array.from({ length: STASH_PAGE_COUNT }, () => Array.from({ length: STASH_PAGE_SLOT_COUNT }, () => null as string | null));
}

function normalizeStashPages(value: unknown, state?: Pick<AppState, "inventory" | "equipment_slots" | "board">) {
  const sourcePages = Array.isArray(value) ? value : [];
  const next = createEmptyStashPages();
  const used = new Set<string>();
  const inventoryIds = state ? new Set(state.inventory.map((item) => item.instance_id)) : null;
  const equippedIds = state ? new Set(normalizeEquipmentSlots(state.equipment_slots ?? []).filter(Boolean) as string[]) : new Set<string>();
  const boardedIds = state ? new Set(state.board.cells.flat().map((cell) => cell.gem?.instance_id).filter(Boolean) as string[]) : new Set<string>();
  for (let pageIndex = 0; pageIndex < STASH_PAGE_COUNT; pageIndex += 1) {
    const sourceSlots = Array.isArray(sourcePages[pageIndex]) ? sourcePages[pageIndex] : [];
    for (let slotIndex = 0; slotIndex < STASH_PAGE_SLOT_COUNT; slotIndex += 1) {
      const instanceId = typeof sourceSlots[slotIndex] === "string" ? sourceSlots[slotIndex] : "";
      if (
        instanceId
        && !used.has(instanceId)
        && (!inventoryIds || inventoryIds.has(instanceId))
        && !equippedIds.has(instanceId)
        && !boardedIds.has(instanceId)
      ) {
        next[pageIndex][slotIndex] = instanceId;
        used.add(instanceId);
      }
    }
  }
  return next;
}

function stashItemIds(stashPages: (string | null)[][] | undefined) {
  return new Set(normalizeStashPages(stashPages).flat().filter(Boolean) as string[]);
}

function removeItemsFromStashPages(stashPages: (string | null)[][] | undefined, instanceIds: string[]) {
  const idSet = new Set(instanceIds.filter(Boolean));
  return normalizeStashPages(stashPages).map((page) => page.map((instanceId) => (instanceId && idSet.has(instanceId) ? null : instanceId)));
}

function moveItemToStashSlot(stashPages: (string | null)[][] | undefined, instanceId: string, pageIndex: number, slotIndex: number) {
  const next = removeItemsFromStashPages(stashPages, [instanceId]);
  const safePageIndex = clamp(Math.floor(pageIndex), 0, STASH_PAGE_COUNT - 1);
  const safeSlotIndex = clamp(Math.floor(slotIndex), 0, STASH_PAGE_SLOT_COUNT - 1);
  next[safePageIndex][safeSlotIndex] = instanceId;
  return next;
}

function sanitizeFrontendStorageState(state: AppState): AppState {
  const equipmentState = sanitizeEquipmentSlotsForState(state);
  return {
    ...equipmentState,
    stash_pages: normalizeStashPages(equipmentState.stash_pages, equipmentState)
  };
}

function frontendSkillTagForGem(gem: Gem) {
  return gem.tags.find((tag) => typeof tag.id === "string" && tag.id.startsWith("skill_"))?.id ?? "";
}

function frontendEquippedEquipmentModifiers(state: AppState) {
  const byId = new Map(state.inventory.map((item) => [item.instance_id, item]));
  const equippedIds = new Set((state.equipment_slots ?? []).slice(0, EQUIPMENT_SLOT_COUNT).filter(Boolean) as string[]);
  const modifiers: FrontendEquipmentStatModifier[] = [];
  equippedIds.forEach((instanceId) => {
    const item = byId.get(instanceId);
    modifiers.push(...frontendEquipmentModifiersForInventoryItem(item));
  });
  return modifiers;
}

function frontendEquipmentModifiersForInventoryItem(item: Gem | undefined): FrontendEquipmentStatModifier[] {
  if (!item || item.item_kind !== "equipment") return [];
  const affixes = item.equipment_affixes ?? [];
  if (affixes.length === 0) return item.equipment_stat_modifiers ?? [];
  const equipmentItem: FrontendEquipmentItem = {
    source: item.category_text,
    level: Number(item.level ?? 1),
    rarity: item.equipment_rarity ?? item.rarity_text,
    base_affix: affixes.find((affix) => affix.gen === "base") ?? affixes[0],
    prefix_affixes: affixes.filter((affix) => affix.gen === "prefix"),
    suffix_affixes: affixes.filter((affix) => affix.gen === "suffix"),
  };
  return frontendEquipmentStatModifiers(equipmentItem);
}

function frontendMountedPassiveSelfStatModifiers(state: AppState): FrontendEquipmentStatModifier[] {
  const itemById = new Map(state.inventory.map((item) => [item.instance_id, item]));
  const modifiers: FrontendEquipmentStatModifier[] = [];
  for (const cell of state.board.cells.flat()) {
    const gem = cell.gem ? itemById.get(cell.gem.instance_id) ?? cell.gem : null;
    if (!gem || !isPassiveGem(gem)) continue;
    const baseGemId = String(gem.base_gem_id ?? gem.instance_id);
    const level = Math.max(1, Math.floor(Number(gem.level ?? 1)));
    for (const effect of frontendPassiveSelfStatEffects(gem)) {
      const stat = String(effect.stat ?? "");
      if (!stat) continue;
      const baseValue = Number(effect.value ?? 0);
      const value = frontendSkillLevelTableValueById(baseGemId, level, stat) ?? baseValue;
      if (!Number.isFinite(value) || value === 0) continue;
      modifiers.push({
        source_modifier_id: `${gem.instance_id}:self_stat:${stat}`,
        kind: "player_stat",
        stat,
        value,
        reason_key: "modifier.passive_self_stat",
      });
    }
  }
  return modifiers;
}

function recalculateFrontendSkillPreview(state: AppState): AppState {
  const nextSkills: SkillPreview[] = [];
  const equipmentSkillModifiers = frontendEquippedEquipmentModifiers(state).filter((modifier) => modifier.kind !== "player_stat");
  const itemById = new Map(state.inventory.map((item) => [item.instance_id, item]));
  for (const row of state.board.cells) {
    for (const cell of row) {
      const gem = cell.gem;
      if (!gem || gem.gem_kind !== "active_skill") continue;
      const skillTag = frontendSkillTagForGem(gem);
      const template = frontendSkillPreviewsBySkillTag()[skillTag];
      if (!template) continue;
      const fullGem = itemById.get(gem.instance_id) ?? gem;
      const supportModifiers = frontendSupportSkillModifiersForTarget(state, fullGem, template, equipmentSkillModifiers, itemById);
      nextSkills.push(applyFrontendEquipmentSkillModifiers({
        ...frontendSkillPreviewForGemLevel(cloneFrontendData(template), fullGem),
        active_gem_instance_id: fullGem.instance_id,
        name_text: fullGem.name_text,
      }, fullGem, [...supportModifiers.modifiers, ...equipmentSkillModifiers], supportModifiers.appliedModifiers));
    }
  }
  return {
    ...state,
    skill_preview: nextSkills,
    skill_error: null,
  };
}

function frontendSupportSkillModifiersForTarget(
  state: AppState,
  targetGem: Gem,
  skill: SkillPreview,
  equipmentSkillModifiers: FrontendEquipmentStatModifier[],
  itemById: Map<string, Gem>
) {
  const modifiers: FrontendEquipmentStatModifier[] = [];
  const appliedModifiers: SkillAppliedModifier[] = [];
  const targetTags = new Set(targetGem.tags.map((tag) => tag.id ?? tag.text));
  const supportLevelAdd = Math.max(0, Math.floor(equipmentSkillModifiers
    .filter((modifier) => modifier.kind !== "runtime_hook" && modifier.stat === "support_gem_level_add")
    .reduce((total, modifier) => total + modifier.value, 0)));
  for (const sourceCell of state.board.cells.flat()) {
    const sourceGem = sourceCell.gem ? itemById.get(sourceCell.gem.instance_id) ?? sourceCell.gem : null;
    if (!sourceGem || sourceGem.instance_id === targetGem.instance_id || !(isSupportGem(sourceGem) || isPassiveGem(sourceGem))) continue;
    if (!isAllowedRoute(sourceGem, targetGem)) continue;
    const relation = frontendModifierRelation(sourceGem, targetGem);
    if (!relation) continue;
    if (!frontendConduitCanUseTarget(sourceGem, targetGem)) continue;
    if (!frontendSupportCanAffect(sourceGem, targetTags)) continue;
    const sourceLevel = frontendModifierSourceLevel(sourceGem, supportLevelAdd);
    for (const modifier of frontendSkillTargetModifiers(sourceGem, sourceLevel)) {
      const modifierStat = frontendRecord(modifier.stat);
      const stat = String(modifierStat.id ?? "");
      if (!stat) continue;
      const baseValue = Number(modifier.value ?? 0);
      const tableKey = String(modifier.table_key ?? stat);
      const value = frontendSkillLevelTableValueById(frontendSupportLevelTableId(sourceGem), sourceLevel, tableKey) ?? baseValue;
      if (!Number.isFinite(value) || value === 0) continue;
      const appliedValue = value * frontendRelationCoefficient(relation);
      modifiers.push({
        source_modifier_id: `${sourceGem.instance_id}:${targetGem.instance_id}:${stat}`,
        kind: "skill_stat",
        stat,
        value: appliedValue,
        reason_key: "modifier.support_base",
      });
      appliedModifiers.push({
        source_instance_id: sourceGem.instance_id,
        source_name_text: sourceGem.name_text,
        target_instance_id: targetGem.instance_id,
        stat: { id: stat, text: String(modifierStat.text ?? stat) },
        value: appliedValue,
        relation_text: frontendRelationText(relation),
        reason_text: frontendModifierReasonText(sourceGem, sourceLevel, supportLevelAdd),
        applied: true,
      });
    }
  }
  return { modifiers, appliedModifiers };
}

function frontendModifierRelation(sourceGem: Gem, targetGem: Gem) {
  if (isPassiveGem(sourceGem) && isActiveGem(targetGem)) {
    return sourceGem.board_position && targetGem.board_position ? "board_wide" : "";
  }
  return frontendBoardRelation(sourceGem.board_position, targetGem.board_position);
}

function frontendModifierSourceLevel(sourceGem: Gem, supportLevelAdd: number) {
  if (isSupportGem(sourceGem)) return frontendSupportEffectiveLevel(sourceGem, supportLevelAdd);
  return Math.max(1, Math.floor(Number(sourceGem.level ?? 1)));
}

function frontendModifierReasonText(sourceGem: Gem, sourceLevel: number, supportLevelAdd: number) {
  if (isPassiveGem(sourceGem)) return "\u88ab\u52a8\u6280\u80fd\u6548\u679c";
  return supportLevelAdd ? `\u8f85\u52a9\u7b49\u7ea7 ${sourceLevel}` : "\u8f85\u52a9\u57fa\u7840\u6548\u679c";
}

function frontendSkillTargetModifiers(sourceGem: Gem, sourceLevel: number) {
  const modifiers = frontendSupportBaseModifiers(sourceGem, sourceLevel);
  if (!isPassiveGem(sourceGem)) return modifiers;
  return modifiers.filter((modifier) => String(modifier.target_text ?? "").includes("\u5f71\u54cd\u4e3b\u52a8\u6280\u80fd"));
}

function frontendSkillPreviewForGemLevel(skill: SkillPreview, gem: Gem): SkillPreview {
  const sourceContext = frontendRecord(skill.source_context);
  const templateLevel = Math.max(1, Math.floor(Number(sourceContext.effective_gem_level ?? sourceContext.base_gem_level ?? 1)));
  const targetLevel = frontendSkillClampedLevel(skill, Math.max(1, Math.floor(Number(gem.level ?? templateLevel))));
  const levelValues = frontendSkillLevelTableValues(skill, targetLevel);

  const currentBaseDamage = frontendSkillLevelValue(skill, "base_damage", templateLevel, Number(skill.base_damage ?? skill.final_damage ?? 0), templateLevel);
  const targetBaseDamage = frontendLevelValueNumber(levelValues, "base_damage", frontendSkillLevelValue(skill, "base_damage", targetLevel, currentBaseDamage, templateLevel));
  const damageScale = currentBaseDamage > 0 && targetBaseDamage > 0 ? targetBaseDamage / currentBaseDamage : 1;
  const nextHit = { ...(skill.hit ?? {}) };
  const hitComponentTotal = frontendDamageMapTotal(nextHit.damage_components);
  const hitConfigScale = hitComponentTotal > 0 && targetBaseDamage > 0 ? targetBaseDamage / hitComponentTotal : damageScale;
  if (typeof nextHit.base_damage === "number") nextHit.base_damage = targetBaseDamage;
  if (nextHit.damage_components && typeof nextHit.damage_components === "object" && !Array.isArray(nextHit.damage_components)) {
    nextHit.damage_components = frontendLevelDamageComponents(levelValues, "hit_damage_component_") ?? normalizeFrontendDamageMapTotal(nextHit.damage_components, targetBaseDamage);
  }
  if (Array.isArray(nextHit.ailments)) {
    nextHit.ailments = applyFrontendAilmentLevelValues(nextHit.ailments, levelValues, "hit_ailment_");
  }
  if (Array.isArray(nextHit.secondary_hits)) {
    nextHit.secondary_hits = nextHit.secondary_hits.map((secondary) => scaleFrontendSkillHitDamage(secondary, hitConfigScale, levelValues));
  }
  const nextRuntimeParams = { ...(skill.runtime_params ?? {}) };
  for (const [key, value] of Object.entries(levelValues)) {
    if (["base_damage", "mana_cost", "release_interval_ms", "base_cooldown_ms", "trigger_interval_ms"].includes(key)) continue;
    nextRuntimeParams[key] = value;
  }
  if (Array.isArray(nextRuntimeParams.modules)) {
    nextRuntimeParams.modules = applyFrontendModuleLevelValues(nextRuntimeParams.modules, levelValues);
  }
  if (Number(nextRuntimeParams.split_projectile_base_damage ?? 0) > 0 && targetBaseDamage > 0) {
    nextRuntimeParams.split_projectile_damage_multiplier = Number(nextRuntimeParams.split_projectile_base_damage) / targetBaseDamage;
  }
  const baseReleaseIntervalMs = typeof levelValues.release_interval_ms === "number" ? levelValues.release_interval_ms : skill.base_release_interval_ms;
  const baseCooldownMs = typeof levelValues.base_cooldown_ms === "number" ? levelValues.base_cooldown_ms : skill.base_cooldown_ms;
  const timing = frontendSkillTiming(skill, new Set(skill.tags?.map((tag) => tag.id ?? tag.text) ?? []), skill.skill_stats, {
    baseReleaseIntervalMs,
    baseCooldownMs,
  });
  return {
    ...skill,
    base_damage: targetBaseDamage,
    final_damage: Number(skill.final_damage ?? 0) * damageScale,
    non_crit_damage: Number(skill.non_crit_damage ?? skill.final_damage ?? 0) * damageScale,
    expected_hit_damage: Number(skill.expected_hit_damage ?? skill.final_damage ?? 0) * damageScale,
    preview_dps: Number(skill.preview_dps ?? 0) * damageScale,
    base_damage_components: scaleFrontendDamageMap(skill.base_damage_components, damageScale),
    final_damage_components: scaleFrontendDamageMap(skill.final_damage_components, damageScale),
    hit: nextHit,
    cast: {
      ...(skill.cast ?? {}),
      ...(typeof levelValues.release_interval_ms === "number" ? { release_interval_ms: levelValues.release_interval_ms } : {}),
      ...(typeof levelValues.base_cooldown_ms === "number" ? { base_cooldown_ms: levelValues.base_cooldown_ms } : {}),
      ...(typeof levelValues.trigger_interval_ms === "number" ? { trigger_interval_ms: levelValues.trigger_interval_ms } : {}),
      ...(typeof levelValues.mana_cost === "number" ? { mana_cost: levelValues.mana_cost } : {}),
    },
    base_release_interval_ms: timing.baseReleaseIntervalMs,
    release_interval_ms: timing.releaseIntervalMs,
    base_cooldown_ms: timing.baseCooldownMs,
    final_cooldown_ms: timing.finalCooldownMs,
    actual_interval_ms: timing.actualIntervalMs,
    trigger_interval_ms: typeof levelValues.trigger_interval_ms === "number" ? levelValues.trigger_interval_ms : skill.trigger_interval_ms,
    mana_cost: typeof levelValues.mana_cost === "number" ? levelValues.mana_cost : skill.mana_cost,
    runtime_params: nextRuntimeParams,
    source_context: {
      ...sourceContext,
      base_gem_level: targetLevel,
      effective_gem_level: targetLevel,
      level_values: levelValues,
    } as SkillPreview["source_context"],
  };
}

function frontendSkillClampedLevel(skill: SkillPreview, level: number) {
  const table = (FRONTEND_SKILL_LEVEL_TABLES as Record<string, Record<number, Record<string, number>>>)[String(skill.base_gem_id ?? skill.skill_package_id ?? "")];
  const levels = table ? Object.keys(table).map(Number).filter(Number.isFinite).sort((a, b) => a - b) : [];
  if (levels.length === 0) return Math.max(1, Math.min(40, level));
  return clamp(level, levels[0], levels[levels.length - 1]);
}

function frontendSkillLevelTableValues(skill: SkillPreview, level: number): Record<string, number> {
  const table = (FRONTEND_SKILL_LEVEL_TABLES as Record<string, Record<number, Record<string, number>>>)[String(skill.base_gem_id ?? skill.skill_package_id ?? "")];
  return { ...(table?.[level] ?? {}) };
}

function frontendLevelValueNumber(levelValues: Record<string, number>, key: string, fallback: number) {
  const value = levelValues[key];
  return Number.isFinite(value) ? value : fallback;
}

function frontendSkillTiming(
  skill: SkillPreview,
  tags: Set<string>,
  skillStats: Record<string, number | boolean> | undefined,
  overrides: { baseReleaseIntervalMs?: number; baseCooldownMs?: number } = {}
) {
  const baseReleaseIntervalMs = Math.max(0, Math.round(Number(
    overrides.baseReleaseIntervalMs
    ?? skill.base_release_interval_ms
    ?? skill.release_interval_ms
    ?? skill.actual_interval_ms
    ?? 0
  )));
  const baseCooldownMs = Math.max(0, Math.round(Number(
    overrides.baseCooldownMs
    ?? skill.base_cooldown_ms
    ?? skill.final_cooldown_ms
    ?? 0
  )));
  let releaseSpeedAddPercent = 0;
  if (tags.has("attack")) {
    releaseSpeedAddPercent = statValue(skillStats, "attack_speed_add_percent");
  } else if (tags.has("spell")) {
    releaseSpeedAddPercent = statValue(skillStats, "cast_speed_add_percent");
  }
  const speedMultiplier = Math.max(
    0.01,
    1 + releaseSpeedAddPercent / 100
  ) * Math.max(0.01, 1 + statValue(skillStats, "skill_speed_final_percent") / 100);
  const releaseIntervalMs = baseReleaseIntervalMs > 0 && (tags.has("attack") || tags.has("spell"))
    ? Math.max(1, Math.round(baseReleaseIntervalMs / speedMultiplier))
    : 0;
  const movementCooldownRecovery = tags.has("movement") || tags.has("skill_movement")
    ? statValue(skillStats, "movement_skill_cooldown_recovery_add_percent")
    : 0;
  const cooldownRecoveryMultiplier = Math.max(
    0.01,
    1 + (statValue(skillStats, "cooldown_recovery_add_percent") + movementCooldownRecovery) / 100
  );
  const addedCooldownMs = statValue(skillStats, "added_cooldown_ms");
  const hasCooldownConstraint = baseCooldownMs > 0 || addedCooldownMs !== 0;
  const finalCooldownMs = hasCooldownConstraint
    ? Math.max(0, Math.round(Math.max(100, baseCooldownMs / cooldownRecoveryMultiplier + addedCooldownMs)))
    : 0;
  return {
    baseReleaseIntervalMs,
    releaseIntervalMs,
    baseCooldownMs,
    finalCooldownMs,
    actualIntervalMs: Math.max(releaseIntervalMs, finalCooldownMs),
    speedMultiplier,
  };
}

function scaleFrontendDamageMap(value: unknown, scale: number): Record<string, number> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([damageType, amount]) => [damageType, Number(amount ?? 0) * scale])
  );
}

function normalizeFrontendDamageMapTotal(value: unknown, targetTotal: number): Record<string, number> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>)
    .map(([damageType, amount]) => [damageType, Number(amount ?? 0)] as const)
    .filter(([, amount]) => Number.isFinite(amount) && amount > 0);
  const currentTotal = frontendDamageMapEntriesTotal(entries);
  if (currentTotal <= 0 || targetTotal <= 0) return Object.fromEntries(entries);
  const scale = targetTotal / currentTotal;
  return Object.fromEntries(entries.map(([damageType, amount]) => [damageType, amount * scale]));
}

function frontendDamageMapTotal(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return 0;
  return frontendDamageMapEntriesTotal(
    Object.entries(value as Record<string, unknown>)
      .map(([, amount]) => Number(amount ?? 0))
      .filter((amount) => Number.isFinite(amount) && amount > 0)
  );
}

function frontendDamageMapEntriesTotal(entries: readonly (readonly [string, number] | number)[]): number {
  return entries.reduce<number>((total, entry) => total + (Array.isArray(entry) ? entry[1] : entry), 0);
}

type FrontendScalableHit = Record<string, unknown> & {
  id?: string;
  base_damage?: number;
  weapon_attack_percent?: number;
  damage_components?: Record<string, number>;
  ailments?: Record<string, unknown>[];
};

type FrontendAilmentConfig = Record<string, unknown> & {
  type?: string;
  chance_percent?: number;
  duration_ms?: number;
  base_value?: number;
  effect_per_stack?: number;
  base_damage_per_second?: number;
  damage_over_time_more_percent?: number;
  source_damage_type?: string;
  max_stacks?: number;
  threshold?: number;
  max_value?: number;
};

function scaleFrontendSkillHitDamage<T extends FrontendScalableHit>(hit: T, scale: number, levelValues: Record<string, number> = {}): T {
  const next = { ...hit };
  const hitId = frontendSafeLevelKeyFragment(String(next.id ?? "secondary_hit"));
  const prefix = `secondary_hit_${hitId}`;
  const levelBaseDamage = frontendOptionalLevelNumber(levelValues, `${prefix}_base_damage`);
  const levelWeaponAttackPercent = frontendOptionalLevelNumber(levelValues, `${prefix}_weapon_attack_percent`);
  if (typeof next.base_damage === "number") next.base_damage = levelBaseDamage ?? next.base_damage * scale;
  if (typeof next.weapon_attack_percent === "number") next.weapon_attack_percent = levelWeaponAttackPercent ?? next.weapon_attack_percent * scale;
  if (next.damage_components && typeof next.damage_components === "object" && !Array.isArray(next.damage_components)) {
    next.damage_components = frontendLevelDamageComponents(levelValues, `${prefix}_damage_component_`) ?? scaleFrontendDamageMap(next.damage_components, scale);
  }
  if (Array.isArray(next.ailments)) {
    next.ailments = applyFrontendAilmentLevelValues(next.ailments, levelValues, `${prefix}_ailment_`);
  }
  return next;
}

function frontendLevelDamageComponents(levelValues: Record<string, number>, prefix: string): Record<string, number> | null {
  const entries = Object.entries(levelValues)
    .filter(([key, value]) => key.startsWith(prefix) && Number.isFinite(value))
    .map(([key, value]) => [key.slice(prefix.length), value] as const)
    .filter(([damageType]) => damageType.length > 0);
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function frontendOptionalLevelNumber(levelValues: Record<string, number>, key: string): number | null {
  const value = levelValues[key];
  return Number.isFinite(value) ? value : null;
}

function frontendSafeLevelKeyFragment(value: string) {
  return value.replace(/[^0-9A-Za-z_]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

function applyFrontendAilmentLevelValues(ailments: readonly unknown[], levelValues: Record<string, number>, prefix: string): Record<string, unknown>[] {
  return ailments.flatMap((ailment) => {
    if (!ailment || typeof ailment !== "object" || Array.isArray(ailment)) return [];
    const next = { ...(ailment as Record<string, unknown>) };
    const type = frontendSafeLevelKeyFragment(String(next.type ?? "unknown"));
    const baseDamagePerSecond = frontendOptionalLevelNumber(levelValues, `${prefix}${type}_base_damage_per_second`);
    if (baseDamagePerSecond !== null) next.base_damage_per_second = baseDamagePerSecond;
    return [next];
  });
}

function applyFrontendModuleLevelValues(modules: unknown[], levelValues: Record<string, number>): unknown[] {
  return modules.map((module) => {
    if (!module || typeof module !== "object" || Array.isArray(module)) return module;
    const next = { ...(module as Record<string, unknown>) };
    const moduleId = frontendSafeLevelKeyFragment(String(next.id ?? "module"));
    const params = next.params;
    if (params && typeof params === "object" && !Array.isArray(params)) {
      const nextParams = { ...(params as Record<string, unknown>) };
      for (const key of Object.keys(nextParams)) {
        const levelValue = frontendOptionalLevelNumber(levelValues, `module_${moduleId}_${key}`);
        if (levelValue !== null) nextParams[key] = levelValue;
      }
      next.params = nextParams;
    }
    return next;
  });
}

function frontendSupportEffectiveLevel(sourceGem: Gem, supportLevelAdd: number) {
  const baseGemId = frontendSupportLevelTableId(sourceGem);
  const table = (FRONTEND_SKILL_LEVEL_TABLES as Record<string, Record<number, Record<string, number>>>)[baseGemId];
  const levels = table ? Object.keys(table).map(Number).filter(Number.isFinite).sort((a, b) => a - b) : [];
  const currentLevel = Math.max(1, Math.floor(Number(sourceGem.level ?? 1)));
  if (levels.length === 0) return currentLevel + supportLevelAdd;
  return clamp(currentLevel + supportLevelAdd, levels[0], levels[levels.length - 1]);
}

function frontendGemBaseModifiers(gem: Gem) {
  const baseEffect = frontendRecord(frontendRecord(gem).base_effect);
  const modifiers = baseEffect.modifiers;
  return Array.isArray(modifiers) ? modifiers.map(frontendRecord) : [];
}

function frontendPassiveSelfStatEffects(gem: Gem): FrontendPassiveEffect[] {
  const passiveEffects = frontendRecord(gem).passive_effects;
  if (Array.isArray(passiveEffects)) {
    return passiveEffects
      .map(frontendRecord)
      .filter((effect) => String(effect.target ?? "") === "self_stat")
      .map((effect) => ({
        target: "self_stat",
        stat: String(effect.stat ?? ""),
        value: Number(effect.value ?? 0),
        layer: String(effect.layer ?? "additive")
      }));
  }
  return frontendGemBaseModifiers(gem)
    .filter((modifier) => String(modifier.target_text ?? "") === "影响玩家属性")
    .map((modifier) => {
      const stat = frontendRecord(modifier.stat);
      return {
        target: "self_stat",
        stat: String(stat.id ?? ""),
        value: Number(modifier.value ?? 0),
        layer: "additive"
      };
    });
}

function frontendSupportBaseModifiers(gem: Gem, supportLevel: number) {
  const modifiers = frontendGemBaseModifiers(gem);
  if (modifiers.length > 0 || !frontendConduitRelation(gem)) return modifiers;
  const skillLevelAdd = frontendSkillLevelTableValueById(frontendSupportLevelTableId(gem), supportLevel, "skill_level_add");
  if (!skillLevelAdd) return modifiers;
  return [{
    stat: { id: "active_gem_level_add", text: "\u6280\u80fd\u7b49\u7ea7" },
    table_key: "skill_level_add",
    value: skillLevelAdd,
  }];
}

function frontendSupportLevelTableId(gem: Gem) {
  return frontendConduitBaseGemId(gem) || String(gem.base_gem_id ?? gem.instance_id);
}

function frontendConduitBaseGemId(gem: Gem) {
  const baseGemId = String(gem.base_gem_id ?? gem.instance_id);
  if (baseGemId === "support_row_conduit" || baseGemId === "support_column_conduit" || baseGemId === "support_box_conduit") {
    return baseGemId;
  }
  const text = `${gem.name_text ?? ""} ${gem.description_text ?? ""}`.toLowerCase();
  if (text.includes("\u884c\u5bfc\u7ba1") || text.includes("\u540c\u884c\u8fde\u63a5")) return "support_row_conduit";
  if (text.includes("\u5217\u5bfc\u7ba1") || text.includes("\u540c\u5217\u8fde\u63a5")) return "support_column_conduit";
  if (text.includes("\u5bab\u5bfc\u7ba1") || text.includes("\u540c\u5bab\u8fde\u63a5")) return "support_box_conduit";
  return "";
}

function frontendConduitRelation(gem: Gem) {
  const baseGemId = frontendConduitBaseGemId(gem);
  if (baseGemId === "support_row_conduit") return "same_row";
  if (baseGemId === "support_column_conduit") return "same_column";
  if (baseGemId === "support_box_conduit") return "same_box";
  return "";
}

function frontendConduitCanUseTarget(gem: Gem, targetGem: Gem) {
  const conduitRelation = frontendConduitRelation(gem);
  if (!conduitRelation) return true;
  const source = gem.board_position;
  const target = targetGem.board_position;
  if (!source || !target) return false;
  if (conduitRelation === "same_row") return source.row === target.row;
  if (conduitRelation === "same_column") return source.column === target.column;
  if (conduitRelation === "same_box") {
    return Math.floor(source.row / 3) === Math.floor(target.row / 3)
      && Math.floor(source.column / 3) === Math.floor(target.column / 3);
  }
  return false;
}

function frontendSupportCanAffect(sourceGem: Gem, targetTags: Set<string>) {
  const canAffect = frontendRecord(frontendRecord(sourceGem).can_affect);
  const anyTags = frontendTagIds(canAffect.tags_any);
  const allTags = frontendTagIds(canAffect.tags_all);
  const noneTags = frontendTagIds(canAffect.tags_none);
  if (anyTags.length > 0 && !anyTags.some((tag) => targetTags.has(tag))) return false;
  if (allTags.some((tag) => !targetTags.has(tag))) return false;
  if (noneTags.some((tag) => targetTags.has(tag))) return false;
  return true;
}

function frontendTagIds(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry) => String(frontendRecord(entry).id ?? frontendRecord(entry).text ?? "")).filter(Boolean)
    : [];
}

function frontendBoardRelation(source: Gem["board_position"], target: Gem["board_position"]) {
  if (!source || !target) return "";
  if (Math.abs(source.row - target.row) + Math.abs(source.column - target.column) === 1) return "adjacent";
  if (source.row === target.row) return "same_row";
  if (source.column === target.column) return "same_column";
  if (Math.floor(source.row / 3) === Math.floor(target.row / 3) && Math.floor(source.column / 3) === Math.floor(target.column / 3)) return "same_box";
  return "";
}

function frontendRelationCoefficient(relation: string) {
  return relation === "adjacent" ? 1.25 : 1;
}

function frontendRelationText(relation: string) {
  if (relation === "board_wide") return "\u5168\u76d8";
  if (relation === "adjacent") return "相邻";
  if (relation === "same_row") return "同行";
  if (relation === "same_column") return "同列";
  if (relation === "same_box") return "同宫";
  return relation;
}

function applyFrontendEquipmentSkillModifiers(
  skill: SkillPreview,
  gem: Gem,
  modifiers: FrontendEquipmentStatModifier[],
  appliedModifiers: readonly SkillAppliedModifier[] = []
): SkillPreview {
  if (modifiers.length === 0) return skill;
  const skillStats = { ...(skill.skill_stats ?? {}) };
  for (const modifier of modifiers) {
    if (modifier.kind === "runtime_hook") continue;
    const stat = modifier.reason_key === "modifier.equipment_affix"
      ? frontendEquipmentAttackAddedDamageStat(modifier) || modifier.stat
      : modifier.stat;
    skillStats[stat] = Number(skillStats[stat] ?? 0) + modifier.value;
  }
  const tags = new Set(gem.tags.map((tag) => tag.id ?? tag.text));
  const damageType = skill.damage_type;
  const skillLevelAdd = frontendEquipmentSkillLevelAdd(skill, gem, skillStats, tags);
  const levelDamageScale = frontendSkillLevelDamageScale(skill, gem, skillLevelAdd);
  if (skillLevelAdd) skillStats.equipment_skill_level_add = skillLevelAdd;
  const finalPercent =
    statValue(skillStats, "damage_final_percent")
    + statValue(skillStats, "hit_damage_final_percent")
    + (tags.has("attack") ? statValue(skillStats, "attack_damage_final_percent") : 0)
    + (tags.has("spell") ? statValue(skillStats, "spell_damage_final_percent") : 0);
  const baselineDamage = Number(skill.final_damage ?? 0) * levelDamageScale;
  const addedDamageEffectiveness = Math.max(0, statValue(skillStats, "added_damage_effectiveness_percent") || 100) / 100;
  const baseComponents = frontendSkillBaseDamageComponents(skill, damageType, baselineDamage);
  addFrontendDamageComponent(baseComponents, damageType, statValue(skillStats, "added_damage") * addedDamageEffectiveness);
  addFrontendDamageComponent(baseComponents, "physical", statValue(skillStats, "added_physical_damage") * addedDamageEffectiveness);
  addFrontendDamageComponent(baseComponents, "fire", statValue(skillStats, "added_fire_damage") * addedDamageEffectiveness);
  addFrontendDamageComponent(baseComponents, "cold", statValue(skillStats, "added_cold_damage") * addedDamageEffectiveness);
  addFrontendDamageComponent(baseComponents, "lightning", statValue(skillStats, "added_lightning_damage") * addedDamageEffectiveness);
  addFrontendDamageComponent(baseComponents, "chaos", statValue(skillStats, "added_chaos_damage") * addedDamageEffectiveness);
  if (tags.has("attack")) {
    addFrontendDamageComponent(baseComponents, "physical", statValue(skillStats, "weapon_attack_base_damage"));
  }
  const convertedComponents = convertFrontendDamageComponents(baseComponents, frontendDamageConversions(skill));
  const finalDamageComponents: Record<string, number> = Object.fromEntries(Object.entries(convertedComponents)
    .map(([componentType, componentAmount]) => [
      componentType,
      Math.max(0, componentAmount * (1 + frontendComponentAdditivePercent(componentType, skillStats, tags) / 100) * (1 + finalPercent / 100))
    ])
    .filter((entry): entry is [string, number] => typeof entry[1] === "number" && entry[1] > 0));
  const nextDamage = Object.values(finalDamageComponents).reduce<number>((total, value) => total + value, 0);
  const runtimeParams = { ...(skill.runtime_params ?? {}) };
  for (const modifier of modifiers) {
    if (modifier.kind === "runtime_hook" && modifier.payload && typeof modifier.payload === "object") {
      Object.assign(runtimeParams, modifier.payload);
    }
  }
  const grantedEffects = frontendEquipmentGrantedEffects(modifiers, skillStats, tags, finalPercent, addedDamageEffectiveness, damageType);
  if (grantedEffects.length > 0) runtimeParams.frontend_equipment_granted_effects = grantedEffects;
  for (const key of [
    "armor_reduction_penetration_percent",
    "cull_threshold_percent",
    "double_damage_chance_percent",
    "continuous_attack_chance_percent",
    "continuous_attack_damage_step_percent",
    "continuous_attack_damage_step_final_percent",
    "duration_add_percent",
    "resistance_penetration_percent",
    "movement_skill_cooldown_recovery_add_percent",
    "aura_effect_add_percent",
    "dot_damage_add_percent",
    "ailment_damage_add_percent",
    "ailment_damage_deepen_percent",
    "numbed_effect_add_percent",
    "deterioration_chance_add_percent",
    "deterioration_damage_add_percent",
    "deterioration_duration_add_percent",
    "added_base_ignite_damage_per_second",
    "added_base_trauma_damage_per_second",
    "added_base_ailment_damage_per_second",
    "aggravation_value_add",
    "aggravation_effect_add_percent",
    "frostbite_max_value_add",
    "ailment_duration_add_percent",
    "ignite_duration_add_percent",
    "trauma_duration_add_percent",
    "ignite_stacks_add",
  ]) {
    const value = statValue(skillStats, key);
    if (value) runtimeParams[key] = value;
  }
  addRuntimeParam(runtimeParams, "split_projectile_count", statValue(skillStats, "split_projectile_count_add"));
  addRuntimeParam(runtimeParams, "pierce_count", statValue(skillStats, "pierce_count_add"));
  addRuntimeParam(runtimeParams, "chain_count", statValue(skillStats, "chain_count_add"));
  addRuntimeParam(runtimeParams, "channel_max_stacks", statValue(skillStats, "channel_max_stacks_add"));
  addRuntimeParam(runtimeParams, "channel_min_stacks", statValue(skillStats, "channel_min_stacks_add"));
  addRuntimeParam(runtimeParams, "slash_chance_percent", statValue(skillStats, "slash_chance_add_percent"));
  runtimeParams.frontend_skill_tags = [...tags];
  scaleRuntimeParam(runtimeParams, "projectile_speed", statValue(skillStats, "projectile_speed_add_percent"));
  scaleFrontendRuntimeDurations(runtimeParams, statValue(skillStats, "duration_add_percent"));
  const projectileCountAdd = statValue(skillStats, "projectile_count_add");
  const projectileCount = Math.max(1, Math.round(Number(skill.projectile_count ?? 1) + projectileCountAdd));
  if (projectileCountAdd !== 0 || runtimeParams.projectile_count !== undefined) {
    runtimeParams.projectile_count = projectileCount;
  }
  if (
    projectileCountAdd > 0
    && projectileCount > 1
    && Number(runtimeParams.spread_angle_deg ?? 0) <= 0
    && Number(runtimeParams.angle_step ?? 0) <= 0
  ) {
    runtimeParams.spread_angle_deg = defaultFrontendExtraProjectileSpreadAngle(projectileCount);
  }
  const critChance = frontendExpectedCritChance(skill, skillStats);
  const critMultiplier = frontendExpectedCritMultiplier(skill, skillStats);
  const expectedHitDamage = nextDamage * ((1 - critChance) + critChance * critMultiplier);
  const timing = frontendSkillTiming(skill, tags, skillStats);
  return {
    ...skill,
    skill_stats: skillStats,
    source_context: skillLevelAdd ? frontendSkillSourceContextWithEquipmentLevel(skill, gem, skillLevelAdd) : skill.source_context,
    final_damage: nextDamage,
    final_damage_components: finalDamageComponents,
    non_crit_damage: nextDamage,
    crit_chance: critChance,
    crit_multiplier: critMultiplier,
    expected_hit_damage: expectedHitDamage,
    preview_dps: timing.actualIntervalMs > 0 ? expectedHitDamage * (1000 / timing.actualIntervalMs) : 0,
    base_release_interval_ms: timing.baseReleaseIntervalMs,
    release_interval_ms: timing.releaseIntervalMs,
    base_cooldown_ms: timing.baseCooldownMs,
    final_cooldown_ms: timing.finalCooldownMs,
    actual_interval_ms: timing.actualIntervalMs,
    uses_per_second: timing.actualIntervalMs > 0 ? 1000 / timing.actualIntervalMs : 0,
    speed_multiplier: timing.speedMultiplier,
    projectile_count: projectileCount,
    area_multiplier: Number(skill.area_multiplier ?? 1) * Math.max(0.05, 1 + statValue(skillStats, "area_add_percent") / 100),
    runtime_params: runtimeParams,
    applied_modifiers: [...(skill.applied_modifiers ?? []), ...appliedModifiers],
  };
}

function frontendEquipmentAttackAddedDamageStat(modifier: FrontendEquipmentStatModifier) {
  if (modifier.kind !== "damage_stat") return "";
  if (modifier.stat === "added_damage") return "equipment_attack_added_damage";
  const match = modifier.stat.match(/^added_(physical|fire|cold|lightning|chaos)_damage$/);
  return match ? `equipment_attack_added_${match[1]}_damage` : "";
}

function frontendEquipmentGrantedEffects(
  modifiers: FrontendEquipmentStatModifier[],
  skillStats: Record<string, number | boolean>,
  tags: Set<string>,
  finalPercent: number,
  addedDamageEffectiveness: number,
  primaryDamageType: string
) {
  return modifiers
    .map((modifier) => frontendEquipmentGrantedEffect(modifier, skillStats, tags, finalPercent, addedDamageEffectiveness, primaryDamageType))
    .filter((effect): effect is FrontendEquipmentGrantedEffect => Boolean(effect));
}

type FrontendEquipmentGrantedEffect = {
  id: string;
  effect_kind: string;
  trigger_condition: string;
  direct_damage_module_id: string;
  damage_type: string;
  value: number;
  value_min: number;
  value_max: number;
  damage_multiplier: number;
  source_modifier_id: string;
};

function frontendEquipmentGrantedEffect(
  modifier: FrontendEquipmentStatModifier,
  skillStats: Record<string, number | boolean>,
  tags: Set<string>,
  finalPercent: number,
  addedDamageEffectiveness: number,
  primaryDamageType: string
) {
  if (modifier.reason_key !== "modifier.equipment_affix" || modifier.kind !== "damage_stat") return null;
  const damageType = frontendAddedDamageStatType(modifier.stat);
  if (!damageType) return null;
  const resolvedDamageType = damageType === "generic" ? primaryDamageType : damageType;
  const multiplier = addedDamageEffectiveness * (1 + frontendComponentAdditivePercent(resolvedDamageType, skillStats, tags) / 100) * (1 + finalPercent / 100);
  const triggerCondition = frontendEquipmentGrantedEffectTriggerCondition(modifier);
  if (!frontendEquipmentGrantedEffectMatchesTags(triggerCondition, tags)) return null;
  return {
    id: `equipment_affix.${modifier.source_modifier_id}.${modifier.stat}`,
    effect_kind: "direct_damage",
    trigger_condition: triggerCondition,
    direct_damage_module_id: `equipment_affix.${modifier.source_modifier_id}.direct_damage`,
    damage_type: damageType,
    value: modifier.value,
    value_min: modifier.value_min ?? modifier.value,
    value_max: modifier.value_max ?? modifier.value,
    damage_multiplier: multiplier,
    source_modifier_id: modifier.source_modifier_id,
  };
}

function frontendAddedDamageStatType(stat: string) {
  if (stat === "added_damage") return "generic";
  const match = stat.match(/^added_(physical|fire|cold|lightning|chaos)_damage$/);
  return match?.[1] ?? "";
}

function frontendEquipmentGrantedEffectTriggerCondition(modifier: FrontendEquipmentStatModifier) {
  const payloadCondition = modifier.payload?.trigger_condition;
  if (typeof payloadCondition === "string" && payloadCondition) return payloadCondition;
  const sourceText = modifier.source_text ?? "";
  if (sourceText.includes("法术附加") || sourceText.includes("娉曟湳闄勫姞")) return "spell_hit";
  if (sourceText.includes("攻击附加") || sourceText.includes("鏀诲嚮闄勫姞")) return "attack_hit";
  return "attack_hit";
}

function frontendEquipmentGrantedEffectMatchesTags(condition: string, tags: Set<string>) {
  if (condition === "hit") return true;
  if (condition === "attack_hit") return tags.has("attack");
  if (condition === "spell_hit") return tags.has("spell");
  return false;
}

function attributeScaledDamageAddPercent(skillStats: Record<string, number | boolean>) {
  const attributes = statValue(skillStats, "strength") + statValue(skillStats, "dexterity") + statValue(skillStats, "intelligence");
  return Math.floor(attributes / 12) * statValue(skillStats, "damage_add_percent_per_12_attributes")
    + Math.floor(attributes / 27) * statValue(skillStats, "damage_add_percent_per_27_attributes");
}

function frontendSkillBaseDamageComponents(skill: SkillPreview, fallbackDamageType: string, baselineDamage: number) {
  const existing = skill.final_damage_components;
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    return Object.fromEntries(Object.entries(existing).map(([damageType, value]) => [damageType, Number(value ?? 0)]));
  }
  return { [fallbackDamageType]: baselineDamage };
}

function addFrontendDamageComponent(components: Record<string, number>, damageType: string, amount: number) {
  if (!Number.isFinite(amount) || amount === 0) return;
  components[damageType] = (components[damageType] ?? 0) + amount;
}

function frontendDamageConversions(skill: SkillPreview, hitConfig?: Record<string, unknown>) {
  return Array.isArray(hitConfig?.damage_conversions)
    ? hitConfig.damage_conversions as Record<string, unknown>[]
    : Array.isArray(skill.hit?.damage_conversions)
      ? skill.hit.damage_conversions as Record<string, unknown>[]
      : [];
}

function convertFrontendDamageComponents(components: Record<string, number>, conversions: Record<string, unknown>[]) {
  const converted: Record<string, number> = {};
  for (const [damageType, rawAmount] of Object.entries(components)) {
    let remainder = Math.max(0, Number(rawAmount ?? 0));
    const matchingConversions = conversions
      .filter((conversion) => String(conversion.from ?? "") === damageType && typeof conversion.to === "string")
      .map((conversion) => ({ to: String(conversion.to), percent: Math.max(0, Number(conversion.percent ?? 0)) }));
    if (matchingConversions.length === 0) {
      addFrontendDamageComponent(converted, damageType, remainder);
      continue;
    }
    const totalPercent = matchingConversions.reduce((total, conversion) => total + conversion.percent, 0);
    const scale = totalPercent > 100 ? 100 / totalPercent : 1;
    for (const conversion of matchingConversions) {
      const amount = Math.max(0, rawAmount * conversion.percent * scale / 100);
      remainder -= amount;
      addFrontendDamageComponent(converted, conversion.to, amount);
    }
    if (remainder > 0.000001) addFrontendDamageComponent(converted, damageType, remainder);
  }
  return converted;
}

function frontendComponentAdditivePercent(
  damageType: string,
  skillStats: Record<string, number | boolean>,
  tags: Set<string>
) {
  const elementalDamageAdd = ["fire", "cold", "lightning"].includes(damageType)
    ? statValue(skillStats, "elemental_damage_add_percent")
    : 0;
  return statValue(skillStats, "damage_add_percent")
    + statValue(skillStats, `${damageType}_damage_add_percent`)
    + elementalDamageAdd
    + statValue(skillStats, "hit_damage_add_percent")
    + (tags.has("attack") ? statValue(skillStats, "attack_damage_add_percent") : 0)
    + (tags.has("spell") ? statValue(skillStats, "spell_damage_add_percent") : 0)
    + (tags.has("projectile") ? statValue(skillStats, "projectile_damage_add_percent") : 0)
    + (tags.has("projectile") || tags.has("ranged") ? statValue(skillStats, "ranged_damage_add_percent") : 0)
    + (tags.has("melee") ? statValue(skillStats, "melee_damage_add_percent") : 0)
    + attributeScaledDamageAddPercent(skillStats);
}

function frontendEquipmentSkillLevelAdd(
  skill: SkillPreview,
  gem: Gem,
  skillStats: Record<string, number | boolean>,
  tags: Set<string>
) {
  let total = statValue(skillStats, "active_gem_level_add");
  const damageType = skill.damage_type;
  if (tags.has("attack")) total += statValue(skillStats, "attack_skill_level_add");
  if (tags.has("spell")) total += statValue(skillStats, "spell_skill_level_add");
  if (tags.has("core")) total += statValue(skillStats, "core_skill_level_add");
  if (damageType === "physical" || tags.has("physical")) total += statValue(skillStats, "physical_skill_level_add");
  if (damageType === "fire" || tags.has("fire")) total += statValue(skillStats, "fire_skill_level_add");
  if (damageType === "cold" || tags.has("cold")) total += statValue(skillStats, "cold_skill_level_add");
  if (damageType === "lightning" || tags.has("lightning")) total += statValue(skillStats, "lightning_skill_level_add");
  if (damageType === "chaos" || tags.has("chaos")) total += statValue(skillStats, "chaos_skill_level_add");
  if (["fire", "cold", "lightning"].includes(damageType) || tags.has("elemental")) {
    total += statValue(skillStats, "elemental_skill_level_add");
  }
  if (statValue(skillStats, "support_gem_level_add")) {
    skillStats.equipment_support_gem_level_add = statValue(skillStats, "support_gem_level_add");
  }
  return Math.max(0, Math.floor(total));
}

function frontendSkillSourceContextWithEquipmentLevel(skill: SkillPreview, gem: Gem, skillLevelAdd: number) {
  const sourceContext = frontendRecord(skill.source_context);
  const currentLevel = frontendSkillCurrentLevel(skill, gem);
  return {
    ...sourceContext,
    equipment_skill_level_add: skillLevelAdd,
    effective_gem_level: currentLevel + skillLevelAdd,
  } as SkillPreview["source_context"];
}

function frontendSkillLevelDamageScale(skill: SkillPreview, gem: Gem, skillLevelAdd: number) {
  if (skillLevelAdd <= 0) return 1;
  const currentLevel = frontendSkillCurrentLevel(skill, gem);
  const targetLevel = Math.min(40, currentLevel + skillLevelAdd);
  const currentBaseDamage = frontendSkillLevelValue(skill, "base_damage", currentLevel, Number(skill.final_damage ?? 0), currentLevel);
  const targetBaseDamage = frontendSkillLevelValue(skill, "base_damage", targetLevel, currentBaseDamage, currentLevel);
  if (currentBaseDamage > 0 && targetBaseDamage > 0) {
    return Math.max(0, targetBaseDamage / currentBaseDamage);
  }
  return 1;
}

function frontendSkillCurrentLevel(skill: SkillPreview, gem: Gem) {
  const sourceContext = frontendRecord(skill.source_context);
  return Math.max(1, Math.floor(Number(sourceContext.effective_gem_level ?? sourceContext.base_gem_level ?? gem.level ?? 1)));
}

function frontendSkillLevelValue(skill: SkillPreview, key: string, targetLevel: number, fallback: number, currentLevel: number) {
  const tableValue = frontendSkillLevelTableValue(skill, targetLevel, key);
  if (tableValue !== null) return tableValue;
  const anchors = frontendSkillLevelAnchors(skill, key);
  const levelValues = frontendRecord(frontendRecord(skill.source_context).level_values);
  const currentValue = Number(levelValues[key] ?? fallback);
  const points = [...anchors];
  if (Number.isFinite(currentValue)) {
    const existingCurrent = points.findIndex(([level]) => level === currentLevel);
    if (existingCurrent >= 0) {
      points[existingCurrent] = [currentLevel, currentValue];
    } else {
      points.push([currentLevel, currentValue]);
    }
  }
  points.sort((a, b) => a[0] - b[0]);
  if (points.length === 0) return fallback;
  const exact = points.find(([level]) => level === targetLevel);
  if (exact) return exact[1];
  if (points.length === 1) {
    const [anchorLevel, anchorValue] = points[0];
    if (anchorLevel <= 0 || anchorValue <= 0) return fallback;
    return Math.max(0, anchorValue * (targetLevel / anchorLevel));
  }
  let lower = points[0];
  let upper = points[points.length - 1];
  for (let index = 0; index < points.length - 1; index += 1) {
    if (targetLevel >= points[index][0] && targetLevel <= points[index + 1][0]) {
      lower = points[index];
      upper = points[index + 1];
      break;
    }
  }
  const [lowerLevel, lowerValue] = lower;
  const [upperLevel, upperValue] = upper;
  if (upperLevel === lowerLevel) return lowerValue;
  const ratio = (targetLevel - lowerLevel) / (upperLevel - lowerLevel);
  return Math.max(0, lowerValue + (upperValue - lowerValue) * ratio);
}

function frontendSkillLevelTableValue(skill: SkillPreview, targetLevel: number, key: string) {
  const sourceContext = frontendRecord(skill.source_context);
  const tableId = String(sourceContext.base_gem_id ?? skill.skill_template_id ?? "");
  return frontendSkillLevelTableValueById(tableId, targetLevel, key);
}

function frontendSkillLevelTableValueById(tableId: string, targetLevel: number, key: string) {
  const table = (FRONTEND_SKILL_LEVEL_TABLES as Record<string, Record<number, Record<string, number>>>)[tableId];
  if (!table) return null;
  const levels = Object.keys(table).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (levels.length === 0) return null;
  const clampedLevel = clamp(Math.floor(targetLevel), levels[0], levels[levels.length - 1]);
  const value = table[clampedLevel]?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function frontendSkillLevelAnchors(skill: SkillPreview, key: string): [number, number][] {
  const sourceContext = frontendRecord(skill.source_context);
  const sourceValues = frontendRecord(sourceContext.tlidb_source_values);
  const parsedValues = frontendRecord(sourceValues.parsed_values);
  const anchorsByKey = frontendRecord(parsedValues.anchors);
  const anchors = frontendRecord(anchorsByKey[key]);
  return Object.entries(anchors)
    .map(([level, value]) => [Number(level), Number(value)] as [number, number])
    .filter(([level, value]) => Number.isFinite(level) && Number.isFinite(value));
}

function frontendRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeFrontendStatusType(statusType: string) {
  const normalized = statusType.trim().toLowerCase();
  const aliases: Record<string, string> = {
    freeze: "frozen",
    frozen: "frozen",
    frostbite: "frostbite",
    chill: "chill",
    chilled: "chill",
    ignite: "ignite",
    burning: "ignite",
    shock: "shock",
    numbed: "numbed",
    paralysis: "numbed",
    trauma: "trauma",
    wilt: "wilt",
    wither: "wilt",
    weakened: "weakened",
    weak: "weakened",
    scorch: "scorch",
    scorched: "scorch",
    rot: "rot",
    rotten: "rot",
    maimed: "maimed"
  };
  return aliases[normalized] ?? normalized;
}

function frontendPlayerStatusImmunityStats(statusType: string) {
  const normalized = normalizeFrontendStatusType(statusType);
  const aliases: Record<string, string[]> = {
    ignite: ["immune_ignite", "immune_scorch"],
    frostbite: ["immune_frostbite", "immune_chill", "immune_frozen"],
    frozen: ["immune_frozen"],
    chill: ["immune_chill", "immune_frostbite"],
    shock: ["immune_shock"],
    numbed: ["immune_numbed"],
    trauma: ["immune_trauma", "immune_maimed"],
    wilt: ["immune_wilt", "immune_wither", "immune_rot"],
    weakened: ["immune_weakened"],
    scorch: ["immune_scorch", "immune_ignite"],
    rot: ["immune_rot", "immune_wilt", "immune_wither"],
    maimed: ["immune_maimed", "immune_trauma"]
  };
  return aliases[normalized] ?? [`immune_${normalized}`];
}

function frontendElementalAilmentTypes() {
  return new Set(["ignite", "frostbite", "frozen", "chill", "shock", "numbed", "scorch"]);
}

function frontendSkillDotDamageMultiplier(skill: SkillPreview) {
  return Math.max(0, 1 + Number(skill.runtime_params?.dot_damage_add_percent ?? 0) / 100);
}

function frontendSkillAilmentDamageMultiplier(skill: SkillPreview) {
  const addPercent =
    Number(skill.runtime_params?.dot_damage_add_percent ?? 0)
    + Number(skill.runtime_params?.ailment_damage_add_percent ?? 0)
    + Number(skill.runtime_params?.ailment_damage_deepen_percent ?? 0);
  return Math.max(0, 1 + addPercent / 100);
}

function addRuntimeParam(runtimeParams: Record<string, unknown>, key: string, value: number) {
  if (!value) return;
  runtimeParams[key] = Number(runtimeParams[key] ?? 0) + value;
}

function scaleRuntimeParam(runtimeParams: Record<string, unknown>, key: string, addPercent: number) {
  if (!addPercent || runtimeParams[key] === undefined) return;
  runtimeParams[key] = Number(runtimeParams[key] ?? 0) * (1 + addPercent / 100);
}

function scaleFrontendRuntimeDurations(runtimeParams: Record<string, unknown>, addPercent: number) {
  if (!addPercent) return;
  const multiplier = Math.max(0.01, 1 + addPercent / 100);
  for (const key of ["duration_ms", "cloud_duration_per_stack_ms"]) {
    if (runtimeParams[key] !== undefined) runtimeParams[key] = Math.max(1, Number(runtimeParams[key] ?? 0) * multiplier);
  }
  const modules = runtimeParams.modules;
  if (!Array.isArray(modules)) return;
  for (const module of modules) {
    if (!module || typeof module !== "object") continue;
    const params = (module as { params?: Record<string, unknown> }).params;
    if (!params || typeof params !== "object") continue;
    for (const key of ["duration_ms", "cloud_duration_per_stack_ms"]) {
      if (params[key] !== undefined) params[key] = Math.max(1, Number(params[key] ?? 0) * multiplier);
    }
  }
}

function frontendExpectedCritChance(skill: SkillPreview, skillStats: Record<string, number | boolean>) {
  if (skillStats.cannot_crit === true) return 0;
  const baseCritPercent = Number(skill.crit_chance ?? 0) * 100;
  const directCritPercent = statValue(skillStats, "crit_chance_add_percent");
  const critRating = statValue(skillStats, "crit_rating");
  const ratingCritPercent = critRating > 0 ? 45 * critRating / (critRating + 600) : 0;
  return clamp((baseCritPercent + directCritPercent + ratingCritPercent) / 100, 0, 0.95);
}

function frontendExpectedCritMultiplier(skill: SkillPreview, skillStats: Record<string, number | boolean>) {
  const baseCritDamagePercent = Number(skill.crit_multiplier ?? 1.5) * 100;
  const critDamageRating = statValue(skillStats, "crit_damage_rating");
  const ratingCritDamagePercent = critDamageRating > 0 ? 200 * critDamageRating / (critDamageRating + 1000) : 0;
  return Math.max(1, (baseCritDamagePercent + statValue(skillStats, "crit_damage_add_percent") + ratingCritDamagePercent) / 100);
}

function createFrontendInitialAppState(): AppState {
  return sanitizeFrontendStorageState(recalculateFrontendSkillPreview(cloneFrontendInitialAppStateSeed()));
}

function createMonsterTestAppState(): AppState {
  const state = cloneFrontendInitialAppStateSeed();
  state.player_name = "怪物测试";
  state.inventory = [];
  state.stash_pages = createEmptyStashPages();
  state.drops = [];
  state.skill_preview = [];
  state.equipment_slots = Array(EQUIPMENT_SLOT_COUNT).fill(null);
  state.board = {
    ...state.board,
    cells: state.board.cells.map((row) => row.map((cell) => ({ ...cell, gem: null })))
  };
  if (state.player_stats?.max_life) state.player_stats.max_life.value = MONSTER_TEST_PLAYER_LIFE;
  return sanitizeFrontendStorageState(recalculateFrontendEquipmentState(recalculateFrontendSkillPreview(state)));
}

function createFrontendNewGameState(slotId?: number, playerName = DEFAULT_PLAYER_NAME): AppState {
  if (slotId) clearFrontendSaveSlot(slotId);
  else clearFrontendAutosave();
  return createFrontendNewSaveStarterState(slotId, playerName);
}

function createFrontendNewSaveStarterState(slotId?: number, playerName = DEFAULT_PLAYER_NAME): AppState {
  const state = cloneFrontendInitialAppStateSeed();
  state.player_name = normalizePlayerName(playerName);
  state.inventory = [];
  state.stash_pages = createEmptyStashPages();
  state.drops = [];
  state.equipment_slots = Array(EQUIPMENT_SLOT_COUNT).fill(null);
  state.board = {
    ...state.board,
    cells: state.board.cells.map((row) => row.map((cell) => ({ ...cell, gem: null })))
  };
  const starterGem = createRandomNewSaveStarterGem(slotId);
  if (starterGem) {
    state.inventory = [starterGem];
    const cell = state.board.cells[STARTER_GEM_BOARD_POSITION.row]?.[STARTER_GEM_BOARD_POSITION.column];
    if (cell) cell.gem = starterGem;
  }
  return sanitizeFrontendStorageState(recalculateFrontendEquipmentState(recalculateFrontendSkillPreview(state)));
}

function createRandomNewSaveStarterGem(slotId?: number): Gem | null {
  const activeGems = frontendGemDropPool()
    .filter((gem) => (
      gem.gem_kind === "active_skill"
      && Number(gem.level ?? 1) === 1
      && !EXCLUDED_NEW_SAVE_STARTER_BASE_GEM_IDS.has(String(gem.base_gem_id ?? gem.instance_id))
    ));
  if (activeGems.length === 0) return null;
  const seed = Date.now() + Math.floor(Math.random() * 1_000_000) + (slotId ?? 0) * 9973;
  const template = activeGems[seed % activeGems.length];
  const baseId = String(template.base_gem_id ?? template.instance_id);
  return {
    ...cloneFrontendData(template),
    instance_id: `new_save_starter_${seed}_${baseId}`,
    level: 1,
    locked: false,
    board_position: { ...STARTER_GEM_BOARD_POSITION }
  };
}

function appStateFromFrontendSave(save: FrontendSavePayload | null): AppState | null {
  const candidate = frontendStateCandidateFromSave<AppState, FrontendSavePayload>(
    save,
    createFrontendInitialAppState,
    normalizePlayerName,
    normalizeStashPages
  );
  return candidate ? recalculateFrontendSkillPreview(recalculateFrontendEquipmentState(sanitizeFrontendStorageState(candidate))) : null;
}

function frontendSavePayloadFromState(state: AppState): FrontendSavePayload {
  const sanitized = sanitizeFrontendStorageState(state);
  return frontendSavePayloadFromSanitizedState<AppState, FrontendSavePayload>(sanitized, normalizePlayerName);
}

function saveFrontendAutosave(state: AppState) {
  saveFrontendAutosavePayload(frontendSavePayloadFromState(state));
}

async function requestGmOptions(): Promise<GmOptions> {
  await preloadFrontendEquipmentData();
  const gems = frontendGemDropPool().map((item) => ({
    id: item.base_gem_id ?? item.instance_id,
    name_text: item.name_text,
    kind: item.gem_kind || "ordinary",
    gem_type: item.gem_type.id ?? item.gem_type.identity_text,
    sudoku_digit: Number(item.sudoku_digit ?? 1)
  }));
  return {
    gems,
    equipment_sources: frontendEquipmentSources(),
    equipment_rarities: frontendEquipmentRarities()
  };
}

async function requestGmEquipmentAffixes(source: string, level: number): Promise<GmEquipmentAffixResponse> {
  await preloadFrontendEquipmentData();
  return { source, level, capacity: prefixSuffixCapacity(level), affixes: frontendEquipmentAffixOptions(source, level) };
}

function recalculateFrontendEquipmentState(state: AppState): AppState {
  const baseStats = cloneFrontendData(FRONTEND_INITIAL_APP_STATE.player_stats ?? {}) as Record<string, PlayerStatView>;
  const modifiers = [
    ...frontendEquippedEquipmentModifiers(state),
    ...frontendMountedPassiveSelfStatModifiers(state),
  ];
  const playerStats = applyFrontendEquipmentStatModifiers(baseStats, modifiers);
  return {
    ...state,
    player_stats: playerStats,
    character_panel: recalculateFrontendCharacterPanel(playerStats)
  };
}

function recalculateFrontendCharacterPanel(playerStats: Record<string, PlayerStatView>): CharacterPanelView | undefined {
  const basePanel = cloneFrontendData(FRONTEND_INITIAL_APP_STATE.character_panel) as CharacterPanelView | undefined;
  if (!basePanel) return undefined;
  return {
    ...basePanel,
    sections: basePanel.sections.map((section) => ({
      ...section,
      rows: section.rows.map((row) => {
        const stat = playerStats[row.stat_id];
        if (["fire_resistance_percent", "cold_resistance_percent", "lightning_resistance_percent"].includes(row.stat_id)) {
          const value = statNumber(stat, 0) + statNumber(playerStats.elemental_resistance_percent, 0);
          return { ...row, value };
        }
        if (row.stat_id === "life_regen_flat") {
          const value = Math.max(0, statNumber(playerStats.life_regen_flat, 0) * (1 + Math.max(0, statNumber(playerStats.life_regen_add_percent, 0)) / 100))
            + Math.max(0, statNumber(playerStats.max_life, 0) * statNumber(playerStats.life_regen_percent_per_second, 0) / 100);
          return { ...row, value };
        }
        if (row.stat_id === "mana_regen_flat") {
          const value = Math.max(0, statNumber(playerStats.mana_regen_flat, 0) * (1 + Math.max(0, statNumber(playerStats.mana_regen_add_percent, 0)) / 100));
          return { ...row, value };
        }
        if (row.stat_id === "armor") {
          const value = Math.max(0, statNumber(playerStats.armor, 0) * (1 + Math.max(0, statNumber(playerStats.armor_add_percent, 0)) / 100));
          return { ...row, value };
        }
        if (row.stat_id === "evasion") {
          const value = Math.max(0, statNumber(playerStats.evasion, 0) * (1 + Math.max(0, statNumber(playerStats.evasion_add_percent, 0)) / 100));
          return { ...row, value };
        }
        return typeof stat?.value === "number" || typeof stat?.value === "boolean"
          ? { ...row, value: stat.value }
          : row;
      })
    }))
  };
}

async function requestBackendState(path: string, body: unknown): Promise<AppState> {
  void path;
  void body;
  throw new Error("普通单机玩法不再调用后端状态接口。");
}

export function App() {
  const [spriteTestMode] = useState(() => initialSpriteTestMode());
  const [mapEditorMode] = useState(() => initialMapEditorMode());
  if (mapEditorMode) return <MapEditorScene />;
  return spriteTestMode ? <SpriteTestScene /> : <GameApp />;
}

const MONSTER_TEST_PLAYER_LIFE = 9_999_999;
const MONSTER_TEST_LEVEL = 86;
const MONSTER_TEST_SPAWN_OFFSETS = [
  { x: 360, y: 0 },
  { x: 300, y: -160 },
  { x: 300, y: 160 },
  { x: 430, y: -80 },
  { x: 430, y: 80 },
  { x: 520, y: 0 }
];

export function clearLaunchCacheIfRequested() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const shouldClear = params.get("clear_cache") === "1" || params.get("clear-cache") === "1";
  if (!shouldClear) return;

  [
    MAP_EDITOR_STORAGE_KEY,
    MAP_EDITOR_CURRENT_FILE_STORAGE_KEY,
    SKILL_EDITOR_CAMERA_STORAGE_KEY
  ].forEach((key) => window.localStorage.removeItem(key));

  if ("caches" in window) {
    window.caches.keys()
      .then((keys) => Promise.all(keys.map((key) => window.caches.delete(key))))
      .catch(() => undefined);
  }

  params.delete("clear_cache");
  params.delete("clear-cache");
  params.delete("v");
  const query = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
}

function GameApp() {
  const [state, setState] = useState<AppState | null>(null);
  const [gameResolutionMode, setGameResolutionMode] = useState<GameResolutionMode>(() => loadGameResolutionMode());
  const gameViewport = useGameViewport(gameResolutionMode);
  const [bagOpen, setBagOpen] = useState(false);
  const [monsterTestMode] = useState(() => initialMonsterTestMode());
  const [skillEditorMode] = useState(() => initialSkillEditorMode());
  const [entryStep, setEntryStep] = useState<"title" | "save" | "rest">(() => skillEditorMode || monsterTestMode ? "rest" : "title");
  const [restAreaPanel, setRestAreaPanel] = useState<"stage" | "stash" | null>(null);
  const [restAreaInteractionTarget, setRestAreaInteractionTarget] = useState<"stage" | "stash" | null>(null);
  const [saveSlots, setSaveSlots] = useState<FrontendSaveSlotSummary[]>(() => loadFrontendSaveSlotSummaries<FrontendSavePayload>());
  const [selectedSaveSlotId, setSelectedSaveSlotId] = useState(() => loadActiveFrontendSaveSlotId() ?? latestFrontendSaveSlotId(saveSlots) ?? 1);
  const [saveStartMode, setSaveStartMode] = useState<"continue" | "new">(() => latestFrontendSaveSlotId(saveSlots) ? "continue" : "new");
  const [newPlayerName, setNewPlayerName] = useState(DEFAULT_PLAYER_NAME);
  const [skillEditorOpen, setSkillEditorOpen] = useState(() => initialSkillEditorOpen());
  const [selectedSkillEditorId, setSelectedSkillEditorId] = useState<string | null>(null);
  const [skillEditorGuidePackage, setSkillEditorGuidePackage] = useState<SkillPackageData | null>(null);
  const [skillEditorDebugOptions, setSkillEditorDebugOptions] = useState<SkillEditorDebugOptions>(DEFAULT_SKILL_EDITOR_DEBUG_OPTIONS);
  const [skillEditorCameraSettings, setSkillEditorCameraSettings] = useState<SkillEditorCameraSettings>(() => loadSkillEditorCameraSettings());
  const [selectedMapId, setSelectedMapId] = useState<string | null>(() => monsterTestMode ? MONSTER_TEST_MAP_TEMPLATE_ID : skillEditorMode ? DEFAULT_BAKED_BATTLE_MAP_ID : DEFAULT_RUNTIME_MAP_ID);
  const [battleMap, setBattleMap] = useState<BakedBattleMapData | null>(null);
  const [mapDebugEnabled, setMapDebugEnabled] = useState(false);
  const [playableMinimapMode, setPlayableMinimapMode] = useState<PlayableMinimapMode>("compact");
  const [exploredMinimapCells, setExploredMinimapCells] = useState<Set<string>>(() => new Set());
  const [authoredSpawnPlanActive, setAuthoredSpawnPlanActive] = useState(false);
  const [authoredAggroSources, setAuthoredAggroSources] = useState<RuntimeEncounterAggroSource[]>([]);
  const [spawnPlanWarnings, setSpawnPlanWarnings] = useState<string[]>([]);
  const [proceduralSpawnDebug, setProceduralSpawnDebug] = useState<ProceduralSpawnDebugSummary | null>(null);
  const [notice, setNotice] = useState("正在载入。");
  const [playing, setPlaying] = useState(() => skillEditorMode);
  const [battlePauseOpen, setBattlePauseOpen] = useState(false);
  const [battlePauseView, setBattlePauseView] = useState<"menu" | "settings">("menu");
  const [gameFailureOpen, setGameFailureOpen] = useState(false);
  const [player, setPlayer] = useState<PlayerRuntimeState>({
    x: MAP_WIDTH / 2,
    y: MAP_HEIGHT / 2,
    hp: 100,
    maxHp: 100,
    currentMana: 0,
    maxMana: 0,
    currentEnergyShield: 0,
    maxEnergyShield: 0
  });
  const [enemies, setEnemies] = useState<Enemy[]>(() => skillEditorMode ? createSkillTestDummies(1, MAP_WIDTH / 2, MAP_HEIGHT / 2) : []);
  const [bossPortal, setBossPortal] = useState<BossPortal | null>(null);
  const [bossPortalConfirm, setBossPortalConfirm] = useState<{ portalId: string } | null>(null);
  const [texts, setTexts] = useState<FloatingText[]>([]);
  const [activePlayerBuffs, setActivePlayerBuffs] = useState<PlayerBuff[]>([]);
  const [bolts, setBolts] = useState<FireBolt[]>([]);
  const [areaNovas, setAreaNovas] = useState<AreaNova[]>([]);
  const [meleeArcs, setMeleeArcs] = useState<MeleeArcVfx[]>([]);
  const [chainSegments, setChainSegments] = useState<ChainSegmentVfx[]>([]);
  const [damageZones, setDamageZones] = useState<DamageZoneVfx[]>([]);
  const [hitVfxs, setHitVfxs] = useState<HitVfx[]>([]);
  const [kills, setKills] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [combatLogs, setCombatLogs] = useState<string[]>([]);
  const restAreaMapEntryKey = useRef<string | null>(null);
  const [runtimePerfSummary, setRuntimePerfSummary] = useState<RuntimePerfSummary>({
    frame_ms: 0,
    logic_ms: 0,
    active_projectiles: 0,
    active_hit_vfx: 0,
    active_area_vfx: 0,
    active_floating_text: 0,
    active_enemies: 0,
    scheduled_events: 0,
    consumed_events_this_frame: 0,
    dropped_frame_count: 0
  });
  const [runtimeBoundaryScan, setRuntimeBoundaryScan] = useState<RuntimeBoundaryScanSummary>({
    status: "idle",
    tested: 0,
    passed: 0,
    failed: 0,
    failures: []
  });
  const [hoveredGemId, setHoveredGemId] = useState<string | null>(null);
  const [hoveredBoardCell, setHoveredBoardCell] = useState<string | null>(null);
  const [hoveredBagSlot, setHoveredBagSlot] = useState<number | null>(null);
  const [hoveredEquipmentSlot, setHoveredEquipmentSlot] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [compareModifierHeld, setCompareModifierHeld] = useState(false);
  const [floatingGem, setFloatingGem] = useState<FloatingGem | null>(null);
  const [placementPrompt, setPlacementPrompt] = useState<PlacementPrompt | null>(null);
  const [itemDiscardPrompt, setItemDiscardPrompt] = useState<ItemDiscardPrompt | null>(null);
  const [skipItemDiscardConfirmToday, setSkipItemDiscardConfirmToday] = useState(loadItemDiscardSkipConfirmPreference);
  const [showPersistentSupportLines, setShowPersistentSupportLines] = useState(true);
  const [gmOpen, setGmOpen] = useState(false);
  const [gmOptions, setGmOptions] = useState<GmOptions | null>(null);
  const [gmAffixes, setGmAffixes] = useState<GmEquipmentAffixResponse | null>(null);
  const monsterTestOptions = useMemo(() => monsterTestMonsterOptions(), []);
  const [selectedMonsterTestMonsterId, setSelectedMonsterTestMonsterId] = useState(() => monsterTestOptions[0]?.id ?? "");
  const [inventorySlots, setInventorySlots] = useState<(string | null)[]>(() => Array(INVENTORY_SLOT_COUNT).fill(null));
  const [equipmentSlots, setEquipmentSlots] = useState<(string | null)[]>(() => Array(EQUIPMENT_SLOT_COUNT).fill(null));
  const [stashPageIndex, setStashPageIndex] = useState(0);
  const keys = useRef(new Set<string>());
  const floatingGemRef = useRef<FloatingGem | null>(null);
  const dropInProgressRef = useRef(false);
  const lastFrame = useRef<number | null>(null);
  const nextEnemyId = useRef(skillEditorMode ? SKILL_TEST_DUMMY_OFFSETS.length + 1 : 1);
  const nextTextId = useRef(1);
  const nextPlayerBuffId = useRef(1);
  const nextBoltId = useRef(1);
  const nextAreaNovaId = useRef(1);
  const nextMeleeArcId = useRef(1);
  const nextChainSegmentId = useRef(1);
  const nextDamageZoneId = useRef(1);
  const nextHitVfxId = useRef(1);
  const nextPromptId = useRef(1);
  const attackTimers = useRef<Record<string, number>>({});
  const thundercloudChannels = useRef<Record<string, ThundercloudChannelRuntime>>({});
  const damageZoneChannels = useRef<Record<string, ThundercloudChannelRuntime>>({});
  const scheduledSkillEvents = useRef<ScheduledSkillEvent[]>([]);
  const continuousAttackRuntime = useRef<ContinuousAttackRuntime | null>(null);
  const activeDamageZones = useRef<ActiveDamageZoneRuntime[]>([]);
  const bossSkillTimers = useRef<Map<number, BossSkillTimers>>(new Map());
  const monsterSkillTimers = useRef<Map<number, MonsterSkillRuntimeTimer>>(new Map());
  const supremeBossSkillTimers = useRef<Map<number, SupremeBossSkillTimer>>(new Map());
  const pendingBossDamageZoneHits = useRef<PendingBossDamageZoneHit[]>([]);
  const onKillRecastCounts = useRef<Map<string, number>>(new Map());
  const runtimePerf = useRef<RuntimePerfSummary>({
    frame_ms: 0,
    logic_ms: 0,
    active_projectiles: 0,
    active_hit_vfx: 0,
    active_area_vfx: 0,
    active_floating_text: 0,
    active_enemies: 0,
    scheduled_events: 0,
    consumed_events_this_frame: 0,
    dropped_frame_count: 0
  });
  const runtimePerfLastSync = useRef(0);
  const runtimeLastStepError = useRef<string | null>(null);
  const spawnTimer = useRef(0);

  useEffect(() => {
    const updateCompareModifier = (event: KeyboardEvent) => setCompareModifierHeld(event.ctrlKey);
    const clearCompareModifier = () => setCompareModifierHeld(false);
    window.addEventListener("keydown", updateCompareModifier);
    window.addEventListener("keyup", updateCompareModifier);
    window.addEventListener("blur", clearCompareModifier);
    return () => {
      window.removeEventListener("keydown", updateCompareModifier);
      window.removeEventListener("keyup", updateCompareModifier);
      window.removeEventListener("blur", clearCompareModifier);
    };
  }, []);
  const playerVisual = useRef<UnitVisualRuntime>({ direction: "down", movementVector: { x: 0, y: 0 } });
  const enemyVisuals = useRef(new Map<number, EnemyVisualRuntime>());
  const exploredMinimapCellsRef = useRef<Set<string>>(new Set());
  const lastMinimapGridCellRef = useRef<string | null>(null);
  const triggeredEncounterSourceIds = useRef<Set<string>>(new Set());
  const encounterMonsterPalette = useRef<EncounterMonsterPalette>(createEncounterMonsterPalette());
  const playerStateRef = useRef(player);
  const activePlayerBuffsRef = useRef<PlayerBuff[]>([]);
  const enemiesStateRef = useRef(enemies);
  const boltsStateRef = useRef(bolts);
  const elapsedRef = useRef(0);
  const elapsedLastUiSync = useRef(0);
  const pendingDropPickup = useRef<{ dropId: string; x: number; y: number } | null>(null);
  const pendingBossPortalUse = useRef<{ portalId: string; x: number; y: number } | null>(null);
  const pickupRequestInFlight = useRef(false);
  const dropDisplayPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const knownDropIds = useRef<Set<string>>(new Set());
  const frontendDropId = useRef(1);
  const frontendItemId = useRef(1);
  const frontendBossPortalId = useRef(1);
  const movementBarrierDistanceAccumulator = useRef(0);
  const playerBlockHitCounter = useRef(0);
  const blockLifeRecoveryReadyMs = useRef(0);
  const blockShieldRecoveryReadyMs = useRef(0);
  const lifeReturnReadyMs = useRef(0);
  const shieldReturnReadyMs = useRef(0);
  const energyShieldRechargeReadyMs = useRef(0);
  const warIntentState = useRef({ points: 0, remainingMs: 0 });

  function applyServerState(nextState: AppState, options: { persist?: boolean } = {}) {
    const persist = options.persist ?? true;
    const recalculated = sanitizeFrontendStorageState(recalculateFrontendSkillPreview(recalculateFrontendEquipmentState(nextState)));
    setState(recalculated);
    if (persist) saveFrontendAutosave(recalculated);
  }

  function applyFrontendState(updater: (current: AppState) => AppState | null) {
    setState((current) => {
      if (!current) return current;
      const next = updater(current);
      if (!next) return current;
      const recalculated = sanitizeFrontendStorageState(recalculateFrontendSkillPreview(recalculateFrontendEquipmentState(next)));
      saveFrontendAutosave(recalculated);
      return recalculated;
    });
  }

  function setRuntimePlayer(updater: (current: PlayerRuntimeState) => PlayerRuntimeState) {
    const next = normalizePlayerRuntimeResources(updater(playerStateRef.current));
    playerStateRef.current = next;
    setPlayer(next);
  }

  function setRuntimePlayerBuffs(next: PlayerBuff[]) {
    activePlayerBuffsRef.current = next;
    setActivePlayerBuffs(next);
  }

  function resetPlayableMinimapForRun(map: BakedBattleMapData | null | undefined, spawnPoint: { x: number; y: number }) {
    setPlayableMinimapMode("compact");
    lastMinimapGridCellRef.current = map ? playableMinimapCellKeyForPoint(map, spawnPoint) : null;
    const nextCells = map ? playableMinimapRevealCells(map, spawnPoint, new Set()).cells : new Set<string>();
    exploredMinimapCellsRef.current = nextCells;
    setExploredMinimapCells(nextCells);
  }

  function revealPlayableMinimapAroundPlayer(map: BakedBattleMapData | null | undefined, point: { x: number; y: number }) {
    if (!map || skillEditorMode || monsterTestMode) return;
    const gridKey = playableMinimapCellKeyForPoint(map, point);
    if (!gridKey || gridKey === lastMinimapGridCellRef.current) return;
    const revealed = playableMinimapRevealCells(map, point, exploredMinimapCellsRef.current);
    lastMinimapGridCellRef.current = gridKey;
    if (!revealed.changed) return;
    exploredMinimapCellsRef.current = revealed.cells;
    setExploredMinimapCells(revealed.cells);
  }

  function warIntentEnabled() {
    return statNumber(state?.player_stats?.war_intent_enabled, 0) > 0;
  }

  function gainWarIntentPoint() {
    if (!warIntentEnabled()) return;
    warIntentState.current = {
      points: Math.min(100, warIntentState.current.points + 1),
      remainingMs: 10_000,
    };
  }

  function advanceWarIntent(deltaMs: number) {
    if (warIntentState.current.remainingMs <= 0) return;
    const remainingMs = Math.max(0, warIntentState.current.remainingMs - Math.max(0, Math.round(deltaMs)));
    warIntentState.current = remainingMs > 0 ? { ...warIntentState.current, remainingMs } : { points: 0, remainingMs: 0 };
  }

  function applyFrontendWarIntentToSkill(skill: SkillPreview): SkillPreview {
    if (!warIntentEnabled() || warIntentState.current.points <= 0) return skill;
    const effectMultiplier = 1 + Math.max(0, statNumber(state?.player_stats?.war_intent_effect_add_percent, 0)) / 100;
    const warCritRating = warIntentState.current.points * 2 * effectMultiplier;
    if (warCritRating <= 0) return skill;
    const skillStats = { ...(skill.skill_stats ?? {}) };
    skillStats.crit_rating = Number(skillStats.crit_rating ?? 0) + warCritRating;
    const critChance = frontendExpectedCritChance(skill, skillStats);
    const critMultiplier = frontendExpectedCritMultiplier(skill, skillStats);
    const nonCritDamage = Number(skill.non_crit_damage ?? skill.final_damage ?? 0);
    const expectedHitDamage = nonCritDamage * ((1 - critChance) + critChance * critMultiplier);
    return {
      ...skill,
      skill_stats: skillStats,
      crit_chance: critChance,
      crit_multiplier: critMultiplier,
      expected_hit_damage: expectedHitDamage,
    };
  }

  function advancePlayerBuffs(dt: number) {
    const next = activePlayerBuffsRef.current
      .map((buff) => ({ ...buff, remaining: buff.remaining - dt }))
      .filter((buff) => buff.remaining > 0 && (!playerAbsorbBuffType(buff.buffType) || buff.remainingAmount > 0));
    setRuntimePlayerBuffs(next);
  }

  function playerMovementSpeedMultiplier(buffs = activePlayerBuffsRef.current) {
    return buffs.reduce((multiplier, buff) => {
      if (buff.remaining <= 0 || buff.buffType !== "channel_move_speed") return multiplier;
      const buffMultiplier = Number(buff.moveSpeedMultiplier ?? 1);
      if (!Number.isFinite(buffMultiplier)) return multiplier;
      return multiplier * clamp(buffMultiplier, 0, 5);
    }, 1);
  }

  function applyFrontendMovementEquipmentEffects(previousPlayer: PlayerRuntimeState, nextPlayer: PlayerRuntimeState, dt: number): PlayerRuntimeState {
    const movedDistance = distance(previousPlayer, nextPlayer);
    if (movedDistance <= 0) return nextPlayer;
    let updatedPlayer = nextPlayer;
    const shieldRecoveryPercent = Math.max(0, statNumber(state?.player_stats?.moving_shield_recovery_percent_per_second, 0));
    if (shieldRecoveryPercent > 0 && updatedPlayer.maxEnergyShield > 0 && dt > 0) {
      updatedPlayer = {
        ...updatedPlayer,
        currentEnergyShield: clamp(
          updatedPlayer.currentEnergyShield + updatedPlayer.maxEnergyShield * shieldRecoveryPercent / 100 * dt,
          0,
          updatedPlayer.maxEnergyShield
        )
      };
    }
    triggerFrontendMovementBarrier(movedDistance, updatedPlayer);
    return updatedPlayer;
  }

  function triggerFrontendMovementBarrier(movedDistance: number, playerAfterMove: PlayerRuntimeState) {
    const requiredDistance = Math.max(0, statNumber(state?.player_stats?.movement_barrier_distance, 0));
    const chancePercent = clamp(statNumber(state?.player_stats?.movement_barrier_chance_percent, 0), 0, 100);
    if (requiredDistance <= 0 || chancePercent <= 0) return;
    movementBarrierDistanceAccumulator.current += movedDistance;
    let nextBuffs = activePlayerBuffsRef.current;
    let changed = false;
    while (movementBarrierDistanceAccumulator.current + 1e-9 >= requiredDistance) {
      movementBarrierDistanceAccumulator.current -= requiredDistance;
      if (nextBuffs.some((buff) => buff.buffType === "barrier" && buff.remaining > 0)) continue;
      const roll = stablePercent(`player:movement_barrier:${Math.round(elapsedRef.current * 1000)}:${movementBarrierDistanceAccumulator.current.toFixed(3)}`);
      if (roll >= chancePercent) continue;
      const amountAddPercent = Math.max(0, statNumber(state?.player_stats?.barrier_absorb_amount_add_percent, 0));
      const absorbAmount = (playerAfterMove.maxHp + playerAfterMove.maxEnergyShield) * 0.2 * (1 + amountAddPercent / 100);
      if (absorbAmount <= 0) continue;
      nextBuffs = [
        ...nextBuffs,
        {
          id: nextPlayerBuffId.current++,
          buffType: "barrier",
          skillId: "equipment_movement_barrier",
          remaining: 10,
          duration: 10,
          remainingAmount: absorbAmount,
          absorbPercent: 50,
          excludeDamageOverTime: true,
          vfxKey: "equipment_movement_barrier"
        }
      ];
      changed = true;
    }
    if (changed) setRuntimePlayerBuffs(nextBuffs);
  }

  function applyFrontendPlayerSelfDamage(playerBeforeDamage: PlayerRuntimeState, dt: number): PlayerRuntimeState {
    const damagePer100ms = Math.max(0, statNumber(state?.player_stats?.self_true_damage_per_100ms, 0));
    if (damagePer100ms <= 0 || dt <= 0) return playerBeforeDamage;
    return applyFrontendDamageToPlayer(playerBeforeDamage, damagePer100ms * dt * 10);
  }

  function resetEnergyShieldRechargeDelay(nowMs = elapsedRef.current * 1000) {
    energyShieldRechargeReadyMs.current = nowMs + frontendEnergyShieldRechargeDelayMs(state?.player_stats);
  }

  function applyFrontendEnergyShieldRecharge(playerBeforeRecharge: PlayerRuntimeState, dt: number): PlayerRuntimeState {
    if (dt <= 0 || playerBeforeRecharge.maxEnergyShield <= 0) return playerBeforeRecharge;
    if (playerBeforeRecharge.currentEnergyShield >= playerBeforeRecharge.maxEnergyShield) return playerBeforeRecharge;
    if (elapsedRef.current * 1000 + 1e-6 < energyShieldRechargeReadyMs.current) return playerBeforeRecharge;
    const rechargePercentPerSecond = frontendEnergyShieldRechargePercentPerSecond(state?.player_stats);
    if (rechargePercentPerSecond <= 0) return playerBeforeRecharge;
    return {
      ...playerBeforeRecharge,
      currentEnergyShield: clamp(
        playerBeforeRecharge.currentEnergyShield + playerBeforeRecharge.maxEnergyShield * rechargePercentPerSecond / 100 * dt,
        0,
        playerBeforeRecharge.maxEnergyShield
      )
    };
  }

  function resolveFrontendPlayerBlock(enemy: Enemy, hitKind: MonsterHitKind) {
    const chanceStat = hitKind === "spell" ? "spell_block_chance_percent" : "attack_block_chance_percent";
    const blockChance = clamp(statNumber(state?.player_stats?.[chanceStat], 0), 0, 75);
    if (blockChance <= 0) return false;
    playerBlockHitCounter.current += 1;
    return stablePercent(`player:block:${playerBlockHitCounter.current}:${enemy.id}:${hitKind}`) < blockChance;
  }

  function recoverFrontendPlayerOnBlock(playerBeforeHit: PlayerRuntimeState, nowMs: number): PlayerRuntimeState {
    let nextPlayer = playerBeforeHit;
    const lifePercent = Math.max(0, statNumber(state?.player_stats?.block_life_recovery_percent, 0));
    const lifeInterval = Math.max(0, statNumber(state?.player_stats?.block_life_recovery_interval_ms, 0));
    if (lifePercent > 0 && nowMs >= blockLifeRecoveryReadyMs.current && nextPlayer.hp < nextPlayer.maxHp) {
      nextPlayer = { ...nextPlayer, hp: clamp(nextPlayer.hp + nextPlayer.maxHp * lifePercent / 100, 0, nextPlayer.maxHp) };
      blockLifeRecoveryReadyMs.current = nowMs + lifeInterval;
    }
    const shieldPercent = Math.max(0, statNumber(state?.player_stats?.block_shield_recovery_percent, 0));
    const shieldInterval = Math.max(0, statNumber(state?.player_stats?.block_shield_recovery_interval_ms, 0));
    if (shieldPercent > 0 && nowMs >= blockShieldRecoveryReadyMs.current && nextPlayer.currentEnergyShield < nextPlayer.maxEnergyShield) {
      nextPlayer = {
        ...nextPlayer,
        currentEnergyShield: clamp(nextPlayer.currentEnergyShield + nextPlayer.maxEnergyShield * shieldPercent / 100, 0, nextPlayer.maxEnergyShield)
      };
      blockShieldRecoveryReadyMs.current = nowMs + shieldInterval;
    }
    return nextPlayer;
  }

  function playerAbsorbBuffType(buffType: string) {
    return buffType === "guard" || buffType === "barrier";
  }

  function recoverFrontendPlayerOnHit(playerBeforeRecovery: PlayerRuntimeState): PlayerRuntimeState {
    const nowMs = Math.round(elapsedRef.current * 1000);
    let nextPlayer = playerBeforeRecovery;
    const lifePercent = Math.min(30, Math.max(0, statNumber(state?.player_stats?.life_return_percent, 0)));
    if (lifePercent > 0 && nowMs >= lifeReturnReadyMs.current && nextPlayer.hp < nextPlayer.maxHp) {
      const missingLife = Math.max(0, nextPlayer.maxHp - nextPlayer.hp);
      nextPlayer = { ...nextPlayer, hp: clamp(nextPlayer.hp + missingLife * lifePercent / 100, 0, nextPlayer.maxHp) };
      lifeReturnReadyMs.current = nowMs + 500;
    }
    const shieldPercent = Math.min(30, Math.max(0, statNumber(state?.player_stats?.shield_return_percent, 0)));
    if (shieldPercent > 0 && nowMs >= shieldReturnReadyMs.current && nextPlayer.currentEnergyShield < nextPlayer.maxEnergyShield) {
      const missingShield = Math.max(0, nextPlayer.maxEnergyShield - nextPlayer.currentEnergyShield);
      nextPlayer = { ...nextPlayer, currentEnergyShield: clamp(nextPlayer.currentEnergyShield + missingShield * shieldPercent / 100, 0, nextPlayer.maxEnergyShield) };
      shieldReturnReadyMs.current = nowMs + 500;
    }
    return nextPlayer;
  }

  function applyFrontendDamageToPlayer(playerBeforeDamage: PlayerRuntimeState, damage: number): PlayerRuntimeState {
    let incoming = Math.max(0, damage);
    const manaSoakPercent = clamp(statNumber(state?.player_stats?.damage_taken_from_mana_before_life_percent, 0), 0, 100);
    let currentMana = playerBeforeDamage.currentMana;
    if (manaSoakPercent > 0 && currentMana > 0) {
      const manaPortion = incoming * manaSoakPercent / 100;
      const spentMana = Math.min(currentMana, manaPortion);
      currentMana -= spentMana;
      incoming -= spentMana;
    }
    const shieldDamage = Math.min(Math.max(0, playerBeforeDamage.currentEnergyShield), incoming);
    const lifeDamage = Math.max(0, incoming - shieldDamage);
    return {
      ...playerBeforeDamage,
      currentMana: clamp(currentMana, 0, playerBeforeDamage.maxMana),
      currentEnergyShield: clamp(playerBeforeDamage.currentEnergyShield - shieldDamage, 0, playerBeforeDamage.maxEnergyShield),
      hp: clamp(playerBeforeDamage.hp - lifeDamage, 0, playerBeforeDamage.maxHp)
    };
  }

  function advanceEnemyBuffs(dt: number) {
    const current = enemiesStateRef.current;
    let changed = false;
    let killed = 0;
    const killedEnemies: Enemy[] = [];
    const dotTexts: FloatingText[] = [];
    const next = current.map((enemy) => {
      if (!enemy.activeBuffs?.length) return enemy;
      if (enemy.hp <= 0) {
        changed = true;
        return { ...enemy, activeBuffs: [] };
      }
      let damageOverTime = 0;
      let floatingTextDamage = 0;
      let floatingTextDamageType = "fire";
      const activeBuffs = enemy.activeBuffs
        .map((buff) => {
          const elapsed = Math.min(Math.max(0, buff.remaining), dt);
          const dps = Math.max(0, buff.baseDamagePerSecond ?? 0);
          let nextFloatingTextIn = buff.nextFloatingTextIn ?? DOT_FLOATING_TEXT_INTERVAL_SECONDS;
          if (dps > 0 && elapsed > 0) {
            damageOverTime += dps * elapsed;
            nextFloatingTextIn -= elapsed;
            if (nextFloatingTextIn <= 0) {
              floatingTextDamage += dps * DOT_FLOATING_TEXT_INTERVAL_SECONDS;
              floatingTextDamageType = buff.damageType ?? floatingTextDamageType;
              while (nextFloatingTextIn <= 0) nextFloatingTextIn += DOT_FLOATING_TEXT_INTERVAL_SECONDS;
            }
          }
          return { ...buff, remaining: buff.remaining - dt, nextFloatingTextIn };
        })
        .filter((buff) => buff.remaining > 0);
      const hp = damageOverTime > 0 ? enemy.hp - damageOverTime : enemy.hp;
      if (hp <= 0 && damageOverTime > 0 && floatingTextDamage <= 0) {
        floatingTextDamage = Math.max(1, Math.min(enemy.hp, damageOverTime));
      }
      if (floatingTextDamage > 0) {
        dotTexts.push({
          id: nextTextId.current++,
          x: enemy.x,
          y: enemy.y - 34,
          text: damageNumberText(floatingTextDamage),
          damageType: floatingTextDamageType,
          ttl: 0.7,
          duration: 0.7
        });
      }
      if (hp <= 0) {
        killed += 1;
        killedEnemies.push(enemy);
      }
      if (
        damageOverTime <= 0
        && activeBuffs.length === enemy.activeBuffs.length
        && activeBuffs.every((buff, index) => buff === enemy.activeBuffs?.[index])
      ) return enemy;
      changed = true;
      return {
        ...enemy,
        hp,
        activeBuffs: hp <= 0 ? [] : activeBuffs,
        lastDamagedAt: damageOverTime > 0 ? elapsedRef.current : enemy.lastDamagedAt
      };
    }).filter((enemy) => shouldRetainEnemyForGameplayOrDamageFlash(enemy, elapsedRef.current));
    if (!changed) return;
    enemiesStateRef.current = next;
    setEnemies(next);
    if (dotTexts.length > 0) {
      setTexts((items) => capRuntimeVisualBudget([...items, ...dotTexts], MAX_RUNTIME_FLOATING_TEXT));
    }
    if (killed > 0) {
      setKills((value) => value + killed);
      void spawnFrontendDrops(killedEnemies);
      setCombatLogs((logs) => [`点燃击杀 ${killed} 个怪物。`, ...logs].slice(0, 8));
    }
  }

  useEffect(() => {
    if (monsterTestMode) {
      applyServerState(createMonsterTestAppState(), { persist: false });
      setNotice("怪物测试场景载入中。");
    } else if (skillEditorMode) {
      const { save, errorText } = loadFrontendAutosaveResult<FrontendSavePayload>();
      const savedState = appStateFromFrontendSave(save);
      applyServerState(savedState ?? createFrontendInitialAppState(), { persist: false });
      setNotice(errorText || (savedState ? "已读取前端本地存档。按 C 打开背包。" : "准备就绪。按 C 打开背包。"));
    } else {
      applyServerState(createFrontendInitialAppState(), { persist: false });
      setNotice("点击开始游戏选择存档。");
    }
  }, []);

  useEffect(() => {
    if (!RELEASE_DEBUG_TOOLS_ENABLED || !bagOpen || !gmOpen) return;
    const optionsPromise = gmOptions ? Promise.resolve(gmOptions) : requestGmOptions().then((options) => {
      setGmOptions(options);
      return options;
    });
    optionsPromise
      .then((options) => {
        if (gmAffixes) return null;
        const firstSource = options.equipment_sources[0]?.id;
        return firstSource ? requestGmEquipmentAffixes(firstSource, 86) : null;
      })
      .then((affixes) => {
        if (affixes) setGmAffixes(affixes);
      })
      .catch((error: Error) => setNotice(error.message));
  }, [bagOpen, gmOpen, gmOptions, gmAffixes]);

  useEffect(() => {
    if (!state) return;
    const equippedIds = new Set(equipmentSlots.filter(Boolean) as string[]);
    const stashIds = stashItemIds(state.stash_pages);
    setInventorySlots((current) => reconcileInventorySlots(current, state, floatingGemRef.current?.gem.instance_id ?? null, new Set([...equippedIds, ...stashIds])));
  }, [state, floatingGem?.gem.instance_id, equipmentSlots]);

  useEffect(() => {
    if (!state?.equipment_slots) return;
    setEquipmentSlots(sanitizeEquipmentSlotsForState(state).equipment_slots ?? Array(EQUIPMENT_SLOT_COUNT).fill(null));
  }, [state?.equipment_slots]);

  useEffect(() => {
    if (!selectedMapId) {
      setBattleMap(null);
      return;
    }

    const authoredTemplate = authoredMapTemplateById(selectedMapId);
    if (authoredTemplate) {
      const map = createEditorRuntimeBattleMap(authoredTemplate.document as unknown as MapEditorFileDocument, { templateId: authoredTemplate.id });
      setBattleMap(map);
      setAuthoredSpawnPlanActive(false);
      setSpawnPlanWarnings([]);
      setRuntimePlayer((current) => ({ ...current, x: map.playerSpawn.x, y: map.playerSpawn.y }));
      setEnemies([]);
      setNotice(`${map.displayName} 已载入，请进入战斗。`);
      return;
    }

    const asset = bakedMapAssetById(selectedMapId);
    if (!asset) {
      setBattleMap(null);
      setNotice("地图资源配置不存在。");
      return;
    }

    let cancelled = false;
    setNotice("正在加载地图资源。");
    loadBakedBattleMap(asset)
      .then((map) => {
        if (cancelled) return;
        setBattleMap(map);
        setAuthoredSpawnPlanActive(false);
        setAuthoredAggroSources([]);
        triggeredEncounterSourceIds.current = new Set();
        setSpawnPlanWarnings([]);
        setRuntimePlayer((current) => ({ ...current, x: map.playerSpawn.x, y: map.playerSpawn.y }));
        if (skillEditorMode) {
          nextEnemyId.current = SKILL_TEST_DUMMY_OFFSETS.length + 1;
          const nextPalette = createEncounterMonsterPalette();
          encounterMonsterPalette.current = nextPalette;
          setEnemies(createSkillTestDummies(1, map.playerSpawn.x, map.playerSpawn.y, nextPalette));
        } else {
          setEnemies([]);
        }
        setNotice(skillEditorMode ? `${map.displayName} 已载入，技能测试地图已就绪。` : `${map.displayName} 已载入，请进入战斗。`);
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setBattleMap(null);
        setPlaying(false);
        setNotice(error.message || "地图资源加载失败。");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedMapId, skillEditorMode]);

  useEffect(() => {
    const restAreaMapActive = Boolean(!monsterTestMode && !skillEditorMode && !playing && entryStep === "rest" && battleMap);
    if (!restAreaMapActive || !battleMap) {
      if (playing || entryStep !== "rest") restAreaMapEntryKey.current = null;
      return;
    }
    if (selectedMapId !== REST_AREA_MAP_TEMPLATE_ID) {
      setSelectedMapId(REST_AREA_MAP_TEMPLATE_ID);
      return;
    }
    if (battleMap.id !== REST_AREA_MAP_TEMPLATE_ID) {
      const template = authoredMapTemplateById(REST_AREA_MAP_TEMPLATE_ID);
      if (template) {
        setBattleMap(createEditorRuntimeBattleMap(template.document as unknown as MapEditorFileDocument, { templateId: REST_AREA_MAP_TEMPLATE_ID }));
      }
      return;
    }
    const entryKey = `${battleMap.id}:${isEditorRuntimeBattleMap(battleMap) ? battleMap.mapInstance?.instanceSeed ?? "rest" : "rest"}`;
    if (restAreaMapEntryKey.current === entryKey) return;
    restAreaMapEntryKey.current = entryKey;
    resetBattleRuntimeForChallenge(battleMap.playerSpawn, battleMap);
    setEnemies([]);
    enemiesStateRef.current = [];
    setAuthoredSpawnPlanActive(false);
    setAuthoredAggroSources([]);
    setSpawnPlanWarnings([]);
    setProceduralSpawnDebug(null);
  }, [battleMap, entryStep, monsterTestMode, playing, skillEditorMode]);

  useEffect(() => {
    if (!monsterTestMode || !battleMap || !state) return;
    const spawn = battleMap.playerSpawn;
    resetBattleRuntimeForChallenge(spawn, battleMap);
    setRuntimePlayer((current) => ({
      ...current,
      x: spawn.x,
      y: spawn.y,
      hp: MONSTER_TEST_PLAYER_LIFE,
      maxHp: MONSTER_TEST_PLAYER_LIFE,
      currentMana: 0,
      maxMana: 0,
      currentEnergyShield: 0,
      maxEnergyShield: 0
    }));
    setAuthoredSpawnPlanActive(true);
    setAuthoredAggroSources([]);
    setSpawnPlanWarnings([]);
    setProceduralSpawnDebug(null);
    setGameFailureOpen(false);
    setPlaying(true);
    setCombatLogs(["怪物测试场景已启动。选择怪物后点击生成。"]);
    setNotice("怪物测试场景运行中。");
  }, [monsterTestMode, battleMap, state]);

  useEffect(() => {
    const maxLife = monsterTestMode ? MONSTER_TEST_PLAYER_LIFE : statNumber(state?.player_stats?.max_life, 0);
    if (!maxLife) return;
    setRuntimePlayer((current) => ({ ...current, hp: Math.max(current.hp, maxLife), maxHp: maxLife }));
  }, [monsterTestMode, state?.player_stats?.max_life?.value]);

  useEffect(() => {
    const maxMana = statNumber(state?.player_stats?.max_mana, 0);
    const currentMana = statNumber(state?.player_stats?.current_mana, maxMana);
    setRuntimePlayer((current) => ({
      ...current,
      currentMana: maxMana > current.maxMana && current.currentMana >= current.maxMana
        ? Math.max(current.currentMana, currentMana, maxMana)
        : Math.max(current.currentMana, currentMana),
      maxMana
    }));
  }, [state?.player_stats?.current_mana?.value, state?.player_stats?.max_mana?.value]);

  useEffect(() => {
    const maxEnergyShield = statNumber(state?.player_stats?.max_energy_shield, 0);
    const currentEnergyShield = statNumber(state?.player_stats?.current_energy_shield, maxEnergyShield);
    setRuntimePlayer((current) => ({
      ...current,
      currentEnergyShield: maxEnergyShield > current.maxEnergyShield && current.currentEnergyShield >= current.maxEnergyShield
        ? Math.max(current.currentEnergyShield, currentEnergyShield, maxEnergyShield)
        : Math.max(current.currentEnergyShield, currentEnergyShield),
      maxEnergyShield
    }));
  }, [state?.player_stats?.current_energy_shield?.value, state?.player_stats?.max_energy_shield?.value]);

  useEffect(() => {
    floatingGemRef.current = floatingGem;
  }, [floatingGem]);

  useEffect(() => {
    function onMouseMove(event: globalThis.MouseEvent) {
      const current = floatingGemRef.current;
      if (!current) return;
      const point = clientToGameViewportPoint(event.clientX, event.clientY);
      setFloatingGem({ ...current, x: point.x + current.offsetX, y: point.y + current.offsetY });
    }

    async function onMouseUp(event: globalThis.MouseEvent) {
      const current = floatingGemRef.current;
      if (!current) return;
      if (event.button !== 0) return;
      event.preventDefault();
      if (dropInProgressRef.current) return;
      dropInProgressRef.current = true;
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const interfaceTarget = resolveDropTarget(element);
      const target = interfaceTarget.kind === "invalid"
        ? resolveMapDropTarget(event.clientX, event.clientY, element)
        : interfaceTarget;
      clearDragHoverState();
      clearFloatingGem();
      try {
        const result = await placeFloatingItem(current, target, event);
        if (result.type === "swap") {
          const point = clientToGameViewportPoint(event.clientX, event.clientY);
          setFloatingItem(result.nextFloatingItem, result.origin, point.x, point.y, current.offsetX, current.offsetY);
        }
      } finally {
        window.setTimeout(clearDragHoverState, 0);
        window.setTimeout(clearDragHoverState, 50);
        dropInProgressRef.current = false;
      }
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [state, inventorySlots, equipmentSlots]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const key = event.key.toLowerCase();
      const playableBattleActive = Boolean(playing && battleMap && !skillEditorMode && !monsterTestMode);
      if (key === "escape") {
        event.preventDefault();
        keys.current.clear();
        if (floatingGemRef.current) {
          clearFloatingGem();
          clearDragHoverState();
          return;
        }
        if (tooltip || hoveredGemId) {
          setTooltip(null);
          setHoveredGemId(null);
        }
        if (gameFailureOpen) {
          setGameFailureOpen(false);
          return;
        }
        if (bagOpen) {
          closeInventorySurface();
          return;
        }
        if (battlePauseOpen) {
          if (battlePauseView === "settings") {
            setBattlePauseView("menu");
            return;
          }
          continueBattleFromPause();
          return;
        }
        if (restAreaPanel) {
          closeRestAreaPanel();
          return;
        }
        if (!playing && entryStep === "rest" && !skillEditorMode && !monsterTestMode) {
          setBattlePauseView("menu");
          setBattlePauseOpen(true);
          setNotice("已打开菜单。");
          return;
        }
        if (playableBattleActive) {
          setBattlePauseView("menu");
          setBattlePauseOpen(true);
          setNotice("游戏已暂停。");
          return;
        }
        if (!playing && entryStep === "save" && !skillEditorMode && !monsterTestMode) {
          setEntryStep("title");
          setNotice("已返回主菜单。");
        }
        return;
      }
      if (key === "m" && playableBattleActive && !isPlayableBattleTypingTarget(event.target)) {
        event.preventDefault();
        setPlayableMinimapMode((current) => current === "expanded" ? "compact" : "expanded");
        return;
      }
      if (key === "f" && !event.repeat) {
        event.preventDefault();
        handleKeyboardInteract();
        return;
      }
      if (key === "c") {
        if (battlePauseOpen) return;
        event.preventDefault();
        setBagOpen((current) => !current);
        setBattlePauseOpen(false);
        setRestAreaPanel(null);
        setTooltip(null);
        setHoveredGemId(null);
        return;
      }
      if (["w", "a", "s", "d"].includes(key)) keys.current.add(key);
    }
    function onKeyUp(event: KeyboardEvent) {
      keys.current.delete(event.key.toLowerCase());
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [bagOpen, battleMap, battlePauseOpen, battlePauseView, entryStep, gameFailureOpen, hoveredGemId, monsterTestMode, playing, restAreaPanel, skillEditorMode, state?.drops, tooltip]);

  useEffect(() => {
    playerStateRef.current = player;
  }, [player]);

  useEffect(() => {
    if (monsterTestMode || skillEditorMode || playing || entryStep !== "rest") return;
    let frame = 0;
    let lastNow: number | null = null;
    function tick(now: number) {
      if (lastNow === null) lastNow = now;
      const dt = Math.min(0.05, (now - lastNow) / 1000);
      lastNow = now;
      setRuntimePlayer((current) => {
        const manualVector = playerInputVector(keys.current);
        const target = restAreaInteractionTarget ? restAreaInteractablePosition(restAreaInteractionTarget, battleMap) : null;
        const targetVector = target ? { x: target.x - current.x, y: target.y - current.y } : null;
        const targetDistance = targetVector ? Math.hypot(targetVector.x, targetVector.y) : 0;
        if ((manualVector.x !== 0 || manualVector.y !== 0) && restAreaInteractionTarget) {
          setRestAreaInteractionTarget(null);
          return current;
        }
        if (target && targetVector && targetDistance <= REST_AREA_INTERACTION_RADIUS) {
          setRestAreaInteractionTarget(null);
          setRestAreaPanel(restAreaInteractionTarget);
          if (restAreaInteractionTarget === "stash") setBagOpen(true);
          setNotice(restAreaInteractionTarget === "stage" ? "王阳正在整理关卡情报。" : "仓库已打开。");
          return current;
        }
        const moveVector = target && targetVector && targetDistance > REST_AREA_INTERACTION_RADIUS
          ? { x: targetVector.x / targetDistance, y: targetVector.y / targetDistance }
          : manualVector;
        syncPlayerVisual(moveVector);
        const length = Math.hypot(moveVector.x, moveVector.y) || 1;
        const playerSpeed = statNumber(state?.player_stats?.move_speed, PLAYER_SPEED) * playerMovementSpeedMultiplier();
        const mapWidth = battleMap?.meta.world_width ?? MAP_WIDTH;
        const mapHeight = battleMap?.meta.world_height ?? MAP_HEIGHT;
        const nextPosition = resolveWalkableMove(battleMap, current, {
          x: clamp(current.x + moveVector.x / length * playerSpeed * dt, 40, mapWidth - 40),
          y: clamp(current.y + moveVector.y / length * playerSpeed * dt, 40, mapHeight - 40)
        });
        return {
          ...current,
          x: nextPosition.x,
          y: nextPosition.y
        };
      });
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [battleMap, entryStep, monsterTestMode, playing, restAreaInteractionTarget, skillEditorMode, state?.player_stats?.move_speed?.value]);

  useEffect(() => {
    enemiesStateRef.current = enemies;
  }, [enemies]);

  useEffect(() => {
    boltsStateRef.current = bolts;
  }, [bolts]);

  useEffect(() => {
    if (!battleMap || !runtimeDebugMonsterBoundaryTestEnabled()) return;
    let cancelled = false;
    setRuntimeBoundaryScan({ status: "running", tested: 0, passed: 0, failed: 0, failures: [] });
    window.setTimeout(() => {
      if (cancelled) return;
      const summary = runRuntimeBoundaryMonsterAiScan(battleMap);
      if (!cancelled) setRuntimeBoundaryScan(summary);
    }, 50);
    return () => {
      cancelled = true;
    };
  }, [battleMap]);

  const activeSkills = monsterTestMode ? [] : state?.skill_preview ?? [];

  useEffect(() => {
    if (!state?.skill_editor?.selected_id || selectedSkillEditorId) return;
    setSelectedSkillEditorId(state.skill_editor.selected_id);
  }, [state?.skill_editor?.selected_id, selectedSkillEditorId]);

  useEffect(() => {
    if (!playing || battlePauseOpen) {
      lastFrame.current = null;
      return;
    }

    let frame = 0;
    function tick(now: number) {
      if (lastFrame.current === null) lastFrame.current = now;
      const frameMs = now - lastFrame.current;
      if (frameMs < RUNTIME_MIN_FRAME_MS) {
        frame = requestAnimationFrame(tick);
        return;
      }
      const dt = Math.min(0.05, frameMs / 1000);
      lastFrame.current = now;
      const logicStart = performance.now();
      let consumedEvents = 0;
      try {
        consumedEvents = stepGame(dt);
        runtimeLastStepError.current = null;
      } catch (error) {
        console.error("[runtime] stepGame failed", error);
        const message = error instanceof Error ? error.message : String(error);
        if (runtimeLastStepError.current !== message) {
          runtimeLastStepError.current = message;
          setCombatLogs((logs) => [`运行时错误：${message}`, ...logs].slice(0, 8));
        }
      }
      const logicMs = performance.now() - logicStart;
      recordRuntimePerf(frameMs, logicMs, consumedEvents, now);
      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, battlePauseOpen, activeSkills, state?.player_stats?.move_speed?.value, battleMap, authoredAggroSources, authoredSpawnPlanActive, skillEditorMode]);

  function stepGame(dt: number) {
    elapsedRef.current += dt;
    advanceWarIntent(dt * 1000);
    if (elapsedRef.current - elapsedLastUiSync.current >= 0.1) {
      elapsedLastUiSync.current = elapsedRef.current;
      setElapsed(elapsedRef.current);
    }
    const playerSpeed = statNumber(state?.player_stats?.move_speed, PLAYER_SPEED) * playerMovementSpeedMultiplier();
    const currentPlayer = playerStateRef.current;
    const pickupTarget = pendingDropPickup.current;
    const portalTarget = pendingBossPortalUse.current;
    const interactionTarget = pickupTarget
      ? { kind: "drop" as const, x: pickupTarget.x, y: pickupTarget.y }
      : portalTarget
        ? { kind: "portal" as const, x: portalTarget.x, y: portalTarget.y }
        : null;
    const manualMoveVector = playerInputVector(keys.current);
    const interactionVector = interactionTarget
      ? { x: interactionTarget.x - currentPlayer.x, y: interactionTarget.y - currentPlayer.y }
      : null;
    const interactionDistance = interactionVector ? Math.hypot(interactionVector.x, interactionVector.y) : 0;
    const playerMoveVector = interactionTarget && interactionDistance > CLICK_INTERACTION_COMPLETE_RADIUS
      ? { x: interactionVector!.x / interactionDistance, y: interactionVector!.y / interactionDistance }
      : manualMoveVector;
    if ((manualMoveVector.x !== 0 || manualMoveVector.y !== 0) && interactionTarget) {
      pendingDropPickup.current = null;
      pendingBossPortalUse.current = null;
    } else if (pickupTarget && interactionTarget?.kind === "drop" && interactionDistance <= CLICK_INTERACTION_COMPLETE_RADIUS && !pickupRequestInFlight.current) {
      pendingDropPickup.current = null;
      void finishDropPickup(pickupTarget.dropId);
    } else if (portalTarget && interactionTarget?.kind === "portal" && interactionDistance <= CLICK_INTERACTION_COMPLETE_RADIUS) {
      pendingBossPortalUse.current = null;
      openBossPortalConfirm(portalTarget.portalId);
    }
    syncPlayerVisual(playerMoveVector);
    const dx = playerMoveVector.x;
    const dy = playerMoveVector.y;
    const movementLength = Math.hypot(dx, dy);
    const movementDenominator = movementLength || 1;
    const mapWidth = battleMap?.meta.world_width ?? MAP_WIDTH;
    const mapHeight = battleMap?.meta.world_height ?? MAP_HEIGHT;
    const regeneratedPlayer = applyFrontendEnergyShieldRecharge(regeneratePlayerResources(currentPlayer, state?.player_stats, dt), dt);
    const nextPlayerPosition = resolveWalkableMove(battleMap, currentPlayer, {
      x: clamp(regeneratedPlayer.x + (dx / movementDenominator) * playerSpeed * dt, 40, mapWidth - 40),
      y: clamp(regeneratedPlayer.y + (dy / movementDenominator) * playerSpeed * dt, 40, mapHeight - 40)
    });
    let nextPlayer = {
      ...regeneratedPlayer,
      x: nextPlayerPosition.x,
      y: nextPlayerPosition.y
    };
    nextPlayer = applyFrontendMovementEquipmentEffects(currentPlayer, nextPlayer, dt);
    nextPlayer = applyFrontendPlayerSelfDamage(nextPlayer, dt);
    setRuntimePlayer(() => nextPlayer);
    revealPlayableMinimapAroundPlayer(battleMap, nextPlayer);

    let currentVisualEnemies = enemiesStateRef.current;
    if (!skillEditorMode) {
      spawnTimer.current -= dt;
      let spawnEnemy = false;
      if (!authoredSpawnPlanActive && spawnTimer.current <= 0 && !runtimeDebugMonsterCornerTestEnabled()) {
        spawnTimer.current = Math.max(0.45, 1.2 - elapsedRef.current / 80);
        spawnEnemy = true;
      }

      const nowMs = elapsedRef.current * 1000;
      const attackLockedEnemyIds = currentEnemyAttackLockedIds(nowMs, enemiesStateRef.current, nextPlayer, battleMap);
      const movingEnemies = updateRuntimeEnemies(enemiesStateRef.current, nextPlayer, battleMap, dt, elapsedRef.current, authoredSpawnPlanActive, authoredAggroSources, triggeredEncounterSourceIds.current, attackLockedEnemyIds);
      const spawnedEnemies = spawnEnemy ? [...movingEnemies, createEnemy(nextEnemyId.current++, nextPlayer.x, nextPlayer.y, battleMap, "normal", encounterMonsterPalette.current)] : movingEnemies;
      const skilledEnemies = updateMonsterSkillRuntime(spawnedEnemies, nowMs);
      currentVisualEnemies = applyRuntimeMonsterAttacks(skilledEnemies, nowMs);
      enemiesStateRef.current = currentVisualEnemies;
      setEnemies(currentVisualEnemies);
      updateBossSkillRuntime(currentVisualEnemies, nowMs);
      updateSupremeBossSkillRuntime(currentVisualEnemies, nowMs);
    }
    syncEnemyVisuals(selectRenderableEnemies(currentVisualEnemies, nextPlayer, elapsedRef.current), nextPlayer, elapsedRef.current * 1000);

    const consumedContinuousAttack = processFrontendContinuousAttack(dt, enemiesStateRef.current);

    if (!consumedContinuousAttack && activeSkills.length > 0) {
      const activeIds = new Set(activeSkills.map((skill) => skill.active_gem_instance_id));
      for (const timerId of Object.keys(attackTimers.current)) {
        if (!activeIds.has(timerId)) delete attackTimers.current[timerId];
      }
      for (const timerId of Object.keys(thundercloudChannels.current)) {
        if (!activeIds.has(timerId)) delete thundercloudChannels.current[timerId];
      }
      for (const timerId of Object.keys(damageZoneChannels.current)) {
        if (!activeIds.has(timerId)) delete damageZoneChannels.current[timerId];
      }
      for (const skill of activeSkills) {
        if (isThundercloudSkill(skill)) {
          processThundercloudChannel(skill, dt, enemiesStateRef.current);
          continue;
        }
        if (isFrontendChannelDamageZoneSkill(skill)) {
          processChannelDamageZoneSkill(skill, dt, enemiesStateRef.current);
          continue;
        }
        const timerId = skill.active_gem_instance_id;
        attackTimers.current[timerId] = (attackTimers.current[timerId] ?? 0) - dt;
        if (attackTimers.current[timerId] <= 0) {
          const released = hitEnemies(enemiesStateRef.current, skill);
          attackTimers.current[timerId] = released ? skillReleaseIntervalSeconds(skill) : 0.05;
        }
      }
    }

    const projectileImpactEvents = processFrontendProjectileImpacts(dt);
    const bossProjectileImpactEvents = processBossProjectilePlayerImpacts(dt);
    const bossDamageZoneEvents = processPendingBossDamageZoneHits(dt);
    const activeDamageZoneEvents = updateActiveDamageZones(dt);
    setTexts((current) => advanceRuntimeVisuals(current, dt, MAX_RUNTIME_FLOATING_TEXT));
    advancePlayerBuffs(dt);
    advanceEnemyBuffs(dt);
    setBolts((current) => advanceRuntimeVisuals(current, dt, MAX_RUNTIME_PROJECTILE_VISUALS));
    setAreaNovas((current) => advanceRuntimeVisuals(current, dt, MAX_RUNTIME_AREA_VFX));
    setMeleeArcs((current) => advanceRuntimeVisuals(current, dt, MAX_RUNTIME_AREA_VFX));
    setChainSegments((current) => advanceRuntimeVisuals(current, dt, MAX_RUNTIME_AREA_VFX));
    setDamageZones((current) => advanceRuntimeVisuals(current, dt, MAX_RUNTIME_AREA_VFX));
    setHitVfxs((current) => advanceRuntimeVisuals(current, dt, MAX_RUNTIME_HIT_VFX));
    return projectileImpactEvents + bossProjectileImpactEvents + bossDamageZoneEvents + activeDamageZoneEvents + consumeScheduledSkillEvents(dt);
  }

  function recordRuntimePerf(frameMs: number, logicMs: number, consumedEvents: number, now: number) {
    const previous = runtimePerf.current;
    const next = {
      frame_ms: frameMs,
      logic_ms: logicMs,
      active_projectiles: bolts.length,
      active_hit_vfx: hitVfxs.length,
      active_area_vfx: areaNovas.length + meleeArcs.length + chainSegments.length + damageZones.length,
      active_floating_text: texts.length,
      active_enemies: enemies.length,
      scheduled_events: scheduledSkillEvents.current.length,
      consumed_events_this_frame: consumedEvents,
      dropped_frame_count: previous.dropped_frame_count + (frameMs > RUNTIME_DROPPED_FRAME_MS || logicMs > RUNTIME_SLOW_LOGIC_MS ? 1 : 0)
    };
    runtimePerf.current = next;
    if (now - runtimePerfLastSync.current >= RUNTIME_PERF_SYNC_INTERVAL_MS) {
      runtimePerfLastSync.current = now;
      setRuntimePerfSummary(next);
    }
  }

function syncPlayerVisual(moveVector: { x: number; y: number }) {
    const projectedMoveVector = projectMovementVectorForAnimation(moveVector);
    const direction = resolveAnimationDirection(projectedMoveVector, playerVisual.current.direction);
    playerVisual.current = {
      direction,
      movementVector: projectedMoveVector
    };
  }

  function syncEnemyVisuals(currentEnemies: Enemy[], currentPlayer: { x: number; y: number }, nowMs: number) {
    const activeEnemyIds = new Set(currentEnemies.map((enemy) => enemy.id));
    for (const enemyId of enemyVisuals.current.keys()) {
      if (!activeEnemyIds.has(enemyId)) enemyVisuals.current.delete(enemyId);
    }

    for (const enemy of currentEnemies) {
      const previous = enemyVisuals.current.get(enemy.id);
      const worldMovementVector = previous ? { x: enemy.x - previous.lastX, y: enemy.y - previous.lastY } : { x: currentPlayer.x - enemy.x, y: currentPlayer.y - enemy.y };
      const chaseVector = { x: currentPlayer.x - enemy.x, y: currentPlayer.y - enemy.y };
      const movementVector = Math.hypot(worldMovementVector.x, worldMovementVector.y) > ENEMY_WALK_VISUAL_DEADZONE
        ? chaseVector
        : { x: 0, y: 0 };
      const direction = resolveAnimationDirection(chaseVector, previous?.direction ?? "down");
      enemyVisuals.current.set(enemy.id, {
        direction,
        movementVector,
        attackStartedAtMs: enemy.attackStartedAtMs,
        attackUntilMs: enemy.attackUntilMs,
        lastX: enemy.x,
        lastY: enemy.y
      });
    }
  }

  function applyRuntimeMonsterAttacks(currentEnemies: Enemy[], nowMs: number) {
    let nextPlayer = playerStateRef.current;
    let nextBuffs = activePlayerBuffsRef.current;
    const hits: Array<{
      hit: ReturnType<typeof resolveMonsterHitAgainstPlayer>;
      playerPosition: { x: number; y: number };
    }> = [];
    const nextEnemies = currentEnemies.map((enemy) => {
      if (enemy.hp <= 0) return enemy;
      if (enemy.boss) return enemy;
      if (enemy.activeMonsterSkillUntilMs !== undefined && nowMs < enemy.activeMonsterSkillUntilMs) return enemy;
      if (nextPlayer.hp <= 0 || !canEnemyStartRuntimeAttack(enemy, nextPlayer, nowMs, battleMap)) return enemy;
      const attackedEnemy = {
        ...enemy,
        attackStartedAtMs: nowMs,
        attackUntilMs: nowMs + ENEMY_ATTACK_VISUAL_DURATION_MS,
        nextAttackReadyAtMs: nowMs + monsterAttackCadenceMs(enemy),
        velocityX: 0,
        velocityY: 0
      };
      const hitKind = enemy.hitKind ?? "attack";
      const blocked = resolveFrontendPlayerBlock(enemy, hitKind);
      const playerBeforeHit = blocked ? recoverFrontendPlayerOnBlock(nextPlayer, nowMs) : nextPlayer;
      const hit = resolveMonsterHitAgainstPlayer(enemy, playerBeforeHit, state?.player_stats, blocked, nowMs);
      const guarded = applyGuardBuffsToMonsterHit(hit, playerBeforeHit, nextBuffs);
      nextBuffs = guarded.nextBuffs;
      if (guarded.hit.totalDamage <= 0) return attackedEnemy;
      resetEnergyShieldRechargeDelay(nowMs);
      hits.push({ hit: guarded.hit, playerPosition: { x: nextPlayer.x, y: nextPlayer.y } });
      nextPlayer = guarded.hit.nextPlayer;
      return attackedEnemy;
    });
    if (hits.length === 0) {
      if (nextBuffs !== activePlayerBuffsRef.current) setRuntimePlayerBuffs(nextBuffs);
      return nextEnemies;
    }

    setRuntimePlayerBuffs(nextBuffs);
    const defeated = !skillEditorMode && nextPlayer.hp <= 0;
    setRuntimePlayer(() => nextPlayer);
    if (defeated) {
      setPlaying(false);
      setBattlePauseOpen(false);
      setEntryStep("rest");
      setRestAreaPanel(null);
      setBagOpen(false);
      setGameFailureOpen(true);
      setNotice("游戏失败。玩家生命已归零。");
    }
    setTexts((items) => capRuntimeVisualBudget([
      ...items,
      ...hits.map(({ hit, playerPosition }) => ({
        id: nextTextId.current++,
        x: playerPosition.x,
        y: playerPosition.y - 42,
        text: `${hit.isCritical ? "暴击 " : ""}-${Math.max(1, Math.round(hit.totalDamage))}`,
        damageType: hit.damageType,
        ttl: 0.8,
        duration: 0.8
      }))
    ], MAX_RUNTIME_FLOATING_TEXT));
    setCombatLogs((logs) => [
      ...(defeated ? ["玩家生命归零，游戏失败。"] : []),
      ...hits.map(({ hit }) => `怪物${hit.isCritical ? "暴击" : "攻击"}造成 ${formatPreviewNumber(hit.totalDamage)} 点${damageTypeText(hit.damageType)}伤害${hit.blocked ? "（已格挡）" : ""}。`),
      ...logs
    ].slice(0, 8));
    return nextEnemies;
  }

  function updateMonsterSkillRuntime(currentEnemies: Enemy[], nowMs: number) {
    const liveEnemyIds = new Set(currentEnemies.filter((enemy) => enemy.hp > 0).map((enemy) => enemy.id));
    for (const enemyId of monsterSkillTimers.current.keys()) {
      if (!liveEnemyIds.has(enemyId)) monsterSkillTimers.current.delete(enemyId);
    }
    if (playerStateRef.current.hp <= 0) return currentEnemies;

    const nextEnemies = currentEnemies.map((enemy) => {
      if (enemy.monsterSkillBuffUntilMs !== undefined && nowMs >= enemy.monsterSkillBuffUntilMs) {
        return { ...enemy, monsterSkillBuffUntilMs: undefined, monsterSkillDamageMultiplierBonus: undefined };
      }
      if (enemy.monsterGuardUntilMs !== undefined && nowMs >= enemy.monsterGuardUntilMs) {
        return { ...enemy, monsterGuardUntilMs: undefined, monsterGuardDamageReductionPercent: undefined };
      }
      return enemy;
    });

    for (let index = 0; index < nextEnemies.length; index += 1) {
      const enemy = nextEnemies[index];
      if (enemy.hp <= 0) continue;
      if (!enemy.monsterId) continue;
      if (enemy.activeMonsterSkillUntilMs !== undefined && nowMs < enemy.activeMonsterSkillUntilMs) continue;
      const assignment = monsterSkillAssignmentFor(MONSTER_SKILL_CONFIG, enemy.monsterId);
      if (!assignment) continue;
      const timer = monsterSkillTimers.current.get(enemy.id) ?? createMonsterSkillTimer();
      monsterSkillTimers.current.set(enemy.id, timer);
      const aggroLocked = Boolean(enemy.aggroLocked || enemy.boss || enemy.nemesis);
      if (aggroLocked && timer.aggroStartedAtMs === undefined) timer.aggroStartedAtMs = nowMs;
      if (!aggroLocked) continue;
      const playerNow = playerStateRef.current;
      const candidate = nextMonsterSkillCandidate(
        MONSTER_SKILL_CONFIG,
        assignment,
        timer,
        nowMs,
        distance(enemy, playerNow),
        aggroLocked
      );
      if (!candidate) continue;
      nextEnemies[index] = releaseMonsterSkill(nextEnemies, index, candidate.skill, candidate.sequence, nowMs);
      markMonsterSkillReleased(timer, candidate.skill, nowMs);
    }

    return nextEnemies;
  }

  function releaseMonsterSkill(currentEnemies: Enemy[], index: number, skill: MonsterSkillDefinition | MonsterBossPatternSkill, sequence: number, nowMs: number) {
    const enemy = currentEnemies[index];
    const repeatCount = Math.max(1, Math.round(Number(skill.repeat_count ?? 1)));
    const repeatIntervalMs = Math.max(0, Number(skill.repeat_interval_ms ?? 0));
    const activeUntil = nowMs + Math.max(
      ENEMY_ATTACK_VISUAL_DURATION_MS,
      Number(skill.windup_ms ?? 0) + (repeatCount - 1) * repeatIntervalMs
    );
    let updatedEnemy: Enemy = {
      ...enemy,
      monsterSkillId: skill.id,
      monsterSkillForm: skill.chinese_form,
      monsterSkillRange: skill.range,
      activeMonsterSkillUntilMs: activeUntil,
      attackStartedAtMs: nowMs,
      attackUntilMs: activeUntil,
      nextAttackReadyAtMs: nowMs + Math.max(monsterAttackCadenceMs(enemy), Number(skill.cooldown_ms ?? 0)),
      velocityX: 0,
      velocityY: 0
    };

    if (skill.module === "monster_guard") {
      updatedEnemy = {
        ...updatedEnemy,
        monsterGuardDamageReductionPercent: Math.max(0, Number(skill.guard_damage_reduction_percent ?? 0)),
        monsterGuardUntilMs: nowMs + Math.max(1, Number(skill.guard_duration_ms ?? skill.duration_ms ?? 1000)),
        monsterSkillDamageMultiplierBonus: Math.max(1, Number(skill.buff_damage_multiplier ?? 1)),
        monsterSkillBuffUntilMs: nowMs + Math.max(1, Number(skill.buff_duration_ms ?? skill.guard_duration_ms ?? 1000))
      };
      releaseMonsterSkillMeleeZone(updatedEnemy, skill, sequence, nowMs);
      return updatedEnemy;
    }

    if (skill.module === "monster_support") {
      const radius = Math.max(1, Number(skill.buff_radius ?? skill.range.effect_range));
      const buffUntilMs = nowMs + Math.max(1, Number(skill.buff_duration_ms ?? 2000));
      const multiplier = Math.max(1, Number(skill.buff_damage_multiplier ?? 1));
      const healPercent = Math.max(0, Number(skill.heal_percent_max_life ?? 0));
      const healTexts: FloatingText[] = [];
      let supportedTargets = 0;
      let totalHealed = 0;
      for (let allyIndex = 0; allyIndex < currentEnemies.length; allyIndex += 1) {
        const ally = currentEnemies[allyIndex];
        if (ally.hp <= 0 || distance(ally, enemy) > radius) continue;
        supportedTargets += 1;
        const healAmount = healPercent > 0 ? Math.max(0, ally.maxHp * healPercent / 100) : 0;
        const nextHp = healAmount > 0 ? clamp(ally.hp + healAmount, 0, ally.maxHp) : ally.hp;
        const actualHeal = Math.max(0, nextHp - ally.hp);
        totalHealed += actualHeal;
        currentEnemies[allyIndex] = {
          ...ally,
          hp: nextHp,
          monsterSkillDamageMultiplierBonus: multiplier,
          monsterSkillBuffUntilMs: multiplier > 1 ? buffUntilMs : ally.monsterSkillBuffUntilMs
        };
        if (actualHeal > 0) {
          healTexts.push({
            id: nextTextId.current++,
            x: ally.x,
            y: ally.y - 34,
            text: `+${Math.max(1, Math.round(actualHeal))}`,
            damageType: "heal",
            ttl: 0.9,
            duration: 0.9
          });
        }
      }
      if (healPercent > 0) {
        setAreaNovas((items) => capRuntimeVisualBudget([...items, {
          id: nextAreaNovaId.current++,
          x: updatedEnemy.x,
          y: updatedEnemy.y,
          radius,
          ringWidth: Math.max(4, radius * 0.035),
          ttl: 0.7,
          duration: 0.7,
          damageType: "heal",
          vfxKey: "monster_heal_pulse",
          skillId: skill.id
        }], MAX_RUNTIME_AREA_VFX));
      }
      if (healTexts.length > 0) {
        setTexts((items) => capRuntimeVisualBudget([...items, ...healTexts], MAX_RUNTIME_FLOATING_TEXT));
      }
      if (healPercent > 0) {
        setCombatLogs((logs) => [
          `${skill.chinese_form}影响 ${supportedTargets} 个友方单位，回复 ${formatPreviewNumber(totalHealed)} 点生命。`,
          ...logs
        ].slice(0, 8));
      }
      const supportedSelf = currentEnemies[index];
      return {
        ...supportedSelf,
        ...updatedEnemy,
        hp: supportedSelf.hp,
        monsterSkillDamageMultiplierBonus: supportedSelf.monsterSkillDamageMultiplierBonus,
        monsterSkillBuffUntilMs: supportedSelf.monsterSkillBuffUntilMs
      };
    }

    if (skill.module === "monster_charge" || skill.module === "monster_ambush") {
      updatedEnemy = moveMonsterBySkill(updatedEnemy, skill);
    }

    if (skill.module === "monster_projectile") {
      releaseMonsterSkillProjectiles(updatedEnemy, skill, sequence, nowMs);
    } else {
      releaseMonsterSkillMeleeZone(updatedEnemy, skill, sequence, nowMs);
    }
    return updatedEnemy;
  }

  function moveMonsterBySkill(enemy: Enemy, skill: MonsterSkillDefinition | MonsterBossPatternSkill) {
    const playerNow = playerStateRef.current;
    const direction = normalizedWorldDirection({ x: playerNow.x - enemy.x, y: playerNow.y - enemy.y });
    const maxDistance = Math.max(1, Number(skill.range.effect_range));
    const desiredDistance = skill.module === "monster_ambush"
      ? Math.max(0, distance(enemy, playerNow) - Math.max(48, Number(skill.radius ?? enemyCollisionRadius(enemy) + PLAYER_GEOMETRY_RADIUS)))
      : maxDistance;
    const travel = Math.min(maxDistance, desiredDistance);
    const target = { x: enemy.x + direction.x * travel, y: enemy.y + direction.y * travel };
    const resolved = resolveWalkableMove(battleMap, enemy, target);
    return { ...enemy, x: resolved.x, y: resolved.y };
  }

  function releaseMonsterSkillProjectiles(enemy: Enemy, skill: MonsterSkillDefinition | MonsterBossPatternSkill, sequence: number, nowMs: number) {
    const count = Math.max(1, Math.round(Number(skill.projectile_count ?? 1)));
    const baseDirection = guideDirection(enemy, playerStateRef.current);
    const spreadAngles = monsterSkillProjectileSpreadAngles(skill, count, sequence);
    const events: SkillEvent[] = [];
    for (let index = 0; index < count; index += 1) {
      const offset = spreadAngles[index] ?? 0;
      const direction = normalizedWorldDirection(rotateDirection(baseDirection, offset));
      const speed = Math.max(1, Number(skill.projectile_speed ?? 300));
      const travel = Math.max(1, Number(skill.range.effect_range));
      const lifetimeMs = Math.round(travel / speed * 1000);
      const projectileId = `monster_${enemy.id}_${skill.id}_${sequence}_${index + 1}_${nowMs}`;
      const target = { x: enemy.x + direction.x * travel, y: enemy.y + direction.y * travel };
      const aimPolicy = monsterSkillProjectileAimPolicy(skill);
      events.push({
        event_id: `${projectileId}.spawn`,
        type: "projectile_spawn",
        timestamp_ms: nowMs,
        source_entity: "boss",
        target_entity: "player",
        position: { x: enemy.x, y: enemy.y },
        direction,
        delay_ms: Math.max(0, Number(skill.windup_ms ?? 0)),
        duration_ms: lifetimeMs,
        amount: null,
        damage_type: monsterSkillDamageType(skill),
        skill_instance_id: skill.id,
        vfx_key: monsterSkillVfxKey(skill),
        sfx_key: "",
        reason_key: "monster_skill_projectile",
        payload: {
          skill_name: skill.chinese_form,
          skill_id: skill.id,
          projectile_id: projectileId,
          projectile_index: index + 1,
          projectile_count: count,
          spawn_world_position: { x: enemy.x, y: enemy.y },
          target_world_position: target,
          expire_world_position: target,
          direction_world: direction,
          velocity_world: { x: direction.x * speed, y: direction.y * speed },
          aim_policy: aimPolicy,
          spawn_policy: aimPolicy === "target_current_position" ? "source_current_position" : "authored_spawn_position",
          projectile_speed: speed,
          projectile_range: travel,
          projectile_width: Number(skill.projectile_width ?? skill.projectile_radius ?? 18) * 2,
          projectile_height: Number(skill.projectile_width ?? skill.projectile_radius ?? 18) * 2,
          projectile_radius: Number(skill.projectile_radius ?? 12),
          collision_radius: Number(skill.projectile_radius ?? 12),
          impact_radius: Number(skill.projectile_radius ?? 12),
          lifetime_ms: lifetimeMs,
          local_spread_angle: offset,
          projectile_visual_mode: "standard",
          trajectory: "linear",
          area_scale: 1,
          can_hit_player: true,
          source_enemy_id: enemy.id,
          player_damage_multiplier: Math.max(0, Number(skill.damage_multiplier ?? 1)),
          player_hit_kind: skill.hit_kind ?? "attack",
          player_leash_range: skill.range.leash_range,
          damage_form: monsterSkillDamageForm(skill),
          hit_marker_id: skill.hit_marker_id,
          suppress_hit_vfx: monsterSkillSuppressHitVfx(skill)
        }
      });
    }
    consumeSkillEventTimeline(events);
  }

  function releaseMonsterSkillMeleeZone(enemy: Enemy, skill: MonsterSkillDefinition | MonsterBossPatternSkill, sequence: number, nowMs: number) {
    const repeatCount = Math.max(1, Math.round(Number(skill.repeat_count ?? 1)));
    const repeatIntervalMs = Math.max(0, Number(skill.repeat_interval_ms ?? 0));
    if (repeatCount > 1 && skill.module === "monster_damage_zone") {
      for (let repeatIndex = 0; repeatIndex < repeatCount; repeatIndex += 1) {
        const repeatDelayMs = repeatIndex * repeatIntervalMs;
        if (repeatDelayMs <= 0) {
          releaseMonsterSkillMeleeZoneInstance(enemy, skill, sequence, nowMs, repeatIndex + 1, repeatCount);
          continue;
        }
        window.setTimeout(() => {
          const liveEnemy = enemiesStateRef.current.find((candidate) => candidate.id === enemy.id && candidate.hp > 0);
          if (!liveEnemy || playerStateRef.current.hp <= 0) return;
          releaseMonsterSkillMeleeZoneInstance(liveEnemy, skill, sequence, performance.now(), repeatIndex + 1, repeatCount);
        }, repeatDelayMs);
      }
      return;
    }
    releaseMonsterSkillMeleeZoneInstance(enemy, skill, sequence, nowMs, 1, 1);
  }

  function releaseMonsterSkillMeleeZoneInstance(
    enemy: Enemy,
    skill: MonsterSkillDefinition | MonsterBossPatternSkill,
    sequence: number,
    nowMs: number,
    repeatIndex: number,
    repeatCount: number
  ) {
    const radius = Math.max(1, Number(skill.radius ?? skill.range.effect_range));
    const warningMs = Math.max(0, Number(skill.warning_ms ?? 0));
    const windupMs = Math.max(0, Number(skill.windup_ms ?? 0));
    const delayMs = warningMs > 0 ? warningMs : windupMs;
    const playerNow = playerStateRef.current;
    const centers = monsterSkillZoneCenters(enemy, playerNow, skill, repeatIndex);
    const primaryCenter = centers[0] ?? monsterSkillZoneCenter(enemy, playerNow, skill);
    const directionTarget = skill.module === "monster_melee_arc" ? playerNow : primaryCenter;
    const direction = guideDirection(enemy, directionTarget);
    const zoneId = `monster_${enemy.id}_${skill.id}_${sequence}_${repeatIndex}_${Math.round(nowMs)}`;
    const events: SkillEvent[] = [];
    centers.forEach((center, zoneIndex) => {
      const indexedZoneId = centers.length > 1 ? `${zoneId}_${zoneIndex + 1}` : zoneId;
      const basePayload = {
        skill_name: skill.chinese_form,
        skill_id: skill.id,
        zone_id: indexedZoneId,
        zone_index: zoneIndex + 1,
        zone_count: centers.length,
        repeat_index: repeatIndex,
        repeat_count: repeatCount,
        shape: "circle",
        radius,
        origin_world_position: center,
        direction_world: direction,
        vfx_key: monsterSkillVfxKey(skill),
        damage_amount: monsterOutgoingDamage(enemy) * Math.max(0, Number(skill.damage_multiplier ?? 1)),
        max_hits: 1,
        max_hits_per_target: 1,
        damage_form: monsterSkillDamageForm(skill),
        hit_marker_id: skill.hit_marker_id,
        trigger_marker_id: skill.trigger_marker_id,
        suppress_hit_vfx: monsterSkillSuppressHitVfx(skill)
      };
      if (warningMs > 0) {
        events.push({
          event_id: `${indexedZoneId}.prime`,
          type: "damage_zone_prime",
          timestamp_ms: nowMs,
          source_entity: "boss",
          target_entity: "player",
          position: center,
          direction,
          delay_ms: 0,
          duration_ms: warningMs,
          amount: null,
          damage_type: monsterSkillDamageType(skill),
          skill_instance_id: skill.id,
          vfx_key: monsterSkillVfxKey(skill),
          sfx_key: "",
          reason_key: "monster_skill_damage_zone_prime",
          payload: basePayload
        });
      }
      events.push({
        event_id: `${indexedZoneId}.damage_zone`,
        type: skill.module === "monster_melee_arc" ? "melee_arc" : "damage_zone",
        timestamp_ms: nowMs,
        source_entity: "boss",
        target_entity: "player",
        position: center,
        direction,
        delay_ms: delayMs,
        duration_ms: Math.max(220, Number(skill.duration_ms ?? 420)),
        amount: null,
        damage_type: monsterSkillDamageType(skill),
        skill_instance_id: skill.id,
        vfx_key: monsterSkillVfxKey(skill),
        sfx_key: "",
        reason_key: "monster_skill_damage_zone",
        payload: {
          ...basePayload,
          arc_angle: Number(skill.arc_angle ?? 120),
          arc_radius: radius,
          range: radius
        }
      });
    });
    pendingBossDamageZoneHits.current.push({
      id: zoneId,
      boss: enemy,
      zones: centers.map((center) => ({ ...center, radius })),
      remainingMs: delayMs,
      damageMultiplier: Math.max(0, Number(skill.damage_multiplier ?? 1)),
      hitKind: skill.hit_kind ?? "attack",
      damageType: monsterSkillDamageType(skill),
      damageForm: monsterSkillDamageForm(skill),
      leashRange: skill.range.leash_range,
      sourceText: skill.chinese_form,
      hitMarkerId: skill.hit_marker_id,
      suppressHitVfx: monsterSkillSuppressHitVfx(skill)
    });
    consumeSkillEventTimeline(events);
  }

  function monsterSkillProjectileSpreadAngles(skill: MonsterSkillDefinition | MonsterBossPatternSkill, count: number, sequence: number) {
    const pattern = skill.projectile_pattern ?? "fan";
    if (count <= 1) return [0];
    if (pattern === "ring") {
      const step = 360 / count;
      const phase = (sequence % Math.max(1, count)) * step * 0.5;
      return Array.from({ length: count }, (_, index) => index * step + phase);
    }
    if (pattern === "spiral") {
      const step = Math.min(48, 360 / count);
      const start = -step * (count - 1) * 0.5 + (sequence % 5) * 14;
      return Array.from({ length: count }, (_, index) => start + index * step);
    }
    if (pattern === "cross") {
      const base = [0, 90, -90, 180, 45, -45, 135, -135];
      return Array.from({ length: count }, (_, index) => base[index % base.length]);
    }
    const spreadStep = pattern === "wide_fan"
      ? Math.min(30, 96 / Math.max(1, count - 1))
      : Math.min(16, 54 / Math.max(1, count - 1));
    return Array.from({ length: count }, (_, index) => (index - (count - 1) / 2) * spreadStep);
  }

  function monsterSkillZoneCenters(enemy: Enemy, target: { x: number; y: number }, skill: MonsterSkillDefinition | MonsterBossPatternSkill, repeatIndex: number) {
    const primary = monsterSkillZoneCenter(enemy, target, skill);
    const pattern = skill.zone_pattern ?? "single";
    const count = Math.max(1, Math.round(Number(skill.zone_count ?? 1)));
    if (pattern === "single" || count <= 1 || skill.module === "monster_melee_arc") return [primary];
    const spacing = Math.max(1, Number(skill.zone_spacing ?? Math.max(72, Number(skill.radius ?? skill.range.effect_range) * 1.35)));
    const direction = normalizedWorldDirection({ x: target.x - enemy.x, y: target.y - enemy.y });
    const perpendicular = { x: -direction.y, y: direction.x };
    if (pattern === "ring" || pattern === "around_player") {
      return Array.from({ length: count }, (_, index) => {
        const angle = (Math.PI * 2 * index) / count + repeatIndex * 0.38;
        return { x: primary.x + Math.cos(angle) * spacing, y: primary.y + Math.sin(angle) * spacing };
      });
    }
    if (pattern === "cross") {
      const offsets = [
        { x: 0, y: 0 },
        { x: spacing, y: 0 },
        { x: -spacing, y: 0 },
        { x: 0, y: spacing },
        { x: 0, y: -spacing },
        { x: spacing * 0.72, y: spacing * 0.72 },
        { x: -spacing * 0.72, y: -spacing * 0.72 },
        { x: spacing * 0.72, y: -spacing * 0.72 },
        { x: -spacing * 0.72, y: spacing * 0.72 }
      ];
      return offsets.slice(0, count).map((offset) => ({ x: primary.x + offset.x, y: primary.y + offset.y }));
    }
    if (pattern === "line") {
      return Array.from({ length: count }, (_, index) => {
        const offset = (index - (count - 1) / 2) * spacing;
        return { x: primary.x + perpendicular.x * offset, y: primary.y + perpendicular.y * offset };
      });
    }
    return [primary];
  }

  function monsterSkillZoneCenter(enemy: Enemy, target: { x: number; y: number }, skill: MonsterSkillDefinition | MonsterBossPatternSkill) {
    if (skill.id === "mon_skill_poison_weave_mist" || skill.id === "boss_star_mother_triple_mark") return { x: target.x, y: target.y };
    if (skill.module === "monster_damage_zone" && skill.range.min_cast_range !== undefined) {
      return clampMonsterSkillZoneCenter(enemy, target, skill);
    }
    return { x: enemy.x, y: enemy.y };
  }

  function clampMonsterSkillZoneCenter(enemy: Enemy, target: { x: number; y: number }, skill: MonsterSkillDefinition | MonsterBossPatternSkill) {
    const direction = normalizedWorldDirection({ x: target.x - enemy.x, y: target.y - enemy.y });
    const placementDistance = Math.min(distance(enemy, target), Math.max(1, Number(skill.range.effect_range)));
    return {
      x: enemy.x + direction.x * placementDistance,
      y: enemy.y + direction.y * placementDistance
    };
  }

  function monsterSkillDamageType(skill: MonsterSkillDefinition | MonsterBossPatternSkill): MonsterDamageType {
    return skill.damage_type;
  }

  function monsterSkillDamageForm(skill: MonsterSkillDefinition | MonsterBossPatternSkill): MonsterDamageForm {
    return skill.damage_form;
  }

  function monsterSkillVfxKey(skill: MonsterSkillDefinition | MonsterBossPatternSkill) {
    if (skill.id === "mon_skill_dust_ring_scrape") return "monster_dust_scrape";
    if (skill.id === "mon_skill_twilight_sentry_bolt") return "monster_twilight_sentry_bolt";
    if (skill.id === "mon_skill_mirror_amplify") return "monster_mirror_shard";
    if (skill.module === "monster_melee_arc") return `monster_melee_arc_${monsterSkillDamageType(skill) ?? "physical"}`;
    if (skill.damage_type === "fire") return "skill_event_ignite";
    if (skill.damage_type === "cold") return "skill_event_frost";
    if (skill.damage_type === "lightning") return "skill_event_sparkle_projectile";
    if (skill.damage_type === "chaos") return "skill_event_poison";
    return skill.module === "monster_projectile" ? "skill_event_sparkle_projectile" : "boss_damage_zone";
  }

  function monsterSkillSuppressHitVfx(skill: MonsterSkillDefinition | MonsterBossPatternSkill) {
    return true;
  }

  function monsterSkillProjectileAimPolicy(skill: MonsterSkillDefinition | MonsterBossPatternSkill) {
    return skill.id === "mon_skill_frost_crystal_slow_bolt" ? "target_current_position" : "authored_target_position";
  }

  function updateBossSkillRuntime(currentEnemies: Enemy[], nowMs: number) {
    const liveBosses = currentEnemies.filter((enemy) => enemy.boss && enemy.hp > 0 && !enemy.bossPatternId);
    const liveBossIds = new Set(liveBosses.map((enemy) => enemy.id));
    for (const bossId of bossSkillTimers.current.keys()) {
      if (!liveBossIds.has(bossId)) bossSkillTimers.current.delete(bossId);
    }
    if (playerStateRef.current.hp <= 0) return;
    for (const boss of liveBosses) {
      const timers = bossSkillTimers.current.get(boss.id) ?? createInitialBossSkillTimers(boss, nowMs);
      bossSkillTimers.current.set(boss.id, timers);
      if (nowMs >= timers.basicReadyMs && bossCanTargetPlayer(boss, BOSS_BASIC_PROJECTILE_TARGET_RANGE)) {
        releaseBossBasicProjectiles(boss, timers.basicSeq);
        timers.basicSeq += 1;
        timers.basicReadyMs = nowMs + bossSkillIntervalMs(boss, "basic", timers.basicSeq, BOSS_BASIC_PROJECTILE_INTERVAL_MIN_MS, BOSS_BASIC_PROJECTILE_INTERVAL_MAX_MS);
      }
      if (nowMs >= timers.areaReadyMs && bossCanTargetPlayer(boss, BOSS_AREA_SKILL_TARGET_RANGE)) {
        releaseBossAreaWarningDamage(boss, timers.areaSeq);
        timers.areaSeq += 1;
        timers.areaReadyMs = nowMs + bossSkillIntervalMs(boss, "area", timers.areaSeq, BOSS_AREA_SKILL_INTERVAL_MIN_MS, BOSS_AREA_SKILL_INTERVAL_MAX_MS);
      }
      if (nowMs >= timers.barrageReadyMs && bossCanTargetPlayer(boss, BOSS_BARRAGE_SKILL_TARGET_RANGE)) {
        releaseBossCircularBarrage(boss, timers.barrageSeq);
        timers.barrageSeq += 1;
        timers.barrageReadyMs = nowMs + bossSkillIntervalMs(boss, "barrage", timers.barrageSeq, BOSS_BARRAGE_SKILL_INTERVAL_MIN_MS, BOSS_BARRAGE_SKILL_INTERVAL_MAX_MS);
      }
    }
  }

  function updateSupremeBossSkillRuntime(currentEnemies: Enemy[], nowMs: number) {
    const liveBosses = currentEnemies.filter((enemy) => enemy.boss && enemy.hp > 0 && supremeBossSkillForMonster(SUPREME_BOSS_SKILL_CONFIG, enemy.monsterId));
    const liveBossIds = new Set(liveBosses.map((enemy) => enemy.id));
    for (const [bossId, timer] of supremeBossSkillTimers.current.entries()) {
      if (!liveBossIds.has(bossId)) {
        cleanupSupremeBossRuntime(bossId, timer.activeSkillId);
        supremeBossSkillTimers.current.delete(bossId);
      }
    }

    let nextEnemies = currentEnemies;
    let enemiesChanged = false;
    const replaceEnemy = (bossId: number, update: (enemy: Enemy) => Enemy) => {
      nextEnemies = nextEnemies.map((enemy) => enemy.id === bossId ? update(enemy) : enemy);
      enemiesChanged = true;
    };

    for (const boss of liveBosses) {
      const skill = supremeBossSkillForMonster(SUPREME_BOSS_SKILL_CONFIG, boss.monsterId);
      if (!skill) continue;
      const timer = supremeBossSkillTimers.current.get(boss.id) ?? {
        readyAtMs: nowMs + Math.max(1, skill.initial_cooldown_ms),
        sequence: 0
      };
      supremeBossSkillTimers.current.set(boss.id, timer);

      if (timer.activeUntilMs !== undefined && nowMs >= timer.activeUntilMs) {
        cleanupSupremeBossRuntime(boss.id, timer.activeSkillId);
        timer.activeSkillId = undefined;
        timer.activeUntilMs = undefined;
        timer.readyAtMs = nowMs + Math.max(1, skill.cooldown_ms);
        replaceEnemy(boss.id, (enemy) => ({
          ...enemy,
          supremeBossInvulnerableUntilMs: undefined,
          activeMonsterSkillUntilMs: enemy.activeMonsterSkillUntilMs && enemy.activeMonsterSkillUntilMs <= nowMs ? undefined : enemy.activeMonsterSkillUntilMs
        }));
      }

      if (timer.activeUntilMs !== undefined || nowMs < timer.readyAtMs) continue;
      const latestBoss = nextEnemies.find((enemy) => enemy.id === boss.id) ?? boss;
      if (latestBoss.activeMonsterSkillUntilMs !== undefined && nowMs < latestBoss.activeMonsterSkillUntilMs) continue;
      if (!bossCanTargetPlayer(latestBoss, Math.max(760, battleMap?.meta.grid_size ? battleMap.meta.grid_size * 14 : 760))) continue;
      startSupremeBossSkill(latestBoss, skill, timer, nowMs);
      replaceEnemy(latestBoss.id, (enemy) => ({
        ...enemy,
        monsterSkillId: skill.id,
        monsterSkillForm: skill.display_name,
        activeMonsterSkillUntilMs: nowMs + skill.cast_duration_ms,
        attackStartedAtMs: nowMs,
        attackUntilMs: nowMs + skill.cast_duration_ms,
        velocityX: 0,
        velocityY: 0,
        supremeBossInvulnerableUntilMs: skill.id === "supreme_final_converger_all_returns_zero"
          ? nowMs + skill.cast_duration_ms
          : enemy.supremeBossInvulnerableUntilMs
      }));
    }

    if (enemiesChanged) {
      enemiesStateRef.current = nextEnemies;
      setEnemies(nextEnemies);
    }
  }

  function startSupremeBossSkill(boss: Enemy, skill: SupremeBossSkillDefinition, timer: SupremeBossSkillTimer, nowMs: number) {
    const castStartMs = Math.round(nowMs);
    const events = buildSupremeBossSkillEvents(skill, {
      boss: {
        id: boss.id,
        x: boss.x,
        y: boss.y,
        monsterId: boss.monsterId,
        damageType: boss.damageType
      },
      player: playerStateRef.current,
      arena: {
        width: battleMap?.meta.world_width ?? MAP_WIDTH,
        height: battleMap?.meta.world_height ?? MAP_HEIGHT
      },
      castStartMs,
      sequence: timer.sequence
    }) as SkillEvent[];
    timer.activeSkillId = skill.id;
    timer.activeUntilMs = nowMs + skill.cast_duration_ms;
    timer.sequence += 1;
    consumeSkillEventTimeline(events);
    registerSupremeBossPendingDamageZones(boss, events);
    setNotice(skill.display_name);
    setCombatLogs((logs) => [`${skill.display_name} 开始。`, ...logs].slice(0, 8));
  }

  function registerSupremeBossPendingDamageZones(boss: Enemy, events: SkillEvent[]) {
    const damageZones = events.filter((event) => event.type === "damage_zone" && event.source_entity === "boss" && event.payload?.source_enemy_id === boss.id);
    for (const event of damageZones) {
      if (event.payload?.ring === true) continue;
      const payload = event.payload ?? {};
      const origin = pointFromUnknown(payload.origin_world_position) ?? event.position;
      const direction = pointFromUnknown(payload.direction_world) ?? event.direction;
      const safeDirection = pointFromUnknown(payload.safe_direction);
      const shapeText = String(payload.shape ?? "circle");
      const shape = shapeText === "rectangle" ? "rectangle" : shapeText === "sector" ? "sector" : "circle";
      pendingBossDamageZoneHits.current.push({
        id: String(payload.zone_id ?? event.event_id),
        boss,
        zones: [{
          x: origin.x,
          y: origin.y,
          radius: Math.max(1, Number(payload.radius ?? 120)),
          shape,
          length: Number(payload.length ?? payload.radius ?? 120),
          width: Number(payload.width ?? payload.radius ?? 120),
          directionX: Number(direction.x ?? event.direction.x),
          directionY: Number(direction.y ?? event.direction.y),
          safeDirectionX: safeDirection?.x,
          safeDirectionY: safeDirection?.y,
          safeAngleDeg: Number(payload.safe_angle_deg ?? 0)
        }],
        remainingMs: Math.max(0, Number(event.delay_ms ?? 0)),
        damageMultiplier: Math.max(0, Number(payload.player_damage_multiplier ?? 1)),
        hitKind: "spell",
        damageType: event.damage_type,
        sourceText: typeof payload.skill_name === "string" ? payload.skill_name : "至高首领技能",
        suppressHitVfx: true
      });
    }
  }

  function cleanupSupremeBossRuntime(bossId: number, activeSkillId?: string) {
    scheduledSkillEvents.current = scheduledSkillEvents.current.filter((scheduled) => scheduled.event.payload?.source_enemy_id !== bossId);
    pendingBossDamageZoneHits.current = pendingBossDamageZoneHits.current.filter((pending) => pending.boss.id !== bossId);
    activeDamageZones.current = activeDamageZones.current.filter((zone) => zone.payload.source_enemy_id !== bossId);
    setBolts((items) => items.filter((bolt) => bolt.sourceEnemyId !== bossId || !bolt.skillId || !SUPREME_BOSS_SKILL_IDS.has(bolt.skillId)));
    setDamageZones((items) => items.filter((zone) => !zone.skillId || !SUPREME_BOSS_SKILL_IDS.has(zone.skillId) || (activeSkillId && zone.skillId !== activeSkillId)));
  }

  function bossCanTargetPlayer(boss: Enemy, range: number) {
    return distance(boss, playerStateRef.current) <= range;
  }

  function createInitialBossSkillTimers(boss: Enemy, nowMs: number): BossSkillTimers {
    return {
      basicReadyMs: nowMs + bossSkillIntervalMs(boss, "basic", 0, BOSS_BASIC_PROJECTILE_INTERVAL_MIN_MS, BOSS_BASIC_PROJECTILE_INTERVAL_MAX_MS),
      areaReadyMs: nowMs + bossSkillIntervalMs(boss, "area", 0, BOSS_AREA_SKILL_INTERVAL_MIN_MS, BOSS_AREA_SKILL_INTERVAL_MAX_MS),
      barrageReadyMs: nowMs + bossSkillIntervalMs(boss, "barrage", 0, BOSS_BARRAGE_SKILL_INTERVAL_MIN_MS, BOSS_BARRAGE_SKILL_INTERVAL_MAX_MS),
      basicSeq: 0,
      areaSeq: 0,
      barrageSeq: 0
    };
  }

  function bossSkillIntervalMs(boss: Enemy, key: string, seq: number, minMs: number, maxMs: number) {
    const roll = stablePercent(`boss:${boss.id}:${key}:${seq}`) / 100;
    return Math.round(minMs + (maxMs - minMs) * roll);
  }

  function releaseBossBasicProjectiles(boss: Enemy, sequence: number) {
    const baseDirection = guideDirection(boss, playerStateRef.current);
    const events = [-30, 0, 30].map((angleOffset, index) => bossProjectileSpawnEvent({
      boss,
      skillKey: "basic_projectile",
      sequence,
      direction: rotateDirection(baseDirection, angleOffset),
      projectileIndex: index + 1,
      projectileCount: 3,
      localSpreadAngle: angleOffset,
      delayMs: 0,
      damageMultiplier: 1,
      hitKind: "attack",
      vfxKey: "skill_event_sparkle_projectile"
    }));
    consumeSkillEventTimeline(events);
  }

  function releaseBossCircularBarrage(boss: Enemy, sequence: number) {
    const events: SkillEvent[] = [];
    BOSS_BARRAGE_WAVE_OFFSETS_DEG.forEach((waveOffset, waveIndex) => {
      for (let index = 0; index < BOSS_BARRAGE_PROJECTILE_COUNT; index += 1) {
        const angle = waveOffset + (360 / BOSS_BARRAGE_PROJECTILE_COUNT) * index;
        events.push(bossProjectileSpawnEvent({
          boss,
          skillKey: "circular_barrage",
          sequence,
          direction: { x: Math.cos(angle * Math.PI / 180), y: Math.sin(angle * Math.PI / 180) },
          projectileIndex: index + 1,
          projectileCount: BOSS_BARRAGE_PROJECTILE_COUNT,
          localSpreadAngle: angle,
          delayMs: waveIndex * BOSS_BARRAGE_WAVE_INTERVAL_MS,
          damageMultiplier: 0.72,
          hitKind: "spell",
          vfxKey: "skill_event_sparkle_projectile"
        }));
      }
    });
    consumeSkillEventTimeline(events);
  }

  function bossProjectileSpawnEvent({
    boss,
    skillKey,
    sequence,
    direction,
    projectileIndex,
    projectileCount,
    localSpreadAngle,
    delayMs,
    damageMultiplier,
    hitKind,
    vfxKey
  }: {
    boss: Enemy;
    skillKey: string;
    sequence: number;
    direction: { x: number; y: number };
    projectileIndex: number;
    projectileCount: number;
    localSpreadAngle: number;
    delayMs: number;
    damageMultiplier: number;
    hitKind: MonsterHitKind;
    vfxKey: string;
  }): SkillEvent {
    const nowMs = Math.round(elapsedRef.current * 1000);
    const normalizedDirection = normalizedWorldDirection(direction);
    const target = {
      x: boss.x + normalizedDirection.x * BOSS_PROJECTILE_DISTANCE,
      y: boss.y + normalizedDirection.y * BOSS_PROJECTILE_DISTANCE
    };
    const projectileId = `boss_${boss.id}_${skillKey}_${sequence}_${projectileIndex}_${nowMs}`;
    const lifetimeMs = Math.round(BOSS_PROJECTILE_DISTANCE / BOSS_PROJECTILE_SPEED * 1000);
    return {
      event_id: `${projectileId}.spawn`,
      type: "projectile_spawn",
      timestamp_ms: nowMs,
      source_entity: "boss",
      target_entity: "player",
      position: { x: boss.x, y: boss.y },
      direction: normalizedDirection,
      delay_ms: delayMs,
      duration_ms: lifetimeMs,
      amount: null,
      damage_type: boss.damageType ?? "physical",
      skill_instance_id: `boss_${skillKey}`,
      vfx_key: vfxKey,
      sfx_key: "",
      reason_key: "boss_projectile",
      payload: {
        skill_name: skillKey === "basic_projectile" ? "Boss 三连投射物" : "Boss 环形弹幕",
        skill_id: `boss_${skillKey}`,
        projectile_id: projectileId,
        projectile_index: projectileIndex,
        projectile_count: projectileCount,
        spawn_world_position: { x: boss.x, y: boss.y },
        target_world_position: target,
        expire_world_position: target,
        direction_world: normalizedDirection,
        velocity_world: { x: normalizedDirection.x * BOSS_PROJECTILE_SPEED, y: normalizedDirection.y * BOSS_PROJECTILE_SPEED },
        projectile_speed: BOSS_PROJECTILE_SPEED,
        projectile_width: BOSS_PROJECTILE_RADIUS * 2,
        projectile_height: BOSS_PROJECTILE_RADIUS * 2,
        projectile_radius: BOSS_PROJECTILE_RADIUS,
        collision_radius: BOSS_PROJECTILE_RADIUS,
        impact_radius: BOSS_PROJECTILE_RADIUS,
        lifetime_ms: lifetimeMs,
        local_spread_angle: localSpreadAngle,
        projectile_visual_mode: "standard",
        trajectory: "linear",
        area_scale: 1,
        can_hit_player: true,
        source_enemy_id: boss.id,
        player_damage_multiplier: damageMultiplier,
        player_hit_kind: hitKind
      }
    };
  }

  function releaseBossAreaWarningDamage(boss: Enemy, sequence: number) {
    const zones = bossAreaSkillZones(sequence);
    const nowMs = Math.round(elapsedRef.current * 1000);
    const events: SkillEvent[] = [];
    zones.forEach((zone, index) => {
      const zoneId = `boss_${boss.id}_area_${sequence}_${index + 1}_${nowMs}`;
      const direction = guideDirection(boss, zone);
      const basePayload = {
        skill_name: "Boss 多点预警伤害",
        skill_id: "boss_area_warning_damage",
        zone_id: zoneId,
        shape: "circle",
        radius: zone.radius,
        origin_world_position: { x: zone.x, y: zone.y },
        direction_world: direction,
        vfx_key: "boss_damage_zone",
        damage_amount: monsterOutgoingDamage(boss) * 1.15,
        max_hits: 1,
        max_hits_per_target: 1
      };
      events.push({
        event_id: `${zoneId}.prime`,
        type: "damage_zone_prime",
        timestamp_ms: nowMs,
        source_entity: "boss",
        target_entity: "player",
        position: { x: zone.x, y: zone.y },
        direction,
        delay_ms: 0,
        duration_ms: BOSS_AREA_WARNING_MS,
        amount: null,
        damage_type: boss.damageType ?? "physical",
        skill_instance_id: "boss_area_warning_damage",
        vfx_key: "boss_damage_zone",
        sfx_key: "",
        reason_key: "boss_damage_zone_prime",
        payload: basePayload
      });
      events.push({
        event_id: `${zoneId}.damage_zone`,
        type: "damage_zone",
        timestamp_ms: nowMs,
        source_entity: "boss",
        target_entity: "player",
        position: { x: zone.x, y: zone.y },
        direction,
        delay_ms: BOSS_AREA_WARNING_MS,
        duration_ms: 420,
        amount: null,
        damage_type: boss.damageType ?? "physical",
        skill_instance_id: "boss_area_warning_damage",
        vfx_key: "boss_damage_zone",
        sfx_key: "",
        reason_key: "boss_damage_zone",
        payload: basePayload
      });
    });
    pendingBossDamageZoneHits.current.push({
      id: `boss_${boss.id}_area_${sequence}_${nowMs}`,
      boss,
      zones,
      remainingMs: BOSS_AREA_WARNING_MS,
      damageMultiplier: 1.15,
      hitKind: "spell",
      damageType: boss.damageType ?? "physical"
    });
    consumeSkillEventTimeline(events);
  }

  function bossAreaSkillZones(sequence: number) {
    const player = playerStateRef.current;
    const mapWidth = battleMap?.meta.world_width ?? MAP_WIDTH;
    const mapHeight = battleMap?.meta.world_height ?? MAP_HEIGHT;
    const zones = [{ x: player.x, y: player.y, radius: BOSS_AREA_RADIUS }];
    const baseAngle = stablePercent(`boss:area:${sequence}:angle`) / 100 * 360;
    for (let index = 0; index < 4; index += 1) {
      const angle = (baseAngle + index * 90 + stablePercent(`boss:area:${sequence}:${index}:jitter`) / 100 * 28 - 14) * Math.PI / 180;
      const radius = 96 + stablePercent(`boss:area:${sequence}:${index}:distance`) / 100 * 118;
      zones.push({
        x: clamp(player.x + Math.cos(angle) * radius, 48, mapWidth - 48),
        y: clamp(player.y + Math.sin(angle) * radius, 48, mapHeight - 48),
        radius: BOSS_AREA_RADIUS
      });
    }
    return zones;
  }

  function processBossProjectilePlayerImpacts(dt: number) {
    const hits: FireBolt[] = [];
    const playerNow = playerStateRef.current;
    if (playerNow.hp <= 0) return 0;
    const nextBolts = boltsStateRef.current.map((bolt) => {
      if (!bolt.canHitPlayer || bolt.sourceEntity !== "boss") return bolt;
      const boss = enemiesStateRef.current.find((enemy) => enemy.id === bolt.sourceEnemyId) ?? null;
      if (boss && bolt.playerLeashRange !== undefined && !monsterSkillHitAllowed({ range: { cast_range: 1, effect_range: 1, leash_range: bolt.playerLeashRange } }, distance(boss, playerNow))) {
        return { ...bolt, canHitPlayer: false };
      }
      const point = fireBoltWorldPoint(bolt);
      const collisionRadius = Math.max(1, Number(bolt.collisionRadius ?? bolt.impactRadius ?? BOSS_PROJECTILE_RADIUS));
      if (distance(point, playerNow) > collisionRadius + PLAYER_GEOMETRY_RADIUS) return bolt;
      hits.push(bolt);
      return {
        ...bolt,
        x: point.x,
        y: point.y,
        targetX: point.x,
        targetY: point.y,
        velocityX: 0,
        velocityY: 0,
        canHitPlayer: false,
        ttl: Math.min(bolt.ttl, 0.02)
      };
    });
    if (hits.length === 0) return 0;
    boltsStateRef.current = nextBolts;
    setBolts(nextBolts);
    hits.forEach((bolt) => {
      const boss = enemiesStateRef.current.find((enemy) => enemy.id === bolt.sourceEnemyId) ?? null;
      if (!boss) return;
      applyBossSkillHitToPlayer(boss, {
        damageMultiplier: Math.max(0, Number(bolt.playerDamageMultiplier ?? 1)),
        hitKind: bolt.playerHitKind ?? "attack",
        damageType: bolt.damageType,
        sourceText: bolt.sourceSkillName ?? "Boss 投射物",
        impact: { x: playerStateRef.current.x, y: playerStateRef.current.y },
        projectileId: bolt.projectileId,
        projectileIndex: bolt.projectileIndex,
        projectileCount: bolt.projectileCount,
        vfxKey: bolt.vfxKey,
        impactRadius: bolt.impactRadius,
        suppressHitVfx: bolt.suppressHitVfx
      });
    });
    return hits.length;
  }

  function processPendingBossDamageZoneHits(dt: number) {
    if (pendingBossDamageZoneHits.current.length === 0 || playerStateRef.current.hp <= 0) return 0;
    const deltaMs = Math.max(0, Math.round(dt * 1000));
    let hitCount = 0;
    const remaining: PendingBossDamageZoneHit[] = [];
    for (const pending of pendingBossDamageZoneHits.current) {
      const nextRemainingMs = pending.remainingMs - deltaMs;
      if (nextRemainingMs > 0) {
        remaining.push({ ...pending, remainingMs: nextRemainingMs });
        continue;
      }
      const playerNow = playerStateRef.current;
      if (pending.leashRange !== undefined && !monsterSkillHitAllowed({ range: { cast_range: 1, effect_range: 1, leash_range: pending.leashRange } }, distance(pending.boss, playerNow))) {
        continue;
      }
      const hit = pending.zones.some((zone) => bossDamageZoneContainsPlayer(zone, playerNow));
      if (hit) {
        hitCount += 1;
        applyBossSkillHitToPlayer(pending.boss, {
          damageMultiplier: pending.damageMultiplier,
          hitKind: pending.hitKind,
          damageType: pending.damageType,
          sourceText: pending.sourceText ?? "Boss 多点预警伤害",
          impact: { x: playerNow.x, y: playerNow.y },
          vfxKey: "boss_damage_zone",
          impactRadius: pending.zones[0]?.radius ?? BOSS_AREA_RADIUS,
          suppressHitVfx: pending.suppressHitVfx
        });
      }
    }
    pendingBossDamageZoneHits.current = remaining;
    return hitCount;
  }

  function bossDamageZoneContainsPlayer(
    zone: PendingBossDamageZoneHit["zones"][number],
    playerNow: { x: number; y: number }
  ) {
    if (zone.shape === "rectangle") {
      const direction = normalizedWorldDirection({ x: zone.directionX ?? 1, y: zone.directionY ?? 0 });
      const side = { x: -direction.y, y: direction.x };
      const dx = playerNow.x - zone.x;
      const dy = playerNow.y - zone.y;
      const forward = dx * direction.x + dy * direction.y;
      const lateral = dx * side.x + dy * side.y;
      return Math.abs(forward) <= Math.max(1, Number(zone.length ?? zone.radius)) * 0.5 + PLAYER_GEOMETRY_RADIUS
        && Math.abs(lateral) <= Math.max(1, Number(zone.width ?? zone.radius)) * 0.5 + PLAYER_GEOMETRY_RADIUS;
    }
    if (zone.shape === "sector") {
      if (distance(playerNow, zone) > zone.radius + PLAYER_GEOMETRY_RADIUS) return false;
      const safeDirection = normalizedWorldDirection({ x: zone.safeDirectionX ?? -1, y: zone.safeDirectionY ?? 0 });
      const toPlayer = normalizedWorldDirection({ x: playerNow.x - zone.x, y: playerNow.y - zone.y });
      const dot = clamp(safeDirection.x * toPlayer.x + safeDirection.y * toPlayer.y, -1, 1);
      const angleDeg = Math.acos(dot) * 180 / Math.PI;
      return angleDeg > Math.max(0, Number(zone.safeAngleDeg ?? 0)) * 0.5;
    }
    return distance(playerNow, zone) <= zone.radius + PLAYER_GEOMETRY_RADIUS;
  }

  function applyBossSkillHitToPlayer(
    boss: Enemy,
    options: {
      damageMultiplier: number;
      hitKind: MonsterHitKind;
      damageType: string;
      sourceText: string;
      impact: { x: number; y: number };
      projectileId?: string;
      projectileIndex?: number;
      projectileCount?: number;
      vfxKey?: string;
      impactRadius?: number;
      suppressHitVfx?: boolean;
    }
  ) {
    let nextBuffs = activePlayerBuffsRef.current;
    const hitEnemy: Enemy = {
      ...boss,
      damageType: options.damageType,
      hitKind: options.hitKind,
      damageMultiplier: Math.max(0, Number(boss.damageMultiplier ?? 1)) * Math.max(0, options.damageMultiplier)
    };
    const playerBeforeHit = playerStateRef.current;
    if (playerBeforeHit.hp <= 0) return;
    const nowMs = elapsedRef.current * 1000;
    const blocked = resolveFrontendPlayerBlock(hitEnemy, options.hitKind);
    const playerAfterBlock = blocked ? recoverFrontendPlayerOnBlock(playerBeforeHit, nowMs) : playerBeforeHit;
    const hit = resolveMonsterHitAgainstPlayer(hitEnemy, playerAfterBlock, state?.player_stats, blocked, nowMs);
    const guarded = applyGuardBuffsToMonsterHit(hit, playerAfterBlock, nextBuffs);
    nextBuffs = guarded.nextBuffs;
    setRuntimePlayerBuffs(nextBuffs);
    if (guarded.hit.totalDamage <= 0) return;
    resetEnergyShieldRechargeDelay(nowMs);
    setRuntimePlayer(() => guarded.hit.nextPlayer);
    const defeated = !skillEditorMode && guarded.hit.nextPlayer.hp <= 0;
    if (defeated) {
      setPlaying(false);
      setBattlePauseOpen(false);
      setBagOpen(false);
      setGameFailureOpen(true);
      setNotice("游戏失败。玩家生命已归零。");
    }
    if (options.suppressHitVfx === false) {
      setHitVfxs((items) => capRuntimeVisualBudget([...items, {
        id: nextHitVfxId.current++,
        x: options.impact.x,
        y: options.impact.y,
        projectileId: options.projectileId,
        projectileIndex: options.projectileIndex,
        projectileCount: options.projectileCount,
        ttl: projectileVfxKind(options.vfxKey) === "sparkle" ? 0.32 : FIRE_BOLT_IMPACT_DURATION_MS / 1000,
        duration: projectileVfxKind(options.vfxKey) === "sparkle" ? 0.32 : FIRE_BOLT_IMPACT_DURATION_MS / 1000,
        damageType: options.damageType,
        vfxKey: options.vfxKey ?? "boss_hit",
        skillTemplateId: "boss_skill",
        impactRadius: options.impactRadius,
        shapeEffects: [],
        vfxScale: 1
      }], MAX_RUNTIME_HIT_VFX));
    }
    setTexts((items) => capRuntimeVisualBudget([...items, {
      id: nextTextId.current++,
      x: options.impact.x,
      y: options.impact.y - 42,
      text: `${guarded.hit.isCritical ? "暴击 " : ""}-${Math.max(1, Math.round(guarded.hit.totalDamage))}`,
      damageType: guarded.hit.damageType,
      ttl: 0.8,
      duration: 0.8
    }], MAX_RUNTIME_FLOATING_TEXT));
    setCombatLogs((logs) => [
      ...(defeated ? ["玩家生命归零，游戏失败。"] : []),
      `${options.sourceText}${guarded.hit.isCritical ? "暴击" : "命中"}造成 ${formatPreviewNumber(guarded.hit.totalDamage)} 点${damageTypeText(guarded.hit.damageType)}伤害${guarded.hit.blocked ? "（已格挡）" : ""}。`,
      ...logs
    ].slice(0, 8));
  }

  function applyGuardBuffsToMonsterHit(
    hit: ReturnType<typeof resolveMonsterHitAgainstPlayer>,
    playerBeforeHit: PlayerRuntimeState,
    buffs: PlayerBuff[]
  ) {
    let incoming = hit.totalDamage;
    const nextBuffs: PlayerBuff[] = [];
    for (const buff of buffs) {
      if (buff.remaining <= 0 || buff.remainingAmount <= 0) continue;
      if (!playerAbsorbBuffType(buff.buffType)) {
        nextBuffs.push(buff);
        continue;
      }
      const absorbed = Math.min(buff.remainingAmount, incoming * buff.absorbPercent / 100);
      const nextBuff = { ...buff, remainingAmount: buff.remainingAmount - absorbed };
      incoming = Math.max(0, incoming - absorbed);
      if (nextBuff.remainingAmount > 0) nextBuffs.push(nextBuff);
    }
    const nextPlayer = applyFrontendDamageToPlayer(playerBeforeHit, incoming);
    const shieldDamage = Math.max(0, playerBeforeHit.currentEnergyShield - nextPlayer.currentEnergyShield);
    const lifeDamage = Math.max(0, playerBeforeHit.hp - nextPlayer.hp);
    return {
      hit: {
        ...hit,
        totalDamage: incoming,
        shieldDamage,
        lifeDamage,
        nextPlayer
      },
      nextBuffs
    };
  }

  function applyChannelMovementBuff(event: SkillEvent) {
    const payload = event.payload ?? {};
    const rawMultiplier = Number(payload.channel_move_speed_multiplier);
    if (!Number.isFinite(rawMultiplier)) return;
    const moveSpeedMultiplier = Math.max(0, rawMultiplier);
    const tickMs = Math.max(0, Number(payload.channel_time_per_stack_ms ?? 0));
    const duration = Math.max(0.3, tickMs / 1000 + 0.15);
    const skillId = String(payload.skill_id ?? event.skill_instance_id);
    const nextBuff: PlayerBuff = {
      id: nextPlayerBuffId.current++,
      buffType: "channel_move_speed",
      skillId,
      remaining: duration,
      duration,
      remainingAmount: 1,
      absorbPercent: 0,
      excludeDamageOverTime: false,
      moveSpeedMultiplier,
      vfxKey: event.vfx_key || String(payload.zone_vfx_key ?? "channel_move_speed")
    };
    setRuntimePlayerBuffs([
      ...activePlayerBuffsRef.current.filter((buff) => !(buff.buffType === nextBuff.buffType && buff.skillId === nextBuff.skillId)),
      nextBuff
    ]);
  }

  function currentEnemyAttackLockedIds(
    nowMs: number,
    currentEnemies: Enemy[] = [],
    currentPlayer?: { x: number; y: number },
    map?: BakedBattleMapData | null
  ) {
    const lockedIds = new Set<number>();
    for (const enemy of currentEnemies) {
      if (enemy.attackUntilMs !== undefined && nowMs < enemy.attackUntilMs) {
        lockedIds.add(enemy.id);
        continue;
      }
      if (enemy.activeMonsterSkillUntilMs !== undefined && nowMs < enemy.activeMonsterSkillUntilMs) {
        lockedIds.add(enemy.id);
        continue;
      }
      if (currentPlayer && canEnemyStartRuntimeAttack(enemy, currentPlayer, nowMs, map)) lockedIds.add(enemy.id);
    }
    return lockedIds;
  }

  function skillReleaseIntervalSeconds(skill: SkillPreview) {
    const intervalMs = Number(skill.actual_interval_ms ?? skill.final_cooldown_ms ?? 0);
    if (isThundercloudSkill(skill)) {
      const params = skill.runtime_params ?? {};
      const channelStacks = Math.max(1, Math.round(Number(params.channel_max_stacks ?? 5)));
      const channelTimePerStackMs = Math.max(1, Number(params.channel_time_per_stack_ms ?? (intervalMs || 333)));
      const cloudDurationMs = Math.max(
        1,
        Number(params.duration_ms ?? channelStacks * Number(params.cloud_duration_per_stack_ms ?? 2500))
      );
      const cooldownMs = Math.max(0, Number(skill.final_cooldown_ms ?? 0));
      return Math.max(0.16, (channelStacks * channelTimePerStackMs + cloudDurationMs + cooldownMs) / 1000);
    }
    return Math.max(0.16, intervalMs / 1000);
  }

  function thundercloudChannelParams(skill: SkillPreview) {
    const params = skill.runtime_params ?? {};
    const maxStacks = Math.max(1, Math.round(Number(params.channel_max_stacks ?? 5)));
    const timePerStackMs = Math.max(1, Number(params.channel_time_per_stack_ms ?? skill.actual_interval_ms ?? 333));
    const cloudDurationMs = Math.max(
      1,
      Number(params.duration_ms ?? maxStacks * Number(params.cloud_duration_per_stack_ms ?? 2500))
    );
    const cooldownMs = Math.max(0, Number(skill.final_cooldown_ms ?? 0));
    return { maxStacks, timePerStackMs, cloudDurationMs, cooldownMs };
  }

  function isFrontendChannelDamageZoneSkill(skill: SkillPreview) {
    const behavior = skill.behavior_template ?? skill.behavior_type;
    if (behavior !== "damage_zone") return false;
    if (isThundercloudSkill(skill)) return false;
    const tags = frontendSkillTags(skill);
    const params = skill.runtime_params ?? {};
    return (tags.has("channel") || Number(params.channel_max_stacks ?? 0) > 0 || Boolean(params.channel_tick_during_channel))
      && Number(params.channel_max_stacks ?? 0) > 0;
  }

  function channelDamageZoneParams(skill: SkillPreview) {
    const params = skill.runtime_params ?? {};
    const maxStacks = Math.max(1, Math.round(Number(params.channel_max_stacks ?? 1)));
    const minStacks = Math.max(0, Math.min(maxStacks, Math.round(Number(params.channel_min_stacks ?? 0))));
    const timePerStackMs = Math.max(1, Number(params.channel_time_per_stack_ms ?? skill.actual_interval_ms ?? 500));
    const releaseIntervalMs = Math.max(160, Number(skill.actual_interval_ms ?? skill.final_cooldown_ms ?? 980));
    return { maxStacks, minStacks, timePerStackMs, releaseIntervalMs };
  }

  function skillWithFrontendChannelStack(skill: SkillPreview, stack: number) {
    return {
      ...skill,
      runtime_params: {
        ...(skill.runtime_params ?? {}),
        current_channel_stack: stack
      }
    };
  }

  function processChannelDamageZoneSkill(skill: SkillPreview, dt: number, current: Enemy[]) {
    const timerId = skill.active_gem_instance_id;
    const channel = damageZoneChannels.current[timerId] ?? {
      stacks: 0,
      progressMs: 0,
      noChannelMs: 0,
      lockedMs: 0,
      releaseCooldownMs: 0
    };
    damageZoneChannels.current[timerId] = channel;
    const { maxStacks, minStacks, timePerStackMs, releaseIntervalMs } = channelDamageZoneParams(skill);
    const deltaMs = Math.max(0, dt * 1000);
    const hasChannelTarget = current.length > 0 && hasLiveEnemyInCastRange(current, skill, playerStateRef.current);
    if (!hasChannelTarget) {
      channel.stacks = minStacks;
      channel.progressMs = 0;
      channel.noChannelMs = 0;
      channel.releaseCooldownMs = 0;
      return false;
    }

    channel.noChannelMs = 0;
    channel.progressMs += deltaMs;
    channel.releaseCooldownMs = Math.max(0, (channel.releaseCooldownMs ?? 0) - deltaMs);
    while (channel.progressMs >= timePerStackMs && channel.stacks < maxStacks) {
      channel.stacks += 1;
      channel.progressMs -= timePerStackMs;
    }
    const releaseStack = Math.max(1, Math.min(maxStacks, channel.stacks));
    if (releaseStack <= minStacks || (channel.releaseCooldownMs ?? 0) > 0) return false;
    if (!trySpendSkillMana(skill)) return false;
    const released = releaseFrontendPlayableSkill(skillWithFrontendChannelStack(skill, releaseStack), current, {
      manaAlreadySpent: true
    });
    channel.releaseCooldownMs = released ? releaseIntervalMs : 50;
    return released;
  }

  function processThundercloudChannel(skill: SkillPreview, dt: number, current: Enemy[]) {
    const timerId = skill.active_gem_instance_id;
    const channel = thundercloudChannels.current[timerId] ?? {
      stacks: 0,
      progressMs: 0,
      noChannelMs: 0,
      lockedMs: 0
    };
    thundercloudChannels.current[timerId] = channel;
    const { maxStacks, timePerStackMs, cloudDurationMs, cooldownMs } = thundercloudChannelParams(skill);
    const deltaMs = Math.max(0, dt * 1000);
    if (channel.lockedMs > 0) {
      channel.lockedMs = Math.max(0, channel.lockedMs - deltaMs);
      return false;
    }
    const hasChannelTarget = current.length > 0 && hasLiveEnemyInCastRange(current, skill, playerStateRef.current);
    if (!hasChannelTarget) {
      channel.progressMs = 0;
      if (channel.stacks > 0) {
        channel.noChannelMs += deltaMs;
        while (channel.noChannelMs >= 3000 && channel.stacks > 0) {
          channel.stacks -= 1;
          channel.noChannelMs -= 1000;
        }
      } else {
        channel.noChannelMs = 0;
      }
      return false;
    }
    channel.noChannelMs = 0;
    channel.progressMs += deltaMs;
    while (channel.progressMs >= timePerStackMs && channel.stacks < maxStacks) {
      channel.stacks += 1;
      channel.progressMs -= timePerStackMs;
    }
    if (channel.stacks < maxStacks) return false;
    if (!trySpendSkillMana(skill)) return false;
    const released = releaseFrontendPlayableSkill(skill, current, { manaAlreadySpent: true });
    if (!released) return false;
    channel.stacks = 0;
    channel.progressMs = 0;
    channel.noChannelMs = 0;
    channel.lockedMs = cloudDurationMs + cooldownMs;
    return true;
  }

  function skillManaCost(skill: SkillPreview) {
    return Math.max(0, Number(skill.mana_cost ?? 0));
  }

  function frontendSkillTags(skill: SkillPreview) {
    const rawTags = skill.runtime_params?.frontend_skill_tags;
    const tags = new Set<string>();
    if (Array.isArray(rawTags)) {
      for (const tag of rawTags) tags.add(String(tag));
    }
    if (Array.isArray(skill.tags)) {
      for (const tag of skill.tags) {
        if (tag.id) tags.add(String(tag.id));
        if (tag.text) tags.add(String(tag.text));
      }
    }
    return tags;
  }

  function isFrontendContinuousAttackEligible(skill: SkillPreview) {
    const tags = frontendSkillTags(skill);
    const castMode = String(skill.cast?.mode ?? "");
    const isAttack = tags.has("attack") || castMode === "attack";
    if (!isAttack) return false;
    const blockedTags = ["channel", "movement", "displacement", "mobility", "sentinel"];
    if (blockedTags.some((tag) => tags.has(tag))) return false;
    if (isThundercloudSkill(skill)) return false;
    return Number(skill.runtime_params?.continuous_attack_chance_percent ?? 0) > 0;
  }

  function frontendContinuousAttackRepeatCount(skill: SkillPreview) {
    const chancePercent = Math.max(0, Number(skill.runtime_params?.continuous_attack_chance_percent ?? 0));
    const guaranteed = Math.floor(chancePercent / 100);
    const remainder = chancePercent - guaranteed * 100;
    const rollKey = `${skill.active_gem_instance_id}:continuous_attack:${Math.floor(elapsedRef.current * 1000)}`;
    const extra = remainder > 0 && stablePercent(rollKey) < remainder ? 1 : 0;
    return Math.min(20, guaranteed + extra);
  }

  function frontendContinuousAttackIntervalSeconds(skill: SkillPreview) {
    return Math.max(0.05, skillReleaseIntervalSeconds(skill) / 1.2);
  }

  function frontendContinuousAttackSkill(skill: SkillPreview, repeatIndex: number) {
    const stepPercent = Math.max(0, Number(skill.runtime_params?.continuous_attack_damage_step_percent ?? 0));
    const stepFinalPercent = Math.max(0, Number(skill.runtime_params?.continuous_attack_damage_step_final_percent ?? 0));
    const damageMultiplier = Math.max(0, 1 + (stepPercent * (1 + stepFinalPercent / 100) * repeatIndex) / 100);
    const finalDamageComponents = skill.final_damage_components
      ? Object.fromEntries(Object.entries(skill.final_damage_components)
          .map(([damageType, amount]) => [damageType, Math.max(0, Number(amount ?? 0) * damageMultiplier)]))
      : undefined;
    return {
      ...skill,
      final_damage: Math.max(0, Number(skill.final_damage ?? 0) * damageMultiplier),
      non_crit_damage: Math.max(0, Number(skill.non_crit_damage ?? skill.final_damage ?? 0) * damageMultiplier),
      expected_hit_damage: Math.max(0, Number(skill.expected_hit_damage ?? skill.final_damage ?? 0) * damageMultiplier),
      final_damage_components: finalDamageComponents,
      runtime_params: {
        ...(skill.runtime_params ?? {}),
        continuous_attack_repeat_index: repeatIndex,
        continuous_attack_damage_multiplier: damageMultiplier
      }
    };
  }

  function enqueueFrontendContinuousAttack(skill: SkillPreview) {
    if (!isFrontendContinuousAttackEligible(skill)) return;
    const repeats = frontendContinuousAttackRepeatCount(skill);
    if (repeats <= 0) return;
    continuousAttackRuntime.current = {
      skillId: skill.active_gem_instance_id,
      skill,
      repeatsRemaining: repeats,
      nextRepeatIndex: 1,
      remainingSeconds: frontendContinuousAttackIntervalSeconds(skill)
    };
  }

  function processFrontendContinuousAttack(dt: number, current: Enemy[]) {
    const runtime = continuousAttackRuntime.current;
    if (!runtime) return false;
    runtime.remainingSeconds -= dt;
    if (runtime.remainingSeconds > 0) return true;
    if (runtime.repeatsRemaining <= 0) {
      continuousAttackRuntime.current = null;
      return false;
    }
    const repeatSkill = frontendContinuousAttackSkill(runtime.skill, runtime.nextRepeatIndex);
    const released = hitEnemies(current, repeatSkill, { isContinuousRepeat: true });
    if (!released) {
      continuousAttackRuntime.current = null;
      return true;
    }
    runtime.repeatsRemaining -= 1;
    runtime.nextRepeatIndex += 1;
    runtime.remainingSeconds = frontendContinuousAttackIntervalSeconds(runtime.skill);
    if (runtime.repeatsRemaining <= 0) continuousAttackRuntime.current = null;
    return true;
  }

  function trySpendSkillMana(skill: SkillPreview) {
    const cost = skillManaCost(skill);
    if (cost <= 0) return true;
    const currentMana = playerStateRef.current.currentMana;
    if (currentMana < cost) {
      setCombatLogs((logs) => [`${skill.name_text} 魔力不足。`, ...logs].slice(0, 8));
      return false;
    }
    setRuntimePlayer((current) => ({
      ...current,
      currentMana: clamp(current.currentMana - cost, 0, current.maxMana)
    }));
    return true;
  }

  function frontendRuntimeNumber(skill: SkillPreview, key: string, fallback: number) {
    const value = skill.runtime_params?.[key] ?? skill.hit?.[key] ?? skill.cast?.[key];
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function frontendRuntimeMaxTargets(skill: SkillPreview, fallback = 1) {
    return Math.max(1, Math.round(frontendRuntimeNumber(skill, "max_targets", fallback)));
  }

  function frontendRuntimeRange(skill: SkillPreview, fallback = 420) {
    return Math.max(
      1,
      frontendRuntimeNumber(skill, "max_distance", frontendRuntimeNumber(skill, "search_range", fallback))
        * Math.max(0.1, skill.area_multiplier)
    );
  }

  function isFrontendSelfBuffSkill(skill: SkillPreview) {
    return skill.cast?.target_selector === "self"
      || Number(skill.runtime_params?.guard_absorb_amount ?? 0) > 0
      || Number(skill.runtime_params?.guard_absorb_percent ?? 0) > 0;
  }

  function frontendNearestSkillTargets(current: Enemy[], source: { x: number; y: number }, range: number, maxTargets: number) {
    return [...current]
      .filter((enemy) => enemy.hp > 0 && distance(enemy, source) <= range)
      .sort((a, b) => distance(a, source) - distance(b, source))
      .slice(0, maxTargets);
  }

  function frontendCircleSkillTargets(current: Enemy[], center: { x: number; y: number }, radius: number, maxTargets: number) {
    return [...current]
      .filter((enemy) => enemy.hp > 0 && distance(enemy, center) <= radius)
      .sort((a, b) => distance(a, center) - distance(b, center))
      .slice(0, maxTargets);
  }

  function frontendMeleeArcTargets(
    current: Enemy[],
    origin: { x: number; y: number },
    direction: { x: number; y: number },
    radius: number,
    arcAngle: number,
    maxTargets: number
  ) {
    const facing = normalizedWorldDirection(direction);
    return [...current]
      .filter((enemy) => {
        if (enemy.hp <= 0 || distance(enemy, origin) > radius) return false;
        const toEnemy = normalizedWorldDirection({ x: enemy.x - origin.x, y: enemy.y - origin.y });
        const angle = Math.acos(clamp(facing.x * toEnemy.x + facing.y * toEnemy.y, -1, 1)) * 180 / Math.PI;
        return angle <= arcAngle / 2;
      })
      .sort((a, b) => distance(a, origin) - distance(b, origin))
      .slice(0, maxTargets);
  }

  function frontendSkillDamageAgainstEnemy(skill: SkillPreview, enemy: Enemy, amount = skill.final_damage) {
    const components = damagePayloadComponents(skill, Number(amount ?? 0), skill.damage_type, skill.hit as Record<string, unknown>);
    const resistancePenetrationPercent = Number(skill.runtime_params?.resistance_penetration_percent ?? 0);
    const armorReductionPenetrationPercent = Number(skill.runtime_params?.armor_reduction_penetration_percent ?? 0);
    const rollKey = `skill:${skill.active_gem_instance_id}:${enemy.id}:${Math.round(elapsedRef.current * 1000)}`;
    return Object.entries(components).reduce((total, [damageType, value]) => {
      return total + scaledDamageAgainstEnemy(damageType, Number(value ?? 0), enemy, resistancePenetrationPercent, armorReductionPenetrationPercent, rollKey);
    }, 0);
  }

  function frontendRuntimeRoll(skill: SkillPreview, enemy: Enemy, salt: number) {
    const skillHash = Array.from(skill.active_gem_instance_id).reduce((total, char) => total + char.charCodeAt(0), 0);
    const raw = Math.sin(enemy.id * 12.9898 + skillHash * 0.193 + salt * 78.233) * 43758.5453;
    return raw - Math.floor(raw);
  }

  function frontendSkillStatusBuffs(skill: SkillPreview, enemy: Enemy): EnemyBuff[] {
    const hit = skill.hit as Record<string, unknown> | undefined;
    const ailments = Array.isArray(hit?.ailments) ? hit.ailments as Record<string, unknown>[] : [];
    const statusBuffs: EnemyBuff[] = [];
    ailments.forEach((ailment, index) => {
      const chance = clamp(Number(ailment.chance_percent ?? 0) / 100, 0, 1);
      if (chance <= 0 || frontendRuntimeRoll(skill, enemy, index + 101) > chance) return;
      const statusType = String(ailment.type ?? "");
      if (!statusType) return;
      const duration = Math.max(0.1, Number(ailment.duration_ms ?? 0) / 1000);
      statusBuffs.push({
        buffType: statusType,
        statusType,
        polarity: "negative",
        remaining: duration,
        duration,
        valuePercent: Math.max(0, Number(ailment.effect_per_stack ?? ailment.base_value ?? 0)),
        baseValue: Math.max(0, Number(ailment.base_value ?? 0)),
        baseDamagePerSecond: Math.max(0, Number(ailment.base_damage_per_second ?? 0) * frontendSkillAilmentDamageMultiplier(skill)),
        damageType: String(ailment.source_damage_type ?? skill.damage_type),
        nextFloatingTextIn: DOT_FLOATING_TEXT_INTERVAL_SECONDS,
        sourceSkillId: skill.skill_package_id ?? skill.skill_template_id
      });
    });
    return statusBuffs;
  }

  function mergeFrontendEnemyBuffs(enemy: Enemy, buffs: EnemyBuff[]) {
    if (buffs.length === 0) return enemy;
    let activeBuffs = [...(enemy.activeBuffs ?? [])];
    for (const buff of buffs) {
      const existing = activeBuffs.find((item) => item.statusType === buff.statusType && item.sourceSkillId === buff.sourceSkillId);
      const merged = existing
        ? {
            ...buff,
            remaining: Math.max(existing.remaining, buff.remaining),
            baseValue: (existing.baseValue ?? 0) + (buff.baseValue ?? 0),
            baseDamagePerSecond: Math.max(existing.baseDamagePerSecond ?? 0, buff.baseDamagePerSecond ?? 0)
          }
        : buff;
      activeBuffs = [
        ...activeBuffs.filter((item) => !(item.statusType === buff.statusType && item.sourceSkillId === buff.sourceSkillId)),
        merged
      ];
    }
    return { ...enemy, activeBuffs };
  }

  function applyFrontendGuardRuntime(skill: SkillPreview) {
    const absorbAmount = frontendRuntimeNumber(skill, "guard_absorb_amount", 0);
    const absorbPercent = frontendRuntimeNumber(skill, "guard_absorb_percent", 0);
    const duration = Math.max(0, frontendRuntimeNumber(skill, "guard_duration_ms", 0)) / 1000;
    if (absorbAmount <= 0 || absorbPercent <= 0 || duration <= 0) return false;
    const skillId = skill.skill_package_id ?? skill.skill_template_id;
    const nextBuff: PlayerBuff = {
      id: nextPlayerBuffId.current++,
      buffType: "guard",
      skillId,
      remaining: duration,
      duration,
      remainingAmount: absorbAmount,
      absorbPercent,
      excludeDamageOverTime: Boolean(skill.runtime_params?.guard_exclude_damage_over_time),
      vfxKey: skill.visual_effect
    };
    setRuntimePlayerBuffs([
      ...activePlayerBuffsRef.current.filter((buff) => !(buff.buffType === nextBuff.buffType && buff.skillId === nextBuff.skillId)),
      nextBuff
    ]);
    setAreaNovas((items) => capRuntimeVisualBudget([
      ...items,
      {
        id: nextAreaNovaId.current++,
        x: playerStateRef.current.x,
        y: playerStateRef.current.y,
        radius: Math.max(24, frontendRuntimeNumber(skill, "radius", 72)),
        ringWidth: Math.max(8, frontendRuntimeNumber(skill, "ring_width", 24)),
        ttl: Math.min(duration, 1.2),
        duration: Math.min(duration, 1.2),
        damageType: skill.damage_type,
        vfxKey: skill.visual_effect,
        skillId,
        followPlayer: true,
        vfxScale: skillPreviewVfxScale(skill)
      }
    ], MAX_RUNTIME_AREA_VFX));
    return true;
  }

  function applyFrontendSkillHits(
    current: Enemy[],
    skill: SkillPreview,
    hitTargets: Array<{ enemy: Enemy; damageAmount?: number; statusBuffs?: EnemyBuff[] }>
  ) {
    const damageByTarget = new Map<number, number>();
    const buffsByTarget = new Map<number, EnemyBuff[]>();
    const targetById = new Map(hitTargets.map((hit) => [hit.enemy.id, hit.enemy]));
    hitTargets.forEach((hit) => {
      const damage = frontendSkillDamageAgainstEnemy(skill, hit.enemy, hit.damageAmount ?? skill.final_damage);
      damageByTarget.set(hit.enemy.id, (damageByTarget.get(hit.enemy.id) ?? 0) + damage);
      const buffs = [...frontendSkillStatusBuffs(skill, hit.enemy), ...(hit.statusBuffs ?? [])];
      if (buffs.length > 0) buffsByTarget.set(hit.enemy.id, [...(buffsByTarget.get(hit.enemy.id) ?? []), ...buffs]);
    });
    if (damageByTarget.size === 0 && buffsByTarget.size === 0) return current;
    const nextTexts: FloatingText[] = [];
    const killedTargets: Enemy[] = [];
    const survivors = current
      .map((enemy) => {
        const damage = damageByTarget.get(enemy.id) ?? 0;
        const buffs = buffsByTarget.get(enemy.id) ?? [];
        if (damage <= 0 && buffs.length === 0) return enemy;
        const damageResult = applyDamageToEnemyResources(enemy, damage);
        const hp = damageResult.hp;
        if (damage > 0) {
          nextTexts.push({
            id: nextTextId.current++,
            x: enemy.x,
            y: enemy.y - 28,
            text: Math.round(damage).toString(),
            damageType: skill.damage_type,
            ttl: 0.8,
            duration: 0.8
          });
        }
        const damagedEnemy = mergeFrontendEnemyBuffs({ ...enemy, ...damageResult, lastDamagedAt: damage > 0 ? elapsedRef.current : enemy.lastDamagedAt }, buffs);
        if (enemy.hp > 0 && hp <= 0) killedTargets.push(targetById.get(enemy.id) ?? enemy);
        return damagedEnemy;
      })
      .filter((enemy) => shouldRetainEnemyForGameplayOrDamageFlash(enemy, elapsedRef.current));
    const killed = killedTargets.length;
    if (killed > 0) {
      setKills((value) => value + killed);
      void spawnFrontendDrops(killedTargets);
      setCombatLogs((logs) => [`${skill.name_text} 击杀 ${killed} 个怪物。`, ...logs].slice(0, 8));
    } else {
      setCombatLogs((logs) => [`${skill.name_text} 自动释放。`, ...logs].slice(0, 8));
    }
    if (nextTexts.length > 0) {
      setTexts((items) => capRuntimeVisualBudget([...items, ...nextTexts], MAX_RUNTIME_FLOATING_TEXT));
    }
    return survivors;
  }

  function frontendSkillEvent(
    skill: SkillPreview,
    type: SkillEvent["type"],
    target: Enemy | null,
    position: { x: number; y: number },
    direction: { x: number; y: number },
    amount: number | null,
    damageType = skill.damage_type,
    payload: Record<string, unknown> = {},
    durationMs = 0,
    delayMs = 0
  ): SkillEvent {
    const nowMs = Math.round(elapsedRef.current * 1000);
    return {
      event_id: `frontend_${type}_${skill.active_gem_instance_id}_${target?.id ?? "area"}_${nowMs}_${nextTextId.current++}`,
      type,
      timestamp_ms: nowMs + delayMs,
      source_entity: "player",
      target_entity: target ? String(target.id) : "",
      position,
      direction,
      delay_ms: delayMs,
      duration_ms: durationMs,
      amount,
      damage_type: damageType,
      skill_instance_id: skill.active_gem_instance_id,
      vfx_key: String(payload.vfx_key ?? skill.visual_effect),
      sfx_key: "",
      reason_key: String(payload.reason_key ?? "frontend_client_skill_runtime"),
      payload: {
        skill_id: skill.skill_package_id ?? skill.skill_template_id,
        skill_name: skill.name_text,
        vfx_scale: skillPreviewVfxScale(skill),
        ...payload
      }
    };
  }

  function frontendSkillVfxKey(skill: SkillPreview, role: "cast" | "projectile" | "hit" | "zone" | "segment" = "hit", fallback?: unknown) {
    const keys = skill.presentation_keys ?? {};
    const params = skill.runtime_params ?? {};
    const candidates = [
      fallback,
      role === "projectile" ? keys.projectile_vfx_key : undefined,
      role === "hit" ? keys.hit_vfx_key : undefined,
      role === "cast" ? keys.cast_vfx_key : undefined,
      role === "zone" ? params.zone_vfx_key : undefined,
      role === "segment" ? params.segment_vfx_key : undefined,
      keys.vfx,
      skill.visual_effect,
      skill.skill_package_id,
      skill.skill_template_id
    ];
    const value = candidates.find((candidate) => typeof candidate === "string" && candidate.length > 0);
    return String(value ?? skill.visual_effect);
  }

  function convertedDamageType(skill: SkillPreview, hitConfig?: Record<string, unknown>) {
    const conversions = Array.isArray(hitConfig?.damage_conversions)
      ? hitConfig.damage_conversions as Record<string, unknown>[]
      : Array.isArray(skill.hit?.damage_conversions)
        ? skill.hit.damage_conversions as Record<string, unknown>[]
        : [];
    const fullConversion = conversions.find((conversion) => Number(conversion.percent ?? 0) >= 100 && typeof conversion.to === "string");
    return String(fullConversion?.to ?? skill.damage_type);
  }

  function damagePayloadComponents(skill: SkillPreview, amount: number, damageType: string, hitConfig?: Record<string, unknown>) {
    const explicitComponents = hitConfig?.damage_components;
    if (
      skill.final_damage_components
      && typeof skill.final_damage_components === "object"
      && !Array.isArray(skill.final_damage_components)
      && !damageComponentsContainTrueDamage(explicitComponents)
    ) {
      const ratio = Number(skill.final_damage ?? 0) > 0 ? amount / Number(skill.final_damage) : 1;
      return Object.fromEntries(Object.entries(skill.final_damage_components)
        .map(([componentType, componentAmount]) => [componentType, Math.max(0, Number(componentAmount ?? 0) * ratio)])
        .filter((entry): entry is [string, number] => typeof entry[1] === "number" && entry[1] > 0));
    }
    if (explicitComponents && typeof explicitComponents === "object" && !Array.isArray(explicitComponents)) {
      return convertFrontendDamageComponents(
        Object.fromEntries(Object.entries(explicitComponents as Record<string, unknown>)
          .map(([componentType, componentAmount]) => [componentType, Number(componentAmount ?? 0)])),
        frontendDamageConversions(skill, hitConfig)
      );
    }
    return { [damageType]: amount };
  }

  function damageComponentsContainTrueDamage(components: unknown) {
    return Boolean(components && typeof components === "object" && !Array.isArray(components) && "true" in components);
  }

  function mergeFrontendDamageComponents(...componentMaps: Record<string, number>[]) {
    const merged: Record<string, number> = {};
    for (const components of componentMaps) {
      for (const [damageType, amount] of Object.entries(components)) {
        addFrontendDamageComponent(merged, damageType, Number(amount ?? 0));
      }
    }
    return merged;
  }

  function frontendEquipmentGrantedDamageComponents(
    skill: SkillPreview,
    target: Enemy,
    payload: Record<string, unknown>,
    primaryDamageType: string
  ) {
    const effects = Array.isArray(skill.runtime_params?.frontend_equipment_granted_effects)
      ? skill.runtime_params.frontend_equipment_granted_effects as Record<string, unknown>[]
      : [];
    const components: Record<string, number> = {};
    const floatingComponents: Record<string, unknown>[] = [];
    const applied: Record<string, unknown>[] = [];
    effects.forEach((effect, index) => {
      if (effect.effect_kind !== "direct_damage") return;
      if (!frontendGrantedEffectTriggerMatches(skill, effect)) return;
      const damageType = String(effect.damage_type ?? primaryDamageType);
      const resolvedDamageType = damageType === "generic" ? primaryDamageType : damageType;
      const min = Number(effect.value_min ?? effect.value ?? 0);
      const max = Number(effect.value_max ?? effect.value ?? min);
      const low = Math.min(min, max);
      const high = Math.max(min, max);
      const seed = [
        skill.active_gem_instance_id,
        target.id,
        payload.marker_id ?? payload.projectile_id ?? payload.secondary_hit_id ?? payload.area_id ?? "hit",
        effect.id ?? effect.source_modifier_id ?? index,
        Math.round(elapsedRef.current * 1000)
      ].join(":");
      const rolled = low + (high - low) * stablePercent(seed) / 100;
      const amount = rolled * Math.max(0, Number(effect.damage_multiplier ?? 1));
      if (amount <= 0) return;
      addFrontendDamageComponent(components, resolvedDamageType, amount);
      floatingComponents.push({
        source: "equipment_granted_direct_damage",
        id: effect.id,
        direct_damage_module_id: effect.direct_damage_module_id,
        trigger_condition: effect.trigger_condition,
        damage_type: resolvedDamageType,
        amount
      });
      applied.push({
        id: effect.id,
        trigger_condition: effect.trigger_condition,
        direct_damage_module_id: effect.direct_damage_module_id,
        damage_type: resolvedDamageType,
        amount
      });
    });
    return { components, floatingComponents, applied };
  }

  function frontendGrantedEffectTriggerMatches(skill: SkillPreview, effect: Record<string, unknown>) {
    const condition = String(effect.trigger_condition ?? "hit");
    const tags = new Set(Array.isArray(skill.runtime_params?.frontend_skill_tags) ? skill.runtime_params.frontend_skill_tags.map(String) : []);
    if (condition === "hit") return true;
    if (condition === "attack_hit") return tags.has("attack");
    if (condition === "spell_hit") return tags.has("spell");
    return false;
  }

  function ailmentConfigsForHit(skill: SkillPreview, hitConfig?: Record<string, unknown>): FrontendAilmentConfig[] {
    const configs: FrontendAilmentConfig[] = Array.isArray(hitConfig?.ailments)
      ? [...hitConfig.ailments as FrontendAilmentConfig[]]
      : Array.isArray(skill.hit?.ailments)
        ? [...skill.hit.ailments as FrontendAilmentConfig[]]
        : [];
    const damageType = convertedDamageType(skill, hitConfig);
    if (damageType === "cold" && !configs.some((item) => item.type === "frostbite")) {
      configs.push({ type: "frostbite", chance_percent: 0, duration_ms: 2000, base_value: 10, effect_per_stack: 10, source_damage_type: "cold" });
    }
    if (damageType === "lightning" && !configs.some((item) => item.type === "numbed")) {
      const effect = 5 * (1 + Number(skill.runtime_params?.numbed_effect_add_percent ?? 0) / 100);
      configs.push({ type: "numbed", chance_percent: 0, duration_ms: 2000, base_value: effect, effect_per_stack: effect, max_stacks: 10, source_damage_type: "lightning" });
    }
    if (damageType === "chaos" && Number(skill.runtime_params?.deterioration_chance_add_percent ?? 0) > 0) {
      configs.push({
        type: "deterioration",
        chance_percent: Number(skill.runtime_params?.deterioration_chance_add_percent ?? 0),
        duration_ms: 1000 * (1 + (Number(skill.runtime_params?.duration_add_percent ?? 0) + Number(skill.runtime_params?.deterioration_duration_add_percent ?? 0)) / 100),
        base_value: Number(skill.final_damage ?? 0) * 0.6 * (1 + Number(skill.runtime_params?.deterioration_damage_add_percent ?? 0) / 100),
        effect_per_stack: 0,
        max_stacks: 99,
        source_damage_type: "chaos"
      });
    }
    return configs.map((config) => {
      const type = String(config.type ?? "");
      const durationAdd = Number(skill.runtime_params?.duration_add_percent ?? 0)
        + Number(skill.runtime_params?.ailment_duration_add_percent ?? 0)
        + (type === "ignite" ? Number(skill.runtime_params?.ignite_duration_add_percent ?? 0) : 0)
        + (type === "trauma" ? Number(skill.runtime_params?.trauma_duration_add_percent ?? 0) : 0);
      const nextConfig: FrontendAilmentConfig = {
        ...config,
        duration_ms: Number(config.duration_ms ?? 0) * (1 + durationAdd / 100),
      };
      if (type === "ignite") {
        nextConfig.base_damage_per_second = Number(nextConfig.base_damage_per_second ?? 0)
          + Number(skill.runtime_params?.added_base_ignite_damage_per_second ?? 0)
          + Number(skill.runtime_params?.added_base_ailment_damage_per_second ?? 0);
        nextConfig.max_stacks = Number(nextConfig.max_stacks ?? 1) + Number(skill.runtime_params?.ignite_stacks_add ?? 0);
      }
      if (type === "trauma") {
        nextConfig.base_damage_per_second = Number(nextConfig.base_damage_per_second ?? 0)
          + Number(skill.runtime_params?.added_base_trauma_damage_per_second ?? 0)
          + Number(skill.runtime_params?.added_base_ailment_damage_per_second ?? 0);
      }
      if (type === "frostbite") {
        const maxValue = 100 + Number(skill.runtime_params?.frostbite_max_value_add ?? 0);
        nextConfig.threshold = maxValue;
        nextConfig.max_value = maxValue;
      }
      return nextConfig;
    });
  }

  function frontendStatusEventsForTarget(
    skill: SkillPreview,
    target: Enemy,
    position: { x: number; y: number },
    direction: { x: number; y: number },
    hitConfig?: Record<string, unknown>,
    delayMs = 0
  ) {
    return ailmentConfigsForHit(skill, hitConfig).flatMap((ailment, index) => {
      const chance = clamp(Number(ailment.chance_percent ?? 0) / 100, 0, 1);
      if (chance <= 0 || frontendRuntimeRoll(skill, target, index + 701) > chance) return [];
      const statusType = String(ailment.type ?? "");
      if (!statusType) return [];
      const durationMs = Math.max(0, Number(ailment.duration_ms ?? 0));
      return [frontendSkillEvent(skill, "status_apply", target, position, direction, null, String(ailment.source_damage_type ?? skill.damage_type), {
        status_type: statusType,
        source_skill_id: skill.skill_package_id ?? skill.skill_template_id,
        duration_ms: durationMs,
        base_value: Number(ailment.base_value ?? 0),
        effect_per_stack: Number(ailment.effect_per_stack ?? ailment.base_value ?? 0),
        base_damage_per_second: Number(ailment.base_damage_per_second ?? 0),
        damage_over_time_more_percent: Number(ailment.damage_over_time_more_percent ?? 0),
        dot_damage_add_percent: Number(skill.runtime_params?.dot_damage_add_percent ?? 0),
        ailment_damage_add_percent: Number(skill.runtime_params?.ailment_damage_add_percent ?? 0),
        ailment_damage_deepen_percent: Number(skill.runtime_params?.ailment_damage_deepen_percent ?? 0),
        max_stacks: Number(ailment.max_stacks ?? 1)
      }, durationMs, delayMs)];
    });
  }

function frontendDamageEventsForTarget(
    skill: SkillPreview,
    target: Enemy,
    position: { x: number; y: number },
    direction: { x: number; y: number },
    amount: number,
    hitConfig?: Record<string, unknown>,
    payload: Record<string, unknown> = {},
    delayMs = 0
  ) {
    const forcedDamageType = typeof payload.forced_element_type === "string"
      ? String(payload.forced_element_type)
      : "";
    const damageType = forcedDamageType || convertedDamageType(skill, hitConfig);
    const hitVfxKey = String(payload.hit_vfx_key ?? payload.vfx_key ?? frontendSkillVfxKey(skill, "hit"));
    const emitHitVfx = payload.emit_hit_vfx !== false && !payload.tick_interval_ms;
    const payloadDamageComponents = payload.damage_components;
    const baseDamageComponents = payloadDamageComponents
      && typeof payloadDamageComponents === "object"
      && !Array.isArray(payloadDamageComponents)
      ? Object.fromEntries(Object.entries(payloadDamageComponents as Record<string, unknown>)
        .map(([componentType, componentAmount]) => [componentType, Number(componentAmount ?? 0)])
        .filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]) && entry[1] > 0))
      : damagePayloadComponents(skill, amount, damageType, hitConfig);
    const grantedDamage = frontendEquipmentGrantedDamageComponents(skill, target, payload, damageType);
    const damageComponents = mergeFrontendDamageComponents(baseDamageComponents, grantedDamage.components);
    const floatingDamageComponents = [
      ...frontendFloatingDamageComponentPayload(baseDamageComponents, "skill_direct_damage"),
      ...grantedDamage.floatingComponents
    ];
    const impactRadius = frontendSkillHitImpactRadius(skill, hitConfig, payload);
    const damagePayload = {
      ...payload,
      damage_conversions: hitConfig?.damage_conversions ?? skill.hit?.damage_conversions ?? [],
      armor_reduction_penetration_percent: skill.runtime_params?.armor_reduction_penetration_percent,
      resistance_penetration_percent: skill.runtime_params?.resistance_penetration_percent,
      cull_threshold_percent: skill.runtime_params?.cull_threshold_percent,
      double_damage_chance_percent: skill.runtime_params?.double_damage_chance_percent,
      numbed_effect_add_percent: skill.runtime_params?.numbed_effect_add_percent,
      equipment_granted_direct_damage: grantedDamage.applied,
      damage_components: damageComponents,
      floating_damage_components: floatingDamageComponents,
      hit_world_position: position,
      impact_radius: impactRadius,
      hit_vfx_key: hitVfxKey
    };
    const eventAmount = frontendDamageMapTotal(damageComponents) || amount;
    const events = [
      frontendSkillEvent(skill, "damage", target, position, direction, eventAmount, damageType, damagePayload, 0, delayMs),
      frontendSkillEvent(skill, "floating_text", target, { x: position.x, y: position.y - 28 }, direction, eventAmount, damageType, damagePayload, 800, delayMs),
      ...frontendStatusEventsForTarget(skill, target, position, direction, hitConfig, delayMs),
      ...frontendKnockbackEventsForTarget(skill, target, position, direction, damagePayload, delayMs)
    ];
    if (emitHitVfx) {
      events.push(frontendSkillEvent(skill, "hit_vfx", target, position, direction, amount, damageType, {
        ...damagePayload,
        vfx_key: hitVfxKey,
        hit_world_position: position,
        impact_world_position: position
      }, 360, delayMs));
    }
    return events;
  }

  function frontendKnockbackEventsForTarget(
    skill: SkillPreview,
    target: Enemy,
    position: { x: number; y: number },
    direction: { x: number; y: number },
    payload: Record<string, unknown>,
    delayMs = 0
  ) {
    const chancePercent = clamp(statValue(skill.skill_stats, "knockback_chance_percent"), 0, 100);
    if (chancePercent <= 0) return [];
    const hitMarker = payload.projectile_id
      ?? payload.secondary_hit_id
      ?? payload.area_id
      ?? payload.tick_time_ms
      ?? payload.tick_index
      ?? payload.flame_wave_index
      ?? "hit";
    const rollSeed = `${skill.active_gem_instance_id}:${target.id}:${Math.round(elapsedRef.current * 1000)}:${hitMarker}:knockback`;
    if (stablePercent(rollSeed) > chancePercent) return [];
    const distanceAddPercent = statValue(skill.skill_stats, "knockback_distance_add_percent");
    const movementDistance = FRONTEND_BASE_KNOCKBACK_DISTANCE * Math.max(0, 1 + distanceAddPercent / 100);
    if (movementDistance <= 0) return [];
    const knockbackOrigin = playerStateRef.current;
    const knockbackDirection = guideDirection(knockbackOrigin, target);
    const knockbackPayload = {
      ...payload,
      origin_world_position: knockbackOrigin,
      movement_policy: "push_along_direction",
      movement_distance: movementDistance,
      knockback_chance_percent: chancePercent,
      knockback_distance_add_percent: distanceAddPercent,
      knockback_lock_ms: FRONTEND_KNOCKBACK_LOCK_MS
    };
    return [
      frontendSkillEvent(skill, "forced_movement", target, position, knockbackDirection, movementDistance, skill.damage_type, knockbackPayload, 0, delayMs),
      frontendSkillEvent(skill, "floating_text", target, { x: position.x, y: position.y - 52 }, knockbackDirection, 0, skill.damage_type, {
        ...knockbackPayload,
        text: "击退"
      }, 650, delayMs)
    ];
  }

  function frontendFloatingDamageComponentPayload(components: Record<string, number>, source: string) {
    return Object.entries(components)
      .map(([damageType, amount]) => ({
        source,
        damage_type: damageType,
        amount: Number(amount ?? 0)
      }))
      .filter((item) => Number.isFinite(item.amount) && item.amount > 0);
  }

  function frontendSkillHitImpactRadius(skill: SkillPreview, hitConfig?: Record<string, unknown>, payload: Record<string, unknown> = {}) {
    if (payload.impact_radius !== undefined) return Math.max(1, Number(payload.impact_radius ?? 18));
    const baseRadius = Number(
      hitConfig?.impact_radius
      ?? hitConfig?.hit_radius
      ?? skill.runtime_params?.impact_radius
      ?? skill.hit?.hit_radius
      ?? 18
    );
    const areaMultiplier = Math.max(0.05, Number(skill.area_multiplier ?? 1));
    return Math.max(1, baseRadius * areaMultiplier);
  }

  function frontendSecondaryHitAmount(skill: SkillPreview, secondary: SecondaryHitConfig) {
    const baseAmount = Math.max(0, Number(secondary.base_damage ?? secondary.weapon_attack_percent ?? skill.final_damage ?? 0));
    return frontendScaledSkillConfigDamageAmount(skill, baseAmount);
  }

  function frontendScaledSkillConfigDamageAmount(skill: SkillPreview, baseAmount: number) {
    const primaryBaseAmount = Math.max(0, Number(skill.base_damage ?? skill.hit?.base_damage ?? 0));
    const primaryFinalAmount = Math.max(0, Number(skill.non_crit_damage ?? skill.final_damage ?? 0));
    if (baseAmount <= 0 || primaryBaseAmount <= 0 || primaryFinalAmount <= 0) return baseAmount;
    return baseAmount * (primaryFinalAmount / primaryBaseAmount);
  }

  function frontendUniqueTargetsByDistance(
    current: Enemy[],
    origin: { x: number; y: number },
    radius: number,
    maxTargets: number,
    excludeIds = new Set<number>()
  ) {
    return candidateEnemiesNear(current, origin, radius)
      .filter((enemy) => enemy.hp > 0 && !excludeIds.has(enemy.id) && distance(enemy, origin) <= radius)
      .sort((a, b) => distance(a, origin) - distance(b, origin))
      .slice(0, Math.max(1, maxTargets));
  }

  function consumeSkillEventTimeline(events: SkillEvent[]) {
    if (events.length === 0) return;
    const immediate: SkillEvent[] = [];
    for (const event of events) {
      const delaySeconds = Math.max(0, Number(event.delay_ms ?? 0)) / 1000;
      if (delaySeconds <= 0) {
        immediate.push(event);
      } else {
        scheduledSkillEvents.current.push({ event, remaining: delaySeconds });
      }
    }
    if (immediate.length > 0) consumeSkillEventBatch(immediate);
  }

  function releaseFrontendPlayableSkill(skill: SkillPreview, current: Enemy[], options: { manaAlreadySpent?: boolean } = {}) {
    const runtimeSkill = applyFrontendWarIntentToSkill(skill);
    if (applyFrontendGuardRuntime(runtimeSkill)) {
      if (!options.manaAlreadySpent && !trySpendSkillMana(skill)) return false;
      setCombatLogs((logs) => [`${skill.name_text} 获得防护。`, ...logs].slice(0, 8));
      return true;
    }
    const caster = playerStateRef.current;
    const behavior = runtimeSkill.behavior_template ?? runtimeSkill.behavior_type;
    const range = frontendRuntimeRange(runtimeSkill, 520);
    const targets = frontendNearestSkillTargets(current, caster, range, Math.max(1, runtimeSkill.projectile_count));
    const runtimeTags = frontendSkillTags(runtimeSkill);
    const isChannelDamageZone = runtimeTags.has("channel")
      || Number(runtimeSkill.runtime_params?.channel_max_stacks ?? 0) > 0
      || Boolean(runtimeSkill.runtime_params?.channel_tick_during_channel);
    const canReleaseWithoutEnemyTarget = behavior === "damage_zone"
      && !isChannelDamageZone
      && (
        runtimeSkill.cast?.target_selector === "self"
        || String(runtimeSkill.runtime_params?.origin_policy ?? "") === "caster"
      );
    if (targets.length === 0 && !canReleaseWithoutEnemyTarget) return false;
    const events = buildFrontendPlayableSkillEvents(runtimeSkill, caster, targets, current, behavior);
    if (events.length === 0) return false;
    if (!options.manaAlreadySpent && !trySpendSkillMana(skill)) return false;
    consumeSkillEventTimeline(events);
    setCombatLogs((logs) => [`${skill.name_text} 自动释放。`, ...logs].slice(0, 8));
    return true;
  }

  function buildFrontendPlayableSkillEvents(
    skill: SkillPreview,
    caster: PlayerRuntimeState,
    initialTargets: Enemy[],
    current: Enemy[],
    behavior: string | undefined
  ) {
    const runtimeFamily = frontendPlayableSkillRuntimeFamilyForBehavior(
      isProjectileSkillTemplate(behavior) ? "projectile" : behavior,
      skillHasProjectileDamageZoneModules(skill)
    );
    if (runtimeFamily === "module_chain") return buildFrontendModuleChainSkillEvents(skill, caster, initialTargets, current);
    if (runtimeFamily === "projectile") return buildFrontendProjectileSkillEvents(skill, caster, initialTargets, current);
    if (runtimeFamily === "chain") return buildFrontendChainSkillEvents(skill, caster, initialTargets, current);
    if (runtimeFamily === "damage_zone") return buildFrontendDamageZoneSkillEvents(skill, caster, initialTargets, current);
    if (runtimeFamily === "melee_arc") return buildFrontendMeleeArcSkillEvents(skill, caster, initialTargets, current);
    if (runtimeFamily === "player_nova") return buildFrontendNovaSkillEvents(skill, caster, current);
    return initialTargets.flatMap((target) => frontendDamageEventsForTarget(skill, target, { x: target.x, y: target.y }, guideDirection(caster, target), skill.final_damage, skill.hit as Record<string, unknown>));
  }

  function hitEnemies(current: Enemy[], skill: SkillPreview, options: { isContinuousRepeat?: boolean } = {}) {
    const selfBuffSkill = isFrontendSelfBuffSkill(skill);
    if (current.length === 0 && !selfBuffSkill) return false;
    if (!selfBuffSkill && !hasLiveEnemyInCastRange(current, skill, playerStateRef.current)) return false;
    const released = releaseFrontendPlayableSkill(skill, current);
    if (released && !options.isContinuousRepeat) enqueueFrontendContinuousAttack(skill);
    return released;
  }

  function buildFrontendProjectileSkillEvents(skill: SkillPreview, caster: PlayerRuntimeState, initialTargets: Enemy[], current: Enemy[]) {
    const params = skill.runtime_params ?? {};
    const events: SkillEvent[] = [];
    const timestampMs = Math.round(elapsedRef.current * 1000);
    const projectileCount = Math.max(1, Math.round(Number(params.projectile_count ?? skill.projectile_count ?? 1)));
    const allowSameTargetHits = Boolean(params.allow_same_target_projectile_hits);
    const targetPolicy = String(params.target_policy ?? "");
    const forcedElements = Array.isArray(params.forced_element_types) ? params.forced_element_types.map(String) : [];
    const forcedElement = forcedElements.length > 0 ? forcedElementDamageType(skill, timestampMs) : null;
    const burstIntervalMs = Math.max(0, Number(params.burst_interval_ms ?? 0));
    const targetPool = targetPolicy === "nearest_unique_enemy"
      ? frontendUniqueTargetsByDistance(current, caster, frontendRuntimeRange(skill, 520), projectileCount)
      : initialTargets;
    const firstTarget = targetPool[0] ?? initialTargets[0];
    const baseDirection = guideDirection(caster, firstTarget);
    const spreadDirections = projectileSpreadDirections(baseDirection, projectileCount, Number(params.spread_angle_deg ?? 0), Number(params.angle_step ?? 0));
    const hitSequences = new Map<number, number>();

    for (let index = 0; index < projectileCount; index += 1) {
      const target = allowSameTargetHits
        ? (targetPool[index % targetPool.length] ?? firstTarget)
        : (targetPool[index] ?? firstTarget);
      if (!target) continue;
      const spawn = projectileSpawnWorldPosition(caster, params);
      const directDirection = targetPolicy === "nearest_unique_enemy" || targetPolicy === "random_enemy"
        ? guideDirection(spawn, target)
        : (spreadDirections[index] ?? baseDirection);
      const jitter = Number(params.random_angle_jitter_deg ?? 0);
      const jitterRoll = jitter > 0 ? stablePercent(`${skill.active_gem_instance_id}:${timestampMs}:${index + 1}:angle_jitter`) / 100 : 0.5;
      const direction = jitter > 0 ? rotateDirection(directDirection, (jitterRoll * 2 - 1) * jitter) : directDirection;
      const projectileDelayMs = index * burstIntervalMs;
      const projectileId = `${skill.active_gem_instance_id}.projectile.${timestampMs}.${index + 1}`;
      const sameTargetSequence = hitSequences.get(target.id) ?? 0;
      hitSequences.set(target.id, sameTargetSequence + 1);
      const shotgunCoeff = Number(params.shotgun_falloff_coeff ?? 0);
      const damageScale = sameTargetSequence > 0 && shotgunCoeff > 0 ? 1 - shotgunCoeff : 1;
      const damageType = forcedElement ?? convertedDamageType(skill, skill.hit as Record<string, unknown>);
      const amount = Math.max(0, Number(skill.final_damage ?? 0)) * damageScale;
      const hitPosition = { x: target.x, y: target.y };
      const sustainedTicks = Boolean(params.sustained_ticks);
      const lifetimeMs = Math.max(
        Number(params.min_duration_ms ?? 80),
        Number(params.duration_ms ?? params.travel_time_ms ?? Math.min(Number(params.max_duration_ms ?? 2200), distance(spawn, hitPosition) / Math.max(1, Number(params.projectile_speed ?? 600)) * 1000))
      );
      const expirePosition = {
        x: spawn.x + direction.x * Number(params.max_distance ?? distance(spawn, hitPosition)),
        y: spawn.y + direction.y * Number(params.max_distance ?? distance(spawn, hitPosition))
      };
      events.push(frontendSkillEvent(skill, "projectile_spawn", target, spawn, direction, null, damageType, {
        vfx_key: frontendSkillVfxKey(skill, "projectile"),
        projectile_id: projectileId,
        projectile_index: index + 1,
        projectile_count: projectileCount,
        target_world_position: sustainedTicks ? expirePosition : hitPosition,
        expire_world_position: sustainedTicks ? expirePosition : hitPosition,
        spawn_world_position: spawn,
        spawn_policy: "caster_current_position",
        vfx_spawn_policy: "caster_current_position",
        direction_world: direction,
        velocity_world: { x: direction.x * Number(params.projectile_speed ?? 600), y: direction.y * Number(params.projectile_speed ?? 600) },
        projectile_speed: Number(params.projectile_speed ?? 600),
        projectile_width: Number(params.projectile_width ?? 38),
        projectile_height: Number(params.projectile_height ?? 24),
        impact_radius: Number(params.impact_radius ?? skill.hit?.hit_radius ?? 24) * skill.area_multiplier,
        area_scale: skill.area_multiplier,
        projectile_visual_mode: String(params.projectile_visual_mode ?? "standard"),
        trajectory: String(params.trajectory ?? "linear"),
        arc_height: Number(params.arc_height ?? 0),
        lifetime_ms: lifetimeMs,
        local_spread_angle: index === 0 ? 0 : undefined,
        burst_interval_ms: burstIntervalMs
      }, lifetimeMs, projectileDelayMs));
      if (sustainedTicks) {
        const tickIntervalMs = Math.max(1, Number(params.tick_interval_ms ?? 0));
        const activeDurationMs = Math.max(tickIntervalMs, Number(params.duration_ms ?? lifetimeMs));
        const tickCount = Math.max(1, Math.floor(activeDurationMs / tickIntervalMs));
        const tickRadius = Math.max(1, Number(params.impact_radius ?? skill.hit?.hit_radius ?? 20));
        const tickMaxTargets = Math.max(1, Math.round(Number(params.max_targets ?? 1)));
        for (let tick = 0; tick < tickCount; tick += 1) {
          const tickTimeMs = (tick + 1) * tickIntervalMs;
          const progress = clamp(tickTimeMs / Math.max(1, lifetimeMs), 0, 1);
          const tickPosition = {
            x: spawn.x + (hitPosition.x - spawn.x) * progress,
            y: spawn.y + (hitPosition.y - spawn.y) * progress
          };
          const tickDelayMs = projectileDelayMs + tickTimeMs;
          const tickTargets = frontendUniqueTargetsByDistance(current, tickPosition, tickRadius, tickMaxTargets);
          for (const tickTarget of tickTargets) {
            const tickTargetPosition = { x: tickTarget.x, y: tickTarget.y };
            const tickDamageComponents = forcedElement
              ? { [damageType]: amount }
              : damagePayloadComponents(skill, amount, damageType, skill.hit as Record<string, unknown>);
            const tickPayload = {
              projectile_id: projectileId,
              projectile_index: index + 1,
              projectile_count: projectileCount,
              tick_index: tick + 1,
              tick_time_ms: tickTimeMs,
              tick_interval_ms: tickIntervalMs,
              duration_ms: activeDurationMs,
              hit_world_position: tickTargetPosition,
              impact_world_position: tickPosition,
              projectile_world_position: tickPosition,
              target_world_position: tickTargetPosition,
              damage_components: tickDamageComponents,
              armor_reduction_penetration_percent: skill.runtime_params?.armor_reduction_penetration_percent,
              resistance_penetration_percent: skill.runtime_params?.resistance_penetration_percent,
              cull_threshold_percent: skill.runtime_params?.cull_threshold_percent,
              double_damage_chance_percent: skill.runtime_params?.double_damage_chance_percent,
              hit_vfx_key: frontendSkillVfxKey(skill, "hit")
            };
            events.push(frontendSkillEvent(skill, "damage", tickTarget, tickTargetPosition, direction, amount, damageType, tickPayload, 0, tickDelayMs));
            events.push(frontendSkillEvent(skill, "hit_vfx", tickTarget, tickTargetPosition, direction, null, damageType, {
              ...tickPayload,
              vfx_key: frontendSkillVfxKey(skill, "hit")
            }, 420, tickDelayMs));
            events.push(frontendSkillEvent(skill, "floating_text", tickTarget, { x: tickTargetPosition.x, y: tickTargetPosition.y - 28 }, direction, amount, damageType, tickPayload, 800, tickDelayMs));
          }
        }
        continue;
      }
      events.push(frontendSkillEvent(skill, "projectile_hit", target, hitPosition, direction, amount, damageType, {
        vfx_key: frontendSkillVfxKey(skill, "hit"),
        projectile_id: projectileId,
        projectile_index: index + 1,
        projectile_count: projectileCount,
        projectile_continues: false,
        hit_world_position: hitPosition,
        target_world_position: hitPosition,
        marker_id: params.impact_marker_id ?? `${skill.active_gem_instance_id}.hit`,
        hit_marker_id: params.impact_marker_id ?? `${skill.active_gem_instance_id}.hit`
      }, 0, projectileDelayMs + lifetimeMs));
      events.push(...frontendDamageEventsForTarget(skill, target, hitPosition, direction, amount, {
        ...(skill.hit as Record<string, unknown>),
        damage_conversions: forcedElement ? [] : skill.hit?.damage_conversions
      }, {
        projectile_id: projectileId,
        projectile_index: index + 1,
        projectile_count: projectileCount,
        forced_element_type: forcedElement ?? undefined,
        same_target_hit_sequence: sameTargetSequence,
        shotgun_falloff_coeff: shotgunCoeff,
        damage_components: forcedElement
          ? { [damageType]: amount }
          : damagePayloadComponents(skill, amount, damageType, skill.hit as Record<string, unknown>),
        hit_vfx_key: frontendSkillVfxKey(skill, "hit"),
        marker_id: params.impact_marker_id ?? `${skill.active_gem_instance_id}.hit`,
        on_kill_explosion_chance_percent: params.on_kill_explosion_chance_percent,
        on_kill_explosion_radius: Number(params.on_kill_explosion_radius ?? 0) * skill.area_multiplier,
        on_kill_explosion_max_life_percent: params.on_kill_explosion_max_life_percent,
        on_kill_explosion_damage_type: params.on_kill_explosion_damage_type
      }, projectileDelayMs + lifetimeMs));
      events.push(...buildFrontendSecondaryHitEvents(skill, target, hitPosition, direction, current, projectileDelayMs + lifetimeMs));
      events.push(...buildFrontendSplitProjectileEvents(skill, target, hitPosition, direction, current, projectileId, projectileDelayMs + lifetimeMs));
      events.push(...buildFrontendIgnitedHitExplosionEvents(skill, target, hitPosition, direction, current, projectileDelayMs + lifetimeMs));
    }
    return events;
  }

  function buildFrontendSecondaryHitEvents(skill: SkillPreview, triggerTarget: Enemy, triggerPosition: { x: number; y: number }, direction: { x: number; y: number }, current: Enemy[], triggerDelayMs = 0) {
    const secondaryHits = Array.isArray(skill.hit?.secondary_hits) ? skill.hit.secondary_hits as SecondaryHitConfig[] : [];
    const events: SkillEvent[] = [];
    for (const secondary of secondaryHits) {
      const placement = String(secondary.placement ?? "impact_position");
      const center = placement === "behind_target"
        ? {
            x: triggerPosition.x + direction.x * Number(secondary.offset_distance ?? 0),
            y: triggerPosition.y + direction.y * Number(secondary.offset_distance ?? 0)
          }
        : triggerPosition;
      const radius = Math.max(1, Number(secondary.radius ?? skill.hit?.hit_radius ?? 60) * skill.area_multiplier);
      const maxTargets = Math.max(1, Math.round(Number(secondary.max_targets ?? 1)));
      const targets = frontendUniqueTargetsByDistance(current, center, radius, maxTargets);
      const secondaryId = String(secondary.id ?? "secondary_hit");
      const secondaryDelayMs = triggerDelayMs + Math.max(0, Number(secondary.delay_ms ?? 0));
      events.push(frontendSkillEvent(skill, "damage_zone", null, center, direction, null, convertedDamageType(skill, secondary), {
        vfx_key: secondary.vfx_key ?? frontendSkillVfxKey(skill, "zone"),
        secondary_hit_id: secondaryId,
        shape: secondary.shape ?? "circle",
        radius,
        max_targets: maxTargets,
        hit_target_count: targets.length,
        trigger_marker_id: secondary.trigger_marker_id,
        search_module_id: secondary.search_module_id,
        direct_damage_module_id: secondary.direct_damage_module_id
      }, 180, secondaryDelayMs));
      for (const target of targets) {
        const amount = frontendSecondaryHitAmount(skill, secondary);
        events.push(frontendSkillEvent(skill, "damage_zone_hit", target, { x: target.x, y: target.y }, direction, amount, convertedDamageType(skill, secondary), {
          vfx_key: secondary.hit_vfx_key ?? secondary.vfx_key ?? frontendSkillVfxKey(skill, "hit"),
          secondary_hit_id: secondaryId,
          marker_id: secondary.hit_marker_id ?? `${secondaryId}.hit`,
          hit_world_position: { x: target.x, y: target.y },
          trigger_marker_id: secondary.trigger_marker_id,
          search_module_id: secondary.search_module_id,
          direct_damage_module_id: secondary.direct_damage_module_id
        }, 0, secondaryDelayMs));
        events.push(...frontendDamageEventsForTarget(skill, target, { x: target.x, y: target.y }, direction, amount, secondary, {
          secondary_hit_id: secondaryId,
          hit_vfx_key: secondary.hit_vfx_key ?? secondary.vfx_key ?? frontendSkillVfxKey(skill, "hit"),
          marker_id: secondary.hit_marker_id ?? `${secondaryId}.hit`,
          trigger_event_type: "target_search",
          direct_damage_module_id: secondary.direct_damage_module_id
        }, secondaryDelayMs));
      }
    }
    return events;
  }

  function buildFrontendSplitProjectileEvents(skill: SkillPreview, triggerTarget: Enemy, triggerPosition: { x: number; y: number }, direction: { x: number; y: number }, current: Enemy[], parentProjectileId: string, triggerDelayMs = 0) {
    const params = skill.runtime_params ?? {};
    const splitCount = Math.max(0, Math.round(Number(params.split_projectile_count ?? 0)));
    if (splitCount <= 0) return [];
    const events: SkillEvent[] = [];
    const center = (splitCount - 1) / 2;
    const step = Number(params.split_projectile_angle_step_deg ?? 25);
    const claimedTargetIds = new Set<number>();
    for (let index = 0; index < splitCount; index += 1) {
      const angle = (index - center) * step;
      const splitDirection = rotateDirection(direction, angle);
      const maxDistance = Number(params.split_projectile_max_distance ?? 240);
      const candidates = current
        .filter((enemy) => enemy.hp > 0 && enemy.id !== triggerTarget.id && !claimedTargetIds.has(enemy.id) && distance(enemy, triggerPosition) <= maxDistance)
        .map((enemy) => ({ enemy, angle: angleBetweenDegrees(splitDirection, guideDirection(triggerPosition, enemy)), dist: distance(enemy, triggerPosition) }))
        .sort((a, b) => a.angle - b.angle || a.dist - b.dist);
      const target = candidates[0]?.enemy;
      if (target) claimedTargetIds.add(target.id);
      const projectileId = `${parentProjectileId}.split.${index + 1}`;
      const damageType = convertedDamageType(skill, skill.hit as Record<string, unknown>);
      const amount = Number(skill.final_damage ?? 0) * Number(params.split_projectile_damage_multiplier ?? 0.5);
      const expirePosition = {
        x: triggerPosition.x + splitDirection.x * maxDistance,
        y: triggerPosition.y + splitDirection.y * maxDistance
      };
      const targetPosition = target ? { x: target.x, y: target.y } : expirePosition;
      const projectileDirection = target ? guideDirection(triggerPosition, targetPosition) : splitDirection;
      const projectileSpeed = Number(params.split_projectile_speed ?? params.projectile_speed ?? 600);
      const splitLifetimeMs = Math.max(
        Number(params.min_duration_ms ?? 80),
        Math.min(Number(params.max_duration_ms ?? 2200), distance(triggerPosition, targetPosition) / Math.max(1, projectileSpeed) * 1000)
      );
      events.push(frontendSkillEvent(skill, "projectile_spawn", target, triggerPosition, projectileDirection, null, damageType, {
        vfx_key: frontendSkillVfxKey(skill, "projectile", params.split_projectile_vfx_key),
        split_projectile: true,
        split_projectile_index: index + 1,
        projectile_id: projectileId,
        parent_projectile_id: parentProjectileId,
        projectile_index: index + 1,
        projectile_count: splitCount,
        local_spread_angle: angle,
        target_world_position: targetPosition,
        expire_world_position: expirePosition,
        spawn_world_position: triggerPosition,
        direction_world: projectileDirection,
        velocity_world: { x: projectileDirection.x * projectileSpeed, y: projectileDirection.y * projectileSpeed },
        split_search_direction_world: splitDirection,
        projectile_speed: projectileSpeed,
        projectile_width: Number(params.split_projectile_width ?? params.projectile_width ?? 38),
        projectile_height: Number(params.split_projectile_height ?? params.projectile_height ?? 24),
        pierce_count: Number(params.split_projectile_pierce_count ?? 0),
        lifetime_ms: splitLifetimeMs
      }, splitLifetimeMs, triggerDelayMs));
      if (!target) continue;
      events.push(frontendSkillEvent(skill, "projectile_hit", target, { x: target.x, y: target.y }, projectileDirection, amount, damageType, {
        vfx_key: frontendSkillVfxKey(skill, "hit"),
        split_projectile: true,
        projectile_id: projectileId,
        parent_projectile_id: parentProjectileId,
        projectile_index: index + 1,
        projectile_count: splitCount,
        projectile_continues: false,
        hit_world_position: { x: target.x, y: target.y },
        target_world_position: { x: target.x, y: target.y },
        marker_id: `${projectileId}.hit`,
        hit_marker_id: `${projectileId}.hit`
      }, 0, triggerDelayMs + splitLifetimeMs));
      events.push(...frontendDamageEventsForTarget(skill, target, { x: target.x, y: target.y }, projectileDirection, amount, skill.hit as Record<string, unknown>, {
        split_projectile: true,
        hit_vfx_key: frontendSkillVfxKey(skill, "hit"),
        split_projectile_index: index + 1,
        parent_projectile_id: parentProjectileId,
        projectile_id: projectileId,
        projectile_index: index + 1,
        projectile_count: splitCount,
        marker_id: `${projectileId}.hit`,
        damage_components: damagePayloadComponents(skill, amount, damageType, skill.hit as Record<string, unknown>)
      }, triggerDelayMs + splitLifetimeMs));
    }
    return events;
  }

  function buildFrontendIgnitedHitExplosionEvents(skill: SkillPreview, triggerTarget: Enemy, triggerPosition: { x: number; y: number }, direction: { x: number; y: number }, current: Enemy[], triggerDelayMs = 0) {
    const params = skill.runtime_params ?? {};
    const radius = Number(params.on_ignited_hit_explosion_radius ?? 0) * skill.area_multiplier;
    if (radius <= 0) return [];
    const ignite = (triggerTarget.activeBuffs ?? []).find((buff) => buff.statusType === "ignite" && buff.remaining > 0);
    if (!ignite) return [];
    const trueDamage = (ignite.baseDamagePerSecond ?? 0) * Number(params.on_ignited_hit_true_damage_percent_of_ignite_dps ?? 0) / 100;
    const fireDamage = frontendScaledSkillConfigDamageAmount(skill, Number(params.on_ignited_hit_indirect_fire_damage ?? 0));
    const amount = trueDamage + fireDamage;
    const targets = frontendUniqueTargetsByDistance(current, triggerPosition, radius, 8);
    return [
      frontendSkillEvent(skill, "damage_zone", null, triggerPosition, direction, amount, "fire", {
        secondary_hit_id: "ignited_hit_explosion",
        radius,
        max_targets: 8,
        hit_target_count: targets.length,
        vfx_key: "skill_event.active_burning_shot.ignited_hit.explosion"
      }, 240, triggerDelayMs),
      ...targets.flatMap((target) => frontendDamageEventsForTarget(skill, target, { x: target.x, y: target.y }, direction, amount, { damage_components: { true: trueDamage, fire: fireDamage } }, {
        secondary_hit_id: "ignited_hit_explosion",
        hit_vfx_key: "skill_event.active_burning_shot.ignited_hit.explosion",
        damage_components: { true: trueDamage, fire: fireDamage }
      }, triggerDelayMs))
    ];
  }

  function buildFrontendChainSkillEvents(skill: SkillPreview, caster: PlayerRuntimeState, initialTargets: Enemy[], current: Enemy[]) {
    const params = skill.runtime_params ?? {};
    const maxSegments = Math.max(1, Math.round(Number(params.chain_count ?? 1)));
    const chainRadius = Math.max(1, Number(params.chain_radius ?? skill.cast?.search_range ?? 180));
    const chainDelayMs = Math.max(0, Number(params.chain_delay_ms ?? 90));
    const events: SkillEvent[] = [];
    const hitIds = new Set<number>();
    let start: { x: number; y: number } = caster;
    let target = initialTargets[0];
    for (let index = 0; index < maxSegments && target; index += 1) {
      const segmentDelayMs = index * chainDelayMs;
      hitIds.add(target.id);
      const direction = guideDirection(start, target);
      const segmentId = `${skill.active_gem_instance_id}.chain.${Math.round(elapsedRef.current * 1000)}.${index + 1}`;
      events.push(frontendSkillEvent(skill, "chain_segment", target, start, direction, skill.final_damage, skill.damage_type, {
        vfx_key: frontendSkillVfxKey(skill, "segment"),
        segment_id: segmentId,
        segment_index: index,
        start_position: { x: start.x, y: start.y },
        end_position: { x: target.x, y: target.y },
        target_world_position: { x: target.x, y: target.y },
        hit_at_ms: segmentDelayMs
      }, 180, segmentDelayMs));
      events.push(...frontendDamageEventsForTarget(skill, target, { x: target.x, y: target.y }, direction, skill.final_damage, skill.hit as Record<string, unknown>, {
        hit_vfx_key: frontendSkillVfxKey(skill, "hit"),
        chain_segment_id: segmentId,
        segment_index: index
      }, segmentDelayMs));
      start = target;
      target = frontendUniqueTargetsByDistance(current, start, chainRadius, 1, hitIds)[0];
    }
    return events;
  }

  function buildFrontendModuleChainSkillEvents(skill: SkillPreview, caster: PlayerRuntimeState, initialTargets: Enemy[], current: Enemy[]) {
    const params = skill.runtime_params ?? {};
    const modules = Array.isArray(params.modules) ? params.modules as Array<{ id?: string; type?: string; params?: Record<string, unknown>; trigger?: Record<string, unknown> }> : [];
    const projectileModule = modules.find((module) => module.type === "projectile");
    const zoneModule = modules.find((module) => module.type === "damage_zone");
    const buffModule = modules.find((module) => module.type === "buff");
    if (!projectileModule || !zoneModule) return buildFrontendChainSkillEvents(skill, caster, initialTargets, current);
    const target = initialTargets[0];
    const projectileParams = projectileModule.params ?? {};
    const zoneParams = zoneModule.params ?? {};
    const spawn = projectileSpawnWorldPosition(caster, projectileParams);
    const direction = guideDirection(spawn, target);
    const impact = { x: target.x, y: target.y };
    const projectileId = `${skill.active_gem_instance_id}.module_projectile.${Math.round(elapsedRef.current * 1000)}`;
    const events: SkillEvent[] = [
      frontendSkillEvent(skill, "projectile_spawn", target, spawn, direction, null, skill.damage_type, {
        vfx_key: projectileParams.vfx_key ?? frontendSkillVfxKey(skill, "projectile"),
        projectile_id: projectileId,
        target_world_position: impact,
        spawn_world_position: spawn,
        direction_world: direction,
        velocity_world: {
          x: direction.x * Number(projectileParams.projectile_speed ?? params.projectile_speed ?? 540),
          y: direction.y * Number(projectileParams.projectile_speed ?? params.projectile_speed ?? 540)
        },
        projectile_speed: Number(projectileParams.projectile_speed ?? params.projectile_speed ?? 540),
        projectile_width: Number(projectileParams.projectile_width ?? params.projectile_width ?? 46),
        projectile_height: Number(projectileParams.projectile_height ?? params.projectile_height ?? 30),
        impact_radius: Number(projectileParams.impact_radius ?? params.impact_radius ?? skill.hit?.hit_radius ?? 24) * skill.area_multiplier,
        area_scale: skill.area_multiplier,
        trajectory: String(projectileParams.trajectory ?? "linear"),
        arc_height: Number(projectileParams.arc_height ?? 0),
        lifetime_ms: Number(projectileParams.travel_time_ms ?? 520)
      }, Number(projectileParams.travel_time_ms ?? 520)),
      frontendSkillEvent(skill, "projectile_impact", target, impact, direction, null, skill.damage_type, {
      vfx_key: projectileParams.vfx_key ?? frontendSkillVfxKey(skill, "hit"),
      projectile_id: projectileId,
      marker_id: projectileParams.impact_marker_id ?? "corrosive_impact",
      impact_radius: Number(projectileParams.impact_radius ?? params.impact_radius ?? skill.hit?.hit_radius ?? 24) * skill.area_multiplier,
      area_scale: skill.area_multiplier,
      impact_position: impact
    }, 180, Number(projectileParams.travel_time_ms ?? 520))
    ];
    const impactDelayMs = Number(projectileParams.travel_time_ms ?? 520);
    events.push(...frontendDamageEventsForTarget(skill, target, impact, direction, skill.final_damage, skill.hit as Record<string, unknown>, {
      projectile_id: projectileId,
      hit_vfx_key: frontendSkillVfxKey(skill, "hit", projectileParams.vfx_key),
      marker_id: projectileParams.impact_marker_id ?? "corrosive_impact"
    }, impactDelayMs));
    const radius = Number(zoneParams.radius ?? 80) * skill.area_multiplier;
    const tickIntervalMs = Math.max(1, Number(zoneParams.tick_interval_ms ?? 1000));
    const durationMs = Math.max(tickIntervalMs, Number(zoneParams.duration_ms ?? 3000));
    const tickCount = Math.max(1, Math.floor(durationMs / tickIntervalMs));
    const zoneTargets = frontendUniqueTargetsByDistance(current, impact, radius, Math.max(1, Number(zoneParams.max_targets ?? 8)));
    const zoneBaseDamageAmount = frontendScaledSkillConfigDamageAmount(skill, Number(zoneParams.damage_amount ?? 0));
    const zoneDamageAmount = zoneBaseDamageAmount * frontendSkillDotDamageMultiplier(skill);
    const zoneId = `${skill.active_gem_instance_id}.corrosive_ground.${Math.round(elapsedRef.current * 1000)}`;
    const zoneDelayMs = impactDelayMs + Math.max(0, Number(zoneModule.trigger?.trigger_delay_ms ?? zoneParams.trigger_delay_ms ?? 0));
    const hitAtMs = Math.max(0, Number(zoneParams.hit_at_ms ?? 0));
    const useDynamicTickRuntime = tickIntervalMs > 0 && durationMs > 0;
    const dynamicBuffApply = buffModule?.params ? {
      trigger_event_type: "damage_zone_hit",
      buff_type: "",
      effect_type: buffModule.params.effect_type ?? "damage_taken_increase",
      chance_percent: Number(buffModule.params.chance_percent ?? 0),
      effect_per_stack: Number(buffModule.params.effect_per_stack ?? 0),
      duration_ms: Number(buffModule.params.duration_ms ?? 2000),
      trigger_delay_ms: Math.max(0, Number(buffModule.trigger?.trigger_delay_ms ?? 0)),
      source_skill_id: skill.skill_package_id ?? skill.skill_template_id
    } : null;
    events.push(frontendSkillEvent(skill, "damage_zone", null, impact, direction, zoneDamageAmount, skill.damage_type, {
      vfx_key: zoneParams.vfx_key ?? frontendSkillVfxKey(skill, "zone"),
      zone_id: zoneId,
      marker_id: "corrosive_ground",
      trigger_marker_id: zoneModule.trigger?.trigger_marker_id ?? projectileParams.impact_marker_id,
      shape: zoneParams.shape ?? "circle",
      radius,
      hit_at_ms: hitAtMs,
      tick_interval_ms: tickIntervalMs,
      tick_count: tickCount,
      max_targets: Number(zoneParams.max_targets ?? 8),
      hit_target_count: zoneTargets.length,
      max_hits: Number(zoneParams.max_hits ?? Number.MAX_SAFE_INTEGER),
      max_hits_per_target: Number(zoneParams.max_hits_per_target ?? Number.MAX_SAFE_INTEGER),
      dynamic_tick_runtime: useDynamicTickRuntime,
      damage_amount: zoneDamageAmount,
      emit_hit_vfx: Boolean(zoneParams.emit_hit_vfx ?? false),
      dynamic_buff_apply: dynamicBuffApply
    }, durationMs, zoneDelayMs));
    if (useDynamicTickRuntime) return events;
    for (let tick = 1; tick <= tickCount; tick += 1) {
      for (const zoneTarget of zoneTargets) {
        const tickTimeMs = hitAtMs + (tick - 1) * tickIntervalMs;
        const eventDelayMs = zoneDelayMs + tickTimeMs;
        const tickPayload = { zone_id: zoneId, marker_id: "corrosive_ground_hit", tick_time_ms: tickTimeMs, tick_interval_ms: tickIntervalMs };
        events.push(frontendSkillEvent(skill, "damage_zone_hit", zoneTarget, { x: zoneTarget.x, y: zoneTarget.y }, direction, zoneDamageAmount, skill.damage_type, { ...tickPayload, vfx_key: zoneParams.vfx_key ?? frontendSkillVfxKey(skill, "zone") }, 0, eventDelayMs));
        events.push(...frontendDamageEventsForTarget(skill, zoneTarget, { x: zoneTarget.x, y: zoneTarget.y }, direction, zoneDamageAmount, {
          damage_components: damagePayloadComponents(skill, zoneDamageAmount, skill.damage_type, skill.hit as Record<string, unknown>)
        }, { ...tickPayload, emit_hit_vfx: false }, eventDelayMs));
        if (buffModule?.params && stablePercent(`${zoneId}:${zoneTarget.id}:${tick}:buff_apply`) <= Number(buffModule.params.chance_percent ?? 0)) {
          events.push(frontendSkillEvent(skill, "buff_apply", zoneTarget, { x: zoneTarget.x, y: zoneTarget.y }, direction, null, skill.damage_type, {
            trigger_event_type: "damage_zone_hit",
            buff_type: "",
            effect_type: buffModule.params.effect_type ?? "damage_taken_increase",
            chance_percent: Number(buffModule.params.chance_percent ?? 0),
            effect_per_stack: Number(buffModule.params.effect_per_stack ?? 0),
            duration_ms: Number(buffModule.params.duration_ms ?? 2000),
            source_skill_id: skill.skill_package_id ?? skill.skill_template_id
          }, Number(buffModule.params.duration_ms ?? 2000), eventDelayMs + Math.max(0, Number(buffModule.trigger?.trigger_delay_ms ?? 0))));
        }
      }
    }
    return events;
  }

  function buildFrontendDamageZoneSkillEvents(skill: SkillPreview, caster: PlayerRuntimeState, initialTargets: Enemy[], current: Enemy[]) {
    const params = skill.runtime_params ?? {};
    const originPolicy = String(params.origin_policy ?? "target_position");
    const originTarget = initialTargets[0];
    if (!originTarget && originPolicy !== "caster") return [];
    const origin = originPolicy === "caster" ? caster : { x: originTarget.x, y: originTarget.y };
    const direction = originTarget ? guideDirection(caster, originTarget) : { x: 1, y: 0 };
    const channelMaxStacks = Math.max(1, Math.round(Number(params.channel_max_stacks ?? 1)));
    const channelStack = Math.max(
      1,
      Math.min(
        channelMaxStacks,
        Math.round(Number(params.current_channel_stack ?? Number(params.channel_min_stacks ?? 0) + 1))
      )
    );
    const channelRadiusScale = channelMaxStacks > 1
      ? 1 + ((channelStack - 1) / Math.max(1, channelMaxStacks - 1)) * 0.45
      : 1;
    const radius = Number(params.radius ?? skill.hit?.hit_radius ?? 120) * skill.area_multiplier * channelRadiusScale;
    const waveCount = Math.max(1, Math.round(Number(params.wave_count ?? 1)));
    const tickIntervalMs = Math.max(0, Number(params.tick_interval_ms ?? 0));
    const durationMs = Math.max(Number(params.duration_ms ?? params.hit_at_ms ?? 240), tickIntervalMs || 1);
    const tickCount = tickIntervalMs > 0 ? Math.max(1, Math.floor(durationMs / tickIntervalMs)) : 1;
    const hitAtMs = Math.max(0, Number(params.hit_at_ms ?? 0));
    const waveIntervalMs = Math.max(0, Number(params.wave_interval_ms ?? 0));
    const events: SkillEvent[] = [];
    for (let wave = 0; wave < waveCount; wave += 1) {
      const waveDelayMs = wave * waveIntervalMs;
      const waveOriginTarget = String(params.target_lock_policy ?? "") === "nearest_unique_enemy"
        ? (frontendUniqueTargetsByDistance(current, caster, Number(skill.cast?.search_range ?? 630), waveCount)[wave] ?? originTarget)
        : originTarget;
      if (!waveOriginTarget && originPolicy !== "caster") continue;
      const center = originPolicy === "caster" ? caster : { x: waveOriginTarget!.x, y: waveOriginTarget!.y };
      const zoneTargets = frontendUniqueTargetsByDistance(current, center, radius, Math.max(1, Number(params.max_targets ?? 8)));
      const zoneId = `${skill.active_gem_instance_id}.zone.${Math.round(elapsedRef.current * 1000)}.${wave + 1}`;
      const useDynamicTickRuntime = tickIntervalMs > 0 && durationMs > 0;
      const tickDamageBaseAmount = tickIntervalMs > 0 && skill.damage_type === "chaos" ? Number(skill.final_damage) * (tickIntervalMs / 1000) : Number(skill.final_damage);
      const tickDamageAmount = tickIntervalMs > 0 ? tickDamageBaseAmount * frontendSkillDotDamageMultiplier(skill) : tickDamageBaseAmount;
      events.push(frontendSkillEvent(skill, "damage_zone", null, center, direction, skill.final_damage, skill.damage_type, {
        vfx_key: frontendSkillVfxKey(skill, "zone"),
        zone_id: zoneId,
        shape: params.shape ?? "circle",
        radius,
        ring_width: Number(params.ring_width ?? 48),
        tick_interval_ms: tickIntervalMs,
        tick_count: tickCount,
        duration_ms: durationMs,
        max_targets: Number(params.max_targets ?? 8),
        hit_target_count: zoneTargets.length,
        wave_index: wave + 1,
        target_lock_policy: params.target_lock_policy,
        origin_policy: originPolicy,
        dynamic_tick_runtime: useDynamicTickRuntime,
        dynamic_tick_hit_vfx: isThundercloudSkill(skill),
        damage_amount: tickDamageAmount,
        damage_components: damagePayloadComponents(skill, tickDamageAmount, skill.damage_type, skill.hit as Record<string, unknown>),
        knockback_chance_percent: statValue(skill.skill_stats, "knockback_chance_percent"),
        knockback_distance_add_percent: statValue(skill.skill_stats, "knockback_distance_add_percent"),
        knockback_lock_ms: FRONTEND_KNOCKBACK_LOCK_MS,
        max_hits: Number(params.max_hits ?? Number.MAX_SAFE_INTEGER),
        max_hits_per_target: Number(params.max_hits_per_target ?? Number.MAX_SAFE_INTEGER),
        channel_stack: channelStack,
        channel_max_stacks: params.channel_max_stacks,
        channel_radius_scale: channelRadiusScale,
        channel_move_speed_multiplier: params.channel_move_speed_multiplier,
        knockback_policy: params.knockback_policy,
        knockback_interval_ms: params.knockback_interval_ms,
        aggravation_value: params.aggravation_value,
        aggravation_cooldown_ms: params.aggravation_cooldown_ms,
        dot_damage_bonus_per_10_aggravation_percent: params.dot_damage_bonus_per_10_aggravation_percent
      }, durationMs, waveDelayMs));
      if (String(params.knockback_policy ?? "") === "reverse") {
        for (let pullMs = Number(params.knockback_interval_ms ?? 100); pullMs <= durationMs; pullMs += Number(params.knockback_interval_ms ?? 100)) {
          events.push(frontendSkillEvent(skill, "forced_movement", null, center, direction, Number(params.knockback_distance ?? 0), skill.damage_type, {
            origin_world_position: center,
            origin: center,
            radius,
            movement_policy: "pull_to_origin",
            movement_scope: "damage_zone",
            movement_distance: Number(params.knockback_distance ?? 0),
            pull_time_ms: pullMs
          }, 120, waveDelayMs + pullMs));
        }
      }
      if (useDynamicTickRuntime) continue;
      for (let tick = 1; tick <= tickCount; tick += 1) {
        for (const target of zoneTargets) {
          const baseAmount = tickIntervalMs > 0 && skill.damage_type === "chaos" ? Number(skill.final_damage) * (tickIntervalMs / 1000) : Number(skill.final_damage);
          const amount = tickIntervalMs > 0 ? baseAmount * frontendSkillDotDamageMultiplier(skill) : baseAmount;
          const tickTimeMs = tickIntervalMs > 0 ? hitAtMs + (tick - 1) * tickIntervalMs : hitAtMs;
          const eventDelayMs = waveDelayMs + tickTimeMs;
          const tickPayload = {
            vfx_key: frontendSkillVfxKey(skill, "zone"),
            zone_id: zoneId,
            tick_time_ms: tickTimeMs,
            tick_interval_ms: tickIntervalMs,
            dot_damage_bonus_per_10_aggravation_percent: params.dot_damage_bonus_per_10_aggravation_percent
          };
          events.push(frontendSkillEvent(skill, "damage_zone_hit", target, { x: target.x, y: target.y }, direction, amount, skill.damage_type, tickPayload, 0, eventDelayMs));
          events.push(...frontendDamageEventsForTarget(skill, target, { x: target.x, y: target.y }, direction, amount, skill.hit as Record<string, unknown>, {
            ...tickPayload,
            hit_vfx_key: frontendSkillVfxKey(skill, "hit"),
            emit_hit_vfx: tickIntervalMs <= 0 || isThundercloudSkill(skill)
          }, eventDelayMs));
          if (Number(params.aggravation_value ?? 0) > 0 && tickIntervalMs > 0 && tickTimeMs % Math.max(1, Number(params.aggravation_cooldown_ms ?? 1000)) === hitAtMs % Math.max(1, Number(params.aggravation_cooldown_ms ?? 1000))) {
            events.push(frontendSkillEvent(skill, "status_apply", target, { x: target.x, y: target.y }, direction, null, skill.damage_type, {
              status_type: "aggravation",
              source_skill_id: skill.skill_package_id ?? skill.skill_template_id,
              base_value: Number(params.aggravation_value ?? 0),
              effect_per_stack: Number(params.dot_damage_bonus_per_10_aggravation_percent ?? 0),
              duration_ms: durationMs
            }, durationMs, eventDelayMs));
          }
        }
      }
    }
    return events;
  }

  function buildFrontendMeleeArcSkillEvents(skill: SkillPreview, caster: PlayerRuntimeState, initialTargets: Enemy[], current: Enemy[]) {
    const params = skill.runtime_params ?? {};
    const target = initialTargets[0];
    const direction = guideDirection(caster, target);
    const radius = Number(params.arc_radius ?? params.radius ?? 160) * skill.area_multiplier;
    const arcAngle = Number(params.arc_angle ?? 120);
    const hitAtMs = Math.max(0, Number(params.hit_at_ms ?? skill.hit?.hit_delay_ms ?? 0));
    const maxTargets = Math.max(1, Number(params.max_targets ?? 6));
    const targets = frontendMeleeArcTargets(current, caster, direction, radius, arcAngle, maxTargets);
    const events: SkillEvent[] = [
      frontendSkillEvent(skill, "melee_arc", null, caster, direction, skill.final_damage, convertedDamageType(skill, skill.hit as Record<string, unknown>), {
        vfx_key: frontendSkillVfxKey(skill, "hit", params.slash_vfx_key),
        arc_radius: radius,
        arc_angle: arcAngle,
        origin_world_position: caster,
        direction_world: direction,
        hit_at_ms: hitAtMs,
        slash_triggered: frontendRuntimeRoll(skill, target, 901) * 100 <= Number(params.slash_chance_percent ?? 0)
      }, 220)
    ];
    for (const hitTarget of targets) {
      events.push(...frontendDamageEventsForTarget(skill, hitTarget, { x: hitTarget.x, y: hitTarget.y }, direction, skill.final_damage, skill.hit as Record<string, unknown>, {
        hit_vfx_key: frontendSkillVfxKey(skill, "hit", params.slash_vfx_key)
      }, hitAtMs));
    }
    const slashTriggered = Boolean(events[0].payload?.slash_triggered);
    if (slashTriggered) {
      const flameWaveCount = Math.max(1, Math.round(Number(params.flame_wave_count ?? 3)));
      const waveRadius = Number(params.flame_wave_distance ?? radius);
      const waveTargets = frontendMeleeArcTargets(current, caster, direction, waveRadius, Number(params.flame_wave_arc_angle ?? arcAngle), Math.max(maxTargets, 8));
      const sequenceByTarget = new Map<number, number>();
      for (let wave = 0; wave < flameWaveCount; wave += 1) {
        events.push(frontendSkillEvent(skill, "melee_arc", null, caster, direction, skill.final_damage, convertedDamageType(skill, skill.hit as Record<string, unknown>), {
          vfx_key: frontendSkillVfxKey(skill, "hit", params.slash_vfx_key),
          arc_radius: waveRadius,
          arc_angle: Number(params.flame_wave_arc_angle ?? arcAngle),
          flame_wave_index: wave + 1,
          origin_world_position: caster,
          direction_world: direction
        }, 220));
        for (const waveTarget of waveTargets) {
          const seq = sequenceByTarget.get(waveTarget.id) ?? 0;
          sequenceByTarget.set(waveTarget.id, seq + 1);
          const amount = Number(skill.final_damage) * (seq > 0 ? 1 - Number(params.shotgun_falloff_coeff ?? 0.5) : 1);
          events.push(...frontendDamageEventsForTarget(skill, waveTarget, { x: waveTarget.x, y: waveTarget.y }, direction, amount, skill.hit as Record<string, unknown>, {
            hit_vfx_key: frontendSkillVfxKey(skill, "hit", params.slash_vfx_key),
            flame_wave_index: wave + 1,
            same_target_hit_sequence: seq
          }));
        }
      }
    }
    return events;
  }

  function buildFrontendNovaSkillEvents(skill: SkillPreview, caster: PlayerRuntimeState, current: Enemy[]) {
    const params = skill.runtime_params ?? {};
    const radius = Number(params.radius ?? skill.hit?.hit_radius ?? 118) * skill.area_multiplier;
    const direction = { x: 1, y: 0 };
    const targets = frontendUniqueTargetsByDistance(current, caster, radius, Math.max(1, Number(params.max_targets ?? 8)));
    const areaId = `${skill.active_gem_instance_id}.nova.${Math.round(elapsedRef.current * 1000)}`;
    const hitAtMs = Math.max(0, Number(params.hit_at_ms ?? skill.hit?.hit_delay_ms ?? 0));
    return [
      frontendSkillEvent(skill, "area_spawn", null, caster, direction, skill.final_damage, skill.damage_type, {
        vfx_key: frontendSkillVfxKey(skill, "zone"),
        area_id: areaId,
        center_world_position: caster,
        center_policy: params.center_policy ?? "player_center",
        radius,
        ring_width: Number(params.ring_width ?? 48),
        on_kill_recast_chance_percent: params.on_kill_recast_chance_percent,
        on_kill_recast_max_per_area: params.on_kill_recast_max_per_area,
        suppress_hit_vfx: params.suppress_hit_vfx
      }, Math.max(250, Number(params.expand_duration_ms ?? 250))),
      ...targets.flatMap((target) => frontendDamageEventsForTarget(skill, target, { x: target.x, y: target.y }, guideDirection(caster, target), skill.final_damage, skill.hit as Record<string, unknown>, {
        hit_vfx_key: frontendSkillVfxKey(skill, "hit"),
        area_id: areaId,
        hit_at_ms: hitAtMs,
        on_kill_recast_chance_percent: params.on_kill_recast_chance_percent,
        on_kill_recast_max_per_area: params.on_kill_recast_max_per_area,
        radius,
        ring_width: Number(params.ring_width ?? 48)
      }, hitAtMs))
    ];
  }

  function releaseFrontendProjectileSkill(skill: SkillPreview, caster: PlayerRuntimeState, targets: Enemy[], vfxScale: number) {
    const legacyProjectileVfxKind = projectileVfxKind(skill.visual_effect) ?? projectileVfxKind(skill.skill_template_id);
    const projectileExitFadeDuration = legacyProjectileVfxKind === "burning_shot" ? 0 : PROJECTILE_BODY_EXIT_FADE_DURATION;
    const nextBolts: FireBolt[] = targets.map((target) => {
      const launch = createFireBoltProjectileLaunch(skill, caster, target, 0);
      return {
        id: nextBoltId.current++,
        x: launch.spawnWorldPosition.x,
        y: launch.spawnWorldPosition.y,
        targetX: launch.targetWorldPosition.x,
        targetY: launch.targetWorldPosition.y,
        directionX: launch.directionWorld.x,
        directionY: launch.directionWorld.y,
        velocityX: launch.velocityWorld.x,
        velocityY: launch.velocityWorld.y,
        projectileId: launch.projectileId,
        skillId: launch.skillId,
        projectileIndex: 1,
        projectileCount: targets.length,
        fanAngle: 0,
        localSpreadAngle: 0,
        pierceRemaining: 0,
        projectileSpeed: Math.hypot(launch.velocityWorld.x, launch.velocityWorld.y),
        projectileWidth: Number(skill.runtime_params?.projectile_width ?? 38),
        projectileHeight: Number(skill.runtime_params?.projectile_height ?? 24),
        impactRadius: Number(skill.runtime_params?.impact_radius ?? skill.hit?.hit_radius ?? 18) * skill.area_multiplier,
        ttl: 0.42 + projectileExitFadeDuration,
        duration: 0.42,
        fadeDuration: projectileExitFadeDuration,
        skillTemplateId: skill.skill_template_id,
        behaviorType: skill.behavior_type,
        damageType: skill.damage_type,
        visualEffect: skill.visual_effect,
        vfxKey: skill.visual_effect,
        shapeEffects: skill.shape_effects ?? [],
        areaScale: skill.area_multiplier,
        vfxScale,
        pendingDamage: true,
        damageAmount: skill.final_damage,
        sourceSkillName: skill.name_text,
        sourceSkillInstanceId: skill.active_gem_instance_id,
        targetId: target.id
      };
    });
    setBolts((items) => capRuntimeVisualBudget([...items, ...nextBolts], MAX_RUNTIME_PROJECTILE_VISUALS));
  }

  function releaseFrontendMeleeArcSkill(skill: SkillPreview, caster: PlayerRuntimeState, targets: Enemy[], vfxScale: number) {
    const target = targets[0] ?? caster;
    const direction = guideDirection(caster, target);
    setMeleeArcs((items) => capRuntimeVisualBudget([...items, {
      id: nextMeleeArcId.current++,
      x: caster.x,
      y: caster.y,
      radius: Math.max(40, Number(skill.runtime_params?.radius ?? 120) * skill.area_multiplier),
      directionX: direction.x,
      directionY: direction.y,
      arcAngle: Math.max(30, Number(skill.runtime_params?.arc_angle_deg ?? 90)),
      ttl: 0.22,
      duration: 0.22,
      damageType: skill.damage_type,
      vfxKey: skill.visual_effect,
      vfxScale
    }], MAX_RUNTIME_AREA_VFX));
    applyFrontendSkillDamage(skill, targets, 80);
  }

  function releaseFrontendNovaSkill(skill: SkillPreview, caster: PlayerRuntimeState, targets: Enemy[], vfxScale: number) {
    const radius = Math.max(60, Number(skill.runtime_params?.radius ?? skill.runtime_params?.area_radius ?? 160) * skill.area_multiplier);
    setAreaNovas((items) => capRuntimeVisualBudget([...items, {
      id: nextAreaNovaId.current++,
      x: caster.x,
      y: caster.y,
      radius,
      ringWidth: Math.max(4, radius * 0.08),
      ttl: 0.28,
      duration: 0.28,
      damageType: skill.damage_type,
      vfxKey: skill.visual_effect,
      vfxScale
    }], MAX_RUNTIME_AREA_VFX));
    const novaTargets = enemiesStateRef.current.filter((enemy) => enemy.hp > 0 && distance(enemy, caster) <= radius).slice(0, Math.max(targets.length, 12));
    applyFrontendSkillDamage(skill, novaTargets, 120);
  }

  function releaseFrontendChainSkill(skill: SkillPreview, caster: PlayerRuntimeState, targets: Enemy[], vfxScale: number) {
    const chainTargets = targets.slice(0, Math.max(1, Number(skill.runtime_params?.chain_count ?? targets.length)));
    const segments = chainTargets.map((target, index) => {
      const start = index === 0 ? caster : chainTargets[index - 1];
      return {
        id: nextChainSegmentId.current++,
        startX: start.x,
        startY: start.y,
        endX: target.x,
        endY: target.y,
        ttl: 0.18,
        duration: 0.18,
        damageType: skill.damage_type,
        vfxKey: skill.visual_effect,
        segmentIndex: index,
        vfxScale
      };
    });
    setChainSegments((items) => capRuntimeVisualBudget([...items, ...segments], MAX_RUNTIME_AREA_VFX));
    applyFrontendSkillDamage(skill, chainTargets, 100);
  }

  function releaseFrontendDamageZoneSkill(skill: SkillPreview, caster: PlayerRuntimeState, targets: Enemy[], vfxScale: number) {
    const target = targets[0] ?? caster;
    const direction = guideDirection(caster, target);
    const radius = Math.max(40, Number(skill.runtime_params?.radius ?? skill.runtime_params?.area_radius ?? 140) * skill.area_multiplier);
    setDamageZones((items) => capRuntimeVisualBudget([...items, {
      id: nextDamageZoneId.current++,
      x: target.x,
      y: target.y,
      shape: "circle",
      radius,
      length: radius * 2,
      width: radius * 2,
      directionX: direction.x,
      directionY: direction.y,
      ttl: 0.7,
      duration: 0.7,
      damageType: skill.damage_type,
      vfxKey: skill.visual_effect,
      zoneId: `frontend_zone_${nextDamageZoneId.current}`,
      skillId: skill.active_gem_instance_id,
      vfxScale,
      tickProgress: 0
    }], MAX_RUNTIME_AREA_VFX));
    const zoneTargets = enemiesStateRef.current.filter((enemy) => enemy.hp > 0 && distance(enemy, target) <= radius).slice(0, Math.max(targets.length, 12));
    applyFrontendSkillDamage(skill, zoneTargets, 220);
  }

  function processFrontendProjectileImpacts(dt: number) {
    const impacts: FireBolt[] = [];
    const nextBolts = boltsStateRef.current.map((bolt) => {
      if (!bolt.pendingDamage) return bolt;
      const impactThreshold = Math.max(0, bolt.fadeDuration ?? 0);
      if (bolt.ttl - dt > impactThreshold) return bolt;
      impacts.push(bolt);
      return { ...bolt, pendingDamage: false };
    });
    if (impacts.length === 0) return 0;
    boltsStateRef.current = nextBolts;
    setBolts(nextBolts);
    const liveById = new Map(enemiesStateRef.current.filter((enemy) => enemy.hp > 0).map((enemy) => [enemy.id, enemy]));
    const events: SkillEvent[] = [];
    const hitVfx: HitVfx[] = [];
    impacts.forEach((bolt) => {
      const target = bolt.targetId !== undefined ? liveById.get(bolt.targetId) : undefined;
      if (!target) return;
      const eventBase: SkillEvent = {
        event_id: `frontend_projectile_impact_${bolt.projectileId ?? bolt.id}_${Math.round(elapsedRef.current * 1000)}`,
        type: "damage",
        timestamp_ms: Math.round(elapsedRef.current * 1000),
        source_entity: "player",
        target_entity: String(target.id),
        position: { x: target.x, y: target.y },
        direction: { x: bolt.directionX ?? 0, y: bolt.directionY ?? 0 },
        delay_ms: 0,
        duration_ms: 0,
        amount: bolt.damageAmount ?? 0,
        damage_type: bolt.damageType,
        skill_instance_id: bolt.sourceSkillInstanceId ?? bolt.skillId ?? bolt.skillTemplateId ?? "",
        vfx_key: bolt.vfxKey,
        sfx_key: "",
        reason_key: "frontend_projectile_impact",
        payload: { skill_name: bolt.sourceSkillName ?? "技能" }
      };
      events.push(eventBase, { ...eventBase, event_id: `${eventBase.event_id}_text`, type: "floating_text", duration_ms: 800 });
      hitVfx.push({
        id: nextHitVfxId.current++,
        x: target.x,
        y: target.y,
        targetId: target.id,
        projectileId: bolt.projectileId,
        ttl: projectileVfxKind(bolt.vfxKey) === "ice_shards" ? ICE_SHARDS_IMPACT_DURATION_MS / 1000 : FIRE_BOLT_IMPACT_DURATION_MS / 1000,
        duration: projectileVfxKind(bolt.vfxKey) === "ice_shards" ? ICE_SHARDS_IMPACT_DURATION_MS / 1000 : FIRE_BOLT_IMPACT_DURATION_MS / 1000,
        damageType: bolt.damageType,
        vfxKey: bolt.vfxKey,
        skillTemplateId: bolt.skillTemplateId,
        projectileWidth: bolt.projectileWidth,
        projectileHeight: bolt.projectileHeight,
        impactRadius: bolt.impactRadius,
        shapeEffects: bolt.shapeEffects ?? [],
        vfxScale: bolt.vfxScale
      });
    });
    if (hitVfx.length > 0) setHitVfxs((items) => capRuntimeVisualBudget([...items, ...hitVfx], MAX_RUNTIME_HIT_VFX));
    consumeSkillEventBatch(events);
    return events.length;
  }

  function frontendDamageEvent(skill: SkillPreview, enemy: Enemy): SkillEvent {
    const damagePayload = {
      skill_name: skill.name_text,
      damage_components: damagePayloadComponents(skill, Number(skill.final_damage ?? 0), skill.damage_type, skill.hit as Record<string, unknown>),
      damage_conversions: skill.hit?.damage_conversions ?? [],
      armor_reduction_penetration_percent: skill.runtime_params?.armor_reduction_penetration_percent,
      resistance_penetration_percent: skill.runtime_params?.resistance_penetration_percent,
      cull_threshold_percent: skill.runtime_params?.cull_threshold_percent,
      double_damage_chance_percent: skill.runtime_params?.double_damage_chance_percent
    };
    return {
      event_id: `frontend_damage_${skill.active_gem_instance_id}_${enemy.id}_${Math.round(elapsedRef.current * 1000)}_${nextTextId.current}`,
      type: "damage",
      timestamp_ms: Math.round(elapsedRef.current * 1000),
      source_entity: "player",
      target_entity: String(enemy.id),
      position: { x: enemy.x, y: enemy.y },
      direction: guideDirection(playerStateRef.current, enemy),
      delay_ms: 0,
      duration_ms: 0,
      amount: skill.final_damage,
      damage_type: skill.damage_type,
      skill_instance_id: skill.active_gem_instance_id,
      vfx_key: skill.visual_effect,
      sfx_key: "",
      reason_key: "frontend_skill_damage",
      payload: damagePayload
    };
  }

  function applyFrontendSkillDamage(skill: SkillPreview, targets: Enemy[], delayMs: number) {
    const liveTargets = targets.filter((target) => (enemiesStateRef.current.find((enemy) => enemy.id === target.id)?.hp ?? 0) > 0);
    if (liveTargets.length === 0) return;
    const damageEvents = liveTargets.map((target) => frontendDamageEvent(skill, target));
    const floatingEvents = liveTargets.map((target) => ({
      ...frontendDamageEvent(skill, target),
      event_id: `frontend_text_${skill.active_gem_instance_id}_${target.id}_${Math.round(elapsedRef.current * 1000)}_${nextTextId.current}`,
      type: "floating_text" as const,
      duration_ms: 800
    }));
    const events = [...damageEvents, ...floatingEvents];
    if (delayMs <= 0) {
      consumeSkillEventBatch(events);
      return;
    }
    events.forEach((event) => scheduledSkillEvents.current.push({ event, remaining: delayMs / 1000 }));
  }

  function isDynamicDamageZoneFollowupEvent(event: SkillEvent) {
    const payload = event.payload ?? {};
    if (Number(payload.tick_interval_ms ?? 0) <= 0 || typeof payload.zone_id !== "string") return false;
    return event.type === "damage_zone_hit"
      || event.type === "damage"
      || event.type === "buff_apply"
      || event.type === "floating_text"
      || event.type === "hit_vfx";
  }

function consumeImmediateSkillEvents(events: SkillEvent[]) {
    consumeSkillEventBatch(events.filter((event) => event.delay_ms === 0));
  }

  function consumeScheduledSkillEvents(dt: number) {
    const ready: SkillEvent[] = [];
    const pending: ScheduledSkillEvent[] = [];
    for (const scheduled of scheduledSkillEvents.current) {
      const remaining = scheduled.remaining - dt;
      if (remaining <= 0) {
        ready.push(scheduled.event);
      } else {
        pending.push({ ...scheduled, remaining });
      }
    }
    scheduledSkillEvents.current = pending;
    consumeSkillEventBatch(ready);
    return ready.length;
  }

  function registerActiveDamageZone(event: SkillEvent, zoneId: string, origin: { x: number; y: number }, direction: { x: number; y: number }, shape: "circle" | "rectangle") {
    if (event.type !== "damage_zone") return;
    const payload = event.payload ?? {};
    if (payload.dynamic_tick_runtime !== true) return;
    const tickIntervalMs = Math.max(0, Math.round(Number(payload.tick_interval_ms ?? 0)));
    const damageAmount = Math.max(0, Number(payload.damage_amount ?? event.amount ?? 0));
    if (tickIntervalMs <= 0 || event.duration_ms <= 0 || damageAmount <= 0) return;
    const firstTickMs = Math.max(0, Math.round(Number(payload.hit_at_ms ?? tickIntervalMs)));
    const runtime: ActiveDamageZoneRuntime = {
      zoneId,
      event,
      payload,
      origin,
      direction,
      shape,
      radius: Math.max(1, Number(payload.radius ?? 120)),
      length: Math.max(1, Number(payload.length ?? payload.radius ?? 160)),
      width: Math.max(1, Number(payload.width ?? payload.radius ?? 80)),
      followPlayer: event.source_entity === "player" && payload.origin_policy === "caster",
      remainingMs: Math.max(0, event.duration_ms),
      tickIntervalMs,
      nextTickMs: firstTickMs > 0 ? firstTickMs : tickIntervalMs,
      tickIndex: 0,
      maxTargets: Math.max(1, Math.round(Number(payload.max_targets ?? (enemiesStateRef.current.length || 1)))),
      maxHits: Math.max(1, Math.round(Number(payload.max_hits ?? Number.MAX_SAFE_INTEGER))),
      maxHitsPerTarget: Math.max(1, Math.round(Number(payload.max_hits_per_target ?? Number.MAX_SAFE_INTEGER))),
      totalHits: 0,
      hitCounts: new Map()
    };
    activeDamageZones.current = [
      ...activeDamageZones.current.filter((zone) => zone.zoneId !== zoneId),
      runtime
    ];
  }

  function updateActiveDamageZones(dt: number) {
    if (activeDamageZones.current.length === 0) return 0;
    const deltaMs = Math.max(0, Math.round(dt * 1000));
    if (deltaMs <= 0) return 0;
    const remainingZones: ActiveDamageZoneRuntime[] = [];
    const tickEvents: SkillEvent[] = [];
    for (const zone of activeDamageZones.current) {
      zone.remainingMs -= deltaMs;
      zone.nextTickMs -= deltaMs;
      while (zone.nextTickMs <= 0 && zone.remainingMs >= 0 && zone.tickIntervalMs > 0) {
        zone.tickIndex += 1;
        tickEvents.push(...activeDamageZoneRuntimeTickEvents(zone));
        zone.nextTickMs += zone.tickIntervalMs;
      }
      if (zone.remainingMs > 0 && zone.totalHits < zone.maxHits) remainingZones.push(zone);
    }
    activeDamageZones.current = remainingZones;
    if (tickEvents.length > 0) consumeSkillEventBatch(tickEvents);
    return tickEvents.length;
  }

  function activeDamageZoneRuntimeTickEvents(zone: ActiveDamageZoneRuntime) {
    const origin = zone.followPlayer ? { x: playerStateRef.current.x, y: playerStateRef.current.y } : zone.origin;
    const maxTargets = Math.max(1, zone.maxTargets);
    const targets = zone.shape === "circle"
      ? frontendUniqueTargetsByDistance(enemiesStateRef.current, origin, zone.radius, maxTargets)
      : frontendUniqueTargetsByDistance(enemiesStateRef.current, origin, Math.max(zone.length, zone.width), maxTargets)
          .filter((enemy) => damageZoneRectangleContains(enemy, origin, zone.direction, zone.length, zone.width));
    const damageAmount = Math.max(0, Number(zone.payload.damage_amount ?? zone.event.amount ?? 0));
    if (damageAmount <= 0 || targets.length === 0) return [];
    const tickTimeMs = zone.tickIndex * zone.tickIntervalMs;
    const events: SkillEvent[] = [];
    for (const target of targets) {
      if (zone.totalHits >= zone.maxHits) break;
      const previousHits = zone.hitCounts.get(target.id) ?? 0;
      if (previousHits >= zone.maxHitsPerTarget) continue;
      zone.totalHits += 1;
      zone.hitCounts.set(target.id, previousHits + 1);
      const position = { x: target.x, y: target.y };
      const direction = guideDirection(origin, target);
      const tickDamageComponents = zone.payload.damage_components && typeof zone.payload.damage_components === "object" && !Array.isArray(zone.payload.damage_components)
        ? zone.payload.damage_components
        : { [zone.event.damage_type]: damageAmount };
      const basePayload = {
        ...zone.payload,
        zone_id: zone.zoneId,
        tick_index: zone.tickIndex,
        tick_time_ms: tickTimeMs,
        tick_interval_ms: zone.tickIntervalMs,
        hit_world_position: position,
        impact_world_position: position,
        target_world_position: position,
        origin_world_position: origin,
        damage_components: tickDamageComponents,
        armor_reduction_penetration_percent: zone.payload.armor_reduction_penetration_percent,
        resistance_penetration_percent: zone.payload.resistance_penetration_percent,
        cull_threshold_percent: zone.payload.cull_threshold_percent,
        double_damage_chance_percent: zone.payload.double_damage_chance_percent,
        hit_vfx_key: zone.event.vfx_key,
        emit_hit_vfx: zone.payload.dynamic_tick_hit_vfx === true || zone.payload.emit_hit_vfx === true
      };
      const baseId = `${zone.event.event_id}.runtime_tick.${zone.tickIndex}.${target.id}`;
      events.push({
        ...zone.event,
        event_id: `${baseId}.damage_zone_hit`,
        type: "damage_zone_hit",
        target_entity: String(target.id),
        position,
        direction,
        delay_ms: 0,
        duration_ms: 0,
        amount: damageAmount,
        payload: basePayload
      });
      events.push({
        ...zone.event,
        event_id: `${baseId}.damage`,
        type: "damage",
        target_entity: String(target.id),
        position,
        direction,
        delay_ms: 0,
        duration_ms: 0,
        amount: damageAmount,
        payload: basePayload
      });
      if (basePayload.emit_hit_vfx) {
        events.push({
          ...zone.event,
          event_id: `${baseId}.hit_vfx`,
          type: "hit_vfx",
          target_entity: String(target.id),
          position,
          direction,
          delay_ms: 0,
          duration_ms: 420,
          amount: null,
          payload: basePayload
        });
      }
      events.push({
        ...zone.event,
        event_id: `${baseId}.floating_text`,
        type: "floating_text",
        target_entity: String(target.id),
        position: { x: position.x, y: position.y - 28 },
        direction,
        delay_ms: 0,
        duration_ms: 800,
        amount: damageAmount,
        payload: { ...basePayload, text: damageNumberText(damageAmount) }
      });
      const knockbackChancePercent = clamp(Number(zone.payload.knockback_chance_percent ?? 0), 0, 100);
      const knockbackDistanceAddPercent = Number(zone.payload.knockback_distance_add_percent ?? 0);
      const knockbackDistance = FRONTEND_BASE_KNOCKBACK_DISTANCE * Math.max(0, 1 + knockbackDistanceAddPercent / 100);
      if (knockbackChancePercent > 0 && knockbackDistance > 0 && stablePercent(`${baseId}.knockback`) <= knockbackChancePercent) {
        const knockbackOrigin = playerStateRef.current;
        const knockbackDirection = guideDirection(knockbackOrigin, target);
        const knockbackPayload = {
          ...basePayload,
          origin_world_position: knockbackOrigin,
          movement_policy: "push_along_direction",
          movement_distance: knockbackDistance,
          knockback_chance_percent: knockbackChancePercent,
          knockback_distance_add_percent: knockbackDistanceAddPercent,
          knockback_lock_ms: Number(zone.payload.knockback_lock_ms ?? FRONTEND_KNOCKBACK_LOCK_MS)
        };
        events.push({
          ...zone.event,
          event_id: `${baseId}.forced_movement`,
          type: "forced_movement",
          target_entity: String(target.id),
          position,
          direction: knockbackDirection,
          delay_ms: 0,
          duration_ms: 0,
          amount: knockbackDistance,
          payload: knockbackPayload
        });
        events.push({
          ...zone.event,
          event_id: `${baseId}.knockback_text`,
          type: "floating_text",
          target_entity: String(target.id),
          position: { x: position.x, y: position.y - 52 },
          direction: knockbackDirection,
          delay_ms: 0,
          duration_ms: 650,
          amount: 0,
          payload: { ...knockbackPayload, text: "\u51fb\u9000" }
        });
      }
      const dynamicBuffApply = typeof zone.payload.dynamic_buff_apply === "object" && zone.payload.dynamic_buff_apply
        ? zone.payload.dynamic_buff_apply as Record<string, unknown>
        : null;
      if (dynamicBuffApply && stablePercent(`${baseId}.buff_apply`) <= Number(dynamicBuffApply.chance_percent ?? 0)) {
        events.push({
          ...zone.event,
          event_id: `${baseId}.buff_apply`,
          type: "buff_apply",
          target_entity: String(target.id),
          position,
          direction,
          delay_ms: Math.max(0, Number(dynamicBuffApply.trigger_delay_ms ?? 0)),
          duration_ms: Math.max(0, Number(dynamicBuffApply.duration_ms ?? 0)),
          amount: null,
          payload: {
            ...basePayload,
            trigger_event_type: dynamicBuffApply.trigger_event_type ?? "damage_zone_hit",
            buff_type: dynamicBuffApply.buff_type ?? "",
            effect_type: dynamicBuffApply.effect_type ?? "damage_taken_increase",
            chance_percent: Number(dynamicBuffApply.chance_percent ?? 0),
            effect_per_stack: Number(dynamicBuffApply.effect_per_stack ?? 0),
            duration_ms: Math.max(0, Number(dynamicBuffApply.duration_ms ?? 0)),
            source_skill_id: dynamicBuffApply.source_skill_id ?? zone.event.skill_instance_id
          }
        });
      }
      const aggravationValue = Number(zone.payload.aggravation_value ?? 0);
      const aggravationCooldownMs = Math.max(1, Number(zone.payload.aggravation_cooldown_ms ?? 1000));
      if (aggravationValue > 0 && tickTimeMs % aggravationCooldownMs === 0) {
        events.push({
          ...zone.event,
          event_id: `${baseId}.status_apply`,
          type: "status_apply",
          target_entity: String(target.id),
          position,
          direction,
          delay_ms: 0,
          duration_ms: zone.event.duration_ms,
          amount: null,
          payload: {
            ...basePayload,
            status_type: "aggravation",
            source_skill_id: zone.event.skill_instance_id,
            base_value: aggravationValue,
            effect_per_stack: Number(zone.payload.dot_damage_bonus_per_10_aggravation_percent ?? 0),
            duration_ms: zone.event.duration_ms
          }
        });
      }
    }
    return events;
  }

  function damageZoneRectangleContains(point: { x: number; y: number }, origin: { x: number; y: number }, direction: { x: number; y: number }, length: number, width: number) {
    const facing = normalizedWorldDirection(direction);
    const right = { x: -facing.y, y: facing.x };
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;
    const forward = dx * facing.x + dy * facing.y;
    const lateral = dx * right.x + dy * right.y;
    return forward >= 0 && forward <= length && Math.abs(lateral) <= width / 2;
  }

  function activeDamageZoneTickProgress(zoneId: string | undefined) {
    if (!zoneId) return undefined;
    const zone = activeDamageZones.current.find((item) => item.zoneId === zoneId);
    if (!zone || zone.tickIntervalMs <= 0) return undefined;
    return 1 - clamp(zone.nextTickMs / zone.tickIntervalMs, 0, 1);
  }

  function consumeSkillEvent(event: SkillEvent) {
    consumeSkillEventBatch([event]);
  }

  function projectileSpawnPositionForEvent(event: SkillEvent) {
    if (event.payload?.vfx_spawn_policy === "caster_current_position" || event.payload?.spawn_policy === "caster_current_position") {
      return { x: playerStateRef.current.x, y: playerStateRef.current.y };
    }
    if (event.source_entity === "boss" && event.payload?.spawn_policy === "source_current_position") {
      const sourceEnemyId = Number(event.payload?.source_enemy_id);
      const sourceEnemy = enemiesStateRef.current.find((enemy) => enemy.id === sourceEnemyId && enemy.hp > 0);
      if (sourceEnemy) return { x: sourceEnemy.x, y: sourceEnemy.y };
    }
    return pointFromUnknown(event.payload?.vfx_spawn_world_position)
      ?? pointFromUnknown(event.payload?.spawn_world_position)
      ?? event.position;
  }

  function liveMonsterProjectileTrajectoryForEvent(
    event: SkillEvent,
    spawnPosition: { x: number; y: number },
    projectileSpeed: number
  ) {
    if (event.source_entity !== "boss" || event.payload?.aim_policy !== "target_current_position") return null;
    const travel = Math.max(1, Number(event.payload?.projectile_range ?? event.payload?.range ?? event.duration_ms / 1000 * projectileSpeed));
    const spreadAngle = Number(event.payload?.local_spread_angle ?? 0);
    const direction = normalizedWorldDirection(rotateDirection(guideDirection(spawnPosition, playerStateRef.current), spreadAngle));
    const target = {
      x: spawnPosition.x + direction.x * travel,
      y: spawnPosition.y + direction.y * travel
    };
    return {
      direction,
      velocity: { x: direction.x * projectileSpeed, y: direction.y * projectileSpeed },
      target
    };
  }

  function liveOrbitCenter(payload: Record<string, unknown>, fallback: { x: number; y: number }) {
    if (payload.orbit_center_policy === "caster") {
      return { x: playerStateRef.current.x, y: playerStateRef.current.y };
    }
    const center = (payload.orbit_center ?? fallback) as { x?: number; y?: number };
    return {
      x: Number(center.x ?? fallback.x),
      y: Number(center.y ?? fallback.y)
    };
  }

  function liveOrbitPosition(payload: Record<string, unknown>, fallback: { x: number; y: number }) {
    const center = liveOrbitCenter(payload, fallback);
    const tickTimeMs = Number(payload.tick_time_ms ?? 0);
    const orbCount = Math.max(1, Math.round(Number(payload.orb_count ?? 1)));
    const orbIndex = Math.max(0, Math.round(Number(payload.orb_index ?? 0)));
    const radius = Math.max(1, Number(payload.orbit_radius ?? 1));
    const speed = Number(payload.orbit_speed_deg_per_sec ?? 0);
    const startAngle = Number(payload.start_angle_deg ?? 0);
    const radiusCycleEnabled = Boolean(payload.orbit_radius_cycle_enabled ?? false);
    const radiusCycleAmplitude = Math.max(0, Number(payload.orbit_radius_cycle_amplitude ?? 0));
    const radiusCyclePeriodMs = Math.max(1, Math.round(Number(payload.orbit_radius_cycle_period_ms ?? 1000)));
    const radiusCyclePhaseDeg = Number(payload.orbit_radius_cycle_phase_deg ?? 0);
    const angleDeg = startAngle + (360 / orbCount) * orbIndex + speed * (tickTimeMs / 1000);
    const angleRad = (angleDeg * Math.PI) / 180;
    const effectiveRadius = orbitEffectiveRadius(radius, tickTimeMs, radiusCycleEnabled, radiusCycleAmplitude, radiusCyclePeriodMs, radiusCyclePhaseDeg);
    return {
      x: center.x + Math.cos(angleRad) * effectiveRadius,
      y: center.y + Math.sin(angleRad) * effectiveRadius
    };
  }

  function orbitEffectiveRadius(
    radius: number,
    timestampMs: number,
    radiusCycleEnabled: boolean,
    radiusCycleAmplitude: number,
    radiusCyclePeriodMs: number,
    radiusCyclePhaseDeg: number
  ) {
    if (!radiusCycleEnabled || radiusCycleAmplitude <= 0) return Math.max(1, radius);
    const cycleRad = (timestampMs / Math.max(1, radiusCyclePeriodMs)) * Math.PI * 2 + radiusCyclePhaseDeg * Math.PI / 180;
    return Math.max(1, radius + Math.sin(cycleRad) * radiusCycleAmplitude);
  }

  function isPlayerAttachedAreaEvent(event: SkillEvent) {
    return event.source_entity === "player" && playerAttachedAreaKey(event) !== null;
  }

  function playerAttachedAreaKey(event: SkillEvent) {
    const payload = event.payload ?? {};
    const radius = Number(payload.radius ?? 0);
    if (radius <= 0) return null;
    if (payload.center_policy === "player_center" && typeof payload.area_id === "string") {
      return payload.area_id;
    }
    if (payload.origin_policy === "caster" && typeof payload.zone_id === "string") {
      const phase = typeof payload.channel_phase === "string" ? payload.channel_phase : "damage_zone";
      return `${event.skill_instance_id}.caster.${phase}`;
    }
    return null;
  }

  function playerAttachedAreaPosition(event: SkillEvent) {
    return isPlayerAttachedAreaEvent(event) ? { x: playerStateRef.current.x, y: playerStateRef.current.y } : null;
  }

  function consumeSkillEventBatch(events: SkillEvent[]) {
    if (events.length === 0) return;
    const nextChainSegments: ChainSegmentVfx[] = [];
    const nextDamageZones: DamageZoneVfx[] = [];
    const replaceDamageZoneIds = new Set<string>();
    const nextHitVfxs: HitVfx[] = [];
    const nextAreaNovas: AreaNova[] = [];
    const nextMeleeArcs: MeleeArcVfx[] = [];
    const nextBolts: FireBolt[] = [];
    const nextTexts: FloatingText[] = [];
    const damageEvents: SkillEvent[] = [];
    const projectedEnemyHp = new Map(enemiesStateRef.current.map((enemy) => [enemy.id, enemy.hp]));
    const projectedEnemyById = new Map(enemiesStateRef.current.map((enemy) => [enemy.id, enemy]));
    const liveProjectileHits = new Set<string>();
    const deadProjectileHits = new Set<string>();
    const acceptedProjectileDamageTicks = new Set<string>();
    const acceptedDamageDisplayKeys = new Set<string>();
    const completedProjectileHits = new Map<string, { x: number; y: number }>();

    for (const event of events) {
      if (event.type === "buff_apply") {
        const payload = event.payload ?? {};
        if (Number.isFinite(Number(event.target_entity))) {
          applyEnemyBuffApplyEvent(event);
          continue;
        }
        const buffType = String(payload.buff_type ?? "");
        if (buffType) {
          const duration = Math.max(0.3, event.duration_ms / 1000);
          const skillId = String(payload.skill_id ?? event.skill_instance_id);
          const nextBuff: PlayerBuff = {
            id: nextPlayerBuffId.current++,
            buffType,
            skillId,
            remaining: duration,
            duration,
            remainingAmount: Math.max(0, Number(event.amount ?? payload.absorb_amount ?? 0)),
            absorbPercent: Math.max(0, Number(payload.absorb_percent ?? 0)),
            excludeDamageOverTime: Boolean(payload.exclude_damage_over_time ?? false),
            moveSpeedMultiplier: Number.isFinite(Number(payload.move_speed_multiplier))
              ? Math.max(0, Number(payload.move_speed_multiplier))
              : undefined,
            vfxKey: event.vfx_key
          };
          setRuntimePlayerBuffs([
            ...activePlayerBuffsRef.current.filter((buff) => !(buff.buffType === nextBuff.buffType && buff.skillId === nextBuff.skillId)),
            nextBuff
          ]);
          nextTexts.push({
            id: nextTextId.current++,
            x: playerStateRef.current.x,
            y: playerStateRef.current.y - 52,
            text: buffType === "guard" ? "石肤术" : "增益",
            damageType: "guard",
            ttl: 0.9,
            duration: 0.9
          });
        }
        continue;
      }
      if (event.type === "chain_segment") {
        const payload = event.payload ?? {};
        const start = (payload.start_position ?? event.position) as { x?: number; y?: number };
        const end = (payload.end_position ?? payload.target_world_position ?? event.position) as { x?: number; y?: number };
        const duration = Math.max(0.16, event.duration_ms / 1000);
        nextChainSegments.push({
          id: nextChainSegmentId.current++,
          startX: Number(start.x ?? event.position.x),
          startY: Number(start.y ?? event.position.y),
          endX: Number(end.x ?? event.position.x),
          endY: Number(end.y ?? event.position.y),
          ttl: duration,
          duration,
          hitAtMs: Math.max(0, Math.round(Number(payload.hit_at_ms ?? 0))),
          damageType: event.damage_type,
          vfxKey: event.vfx_key,
          segmentIndex: Number(payload.segment_index ?? 0),
          segmentId: typeof payload.segment_id === "string" ? payload.segment_id : event.event_id,
          skillId: typeof payload.skill_id === "string" ? payload.skill_id : event.skill_instance_id,
          vfxScale: normalizedVfxScale(payload.vfx_scale)
        });
        continue;
      }
      if (event.type === "damage_zone_prime" || event.type === "damage_zone") {
        const payload = event.payload ?? {};
        if (event.type === "damage_zone") applyChannelMovementBuff(event);
        const followedOrbitPosition = typeof payload.orbit_id === "string" ? liveOrbitPosition(payload, event.position) : null;
        const playerAttachedPosition = playerAttachedAreaPosition(event);
        const origin = playerAttachedPosition ?? followedOrbitPosition ?? ((payload.origin_world_position ?? payload.origin ?? event.position) as { x?: number; y?: number });
        const direction = (payload.direction_world ?? payload.facing_direction ?? event.direction) as { x?: number; y?: number };
        const shape = String(payload.shape ?? "circle") === "rectangle" ? "rectangle" : "circle";
        const duration = Math.max(0.18, event.duration_ms / 1000);
        const zoneId = playerAttachedAreaKey(event) ?? (typeof payload.zone_id === "string" ? payload.zone_id : event.event_id);
        const radius = Math.max(1, Number(payload.radius ?? 120));
        if (event.type === "damage_zone") replaceDamageZoneIds.add(zoneId);
        nextDamageZones.push({
          id: nextDamageZoneId.current++,
          x: Number(origin.x ?? event.position.x),
          y: Number(origin.y ?? event.position.y),
          shape,
          radius,
          length: Math.max(1, Number(payload.length ?? 160)),
          width: Math.max(1, Number(payload.width ?? 80)),
          directionX: Number(direction.x ?? event.direction.x),
          directionY: Number(direction.y ?? event.direction.y),
          ttl: duration,
          duration,
          damageType: event.damage_type,
          vfxKey: event.vfx_key,
          zoneId,
          skillId: typeof payload.skill_id === "string" ? payload.skill_id : event.skill_instance_id,
          warning: event.type === "damage_zone_prime",
          followPlayer: Boolean(playerAttachedPosition),
          vfxScale: normalizedVfxScale(payload.vfx_scale),
          tickProgress: 0
        });
        registerActiveDamageZone(
          event,
          zoneId,
          { x: Number(origin.x ?? event.position.x), y: Number(origin.y ?? event.position.y) },
          { x: Number(direction.x ?? event.direction.x), y: Number(direction.y ?? event.direction.y) },
          shape
        );
        continue;
      }
      if (event.type === "orbit_spawn" || event.type === "orbit_tick") {
        const payload = event.payload ?? {};
        const rawPosition = event.type === "orbit_spawn"
          ? liveOrbitCenter(payload, event.position)
          : liveOrbitPosition(payload, event.position);
        const visualDuration = event.type === "orbit_spawn"
          ? Math.max(0.3, Math.min(1.0, event.duration_ms / 1000))
          : 0.18;
        nextHitVfxs.push({
          id: nextHitVfxId.current++,
          x: Number(rawPosition.x ?? event.position.x),
          y: Number(rawPosition.y ?? event.position.y),
          projectileId: typeof payload.orbit_id === "string" ? payload.orbit_id : event.event_id,
          projectileIndex: Number(payload.orb_index ?? 0) + 1,
          projectileCount: Number(payload.orb_count ?? 1),
          impactKind: event.type,
          ttl: visualDuration,
          duration: visualDuration,
          damageType: event.damage_type,
          vfxKey: event.vfx_key,
          skillTemplateId: event.skill_instance_id,
          shapeEffects: shapeEffectsFromUnknown(payload.shape_effects),
          vfxScale: normalizedVfxScale(payload.vfx_scale)
        });
        continue;
      }
      if (event.type === "projectile_impact") {
        const payload = event.payload ?? {};
        const impact = (payload.impact_position ?? event.position) as { x?: number; y?: number };
        nextHitVfxs.push({
          id: nextHitVfxId.current++,
          x: Number(impact.x ?? event.position.x),
          y: Number(impact.y ?? event.position.y),
          targetId: hitVfxTargetId(event),
          projectileId: typeof payload.projectile_id === "string" ? payload.projectile_id : undefined,
          ttl: 0.18,
          duration: 0.18,
          damageType: event.damage_type,
          vfxKey: event.vfx_key,
          skillTemplateId: event.skill_instance_id,
          shapeEffects: shapeEffectsFromUnknown(payload.shape_effects),
          vfxScale: normalizedVfxScale(payload.vfx_scale)
        });
        continue;
      }
      if (event.type === "melee_arc") {
        const payload = event.payload ?? {};
        const origin = (payload.origin_world_position ?? payload.origin ?? event.position) as { x?: number; y?: number };
        const direction = (payload.direction_world ?? payload.facing_direction ?? event.direction) as { x?: number; y?: number };
        const duration = Math.max(0.18, event.duration_ms / 1000);
        nextMeleeArcs.push({
          id: nextMeleeArcId.current++,
          x: Number(origin.x ?? event.position.x),
          y: Number(origin.y ?? event.position.y),
          radius: Math.max(1, Number(payload.arc_radius ?? 160)),
          arcAngle: clamp(Number(payload.arc_angle ?? 70), 1, 180),
          directionX: Number(direction.x ?? event.direction.x),
          directionY: Number(direction.y ?? event.direction.y),
          ttl: duration,
          duration,
          damageType: event.damage_type,
          vfxKey: event.vfx_key,
          arcId: typeof payload.arc_id === "string" ? payload.arc_id : event.event_id,
          skillId: typeof payload.skill_id === "string" ? payload.skill_id : event.skill_instance_id,
          vfxScale: normalizedVfxScale(payload.vfx_scale)
        });
        continue;
      }
      if (event.type === "area_spawn") {
        const payload = event.payload ?? {};
        const center = (payload.center_world_position ?? payload.center ?? event.position) as { x?: number; y?: number };
        const duration = Math.max(0.25, event.duration_ms / 1000);
        nextAreaNovas.push({
          id: nextAreaNovaId.current++,
          x: Number(center.x ?? event.position.x),
          y: Number(center.y ?? event.position.y),
          radius: Math.max(1, Number(payload.radius ?? 120)),
          ringWidth: Math.max(1, Number(payload.ring_width ?? 48)),
          ttl: duration,
          duration,
          damageType: event.damage_type,
          vfxKey: event.vfx_key,
          areaId: typeof payload.area_id === "string" ? payload.area_id : event.event_id,
          skillId: typeof payload.skill_id === "string" ? payload.skill_id : event.skill_instance_id,
          followPlayer: payload.center_policy === "player_center" && event.source_entity === "player",
          vfxScale: normalizedVfxScale(payload.vfx_scale)
        });
        continue;
      }
      if (event.type === "projectile_spawn") {
        const spawnPosition = projectileSpawnPositionForEvent(event);
        const targetPosition = pointFromUnknown(event.payload?.target_world_position);
        const payloadDirection = pointFromUnknown(event.payload?.direction_world);
        const velocityPayload = event.payload?.velocity_world as { x?: number; y?: number } | undefined;
        const velocityLength = Math.hypot(Number(velocityPayload?.x ?? 0), Number(velocityPayload?.y ?? 0));
        const projectileSpeed = Number(event.payload?.projectile_speed ?? velocityLength);
        const liveMonsterTrajectory = liveMonsterProjectileTrajectoryForEvent(event, spawnPosition, projectileSpeed);
        const directionWorld = liveMonsterTrajectory?.direction ?? (velocityLength > 0
          ? normalizedWorldDirection({ x: Number(velocityPayload?.x ?? 0), y: Number(velocityPayload?.y ?? 0) })
          : payloadDirection
            ? normalizedWorldDirection(payloadDirection)
            : normalizedWorldDirection(event.direction));
        const velocityWorld = liveMonsterTrajectory?.velocity ?? (velocityLength > 0
          ? { x: Number(velocityPayload?.x ?? 0), y: Number(velocityPayload?.y ?? 0) }
          : {
              x: directionWorld.x * projectileSpeed,
              y: directionWorld.y * projectileSpeed
            });
        const payloadEndPosition = event.payload?.expire_world_position ?? event.payload?.end_position;
        const endPosition = liveMonsterTrajectory?.target ?? targetPosition ?? pointFromUnknown(payloadEndPosition) ?? event.position;
        const lifetimeMs = Number(event.payload?.lifetime_ms ?? event.duration_ms);
        const aliveDuration = Math.max(0.001, lifetimeMs / 1000);
        const runtimeProjectileVfxKind = projectileVfxKind(event.vfx_key) ?? projectileVfxKind(event.skill_instance_id);
        const projectileExitFadeDuration = runtimeProjectileVfxKind === "burning_shot" ? 0 : PROJECTILE_BODY_EXIT_FADE_DURATION;
        nextBolts.push({
          id: nextBoltId.current++,
          x: spawnPosition.x,
          y: spawnPosition.y,
          targetX: endPosition.x,
          targetY: endPosition.y,
          directionX: directionWorld.x,
          directionY: directionWorld.y,
          velocityX: velocityWorld?.x,
          velocityY: velocityWorld?.y,
          projectileId: typeof event.payload?.projectile_id === "string" ? event.payload.projectile_id : event.event_id,
          skillId: typeof event.payload?.skill_id === "string" ? event.payload.skill_id : event.skill_instance_id,
          projectileIndex: Number(event.payload?.projectile_index ?? 1),
          projectileCount: Number(event.payload?.projectile_count ?? 1),
          fanAngle: Number(event.payload?.fan_angle ?? event.payload?.spread_angle_deg ?? 0),
          localSpreadAngle: Number(event.payload?.local_spread_angle ?? 0),
          pierceRemaining: Number(event.payload?.pierce_remaining ?? 0),
          projectileSpeed: Number(event.payload?.projectile_speed ?? Math.hypot(velocityWorld?.x ?? 0, velocityWorld?.y ?? 0)),
          projectileWidth: Number(event.payload?.projectile_width ?? 38),
          projectileHeight: Number(event.payload?.projectile_height ?? 24),
          splitProjectile: Boolean(event.payload?.split_projectile),
          impactRadius: Number(event.payload?.impact_radius ?? 18),
          trajectory: String(event.payload?.trajectory ?? "linear"),
          arcHeight: Number(event.payload?.arc_height ?? 0),
          sineAmplitude: Number(event.payload?.sine_amplitude ?? 0),
          sineFrequency: Number(event.payload?.sine_frequency ?? 0),
          projectileVisualMode: String(event.payload?.projectile_visual_mode ?? "standard"),
          targetId: Number.isFinite(Number(event.target_entity)) ? Number(event.target_entity) : undefined,
          ttl: aliveDuration + projectileExitFadeDuration,
          duration: aliveDuration,
          fadeDuration: projectileExitFadeDuration,
          skillTemplateId: event.skill_instance_id,
          behaviorType: "projectile",
          damageType: event.damage_type,
          visualEffect: event.vfx_key,
          vfxKey: event.vfx_key,
          shapeEffects: [],
          areaScale: Number(event.payload?.area_scale ?? 1),
          vfxScale: normalizedVfxScale(event.payload?.vfx_scale),
          sourceEntity: event.source_entity === "boss" ? "boss" : "player",
          sourceEnemyId: Number.isFinite(Number(event.payload?.source_enemy_id)) ? Number(event.payload?.source_enemy_id) : undefined,
          canHitPlayer: event.source_entity === "boss" && event.payload?.can_hit_player === true,
          playerDamageMultiplier: Number(event.payload?.player_damage_multiplier ?? 1),
          playerHitKind: event.payload?.player_hit_kind === "spell" ? "spell" : "attack",
          playerLeashRange: Number.isFinite(Number(event.payload?.player_leash_range)) ? Number(event.payload?.player_leash_range) : undefined,
          playerHitMarkerId: typeof event.payload?.hit_marker_id === "string" ? event.payload.hit_marker_id : undefined,
          suppressHitVfx: event.payload?.suppress_hit_vfx === true,
          collisionRadius: Number(event.payload?.collision_radius ?? event.payload?.projectile_radius ?? event.payload?.impact_radius ?? 18),
          sourceSkillName: typeof event.payload?.skill_name === "string" ? event.payload.skill_name : undefined
        });
        continue;
      }
      if (event.type === "projectile_hit") {
        const projectileId = projectileIdFromEvent(event);
        if (projectileId && event.payload?.projectile_continues !== true) {
          completedProjectileHits.set(
            projectileId,
            pointFromUnknown(event.payload?.hit_world_position)
              ?? pointFromUnknown(event.payload?.impact_world_position)
              ?? pointFromUnknown(event.position)
              ?? event.position
          );
        }
        const targetId = Number(event.target_entity);
        const hitTargetKey = projectileTargetFollowupKey(event);
        if (hitTargetKey && Number.isFinite(targetId) && (projectedEnemyHp.get(targetId) ?? 0) <= 0) {
          deadProjectileHits.add(hitTargetKey);
        } else if (hitTargetKey) {
          liveProjectileHits.add(hitTargetKey);
        }
        continue;
      }
      if (event.type === "damage") {
        const targetId = Number(event.target_entity);
        const projectileId = projectileIdFromEvent(event);
        const hitTargetKey = projectileTargetFollowupKey(event);
        if (hitTargetKey && deadProjectileHits.has(hitTargetKey)) continue;
        if (Number.isFinite(targetId)) {
          const currentHp = projectedEnemyHp.get(targetId);
          if (currentHp === undefined || currentHp <= 0) continue;
          const enemy = projectedEnemyById.get(targetId);
          const damage = enemy ? damageEventAmountAgainstEnemy(event, enemy) : Number(event.amount ?? 0);
          if (damage <= 0) continue;
          const nextHp = currentHp - damage;
          if (projectileId && isProjectileTickFollowup(event)) {
            acceptedProjectileDamageTicks.add(projectileFollowupKey(event));
          }
          acceptedDamageDisplayKeys.add(damageDisplayKey(event));
          projectedEnemyHp.set(targetId, nextHp);
        }
        damageEvents.push(event);
        continue;
      }
      if (event.type === "status_apply") {
        if (isFrontendPlayerStatusTarget(event)) {
          applyPlayerStatusBuffEvent(event);
          continue;
        }
        const targetId = Number(event.target_entity);
        if (Number.isFinite(targetId) && (projectedEnemyHp.get(targetId) ?? 0) <= 0) continue;
        applyEnemyStatusBuff(event);
        continue;
      }
      if (event.type === "forced_movement") {
        applyForcedMovementEvent(event);
        continue;
      }
      if (event.type === "hit_vfx") {
        const projectileId = projectileIdFromEvent(event);
        if (projectileId && shouldSuppressProjectileFollowup(event, projectedEnemyHp, liveProjectileHits, deadProjectileHits, acceptedProjectileDamageTicks)) continue;
        const eventVfxKind = projectileVfxKind(event.vfx_key) ?? projectileVfxKind(event.skill_instance_id);
        const visualDuration = eventVfxKind === "penetrating_shot" ? PENETRATING_SHOT_IMPACT_DURATION_MS / 1000 : Math.max(0.12, event.duration_ms / 1000);
        const targetEnemy = targetedEnemyForEvent(event, projectedEnemyById);
        const impact = targetEnemy
          ?? pointFromUnknown(event.payload?.hit_world_position)
          ?? pointFromUnknown(event.payload?.impact_world_position)
          ?? pointFromUnknown(event.position)
          ?? event.position;
        nextHitVfxs.push({
          id: nextHitVfxId.current++,
          x: impact.x,
          y: impact.y,
          targetId: hitVfxTargetId(event),
          projectileId: typeof event.payload?.projectile_id === "string" ? event.payload.projectile_id : undefined,
          projectileIndex: Number(event.payload?.projectile_index ?? 1),
          projectileCount: Number(event.payload?.projectile_count ?? 1),
          pierceRemaining: Number(event.payload?.pierce_remaining ?? 0),
          impactKind: typeof event.payload?.impact_kind === "string" ? event.payload.impact_kind : undefined,
          projectileWidth: Number(event.payload?.projectile_width ?? 38),
          projectileHeight: Number(event.payload?.projectile_height ?? 24),
          impactRadius: Number(event.payload?.impact_radius ?? 18),
          ttl: visualDuration,
          duration: visualDuration,
          damageType: event.damage_type,
          vfxKey: event.vfx_key,
          skillTemplateId: event.skill_instance_id,
          shapeEffects: shapeEffectsFromUnknown(event.payload?.shape_effects),
          vfxScale: normalizedVfxScale(event.payload?.vfx_scale)
        });
        continue;
      }
      if (event.type === "floating_text") {
        const projectileId = projectileIdFromEvent(event);
        if (projectileId && shouldSuppressProjectileFollowup(event, projectedEnemyHp, liveProjectileHits, deadProjectileHits, acceptedProjectileDamageTicks)) continue;
        const targetId = Number(event.target_entity);
        const displayKey = damageDisplayKey(event);
        const hasAcceptedDamage = acceptedDamageDisplayKeys.has(displayKey);
        if (Number.isFinite(targetId) && (projectedEnemyHp.get(targetId) ?? 0) <= 0 && !hasAcceptedDamage) continue;
        if (hasAcceptedDamage) acceptedDamageDisplayKeys.delete(displayKey);
        const targetEnemy = targetedEnemyForEvent(event, projectedEnemyById);
        const textPosition = targetEnemy ? { x: targetEnemy.x, y: targetEnemy.y - 28 } : event.position;
        const explicitText = typeof event.payload?.text === "string" ? event.payload.text : typeof event.payload?.floating_text === "string" ? event.payload.floating_text : "";
        if (explicitText) {
          nextTexts.push({
            id: nextTextId.current++,
            x: textPosition.x,
            y: textPosition.y,
            text: explicitText,
            damageType: event.damage_type,
            ttl: Math.max(0.3, event.duration_ms / 1000),
            duration: Math.max(0.3, event.duration_ms / 1000)
          });
          continue;
        }
        const floatingComponents = floatingTextDamageComponents(event);
        floatingComponents.forEach(([damageType, amount], index) => {
          nextTexts.push({
            id: nextTextId.current++,
            x: textPosition.x + (index - (floatingComponents.length - 1) / 2) * 18,
            y: textPosition.y - index * 14,
            text: damageNumberText(amount),
            damageType,
            ttl: Math.max(0.3, event.duration_ms / 1000),
            duration: Math.max(0.3, event.duration_ms / 1000)
          });
        });
      }
    }

    if (nextChainSegments.length > 0) {
      setChainSegments((items) => capRuntimeVisualBudget([...items, ...nextChainSegments], MAX_RUNTIME_AREA_VFX));
    }
    if (nextDamageZones.length > 0) {
      const uniqueNextDamageZones = uniqueDamageZonesByZoneId(nextDamageZones);
      setDamageZones((items) => capRuntimeVisualBudget(
        [
          ...uniqueDamageZonesByZoneId(items).filter((zone) => !zone.zoneId || !replaceDamageZoneIds.has(zone.zoneId)),
          ...uniqueNextDamageZones
        ],
        MAX_RUNTIME_AREA_VFX
      ));
    }
    if (nextHitVfxs.length > 0) {
      setHitVfxs((items) => capRuntimeVisualBudget([...items, ...nextHitVfxs], MAX_RUNTIME_HIT_VFX));
    }
    if (nextAreaNovas.length > 0) {
      setAreaNovas((items) => capRuntimeVisualBudget([...items, ...nextAreaNovas], MAX_RUNTIME_AREA_VFX));
    }
    if (nextMeleeArcs.length > 0) {
      setMeleeArcs((items) => capRuntimeVisualBudget([...items, ...nextMeleeArcs], MAX_RUNTIME_AREA_VFX));
    }
    if (nextBolts.length > 0 || completedProjectileHits.size > 0) {
      const completedNextBolts = nextBolts.map((bolt) => finishCompletedProjectileBody(bolt, completedProjectileHits));
      setBolts((items) => capRuntimeVisualBudget(
        [
          ...items.map((bolt) => finishCompletedProjectileBody(bolt, completedProjectileHits)),
          ...completedNextBolts
        ],
        MAX_RUNTIME_PROJECTILE_VISUALS
      ));
    }
    if (nextTexts.length > 0) {
      setTexts((items) => capRuntimeVisualBudget([...items, ...nextTexts], MAX_RUNTIME_FLOATING_TEXT));
    }
    if (damageEvents.length > 0) {
      applyDamageEventBatch(damageEvents);
    }
  }

  function applyEnemyBuffApplyEvent(event: SkillEvent) {
    const payload = event.payload ?? {};
    const buffType = String(payload.buff_type ?? payload.effect_type ?? "");
    const effectType = String(payload.effect_type ?? buffType);
    if (!buffType && !effectType) return;
    applyEnemyStatusBuff({
      ...event,
      type: "status_apply",
      payload: {
        ...payload,
        status_type: effectType || buffType,
        buff_type: buffType || effectType,
        polarity: String(payload.polarity ?? "negative"),
        base_value: Number(payload.base_value ?? 0),
        effect_per_stack: Number(payload.effect_per_stack ?? payload.base_value ?? 0)
      }
    });
  }

  function isFrontendPlayerStatusTarget(event: SkillEvent) {
    const targetText = String(event.target_entity ?? event.payload?.target_entity ?? event.payload?.target_type ?? "");
    return targetText === "player" || targetText === "player_1" || targetText.startsWith("player:");
  }

  function applyPlayerStatusBuffEvent(event: SkillEvent) {
    const payload = event.payload ?? {};
    const statusType = normalizeFrontendStatusType(String(payload.status_type ?? payload.buff_type ?? ""));
    if (!statusType) return;
    const preventionReason = frontendPlayerStatusPreventionReason(statusType, event);
    if (preventionReason) {
      setTexts((items) => capRuntimeVisualBudget([
        ...items,
        {
          id: nextTextId.current++,
          x: playerStateRef.current.x,
          y: playerStateRef.current.y - 52,
          text: preventionReason,
          damageType: "guard",
          ttl: 0.75,
          duration: 0.75
        }
      ], MAX_RUNTIME_FLOATING_TEXT));
      return;
    }
    const duration = Math.max(0.1, Number(payload.duration_ms ?? event.duration_ms ?? 0) / 1000);
    const skillId = String(payload.source_skill_id ?? payload.skill_id ?? event.skill_instance_id ?? "monster_status");
    const nextBuff: PlayerBuff = {
      id: nextPlayerBuffId.current++,
      buffType: statusType,
      skillId,
      remaining: duration,
      duration,
      remainingAmount: 0,
      absorbPercent: 0,
      excludeDamageOverTime: false,
      vfxKey: event.vfx_key
    };
    setRuntimePlayerBuffs([
      ...activePlayerBuffsRef.current.filter((buff) => !(buff.buffType === nextBuff.buffType && buff.skillId === nextBuff.skillId)),
      nextBuff
    ]);
  }

  function frontendPlayerStatusPreventionReason(statusType: string, event: SkillEvent) {
    for (const stat of frontendPlayerStatusImmunityStats(statusType)) {
      if (frontendPlayerStatActive(stat)) return "免疫";
    }
    if (frontendElementalAilmentTypes().has(statusType)) {
      if (frontendPlayerStatActive("prevent_elemental_ailments")) return "免疫";
      const avoidPercent = Math.max(0, statNumber(state?.player_stats?.avoid_elemental_ailments_percent, 0));
      if (avoidPercent >= 100) return "避免";
      if (avoidPercent > 0 && stablePercent(`${event.event_id}:${statusType}:player_avoid_ailment`) < avoidPercent) return "避免";
    }
    return "";
  }

  function frontendPlayerStatActive(stat: string) {
    const value = state?.player_stats?.[stat]?.value;
    return value === true || (typeof value === "number" && value > 0);
  }

  function applyEnemyStatusBuff(event: SkillEvent) {
    const targetId = Number(event.target_entity);
    if (!Number.isFinite(targetId)) return;
    const payload = event.payload ?? {};
    const statusType = normalizeFrontendStatusType(String(payload.status_type ?? ""));
    if (!statusType) return;
    const targetEnemy = enemiesStateRef.current.find((enemy) => enemy.id === targetId && enemy.hp > 0);
    if (!targetEnemy) return;
    const applyChance = 100 - enemyStatusApplyResistancePercent(targetEnemy, statusType);
    if (applyChance <= 0) return;
    if (applyChance < 100 && stablePercent(`${event.event_id}:${targetId}:${statusType}:enemy_status_resist`) >= applyChance) return;
    const duration = Math.max(0.1, Number(payload.duration_ms ?? event.duration_ms ?? 0) / 1000)
      * enemyStatusDurationMultiplier(targetEnemy, statusType);
    if (duration <= 0) return;
    const valuePercent = Math.max(0, Number(payload.effect_per_stack ?? payload.base_value ?? 0));
    const baseValue = Math.max(0, Number(payload.base_value ?? 0));
    const sourceSkillId = String(payload.source_skill_id ?? payload.skill_id ?? event.skill_instance_id);
    const statusDamageAddPercent =
      Number(payload.dot_damage_add_percent ?? 0)
      + Number(payload.ailment_damage_add_percent ?? 0)
      + Number(payload.ailment_damage_deepen_percent ?? 0);
    const baseDamagePerSecond = Math.max(0, Number(payload.base_damage_per_second ?? 0))
      * Math.max(0, 1 + statusDamageAddPercent / 100)
      * (1 + Math.max(0, Number(payload.damage_over_time_more_percent ?? 0)) / 100);
    const nextBuff: EnemyBuff = {
      buffType: statusType,
      statusType,
      polarity: "negative",
      remaining: duration,
      duration,
      valuePercent,
      baseValue,
      baseDamagePerSecond,
      damageType: event.damage_type,
      nextFloatingTextIn: DOT_FLOATING_TEXT_INTERVAL_SECONDS,
      sourceSkillId
    };
    const next = enemiesStateRef.current.map((enemy) => {
      if (enemy.id !== targetId || enemy.hp <= 0) return enemy;
      const existing = (enemy.activeBuffs ?? []).find((buff) => buff.statusType === nextBuff.statusType && buff.sourceSkillId === nextBuff.sourceSkillId);
      const mergedBuff = existing
        ? {
            ...nextBuff,
            remaining: Math.max(existing.remaining, nextBuff.remaining),
            baseValue: (existing.baseValue ?? 0) + (nextBuff.baseValue ?? 0),
            baseDamagePerSecond: Math.max(existing.baseDamagePerSecond ?? 0, nextBuff.baseDamagePerSecond ?? 0)
          }
        : nextBuff;
      const activeBuffs = [
        ...(enemy.activeBuffs ?? []).filter((buff) => !(buff.statusType === nextBuff.statusType && buff.sourceSkillId === nextBuff.sourceSkillId)),
        mergedBuff
      ];
      return { ...enemy, activeBuffs };
    });
    enemiesStateRef.current = next;
    setEnemies(next);
  }

  function applyForcedMovementEvent(event: SkillEvent) {
    const rawTargetEntity = String(event.target_entity ?? "").trim();
    const targetId = rawTargetEntity === "" ? Number.NaN : Number(rawTargetEntity);
    const payload = event.payload ?? {};
    const fallbackDestination = pointFromUnknown(payload.destination_world_position) ?? pointFromUnknown(event.position);
    const origin = pointFromUnknown(payload.origin_world_position) ?? pointFromUnknown(payload.origin);
    const movementPolicy = String(payload.movement_policy ?? "");
    const movementScope = String(payload.movement_scope ?? "");
    const movementDistance = Math.max(0, Number(payload.movement_distance ?? event.amount ?? 0));
    if (!Number.isFinite(targetId) && !(movementPolicy === "pull_to_origin" && movementScope === "damage_zone" && origin && movementDistance > 0)) return;
    const next = enemiesStateRef.current.map((enemy) => {
      if (enemy.hp <= 0) return enemy;
      if (Number.isFinite(targetId) && enemy.id !== targetId) return enemy;
      let destination = fallbackDestination;
      if (movementPolicy === "pull_to_origin" && origin && movementDistance > 0) {
        const dx = origin.x - enemy.x;
        const dy = origin.y - enemy.y;
        const length = Math.hypot(dx, dy);
        const radius = Math.max(0, Number(payload.radius ?? 0));
        if (!Number.isFinite(targetId) && (radius <= 0 || length > radius)) return enemy;
        if (length > 0) {
          const distance = Math.min(movementDistance, length);
          destination = {
            x: enemy.x + dx / length * distance,
            y: enemy.y + dy / length * distance
          };
        } else {
          destination = origin;
        }
      } else if (movementPolicy === "push_along_direction" && movementDistance > 0) {
        const pushDirection = origin ? guideDirection(origin, enemy) : normalizedWorldDirection(event.direction);
        const rawDestination = {
          x: enemy.x + pushDirection.x * movementDistance,
          y: enemy.y + pushDirection.y * movementDistance
        };
        destination = battleMap ? resolveWalkableMove(battleMap, enemy, rawDestination) : rawDestination;
      }
      if (!destination) return enemy;
      const lockMs = movementPolicy === "push_along_direction" ? Math.max(0, Number(payload.knockback_lock_ms ?? FRONTEND_KNOCKBACK_LOCK_MS)) : 0;
      const knockbackUntilMs = lockMs > 0
        ? Math.max(Number(enemy.knockbackUntilMs ?? 0), Math.round(elapsedRef.current * 1000) + lockMs)
        : enemy.knockbackUntilMs;
      return { ...enemy, x: destination.x, y: destination.y, velocityX: 0, velocityY: 0, knockbackUntilMs };
    });
    enemiesStateRef.current = next;
    setEnemies(next);
  }

  function mergeBackendInventoryState(nextState: AppState) {
    applyFrontendState((current) => ({
      ...current,
      inventory: nextState.inventory,
      stash_pages: nextState.stash_pages ?? current.stash_pages,
      board: nextState.board,
      skill_preview: nextState.skill_preview,
      skill_error: nextState.skill_error,
      logs: nextState.logs,
      player_stats: nextState.player_stats,
      character_panel: nextState.character_panel,
      equipment_slots: nextState.equipment_slots,
      ui_text: nextState.ui_text ?? current.ui_text
    }));
    if (nextState.equipment_slots) setEquipmentSlots(normalizeEquipmentSlots(nextState.equipment_slots));
  }

  function applyDamageEventBatch(events: SkillEvent[]) {
    const damageByTarget = new Map<number, number>();
    const enemyById = new Map(enemiesStateRef.current.map((enemy) => [enemy.id, enemy]));
    const remainingHp = new Map(enemiesStateRef.current.map((enemy) => [enemy.id, enemy.hp]));
    const remainingShield = new Map(enemiesStateRef.current.map((enemy) => [enemy.id, Math.max(0, Number(enemy.currentEnergyShield ?? 0))]));
    const killedTriggers: { event: SkillEvent; enemy: Enemy }[] = [];
    for (const event of events) {
      const targetId = Number(event.target_entity);
      if (!Number.isFinite(targetId)) continue;
      const enemy = enemyById.get(targetId);
      const damage = enemy ? damageEventAmountAgainstEnemy(event, enemy) : Number(event.amount ?? 0);
      damageByTarget.set(targetId, (damageByTarget.get(targetId) ?? 0) + damage);
      if (!enemy || damage <= 0) continue;
      if (enemy.boss || enemy.spawnRarity === "rare") gainWarIntentPoint();
      const before = remainingHp.get(targetId) ?? enemy.hp;
      const resourceResult = applyDamageToEnemyResources({
        ...enemy,
        hp: before,
        currentEnergyShield: remainingShield.get(targetId) ?? enemy.currentEnergyShield
      }, damage);
      let after = resourceResult.hp;
      remainingShield.set(targetId, Math.max(0, Number(resourceResult.currentEnergyShield ?? 0)));
      const cullThresholdPercent = Math.max(0, Number(event.payload?.cull_threshold_percent ?? 0));
      if (cullThresholdPercent > 0 && enemy.maxHp > 0 && after > 0 && after / enemy.maxHp * 100 <= cullThresholdPercent) {
        after = 0;
      }
      if (before > 0 && after <= 0) {
        killedTriggers.push({ event, enemy });
      }
      remainingHp.set(targetId, after);
    }
    if (damageByTarget.size === 0) return;
    setRuntimePlayer((current) => recoverFrontendPlayerOnHit(current));
    const liveEnemiesAfterDamage = enemiesStateRef.current
      .map((enemy) => {
        const hp = remainingHp.get(enemy.id) ?? enemy.hp;
        const currentEnergyShield = remainingShield.has(enemy.id) ? remainingShield.get(enemy.id) : enemy.currentEnergyShield;
        return { ...enemy, hp, currentEnergyShield, lastDamagedAt: hp < enemy.hp ? elapsedRef.current : enemy.lastDamagedAt };
      })
      .filter((enemy) => shouldRetainEnemyForGameplayOrDamageFlash(enemy, elapsedRef.current));
    let killed = 0;
    const killedEnemies: Enemy[] = [];
    for (const enemy of enemiesStateRef.current) {
      const before = enemy.hp;
      const after = remainingHp.get(enemy.id) ?? before;
      if (before > 0 && after <= 0) {
        killed += 1;
        killedEnemies.push(enemy);
        gainWarIntentPoint();
      }
    }
    const onKillEvents: SkillEvent[] = [];
    for (const trigger of killedTriggers) {
      const event = trigger.event;
      const payload = event.payload ?? {};
      const chromaticChance = Number(payload.on_kill_explosion_chance_percent ?? 0);
      const chromaticRadius = Number(payload.on_kill_explosion_radius ?? 0);
      const chromaticPercent = Number(payload.on_kill_explosion_max_life_percent ?? 0);
      if (chromaticChance > 0 && chromaticRadius > 0 && chromaticPercent > 0) {
        const roll = stablePercent(`${event.event_id}:on_kill_explosion`);
        if (roll <= chromaticChance) {
          const amount = trigger.enemy.maxHp * chromaticPercent / 100;
          const targets = frontendUniqueTargetsByDistance(enemiesStateRef.current, trigger.enemy, chromaticRadius, 8);
          onKillEvents.push(frontendSkillEvent({
            active_gem_instance_id: event.skill_instance_id,
            name_text: String(payload.skill_name ?? "五彩魔矢"),
            skill_template_id: String(payload.skill_id ?? event.skill_instance_id),
            template_text: String(payload.skill_name ?? "五彩魔矢"),
            damage_type: "true",
            behavior_type: "damage_zone",
            visual_effect: event.vfx_key,
            shape_effects: [],
            final_damage: amount,
            final_cooldown_ms: 0,
            projectile_count: 1,
            area_multiplier: 1,
            speed_multiplier: 1,
            applied_modifiers: []
          }, "damage_zone", null, { x: trigger.enemy.x, y: trigger.enemy.y }, event.direction, amount, "true", {
            secondary_hit_id: "on_kill_explosion",
            radius: chromaticRadius,
            hit_target_count: targets.length,
            trigger_event_type: "unit_killed"
          }, 240));
          for (const target of targets) {
            if (target.id === trigger.enemy.id) continue;
            onKillEvents.push({
              ...event,
              event_id: `${event.event_id}.on_kill.${target.id}`,
              type: "damage",
              target_entity: String(target.id),
              position: { x: target.x, y: target.y },
              amount,
              damage_type: "true",
              payload: {
                ...payload,
                secondary_hit_id: "on_kill_explosion",
                damage_components: { true: amount },
                trigger_event_type: "unit_killed"
              }
            });
            onKillEvents.push({
              ...event,
              event_id: `${event.event_id}.on_kill_text.${target.id}`,
              type: "floating_text",
              target_entity: String(target.id),
              position: { x: target.x, y: target.y - 28 },
              amount,
              damage_type: "true",
              duration_ms: 800,
              payload: {
                ...payload,
                secondary_hit_id: "on_kill_explosion",
                damage_components: { true: amount },
                trigger_event_type: "unit_killed"
              }
            });
          }
        }
      }
      const recastChance = Number(payload.on_kill_recast_chance_percent ?? 0);
      const areaId = typeof payload.area_id === "string" ? payload.area_id : "";
      if (recastChance > 0 && areaId) {
        const maxRecasts = Math.max(1, Number(payload.on_kill_recast_max_per_area ?? 1));
        const currentCount = onKillRecastCounts.current.get(areaId) ?? 0;
        if (currentCount < maxRecasts && stablePercent(`${event.event_id}:on_kill_recast:${currentCount + 1}`) <= recastChance) {
          onKillRecastCounts.current.set(areaId, currentCount + 1);
          const radius = Number(payload.radius ?? 118);
          const targets = frontendUniqueTargetsByDistance(enemiesStateRef.current, trigger.enemy, radius, 8, new Set([trigger.enemy.id]));
          onKillEvents.push({
            ...event,
            event_id: `${event.event_id}.recast_area`,
            type: "area_spawn",
            target_entity: "",
            position: { x: trigger.enemy.x, y: trigger.enemy.y },
            amount: null,
            payload: {
              ...payload,
              area_id: `${areaId}.recast.${currentCount + 1}`,
              center_world_position: { x: trigger.enemy.x, y: trigger.enemy.y },
              trigger_event_type: "unit_killed"
            }
          });
          for (const target of targets) {
            onKillEvents.push({
              ...event,
              event_id: `${event.event_id}.recast_damage.${target.id}`,
              target_entity: String(target.id),
              position: { x: target.x, y: target.y },
              payload: {
                ...payload,
                area_id: `${areaId}.recast.${currentCount + 1}`,
                damage_components: { [event.damage_type]: Number(event.amount ?? 0) },
                trigger_event_type: "unit_killed"
              }
            });
          }
        }
      }
    }
    enemiesStateRef.current = liveEnemiesAfterDamage;
    setEnemies(liveEnemiesAfterDamage);
    if (killed > 0) {
      const skillName = events.find((event) => typeof event.payload?.skill_name === "string")?.payload?.skill_name ?? "技能";
      setKills((value) => value + killed);
      void spawnFrontendDrops(killedEnemies);
      setCombatLogs((logs) => [`${skillName} 击杀 ${killed} 个怪物。`, ...logs].slice(0, 8));
    }
    if (onKillEvents.length > 0) consumeSkillEventBatch(onKillEvents);
  }

async function placeFloatingItem(current: FloatingGem, target: DropTarget, event: globalThis.MouseEvent): Promise<PlacementResult> {
    if (target.kind === "invalid") return { type: "reject" };
    if (isDropBackToOrigin(current, target, state, inventorySlots, equipmentSlots, state?.stash_pages)) return { type: "place" };
    if (target.kind === "map") {
      const prompt = {
        item: current.gem,
        origin: current.origin,
        position: target.position
      };
      if (skipItemDiscardConfirmToday && loadItemDiscardSkipConfirmPreference()) {
        discardItem(prompt);
      } else {
        if (skipItemDiscardConfirmToday) setSkipItemDiscardConfirmToday(false);
        setItemDiscardPrompt(prompt);
      }
      return { type: "place" };
    }
    if (target.kind === "bag") return await placeItemInBag(current, target.slotIndex);
    if (target.kind === "stash") return await placeItemInStash(current, target.pageIndex, target.slotIndex);
    if (target.kind === "equipment") return await placeItemInEquipmentSlot(current, target.slotIndex, event);
    return await placeItemOnBoard(current, target.row, target.column, event);
  }

  async function placeItemInBag(current: FloatingGem, slotIndex: number): Promise<PlacementResult> {
    if (!state) return { type: "reject" };
    const instanceId = current.gem.instance_id;
    const dragged = inventoryItemById(state, instanceId);
    if (!dragged) {
      setNotice("没有找到这颗宝石。");
      return { type: "reject" };
    }
    const targetItem = inventoryItemById(state, inventorySlots[slotIndex]);
    setEquipmentSlots((slots) => removeItemsFromEquipmentSlots(slots, [instanceId]));
    setInventorySlots((slots) => moveItemToInventorySlot(slots, instanceId, slotIndex));
    if (!dragged.board_position) {
      applyFrontendState((currentState) => ({
        ...currentState,
        stash_pages: removeItemsFromStashPages(currentState.stash_pages, [instanceId]),
        equipment_slots: removeItemsFromEquipmentSlots(normalizeEquipmentSlots(currentState.equipment_slots ?? []), [instanceId]),
      }));
      return targetItem ? { type: "swap", nextFloatingItem: targetItem, origin: { kind: "bag", slotIndex, instanceId: targetItem.instance_id } } : { type: "place" };
    }

    applyFrontendState((currentState) => ({
      ...optimisticUnmountBoardItem(currentState, instanceId),
      stash_pages: removeItemsFromStashPages(currentState.stash_pages, [instanceId])
    }));
    setNotice(`已取下${dragged.name_text}。`);
    return targetItem ? { type: "swap", nextFloatingItem: targetItem, origin: { kind: "bag", slotIndex, instanceId: targetItem.instance_id } } : { type: "place" };
  }

  async function placeItemInStash(current: FloatingGem, pageIndex: number, slotIndex: number): Promise<PlacementResult> {
    if (!state) return { type: "reject" };
    const instanceId = current.gem.instance_id;
    const dragged = inventoryItemById(state, instanceId);
    if (!dragged) {
      setNotice("没有找到这个物品。");
      return { type: "reject" };
    }
    const normalizedPages = normalizeStashPages(state.stash_pages, state);
    const safePageIndex = clamp(Math.floor(pageIndex), 0, STASH_PAGE_COUNT - 1);
    const safeSlotIndex = clamp(Math.floor(slotIndex), 0, STASH_PAGE_SLOT_COUNT - 1);
    const targetItem = inventoryItemById(state, normalizedPages[safePageIndex]?.[safeSlotIndex]);
    setInventorySlots((slots) => removeItemsFromInventorySlots(slots, [instanceId, targetItem?.instance_id ?? ""]));
    setEquipmentSlots((slots) => removeItemsFromEquipmentSlots(slots, [instanceId]));
    applyFrontendState((currentState) => {
      const unmountedState = dragged.board_position ? optimisticUnmountBoardItem(currentState, instanceId) : currentState;
      return {
        ...unmountedState,
        stash_pages: moveItemToStashSlot(unmountedState.stash_pages, instanceId, safePageIndex, safeSlotIndex),
        equipment_slots: removeItemsFromEquipmentSlots(normalizeEquipmentSlots(unmountedState.equipment_slots ?? []), [instanceId])
      };
    });
    setNotice(`已将${dragged.name_text}放入仓库。`);
    return targetItem
      ? { type: "swap", nextFloatingItem: targetItem, origin: { kind: "stash", pageIndex: safePageIndex, slotIndex: safeSlotIndex, instanceId: targetItem.instance_id } }
      : { type: "place" };
  }

  async function placeItemInEquipmentSlot(current: FloatingGem, slotIndex: number, event: globalThis.MouseEvent): Promise<PlacementResult> {
    if (!state) return { type: "reject" };
    const slot = EQUIPMENT_SLOT_SPECS[slotIndex];
    if (!slot) return { type: "reject" };
    const instanceId = current.gem.instance_id;
    const dragged = current.gem;
    if (dragged.board_position) {
      showPlacementPrompt("宝石盘上的宝石不能放入装备栏。", event.clientX, event.clientY);
      return { type: "reject" };
    }
    if (!canPlaceItemInEquipmentSlot(dragged, slot)) {
      showPlacementPrompt(`只能放入${slot.label}装备。`, event.clientX, event.clientY);
      return { type: "reject" };
    }

    const targetIndices = equipmentTargetSlotIndices(dragged, slotIndex, EQUIPMENT_SLOT_SPECS, WEAPON_SLOT_INDICES);
    const displacedIds = uniqueEquipmentSlotIds(equipmentSlots, targetIndices).filter((id) => id !== instanceId);
    const targetItem = inventoryItemById(state, displacedIds[0]);
    if (isTwoHandedWeapon(dragged) && displacedIds.length > 0 && !(displacedIds.length === 1 && targetItem && isTwoHandedWeapon(targetItem))) {
      showPlacementPrompt("双手武器需要空出主武器和副武器。", event.clientX, event.clientY);
      return { type: "reject" };
    }
    const targetOriginIndex = targetItem ? equipmentSlots.findIndex((id) => id === targetItem.instance_id) : slotIndex;
    const targetOriginSlot = EQUIPMENT_SLOT_SPECS[targetOriginIndex >= 0 ? targetOriginIndex : slotIndex] ?? slot;
    const previousState = state;
    const previousInventorySlots = inventorySlots;
    const previousEquipmentSlots = equipmentSlots;
    setEquipmentSlots((slots) => moveItemToEquipmentSlot(removeItemsFromEquipmentSlots(slots, displacedIds), instanceId, targetIndices));
    setInventorySlots((slots) => removeItemsFromInventorySlots(slots, [instanceId, targetItem?.instance_id ?? ""]));
    applyFrontendState((currentState) => ({
      ...currentState,
      stash_pages: removeItemsFromStashPages(currentState.stash_pages, [instanceId]),
      equipment_slots: moveItemToEquipmentSlot(
        removeItemsFromEquipmentSlots(normalizeEquipmentSlots(currentState.equipment_slots ?? []), displacedIds),
        instanceId,
        targetIndices
      ),
    }));
    setNotice(`已将${dragged.name_text}放入${slot.label}。`);
    return targetItem
      ? { type: "swap", nextFloatingItem: targetItem, origin: { kind: "equipment", slotIndex: targetOriginIndex, slotId: targetOriginSlot.id, instanceId: targetItem.instance_id } }
      : { type: "place" };
  }

  async function placeItemOnBoard(current: FloatingGem, row: number, column: number, event: globalThis.MouseEvent): Promise<PlacementResult> {
    if (!state) return { type: "reject" };
    const instanceId = current.gem.instance_id;
    if (!isGemItem(current.gem)) {
      showPlacementPrompt(state.ui_text?.only_gems_on_board ?? "", event.clientX, event.clientY);
      return { type: "reject", reason: "only_gems_on_board" };
    }
    const target = state.board.cells[row]?.[column]?.gem;
    const targetItem = inventoryItemById(state, target?.instance_id);
    const dragged = inventoryItemById(state, instanceId);
    if (!dragged) {
      setNotice("没有找到这颗宝石。");
      return { type: "reject" };
    }
    if (dragged.board_position?.row === row && dragged.board_position.column === column) return { type: "place" };
    if (!canPlaceGemOnBoard(state, dragged, row, column, new Set([instanceId, targetItem?.instance_id ?? ""]))) return { type: "reject" };

    const previousState = state;
    const previousInventorySlots = inventorySlots;
    const previousEquipmentSlots = equipmentSlots;
    applyFrontendState((currentState) => ({
      ...optimisticPlaceItemOnBoard(currentState, instanceId, row, column, targetItem?.instance_id),
      stash_pages: removeItemsFromStashPages(currentState.stash_pages, [instanceId, targetItem?.instance_id ?? ""])
    }));
    setInventorySlots((slots) => removeItemsFromInventorySlots(slots, [instanceId, targetItem?.instance_id ?? ""]));
    setNotice(`已将${dragged.name_text}放入第${row + 1}行第${column + 1}列。`);
    return targetItem ? { type: "swap", nextFloatingItem: targetItem, origin: { kind: "board", row, column } } : { type: "place" };
  }

  async function dropGemOnCell(instanceId: string, row: number, column: number): Promise<boolean> {
    const item = state ? inventoryItemById(state, instanceId) : null;
    if (!item) return false;
    const result = await placeItemOnBoard(
      { gem: item, origin: { kind: "board", row, column }, x: 0, y: 0, offsetX: FLOATING_GEM_OFFSET.x, offsetY: FLOATING_GEM_OFFSET.y },
      row,
      column,
      { clientX: 0, clientY: 0 } as globalThis.MouseEvent
    );
    return result.type !== "reject";
  }

  function resolveMapDropTarget(clientX: number, clientY: number, element: Element | null): DropTarget {
    if (!battleMap || !playing) return { kind: "invalid" };
    if (isInventoryDropBlockedByInterface(element)) return { kind: "invalid" };
    const position = viewportToBattleWorld(clientX, clientY, battleCamera);
    if (!isBattleMapPointInBounds(battleMap, position)) return { kind: "invalid" };
    if (!isMapPointWalkable(battleMap, position.x, position.y)) return { kind: "invalid" };
    return { kind: "map", position };
  }

  function discardItem(prompt: ItemDiscardPrompt) {
    if (!state) return;
    const instanceId = prompt.item.instance_id;
    const drop = createDiscardDrop(prompt.item, prompt.position);
    dropDisplayPositions.current.set(drop.drop_id, prompt.position);
    knownDropIds.current.add(drop.drop_id);
    setInventorySlots((slots) => removeItemsFromInventorySlots(slots, [instanceId]));
    setEquipmentSlots((slots) => removeItemsFromEquipmentSlots(slots, [instanceId]));
    applyFrontendState((current) => {
      const withoutItem = removeInventoryItemFromState(current, instanceId);
      return {
        ...withoutItem,
        drops: [...withoutItem.drops, drop]
      };
    });
    setNotice(`已丢弃：${prompt.item.name_text}`);
  }

  function confirmDiscardItem() {
    const prompt = itemDiscardPrompt;
    if (!prompt) return;
    setItemDiscardPrompt(null);
    discardItem(prompt);
  }

  function setSkipItemDiscardConfirmPreference(enabled: boolean) {
    setSkipItemDiscardConfirmToday(enabled);
    saveItemDiscardSkipConfirmPreference(enabled);
  }

  function createDiscardDrop(item: Gem, position: { x: number; y: number }): DropPrompt {
    const droppedItem = {
      ...cloneFrontendData(item),
      board_position: null
    };
    return {
      drop_id: `frontend_discard_${frontendDropId.current++}`,
      loot_kind: droppedItemDropKind(item),
      name_text: item.name_text,
      rarity_text: item.rarity_text,
      picked_up: false,
      status_text: "点击拾取",
      position,
      level: item.level,
      equipment_source: item.item_kind === "equipment" ? equipmentSourceSlotId(item) ?? item.gem_type?.identity_text ?? item.category_text : undefined,
      equipment_rarity: item.item_kind === "equipment" ? item.rarity_text : undefined,
      equipment_affixes: item.equipment_affixes,
      equipment_stat_modifiers: item.equipment_stat_modifiers,
      base_gem_instance_id: item.base_gem_id ?? item.instance_id,
      dropped_item: droppedItem
    };
  }

  function clearFloatingGem() {
    floatingGemRef.current = null;
    setFloatingGem(null);
  }

  function clearDragHoverState() {
    setHoveredBoardCell(null);
    setHoveredBagSlot(null);
    setHoveredEquipmentSlot(null);
    setHoveredGemId(null);
    setTooltip(null);
  }

  function setFloatingItem(item: Gem, origin: FloatingOrigin, x: number, y: number, offsetX = FLOATING_GEM_OFFSET.x, offsetY = FLOATING_GEM_OFFSET.y) {
    const nextFloatingGem: FloatingGem = {
      gem: item,
      origin,
      x: x + offsetX,
      y: y + offsetY,
      offsetX,
      offsetY
    };
    floatingGemRef.current = nextFloatingGem;
    setFloatingGem(nextFloatingGem);
  }

  function showPlacementPrompt(text: string, x: number, y: number) {
    const id = nextPromptId.current++;
    const point = clientToGameViewportPoint(x, y);
    setPlacementPrompt({ id, text, x: point.x, y: point.y });
    window.setTimeout(() => {
      setPlacementPrompt((current) => (current?.id === id ? null : current));
    }, 900);
  }

  async function unmountGem(instanceId: string) {
    const gem = state?.inventory.find((item) => item.instance_id === instanceId);
    applyFrontendState((currentState) => optimisticUnmountBoardItem(currentState, instanceId));
    setNotice(gem ? `已取下${gem.name_text}。` : "宝石已下盘。");
  }

  function syncDropDisplayPositions(nextState: AppState) {
    const nextPositions = new Map(dropDisplayPositions.current);
    nextState.drops.forEach((drop, index) => {
      if (!drop.position || drop.picked_up) {
        nextPositions.delete(drop.drop_id);
        return;
      }
      if (nextPositions.has(drop.drop_id)) return;
      nextPositions.set(drop.drop_id, {
        x: drop.position.x + (index % 3) * 22,
        y: drop.position.y + Math.floor(index / 3) * 28
      });
    });
    dropDisplayPositions.current = nextPositions;
  }

  function selectedFrontendMapStage(stageIdOverride?: string, sourceState = state) {
    const stages = sourceState?.map_progression?.stages ?? [];
    return stages.find((stage) => stage.id === stageIdOverride)
      ?? stages.find((stage) => stage.selected)
      ?? stages.find((stage) => stage.enterable)
      ?? null;
  }

  function createRuntimeMapInstanceForStage(stage: MapProgressionStageView) {
    const seedSalt = runtimeDebugMapInstanceSeed();
    const templateSeed = createMapInstanceSeed(stage.id, "template", seedSalt);
    const templateId = chooseAuthoredMapTemplateId(
      stage.map_template_ids,
      AUTHORED_MAP_TEMPLATES.map((template) => template.id),
      templateSeed,
      DEFAULT_AUTHORED_MAP_TEMPLATE_ID
    );
    const template = authoredMapTemplateById(templateId) ?? defaultAuthoredMapTemplate();
    const instanceSeed = createMapInstanceSeed(stage.id, template.id, seedSalt);
    const debugRotation = runtimeDebugMapInstanceRotation();
    const rotation = debugRotation ?? chooseMapInstanceRotation(instanceSeed, [0, 90, 180, 270]);
    const metadata: MapInstanceMetadata = {
      templateId: template.id,
      instanceSeed,
      rotation,
      playerSpawnSource: "entrance_or_spawn"
    };
    return createEditorRuntimeBattleMap(template.document as unknown as MapEditorFileDocument, {
      templateId: template.id,
      instance: metadata,
      rotation
    });
  }

  function frontendDropRoll(enemy: Enemy, salt: number) {
    const raw = Math.sin(enemy.id * 12.9898 + salt * 78.233 + Math.floor(elapsedRef.current * 10) * 37.719) * 43758.5453;
    return raw - Math.floor(raw);
  }

  function frontendMonsterDropChance(stage: MapProgressionStageView, enemy: Enemy) {
    const baseChance = clamp(stage.base_drop_chance, 0, 0.6);
    return clamp(baseChance, 0, enemy.boss ? 0.95 : 0.75);
  }

  function frontendMonsterDropAttempts(enemy: Enemy, salt: number) {
    const dropRule = resolveFrontendMonsterDropRule(enemy.spawnRarity, enemy.monsterType, Boolean(enemy.boss));
    const quantityMultiplier = Math.max(0, Number(dropRule.drop_quantity_multiplier ?? 0));
    const guaranteedAttempts = Math.floor(quantityMultiplier);
    const fractionalAttempt = quantityMultiplier - guaranteedAttempts;
    return guaranteedAttempts + (frontendDropRoll(enemy, salt + 191) < fractionalAttempt ? 1 : 0);
  }

  function frontendRandomMapLevel(stage: MapProgressionStageView, enemy: Enemy, salt: number) {
    const minLevel = Math.max(1, Math.round(Math.min(stage.map_level_min, stage.map_level_max)));
    const maxLevel = Math.max(minLevel, Math.round(Math.max(stage.map_level_min, stage.map_level_max)));
    return Math.floor(minLevel + frontendDropRoll(enemy, salt) * (maxLevel - minLevel + 1));
  }

  function frontendEquipmentDropRarity(stage: MapProgressionStageView, enemy: Enemy, roll: number) {
    const dropRule = resolveFrontendMonsterDropRule(enemy.spawnRarity, enemy.monsterType, Boolean(enemy.boss));
    const weights = scaleFrontendDropRarityWeights(
      stage.equipment_rarity_weights ?? { white: 700, blue: 250, purple: 50, pink: 0 },
      dropRule.drop_rarity_multiplier,
      ["blue", "purple", "pink"]
    );
    const white = Math.max(0, Number(weights.white ?? 0));
    const blue = Math.max(0, Number(weights.blue ?? 0));
    const purple = Math.max(0, Number(weights.purple ?? 0));
    const pink = Math.max(0, Number(weights.pink ?? 0));
    const total = white + blue + purple + pink;
    if (total <= 0) return "white";
    const cursor = roll * total;
    if (cursor < white) return "white";
    if (cursor < white + blue) return "blue";
    if (cursor < white + blue + purple) return "purple";
    return "pink";
  }

  function frontendDropKind(stage: MapProgressionStageView, roll: number, canDropMapEntry: boolean, dropPoolId: string | undefined): DropPrompt["loot_kind"] {
    const allowedKinds = new Set(allowedFrontendLootKindsForPool(dropPoolId));
    const equipment = allowedKinds.has("equipment") ? Math.max(0, Number(stage.equipment_weight ?? 0)) : 0;
    const gem = allowedKinds.has("gem") ? Math.max(0, Number(stage.gem_weight ?? 0)) : 0;
    const mapEntry = allowedKinds.has("map_entry") && canDropMapEntry ? Math.max(0, Number(stage.map_entry_weight ?? 0)) : 0;
    const total = equipment + gem + mapEntry;
    if (total <= 0) return "equipment";
    const cursor = roll * total;
    if (cursor < equipment) return "equipment";
    if (cursor < equipment + gem) return "gem";
    return "map_entry";
  }

  function frontendMapEntryTargetStage(stage: MapProgressionStageView, stages: MapProgressionStageView[], enemy: Enemy, salt: number) {
    if (stage.stage_scope === "major_final" && stage.phase !== "timemark") return stage;
    const candidates = [
      ...(stage.order > 1 ? [stage] : []),
      ...stages.filter((candidate) => candidate.order === stage.order + 1 && candidate.id !== stage.id)
    ];
    if (candidates.length === 0) return null;
    return candidates[Math.floor(frontendDropRoll(enemy, salt) * candidates.length) % candidates.length];
  }

  function frontendMajorFinalBossNextStage(stage: MapProgressionStageView, stages: MapProgressionStageView[], enemy: Enemy) {
    if (!enemy.boss) return null;
    if (stage.stage_scope !== "major_final" || stage.phase === "timemark") return null;
    return stages.find((candidate) => candidate.order === stage.order + 1 && candidate.id !== stage.id) ?? null;
  }

  function frontendGemDropWeight(gem: GmGemOption) {
    let weight = 1;
    if (Number(gem.sudoku_digit) === 9) return weight * 0.35;
    if (gem.kind === "active_skill") return weight * 0.35;
    return weight;
  }

  function chooseFrontendGemDropOption(gems: GmGemOption[], enemy: Enemy, salt: number) {
    if (gems.length === 0) return null;
    const weighted = gems.map((gem) => ({ gem, weight: frontendGemDropWeight(gem) }));
    const total = weighted.reduce((sum, item) => sum + item.weight, 0);
    if (total <= 0) return gems[Math.floor(frontendDropRoll(enemy, salt) * gems.length) % gems.length];
    let cursor = frontendDropRoll(enemy, salt) * total;
    for (const item of weighted) {
      cursor -= item.weight;
      if (cursor <= 0) return item.gem;
    }
    return weighted[weighted.length - 1]?.gem ?? null;
  }

  function createFrontendDrop(enemy: Enemy, stage: MapProgressionStageView, index: number): DropPrompt | null {
    const dropChance = frontendMonsterDropChance(stage, enemy);
    if (frontendDropRoll(enemy, index) > dropChance) return null;
    const stages = state?.map_progression?.stages ?? [];
    const mapEntryStage = frontendMapEntryTargetStage(stage, stages, enemy, index + 109);
    const kindRoll = frontendDropRoll(enemy, index + 17);
    const dropRule = resolveFrontendMonsterDropRule(enemy.spawnRarity, enemy.monsterType, Boolean(enemy.boss));
    const level = Math.round(clamp(stage.gem_level_min + frontendDropRoll(enemy, index + 29) * (stage.gem_level_max - stage.gem_level_min), stage.gem_level_min, stage.gem_level_max));
    const equipmentLevel = frontendRandomMapLevel(stage, enemy, index + 83);
    let lootKind = frontendDropKind(stage, kindRoll, Boolean(mapEntryStage), dropRule.drop_pool_id);
    let nameText = `Lv${equipmentLevel} 装备`;
    let equipmentRarity = frontendEquipmentDropRarity(stage, enemy, frontendDropRoll(enemy, index + 97));
    let rarityText = frontendEquipmentRarityText(equipmentRarity);
    let targetStageId: string | undefined;
    let baseGemInstanceId: string | undefined;
    let equipmentSource = chooseFrontendEquipmentSource(Math.floor(frontendDropRoll(enemy, index + 53) * 1000000000));
    let equipmentAffixes: FrontendEquipmentAffixRoll[] | undefined;
    let equipmentStatModifiers: FrontendEquipmentStatModifier[] | undefined;
    let statusText = "点击拾取";
    if (lootKind === "map_entry" && mapEntryStage) {
      lootKind = "map_entry";
      nameText = `${mapEntryStage.display_name} 门票`;
      rarityText = "地图";
      targetStageId = mapEntryStage.id;
    } else if (lootKind === "gem") {
      lootKind = "gem";
      const gemOptions = gmOptions?.gems ?? [];
      const gemOption = chooseFrontendGemDropOption(gemOptions, enemy, index + 41);
      baseGemInstanceId = gemOption?.id ?? state?.inventory.find((item) => item.item_kind !== "equipment")?.instance_id;
      nameText = gemOption ? `Lv${level} ${gemOption.name_text}` : `Lv${level} 技能宝石`;
      rarityText = "宝石";
    } else {
      const seed = enemy.id * 1000003 + index * 9176 + Math.floor(frontendDropRoll(enemy, index + 71) * 1000000);
      const generated = generateFrontendEquipment(equipmentSource, equipmentLevel, equipmentRarity, seed);
      equipmentAffixes = [generated.base_affix, ...generated.prefix_affixes, ...generated.suffix_affixes];
      equipmentStatModifiers = frontendEquipmentStatModifiers(generated);
      const affixTexts = frontendEquipmentAffixTexts(generated);
      nameText = `Lv${equipmentLevel} ${generated.source}`;
      rarityText = frontendEquipmentRarityText(generated.rarity);
      equipmentRarity = generated.rarity;
      equipmentSource = generated.source;
      statusText = affixTexts.join("、");
    }
    return {
      drop_id: `frontend_drop_${frontendDropId.current++}`,
      loot_kind: lootKind,
      name_text: nameText,
      rarity_text: rarityText,
      picked_up: false,
      status_text: statusText,
      position: { x: enemy.x, y: enemy.y },
      level: lootKind === "equipment" ? equipmentLevel : level,
      equipment_source: equipmentSource,
      equipment_rarity: equipmentRarity,
      equipment_affixes: equipmentAffixes,
      equipment_stat_modifiers: equipmentStatModifiers,
      base_gem_instance_id: baseGemInstanceId,
      target_stage_id: targetStageId
    };
  }

  function createGuaranteedNextMapEntryDrop(enemy: Enemy, stage: MapProgressionStageView, stages: MapProgressionStageView[], index: number): DropPrompt | null {
    const targetStage = frontendMajorFinalBossNextStage(stage, stages, enemy);
    if (!targetStage) return null;
    return {
      drop_id: `frontend_drop_${frontendDropId.current++}`,
      loot_kind: "map_entry",
      name_text: `${targetStage.display_name} 门票`,
      rarity_text: "地图",
      picked_up: false,
      status_text: "点击拾取",
      position: { x: enemy.x + 28 + (index % 2) * 12, y: enemy.y },
      level: stage.gem_level_max,
      target_stage_id: targetStage.id
    };
  }

  function spawnBossPortalForKilledEnemies(killedEnemies: Enemy[]) {
    const boss = killedEnemies.find((enemy) => enemy.boss || isNemesisRarity(enemy.spawnRarity));
    if (!boss) return;
    setBossPortal((current) => {
      if (current && !current.used) return current;
      return {
        portal_id: `boss_portal_${frontendBossPortalId.current++}`,
        position: { x: boss.x, y: boss.y },
        used: false
      };
    });
    setCombatLogs((logs) => ["Boss defeated. Exit portal opened.", ...logs].slice(0, 8));
    setNotice("Boss defeated. Exit portal opened.");
  }

  async function spawnFrontendDrops(killedEnemies: Enemy[]) {
    if (killedEnemies.length === 0) return;
    await preloadFrontendEquipmentData();
    spawnBossPortalForKilledEnemies(killedEnemies);
    const stage = selectedFrontendMapStage();
    if (!stage) return;
    const stages = state?.map_progression?.stages ?? [];
    const guaranteedDrops = killedEnemies
      .map((enemy, index) => createGuaranteedNextMapEntryDrop(enemy, stage, stages, index))
      .filter((drop): drop is DropPrompt => Boolean(drop));
    const drops = killedEnemies
      .flatMap((enemy, index) => {
        const attempts = frontendMonsterDropAttempts(enemy, index);
        return Array.from({ length: attempts }, (_, attemptIndex) => createFrontendDrop(enemy, stage, index * 100 + attemptIndex));
      })
      .filter((drop): drop is DropPrompt => Boolean(drop));
    const allDrops = [...guaranteedDrops, ...drops];
    if (allDrops.length === 0) return;
    allDrops.forEach((drop, index) => {
      const position = drop.position ?? { x: playerStateRef.current.x, y: playerStateRef.current.y };
      dropDisplayPositions.current.set(drop.drop_id, {
        x: position.x + (index % 3) * 22,
        y: position.y + Math.floor(index / 3) * 28
      });
      knownDropIds.current.add(drop.drop_id);
    });
    applyFrontendState((current) => ({ ...current, drops: [...current.drops, ...allDrops] }));
    setNotice(`掉落：${allDrops.map((drop) => drop.name_text).join("、")}。`);
  }

  function nextFrontendInventoryItemId(current: AppState) {
    const existingIds = new Set(current.inventory.map((item) => item.instance_id));
    let id = `frontend_item_${frontendItemId.current++}`;
    while (existingIds.has(id)) {
      id = `frontend_item_${frontendItemId.current++}`;
    }
    return id;
  }

  function createFrontendInventoryItem(drop: DropPrompt, current: AppState): Gem {
    if (drop.dropped_item) {
      const existingIds = new Set(current.inventory.map((item) => item.instance_id));
      return {
        ...cloneFrontendData(drop.dropped_item),
        instance_id: existingIds.has(drop.dropped_item.instance_id)
          ? nextFrontendInventoryItemId(current)
          : drop.dropped_item.instance_id,
        board_position: null
      };
    }
    const id = nextFrontendInventoryItemId(current);
    if (drop.loot_kind === "gem") {
      const seedInventory = cloneFrontendInitialAppStateSeed().inventory;
      const template = current.inventory.find((item) => item.instance_id === drop.base_gem_instance_id)
        ?? seedInventory.find((item) => item.instance_id === drop.base_gem_instance_id)
        ?? frontendGemDropPool().find((item) => item.base_gem_id === drop.base_gem_instance_id || item.instance_id === drop.base_gem_instance_id)
        ?? current.inventory.find((item) => item.item_kind !== "equipment")
        ?? seedInventory.find((item) => item.item_kind !== "equipment");
      if (template) {
        return {
          ...template,
          instance_id: id,
          name_text: drop.name_text,
          rarity_text: drop.rarity_text || template.rarity_text,
          board_position: null,
          level: drop.level ?? template.level
        };
      }
    }
    if (drop.loot_kind === "equipment") {
      const rarityText = drop.rarity_text || "普通";
      const rarityTone = equipmentRarityTone(drop.equipment_rarity ?? rarityText);
      const sourceText = gmOptions?.equipment_sources.find((source) => source.id === drop.equipment_source)?.name_text
        ?? drop.equipment_source
        ?? "装备";
      const bonusLines = drop.equipment_affixes?.map((affix) => {
        return equipmentTooltipAffixLine(affix.effect, affix.tier);
      }) ?? (drop.status_text && drop.status_text !== "点击拾取" && drop.status_text !== "GM 添加"
        ? drop.status_text.split(/[、；]/).map((line) => line.trim()).filter(Boolean)
        : []);
      const descriptionText = `${rarityText}${sourceText}。等级 ${drop.level ?? 1}。`;
      const equipmentSlotId = frontendEquipmentSourceSlotIdFromText(sourceText);
      const iconSprite = frontendEquipmentIconSprite(drop.equipment_source ?? sourceText);
      const tags = [
        { id: "equipment", text: "装备", tone: "category" },
        { id: drop.equipment_source ?? "equipment", text: sourceText, tone: "type" },
        ...(isTwoHandedEquipmentSource(drop.equipment_source ?? sourceText) ? [{ id: "two_handed", text: "双手", tone: "type" as const }] : []),
        { id: String(drop.equipment_rarity ?? "rarity"), text: rarityText, tone: `rarity-${rarityTone}` }
      ];
      return {
        instance_id: id,
        item_kind: "equipment",
        name_text: drop.name_text,
        description_text: bonusLines.length > 0 ? `${descriptionText} ${bonusLines.join("；")}` : descriptionText,
        category_text: sourceText,
        rarity_text: rarityText,
        gem_kind: "",
        gem_type: { id: drop.equipment_source ?? "equipment", display_text: sourceText, identity_text: drop.equipment_source ?? "equipment" },
        tags,
        current_effective_targets: [],
        board_position: null,
        level: drop.level,
        equipment_slot_id: equipmentSlotId,
        equipment_rarity: drop.equipment_rarity,
        tooltip_view: createFrontendItemTooltipView({
          nameText: drop.name_text,
          rarityText,
          categoryText: sourceText,
          identityText: `${sourceText} / ${rarityText}`,
          descriptionText,
          iconText: sourceText.slice(0, 1),
          iconColorKey: drop.equipment_rarity === "blue" ? "blue" : drop.equipment_rarity === "purple" ? "orange" : "white",
          iconSprite,
          rarityTone,
          tags,
          statLines: [
            { label_text: "等级", value_text: String(drop.level ?? 1) },
            { label_text: "来源", value_text: sourceText }
          ],
          bonusLines
        }),
        equipment_affixes: drop.equipment_affixes,
        equipment_stat_modifiers: drop.equipment_stat_modifiers ?? []
      };
    }
    const rarityText = drop.rarity_text || "普通";
    const descriptionText = `${rarityText}掉落物。`;
    return {
      instance_id: id,
      item_kind: "ordinary",
      name_text: drop.name_text,
      description_text: descriptionText,
      category_text: "地图门票",
      rarity_text: rarityText,
      gem_kind: "",
      gem_type: { display_text: "地图门票", identity_text: String(drop.loot_kind ?? "loot") },
      tags: [{ id: "drop", text: "掉落" }],
      current_effective_targets: [],
      board_position: null,
      level: drop.level,
      tooltip_view: createFrontendItemTooltipView({
        nameText: drop.name_text,
        rarityText,
        categoryText: "地图门票",
        identityText: "地图门票",
        descriptionText,
        iconText: "图",
        iconColorKey: "cyan",
        tags: [{ id: "drop", text: "掉落", tone: "category" }],
        statLines: drop.target_stage_id ? [{ label_text: "解锁地图", value_text: drop.target_stage_id }] : []
      })
    };
  }

  function applyFrontendPickup(dropId: string, current: AppState) {
    const target = current.drops.find((drop) => drop.drop_id === dropId);
    if (!target || target.picked_up) return null;
    const nextDrops = current.drops.map((drop) => (
      drop.drop_id === dropId ? { ...drop, picked_up: true, status_text: "已拾取" } : drop
    ));
    if (target.loot_kind === "map_entry" && target.target_stage_id && current.map_progression) {
      return {
        ...current,
        drops: nextDrops,
        map_progression: {
          ...current.map_progression,
          stages: current.map_progression.stages.map((stage) => (
            stage.id === target.target_stage_id
              ? { ...stage, unlocked: true, enterable: true, entry_count: stage.entry_count + 1 }
              : stage
          ))
        }
      };
    }
    return {
      ...current,
      drops: nextDrops,
      inventory: [...current.inventory, createFrontendInventoryItem(target, current)]
    };
  }

  function beginDropPickup(drop: DropPrompt) {
    if (!drop.position || drop.picked_up) return;
    const target = dropDisplayPositions.current.get(drop.drop_id) ?? drop.position;
    pendingDropPickup.current = { dropId: drop.drop_id, x: target.x, y: target.y };
    setNotice(`正在前往拾取：${drop.name_text}`);
  }

  function finishDropPickup(dropId: string) {
    if (pickupRequestInFlight.current) return;
    pickupRequestInFlight.current = true;
    const picked = state?.drops.find((drop) => drop.drop_id === dropId);
    dropDisplayPositions.current.delete(dropId);
    applyFrontendState((current) => applyFrontendPickup(dropId, current));
    setNotice(picked ? `已拾取：${picked.name_text}` : "已拾取掉落。");
    pickupRequestInFlight.current = false;
  }

  function beginBossPortalUse(portal: BossPortal) {
    if (portal.used) return;
    const overlappingDrop = nearestDropAtPosition(portal.position, CLICK_INTERACTION_COMPLETE_RADIUS);
    if (overlappingDrop) {
      beginDropPickup(overlappingDrop);
      return;
    }
    pendingDropPickup.current = null;
    pendingBossPortalUse.current = {
      portalId: portal.portal_id,
      x: portal.position.x,
      y: portal.position.y
    };
    setNotice("Moving to Boss exit.");
  }

  function nearestDropAtPosition(position: { x: number; y: number }, radius: number) {
    return (state?.drops ?? [])
      .filter((drop) => !drop.picked_up && drop.position)
      .map((drop) => {
        const target = dropDisplayPositions.current.get(drop.drop_id) ?? drop.position!;
        return { drop, distance: Math.hypot(target.x - position.x, target.y - position.y) };
      })
      .filter((candidate) => candidate.distance <= radius)
      .sort((left, right) => left.distance - right.distance)[0]?.drop ?? null;
  }

  function openBossPortalConfirm(portalId: string) {
    setBossPortalConfirm({ portalId });
    setNotice("是否离开该区域？");
  }

  function cancelBossPortalConfirm() {
    pendingBossPortalUse.current = null;
    setBossPortalConfirm(null);
    setNotice("已取消离开区域。");
  }

  function confirmBossPortalExit() {
    const portalId = bossPortalConfirm?.portalId;
    if (!portalId) return;
    setBossPortalConfirm(null);
    finishBossPortalUse(portalId);
  }

  function finishBossPortalUse(portalId: string) {
    pendingBossPortalUse.current = null;
    pendingDropPickup.current = null;
    setBossPortalConfirm(null);
    setBossPortal((current) => (
      current?.portal_id === portalId ? { ...current, used: true } : current
    ));
    dropDisplayPositions.current = new Map();
    knownDropIds.current = new Set();
    bossSkillTimers.current = new Map();
    supremeBossSkillTimers.current = new Map();
    pendingBossDamageZoneHits.current = [];
    enemiesStateRef.current = [];
    setEnemies([]);
    setPlaying(false);
    setBattlePauseOpen(false);
    setEntryStep("rest");
    setRestAreaPanel(null);
    setBagOpen(false);
    setGameFailureOpen(false);
    setAuthoredAggroSources([]);
    setAuthoredSpawnPlanActive(false);
    applyFrontendState((current) => ({ ...current, current_map_run: null, drops: [] }));
    setCombatLogs((logs) => ["Exited through Boss portal.", ...logs].slice(0, 8));
    setNotice("Exited through Boss portal.");
  }

  function handleKeyboardInteract() {
    if (battlePauseOpen || bagOpen || floatingGemRef.current || gameFailureOpen) return;
    const currentPlayer = playerStateRef.current;

    if (!monsterTestMode && !skillEditorMode && !playing && entryStep === "rest") {
      const restTargets = (["stage", "stash"] as const)
        .map((kind) => {
          const target = restAreaInteractablePosition(kind, battleMap);
          return { kind, distance: Math.hypot(target.x - currentPlayer.x, target.y - currentPlayer.y) };
        })
        .filter((target) => target.distance <= REST_AREA_INTERACTION_RADIUS)
        .sort((left, right) => left.distance - right.distance);
      const nearest = restTargets[0];
      if (nearest) {
        interactWithRestArea(nearest.kind);
      } else {
        setNotice("附近没有可交互目标。");
      }
      return;
    }

    if (!playing || !battleMap || skillEditorMode || monsterTestMode) return;

    const keyboardWorldPickupRadius = KEYBOARD_PICKUP_SCREEN_RADIUS / Math.max(0.1, battleCamera.zoom || 1);
    const candidates: Array<{ distance: number; drop: DropPrompt }> = [];
    for (const drop of state?.drops ?? []) {
      if (drop.picked_up || !drop.position) continue;
      const target = dropDisplayPositions.current.get(drop.drop_id) ?? drop.position;
      const distanceToDrop = Math.hypot(target.x - currentPlayer.x, target.y - currentPlayer.y);
      if (distanceToDrop > keyboardWorldPickupRadius) continue;
      candidates.push({ distance: distanceToDrop, drop });
    }
    const nearest = candidates.sort((left, right) => left.distance - right.distance)[0];
    if (!nearest) return;
    if (nearest) {
      beginDropPickup(nearest.drop);
    } else {
      setNotice("附近没有可拾取/交互目标。");
    }
  }

  function resetBattleRuntimeForChallenge(spawnPoint: { x: number; y: number }, mapForMinimap: BakedBattleMapData | null | undefined = battleMap) {
    const resetPlayer = {
      ...playerStateRef.current,
      x: spawnPoint.x,
      y: spawnPoint.y,
      hp: playerStateRef.current.maxHp,
      currentMana: playerStateRef.current.maxMana,
      currentEnergyShield: playerStateRef.current.maxEnergyShield
    };
    setRuntimePlayer(() => resetPlayer);
    enemiesStateRef.current = [];
    setEnemies([]);
    setTexts([]);
    setRuntimePlayerBuffs([]);
    setBolts([]);
    setAreaNovas([]);
    setMeleeArcs([]);
    setChainSegments([]);
    setDamageZones([]);
    setHitVfxs([]);
    setKills(0);
    setElapsed(0);
    elapsedRef.current = 0;
    elapsedLastUiSync.current = 0;
    lastFrame.current = null;
    spawnTimer.current = 0;
    attackTimers.current = {};
    thundercloudChannels.current = {};
    damageZoneChannels.current = {};
    scheduledSkillEvents.current = [];
    activeDamageZones.current = [];
    bossSkillTimers.current = new Map();
    supremeBossSkillTimers.current = new Map();
    monsterSkillTimers.current = new Map();
    pendingBossDamageZoneHits.current = [];
    onKillRecastCounts.current.clear();
    enemyVisuals.current = new Map();
    playerVisual.current = { direction: "down", movementVector: { x: 0, y: 0 } };
    triggeredEncounterSourceIds.current = new Set();
    nextEnemyId.current = skillEditorMode ? SKILL_TEST_DUMMY_OFFSETS.length + 1 : 1;
    pendingDropPickup.current = null;
    pendingBossPortalUse.current = null;
    setBossPortalConfirm(null);
    setBossPortal(null);
    resetPlayableMinimapForRun(mapForMinimap, spawnPoint);
  }

  async function startGame(stageIdOverride?: string) {
    if (!selectedMapId) {
      setNotice("请先选择地图。");
      return;
    }
    if (!battleMap) {
      setNotice("地图资源仍在加载，请稍候。");
      return;
    }
    if (runtimeDebugMonsterCornerTestEnabled()) {
      const challengeSpawn = runtimeDebugCornerPlayerSpawn(battleMap);
      const nextEncounterPalette = createEncounterMonsterPalette();
      encounterMonsterPalette.current = nextEncounterPalette;
      resetBattleRuntimeForChallenge(challengeSpawn, battleMap);
      const debugEnemies = createRuntimeDebugCornerEnemies(challengeSpawn, battleMap, nextEncounterPalette);
      enemiesStateRef.current = debugEnemies;
      setEnemies(debugEnemies);
      setGameFailureOpen(false);
      setBattlePauseOpen(false);
      setPlaying(true);
      setCombatLogs(["边缘角落怪物 AI 测试开始。玩家静止，怪物应直接贴近并按节奏攻击。"]);
      setNotice(`${battleMap.displayName} 边缘角落怪物 AI 测试中。`);
      return;
    }
    const nextEncounterPalette = createEncounterMonsterPalette();
    encounterMonsterPalette.current = nextEncounterPalette;
    setGameFailureOpen(false);
    setBattlePauseOpen(false);
    setPlaying(true);
    setRestAreaPanel(null);
    setRestAreaInteractionTarget(null);
    setBagOpen(false);
    if (!skillEditorMode) {
      if (!gmOptions) {
        try {
          setGmOptions(await requestGmOptions());
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          setPlaying(false);
          setNotice(message);
          return;
        }
      }
      const selectedStage = selectedFrontendMapStage(stageIdOverride);
      if (!selectedStage?.enterable) {
        setPlaying(false);
        setNotice("该地图尚未解锁或门票不足。");
        return;
      }
      const mapInstance = createRuntimeMapInstanceForStage(selectedStage);
      const challengeSpawn = mapInstance.playerSpawn;
      setBattleMap(mapInstance);
      resetBattleRuntimeForChallenge(challengeSpawn, mapInstance);
      applyFrontendState((current) => {
        if (!current.map_progression) return { ...current, current_map_run: null, drops: [] };
        return {
          ...current,
          current_map_run: {
            run_id: mapInstance.mapInstance?.instanceSeed ?? createMapInstanceSeed(selectedStage.id, mapInstance.id),
            stage_id: selectedStage.id,
            display_name: selectedStage.display_name,
            map_level: selectedStage.map_level_max,
            monster_level: selectedStage.monster_level,
            map_template_id: mapInstance.mapInstance?.templateId ?? mapInstance.id,
            map_instance: mapInstance.mapInstance
          },
          drops: [],
          map_progression: {
            ...current.map_progression,
            selected_stage_id: selectedStage.id,
            stages: current.map_progression.stages.map((stage) => {
              if (stage.id !== selectedStage.id) return { ...stage, selected: false };
              const entryCount = stage.free_entry ? stage.entry_count : Math.max(0, stage.entry_count - stage.entry_cost);
              return { ...stage, selected: true, entry_count: entryCount, enterable: stage.free_entry || entryCount >= stage.entry_cost };
            })
          }
        };
      });
      setAuthoredSpawnPlanActive(true);
      setAuthoredAggroSources([]);
      setSpawnPlanWarnings([]);
      setProceduralSpawnDebug(null);
      dropDisplayPositions.current = new Map();
      knownDropIds.current = new Set();
      const spawnPlan = createProceduralSpawnPlanEnemies(mapInstance, nextEnemyId.current, mapInstance.mapInstance?.templateId ?? selectedMapId, selectedStage, mapInstance.mapInstance?.instanceSeed);
      nextEnemyId.current = spawnPlan.nextId;
      enemiesStateRef.current = spawnPlan.enemies;
      setEnemies(spawnPlan.enemies);
      setAuthoredAggroSources(spawnPlan.aggroSources);
      setProceduralSpawnDebug(spawnPlan.debug);
      setCombatLogs([`${mapInstance.displayName} 地图运行开始。rotation ${mapInstance.mapInstance?.rotation ?? 0}。怪物、击杀和掉落由前端运行。`]);
      setNotice(`${mapInstance.displayName} 地图运行中。rotation ${mapInstance.mapInstance?.rotation ?? 0}。按 C 管理背包。`);
      return;
    }
    const challengeSpawn = battleMap.playerSpawn;
    resetBattleRuntimeForChallenge(challengeSpawn, battleMap);
    setAuthoredSpawnPlanActive(false);
    setAuthoredAggroSources([]);
    setSpawnPlanWarnings([]);
    setProceduralSpawnDebug(null);
    const nextEnemies = createSkillTestDummies(1, challengeSpawn.x, challengeSpawn.y, nextEncounterPalette);
    enemiesStateRef.current = nextEnemies;
    setEnemies(nextEnemies);
    nextEnemyId.current = SKILL_TEST_DUMMY_OFFSETS.length + 1;
    setCombatLogs([
      `${battleMap.displayName} 战斗开始。WASD 移动，技能会自动释放。`
    ]);
    setNotice(`${battleMap.displayName} 战斗中。按 C 管理背包。`);
  }

  function spawnSelectedMonsterTestEnemy() {
    if (!monsterTestMode || !battleMap || !selectedMonsterTestMonsterId) return;
    const nextEnemy = createMonsterTestEnemy(
      nextEnemyId.current++,
      selectedMonsterTestMonsterId,
      playerStateRef.current,
      battleMap,
      enemiesStateRef.current.length
    );
    const nextEnemies = [...enemiesStateRef.current, nextEnemy];
    enemiesStateRef.current = nextEnemies;
    setEnemies(nextEnemies);
    setAuthoredSpawnPlanActive(true);
    setPlaying(true);
    setCombatLogs((logs) => [`生成 ${selectedMonsterTestMonsterId}。`, ...logs].slice(0, 8));
  }

  function destroyAllMonsterTestEnemies() {
    if (!monsterTestMode) return;
    enemiesStateRef.current = [];
    setEnemies([]);
    setBolts([]);
    setAreaNovas([]);
    setMeleeArcs([]);
    setChainSegments([]);
    setDamageZones([]);
    setHitVfxs([]);
    bossSkillTimers.current = new Map();
    supremeBossSkillTimers.current = new Map();
    monsterSkillTimers.current = new Map();
    pendingBossDamageZoneHits.current = [];
    setCombatLogs((logs) => ["已销毁全部测试怪物。", ...logs].slice(0, 8));
  }

  async function openSkillEditorPanel() {
    setSkillEditorOpen(false);
    setSkillEditorGuidePackage(null);
    setNotice("技能编辑器已禁用。");
  }

  function beginDrag(event: DragEvent) {
    event.preventDefault();
  }

  function beginPointerDrag(event: MouseEvent, gem: Gem, origin: FloatingOrigin) {
    if (event.button !== 0) return;
    if (floatingGemRef.current || dropInProgressRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    clearDragHoverState();
    const point = clientToGameViewportPoint(event.clientX, event.clientY);
    setFloatingItem(gem, origin, point.x, point.y);
  }

  function onGemHover(event: MouseEvent, gem: Gem, source: "board" | "inventory" | "equipment" | "stash", slotIndex?: number) {
    setHoveredGemId(gem.instance_id);
    const preview = state?.skill_preview.find((skill) => skill.active_gem_instance_id === gem.instance_id);
    const comparisonGem = source === "inventory" ? comparisonGemForInventoryEquipment(gem, equipmentSlots, fullGemById, EQUIPMENT_SLOT_SPECS, WEAPON_SLOT_INDICES) : null;
    setTooltip({
      gem: gemWithFrontendSkillPreviewTooltip(gem, preview),
      comparisonGem,
      ...resolveTooltipPosition(event.currentTarget as HTMLElement, source, slotIndex)
    });
  }

  const linkedGemIds = useLinkedGemIds(state, hoveredGemId);
  const fullGemById = useMemo(() => {
    const result = new Map<string, Gem>();
    for (const gem of state?.inventory ?? []) result.set(gem.instance_id, gem);
    return result;
  }, [state]);
  const hoveredBoardGemId = hoveredGemId && fullGemById.get(hoveredGemId)?.board_position ? hoveredGemId : null;
  const legalDropCells = useLegalDropCells(state, floatingGem && isGemItem(floatingGem.gem) ? floatingGem.gem : null);
  const selectedGemInstanceId = floatingGem?.gem.instance_id ?? null;
  const legalPlacementCells = legalDropCells;
  const previewCell = floatingGem && hoveredBoardCell && legalPlacementCells.has(hoveredBoardCell) ? hoveredBoardCell : null;
  const previewInvalidReason = usePlacementInvalidReason(state, floatingGem, hoveredBoardCell, legalPlacementCells);
  const placementPreview = usePlacementPreview(state, fullGemById, floatingGem, previewCell);
  const previewAffectedCells = placementPreview?.previewAffectedCells ?? new Map<string, { types: PreviewRelationType[] }>();
  const previewAffectedGems = placementPreview?.previewAffectedGems ?? new Map<string, { labels: string[]; modifierCount: number }>();
  const previewRelations = placementPreview?.previewRelations ?? [];
  const supportPreview = useSupportPreview(state, fullGemById, hoveredGemId, floatingGem);
  const persistentSupportLines = useSupportLines(state, fullGemById);
  const activeTargetLines = useActiveTargetLines(persistentSupportLines, fullGemById, hoveredGemId, floatingGem);
  const passiveVisualEffects = useMountedPassiveVisualEffects(state, fullGemById, isPassiveGem);
  const gmGemOptionsById = useMemo(() => new Map((gmOptions?.gems ?? []).map((gem) => [gem.id, gem])), [gmOptions]);
  const bagSlots = inventorySlots.map((instanceId) => (instanceId ? fullGemById.get(instanceId) ?? null : null));
  const equippedItems = equipmentSlots.map((instanceId) => (instanceId ? fullGemById.get(instanceId) ?? null : null));
  const stashPages = normalizeStashPages(state?.stash_pages, state ?? undefined);
  const activeStashSlots = stashPages[stashPageIndex] ?? [];

  async function loadGmEquipmentAffixes(source: string, level: number) {
    const affixes = await requestGmEquipmentAffixes(source, level);
    setGmAffixes(affixes);
    return affixes;
  }

  async function submitGmRequest(action: string, body: unknown, successText: string) {
    const payload = body && typeof body === "object" ? body as Record<string, unknown> : {};
    await preloadFrontendEquipmentData();
    applyFrontendState((current) => {
      if (action === "gm-add-gem") {
        const baseGemId = String(payload.base_gem_id ?? gmOptions?.gems[0]?.id ?? "");
        const level = Number(payload.level ?? 1);
        const quantity = Math.max(1, Math.min(60, Math.floor(Number(payload.quantity ?? 1) || 1)));
        const nameText = gmOptions?.gems.find((gem) => gem.id === baseGemId)?.name_text ?? "技能宝石";
        const generatedItems = Array.from({ length: quantity }, () => {
          const drop: DropPrompt = {
            drop_id: `frontend_gm_gem_${frontendDropId.current++}`,
            loot_kind: "gem",
            name_text: nameText,
            rarity_text: "宝石",
            picked_up: false,
            status_text: "GM 添加",
            level,
            base_gem_instance_id: baseGemId
          };
          return createFrontendInventoryItem(drop, current);
        });
        return { ...current, inventory: [...current.inventory, ...generatedItems] };
      }
      if (action === "gm-add-equipment") {
        const source = String(payload.source ?? gmOptions?.equipment_sources[0]?.id ?? frontendEquipmentSources()[0]?.id ?? "装备");
        const level = Number(payload.level ?? selectedFrontendMapStage()?.monster_level ?? 1);
        const affixIds = Array.isArray(payload.affix_ids) ? payload.affix_ids.map(String) : [];
        const randomRarity = String(payload.random_rarity ?? (affixIds.length >= 6 ? "pink" : affixIds.length >= 3 ? "purple" : affixIds.length > 0 ? "blue" : "white"));
        const seed = Date.now() + frontendDropId.current * 1009;
        const generated = affixIds.length > 0
          ? createSpecifiedFrontendEquipment(source, level, affixIds, seed)
          : generateFrontendEquipment(source, level, randomRarity, seed);
        const affixTexts = frontendEquipmentAffixTexts(generated);
        const drop: DropPrompt = {
          drop_id: `frontend_gm_equipment_${frontendDropId.current++}`,
          loot_kind: "equipment",
          name_text: `Lv${generated.level} ${generated.source}`,
          rarity_text: frontendEquipmentRarityText(generated.rarity),
          picked_up: false,
          status_text: affixTexts.join("、"),
          level: generated.level,
          equipment_source: generated.source,
          equipment_rarity: generated.rarity,
          equipment_affixes: [generated.base_affix, ...generated.prefix_affixes, ...generated.suffix_affixes],
          equipment_stat_modifiers: frontendEquipmentStatModifiers(generated)
        };
        const item = createFrontendInventoryItem(drop, current);
        return {
          ...current,
          logs: [...current.logs, successText],
          inventory: [...current.inventory, item]
        };
      }
      return current;
    });
    setNotice(successText);
  }

  function refreshFrontendSaveSlots() {
    setSaveSlots(loadFrontendSaveSlotSummaries<FrontendSavePayload>());
  }

  function chooseNewSaveSlot() {
    const emptySlot = saveSlots.find((slot) => !slot.save)?.id;
    setSelectedSaveSlotId(emptySlot ?? selectedSaveSlotId);
    setSaveStartMode("new");
    setNewPlayerName(DEFAULT_PLAYER_NAME);
    setNotice(emptySlot ? `将使用存档 ${emptySlot} 开始新游戏。` : `将覆盖存档 ${selectedSaveSlotId} 开始新游戏。`);
  }

  function chooseLatestSaveSlot() {
    const latestSlotId = latestFrontendSaveSlotId(saveSlots);
    if (!latestSlotId) {
      setSaveStartMode("new");
      setNotice("没有可继续的本地存档，请新建游戏。");
      return;
    }
    setSelectedSaveSlotId(latestSlotId);
    setSaveStartMode("continue");
    setNotice(`已选择最近的存档 ${latestSlotId}。`);
  }

  function deleteSaveSlot(slotId: number) {
    clearFrontendSaveSlot(slotId);
    const nextSlots = loadFrontendSaveSlotSummaries<FrontendSavePayload>();
    setSaveSlots(nextSlots);
    if (selectedSaveSlotId === slotId && saveStartMode === "continue") {
      setSaveStartMode(latestFrontendSaveSlotId(nextSlots) ? "continue" : "new");
    }
    setNotice(`已删除存档 ${slotId}。`);
  }

  function startFromSelectedSaveSlot() {
    const slot = saveSlots.find((item) => item.id === selectedSaveSlotId);
    saveActiveFrontendSaveSlotId(selectedSaveSlotId);
    if (saveStartMode === "new") {
      const playerName = normalizePlayerName(newPlayerName);
      setNewPlayerName(playerName);
      const nextState = createFrontendNewGameState(selectedSaveSlotId, playerName);
      applyServerState(nextState);
      refreshFrontendSaveSlots();
      setEntryStep("rest");
      setRestAreaPanel(null);
      setNotice(`已在存档 ${selectedSaveSlotId} 开始新游戏，已进入休息区。`);
      return;
    }
    if (!slot?.save) {
      setNotice(`存档 ${selectedSaveSlotId} 为空，请选择新建游戏。`);
      return;
    }
    const savedState = appStateFromFrontendSave(slot.save);
    if (!savedState) {
      setNotice(slot.errorText || `存档 ${selectedSaveSlotId} 无法读取。`);
      return;
    }
    applyServerState(savedState, { persist: false });
    setEntryStep("rest");
    setRestAreaPanel(null);
    setNotice(`已读取存档 ${selectedSaveSlotId}，已进入休息区。`);
  }

  function interactWithRestArea(kind: "stage" | "stash") {
    const target = restAreaInteractablePosition(kind, battleMap);
    const currentPlayer = playerStateRef.current;
    const targetDistance = Math.hypot(target.x - currentPlayer.x, target.y - currentPlayer.y);
    setTooltip(null);
    setBagOpen(false);
    if (targetDistance <= REST_AREA_INTERACTION_RADIUS) {
      setRestAreaInteractionTarget(null);
      setRestAreaPanel(kind);
      if (kind === "stash") setBagOpen(true);
      setNotice(kind === "stage" ? "王阳正在整理关卡情报。" : "仓库已打开。");
      return;
    }
    setRestAreaInteractionTarget(kind);
    setNotice(kind === "stage" ? "正在走向王阳。" : "正在走向仓库。");
  }

  function closeRestAreaPanel() {
    setRestAreaPanel(null);
    setBagOpen(false);
    setTooltip(null);
    setHoveredGemId(null);
    setNotice("已回到休息区。");
  }

  async function applyGameResolutionMode(mode: GameResolutionMode) {
    setGameResolutionMode(mode);
    saveGameResolutionMode(mode);
    if (mode === "fullscreen" && typeof document !== "undefined" && !document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
  }

  function closeInventorySurface() {
    clearFloatingGem();
    clearDragHoverState();
    setBagOpen(false);
    setGmOpen(false);
    setTooltip(null);
    setHoveredGemId(null);
    if (restAreaPanel === "stash") {
      setRestAreaPanel(null);
      setNotice("已返回休息区域。");
    }
  }

  function continueBattleFromPause() {
    setBattlePauseOpen(false);
    setBattlePauseView("menu");
    setNotice(playing ? "继续战斗。" : "继续休息。");
  }

  function exitCurrentRunToRestArea() {
    keys.current.clear();
    resetBattleRuntimeForChallenge(battleMap?.playerSpawn ?? playerStateRef.current, battleMap);
    setPlaying(false);
    setBattlePauseOpen(false);
    setEntryStep("rest");
    setRestAreaPanel(null);
    setRestAreaInteractionTarget(null);
    setBagOpen(false);
    setGameFailureOpen(false);
    setAuthoredAggroSources([]);
    setAuthoredSpawnPlanActive(false);
    setSelectedMapId(REST_AREA_MAP_TEMPLATE_ID);
    applyFrontendState((current) => ({ ...current, current_map_run: null, drops: [] }));
    setNotice("已退出当前对局，返回休息区域。");
  }

  function endGameToTitle() {
    keys.current.clear();
    resetBattleRuntimeForChallenge(battleMap?.playerSpawn ?? playerStateRef.current, battleMap);
    setPlaying(false);
    setBattlePauseOpen(false);
    setEntryStep("title");
    setRestAreaPanel(null);
    setRestAreaInteractionTarget(null);
    setBagOpen(false);
    setGameFailureOpen(false);
    applyFrontendState((current) => ({ ...current, current_map_run: null, drops: [] }));
    refreshFrontendSaveSlots();
    setNotice("已返回主菜单。");
  }

  if (!state) {
    return (
      <GameViewportFrame viewport={gameViewport} mode={gameResolutionMode}>
        <main className="game-screen loading">{notice}</main>
      </GameViewportFrame>
    );
  }
  const runtimeUsesEditorMap = battleMap ? isEditorRuntimeBattleMap(battleMap) : false;
  const battleCamera = createBattleCamera(player.x, player.y, skillEditorMode ? skillEditorCameraSettings.zoom : runtimeUsesEditorMap ? 1 : BATTLE_CAMERA_ZOOM);
  const visibleEnemies = selectRenderableEnemies(enemies, player, elapsed);
  const anchoredHitVfxs = anchorHitVfxsToTargets(hitVfxs, enemies);
  const anchoredBolts = anchorProjectilesToTargets(bolts, enemies);
  const activeBossEnemy = visibleEnemies.find((enemy) => enemy.boss && enemy.hp > 0) ?? null;
  const guardActive = activePlayerBuffs.some((buff) => buff.buffType === "guard" && buff.remaining > 0 && buff.remainingAmount > 0);
  const sortedRenderItems = createBattleRenderItems(player, visibleEnemies, anchoredBolts, anchoredHitVfxs, runtimeUsesEditorMap ? MAP_EDITOR_PLAYER_RENDER_SCALE : UNIT_RENDER_SCALE, guardActive);
  const animationNowMs = elapsed * 1000;
  const battleAnimationContexts = createBattleAnimationContexts(
    playerVisual.current,
    enemyVisuals.current,
    visibleEnemies,
    player,
    animationNowMs,
    statNumber(state.player_stats?.move_speed, PLAYER_SPEED) * playerMovementSpeedMultiplier(activePlayerBuffs)
  );
  const runtimeDebugCornerSummary = runtimeDebugMonsterCornerTestEnabled()
    ? runtimeDebugMonsterCornerSummary(enemies, player)
    : null;
  const runtimeBoundaryScanLine = runtimeDebugMonsterBoundaryTestEnabled()
    ? runtimeBoundaryMonsterScanLine(runtimeBoundaryScan)
    : null;
  const restAreaMapActive = Boolean(!monsterTestMode && !skillEditorMode && !playing && entryStep === "rest");
  const playableMinimapVisible = Boolean(battleMap && (playing || restAreaMapActive) && !monsterTestMode && !skillEditorMode);
  const terrainWidth = battleMap?.meta.world_width ?? MAP_VISUAL_WIDTH;
  const terrainHeight = battleMap?.meta.world_height ?? MAP_VISUAL_HEIGHT;
  const showBattleMapLayer = playing || restAreaMapActive || skillEditorMode || monsterTestMode;
  const editorBattleMap = runtimeUsesEditorMap && battleMap && isEditorRuntimeBattleMap(battleMap) ? battleMap : null;
  return (
    <GameViewportFrame viewport={gameViewport} mode={gameResolutionMode}>
    <main className="game-screen">
      <PlayableBattleScene
        activeBossEnemy={activeBossEnemy}
        showBattleMapLayer={showBattleMapLayer}
        battleMap={battleMap}
        editorBattleMap={editorBattleMap}
        mapDebugEnabled={mapDebugEnabled}
        terrainWidth={terrainWidth}
        terrainHeight={terrainHeight}
        terrainTransform={battleTerrainTransform(battleCamera)}
        battleCamera={battleCamera}
        gameViewport={gameViewport}
        animationNowMs={animationNowMs}
        player={player}
        playerMoving={Math.hypot(playerVisual.current.movementVector.x, playerVisual.current.movementVector.y) > 0.001}
        guardActive={guardActive}
        visibleEnemies={visibleEnemies}
        anchoredBolts={anchoredBolts}
        anchoredHitVfxs={anchoredHitVfxs}
        passiveVisualEffects={passiveVisualEffects}
        areaNovas={areaNovas}
        damageZones={damageZones}
        meleeArcs={meleeArcs}
        chainSegments={chainSegments}
        texts={texts}
        activePlayerBuffs={activePlayerBuffs}
        sortedRenderItems={sortedRenderItems}
        battleAnimationContexts={battleAnimationContexts}
        renderBattleRenderItem={renderBattleRenderItem}
        shouldRenderLegacyBattleItem={shouldRenderLegacyBattleItem}
        projectBattleWorldToScreen={projectBattleWorldToScreen}
        worldDirectionToBattleScreenAngle={worldDirectionToBattleScreenAngle}
        battleWorldToViewport={battleWorldToViewport}
        normalizedVfxScale={normalizedVfxScale}
        visualTone={visualTone}
        cssToken={cssToken}
        activeDamageZoneTickProgress={activeDamageZoneTickProgress}
        canvasGeometrySkillEffects={CANVAS_GEOMETRY_SKILL_EFFECTS}
        battleEntityZIndexBase={BATTLE_ENTITY_Z_INDEX_BASE}
        floatingTextVisualRiseSpeed={FLOATING_TEXT_VISUAL_RISE_SPEED}
        skillEditorMode={skillEditorMode}
        activeSkills={activeSkills}
        enemies={enemies}
        skillEditorGuidePackage={skillEditorGuidePackage}
        skillEditorDebugOptions={skillEditorDebugOptions}
        skillGuideHelpers={{
          isProjectileSkillTemplate,
          nearestGuideTarget: (source: Parameters<typeof nearestGuideTarget>[0], guideEnemies: unknown[], searchRange: number, maxDistance: number) => nearestGuideTarget(source, guideEnemies as Enemy[], searchRange, maxDistance),
          guideDirection,
          projectileSpawnWorldPosition,
          projectileSpreadAngleDeg,
          projectileAngleStepDeg,
          projectileSpreadDirections,
          projectBattleWorldToScreen,
          worldDirectionToBattleScreenAngle,
          rotateDirection,
          formatPreviewNumber
        }}
        drops={state.drops}
        dropDisplayPositions={dropDisplayPositions.current}
        beginDropPickup={beginDropPickup}
        bossPortal={bossPortal}
        beginBossPortalUse={beginBossPortalUse}
        restAreaMapActive={restAreaMapActive}
        restAreaInteractionTarget={restAreaInteractionTarget}
        interactWithRestArea={interactWithRestArea}
        playableMinimapVisible={playableMinimapVisible}
        exploredMinimapCells={exploredMinimapCells}
        playableMinimapMode={playableMinimapMode}
      />

      {monsterTestMode && (
        <MonsterTestPanel
          playerLifeText={formatPreviewNumber(player.maxHp)}
          liveMonsterCount={enemies.filter((enemy) => enemy.hp > 0).length}
          selectedMonsterId={selectedMonsterTestMonsterId}
          monsterOptions={monsterTestOptions}
          onSelectMonster={setSelectedMonsterTestMonsterId}
          onSpawn={spawnSelectedMonsterTestEnemy}
          onDestroyAll={destroyAllMonsterTestEnemies}
        />
      )}

      {RELEASE_DEBUG_TOOLS_ENABLED && (
        <header className="top-hud">
          <div>
            <h1>{APP_TITLE}</h1>
            <span>{notice}</span>
          </div>
          {skillEditorMode && (
            <button className="hud-button" type="button" onClick={openSkillEditorPanel}>
              技能编辑器
            </button>
          )}
        </header>
      )}

      {!monsterTestMode && !skillEditorMode && entryStep === "title" && (
        <section className="entry-title-screen" aria-label="开始游戏">
          <div className="entry-title-copy">
            <h2>{APP_TITLE}</h2>
          </div>
          <button
            className="entry-primary-button"
            type="button"
            onClick={() => {
              refreshFrontendSaveSlots();
              setEntryStep("save");
              setNotice("请选择新建游戏、继续游戏或存档槽位。");
            }}
          >
            开始游戏
          </button>
        </section>
      )}

      {!monsterTestMode && !skillEditorMode && entryStep === "save" && (
        <SaveSelectionPanel
          slots={saveSlots}
          selectedSlotId={selectedSaveSlotId}
          mode={saveStartMode}
          newPlayerName={newPlayerName}
          canStart={saveStartMode !== "new" || newPlayerName.trim().length > 0}
          slotHasSave={(slot) => Boolean(slot.save)}
          slotMainText={(slot) => slot.save ? `${normalizePlayerName(slot.save.player_name)} · ${formatFrontendSaveTime(slot.save.saved_at)}` : null}
          slotProgressText={(slot) => {
            const saveState = appStateFromFrontendSave(slot.save);
            const selectedStage = saveState?.map_progression?.stages.find((stage) => stage.selected);
            return selectedStage ? `${selectedStage.display_name} · 怪物等级 ${selectedStage.monster_level}` : "角色进度已保存";
          }}
          slotErrorText={(slot) => slot.errorText}
          footerText={saveStartMode === "new" ? `将在存档 ${selectedSaveSlotId} 新建游戏` : saveSlots.find((slot) => slot.id === selectedSaveSlotId)?.save ? `将读取存档 ${selectedSaveSlotId}` : "请选择有数据的存档或新建游戏"}
          onSelectSlot={(slotId) => {
            setSelectedSaveSlotId(slotId);
            setSaveStartMode(saveSlots.find((slot) => slot.id === slotId)?.save ? "continue" : "new");
          }}
          onNewGame={chooseNewSaveSlot}
          onContinue={chooseLatestSaveSlot}
          onDelete={deleteSaveSlot}
          onBack={() => setEntryStep("title")}
          onNewPlayerNameChange={setNewPlayerName}
          onStart={startFromSelectedSaveSlot}
        />
      )}

      {RELEASE_DEBUG_TOOLS_ENABLED && (
        <MapDebugToggle enabled={mapDebugEnabled} onChange={setMapDebugEnabled} />
      )}
      {RELEASE_DEBUG_TOOLS_ENABLED && <ProceduralSpawnDebugPanel debug={proceduralSpawnDebug} />}
      {RELEASE_DEBUG_TOOLS_ENABLED && spawnPlanWarnings.length > 0 ? (
        <SpawnPlanWarningPanel warnings={spawnPlanWarnings} />
      ) : null}

      {!monsterTestMode && gameFailureOpen && (
        <GameFailureOverlay onClose={() => setGameFailureOpen(false)} />
      )}

      {!monsterTestMode && !skillEditorMode && (playing || restAreaMapActive) && battlePauseOpen && (
        <BattlePauseOverlay
          view={battlePauseView}
          playing={playing}
          resolutionPresets={GAME_RESOLUTION_PRESETS}
          resolutionMode={gameResolutionMode}
          onViewChange={setBattlePauseView}
          onResolutionModeChange={applyGameResolutionMode}
          onContinue={continueBattleFromPause}
          onExitRun={exitCurrentRunToRestArea}
          onEndGame={endGameToTitle}
        />
      )}

      {!monsterTestMode && !skillEditorMode && playing && bossPortalConfirm && (
        <PortalConfirmOverlay onConfirm={confirmBossPortalExit} onCancel={cancelBossPortalConfirm} />
      )}

      <HelpText />

      {skillEditorMode && (
        <SkillEditorDebugToggles
          options={skillEditorDebugOptions}
          cameraSettings={skillEditorCameraSettings}
          onChange={setSkillEditorDebugOptions}
          onCameraSettingsChange={setSkillEditorCameraSettings}
        />
      )}

      {skillEditorMode && skillEditorOpen && state.skill_editor && (
        <SkillEditorPanel
          editor={state.skill_editor}
          selectedId={selectedSkillEditorId ?? state.skill_editor.selected_id}
          onSelect={setSelectedSkillEditorId}
          onState={setState}
          onPreviewPackage={setSkillEditorGuidePackage}
          playerPosition={player}
          battleCamera={battleCamera}
          cameraSettings={skillEditorCameraSettings}
          debugOptions={skillEditorDebugOptions}
          runtimePerfSummary={runtimePerfSummary}
          onCameraSettingsChange={setSkillEditorCameraSettings}
          onDebugOptionsChange={setSkillEditorDebugOptions}
          onClose={() => {
            setSkillEditorGuidePackage(null);
            setSkillEditorOpen(false);
          }}
        />
      )}

      {!monsterTestMode && !playing && !skillEditorMode && entryStep === "rest" && restAreaPanel === "stage" && (
        <MapSelectionPanel
          battleMapReady={Boolean(battleMap)}
          progression={state.map_progression}
          stageScopeText={stageScopeLabel}
          stageBossPoolText={stageBossPackPoolLabel}
          onStart={startGame}
          onClose={closeRestAreaPanel}
        />
      )}

      {RELEASE_DEBUG_TOOLS_ENABLED && (
        <CombatFeed
          runtimeBoundaryScanLine={runtimeBoundaryScanLine}
          runtimeDebugCornerSummary={runtimeDebugCornerSummary}
          combatLogs={combatLogs}
        />
      )}

      {bagOpen && (
        <section className="inventory-overlay" aria-label="背包界面">
          <div className="inventory-stage">
          {RELEASE_DEBUG_TOOLS_ENABLED && (
            <>
              <div className="gm-tool-anchor">
                <button
                  className={`gm-tool-button${gmOpen ? " active" : ""}`}
                  type="button"
                  onClick={() => {
                    setGmOpen((current) => !current);
                    setTooltip(null);
                  }}
                >
                  GM工具
                </button>
              </div>
              {gmOpen && (
                <GmToolPanel
                  options={gmOptions}
                  affixes={gmAffixes}
                  onLoadAffixes={loadGmEquipmentAffixes}
                  onSubmit={submitGmRequest}
                  onClose={() => setGmOpen(false)}
                />
              )}
            </>
          )}
          <CharacterInfoPanel
            panel={state.character_panel}
            playerName={normalizePlayerName(state.player_name)}
            player={player}
            baseMoveSpeed={PLAYER_SPEED}
          />
          {!monsterTestMode && !playing && !skillEditorMode && entryStep === "rest" && restAreaPanel === "stash" && (
            <StashPanel
              pageIndex={stashPageIndex}
              pages={stashPages}
              activeSlots={activeStashSlots}
              fullGemById={fullGemById}
              floatingGem={floatingGem}
              hoveredGemId={hoveredGemId}
              slotCount={STASH_PAGE_SLOT_COUNT}
              columns={STASH_PAGE_COLUMNS}
              cellClassName={(slotIndex, gem, currentHoveredGemId, currentFloatingGem) => resolveBagCellClass(slotIndex, null, gem, currentHoveredGemId, currentFloatingGem, isFloatingOrigin)}
              isFloatingOrigin={isFloatingOrigin}
              renderGem={(gem) => <GemOrb gem={gem} />}
              renderGhost={() => <GemGhost />}
              onPageChange={setStashPageIndex}
              onClose={closeRestAreaPanel}
              onBeginDrag={beginDrag}
              onPointerDrag={beginPointerDrag}
              onHoverGem={onGemHover}
              onLeaveGem={() => {
                setHoveredGemId(null);
                setTooltip(null);
              }}
            />
          )}
          <section className="right-workbench">
            <section className="equipment-panel" aria-label="装备栏">
              <div className="equipment-grid" data-equipment-drop-target="true">
                {EQUIPMENT_SLOT_SPECS.map((slot, slotIndex) => {
                  const item = equippedItems[slotIndex];
                  const spansBothWeaponSlots = Boolean(
                    slotIndex === MAIN_WEAPON_SLOT_INDEX
                    && item
                    && isTwoHandedWeapon(item)
                    && equipmentSlots[OFF_WEAPON_SLOT_INDEX] === item.instance_id
                  );
                  if (
                    slotIndex === OFF_WEAPON_SLOT_INDEX
                    && item
                    && isTwoHandedWeapon(item)
                    && equipmentSlots[MAIN_WEAPON_SLOT_INDEX] === item.instance_id
                  ) {
                    return (
                      <div
                        key={slot.id}
                        className="equipment-blocked-cell"
                        data-equipment-drop-target="true"
                        data-equipment-slot-index={slotIndex}
                        data-equipment-slot-id={slot.id}
                        title="双手武器占用，禁止摆放"
                        onMouseEnter={() => setHoveredEquipmentSlot(slotIndex)}
                        onMouseLeave={() => setHoveredEquipmentSlot(null)}
                      >
                        <span className="equipment-slot-label">{slot.label}</span>
                        <span className="equipment-blocked-mark" aria-hidden="true">X</span>
                      </div>
                    );
                  }
                  const origin = item
                    ? { kind: "equipment" as const, slotIndex, slotId: slot.id, instanceId: item.instance_id }
                    : null;
                  const isGhost = Boolean(origin && isFloatingOrigin(floatingGem, origin));
                  return item ? (
                    <EquipmentItemCell
                      key={slot.id}
                      slot={slot}
                      slotIndex={slotIndex}
                      item={item}
                      isGhost={isGhost}
                      className={resolveEquipmentCellClass(slotIndex, hoveredEquipmentSlot, item, hoveredGemId, floatingGem, slot, isFloatingOrigin, spansBothWeaponSlots)}
                      renderGem={(gem) => <GemOrb gem={gem} />}
                      renderGhost={() => <GemGhost />}
                      onBeginDrag={beginDrag}
                      onPointerDrag={(event) => origin && beginPointerDrag(event, item, origin)}
                      onHover={(event) => {
                        setHoveredEquipmentSlot(slotIndex);
                        onGemHover(event, item, "equipment", slotIndex);
                      }}
                      onMove={(event) => onGemHover(event, item, "equipment", slotIndex)}
                      onLeave={() => {
                        setHoveredEquipmentSlot(null);
                        setHoveredGemId(null);
                        setTooltip(null);
                      }}
                    />
                  ) : (
                    <EquipmentEmptyCell
                      key={slot.id}
                      slot={slot}
                      slotIndex={slotIndex}
                      className={equipmentEmptyCellClass(slotIndex, hoveredEquipmentSlot, floatingGem, slot)}
                      onHover={() => setHoveredEquipmentSlot(slotIndex)}
                      onLeave={() => setHoveredEquipmentSlot(null)}
                    />
                  );
                })}
              </div>
            </section>

            <section className="board-panel">
              <div className="board-grid">
                {state.board.cells.flat().map((cell) => (
                  <BoardCell
                    key={`${cell.row}-${cell.column}`}
                    cell={cell}
                    fullGem={cell.gem ? fullGemById.get(cell.gem.instance_id) ?? cell.gem : null}
                    hoveredGemId={hoveredBoardGemId}
                    linkedGemIds={linkedGemIds}
                    supportPreview={supportPreview}
                    floatingGemId={floatingGem?.gem.instance_id ?? null}
                    selectedGemInstanceId={selectedGemInstanceId}
                    legalPlacementCells={legalPlacementCells}
                    hoveredBoardCell={hoveredBoardCell}
                    previewCell={previewCell}
                    previewAffectedCell={previewAffectedCells.get(cellKey(cell.row, cell.column)) ?? null}
                    previewInvalidReason={hoveredBoardCell === cellKey(cell.row, cell.column) ? previewInvalidReason : null}
                    onHoverCell={setHoveredBoardCell}
                    onDropGem={dropGemOnCell}
                    onDragGem={beginDrag}
                    onPointerDragGem={beginPointerDrag}
                    onHoverGem={onGemHover}
                    onLeaveGem={() => {
                      setHoveredGemId(null);
                      setTooltip(null);
                    }}
                    onUnmountGem={unmountGem}
                    renderGem={(gem) => <GemOrb gem={gem} />}
                  />
                ))}
                {supportPreview
                  ? supportPreview.targets.length > 0 && <SupportPreviewLines preview={supportPreview} />
                  : activeTargetLines
                    ? activeTargetLines.length > 0 && <SupportLines lines={activeTargetLines} className="support-hover-lines" />
                  : showPersistentSupportLines && persistentSupportLines.length > 0 && <SupportLines lines={persistentSupportLines} />}
                {placementPreview && (
                  <div className="placement-preview-summary" data-preview-skill-refresh={previewCell ?? ""}>
                    <strong>放下后预计影响</strong>
                    <span>{placementPreview.previewSkillSummary}</span>
                  </div>
                )}
              </div>
              <label className="support-line-toggle">
                <input
                  type="checkbox"
                  checked={showPersistentSupportLines}
                  onChange={(event) => setShowPersistentSupportLines(event.currentTarget.checked)}
                />
                <span>常驻显示连线</span>
              </label>
            </section>

            <section className="bag-panel">
              <BagGrid
                slots={bagSlots}
                floatingGem={floatingGem}
                cellClassName={(slotIndex, gem) => resolveBagCellClass(slotIndex, hoveredBagSlot, gem, hoveredGemId, floatingGem, isFloatingOrigin)}
                emptyCellClassName={(slotIndex) => bagEmptyCellClass(slotIndex, hoveredBagSlot)}
                isFloatingOrigin={isFloatingOrigin}
                renderGem={(gem) => <GemOrb gem={gem} />}
                renderGhost={() => <GemGhost />}
                onBeginDrag={beginDrag}
                onPointerDrag={beginPointerDrag}
                onHoverSlot={setHoveredBagSlot}
                onHoverGem={onGemHover}
                onLeaveSlot={() => setHoveredBagSlot(null)}
                onLeaveGem={() => {
                  setHoveredBagSlot(null);
                  setHoveredGemId(null);
                  setTooltip(null);
                }}
              />
            </section>
          </section>
          </div>

          {tooltip && !floatingGem && (
            <GemTooltipOverlay
              tooltip={tooltip}
              compareModifierHeld={compareModifierHeld}
              getComparisonTooltipPosition={getComparisonTooltipPosition}
              buildViewModel={buildGemTooltipViewModel}
              renderGemOrb={(gem) => <GemOrb gem={gem} />}
              highlightTooltipText={highlightTooltipText}
              activeDpsToneClass={activeDpsToneClass}
              equipmentTooltipRarityTone={equipmentTooltipRarityTone}
              normalizedEquipmentTooltipTags={normalizedEquipmentTooltipTags}
              equipmentTooltipStatLines={equipmentTooltipStatLines}
              equipmentTooltipBonusLines={equipmentTooltipBonusLines}
              frontendGemLevelText={frontendGemLevelText}
              isEquipmentTooltip={(gem) => gem.item_kind === "equipment"}
            />
          )}
          {floatingGem && <FloatingGemView floatingGem={floatingGem} renderGem={(gem) => <GemOrb gem={gem} />} />}
          {floatingGem && <div className="drag-hint">拖到数独盘格子后松开</div>}
          {placementPrompt && (
            <div className="placement-prompt" style={{ left: placementPrompt.x, top: placementPrompt.y }}>
              {placementPrompt.text}
            </div>
          )}
          {itemDiscardPrompt && (
            <section className="item-discard-overlay" role="dialog" aria-modal="true" aria-label="丢弃物品确认">
              <div className="item-discard-dialog">
                <span>丢弃物品</span>
                <h2>{itemDiscardPrompt.item.name_text}</h2>
                <p>确认要把该物品丢在地上吗？</p>
                <label className="item-discard-skip">
                  <input
                    type="checkbox"
                    checked={skipItemDiscardConfirmToday}
                    onChange={(event) => setSkipItemDiscardConfirmPreference(event.currentTarget.checked)}
                  />
                  <span>今天不再确认丢弃</span>
                </label>
                <div className="item-discard-actions">
                  <button type="button" onClick={confirmDiscardItem}>确认丢弃</button>
                  <button type="button" onClick={() => setItemDiscardPrompt(null)}>取消</button>
                </div>
              </div>
            </section>
          )}
        </section>
      )}
    </main>
    </GameViewportFrame>
  );
}

function statNumber(stat: PlayerStatView | undefined, fallback: number) {
  return typeof stat?.value === "number" ? stat.value : fallback;
}

function statValue(stats: Record<string, number | boolean> | undefined, stat: string) {
  const value = stats?.[stat];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function frontendEnergyShieldRechargePercentPerSecond(stats: AppState["player_stats"] | undefined) {
  const speedAddPercent = statNumber(stats?.energy_shield_charge_speed_percent, 0)
    + statNumber(stats?.energy_shield_charge_speed_add_percent, 0);
  const speedFinalPercent = statNumber(stats?.energy_shield_charge_speed_final_percent, 0);
  return Math.max(0, 20 * (1 + speedAddPercent / 100) * (1 + speedFinalPercent / 100));
}

function frontendEnergyShieldRechargeDelayMs(stats: AppState["player_stats"] | undefined) {
  const baseDelayMs = Math.max(0, statNumber(stats?.energy_shield_charge_delay_ms, 2000));
  const intervalAddPercent = statNumber(stats?.energy_shield_charge_interval_percent, 0)
    + statNumber(stats?.energy_shield_charge_interval_add_percent, 0)
    + statNumber(stats?.energy_shield_charge_delay_add_percent, 0);
  const intervalFinalPercent = statNumber(stats?.energy_shield_charge_interval_final_percent, 0)
    + statNumber(stats?.energy_shield_charge_delay_final_percent, 0);
  return Math.max(0, baseDelayMs * Math.max(0, 1 + intervalAddPercent / 100) * Math.max(0, 1 + intervalFinalPercent / 100));
}

function regeneratePlayerResources(player: PlayerRuntimeState, stats: AppState["player_stats"] | undefined, dt: number): PlayerRuntimeState {
  const lifeRegen = Math.max(0, statNumber(stats?.life_regen_flat, 0) * (1 + Math.max(0, statNumber(stats?.life_regen_add_percent, 0)) / 100))
    + Math.max(0, player.maxHp * statNumber(stats?.life_regen_percent_per_second, 0) / 100);
  const manaRegen = Math.max(0, statNumber(stats?.mana_regen_flat, 0) * (1 + Math.max(0, statNumber(stats?.mana_regen_add_percent, 0)) / 100));
  if (lifeRegen <= 0 && manaRegen <= 0) return player;
  return {
    ...player,
    hp: clamp(player.hp + lifeRegen * dt, 0, player.maxHp),
    currentMana: clamp(player.currentMana + manaRegen * dt, 0, player.maxMana)
  };
}

function normalizePlayerRuntimeResources(player: PlayerRuntimeState): PlayerRuntimeState {
  const maxHp = Math.max(0, Number.isFinite(player.maxHp) ? player.maxHp : 0);
  const maxMana = Math.max(0, Number.isFinite(player.maxMana) ? player.maxMana : 0);
  const maxEnergyShield = Math.max(0, Number.isFinite(player.maxEnergyShield) ? player.maxEnergyShield : 0);
  return {
    ...player,
    maxHp,
    hp: clamp(Number.isFinite(player.hp) ? player.hp : maxHp, 0, maxHp),
    maxMana,
    currentMana: clamp(Number.isFinite(player.currentMana) ? player.currentMana : maxMana, 0, maxMana),
    maxEnergyShield,
    currentEnergyShield: clamp(Number.isFinite(player.currentEnergyShield) ? player.currentEnergyShield : maxEnergyShield, 0, maxEnergyShield)
  };
}

function usePlacementInvalidReason(
  state: AppState | null,
  floatingGem: FloatingGem | null,
  hoveredBoardCell: string | null,
  legalPlacementCells: Set<string>
) {
  return useMemo(() => {
    if (!state || !floatingGem || !hoveredBoardCell || legalPlacementCells.has(hoveredBoardCell)) return null;
    if (!isGemItem(floatingGem.gem)) return "不可放置：只有宝石可以放入数独盘";
    const cell = boardCellByKey(state, hoveredBoardCell);
    if (!cell) return "不可放置：坐标超出数独盘";
    const ignoredInstanceIds = new Set([floatingGem.gem.instance_id, cell.gem?.instance_id ?? ""]);
    if (cell.gem && cell.gem.instance_id !== floatingGem.gem.instance_id && !ignoredInstanceIds.has(cell.gem.instance_id)) {
      return "不可放置：目标格已有宝石";
    }
    return "不可放置：同行、同列或同宫已有相同数独数字";
  }, [state, floatingGem, hoveredBoardCell, legalPlacementCells]);
}

function usePlacementPreview(
  state: AppState | null,
  fullGemById: Map<string, Gem>,
  floatingGem: FloatingGem | null,
  previewCell: string | null
) {
  return useMemo<PlacementPreview | null>(() => {
    if (!state || !floatingGem || !previewCell) return null;
    const targetCell = boardCellByKey(state, previewCell);
    if (!targetCell) return null;

    const previewAffectedCells = new Map<string, { types: PreviewRelationType[] }>();
    const previewAffectedGems = new Map<string, { labels: string[]; modifierCount: number }>();
    const previewRelations: PlacementPreview["previewRelations"] = [];

    for (const row of state.board.cells) {
      for (const cell of row) {
        if (cell.row === targetCell.row && cell.column === targetCell.column) continue;
        const types = previewRelationTypes(targetCell, cell);
        if (types.length === 0) continue;
        const key = cellKey(cell.row, cell.column);
        previewAffectedCells.set(key, { types });

        const affectedGem = cell.gem ? fullGemById.get(cell.gem.instance_id) ?? cell.gem : null;
        const labels = types.map(previewRelationLabel);
        previewRelations.push({ row: cell.row, column: cell.column, types, instanceId: affectedGem?.instance_id });
        if (affectedGem && affectedGem.instance_id !== floatingGem.gem.instance_id) {
          previewAffectedGems.set(affectedGem.instance_id, {
            labels,
            modifierCount: estimatePreviewModifierCount(floatingGem.gem, affectedGem, types)
          });
        }
      }
    }

    const affectedGemCount = previewAffectedGems.size;
    const previewSkillSummary = affectedGemCount > 0
      ? `${affectedGemCount} 个已放置宝石，${previewRelations.length} 个关系格`
      : "无可影响目标";

    return {
      previewCell: { row: targetCell.row, column: targetCell.column },
      previewAffectedCells,
      previewAffectedGems,
      previewRelations,
      previewSkillSummary
    };
  }, [state, fullGemById, floatingGem, previewCell]);
}

function boardCellByKey(state: AppState, key: string) {
  const [rowText, columnText] = key.split("-");
  const row = Number(rowText);
  const column = Number(columnText);
  return state.board.cells[row]?.[column] ?? null;
}

function previewRelationTypes(source: Cell, target: Cell) {
  const types: PreviewRelationType[] = [];
  if (target.row === source.row) types.push("row");
  if (target.column === source.column) types.push("column");
  if (target.box === source.box) types.push("box");
  if (Math.abs(target.row - source.row) + Math.abs(target.column - source.column) === 1) types.push("adjacent");
  return types;
}

function estimatePreviewModifierCount(sourceGem: Gem, targetGem: Gem, types: PreviewRelationType[]) {
  if (isAllowedRoute(sourceGem, targetGem)) return Math.max(1, types.length);
  return types.length;
}

function useLegalDropCells(state: AppState | null, floatingGem: Gem | null) {
  return useMemo(() => {
    const result = new Set<string>();
    if (!state || !floatingGem) return result;

    const floatingSudokuDigit = sudokuDigitKey(floatingGem);
    for (const row of state.board.cells) {
      for (const cell of row) {
        const target = cell.gem;
        const ignoredInstanceIds = new Set([floatingGem.instance_id, target?.instance_id ?? ""]);

        const hasConflict = state.board.cells.some((otherRow) =>
          otherRow.some((otherCell) => {
            const otherGem = otherCell.gem;
            if (!otherGem || ignoredInstanceIds.has(otherGem.instance_id)) return false;
            if (sudokuDigitKey(otherGem) !== floatingSudokuDigit) return false;
            return otherCell.row === cell.row || otherCell.column === cell.column || otherCell.box === cell.box;
          })
        );
        if (!hasConflict) result.add(cellKey(cell.row, cell.column));
      }
    }

    return result;
  }, [state, floatingGem]);
}

function useLinkedGemIds(state: AppState | null, hoveredGemId: string | null) {
  return useMemo(() => {
    const result = new Set<string>();
    if (!state || !hoveredGemId) return result;
    result.add(hoveredGemId);
    for (const entries of Object.values(state.board.highlights)) {
      for (const entry of entries) {
        if (entry.instance_ids.includes(hoveredGemId)) {
          for (const instanceId of entry.instance_ids) result.add(instanceId);
        }
      }
    }
    return result;
  }, [state, hoveredGemId]);
}

function useSupportPreview(state: AppState | null, fullGemById: Map<string, Gem>, hoveredGemId: string | null, floatingGem: FloatingGem | null) {
  return useMemo<SupportPreview | null>(() => {
    if (!state || !hoveredGemId || floatingGem) return null;
    const sourceGem = fullGemById.get(hoveredGemId);
    if (!sourceGem || !sourceGem.board_position || !(isSupportGem(sourceGem) || isPassiveGem(sourceGem))) return null;

    const targetIds = new Set<string>();
    for (const skill of state.skill_preview) {
      for (const modifier of skill.applied_modifiers) {
        if (modifier.applied && modifier.source_instance_id === sourceGem.instance_id && modifier.target_instance_id) {
          targetIds.add(modifier.target_instance_id);
        }
      }
    }

    const targets = state.board.cells.flat()
      .map((cell) => {
        if (!cell.gem || !targetIds.has(cell.gem.instance_id)) return null;
        const gem = fullGemById.get(cell.gem.instance_id) ?? cell.gem;
        if (!isAllowedRoute(sourceGem, gem)) return null;
        return { row: cell.row, column: cell.column, instanceId: gem.instance_id };
      })
      .filter((target): target is { row: number; column: number; instanceId: string } => Boolean(target));

    return {
      source: {
        row: sourceGem.board_position.row,
        column: sourceGem.board_position.column,
        instanceId: sourceGem.instance_id
      },
      targets,
      color: gemColorValue(sourceGem)
    };
  }, [state, fullGemById, hoveredGemId, floatingGem]);
}

function useSupportLines(state: AppState | null, fullGemById: Map<string, Gem>) {
  return useMemo<SupportLine[]>(() => {
    if (!state) return [];
    const result = new Map<string, SupportLine>();
    for (const skill of state.skill_preview) {
      for (const modifier of skill.applied_modifiers) {
        if (!modifier.applied || !modifier.source_instance_id || !modifier.target_instance_id) continue;
        const sourceGem = fullGemById.get(modifier.source_instance_id);
        const targetGem = fullGemById.get(modifier.target_instance_id);
        if (!sourceGem?.board_position || !targetGem?.board_position) continue;
        if (!isAllowedRoute(sourceGem, targetGem)) continue;
        const key = `${sourceGem.instance_id}-${targetGem.instance_id}`;
        if (result.has(key)) continue;
        result.set(key, {
          id: key,
          source: sourceGem.board_position,
          target: targetGem.board_position,
          color: gemColorValue(sourceGem)
        });
      }
    }
    return [...result.values()];
  }, [state, fullGemById]);
}

function useActiveTargetLines(lines: SupportLine[], fullGemById: Map<string, Gem>, hoveredGemId: string | null, floatingGem: FloatingGem | null) {
  return useMemo<SupportLine[] | null>(() => {
    if (!hoveredGemId || floatingGem) return null;
    const hoveredGem = fullGemById.get(hoveredGemId);
    if (!hoveredGem?.board_position || !isActiveGem(hoveredGem)) return null;
    return lines.filter((line) => line.target.row === hoveredGem.board_position?.row && line.target.column === hoveredGem.board_position.column);
  }, [lines, fullGemById, hoveredGemId, floatingGem]);
}

function resolveTooltipPosition(anchor: HTMLElement, source: "board" | "inventory" | "equipment" | "stash", slotIndex?: number): Omit<Tooltip, "gem"> {
  return resolveTooltipAnchorPosition(anchor, source, slotIndex, tooltipPositionConfig());
}

function getComparisonTooltipPosition(tooltip: Tooltip): Omit<Tooltip, "gem" | "comparisonGem"> {
  return resolveComparisonTooltipPosition(tooltip, tooltipPositionConfig());
}

function tooltipPositionConfig() {
  return {
    width: TOOLTIP_WIDTH,
    comparisonGap: TOOLTIP_COMPARISON_GAP,
    screenPadding: TOOLTIP_SCREEN_PADDING,
    inventoryColumns: INVENTORY_COLUMNS
  };
}

function isPlayableBattleTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.tagName === "TEXTAREA" || target.tagName === "SELECT") return true;
  if (target instanceof HTMLInputElement) return target.type !== "range";
  return false;
}

function isBattleMapPointInBounds(map: BakedBattleMapData, position: { x: number; y: number }) {
  return position.x >= 0
    && position.y >= 0
    && position.x <= map.meta.world_width
    && position.y <= map.meta.world_height;
}

function droppedItemDropKind(item: Gem): DropPrompt["loot_kind"] {
  if (item.item_kind === "equipment") return "equipment";
  if (isGemItem(item)) return "gem";
  return item.item_kind ?? "ordinary";
}

function removeInventoryItemFromState(state: AppState, instanceId: string): AppState {
  return {
    ...state,
    inventory: state.inventory.filter((item) => item.instance_id !== instanceId),
    stash_pages: removeItemsFromStashPages(state.stash_pages, [instanceId]),
    equipment_slots: removeItemsFromEquipmentSlots(normalizeEquipmentSlots(state.equipment_slots ?? []), [instanceId]),
    board: {
      ...state.board,
      cells: state.board.cells.map((row) =>
        row.map((cell) => (
          cell.gem?.instance_id === instanceId ? { ...cell, gem: null } : cell
        ))
      )
    }
  };
}

function isDropBackToOrigin(
  floatingGem: FloatingGem,
  target: DropTarget,
  state: AppState | null,
  inventorySlots: (string | null)[],
  equipmentSlots: (string | null)[],
  stashPages: (string | null)[][] | undefined
) {
  const origin = floatingGem.origin;
  if (origin.kind === "bag") {
    return target.kind === "bag" && origin.slotIndex === target.slotIndex && inventorySlots[target.slotIndex] === floatingGem.gem.instance_id;
  }
  if (origin.kind === "equipment") {
    return target.kind === "equipment" && origin.slotIndex === target.slotIndex && equipmentSlots[target.slotIndex] === floatingGem.gem.instance_id;
  }
  if (origin.kind === "stash") {
    return target.kind === "stash"
      && origin.pageIndex === target.pageIndex
      && origin.slotIndex === target.slotIndex
      && normalizeStashPages(stashPages)[target.pageIndex]?.[target.slotIndex] === floatingGem.gem.instance_id;
  }
  return (
    target.kind === "board" &&
    origin.row === target.row &&
    origin.column === target.column &&
    state?.board.cells[target.row]?.[target.column]?.gem?.instance_id === floatingGem.gem.instance_id
  );
}

function reconcileInventorySlots(current: (string | null)[], state: AppState, floatingItemId: string | null, equippedIds: Set<string> = new Set()) {
  const unmountedIds = new Set(state.inventory.filter((gem) => !gem.board_position).map((gem) => gem.instance_id));
  const next = Array(INVENTORY_SLOT_COUNT).fill(null) as (string | null)[];
  const used = new Set<string>();

  current.slice(0, INVENTORY_SLOT_COUNT).forEach((instanceId, index) => {
    if (instanceId && instanceId !== floatingItemId && !equippedIds.has(instanceId) && unmountedIds.has(instanceId) && !used.has(instanceId)) {
      next[index] = instanceId;
      used.add(instanceId);
    }
  });

  for (const gem of state.inventory) {
    if (gem.board_position || gem.instance_id === floatingItemId || equippedIds.has(gem.instance_id) || used.has(gem.instance_id)) continue;
    const emptyIndex = next.findIndex((instanceId) => instanceId === null);
    if (emptyIndex >= 0) {
      next[emptyIndex] = gem.instance_id;
      used.add(gem.instance_id);
    }
  }

  return next;
}

function moveItemToInventorySlot(slots: (string | null)[], instanceId: string, slotIndex: number) {
  const next = slots.slice(0, INVENTORY_SLOT_COUNT);
  while (next.length < INVENTORY_SLOT_COUNT) next.push(null);
  for (let index = 0; index < next.length; index += 1) {
    if (next[index] === instanceId) next[index] = null;
  }
  next[slotIndex] = instanceId;
  return next;
}

function moveItemToEquipmentSlot(slots: (string | null)[], instanceId: string, slotIndices: number | readonly number[]) {
  const next = slots.slice(0, EQUIPMENT_SLOT_COUNT);
  while (next.length < EQUIPMENT_SLOT_COUNT) next.push(null);
  const indices = Array.isArray(slotIndices) ? slotIndices : [slotIndices];
  for (let index = 0; index < next.length; index += 1) {
    if (next[index] === instanceId) next[index] = null;
  }
  for (const slotIndex of indices) {
    next[slotIndex] = instanceId;
  }
  return next;
}

function normalizeEquipmentSlots(slots: (string | null)[]) {
  const next = slots.slice(0, EQUIPMENT_SLOT_COUNT);
  while (next.length < EQUIPMENT_SLOT_COUNT) next.push(null);
  return next.map((instanceId) => instanceId ?? null);
}

function sanitizeEquipmentSlotsForState(state: AppState): AppState {
  const normalizedSlots = normalizeEquipmentSlots(state.equipment_slots ?? []);
  const equipment_slots = normalizedSlots.map((instanceId, slotIndex) => {
    if (!instanceId) return null;
    const item = inventoryItemById(state, instanceId);
    const slot = EQUIPMENT_SLOT_SPECS[slotIndex];
    return item && slot && canPlaceItemInEquipmentSlot(item, slot) ? instanceId : null;
  });
  return { ...state, equipment_slots };
}

function removeItemsFromEquipmentSlots(slots: (string | null)[], instanceIds: string[]) {
  const idSet = new Set(instanceIds.filter(Boolean));
  return slots.map((slotInstanceId) => (slotInstanceId && idSet.has(slotInstanceId) ? null : slotInstanceId));
}

function pointFromUnknown(value: unknown): { x: number; y: number } | null {
  if (!value || typeof value !== "object") return null;
  const point = value as { x?: unknown; y?: unknown };
  const x = Number(point.x);
  const y = Number(point.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function battleAnchorX() {
  return currentGameViewportMetrics().width * 0.5;
}

function battleAnchorY() {
  return currentGameViewportMetrics().height * 0.58;
}

function battleWorldToViewport(worldPosition: { x: number; y: number }, camera: Camera2D) {
  const screen = projectBattleWorldToScreen(worldPosition.x, worldPosition.y);
  return {
    x: battleAnchorX() + camera.zoom * (screen.x - camera.screenX),
    y: battleAnchorY() + camera.zoom * (screen.y - camera.screenY)
  };
}

function viewportToBattleWorld(clientX: number, clientY: number, camera: Camera2D) {
  const point = clientToGameViewportPoint(clientX, clientY);
  const terrainScreenX = (point.x - battleAnchorX()) / camera.zoom + camera.screenX;
  const terrainScreenY = (point.y - battleAnchorY()) / camera.zoom + camera.screenY;
  void unprojectScreenToWorld;
  return { x: terrainScreenX, y: terrainScreenY };
}

function formatPreviewNumber(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 100) return Math.round(value).toString();
  if (Math.abs(value) >= 10) return value.toFixed(1).replace(/\.0$/, "");
  return value.toFixed(2).replace(/\.00$/, "").replace(/0$/, "");
}

function formatModifierValue(stat: string, value: number) {
  if (stat === "conduit_multiplier") return `?${formatPreviewNumber(value)}`;
  if (stat.endsWith("_percent")) return `${value >= 0 ? "+" : ""}${formatPreviewNumber(value)}%`;
  return `${value >= 0 ? "+" : ""}${formatPreviewNumber(value)}`;
}

const LEGENDARY_BOSS_PACK_IDS = [
  "geo_boss_king",
  "geo_boss_void",
  "geo_boss_tyrant",
  "geo_boss_star_mother",
  "geo_boss_judicator",
  "geo_boss_mirror",
  "geo_boss_crack_crown",
  "geo_boss_null_bastion",
  "geo_boss_razor_gyre",
  "geo_boss_orbit_matron",
  "geo_boss_king_vanguard",
  "geo_boss_void_bulwark",
  "geo_boss_tyrant_fangs",
  "geo_boss_star_mother_swarm",
  "geo_boss_judicator_court",
  "geo_boss_mirror_shades",
  "geo_boss_crack_crown_sentinels",
  "geo_boss_null_bastion_prism",
  "geo_boss_razor_gyre_winds",
  "geo_boss_orbit_matron_orbits",
  "geo_boss_king_crawlers",
  "geo_boss_void_shades",
  "geo_boss_tyrant_chargers",
  "geo_boss_star_mother_casters",
  "geo_boss_judicator_judges",
  "geo_boss_mirror_reflections",
  "geo_boss_crack_crown_hunters",
  "geo_boss_null_bastion_guards",
  "geo_boss_razor_gyre_assassins",
  "geo_boss_orbit_matron_cluster"
];

const SUPREME_BOSS_PACK_IDS = [
  "geo_boss_eclipse",
  "geo_boss_triad",
  "geo_boss_high_judicator",
  "geo_boss_blood_eclipse",
  "geo_boss_shard_mirror",
  "geo_boss_final_triad",
  "geo_boss_eclipse_plague",
  "geo_boss_triad_court",
  "geo_boss_high_judicator_guard",
  "geo_boss_blood_eclipse_core",
  "geo_boss_shard_mirror_twins",
  "geo_boss_final_triad_hunters",
  "geo_boss_eclipse_sigil",
  "geo_boss_triad_blinkers",
  "geo_boss_high_judicator_obelisk",
  "geo_boss_blood_eclipse_fangs",
  "geo_boss_shard_mirror_shades",
  "geo_boss_final_triad_casters"
];

const MONSTER_SKILL_CONFIG = monsterSkillsConfig as MonsterSkillConfig;
const SUPREME_BOSS_SKILL_CONFIG = normalizeSupremeBossSkillConfig(supremeBossSkillsConfig);
const SUPREME_BOSS_SKILL_IDS = new Set(supremeBossSkillIds(SUPREME_BOSS_SKILL_CONFIG));
const SUPREME_BOSS_SKILL_CONFIG_ERRORS = validateSupremeBossSkillConfig(SUPREME_BOSS_SKILL_CONFIG);

function createProceduralSpawnPlanEnemies(map: BakedBattleMapData, startId: number, selectedMapId: string | null, stage?: MapProgressionStageView | null, instanceSeed?: string) {
  const spawnMap = isEditorRuntimeBattleMap(map) ? {
    ...map,
    zones: map.editorZones.map((zone) => ({
      id: zone.id,
      zoneType: zone.zoneType,
      shape: zone.shape,
      points: zone.points.map((point) => editorRuntimeCoordinatePoint(point.x, point.y, map.meta.grid_size, map.gridWidth, map.gridHeight)),
      rects: mapEditorZoneRects(zone).map((rect) => ({
        start: editorRuntimeCoordinatePoint(rect.start.x, rect.start.y, map.meta.grid_size, map.gridWidth, map.gridHeight),
        end: editorRuntimeCoordinatePoint(rect.end.x, rect.end.y, map.meta.grid_size, map.gridWidth, map.gridHeight)
      }))
    }))
  } : map;
  const result = generateProceduralMonsterSpawns(spawnMap, stageScopedMapSpawnConfig(stage), {
    startId,
    seed: `${selectedMapId ?? map.id}:${map.displayName}:v1:${instanceSeed || `${Date.now()}:${Math.random()}`}`
  });
  const level = Math.max(1, Number(stage?.monster_level ?? 1));
  const normalLife = monsterNormalLifeForLevel(level);
  const normalDamage = monsterNormalDamageForLevel(level);
  const normalAccuracy = monsterNormalAccuracyForLevel(level);
  const normalArmor = monsterNormalArmorForLevel(level);
  const normalEnergyShield = monsterNormalEnergyShieldForLevel(level);
  const enemies: Enemy[] = result.enemies.map((monster) => {
    const maxHp = Math.max(1, Math.round(normalLife * monster.life_multiplier));
    const defense = monsterDefenseStats(monster.monster_type, monster.spawn_rarity, normalArmor, normalEnergyShield);
    const attackStats = monsterAttackStats(monster.monster_type, monster.spawn_rarity, normalAccuracy, monster.damage_type);
    const skillAssignment = monsterSkillAssignmentFor(MONSTER_SKILL_CONFIG, monster.monster_id);
    const baseSkill = monsterSkillDefinitionFor(MONSTER_SKILL_CONFIG, skillAssignment?.skill_id);
    return {
      id: monster.runtime_id,
      x: monster.x,
      y: monster.y,
      hp: maxHp,
      maxHp,
      monsterId: monster.monster_id,
      authored: true,
      boss: monster.boss,
      spawnPlanSourceId: monster.aggro_source_id,
      proceduralMonsterPackId: monster.monster_pack_id,
      proceduralZoneType: monster.zone_type,
      spawnRarity: monster.spawn_rarity,
      monsterType: monster.monster_type,
      movementSpeedMultiplier: monster.movement_speed_multiplier,
      skillShape: monster.skill_shape,
      nemesis: monster.nemesis,
      lifeMultiplier: monster.life_multiplier,
      damageMultiplier: monster.damage_multiplier,
      baseDamage: normalDamage,
      ...attackStats,
      ...defense,
      damageType: monster.damage_type,
      hitKind: monster.hit_kind,
      attackRange: monster.attack_range,
      attackCadenceMs: monster.attack_cadence_ms,
      offenseModifiers: monster.offense_modifiers,
      monsterSkillId: skillAssignment?.skill_id,
      bossPatternId: skillAssignment?.boss_pattern_id,
      monsterSkillForm: skillAssignment?.chinese_form ?? baseSkill?.chinese_form,
      monsterSkillRange: baseSkill?.range,
      runtimeTier: monster.nemesis ? "active" : "dormant",
      nextThinkAt: 0
    };
  });
  const aggroSources: RuntimeEncounterAggroSource[] = result.aggroSources.map((source) => ({
    id: source.id,
    kind: source.kind,
    x: source.x,
    y: source.y,
    aggroRadius: source.aggroRadius
  }));
  return { enemies, aggroSources, nextId: result.nextId, debug: result.debug };
}

function stageScopedMapSpawnConfig(stage?: MapProgressionStageView | null): MapSpawnV1Config {
  const bossPackIds = stageBossPackIds(stage);
  return {
    ...(mapSpawnV1Config as MapSpawnV1Config),
    monster_definitions: parseMonsterDefinitionsToml(monsterDefsToml),
    map_spawn_profiles: (mapSpawnV1Config as MapSpawnV1Config).map_spawn_profiles.map((profile) => ({
      ...profile,
      zone_rules: {
        ...profile.zone_rules,
        boss_room: {
          ...profile.zone_rules.boss_room,
          fixed_pack_ids: bossPackIds
        }
      }
    }))
  };
}

function stageBossPackIds(stage?: MapProgressionStageView | null) {
  const pool = stageBossPackPool(stage);
  if (pool === "mixed") return [...LEGENDARY_BOSS_PACK_IDS, ...SUPREME_BOSS_PACK_IDS];
  return pool === "supreme" ? SUPREME_BOSS_PACK_IDS : LEGENDARY_BOSS_PACK_IDS;
}

function stageBossPackPool(stage?: MapProgressionStageView | null): "legendary" | "supreme" | "mixed" {
  if (stage?.boss_pack_pool === "legendary" || stage?.boss_pack_pool === "supreme" || stage?.boss_pack_pool === "mixed") {
    return stage.boss_pack_pool;
  }
  if (stage?.stage_scope === "timemark" || stage?.phase === "timemark" || stage?.id.startsWith("timemark_")) return "mixed";
  if (stage?.stage_scope === "major_final" || stage?.boss_stage === true) return "supreme";
  return "legendary";
}

function stageBossPackPoolLabel(stage?: MapProgressionStageView | null) {
  const pool = stageBossPackPool(stage);
  if (pool === "mixed") return "混合首领";
  if (pool === "supreme") return "至高首领";
  return "传奇首领";
}

function stageScopeLabel(stage?: MapProgressionStageView | null) {
  if (stage?.stage_scope === "timemark" || stage?.phase === "timemark") return "时刻关";
  if (stage?.stage_scope === "major_final") return "大关最后关";
  return "小关";
}

function monsterNormalLifeForLevel(level: number) {
  return Math.max(1, Math.round(MONSTER_NORMAL_LIFE_BASE * Math.pow(MONSTER_NORMAL_LIFE_GROWTH, Math.max(0, level - 1))));
}

function monsterNormalDamageForLevel(level: number) {
  return Math.max(0, Math.round(MONSTER_NORMAL_DAMAGE_BASE * Math.pow(MONSTER_NORMAL_DAMAGE_GROWTH, Math.max(0, level - 1))));
}

function monsterNormalAccuracyForLevel(level: number) {
  return Math.max(1, Math.round(MONSTER_NORMAL_ACCURACY_BASE * Math.pow(MONSTER_NORMAL_ACCURACY_GROWTH, Math.max(0, level - 1))));
}

function monsterNormalArmorForLevel(level: number) {
  return Math.max(0, Math.round(MONSTER_NORMAL_ARMOR_BASE * Math.pow(MONSTER_NORMAL_ARMOR_GROWTH, Math.max(0, level - 1))));
}

function monsterNormalEnergyShieldForLevel(level: number) {
  if (MONSTER_NORMAL_ENERGY_SHIELD_BASE <= 0) return 0;
  return Math.max(0, Math.round(MONSTER_NORMAL_ENERGY_SHIELD_BASE * Math.pow(MONSTER_NORMAL_ENERGY_SHIELD_GROWTH, Math.max(0, level - 1))));
}

function monsterAccuracyMultiplier(monsterType: MonsterType | undefined, rarity: ProceduralSpawnRarity | undefined) {
  const typeMultiplier = monsterType === "assassin" ? 1.25
    : monsterType === "charger" ? 1.1
      : monsterType === "ranged" ? 1.05
        : monsterType === "tank" ? 0.9
          : monsterType === "minion" ? 0.9
            : monsterType === "support" ? 0.95
              : 1;
  const rarityMultiplier = rarity === "supreme_boss" ? 1.45
    : rarity === "legendary_boss" ? 1.35
      : rarity === "rare" ? 1.25
        : rarity === "magic" ? 1.12
          : 1;
  return typeMultiplier * rarityMultiplier;
}

function monsterAttackStats(
  monsterType: MonsterType | undefined,
  rarity: ProceduralSpawnRarity | undefined,
  normalAccuracy: number,
  damageType: string | undefined
): Pick<Enemy,
  "accuracy"
  | "critChancePercent"
  | "critDamagePercent"
  | "doubleDamageChancePercent"
  | "ignite_chance_percent"
  | "chill_chance_percent"
  | "freeze_chance_percent"
  | "shock_chance_percent"
  | "wither_chance_percent"
  | "corrosion_ailment_chance_percent"
  | "dot_damage_add_percent"
  | "dot_duration_add_percent"
  | "reap_damage_add_percent"
  | "agony_damage_add_percent"
> {
  const typeCrit = monsterType === "assassin" ? 5
    : monsterType === "ranged" ? 2
      : monsterType === "charger" ? 1
        : 0;
  const rarityCrit = rarity === "supreme_boss" ? 10
    : rarity === "legendary_boss" ? 8
      : rarity === "rare" ? 5
        : rarity === "magic" ? 2
          : 0;
  const typeCritDamage = monsterType === "assassin" ? 35
    : monsterType === "charger" ? 20
      : monsterType === "ranged" ? 15
        : 0;
  const rarityCritDamage = rarity === "supreme_boss" ? 50
    : rarity === "legendary_boss" ? 40
      : rarity === "rare" ? 25
        : rarity === "magic" ? 10
          : 0;
  const doubleDamageChance = rarity === "supreme_boss" ? 8
    : rarity === "legendary_boss" ? 6
      : rarity === "rare" ? 3
        : monsterType === "charger" ? 2
          : monsterType === "assassin" ? 2
            : 0;
  const rarityAilmentChance = rarity === "supreme_boss" ? 12
    : rarity === "legendary_boss" ? 10
      : rarity === "rare" ? 6
        : rarity === "magic" ? 3
          : 0;
  const typeAilmentChance = monsterType === "support" ? 4
    : monsterType === "ranged" ? 3
      : monsterType === "assassin" ? 2
        : 0;
  const ailmentChance = rarityAilmentChance + typeAilmentChance;
  const isFire = damageType === "fire";
  const isCold = damageType === "cold";
  const isLightning = damageType === "lightning";
  const isCorrosion = damageType === "chaos" || damageType === "corrosion" || damageType === "erosion";
  const dotBonus = isFire || isCorrosion
    ? (rarity === "supreme_boss" ? 30
      : rarity === "legendary_boss" ? 24
        : rarity === "rare" ? 14
          : rarity === "magic" ? 8
            : 0)
    : 0;
  return {
    accuracy: Math.round(normalAccuracy * monsterAccuracyMultiplier(monsterType, rarity)),
    critChancePercent: Math.min(95, 5 + typeCrit + rarityCrit),
    critDamagePercent: 150 + typeCritDamage + rarityCritDamage,
    doubleDamageChancePercent: Math.min(100, doubleDamageChance),
    ignite_chance_percent: isFire ? ailmentChance : 0,
    chill_chance_percent: isCold ? Math.max(0, Math.round(ailmentChance * 0.8)) : 0,
    freeze_chance_percent: isCold ? Math.max(0, Math.round(ailmentChance * 0.45)) : 0,
    shock_chance_percent: isLightning ? ailmentChance : 0,
    wither_chance_percent: isCorrosion ? ailmentChance : 0,
    corrosion_ailment_chance_percent: isCorrosion ? Math.max(0, Math.round(ailmentChance * 0.8)) : 0,
    dot_damage_add_percent: dotBonus,
    dot_duration_add_percent: dotBonus > 0 ? Math.round(dotBonus * 0.5) : 0,
    reap_damage_add_percent: isCorrosion ? Math.round(dotBonus * 0.5) : 0,
    agony_damage_add_percent: isCorrosion ? Math.round(dotBonus * 0.5) : 0
  };
}

function monsterDefenseStats(
  monsterType: MonsterType | undefined,
  rarity: ProceduralSpawnRarity | undefined,
  normalArmor: number,
  normalEnergyShield: number
): Pick<Enemy,
  "armor"
  | "fire_resistance_percent"
  | "cold_resistance_percent"
  | "lightning_resistance_percent"
  | "chaos_resistance_percent"
  | "damage_mitigation_final_percent"
  | "damage_avoidance_percent"
  | "block_chance_percent"
  | "block_damage_reduction_percent"
  | "control_resistance_percent"
  | "knockback_resistance_percent"
  | "freeze_resistance_percent"
  | "stun_resistance_percent"
  | "ailment_resistance_percent"
  | "elemental_ailment_resistance_percent"
  | "currentEnergyShield"
  | "maxEnergyShield"
> {
  const typeArmorMultiplier = monsterType === "tank" ? 1.65
    : monsterType === "charger" ? 1.15
      : monsterType === "minion" ? 0.75
        : monsterType === "ranged" ? 0.8
          : monsterType === "assassin" ? 0.7
            : monsterType === "support" ? 0.9
              : 1;
  const rarityArmorMultiplier = rarity === "supreme_boss" ? 4.0
    : rarity === "legendary_boss" ? 3.2
      : rarity === "rare" ? 2.0
        : rarity === "magic" ? 1.35
          : 1;
  const rarityResistanceBonus = rarity === "supreme_boss" ? 30
    : rarity === "legendary_boss" ? 25
      : rarity === "rare" ? 16
        : rarity === "magic" ? 8
          : 0;
  const typeResistanceBonus = monsterType === "support" ? 8
    : monsterType === "tank" ? 6
      : monsterType === "ranged" ? 4
        : 0;
  const avoidance = monsterType === "assassin" ? 8
    : monsterType === "charger" ? 4
      : rarity === "supreme_boss" ? 6
        : rarity === "legendary_boss" ? 4
          : 0;
  const blockChance = monsterType === "tank" ? 14
    : monsterType === "support" ? 8
      : rarity === "supreme_boss" ? 10
        : rarity === "legendary_boss" ? 8
          : 0;
  const blockReduction = blockChance > 0 ? (monsterType === "tank" ? 45 : 35) : 0;
  const mitigation = rarity === "supreme_boss" ? 10
    : rarity === "legendary_boss" ? 8
      : rarity === "rare" ? 5
        : 0;
  const energyShieldMultiplier = monsterType === "support" ? 1.2
    : monsterType === "ranged" ? 0.8
      : 0;
  const rarityEnergyShieldBonus = rarity === "supreme_boss" ? 0.18
    : rarity === "legendary_boss" ? 0.12
      : rarity === "rare" ? 0.08
        : rarity === "magic" ? 0.04
          : 0;
  const maxEnergyShield = Math.round(normalEnergyShield * energyShieldMultiplier + normalArmor * rarityEnergyShieldBonus);
  const resistance = Math.min(75, rarityResistanceBonus + typeResistanceBonus);
  const controlResistance = rarity === "supreme_boss" ? 45
    : rarity === "legendary_boss" ? 38
      : rarity === "rare" ? 24
        : rarity === "magic" ? 12
          : 0;
  const typeControlResistance = monsterType === "tank" ? 18
    : monsterType === "charger" ? 12
      : monsterType === "support" ? 8
        : 0;
  const ailmentResistance = rarity === "supreme_boss" ? 35
    : rarity === "legendary_boss" ? 30
      : rarity === "rare" ? 18
        : rarity === "magic" ? 8
          : 0;
  return {
    armor: Math.round(normalArmor * typeArmorMultiplier * rarityArmorMultiplier),
    fire_resistance_percent: resistance,
    cold_resistance_percent: resistance,
    lightning_resistance_percent: resistance,
    chaos_resistance_percent: Math.min(75, resistance + (monsterType === "support" ? 4 : 0)),
    damage_mitigation_final_percent: mitigation,
    damage_avoidance_percent: Math.min(75, avoidance),
    block_chance_percent: Math.min(75, blockChance),
    block_damage_reduction_percent: Math.min(90, blockReduction),
    control_resistance_percent: Math.min(90, controlResistance + typeControlResistance),
    knockback_resistance_percent: Math.min(90, typeControlResistance + (monsterType === "tank" ? 22 : 0)),
    freeze_resistance_percent: Math.min(90, controlResistance + (monsterType === "tank" ? 12 : 0)),
    stun_resistance_percent: Math.min(90, controlResistance + typeControlResistance),
    ailment_resistance_percent: Math.min(90, ailmentResistance),
    elemental_ailment_resistance_percent: Math.min(90, ailmentResistance + (monsterType === "support" ? 10 : 0)),
    currentEnergyShield: maxEnergyShield,
    maxEnergyShield
  };
}

function shapeEffectsFromUnknown(value: unknown): ShapeEffectPreview[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string") return [{ id: item, text: item }];
    if (!item || typeof item !== "object") return [];
    const effect = item as { id?: unknown; text?: unknown };
    if (typeof effect.id !== "string" || effect.id.length === 0) return [];
    return [{ id: effect.id, text: typeof effect.text === "string" ? effect.text : effect.id }];
  });
}

function hasShapeEffect(effects: readonly ShapeEffectPreview[] | undefined, id: string) {
  return (effects ?? []).some((effect) => effect.id === id);
}

function proceduralSpawnLogLine(debug: ProceduralSpawnDebugSummary) {
  return `程序化生怪：地图类型 ${debug.map_type}，预算 ${debug.spent_pack_budget}/${debug.base_pack_budget}，怪物包 ${debug.generated_pack_count}，普通 ${debug.normal_monster_count}，魔法 ${debug.magic_monster_count}，稀有 ${debug.rare_monster_count}，传奇 ${debug.boss_monster_count}。`;
}

function monsterOffenseModifier(enemy: Enemy, statId: string) {
  return Number(enemy.offenseModifiers?.[statId] ?? 0);
}

function monsterOutgoingDamage(enemy: Enemy) {
  const damageType = enemy.damageType ?? "physical";
  const hitKind = enemy.hitKind ?? "attack";
  const baseDamage = Math.max(0, Number(enemy.baseDamage ?? 8));
  const damageMultiplier = Math.max(0, Number(enemy.damageMultiplier ?? 1));
  const skillMultiplier = Math.max(0, Number(enemy.monsterSkillDamageMultiplierBonus ?? 1));
  const additivePercent =
    monsterOffenseModifier(enemy, "damage_add_percent")
    + monsterOffenseModifier(enemy, "all_damage_type_add_percent")
    + monsterOffenseModifier(enemy, `${damageType}_damage_add_percent`)
    + monsterOffenseModifier(enemy, "hit_damage_add_percent")
    + monsterOffenseModifier(enemy, `${hitKind}_damage_add_percent`)
    + monsterOffenseModifier(enemy, "melee_damage_add_percent");
  const finalPercent =
    monsterOffenseModifier(enemy, "damage_final_percent")
    + monsterOffenseModifier(enemy, "hit_damage_final_percent");
  return baseDamage
    * damageMultiplier
    * skillMultiplier
    * Math.max(0, 1 + additivePercent / 100)
    * Math.max(0, 1 + finalPercent / 100);
}

function monsterAccuracy(enemy: Enemy) {
  const baseAccuracy = Math.max(1, Number(enemy.accuracy ?? MONSTER_NORMAL_ACCURACY_BASE));
  const additivePercent =
    monsterOffenseModifier(enemy, "accuracy_add_percent")
    + monsterOffenseModifier(enemy, "hit_accuracy_add_percent");
  const finalPercent = monsterOffenseModifier(enemy, "accuracy_final_percent");
  return baseAccuracy
    * Math.max(0, 1 + additivePercent / 100)
    * Math.max(0, 1 + finalPercent / 100);
}

function playerEvasionChanceAgainstMonster(enemy: Enemy, stats: AppState["player_stats"] | undefined) {
  const evasion = statNumber(stats?.evasion, 0);
  const evasionAddPercent = statNumber(stats?.evasion_add_percent, 0);
  const effectiveEvasion = Math.max(0, evasion * (1 + evasionAddPercent / 100));
  if (effectiveEvasion <= 0) return 0;
  return Math.min(0.95, effectiveEvasion / (effectiveEvasion + monsterAccuracy(enemy)));
}

function resolveMonsterHitAgainstPlayer(enemy: Enemy, player: PlayerRuntimeState, stats: AppState["player_stats"] | undefined, blocked = false, timestampMs = 0) {
  const damageType = enemy.damageType ?? "physical";
  const hitKind = enemy.hitKind ?? "attack";
  const penetrationPercent = monsterOffenseModifier(enemy, "resistance_penetration_percent");
  let incoming = monsterOutgoingDamage(enemy);
  const critChancePercent = monsterCritChancePercent(enemy);
  const isCritical = critChancePercent > 0 && stablePercent(`monster:${enemy.id}:crit:${Math.round(timestampMs)}`) < critChancePercent;
  const critDamagePercent = monsterCritDamagePercent(enemy);
  const critDamageTakenReductionPercent = clamp(statNumber(stats?.crit_damage_taken_reduction_percent, 0), 0, 100);
  if (isCritical) {
    const critExtraMultiplier = Math.max(0, critDamagePercent / 100 - 1);
    incoming *= 1 + critExtraMultiplier * (1 - critDamageTakenReductionPercent / 100);
  }
  const doubleDamageChancePercent = monsterDoubleDamageChancePercent(enemy);
  const isDoubleDamage = doubleDamageChancePercent > 0 && stablePercent(`monster:${enemy.id}:double_damage:${Math.round(timestampMs)}`) < doubleDamageChancePercent;
  if (isDoubleDamage) incoming *= 2;
  const inflictedAilments = monsterOutgoingAilments(enemy, stats, timestampMs);
  incoming *= 1 - playerEvasionChanceAgainstMonster(enemy, stats);

  if (blocked) {
    const blockReduction = clamp(statNumber(stats?.block_damage_reduction_percent, 0), 0, 100) / 100;
    incoming *= 1 - blockReduction;
  }

  incoming = Object.entries(convertIncomingPlayerDamageComponents({ [damageType]: incoming }, stats))
    .reduce((sum, [componentType, amount]) => sum + mitigateIncomingPlayerDamageComponent(Number(amount), componentType, stats, penetrationPercent), 0);

  const totalDamage = Math.max(0, incoming);
  const shieldDamage = Math.min(Math.max(0, player.currentEnergyShield), totalDamage);
  const lifeDamage = Math.max(0, totalDamage - shieldDamage);
  const nextPlayer: PlayerRuntimeState = {
    ...player,
    currentEnergyShield: clamp(player.currentEnergyShield - shieldDamage, 0, player.maxEnergyShield),
    hp: clamp(player.hp - lifeDamage, 0, player.maxHp)
  };
  return {
    damageType,
    hitKind,
    blocked,
    isCritical,
    critChancePercent,
    critDamagePercent,
    critDamageTakenReductionPercent,
    doubleDamageChancePercent,
    isDoubleDamage,
    inflictedAilments,
    totalDamage,
    shieldDamage,
    lifeDamage,
    nextPlayer
  };
}

function monsterCritChancePercent(enemy: Enemy) {
  return clamp(
    Number(enemy.critChancePercent ?? 5)
    + monsterOffenseModifier(enemy, "crit_chance_percent")
    + monsterOffenseModifier(enemy, "critical_chance_percent"),
    0,
    95
  );
}

function monsterCritDamagePercent(enemy: Enemy) {
  const explicitBase = enemy.offenseModifiers?.crit_damage_percent ?? enemy.offenseModifiers?.critical_damage_percent;
  const basePercent = Number(explicitBase ?? enemy.critDamagePercent ?? 150);
  const addPercent =
    monsterOffenseModifier(enemy, "crit_damage_add_percent")
    + monsterOffenseModifier(enemy, "critical_damage_add_percent");
  const finalPercent =
    monsterOffenseModifier(enemy, "crit_damage_final_percent")
    + monsterOffenseModifier(enemy, "critical_damage_final_percent");
  return Math.max(100, (basePercent + addPercent) * Math.max(0, 1 + finalPercent / 100));
}

function monsterDoubleDamageChancePercent(enemy: Enemy) {
  return clamp(
    Number(enemy.doubleDamageChancePercent ?? 0)
    + monsterOffenseModifier(enemy, "double_damage_chance_percent"),
    0,
    100
  );
}

function monsterOutgoingAilments(enemy: Enemy, stats: AppState["player_stats"] | undefined, timestampMs: number) {
  const entries = [
    { statusType: "ignite", chance: enemyNumericStat(enemy, "ignite_chance_percent"), durationMs: 4000, damageType: "fire" },
    { statusType: "chill", chance: enemyNumericStat(enemy, "chill_chance_percent"), durationMs: 2000, damageType: "cold" },
    { statusType: "frozen", chance: enemyNumericStat(enemy, "freeze_chance_percent"), durationMs: 1000, damageType: "cold" },
    { statusType: "shock", chance: enemyNumericStat(enemy, "shock_chance_percent"), durationMs: 2500, damageType: "lightning" },
    { statusType: "wilt", chance: enemyNumericStat(enemy, "wither_chance_percent"), durationMs: 3500, damageType: "chaos" },
    { statusType: "rot", chance: enemyNumericStat(enemy, "corrosion_ailment_chance_percent"), durationMs: 3500, damageType: "corrosion" }
  ];
  return entries.flatMap((entry) => {
    const chance = monsterOutgoingAilmentChanceAgainstPlayer(entry.statusType, entry.chance, stats);
    if (chance <= 0) return [];
    if (stablePercent(`monster:${enemy.id}:ailment:${entry.statusType}:${Math.round(timestampMs)}`) >= chance) return [];
    return [{
      statusType: entry.statusType,
      chancePercent: chance,
      durationMs: Math.round(entry.durationMs * Math.max(0, 1 + enemyNumericStat(enemy, "dot_duration_add_percent") / 100)),
      damageType: entry.damageType,
      dotDamageAddPercent: enemyNumericStat(enemy, "dot_damage_add_percent")
    }];
  });
}

function monsterOutgoingAilmentChanceAgainstPlayer(statusType: string, chancePercent: number, stats: AppState["player_stats"] | undefined) {
  let chance = Math.max(0, chancePercent);
  for (const stat of frontendPlayerStatusImmunityStats(statusType)) {
    const value = stats?.[stat]?.value;
    if (value === true || (typeof value === "number" && value > 0)) return 0;
  }
  if (frontendElementalAilmentTypes().has(statusType)) {
    const prevention = stats?.prevent_elemental_ailments?.value;
    if (prevention === true || (typeof prevention === "number" && prevention > 0)) return 0;
    chance *= Math.max(0, 1 - statNumber(stats?.avoid_elemental_ailments_percent, 0) / 100);
  }
  return clamp(chance, 0, 100);
}

function enemyStatusApplyResistancePercent(enemy: Enemy, statusType: string) {
  let resistance = enemyNumericStat(enemy, "ailment_resistance_percent");
  if (frontendElementalAilmentTypes().has(statusType)) {
    resistance += enemyNumericStat(enemy, "elemental_ailment_resistance_percent");
  }
  if (enemyControlStatusTypes().has(statusType)) {
    resistance += enemyNumericStat(enemy, "control_resistance_percent");
  }
  if (statusType === "frozen" || statusType === "freeze") resistance += enemyNumericStat(enemy, "freeze_resistance_percent");
  if (statusType === "stun" || statusType === "stunned") resistance += enemyNumericStat(enemy, "stun_resistance_percent");
  if (statusType === "knockback") resistance += enemyNumericStat(enemy, "knockback_resistance_percent");
  return clamp(resistance, 0, 100);
}

function enemyStatusDurationMultiplier(enemy: Enemy, statusType: string) {
  let resistance = enemyNumericStat(enemy, "ailment_resistance_percent");
  if (enemyControlStatusTypes().has(statusType)) {
    resistance += enemyNumericStat(enemy, "control_resistance_percent");
  }
  return Math.max(0, 1 - clamp(resistance, 0, 100) / 100);
}

function enemyControlStatusTypes() {
  return new Set(["frozen", "freeze", "stun", "stunned", "knockback", "numbed", "chill"]);
}

function playerResistancePercent(stats: AppState["player_stats"] | undefined, damageType: string, penetrationPercent: number) {
  if (damageType === "fire") return Math.min(playerResistanceCap(stats, "fire"), statNumber(stats?.fire_resistance_percent, 0) + statNumber(stats?.elemental_resistance_percent, 0)) - penetrationPercent;
  if (damageType === "cold") return Math.min(playerResistanceCap(stats, "cold"), statNumber(stats?.cold_resistance_percent, 0) + statNumber(stats?.elemental_resistance_percent, 0)) - penetrationPercent;
  if (damageType === "lightning") return Math.min(playerResistanceCap(stats, "lightning"), statNumber(stats?.lightning_resistance_percent, 0) + statNumber(stats?.elemental_resistance_percent, 0)) - penetrationPercent;
  if (damageType === "chaos") return Math.min(playerResistanceCap(stats, "chaos"), statNumber(stats?.chaos_resistance_percent, 0)) - penetrationPercent;
  return 0;
}

function playerResistanceCap(stats: AppState["player_stats"] | undefined, damageType: string) {
  if (damageType === "chaos") return clamp(statNumber(stats?.max_chaos_resistance_percent, 75), 0, 100);
  const elementalCap = statNumber(stats?.max_elemental_resistance_percent, 75) - 75;
  if (damageType === "fire") return clamp(statNumber(stats?.max_fire_resistance_percent, 75) + elementalCap, 0, 100);
  if (damageType === "cold") return clamp(statNumber(stats?.max_cold_resistance_percent, 75) + elementalCap, 0, 100);
  if (damageType === "lightning") return clamp(statNumber(stats?.max_lightning_resistance_percent, 75) + elementalCap, 0, 100);
  return 0;
}

function convertIncomingPlayerDamageComponents(components: Record<string, number>, stats: AppState["player_stats"] | undefined) {
  const result: Record<string, number> = {};
  for (const [damageType, amount] of Object.entries(components)) {
    if (amount > 0) result[damageType] = (result[damageType] ?? 0) + amount;
  }
  for (const [source, target] of [
    ["physical", "fire"],
    ["physical", "cold"],
    ["physical", "lightning"],
    ["physical", "chaos"],
    ["chaos", "fire"],
    ["chaos", "cold"],
    ["chaos", "lightning"],
  ] as const) {
    const sourceAmount = result[source] ?? 0;
    if (sourceAmount <= 0) continue;
    const percent = Math.max(0, statNumber(stats?.[`incoming_conversion_${source}_to_${target}_percent`], 0));
    if (percent <= 0) continue;
    const converted = sourceAmount * Math.min(1, percent / 100);
    result[source] = Math.max(0, sourceAmount - converted);
    result[target] = (result[target] ?? 0) + converted;
  }
  return result;
}

function mitigateIncomingPlayerDamageComponent(amount: number, damageType: string, stats: AppState["player_stats"] | undefined, penetrationPercent: number) {
  let incoming = Math.max(0, amount);
  const armorEffectiveness = damageType === "physical" ? 100 : ["fire", "cold", "lightning", "chaos"].includes(damageType) ? statNumber(stats?.non_physical_armor_effectiveness_percent, 60) : 0;
  if (armorEffectiveness > 0) {
    const armor = statNumber(stats?.armor, 0);
    const armorAddPercent = statNumber(stats?.armor_add_percent, 0);
    const effectiveArmor = Math.max(0, armor * (1 + armorAddPercent / 100)) * armorEffectiveness / 100;
    const armorReduction = incoming > 0 ? effectiveArmor / (effectiveArmor + 10 * incoming) : 0;
    incoming *= 1 - Math.min(0.9, armorReduction);
  }
  if (damageType === "physical") {
    incoming *= 1 - Math.min(0.9, Math.max(0, statNumber(stats?.physical_damage_reduction_percent, 0)) / 100);
  }
  const resistancePercent = playerResistancePercent(stats, damageType, penetrationPercent);
  incoming *= 1 - Math.min(0.9, Math.max(0, resistancePercent) / 100);
  incoming *= 1 - Math.min(0.9, Math.max(0, statNumber(stats?.damage_mitigation_final_percent, 0)) / 100);
  return Math.max(0, incoming);
}

function damageEventAmountAgainstEnemy(event: SkillEvent, enemy: Enemy) {
  if (enemy.supremeBossInvulnerableUntilMs !== undefined && event.timestamp_ms < enemy.supremeBossInvulnerableUntilMs) return 0;
  const components = event.payload?.damage_components;
  const multiplier = damageOverTimeAggravationMultiplier(event, enemy);
  const doubleDamageMultiplier = doubleDamageEventMultiplier(event);
  const resistancePenetrationPercent = Number(event.payload?.resistance_penetration_percent ?? 0);
  const armorReductionPenetrationPercent = Number(event.payload?.armor_reduction_penetration_percent ?? 0);
  if (components && typeof components === "object" && !Array.isArray(components)) {
    return Object.entries(components as Record<string, unknown>).reduce((total, [damageType, value]) => {
      return total + scaledDamageAgainstEnemy(damageType, Number(value ?? 0), enemy, resistancePenetrationPercent, armorReductionPenetrationPercent, event.event_id);
    }, 0) * multiplier * doubleDamageMultiplier;
  }
  return scaledDamageAgainstEnemy(event.damage_type, Number(event.amount ?? 0), enemy, resistancePenetrationPercent, armorReductionPenetrationPercent, event.event_id) * multiplier * doubleDamageMultiplier;
}

function doubleDamageEventMultiplier(event: SkillEvent) {
  const chance = clamp(Number(event.payload?.double_damage_chance_percent ?? 0), 0, 100);
  if (chance <= 0) return 1;
  return stablePercent(`${event.event_id}:double_damage`) < chance ? 2 : 1;
}

function damageOverTimeAggravationMultiplier(event: SkillEvent, enemy: Enemy) {
  const bonusPer10 = Math.max(0, Number(event.payload?.dot_damage_bonus_per_10_aggravation_percent ?? 0));
  if (bonusPer10 <= 0) return 1;
  const bonusPercent = (enemy.activeBuffs ?? [])
    .filter((buff) => buff.statusType === "aggravation" && buff.remaining > 0)
    .reduce((total, buff) => total + ((buff.baseValue ?? 0) / 10) * buff.valuePercent, 0);
  return 1 + bonusPercent / 100;
}

function scaledDamageAgainstEnemy(damageType: string, amount: number, enemy: Enemy, resistancePenetrationPercent = 0, armorReductionPenetrationPercent = 0, rollKey = "") {
  if (amount <= 0) return Math.max(0, amount);
  let scaledAmount = Math.max(0, amount);
  if (damageType === "true") return scaledAmount;
  if (monsterDamageAvoided(enemy, rollKey)) return 0;
  if (monsterDamageBlocked(enemy, rollKey)) {
    scaledAmount *= 1 - monsterBlockDamageReduction(enemy) / 100;
  }
  if (damageType === "physical") {
    const armor = enemyNumericStat(enemy, "armor");
    if (armor > 0) {
      const armorReduction = armor / (armor + 10 * scaledAmount);
      scaledAmount *= 1 - Math.min(0.9, Math.max(0, armorReduction - armorReductionPenetrationPercent / 100));
    }
  }
  const resistancePercent = enemyResistancePercent(enemy, damageType) - resistancePenetrationPercent;
  if (resistancePercent > 0) {
    scaledAmount *= 1 - Math.min(0.9, resistancePercent / 100);
  }
  scaledAmount *= 1 - Math.min(0.9, Math.max(0, enemyNumericStat(enemy, "damage_mitigation_final_percent")) / 100);
  const takenIncrease = (enemy.activeBuffs ?? [])
    .filter((buff) => (
      buff.polarity === "negative"
      && buff.remaining > 0
      && statusIncreasesDamageTakenFrom(buff.statusType, damageType)
    ))
    .reduce((total, buff) => total + buff.valuePercent, 0);
  return scaledAmount * (1 + takenIncrease / 100);
}

function monsterDamageAvoided(enemy: Enemy, rollKey: string) {
  const chance = Math.min(75, Math.max(0, enemyNumericStat(enemy, "damage_avoidance_percent")));
  if (chance <= 0) return false;
  return stablePercent(`${rollKey || `enemy:${enemy.id}`}:monster_damage_avoid`) < chance;
}

function monsterDamageBlocked(enemy: Enemy, rollKey: string) {
  const chance = Math.min(75, Math.max(0, enemyNumericStat(enemy, "block_chance_percent")));
  if (chance <= 0) return false;
  return stablePercent(`${rollKey || `enemy:${enemy.id}`}:monster_block`) < chance;
}

function monsterBlockDamageReduction(enemy: Enemy) {
  return Math.min(90, Math.max(0, enemyNumericStat(enemy, "block_damage_reduction_percent")));
}

function applyDamageToEnemyResources(enemy: Enemy, damage: number): Pick<Enemy, "hp" | "currentEnergyShield"> {
  const incoming = Math.max(0, damage);
  if (incoming <= 0) return { hp: enemy.hp, currentEnergyShield: enemy.currentEnergyShield };
  const currentShield = Math.max(0, Number(enemy.currentEnergyShield ?? 0));
  if (currentShield <= 0) return { hp: enemy.hp - incoming, currentEnergyShield: enemy.currentEnergyShield };
  const shieldDamage = Math.min(currentShield, incoming);
  const lifeDamage = Math.max(0, incoming - shieldDamage);
  return {
    hp: enemy.hp - lifeDamage,
    currentEnergyShield: currentShield - shieldDamage
  };
}

function enemyResistancePercent(enemy: Enemy, damageType: string) {
  if (damageType === "fire") return enemyNumericStat(enemy, "fire_resistance_percent") + enemyNumericStat(enemy, "elemental_resistance_percent");
  if (damageType === "cold") return enemyNumericStat(enemy, "cold_resistance_percent") + enemyNumericStat(enemy, "elemental_resistance_percent");
  if (damageType === "lightning") return enemyNumericStat(enemy, "lightning_resistance_percent") + enemyNumericStat(enemy, "elemental_resistance_percent");
  if (damageType === "chaos" || damageType === "corrosion" || damageType === "erosion") {
    return enemyNumericStat(enemy, "chaos_resistance_percent")
      + enemyNumericStat(enemy, "corrosion_resistance_percent")
      + enemyNumericStat(enemy, "erosion_resistance_percent");
  }
  return 0;
}

function enemyNumericStat(enemy: Enemy, stat: string) {
  const value = (enemy as Enemy & Record<string, unknown>)[stat];
  return typeof value === "number" ? value : 0;
}

function statusIncreasesDamageTakenFrom(statusType: string, damageType: string) {
  if (statusType === "frostbite") return damageType === "cold";
  if (statusType === "numbed") return damageType === "lightning";
  if (statusType === "damage_taken_increase") return true;
  return false;
}

function nearestGuideTarget(
  source: { x: number; y: number },
  enemies: Enemy[],
  searchRange: number,
  maxDistance: number
) {
  const target = candidateEnemiesNear(enemies, source, Math.max(searchRange, maxDistance))
    .filter((enemy) => enemy.hp > 0 && distance(enemy, source) <= searchRange)
    .sort((a, b) => distance(a, source) - distance(b, source))[0];
  if (target) return { x: target.x, y: target.y };
  return { x: source.x + maxDistance, y: source.y };
}

function createFireBoltProjectileLaunch(
  skill: SkillPreview,
  player: { x: number; y: number },
  target: { x: number; y: number },
  projectileIndex: number
) {
  const runtimeParams = skill.runtime_params ?? {};
  const spawnWorldPosition = projectileSpawnWorldPosition(player, runtimeParams);
  const targetWorldPosition = { x: target.x, y: target.y };
  const directionWorld = guideDirection(spawnWorldPosition, targetWorldPosition);
  const projectileSpeed = Math.max(1, Number(runtimeParams.projectile_speed ?? 720));
  return {
    spawnWorldPosition,
    targetWorldPosition,
    directionWorld,
    velocityWorld: {
      x: directionWorld.x * projectileSpeed,
      y: directionWorld.y * projectileSpeed
    },
    distance: distance(spawnWorldPosition, targetWorldPosition),
    projectileId: `${skill.active_gem_instance_id}.legacy.projectile.${projectileIndex + 1}`,
    skillId: skill.skill_package_id ?? skill.skill_template_id
  };
}

function hasLiveEnemyInCastRange(enemies: Enemy[], skill: SkillPreview, source: { x: number; y: number }) {
  const runtimeParams = skill.runtime_params ?? {};
  if (skill.behavior_template === "player_nova") {
    const radius = Math.max(1, Number(runtimeParams.radius ?? skill.hit?.hit_radius ?? skill.cast?.search_range ?? 360));
    return candidateEnemiesNear(enemies, source, radius)
      .some((enemy) => enemy.hp > 0 && distance(enemy, source) <= radius);
  }
  const range = Math.max(
    1,
    Number(skill.cast?.search_range ?? runtimeParams.max_distance ?? runtimeParams.radius ?? skill.hit?.hit_radius ?? 360)
  );
  return candidateEnemiesNear(enemies, source, range)
    .some((enemy) => enemy.hp > 0 && distance(enemy, source) <= range);
}

function skillHasOrbitModuleChain(skill: SkillPreview) {
  const modules = Array.isArray(skill.runtime_params?.modules) ? skill.runtime_params.modules as { type?: unknown }[] : [];
  return modules.some((module) => module.type === "orbit_emitter")
    && modules.some((module) => module.type === "damage_zone");
}

function skillHasProjectileDamageZoneModules(skill: SkillPreview) {
  const modules = Array.isArray(skill.runtime_params?.modules) ? skill.runtime_params.modules as { type?: unknown }[] : [];
  return modules.some((module) => module.type === "projectile")
    && modules.some((module) => module.type === "damage_zone");
}

function nearestEnemy(enemies: Enemy[], source: { x: number; y: number }) {
  return candidateEnemiesNear(enemies, source, ENEMY_AWARE_RANGE)
    .filter((enemy) => enemy.hp > 0)
    .sort((a, b) => distance(a, source) - distance(b, source))[0];
}

function angleBetweenDegrees(left: { x: number; y: number }, right: { x: number; y: number }) {
  const a = normalizedWorldDirection(left);
  const b = normalizedWorldDirection(right);
  const dot = clamp(a.x * b.x + a.y * b.y, -1, 1);
  return Math.acos(dot) * 180 / Math.PI;
}

function projectileSpawnWorldPosition(player: { x: number; y: number }, runtimeParams: Record<string, unknown>) {
  const offset = runtimeParams.spawn_offset as { x?: unknown; y?: unknown } | undefined;
  return {
    x: player.x + Number(offset?.x ?? 0),
    y: player.y + Number(offset?.y ?? 0)
  };
}

function normalizedWorldDirection(direction: { x: number; y: number }) {
  const length = Math.hypot(direction.x, direction.y) || 1;
  return { x: direction.x / length, y: direction.y / length };
}

function worldDirectionToBattleScreenAngle(direction: { x: number; y: number }, origin: { x: number; y: number }) {
  const start = projectBattleWorldToScreen(origin.x, origin.y);
  const end = projectBattleWorldToScreen(origin.x + direction.x, origin.y + direction.y);
  return Math.atan2(end.y - start.y, end.x - start.x);
}

function projectileSpreadAngleDeg(
  behaviorTemplate: string | undefined,
  runtimeParams: Record<string, unknown> | SkillPackageData["behavior"]["params"]
) {
  return Math.max(0, Number(runtimeParams.spread_angle_deg ?? 0));
}

function projectileAngleStepDeg(
  behaviorTemplate: string | undefined,
  runtimeParams: Record<string, unknown> | SkillPackageData["behavior"]["params"]
) {
  return isProjectileSkillTemplate(behaviorTemplate) ? Math.max(0, Number(runtimeParams.angle_step ?? 0)) : 0;
}

function defaultFrontendExtraProjectileSpreadAngle(projectileCount: number) {
  return Math.min(60, 12 * Math.max(0, Math.round(projectileCount) - 1));
}

function projectileSpreadDirections(
  direction: { x: number; y: number },
  projectileCount: number,
  spreadAngleDeg: number,
  angleStepDeg = 0
) {
  const count = Math.max(1, Math.min(12, Math.round(projectileCount)));
  if (count === 1 || spreadAngleDeg <= 0) return Array.from({ length: count }, () => direction);
  const center = (count - 1) / 2;
  const defaultStep = spreadAngleDeg / Math.max(1, count - 1);
  const step = angleStepDeg > 0 ? Math.min(angleStepDeg, defaultStep) : defaultStep;
  return Array.from({ length: count }, (_, index) => {
    const angleDeg = (index - center) * step;
    return rotateDirection(direction, angleDeg);
  });
}

function rotateDirection(direction: { x: number; y: number }, angleDeg: number) {
  const radians = angleDeg * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: direction.x * cos - direction.y * sin,
    y: direction.x * sin + direction.y * cos
  };
}

function randomAngleOffset(maxDegrees: number) {
  if (maxDegrees <= 0) return 0;
  return (Math.random() * 2 - 1) * maxDegrees;
}

function optimisticUnmountBoardItem(state: AppState, instanceId: string) {
  return {
    ...state,
    inventory: state.inventory.map((item) => (
      item.instance_id === instanceId ? { ...item, board_position: null } : item
    )),
    board: {
      ...state.board,
      cells: state.board.cells.map((row) =>
        row.map((cell) => (
          cell.gem?.instance_id === instanceId ? { ...cell, gem: null } : cell
        ))
      ),
    },
  };
}

function optimisticPlaceItemOnBoard(state: AppState, instanceId: string, row: number, column: number, displacedInstanceId?: string) {
  const dragged = state.inventory.find((item) => item.instance_id === instanceId);
  if (!dragged) return state;
  const placedGem = { ...dragged, board_position: { row, column } };
  return {
    ...state,
    inventory: state.inventory.map((item) => {
      if (item.instance_id === instanceId) return placedGem;
      if (item.instance_id === displacedInstanceId) return { ...item, board_position: null };
      return item;
    }),
    board: {
      ...state.board,
      cells: state.board.cells.map((boardRow) =>
        boardRow.map((cell) => {
          if (cell.row === row && cell.column === column) return { ...cell, gem: placedGem };
          if (cell.gem?.instance_id === instanceId || cell.gem?.instance_id === displacedInstanceId) return { ...cell, gem: null };
          return cell;
        })
      ),
    },
  };
}

function canPlaceGemOnBoard(state: AppState, gem: Gem, row: number, column: number, ignoredInstanceIds = new Set<string>()) {
  const target = state.board.cells[row]?.[column];
  if (!target) return false;
  if (target.gem && target.gem.instance_id !== gem.instance_id && !ignoredInstanceIds.has(target.gem.instance_id)) return false;

  const sudokuDigit = sudokuDigitKey(gem);
  return !state.board.cells.some((boardRow) =>
    boardRow.some((cell) => {
      const otherGem = cell.gem;
      if (!otherGem || otherGem.instance_id === gem.instance_id || ignoredInstanceIds.has(otherGem.instance_id)) return false;
      if (sudokuDigitKey(otherGem) !== sudokuDigit) return false;
      return cell.row === row || cell.column === column || cell.box === target.box;
    })
  );
}

function inventoryItemById(state: AppState, instanceId: string | null | undefined) {
  if (!instanceId) return null;
  return state.inventory.find((item) => item.instance_id === instanceId) ?? null;
}

function isAllowedRoute(source: Gem, target: Gem) {
  if (isSupportGem(source)) return isActiveGem(target) || isPassiveGem(target);
  if (isPassiveGem(source)) return isActiveGem(target);
  return false;
}

function cellKey(row: number, column: number) {
  return `${row}-${column}`;
}

function sudokuDigitKey(gem: Gem) {
  return gem.sudoku_digit ?? gem.gem_type.number ?? (Number(gem.gem_type.id?.split("_").pop()) || 0);
}

function createBattleCamera(playerX: number, playerY: number, zoom = BATTLE_CAMERA_ZOOM): Camera2D {
  const playerScreen = projectBattleWorldToScreen(playerX, playerY);
  return {
    screenX: playerScreen.x,
    screenY: playerScreen.y + BATTLE_CAMERA_FOLLOW_OFFSET_Y,
    zoom
  };
}

function projectBattleWorldToScreen(worldX: number, worldY: number) {
  return { x: worldX, y: worldY };
}

function battleTerrainTransform(camera: Camera2D) {
  return `translate(${BATTLE_CAMERA_ANCHOR_X}, ${BATTLE_CAMERA_ANCHOR_Y}) scale(${camera.zoom}) translate(${-camera.screenX}px, ${-camera.screenY}px)`;
}

function createBattleRenderEntities(player: { x: number; y: number; hp: number; maxHp: number }, enemies: Enemy[], renderScale = UNIT_RENDER_SCALE): BattleRenderEntity[] {
  return [
    ...enemies.map((enemy) => ({
      kind: "enemy" as const,
      ...enemy,
      playerDistance: distance(enemy, player),
      renderScale
    })),
    { kind: "player" as const, id: "player" as const, x: player.x, y: player.y, hp: player.hp, maxHp: player.maxHp, renderScale, guardActive: false }
  ].sort(compareBattleRenderEntities);
}

function createBattleRenderItems(
  player: { x: number; y: number; hp: number; maxHp: number },
  enemies: Enemy[],
  bolts: FireBolt[],
  hitVfxs: HitVfx[],
  renderScale = UNIT_RENDER_SCALE,
  guardActive = false
): BattleRenderItem[] {
  return [
    ...createBattleRenderEntities(player, enemies, renderScale).map((entity) => entity.kind === "player" ? { ...entity, guardActive } : entity),
    ...bolts
      .filter((bolt) => !usesCanvasProjectileVfx(bolt))
      .map((bolt) => {
        const point = fireBoltWorldPoint(bolt);
        return { kind: "fire-bolt" as const, id: bolt.id, x: point.x, y: point.y, bolt };
      }),
    ...hitVfxs
      .filter((vfx) => !usesCanvasHitVfx(vfx))
      .map((vfx) => ({ kind: "hit-vfx" as const, id: vfx.id, x: vfx.x, y: vfx.y, vfx }))
  ].sort(compareBattleRenderItems);
}

function compareBattleRenderItems(left: BattleRenderItem, right: BattleRenderItem) {
  if (isBattleRenderEntity(left) && isBattleRenderEntity(right)) return compareBattleRenderEntities(left, right);
  return dimetricDepth(left.x, left.y) - dimetricDepth(right.x, right.y);
}

function compareBattleRenderEntities(left: BattleRenderEntity, right: BattleRenderEntity) {
  const depth = compareDimetricDepth(left, right);
  if (left.kind === "enemy" && right.kind === "enemy") {
    const rarity = enemyBattleRenderRarityRank(left) - enemyBattleRenderRarityRank(right);
    if (rarity !== 0) return rarity;
    return depth || left.id - right.id;
  }
  if (Math.abs(depth) > 28) return depth;
  return battleRenderEntityRarityRank(left) - battleRenderEntityRarityRank(right);
}

function isBattleRenderEntity(item: BattleRenderItem): item is BattleRenderEntity {
  return item.kind === "enemy" || item.kind === "player";
}

function battleRenderEntityRarityRank(entity: BattleRenderEntity) {
  if (entity.kind === "player") return 2;
  return enemyBattleRenderRarityRank(entity);
}

function enemyBattleRenderRarityRank(enemy: Extract<BattleRenderEntity, { kind: "enemy" }>) {
  const visual = resolveMonsterGeometryVisual(enemy.monsterId);
  const tier = enemy.spawnRarity ?? visual?.tier ?? (enemy.monsterId === "enemy_brute" ? "rare" : "normal");
  if (tier === "legendary_boss" || tier === "supreme_boss") return 4;
  if (tier === "rare") return 3;
  if (tier === "magic") return 1;
  return 0;
}

function createBattleAnimationContexts(
  playerVisual: UnitVisualRuntime,
  enemyVisuals: Map<number, EnemyVisualRuntime>,
  enemies: Enemy[],
  player: { x: number; y: number },
  elapsedMs: number,
  playerMoveSpeed: number
): BattleAnimationContexts {
  const currentMoveSpeed = playerMoveSpeed;
  const playerMoving = Math.hypot(playerVisual.movementVector.x, playerVisual.movementVector.y) > 0.001;
  const enemyContexts = new Map<number, UnitAnimationContext>();
  enemies.forEach((enemy) => {
    const unitId = fallbackUnitVisualForMonster(enemy.monsterId ?? selectEnemyUnitType(enemy.id));
    const visual = enemyVisuals.get(enemy.id);
    const attackActive = visual?.attackUntilMs !== undefined && elapsedMs < visual.attackUntilMs;
    const movementVector = visual?.movementVector ?? { x: player.x - enemy.x, y: player.y - enemy.y };
    const moving = Math.hypot(movementVector.x, movementVector.y) > 0.001;
    const enemyMoveSpeed = moving ? 58 : 0;
    enemyContexts.set(enemy.id, {
      unitId,
      requestedState: attackActive ? "attack" : unitMovementState(moving, 58, enemyMoveSpeed),
      movementVector,
      fallbackDirection: visual?.direction ?? "down",
      elapsedMs,
      baseMoveSpeed: 58,
      currentMoveSpeed: enemyMoveSpeed,
      attackStartedAtMs: visual?.attackStartedAtMs,
      attackUntilMs: visual?.attackUntilMs
    });
  });

  return {
    player: {
      unitId: "player_adventurer",
      requestedState: unitMovementState(playerMoving, PLAYER_SPEED, currentMoveSpeed),
      movementVector: playerVisual.movementVector,
      fallbackDirection: playerVisual.direction,
      elapsedMs,
      baseMoveSpeed: PLAYER_SPEED,
      currentMoveSpeed
    },
    enemies: enemyContexts
  };
}

function renderBattleRenderItem(item: BattleRenderItem, depthIndex: number, animationContexts: BattleAnimationContexts) {
  if (item.kind === "fire-bolt") {
    return (
      <FireBoltView
        key={`fire-bolt-${item.id}`}
        bolt={item.bolt}
        depthIndex={depthIndex}
        projectBattleWorldToScreen={projectBattleWorldToScreen}
        normalizedWorldDirection={normalizedWorldDirection}
        worldDirectionToBattleScreenAngle={worldDirectionToBattleScreenAngle}
        zIndexBase={BATTLE_ENTITY_Z_INDEX_BASE}
      />
    );
  }
  if (item.kind === "hit-vfx") {
    return (
      <HitVfxView
        key={`hit-vfx-${item.id}`}
        vfx={item.vfx}
        depthIndex={depthIndex}
        projectBattleWorldToScreen={projectBattleWorldToScreen}
        hasShapeEffect={hasShapeEffect}
        zIndexBase={BATTLE_ENTITY_Z_INDEX_BASE}
      />
    );
  }
  return renderBattleEntity(item, depthIndex, animationContexts);
}

function shouldRenderLegacyBattleItem(item: BattleRenderItem) {
  if (!CANVAS_GEOMETRY_BATTLE_OBJECTS) return true;
  return item.kind === "hit-vfx" && !CANVAS_GEOMETRY_SKILL_EFFECTS;
}

function renderBattleEntity(entity: BattleRenderEntity, depthIndex: number, animationContexts: BattleAnimationContexts) {
  if (entity.kind === "player") {
    const animationFrame = resolveUnitAnimation(animationContexts.player);
    return (
      <div
        key="player"
        className={`player unit-visual unit-visual-player${entity.guardActive ? " unit-visual-player-guarded" : ""}`}
        style={battleUnitStyle(entity, animationFrame, depthIndex, entity.renderScale)}
        data-animation-state={animationFrame.animation.state}
        data-animation-direction={animationFrame.animation.direction}
        data-animation-playback-rate={animationFrame.playbackRate}
        aria-hidden="true"
      >
        <UnitAnimationSprite frame={animationFrame} />
      </div>
    );
  }

  const context = animationContexts.enemies.get(entity.id) ?? {
    unitId: fallbackUnitVisualForMonster(entity.monsterId ?? selectEnemyUnitType(entity.id)),
    requestedState: "idle" as const,
    movementVector: { x: 0, y: 0 },
    fallbackDirection: "down" as const,
    elapsedMs: 0,
    baseMoveSpeed: 58,
    currentMoveSpeed: 0
  };
  const animationFrame = resolveUnitAnimation(context);
  const healthVisible = entity.lastDamagedAt !== undefined
    && animationContexts.player.elapsedMs / 1000 - entity.lastDamagedAt <= ENEMY_HEALTH_VISIBLE_SECONDS;
  const hitFlash = enemyHitFlashAmount(entity.lastDamagedAt, animationContexts.player.elapsedMs / 1000);
  return (
    <div
      key={`enemy-${entity.id}`}
      className={`enemy unit-visual unit-visual-${animationFrame.animation.unitId}`}
      style={battleUnitStyle(entity, animationFrame, depthIndex, entity.renderScale)}
      data-enemy-id={entity.id}
      data-animation-state={animationFrame.animation.state}
      data-animation-direction={animationFrame.animation.direction}
      data-animation-playback-rate={animationFrame.playbackRate}
    >
      {healthVisible && (
        <div className="enemy-health" aria-hidden="true">
          <span style={{ width: `${Math.max(0, entity.hp / entity.maxHp) * 100}%` }} />
        </div>
      )}
      <UnitAnimationSprite frame={animationFrame} hitFlash={hitFlash} />
    </div>
  );
}

function enemyHitFlashAmount(lastDamagedAt: number | undefined, elapsedSeconds: number) {
  if (lastDamagedAt === undefined) return 0;
  const age = elapsedSeconds - lastDamagedAt;
  if (age < 0 || age > ENEMY_DAMAGE_FLASH_SECONDS) return 0;
  return 1 - clamp(age / ENEMY_DAMAGE_FLASH_SECONDS, 0, 1);
}

function battleUnitStyle(entity: { x: number; y: number }, frame: UnitAnimationFrame, depthIndex: number, renderScale = UNIT_RENDER_SCALE): CSSProperties {
  const visualPoint = projectBattleWorldToScreen(entity.x, entity.y);
  const asset = frame.animation;
  return {
    left: visualPoint.x,
    top: visualPoint.y,
    width: asset.frameWidth,
    height: asset.frameHeight,
    zIndex: BATTLE_ENTITY_Z_INDEX_BASE + depthIndex,
    "--unit-anchor-x": asset.anchorX,
    "--unit-anchor-y": asset.anchorY,
    "--unit-render-scale": renderScale * asset.scale
  } as CSSProperties;
}

function buildGemTooltipViewModel(gem: Gem) {
  return buildGemTooltipViewModelWithNormalizers(gem, normalizeSupportTooltipView, normalizeActiveTooltipView);
}

function gemWithFrontendSkillPreviewTooltip(gem: Gem, skill?: SkillPreview): Gem {
  const view = gem.tooltip_view;
  if (!skill || !view || view.variant !== "active") return gem;
  const componentLines = [
    ...frontendDamageComponentTooltipLines(skill.final_damage_components, formatPreviewNumber),
    ...frontendEquipmentGrantedTooltipLines(skill.runtime_params?.frontend_equipment_granted_effects, formatPreviewNumber)
  ];
  const bonusLines = frontendSupportModifierTooltipLines(skill, formatModifierValue);
  const levelText = frontendSkillPreviewEffectiveLevelText(skill, frontendRecord);
  const projectileLine = frontendProjectileCountTooltipLine(gem, skill, statValue, formatPreviewNumber);
  const channelLines = frontendChannelStackTooltipLines(gem, skill, formatPreviewNumber);
  const guardLines = frontendGuardTooltipLines(skill, formatPreviewNumber);
  if (
    componentLines.length === 0
    && bonusLines.length === 0
    && !levelText
    && !projectileLine
    && channelLines.length === 0
    && guardLines.length === 0
  ) return gem;
  return {
    ...gem,
    tooltip_view: {
      ...view,
      sections: {
        ...view.sections,
        stats: {
          ...view.sections.stats,
          lines: mergeFrontendSkillPreviewTooltipLines(view.sections.stats.lines, skill, [
            ...(projectileLine ? [projectileLine] : []),
            ...channelLines,
            ...guardLines,
            ...componentLines
          ], formatPreviewNumber, levelText)
        },
        bonuses: {
          title_text: view.sections.bonuses?.title_text ?? "当前加成",
          lines: mergeFrontendSkillPreviewBonusLines(view.sections.bonuses?.lines ?? [], bonusLines)
        },
      }
    }
  };
}

const normalizeActiveTooltipView = createNormalizeActiveTooltipView({
  frontendSkillPreviewsBySkillTag,
  formatPreviewNumber,
  isPassiveGem,
  frontendRecord,
  frontendGemBaseModifiers,
  frontendDamageMapTotal,
});

const FRONTEND_BASE_KNOCKBACK_DISTANCE = 250;
const FRONTEND_KNOCKBACK_LOCK_MS = 260;

function normalizeSupportTooltipView(gem: Gem, view: TooltipView): TooltipView {
  const conduitSections = frontendConduitTooltipSections(gem);
  return {
    ...view,
    tags: view.tags.map((tag) => frontendDisplayGemKindTag(gem, tag)),
    summary_lines: replaceGemTagRichLines(gem, view.summary_lines),
    sections: {
      ...view.sections,
      ...conduitSections,
      conditions: normalizeSupportConditionRichLineSection(gem, view.sections.conditions, frontendRecord),
    },
  };
}

function frontendConduitTooltipSections(gem: Gem): Partial<TooltipView["sections"]> {
  const relation = frontendConduitRelation(gem);
  if (!relation) return {};
  const skillLevelAdd = frontendSkillLevelTableValueById(
    frontendSupportLevelTableId(gem),
    frontendSupportEffectiveLevel(gem, 0),
    "skill_level_add"
  );
  const relationText = frontendConduitRelationDescriptionText(relation);
  return {
    description: {
      title_text: "",
      lines: [],
      rich_lines: [[{ text: `使${relationText}连接的技能等级提高。`, tone: "body" }]],
    } as TooltipView["sections"]["description"] & { rich_lines: TooltipRichLine[] },
    base_bonuses: Number.isFinite(skillLevelAdd) && Number(skillLevelAdd) !== 0 ? {
      rich_lines: [[{ text: `技能等级 ${formatModifierValue("active_gem_level_add", Number(skillLevelAdd))}`, tone: "bonus-positive" }]],
    } : undefined,
  };
}

function frontendConduitRelationDescriptionText(relation: string) {
  if (relation === "same_row") return "同行";
  if (relation === "same_column") return "同列";
  if (relation === "same_box") return "同宫";
  return "连接";
}

function frontendSupportTargetTagTexts(gem: Gem) {
  return frontendTargetTagTexts(gem, frontendRecord);
}

function usesSkillEventPipeline(skill: SkillPreview) {
  return Boolean(skill.skill_package_id && (isProjectileSkillTemplate(skill.behavior_template) || skill.behavior_template === "module_chain" || skill.behavior_template === "player_nova" || skill.behavior_template === "melee_arc" || skill.behavior_template === "damage_zone" || skill.behavior_template === "chain"));
}

function isThundercloudSkill(skill: SkillPreview) {
  const packageId = cssToken(skill.skill_package_id);
  const templateId = cssToken(skill.skill_template_id);
  const visualEffect = cssToken(skill.visual_effect);
  const presentationVfx = cssToken(typeof skill.presentation_keys?.vfx === "string" ? skill.presentation_keys.vfx : undefined);
  return packageId.includes("thundercloud")
    || templateId.includes("thundercloud")
    || visualEffect.includes("thundercloud")
    || presentationVfx.includes("thundercloud");
}

function uniqueDamageZonesByZoneId(zones: DamageZoneVfx[]) {
  const keyed = new Map<string, DamageZoneVfx>();
  const unkeyed: DamageZoneVfx[] = [];
  for (const zone of zones) {
    if (!zone.zoneId) {
      unkeyed.push(zone);
      continue;
    }
    keyed.set(zone.zoneId, zone);
  }
  return [...unkeyed, ...keyed.values()];
}

function isProjectileSkillTemplate(behaviorTemplate: string | undefined) {
  return behaviorTemplate === "projectile";
}

function pulse(value: number) {
  return (Math.sin(value * Math.PI * 2) + 1) / 2;
}

function skillPreviewVfxScale(skill: SkillPreview) {
  return normalizedVfxScale(skill.presentation_keys?.vfx_scale);
}

function packageVfxScale(packageData: SkillPackageData) {
  return normalizedVfxScale(packageData.presentation.vfx_scale);
}

function damageTypeText(damageType: string) {
  const text: Record<string, string> = {
    fire: "火焰",
    cold: "冰霜",
    lightning: "闪电",
    physical: "物理"
  };
  return text[damageType] ?? "技能";
}

function forcedElementDamageType(skill: SkillPreview, timestampMs: number) {
  const values = skill.runtime_params?.forced_element_types;
  if (!Array.isArray(values)) return skill.damage_type;
  const elements = values
    .map((value) => String(value))
    .filter((value) => value === "fire" || value === "cold" || value === "lightning");
  if (elements.length === 0) return skill.damage_type;
  return elements[stableStringHash(`${skill.active_gem_instance_id}:${timestampMs}`) % elements.length];
}

function stableStringHash(seed: string) {
  let value = 0;
  for (const char of seed) {
    value = (Math.imul(value, 131) + char.charCodeAt(0)) >>> 0;
  }
  return value;
}

function stablePercent(seed: string) {
  return stableStringHash(seed) % 10000 / 100;
}

function hitVfxTargetId(event: Pick<SkillEvent, "target_entity" | "payload">) {
  const payloadTarget = event.payload?.target_entity ?? event.payload?.to_target;
  const value = Number(event.target_entity || payloadTarget);
  return Number.isFinite(value) ? value : undefined;
}

function targetedEnemyForEvent(
  event: Pick<SkillEvent, "target_entity" | "payload">,
  enemyById: Map<number, Pick<Enemy, "x" | "y">>
) {
  const targetId = hitVfxTargetId(event);
  return targetId === undefined ? undefined : enemyById.get(targetId);
}

function projectileIdFromEvent(event: Pick<SkillEvent, "payload">) {
  return typeof event.payload?.projectile_id === "string" ? event.payload.projectile_id : "";
}

function shouldSuppressProjectileFollowup(
  event: Pick<SkillEvent, "target_entity" | "payload">,
  projectedEnemyHp: Map<number, number>,
  liveProjectileHits: Set<string>,
  deadProjectileHits: Set<string>,
  acceptedProjectileDamageTicks: Set<string>
) {
  const projectileId = projectileIdFromEvent(event);
  if (!projectileId) return false;
  if (isProjectileTickFollowup(event)) return !acceptedProjectileDamageTicks.has(projectileFollowupKey(event));
  const hitTargetKey = projectileTargetFollowupKey(event);
  if (hitTargetKey && deadProjectileHits.has(hitTargetKey)) return true;
  if (hitTargetKey && liveProjectileHits.has(hitTargetKey)) return false;
  const targetId = Number(event.target_entity);
  if (Number.isFinite(targetId) && (projectedEnemyHp.get(targetId) ?? 0) <= 0) return true;
  return false;
}

function isProjectileTickFollowup(event: Pick<SkillEvent, "payload">) {
  return event.payload?.tick_time_ms !== undefined || event.payload?.tick_interval_ms !== undefined;
}

  function projectileFollowupKey(event: Pick<SkillEvent, "target_entity" | "payload">) {
    return [
      projectileIdFromEvent(event),
      String(event.target_entity ?? event.payload?.target_entity ?? ""),
      String(event.payload?.tick_time_ms ?? event.payload?.tick_interval_ms ?? "")
    ].join("|");
  }

  function projectileTargetFollowupKey(event: Pick<SkillEvent, "target_entity" | "payload">) {
    const projectileId = projectileIdFromEvent(event);
    const targetId = Number(event.target_entity);
    if (!projectileId || !Number.isFinite(targetId)) return "";
    return `${projectileId}|${targetId}`;
  }

  function damageDisplayKey(event: Pick<SkillEvent, "target_entity" | "skill_instance_id" | "payload">) {
    return [
      event.skill_instance_id,
      String(event.target_entity ?? event.payload?.target_entity ?? ""),
      String(event.payload?.zone_id ?? event.payload?.area_id ?? event.payload?.projectile_id ?? ""),
      String(event.payload?.tick_index ?? ""),
      String(event.payload?.tick_time_ms ?? event.payload?.hit_marker_event_id ?? event.payload?.marker_id ?? "")
    ].join("|");
  }

function anchorHitVfxsToTargets(hitVfxs: HitVfx[], enemies: Enemy[]) {
  if (hitVfxs.length === 0) return hitVfxs;
  const enemyById = new Map(enemies.map((enemy) => [enemy.id, enemy]));
  return hitVfxs.map((vfx) => {
    if (vfx.targetId === undefined) return vfx;
    const target = enemyById.get(vfx.targetId);
    if (!target) return vfx;
    return { ...vfx, x: target.x, y: target.y };
  });
}

function anchorProjectilesToTargets(bolts: FireBolt[], enemies: Enemy[]) {
  if (bolts.length === 0) return bolts;
  const enemyById = new Map(enemies.map((enemy) => [enemy.id, enemy]));
  return bolts.map((bolt) => {
    const shouldAnchor = bolt.projectileVisualMode === "falling_arrow" || usesCanvasProjectileVfx(bolt);
    if (!shouldAnchor || bolt.targetId === undefined) return bolt;
    const target = enemyById.get(bolt.targetId);
    if (!target || target.hp <= 0) return bolt;
    return { ...bolt, targetX: target.x, targetY: target.y };
  });
}

function finishCompletedProjectileBody<TBolt extends Pick<
  FireBolt,
  "projectileId" | "fadeDuration" | "ttl" | "x" | "y" | "targetX" | "targetY" | "velocityX" | "velocityY"
>>(
  bolt: TBolt,
  completedHits: Map<string, { x: number; y: number }>
): TBolt {
  const hit = bolt.projectileId ? completedHits.get(bolt.projectileId) : undefined;
  if (!hit) return bolt;
  const fadeDuration = Math.max(0, bolt.fadeDuration ?? PROJECTILE_BODY_EXIT_FADE_DURATION);
  return {
    ...bolt,
    x: hit.x,
    y: hit.y,
    targetX: hit.x,
    targetY: hit.y,
    velocityX: 0,
    velocityY: 0,
    ttl: Math.min(bolt.ttl, fadeDuration)
  };
}


function createEnemy(
  id: number,
  playerX: number,
  playerY: number,
  map: BakedBattleMapData | null = null,
  spawnKind: "normal" | "elite" = "normal",
  palette?: EncounterMonsterPalette
): Enemy {
  const baseDamage = spawnKind === "elite" ? 14 : 8;
  const offense = defaultMonsterOffense(baseDamage);
  const maskedSpawn = randomEnemySpawnPoint(map, spawnKind);
  if (maskedSpawn) {
    return {
      id,
      x: maskedSpawn.x,
      y: maskedSpawn.y,
      hp: 32,
      maxHp: 32,
      monsterId: spawnKind === "elite" ? "enemy_brute" : "enemy_imp",
      ...encounterMonsterPaletteFields(palette),
      ...offense,
      aggroLocked: true,
      runtimeTier: "active"
    };
  }

  const angle = Math.random() * Math.PI * 2;
  const radius = 360 + Math.random() * 260;
  const mapWidth = map?.meta.world_width ?? MAP_WIDTH;
  const mapHeight = map?.meta.world_height ?? MAP_HEIGHT;
  return {
    id,
    x: clamp(playerX + Math.cos(angle) * radius, 40, mapWidth - 40),
    y: clamp(playerY + Math.sin(angle) * radius, 40, mapHeight - 40),
    hp: 32,
    maxHp: 32,
    monsterId: spawnKind === "elite" ? "enemy_brute" : "enemy_imp",
    ...encounterMonsterPaletteFields(palette),
    ...offense,
    aggroLocked: true,
    runtimeTier: "active"
  };
}

function runtimeDebugCornerPlayerSpawn(map: BakedBattleMapData) {
  return nearestRuntimeWalkablePoint(map, {
    x: map.meta.world_width - map.meta.grid_size * 1.5,
    y: map.meta.grid_size * 1.5
  });
}

function createRuntimeDebugCornerEnemies(
  player: { x: number; y: number },
  map: BakedBattleMapData,
  palette?: EncounterMonsterPalette
): Enemy[] {
  const offense = defaultMonsterOffense(8);
  const candidates = map.walkablePoints
    .map((point) => ({ point, distance: distance(point, player) }))
    .filter(({ point, distance: pointDistance }) => (
      pointDistance >= 86
      && pointDistance <= 180
      && enemyHasWalkableLine(map, point, player)
    ))
    .sort((left, right) => left.distance - right.distance);
  const fallbackOffsets = [
    { x: 0, y: 112 },
    { x: -64, y: 112 },
    { x: 64, y: 112 },
    { x: -104, y: 142 },
    { x: 104, y: 142 },
    { x: 0, y: 164 }
  ];
  const prefersSupremeBoss = new URLSearchParams(window.location.search).get("debugSupremeBoss") === "1";
  const monsterIds = prefersSupremeBoss
    ? ["mon_500001", "mon_100103", "mon_200103", "mon_300102", "enemy_imp", "enemy_brute"]
    : ["mon_100103", "mon_200103", "mon_300102", "mon_400001", "enemy_imp", "enemy_brute"];
  return fallbackOffsets.map((offset, index) => {
    const spawn = candidates[index]?.point ?? nearestRuntimeWalkablePoint(map, { x: player.x + offset.x, y: player.y + offset.y });
    const visual = resolveMonsterGeometryVisual(monsterIds[index % monsterIds.length]);
    const spawnRarity = visual?.tier ?? (monsterIds[index % monsterIds.length] === "enemy_brute" ? "rare" : "normal");
    return {
      id: 90_000 + index,
      x: spawn.x,
      y: spawn.y,
      hp: 32,
      maxHp: 32,
      monsterId: monsterIds[index % monsterIds.length],
      boss: isNemesisRarity(spawnRarity),
      spawnRarity,
      monsterType: visual?.monsterType,
      movementSpeedMultiplier: 1,
      skillShape: isNemesisRarity(spawnRarity) ? "boss" : undefined,
      nemesis: isNemesisRarity(spawnRarity),
      ...encounterMonsterPaletteFields(palette),
      ...offense,
      aggroLocked: true,
      runtimeTier: "active"
    };
  });
}

function monsterTestMonsterOptions() {
  return parseMonsterDefinitionsToml(monsterDefsToml).map((monster) => {
    const visual = resolveMonsterGeometryVisual(monster.id);
    return {
      id: monster.id,
      label: `${monster.id} · ${visual?.tier ?? monster.monster_type} · ${monster.monster_type}`
    };
  });
}

function createMonsterTestEnemy(
  id: number,
  monsterId: string,
  player: PlayerRuntimeState,
  map: BakedBattleMapData,
  spawnIndex: number
): Enemy {
  const definitions = new Map(parseMonsterDefinitionsToml(monsterDefsToml).map((monster) => [monster.id, monster]));
  const definition = definitions.get(monsterId);
  const visual = resolveMonsterGeometryVisual(monsterId);
  const rarity = monsterTestRarity(monsterId, definition?.boss_rarity);
  const monsterType = definition?.monster_type ?? visual?.monsterType ?? "melee";
  const damageType = monsterTestDamageType(monsterId);
  const baseDamage = Math.max(1, monsterNormalDamageForLevel(MONSTER_TEST_LEVEL));
  const maxHp = Math.max(1, Math.round(monsterNormalLifeForLevel(MONSTER_TEST_LEVEL) * monsterTestLifeMultiplier(rarity, monsterType)));
  const attackStats = monsterAttackStats(monsterType, rarity, monsterNormalAccuracyForLevel(MONSTER_TEST_LEVEL), damageType);
  const defense = monsterDefenseStats(monsterType, rarity, monsterNormalArmorForLevel(MONSTER_TEST_LEVEL), monsterNormalEnergyShieldForLevel(MONSTER_TEST_LEVEL));
  const skillAssignment = monsterSkillAssignmentFor(MONSTER_SKILL_CONFIG, monsterId);
  const baseSkill = monsterSkillDefinitionFor(MONSTER_SKILL_CONFIG, skillAssignment?.skill_id);
  const offset = MONSTER_TEST_SPAWN_OFFSETS[spawnIndex % MONSTER_TEST_SPAWN_OFFSETS.length] ?? MONSTER_TEST_SPAWN_OFFSETS[0];
  const spawn = nearestRuntimeWalkablePoint(map, {
    x: player.x + offset.x,
    y: player.y + offset.y
  });
  return {
    id,
    x: spawn.x,
    y: spawn.y,
    hp: maxHp,
    maxHp,
    monsterId,
    authored: true,
    boss: isNemesisRarity(rarity),
    spawnRarity: rarity,
    monsterType,
    movementSpeedMultiplier: monsterTestMovementMultiplier(monsterType),
    skillShape: isNemesisRarity(rarity) ? "boss" : definition?.skill_shape,
    nemesis: isNemesisRarity(rarity),
    lifeMultiplier: 1,
    damageMultiplier: monsterTestDamageMultiplier(rarity, monsterType),
    baseDamage,
    ...attackStats,
    ...defense,
    damageType,
    hitKind: baseSkill?.hit_kind ?? "attack",
    attackRange: monsterTestAttackRange(monsterType),
    attackCadenceMs: 1160,
    offenseModifiers: defaultMonsterOffense(baseDamage).offenseModifiers,
    monsterSkillId: skillAssignment?.skill_id,
    bossPatternId: skillAssignment?.boss_pattern_id,
    monsterSkillForm: skillAssignment?.chinese_form ?? baseSkill?.chinese_form,
    monsterSkillRange: baseSkill?.range,
    aggroLocked: true,
    runtimeTier: "active",
    nextThinkAt: 0
  };
}

function monsterTestRarity(monsterId: string, bossRarity?: string): ProceduralSpawnRarity {
  if (bossRarity === "supreme_boss" || /^mon_500\d{3}$/.test(monsterId)) return "supreme_boss";
  if (bossRarity === "legendary_boss" || /^mon_400\d{3}$/.test(monsterId)) return "legendary_boss";
  if (/^mon_300\d{3}$/.test(monsterId)) return "rare";
  if (/^mon_200\d{3}$/.test(monsterId)) return "magic";
  return "normal";
}

function monsterTestDamageType(monsterId: string) {
  const skillAssignment = monsterSkillAssignmentFor(MONSTER_SKILL_CONFIG, monsterId);
  const baseSkill = monsterSkillDefinitionFor(MONSTER_SKILL_CONFIG, skillAssignment?.skill_id);
  return baseSkill?.damage_type ?? "physical";
}

function monsterTestLifeMultiplier(rarity: ProceduralSpawnRarity, monsterType: MonsterType) {
  const rarityMultiplier = rarity === "supreme_boss" ? 120
    : rarity === "legendary_boss" ? 80
      : rarity === "rare" ? 12
        : rarity === "magic" ? 4
          : 1;
  const typeMultiplier = monsterType === "tank" ? 1.72
    : monsterType === "minion" ? 0.72
      : monsterType === "ranged" ? 0.82
        : monsterType === "assassin" ? 0.86
          : monsterType === "support" ? 0.92
            : 1;
  return rarityMultiplier * typeMultiplier;
}

function monsterTestDamageMultiplier(rarity: ProceduralSpawnRarity, monsterType: MonsterType) {
  const rarityMultiplier = rarity === "supreme_boss" ? 3.3
    : rarity === "legendary_boss" ? 2.8
      : rarity === "rare" ? 2
        : rarity === "magic" ? 1.5
          : 1;
  const typeMultiplier = monsterType === "charger" ? 1.18
    : monsterType === "assassin" ? 1.28
      : monsterType === "tank" ? 0.82
        : monsterType === "support" ? 0.68
          : monsterType === "minion" ? 0.72
            : monsterType === "ranged" ? 0.9
              : 1;
  return rarityMultiplier * typeMultiplier;
}

function monsterTestMovementMultiplier(monsterType: MonsterType) {
  if (monsterType === "charger") return 1.34;
  if (monsterType === "assassin") return 1.24;
  if (monsterType === "minion") return 1.06;
  if (monsterType === "ranged") return 0.82;
  if (monsterType === "tank") return 0.66;
  if (monsterType === "support") return 0.92;
  return 1;
}

function monsterTestAttackRange(monsterType: MonsterType) {
  if (monsterType === "ranged") return 42 * 4.8;
  if (monsterType === "support") return 42 * 3.2;
  if (monsterType === "charger") return 42 * 1.22;
  if (monsterType === "tank") return 42 * 1.05;
  return 42;
}

function randomEnemySpawnPoint(map: BakedBattleMapData | null, spawnKind: "normal" | "elite") {
  if (!map) return null;
  const preferred = spawnKind === "elite" ? map.eliteSpawnPoints : map.enemySpawnPoints;
  const pool = preferred.length > 0 ? preferred : map.enemySpawnPoints.length > 0 ? map.enemySpawnPoints : map.walkablePoints;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function createSkillTestDummies(firstId: number, playerX: number, playerY: number, palette?: EncounterMonsterPalette): Enemy[] {
  return SKILL_TEST_DUMMY_OFFSETS.map((offset, index) => ({
    id: firstId + index,
    x: clamp(playerX + offset.x, 40, MAP_WIDTH - 40),
    y: clamp(playerY + offset.y, 40, MAP_HEIGHT - 40),
    hp: SKILL_TEST_DUMMY_MAX_HP,
    maxHp: SKILL_TEST_DUMMY_MAX_HP,
    monsterId: "enemy_imp",
    ...encounterMonsterPaletteFields(palette),
    ...defaultMonsterOffense(0),
    runtimeTier: "active"
  }));
}

function applyEncounterMonsterPalette(enemies: Enemy[], palette: EncounterMonsterPalette) {
  return enemies.map((enemy) => ({
    ...enemy,
    ...encounterMonsterPaletteFields(palette)
  }));
}

function encounterMonsterPaletteFields(palette: EncounterMonsterPalette | undefined) {
  return palette ? {
    visualPrimaryColor: palette.primary
  } : {};
}

function createEncounterMonsterPalette(): EncounterMonsterPalette {
  return ENCOUNTER_MONSTER_PALETTES[Math.floor(Math.random() * ENCOUNTER_MONSTER_PALETTES.length)] ?? ENCOUNTER_MONSTER_PALETTES[0];
}

function advanceRuntimeVisuals<T extends { ttl: number }>(items: T[], dt: number, maxCount: number) {
  return capRuntimeVisualBudget(
    items.map((item) => ({ ...item, ttl: item.ttl - dt })).filter((item) => item.ttl > 0),
    maxCount
  );
}

function capRuntimeVisualBudget<T>(items: T[], maxCount: number) {
  if (items.length <= maxCount) return items;
  return items.slice(items.length - maxCount);
}
