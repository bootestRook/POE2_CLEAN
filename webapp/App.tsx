import { DragEvent, MouseEvent, ReactNode, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  createMonsterSkillTimer,
  markMonsterSkillReleased,
  monsterSkillAssignmentFor,
  monsterBossPatternFor,
  monsterSkillDefinitionFor,
  monsterSkillHitAllowed,
  nextMonsterSkillCandidate,
  validateMonsterSkillConfig
} from "./monsterSkillRuntime";
import type { MonsterBossPattern, MonsterBossPatternSkill, MonsterDamageForm, MonsterSkillConfig, MonsterSkillDefinition, MonsterSkillRange, MonsterSkillRuntimeTimer } from "./monsterSkillRuntime";
import {
  buildMonsterSkillMeleeZoneEvents,
  buildMonsterSkillProjectileEvents,
  buildMonsterSupportDisplayEvents
} from "./runtime/monsterSkillEventBuilder";
import {
  BOSS_AREA_RADIUS,
  BOSS_AREA_SKILL_INTERVAL_MAX_MS,
  BOSS_AREA_SKILL_INTERVAL_MIN_MS,
  BOSS_AREA_SKILL_TARGET_RANGE,
  BOSS_AREA_WARNING_MS,
  BOSS_BARRAGE_PROJECTILE_COUNT,
  BOSS_BARRAGE_SKILL_INTERVAL_MAX_MS,
  BOSS_BARRAGE_SKILL_INTERVAL_MIN_MS,
  BOSS_BARRAGE_SKILL_TARGET_RANGE,
  BOSS_BARRAGE_WAVE_INTERVAL_MS,
  BOSS_BARRAGE_WAVE_OFFSETS_DEG,
  BOSS_BASIC_PROJECTILE_INTERVAL_MAX_MS,
  BOSS_BASIC_PROJECTILE_INTERVAL_MIN_MS,
  BOSS_BASIC_PROJECTILE_TARGET_RANGE,
  BOSS_PROJECTILE_DISTANCE,
  BOSS_PROJECTILE_RADIUS,
  BOSS_PROJECTILE_SPEED
} from "./runtime/bossSkillConstants";
import {
  MONSTER_NORMAL_ACCURACY_BASE,
  MONSTER_NORMAL_ACCURACY_GROWTH,
  MONSTER_NORMAL_ARMOR_BASE,
  MONSTER_NORMAL_ARMOR_GROWTH,
  MONSTER_NORMAL_DAMAGE_BASE,
  MONSTER_NORMAL_DAMAGE_GROWTH,
  MONSTER_NORMAL_ENERGY_SHIELD_BASE,
  MONSTER_NORMAL_ENERGY_SHIELD_GROWTH,
  MONSTER_NORMAL_LIFE_BASE,
  MONSTER_NORMAL_LIFE_GROWTH
} from "./runtime/monsterStatConstants";
import {
  DOT_FLOATING_TEXT_INTERVAL_SECONDS,
  FRONTEND_BASE_KNOCKBACK_DISTANCE,
  FRONTEND_KNOCKBACK_LOCK_MS,
  MAX_RUNTIME_AREA_VFX,
  MAX_RUNTIME_FLOATING_TEXT,
  MAX_RUNTIME_HIT_VFX,
  MAX_RUNTIME_PROJECTILE_VISUALS,
  RUNTIME_DROPPED_FRAME_MS,
  RUNTIME_MIN_FRAME_MS,
  RUNTIME_PERF_SYNC_INTERVAL_MS,
  RUNTIME_SLOW_LOGIC_MS,
  TRIGGERED_SKILL_EVENT_MIN_DELAY_SECONDS
} from "./runtime/runtimeTimingConstants";
import {
  applyDamageToEnemyResources,
  damageEventAmountAgainstEnemy,
  enemyStatusApplyResistancePercent,
  enemyStatusDurationMultiplier
} from "./runtime/enemyDamageRuntime";
import {
  anchorHitVfxsToTargets,
  anchorProjectilesToTargets,
  capRuntimeVisualBudget,
  defaultFrontendExtraProjectileSpreadAngle,
  finishCompletedProjectileBody,
  hitVfxTargetId,
  isProjectileTickFollowup,
  projectileAngleStepDeg,
  projectileFollowupKey,
  projectileIdFromEvent,
  projectileSpawnWorldPosition,
  projectileSpreadAngleDeg,
  projectileSpreadDirections,
  projectileTargetFollowupKey,
  rotateDirection,
  shouldSuppressProjectileFollowup,
  targetedEnemyForEvent
} from "./runtime/projectileLifecycleRuntime";
import {
  activeDamageZoneTickProgressForZone,
  advanceActiveDamageZoneRuntime,
  buildActiveDamageZoneRuntimeTickEvents,
  createActiveDamageZoneRuntime,
  replaceActiveDamageZoneRuntime
} from "./runtime/damageZoneLifecycleRuntime";
import { createDamageApplicationRuntime } from "./runtime/damageApplicationRuntime";
import { createSkillEventConsumerRuntime } from "./runtime/skillEventConsumerRuntime";
import {
  buildFrontendChainSkillEvents as buildFrontendChainSkillEventsFromRuntime,
  buildFrontendDamageZoneSkillEvents as buildFrontendDamageZoneSkillEventsFromRuntime,
  buildFrontendMeleeArcSkillEvents as buildFrontendMeleeArcSkillEventsFromRuntime,
  buildFrontendModuleChainSkillEvents as buildFrontendModuleChainSkillEventsFromRuntime,
  buildFrontendNovaSkillEvents as buildFrontendNovaSkillEventsFromRuntime,
  buildFrontendPlayableSkillEvents as buildFrontendPlayableSkillEventsFromRuntime,
  buildFrontendProjectileSkillEvents as buildFrontendProjectileSkillEventsFromRuntime
} from "./runtime/frontendPlayableSkillEventBuilders";
import {
  applyDamageToPlayerResources,
  applyPlayerEnergyShieldRecharge,
  convertIncomingPlayerDamageComponents,
  frontendEnergyShieldRechargeDelayMs,
  normalizePlayerRuntimeResources,
  mitigateIncomingPlayerDamageComponent,
  monsterAccuracy,
  monsterCritChancePercent,
  monsterCritDamagePercent,
  monsterDoubleDamageChancePercent,
  monsterOffenseModifier,
  monsterOutgoingDamage,
  playerEvasionChanceAgainstMonster,
  playerResistanceCap,
  playerResistancePercent,
  recoverPlayerOnBlock,
  recoverPlayerOnHit,
  regeneratePlayerResources,
  resolveMonsterHitAgainstPlayer
} from "./runtime/playerDamageRuntime";
import {
  buildSupremeBossSkillEvents,
  normalizeSupremeBossSkillConfig,
  supremeBossSkillForMonster,
  supremeBossSkillIds,
  validateSupremeBossSkillConfig
} from "./supremeBossSkillRuntime";
import type { SupremeBossSkillDefinition, SupremeBossRuntimeEvent } from "./supremeBossSkillRuntime";
import type { Enemy, EncounterMonsterPalette, RuntimeBoundaryScanSummary, RuntimeEncounterAggroSource } from "./types/enemyTypes";
import type {
  ActiveDamageZoneRuntime,
  AreaNova,
  BossSkillTimers,
  Camera2D,
  ChainSegmentVfx,
  ContinuousAttackRuntime,
  DamageZoneVfx,
  EnemyVisualRuntime,
  FireBolt,
  FloatingText,
  HitVfx,
  MeleeArcVfx,
  PendingBossDamageZoneHit,
  PlayerBuff,
  PlayerRuntimeState,
  RuntimePerfSummary,
  RuntimeSkillEventsResponse,
  ScheduledSkillEvent,
  SkillEvent,
  SupremeBossSkillTimer,
  ThundercloudChannelRuntime,
  UnitVisualRuntime
} from "./types/combatRuntimeTypes";
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
import { MONSTER_GEOMETRY_VISUALS, MONSTER_RARITY_VISUALS, resolveMonsterGeometryVisual } from "./monsterGeometryVisuals";
import {
  UnitDirection,
} from "./unitAssets";
import { FRONTEND_GEM_DROP_POOL } from "./frontendGemDropData";
import { FRONTEND_INITIAL_APP_STATE } from "./frontendGameData";
import {
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
import type { FrontendEquipmentAffixRoll, FrontendEquipmentStatModifier } from "./frontendEquipmentRuntime";
import type {
  SecondaryHitConfig,
  SkillEditorCameraSettings,
  SkillEditorDebugOptions,
  SkillEditorState,
  SkillPackageData
} from "./types/skillEditorTypes";
import { DEFAULT_SKILL_EDITOR_DEBUG_OPTIONS, loadSkillEditorCameraSettings, SKILL_EDITOR_CAMERA_STORAGE_KEY } from "./features/disabled-skill-editor/disabledSkillEditorSettings";
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
import { activeDpsToneClass, buildGemTooltipViewModelWithNormalizers, damageTypeText, formatModifierValue, formatPreviewNumber, frontendChannelStackTooltipLines, frontendDamageComponentTooltipLines, frontendEquipmentGrantedTooltipLines, frontendGemLevelText, frontendGuardTooltipLines, frontendProjectileCountTooltipLine, frontendSkillPreviewBaseLevelSection, frontendSkillPreviewEffectiveLevelText, frontendSupportModifierTooltipLines, highlightTooltipText, mergeFrontendSkillPreviewBonusLines, mergeFrontendSkillPreviewTooltipLines } from "./components/tooltips/tooltipFormatting";
import { frontendDisplayGemKindTag, frontendTargetTagTexts, normalizeSupportConditionRichLineSection, replaceGemTagRichLines } from "./components/tooltips/tooltipGemTags";
import { getComparisonTooltipPosition as resolveComparisonTooltipPosition, resolveTooltipPosition as resolveTooltipAnchorPosition } from "./components/tooltips/tooltipPositioning";
import { createFrontendItemTooltipView } from "./components/tooltips/tooltipViewModel";
import type { TooltipTargetLine, TooltipView } from "./components/tooltips/tooltipViewModel";
import { StashPanel } from "./components/inventory/StashPanel";
import { InventoryOverlay } from "./components/inventory/InventoryOverlay";
import { EquipmentPanel } from "./components/inventory/EquipmentPanel";
import { InventoryBagPanel, type InventoryBagTab } from "./components/inventory/InventoryBagPanel";
import { InventorySkillBoardPanel } from "./components/inventory/InventorySkillBoardPanel";
import { isFloatingOrigin, isInventoryDropBlockedByInterface, resolveDropTarget, type DropTarget, type FloatingOrigin } from "./components/inventory/inventoryDragTargets";
import { bagCellClass as resolveBagCellClass, bagEmptyCellClass, equipmentCellClass as resolveEquipmentCellClass, equipmentEmptyCellClass } from "./components/inventory/inventoryCellClasses";
import { canPlaceItemInEquipmentSlot, comparisonGemForInventoryEquipment, equipmentSourceSlotId, equipmentTargetSlotIndices, isGemItem, isPassiveGem, isTwoHandedEquipmentSource, isTwoHandedWeapon, isWeaponItem, isWeaponSlot, removeItemsFromInventorySlots, uniqueEquipmentSlotIds } from "./components/inventory/equipmentRules";
import { FloatingGemView } from "./components/inventory/FloatingGemView";
import { inventoryItemById, isDropBackToOrigin, moveItemToEquipmentSlot as moveItemToEquipmentSlotState, moveItemToInventorySlot as moveItemToInventorySlotState, normalizeEquipmentSlots as normalizeEquipmentSlotsState, optimisticPlaceItemOnBoard, optimisticUnmountBoardItem, reconcileInventorySlots, removeItemsFromEquipmentSlots } from "./components/inventory/placementState";
import { createStashStateHelpers } from "./components/inventory/stashState";
import { isInventoryItemLockedByRarity, type InventoryLockRarity } from "./components/inventory/inventoryLocking";
import { organizeInventorySlots } from "./components/inventory/inventorySorting";
import { GameViewportFrame } from "./components/layout/GameViewportFrame";
import { EntryTitleScreen } from "./components/layout/EntryTitleScreen";
import { AppTopHud } from "./components/layout/AppTopHud";
import { GameShellOverlays } from "./components/layout/GameShellOverlays";
import { SaveSelectionPanel } from "./components/layout/SaveSelectionPanel";
import { useMountedPassiveVisualEffects } from "./hooks/useMountedPassiveVisualEffects";
import { GAME_RESOLUTION_STORAGE_KEY, useGameViewport, type GameResolutionMode, type GameResolutionPreset, type GameViewport } from "./hooks/useGameViewport";
import { initialMapEditorMode, initialMonsterTestMode, initialSkillEditorMode, initialSkillEditorOpen, initialSpriteTestMode } from "./utils/appModeFlags";
import { clearFrontendSaveSlot, latestFrontendSaveSlotId, loadActiveFrontendSaveSlotId, loadFrontendAutosaveResult, loadFrontendSaveSlotSummaries, saveActiveFrontendSaveSlotId, type FrontendSaveSlotSummary as FrontendSaveStorageSlotSummary } from "./utils/frontendSaveStorage";
import { DEFAULT_PLAYER_NAME, formatFrontendSaveTime, normalizePlayerName } from "./utils/frontendSaveFormatting";
import { clientToGameViewportPoint, currentGameViewportMetrics } from "./utils/gameViewportMetrics";
import { playableMinimapCellKeyForPoint, playableMinimapRevealCells, playableMinimapUsesClientOnlyState } from "./utils/playableMinimapState";
import { runtimeDebugMapInstanceRotation, runtimeDebugMapInstanceSeed, runtimeDebugMonsterBoundaryTestEnabled, runtimeDebugMonsterCornerTestEnabled } from "./utils/runtimeDebugFlags";
import { clamp, distance, guideDirection } from "./utils/math2d";
import { cssToken, visualTone } from "./utils/vfxTone";
import { playerInputVector, projectMovementVectorForAnimation, resolveAnimationDirection } from "./utils/runtimeMotion";
import { createBattleAnimationContexts, createBattleRenderItems, shouldRenderLegacyBattleItem as shouldRenderLegacyBattleItemState, type BattleAnimationContexts, type BattleRenderItem } from "./components/battle/battleRenderState";
import { renderBattleRenderItem as renderBattlePresentationItem, type BattlePresentationRenderItem, type BattleRenderPresentationHelpers } from "./components/battle/BattleRenderLayer";
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
import { MonsterTestPanel } from "./components/battle/MonsterTestPanel";
import type { PlayableMinimapMode } from "./components/battle/PlayableBattleMinimap";
import { GemGhost } from "./components/skill-board/SkillBoardPresentation";
import type { PreviewRelationType } from "./components/skill-board/SkillBoardPresentation";
import { canPlaceGemOnBoard, cellKey, useLegalDropCells, usePlacementInvalidReason, usePlacementPreview } from "./components/skill-board/boardPlacementState";
import { useActiveTargetLines, useLinkedGemIds, useSupportLines, useSupportPreview } from "./components/skill-board/supportPreviewState";
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
import { createFrontendAppStateHelpers } from "./state/frontendAppState";
import {
  createFrontendDrop,
  createFrontendInventoryItem,
  createGuaranteedNextMapEntryDrop,
  frontendMonsterDropAttempts,
  selectedFrontendMapStage as resolveSelectedFrontendMapStage
} from "./state/frontendDropState";
import {
  addFrontendDamageComponent,
  convertFrontendDamageComponents,
  frontendConduitRelation,
  frontendDamageConversions,
  frontendDamageMapTotal,
  frontendElementalAilmentTypes,
  frontendExpectedCritChance,
  frontendExpectedCritMultiplier,
  frontendGemBaseModifiers,
  frontendPlayerStatusImmunityStats,
  frontendRecord,
  frontendSkillAilmentDamageMultiplier,
  frontendSkillDotDamageMultiplier,
  frontendSkillLevelTableValueById,
  frontendSkillPreviewsBySkillTag,
  frontendSupportEffectiveLevel,
  frontendSupportLevelTableId,
  normalizeFrontendStatusType,
  recalculateFrontendEquipmentState as recalculateFrontendEquipmentPreviewState,
  recalculateFrontendSkillPreview as recalculateFrontendSkillPreviewState
} from "./state/frontendSkillPreviewState";
import type { FrontendAilmentConfig, FrontendPassiveEffect, ShapeEffectPreview, SkillAppliedModifier, SkillPreview } from "./state/frontendSkillPreviewState";
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

type Cell = {
  row: number;
  column: number;
  box: number;
  gem: Gem | null;
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
const MONSTER_TEST_PLAYER_LIFE = 9_999_999;
const MONSTER_TEST_LEVEL = 86;

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

const {
  createEmptyStashPages,
  normalizeStashPages,
  stashItemIds,
  removeItemsFromStashPages,
  moveItemToStashSlot
} = createStashStateHelpers<Gem>({
  pageCount: STASH_PAGE_COUNT,
  pageSlotCount: STASH_PAGE_SLOT_COUNT,
  normalizeEquipmentSlots: (slots) => normalizeEquipmentSlotsState(slots, EQUIPMENT_SLOT_COUNT)
});

function sanitizeFrontendStorageState(state: AppState): AppState {
  const equipmentState = sanitizeEquipmentSlotsForState(state);
  return {
    ...equipmentState,
    stash_pages: normalizeStashPages(equipmentState.stash_pages, equipmentState)
  };
}

function recalculateFrontendSkillPreview(state: AppState): AppState {
  return recalculateFrontendSkillPreviewState(state, EQUIPMENT_SLOT_COUNT);
}

function recalculateFrontendEquipmentState(state: AppState): AppState {
  return recalculateFrontendEquipmentPreviewState(state, EQUIPMENT_SLOT_COUNT);
}

const {
  createFrontendInitialAppState,
  createMonsterTestAppState,
  createFrontendNewGameState,
  createFrontendNewSaveStarterState,
  createRandomNewSaveStarterGem,
  appStateFromFrontendSave,
  frontendSavePayloadFromState,
  saveFrontendAutosave
} = createFrontendAppStateHelpers<AppState, FrontendSavePayload, Gem>({
  cloneFrontendData,
  cloneFrontendInitialAppStateSeed,
  frontendGemDropPool,
  createEmptyStashPages,
  normalizeStashPages,
  sanitizeFrontendStorageState,
  recalculateFrontendSkillPreview,
  recalculateFrontendEquipmentState,
  starterGemBoardPosition: STARTER_GEM_BOARD_POSITION,
  excludedStarterBaseGemIds: EXCLUDED_NEW_SAVE_STARTER_BASE_GEM_IDS,
  monsterTestPlayerLife: MONSTER_TEST_PLAYER_LIFE,
  equipmentSlotCount: EQUIPMENT_SLOT_COUNT
});

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
  const [inventoryLockMode, setInventoryLockMode] = useState(false);
  const [manualLockedItemIds, setManualLockedItemIds] = useState<Set<string>>(() => new Set());
  const [manualUnlockedItemIds, setManualUnlockedItemIds] = useState<Set<string>>(() => new Set());
  const [activeLockRarities, setActiveLockRarities] = useState<Set<InventoryLockRarity>>(() => new Set());
  const [gmOpen, setGmOpen] = useState(false);
  const [gmOptions, setGmOptions] = useState<GmOptions | null>(null);
  const [gmAffixes, setGmAffixes] = useState<GmEquipmentAffixResponse | null>(null);
  const monsterTestOptions = useMemo(() => monsterTestMonsterOptions(), []);
  const [selectedMonsterTestMonsterId, setSelectedMonsterTestMonsterId] = useState(() => monsterTestOptions[0]?.id ?? "");
  const [activeInventoryBagTab, setActiveInventoryBagTab] = useState<InventoryBagTab>("equipment");
  const [equipmentInventorySlots, setEquipmentInventorySlots] = useState<(string | null)[]>(() => Array(INVENTORY_SLOT_COUNT).fill(null));
  const [gemInventorySlots, setGemInventorySlots] = useState<(string | null)[]>(() => Array(INVENTORY_SLOT_COUNT).fill(null));
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
    return applyPlayerEnergyShieldRecharge(playerBeforeRecharge, state?.player_stats, dt, elapsedRef.current * 1000, energyShieldRechargeReadyMs.current);
  }

  function resolveFrontendPlayerBlock(enemy: Enemy, hitKind: MonsterHitKind) {
    const chanceStat = hitKind === "spell" ? "spell_block_chance_percent" : "attack_block_chance_percent";
    const blockChance = clamp(statNumber(state?.player_stats?.[chanceStat], 0), 0, 75);
    if (blockChance <= 0) return false;
    playerBlockHitCounter.current += 1;
    return stablePercent(`player:block:${playerBlockHitCounter.current}:${enemy.id}:${hitKind}`) < blockChance;
  }

  function recoverFrontendPlayerOnBlock(playerBeforeHit: PlayerRuntimeState, nowMs: number): PlayerRuntimeState {
    const result = recoverPlayerOnBlock(playerBeforeHit, state?.player_stats, nowMs, blockLifeRecoveryReadyMs.current, blockShieldRecoveryReadyMs.current);
    blockLifeRecoveryReadyMs.current = result.nextBlockLifeRecoveryReadyMs;
    blockShieldRecoveryReadyMs.current = result.nextBlockShieldRecoveryReadyMs;
    return result.nextPlayer;
  }

  function playerAbsorbBuffType(buffType: string) {
    return buffType === "guard" || buffType === "barrier";
  }

  function recoverFrontendPlayerOnHit(playerBeforeRecovery: PlayerRuntimeState): PlayerRuntimeState {
    const nowMs = Math.round(elapsedRef.current * 1000);
    const result = recoverPlayerOnHit(playerBeforeRecovery, state?.player_stats, nowMs, lifeReturnReadyMs.current, shieldReturnReadyMs.current);
    lifeReturnReadyMs.current = result.nextLifeReturnReadyMs;
    shieldReturnReadyMs.current = result.nextShieldReturnReadyMs;
    return result.nextPlayer;
  }

  function applyFrontendDamageToPlayer(playerBeforeDamage: PlayerRuntimeState, damage: number): PlayerRuntimeState {
    return applyDamageToPlayerResources(playerBeforeDamage, damage, state?.player_stats, { useManaBeforeLife: true }).nextPlayer;
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
          const nextStackDurations = frontendEnemyBuffNextStackDurations(buff, dt);
          const dps = Math.max(0, buff.baseDamagePerSecond ?? 0) * frontendEnemyBuffDamageStackCount(buff);
          const damageElapsed = frontendEnemyBuffStackMode(buff) === "independent"
            ? frontendEnemyBuffStackDurations(buff).reduce((total, remaining) => total + Math.min(Math.max(0, remaining), dt), 0)
            : elapsed;
          let nextFloatingTextIn = buff.nextFloatingTextIn ?? DOT_FLOATING_TEXT_INTERVAL_SECONDS;
          if (dps > 0 && damageElapsed > 0) {
            damageOverTime += frontendEnemyBuffStackMode(buff) === "independent"
              ? Math.max(0, buff.baseDamagePerSecond ?? 0) * damageElapsed
              : dps * damageElapsed;
            nextFloatingTextIn -= dt;
            if (nextFloatingTextIn <= 0) {
              floatingTextDamage += dps * DOT_FLOATING_TEXT_INTERVAL_SECONDS;
              floatingTextDamageType = buff.damageType ?? floatingTextDamageType;
              while (nextFloatingTextIn <= 0) nextFloatingTextIn += DOT_FLOATING_TEXT_INTERVAL_SECONDS;
            }
          }
          return {
            ...buff,
            remaining: frontendEnemyBuffStackMode(buff) === "independent"
              ? Math.max(0, ...nextStackDurations)
              : buff.remaining - dt,
            stackCount: frontendEnemyBuffStackMode(buff) === "independent" ? nextStackDurations.length : buff.stackCount,
            stackDurations: frontendEnemyBuffStackMode(buff) === "independent" ? nextStackDurations : buff.stackDurations,
            nextFloatingTextIn
          };
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
    const reservedIds = new Set([...equippedIds, ...stashIds]);
    const floatingItemId = floatingGemRef.current?.gem.instance_id ?? null;
    setEquipmentInventorySlots((current) => reconcileInventorySlots(current, state, floatingItemId, reservedIds, INVENTORY_SLOT_COUNT, (item) => !isGemItem(item)));
    setGemInventorySlots((current) => reconcileInventorySlots(current, state, floatingItemId, reservedIds, INVENTORY_SLOT_COUNT, isGemItem));
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
  }, [state, activeInventoryBagTab, equipmentInventorySlots, gemInventorySlots, equipmentSlots]);

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
      if (key === "g" && RELEASE_DEBUG_TOOLS_ENABLED && !event.repeat && !isPlayableBattleTypingTarget(event.target)) {
        event.preventDefault();
        setBagOpen(true);
        setGmOpen((current) => bagOpen ? !current : true);
        setBattlePauseOpen(false);
        setRestAreaPanel(null);
        setTooltip(null);
        setHoveredGemId(null);
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
      const healedAllies: { x: number; y: number; amount: number }[] = [];
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
          healedAllies.push({ x: ally.x, y: ally.y, amount: actualHeal });
        }
      }
      const supportDisplay = buildMonsterSupportDisplayEvents({
        source: updatedEnemy,
        skill,
        radius,
        healedAllies,
        nextTextId: nextTextId.current,
        nextAreaNovaId: nextAreaNovaId.current,
        includeHealPulse: healPercent > 0
      });
      nextTextId.current = supportDisplay.nextTextId;
      nextAreaNovaId.current = supportDisplay.nextAreaNovaId;
      if (supportDisplay.areaNova) {
        setAreaNovas((items) => capRuntimeVisualBudget([...items, supportDisplay.areaNova], MAX_RUNTIME_AREA_VFX));
      }
      if (supportDisplay.texts.length > 0) {
        setTexts((items) => capRuntimeVisualBudget([...items, ...supportDisplay.texts], MAX_RUNTIME_FLOATING_TEXT));
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
    const events = buildMonsterSkillProjectileEvents({
      enemy,
      target: playerStateRef.current,
      skill,
      sequence,
      nowMs
    });
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
    const playerNow = playerStateRef.current;
    const built = buildMonsterSkillMeleeZoneEvents({
      enemy,
      target: playerNow,
      skill,
      sequence,
      nowMs,
      repeatIndex,
      repeatCount,
      damageAmount: monsterOutgoingDamage(enemy)
    });
    pendingBossDamageZoneHits.current.push(built.pendingDamageZoneHit);
    consumeSkillEventTimeline(built.events);
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
        stackMode: frontendEnemyBuffStackModeFromValue(ailment.stack_mode),
        stackCount: 1,
        maxStacks: Math.max(1, Math.round(Number(ailment.max_stacks ?? 1))),
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
      const merged = mergeFrontendEnemyStatusBuff(existing, buff);
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
        stack_mode: frontendEnemyBuffStackModeFromValue(ailment.stack_mode),
        damage_over_time_more_percent: Number(ailment.damage_over_time_more_percent ?? 0),
        dot_damage_add_percent: Number(skill.runtime_params?.dot_damage_add_percent ?? 0),
        ailment_damage_add_percent: Number(skill.runtime_params?.ailment_damage_add_percent ?? 0),
        ailment_damage_deepen_percent: Number(skill.runtime_params?.ailment_damage_deepen_percent ?? 0),
        max_stacks: Number(ailment.max_stacks ?? 1)
      }, durationMs, delayMs)];
    });
  }

  function frontendEnemyBuffStackCount(buff: EnemyBuff) {
    return Math.max(1, Math.round(Number(buff.stackCount ?? 1)));
  }

  function frontendEnemyBuffStackModeFromValue(value: unknown): EnemyBuff["stackMode"] {
    if (value === "independent" || value === "stack_value" || value === "refresh_duration") return value;
    return "refresh_duration";
  }

  function frontendEnemyBuffStackMode(buff: EnemyBuff): NonNullable<EnemyBuff["stackMode"]> {
    return frontendEnemyBuffStackModeFromValue(buff.stackMode);
  }

  function frontendEnemyBuffMaxStacks(buff: EnemyBuff) {
    return Math.max(1, Math.round(Number(buff.maxStacks ?? buff.stackCount ?? 1)));
  }

  function frontendEnemyBuffStackDurations(buff: EnemyBuff) {
    if (frontendEnemyBuffStackMode(buff) !== "independent") return [];
    const durations = Array.isArray(buff.stackDurations)
      ? buff.stackDurations.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)
      : [];
    if (durations.length > 0) return durations;
    return Array.from({ length: frontendEnemyBuffStackCount(buff) }, () => Math.max(0, buff.remaining));
  }

  function frontendEnemyBuffNextStackDurations(buff: EnemyBuff, dt: number) {
    if (frontendEnemyBuffStackMode(buff) !== "independent") return [];
    return frontendEnemyBuffStackDurations(buff)
      .map((remaining) => remaining - dt)
      .filter((remaining) => remaining > 0);
  }

  function frontendEnemyBuffDamageStackCount(buff: EnemyBuff) {
    if (frontendEnemyBuffStackMode(buff) === "independent") return frontendEnemyBuffStackDurations(buff).length;
    if (frontendEnemyBuffStackMode(buff) === "stack_value") return frontendEnemyBuffStackCount(buff);
    return 1;
  }

  function mergeFrontendEnemyStatusBuff(existing: EnemyBuff | undefined, nextBuff: EnemyBuff): EnemyBuff {
    const maxStacks = Math.max(frontendEnemyBuffMaxStacks(nextBuff), existing ? frontendEnemyBuffMaxStacks(existing) : 1);
    const stackMode = frontendEnemyBuffStackModeFromValue(nextBuff.stackMode ?? existing?.stackMode);
    if (!existing) {
      if (stackMode === "independent") {
        const stackDurations = Array.from({ length: frontendEnemyBuffStackCount(nextBuff) }, () => Math.max(0, nextBuff.remaining))
          .slice(0, maxStacks);
        return {
          ...nextBuff,
          stackMode,
          remaining: Math.max(0, ...stackDurations),
          stackCount: stackDurations.length,
          stackDurations,
          maxStacks
        };
      }
      return {
        ...nextBuff,
        stackMode,
        stackCount: stackMode === "stack_value" ? Math.min(maxStacks, frontendEnemyBuffStackCount(nextBuff)) : 1,
        maxStacks
      };
    }
    if (stackMode === "independent") {
      const stackDurations = [
        ...frontendEnemyBuffStackDurations(existing),
        ...Array.from({ length: frontendEnemyBuffStackCount(nextBuff) }, () => Math.max(0, nextBuff.remaining))
      ]
        .sort((left, right) => right - left)
        .slice(0, maxStacks);
      return {
        ...nextBuff,
        stackMode,
        remaining: Math.max(0, ...stackDurations),
        duration: Math.max(existing.duration, nextBuff.duration),
        baseValue: Math.max(existing.baseValue ?? 0, nextBuff.baseValue ?? 0),
        baseDamagePerSecond: Math.max(existing.baseDamagePerSecond ?? 0, nextBuff.baseDamagePerSecond ?? 0),
        stackCount: stackDurations.length,
        stackDurations,
        maxStacks
      };
    }
    if (stackMode === "refresh_duration") {
      return {
        ...nextBuff,
        stackMode,
        remaining: Math.max(existing.remaining, nextBuff.remaining),
        duration: Math.max(existing.duration, nextBuff.duration),
        baseValue: Math.max(existing.baseValue ?? 0, nextBuff.baseValue ?? 0),
        baseDamagePerSecond: Math.max(existing.baseDamagePerSecond ?? 0, nextBuff.baseDamagePerSecond ?? 0),
        stackCount: 1,
        maxStacks
      };
    }
    const stackCount = Math.min(maxStacks, frontendEnemyBuffStackCount(existing) + frontendEnemyBuffStackCount(nextBuff));
    return {
      ...nextBuff,
      stackMode,
      remaining: Math.max(existing.remaining, nextBuff.remaining),
      duration: Math.max(existing.duration, nextBuff.duration),
      baseValue: Math.max(existing.baseValue ?? 0, nextBuff.baseValue ?? 0),
      baseDamagePerSecond: Math.max(existing.baseDamagePerSecond ?? 0, nextBuff.baseDamagePerSecond ?? 0),
      stackCount,
      maxStacks
    };
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
    return buildFrontendPlayableSkillEventsFromRuntime(skill, caster, initialTargets, current, behavior, {
      buildFrontendChainSkillEvents,
      buildFrontendDamageZoneSkillEvents,
      buildFrontendMeleeArcSkillEvents,
      buildFrontendModuleChainSkillEvents,
      buildFrontendNovaSkillEvents,
      buildFrontendProjectileSkillEvents,
      frontendDamageEventsForTarget,
      isProjectileSkillTemplate,
      skillHasProjectileDamageZoneModules
    });
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
    return buildFrontendProjectileSkillEventsFromRuntime(skill, caster, initialTargets, current, {
      convertedDamageType,
      damagePayloadComponents,
      forcedElementDamageType,
      frontendDamageEventsForTarget,
      frontendRuntimeRange,
      frontendSkillEvent,
      frontendSkillVfxKey,
      frontendUniqueTargetsByDistance,
      projectileSpawnWorldPosition,
      projectileSpreadDirections,
      rotateDirection,
      stablePercent,
      buildFrontendSecondaryHitEvents,
      buildFrontendSplitProjectileEvents,
      buildFrontendIgnitedHitExplosionEvents
    }, elapsedRef.current * 1000);
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
    return buildFrontendChainSkillEventsFromRuntime(skill, caster, initialTargets, current, {
      damagePayloadComponents,
      frontendDamageEventsForTarget,
      frontendSkillEvent,
      frontendSkillVfxKey,
      frontendUniqueTargetsByDistance,
      projectileSpawnWorldPosition,
      stablePercent,
      frontendScaledSkillConfigDamageAmount,
      frontendSkillDotDamageMultiplier
    }, elapsedRef.current * 1000);
  }

  function buildFrontendModuleChainSkillEvents(skill: SkillPreview, caster: PlayerRuntimeState, initialTargets: Enemy[], current: Enemy[]) {
    return buildFrontendModuleChainSkillEventsFromRuntime(skill, caster, initialTargets, current, {
      damagePayloadComponents,
      frontendDamageEventsForTarget,
      frontendSkillEvent,
      frontendSkillVfxKey,
      frontendUniqueTargetsByDistance,
      projectileSpawnWorldPosition,
      stablePercent,
      frontendScaledSkillConfigDamageAmount,
      frontendSkillDotDamageMultiplier
    }, elapsedRef.current * 1000);
  }

  function buildFrontendDamageZoneSkillEvents(skill: SkillPreview, caster: PlayerRuntimeState, initialTargets: Enemy[], current: Enemy[]) {
    return buildFrontendDamageZoneSkillEventsFromRuntime(skill, caster, initialTargets, current, {
      convertedDamageType,
      damagePayloadComponents,
      frontendDamageEventsForTarget,
      frontendSkillEvent,
      frontendSkillVfxKey,
      frontendUniqueTargetsByDistance,
      frontendKnockbackLockMs: FRONTEND_KNOCKBACK_LOCK_MS,
      frontendMeleeArcTargets,
      frontendRuntimeRoll,
      frontendSkillDotDamageMultiplier,
      isThundercloudSkill,
      statValue
    }, elapsedRef.current * 1000);
  }

  function buildFrontendMeleeArcSkillEvents(skill: SkillPreview, caster: PlayerRuntimeState, initialTargets: Enemy[], current: Enemy[]) {
    return buildFrontendMeleeArcSkillEventsFromRuntime(skill, caster, initialTargets, current, {
      convertedDamageType,
      damagePayloadComponents,
      frontendDamageEventsForTarget,
      frontendSkillEvent,
      frontendSkillVfxKey,
      frontendUniqueTargetsByDistance,
      frontendKnockbackLockMs: FRONTEND_KNOCKBACK_LOCK_MS,
      frontendMeleeArcTargets,
      frontendRuntimeRoll,
      frontendSkillDotDamageMultiplier,
      isThundercloudSkill,
      statValue
    });
  }

  function buildFrontendNovaSkillEvents(skill: SkillPreview, caster: PlayerRuntimeState, current: Enemy[]) {
    return buildFrontendNovaSkillEventsFromRuntime(skill, caster, current, {
      convertedDamageType,
      damagePayloadComponents,
      frontendDamageEventsForTarget,
      frontendSkillEvent,
      frontendSkillVfxKey,
      frontendUniqueTargetsByDistance,
      frontendKnockbackLockMs: FRONTEND_KNOCKBACK_LOCK_MS,
      frontendMeleeArcTargets,
      frontendRuntimeRoll,
      frontendSkillDotDamageMultiplier,
      isThundercloudSkill,
      statValue
    }, elapsedRef.current * 1000);
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



  function registerActiveDamageZone(event: SkillEvent, zoneId: string, origin: { x: number; y: number }, direction: { x: number; y: number }, shape: "circle" | "rectangle") {
    const runtime = createActiveDamageZoneRuntime(event, zoneId, origin, direction, shape, enemiesStateRef.current.length);
    if (!runtime) return;
    activeDamageZones.current = replaceActiveDamageZoneRuntime(activeDamageZones.current, runtime);
  }


  function activeDamageZoneRuntimeTickEvents(zone: ActiveDamageZoneRuntime) {
    return buildActiveDamageZoneRuntimeTickEvents(zone, {
      player: playerStateRef.current,
      enemies: enemiesStateRef.current,
      frontendUniqueTargetsByDistance,
      damageNumberText,
      stablePercent,
      frontendBaseKnockbackDistance: FRONTEND_BASE_KNOCKBACK_DISTANCE,
      frontendKnockbackLockMs: FRONTEND_KNOCKBACK_LOCK_MS
    });
  }

  function activeDamageZoneTickProgress(zoneId: string | undefined) {
    if (!zoneId) return undefined;
    const zone = activeDamageZones.current.find((item) => item.zoneId === zoneId);
    return activeDamageZoneTickProgressForZone(zone);
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

  function skillEventConsumerRuntime() {
    return createSkillEventConsumerRuntime({
      refs: {
        scheduledSkillEvents,
        activeDamageZones,
        enemiesStateRef,
        playerStateRef,
        activePlayerBuffsRef
      },
      visualSetters: {
        setChainSegments,
        setDamageZones,
        setHitVfxs,
        setAreaNovas,
        setMeleeArcs,
        setBolts,
        setTexts
      },
      updateActiveDamageZones: () => 0,
      consumeSkillEventBatch: () => undefined,
      activeDamageZoneRuntimeTickEvents,
      advanceActiveDamageZoneRuntime,
      applyChannelMovementBuff,
      applyDamageEventBatch,
      applyEnemyBuffApplyEvent,
      applyEnemyStatusBuff,
      applyForcedMovementEvent,
      applyPlayerStatusBuffEvent,
      capRuntimeVisualBudget,
      clamp,
      damageDisplayKey,
      damageEventAmountAgainstEnemy,
      damageNumberText,
      finishCompletedProjectileBody,
      floatingTextDamageComponents,
      hitVfxTargetId,
      isFrontendPlayerStatusTarget,
      isProjectileTickFollowup,
      liveMonsterProjectileTrajectoryForEvent,
      liveOrbitCenter,
      liveOrbitPosition,
      normalizedVfxScale,
      normalizedWorldDirection,
      playerAttachedAreaKey,
      playerAttachedAreaPosition,
      pointFromUnknown,
      projectileFollowupKey,
      projectileIdFromEvent,
      projectileSpawnPositionForEvent,
      projectileTargetFollowupKey,
      projectileVfxKind,
      registerActiveDamageZone,
      shapeEffectsFromUnknown,
      shouldSuppressProjectileFollowup,
      stablePercent,
      targetedEnemyForEvent,
      uniqueDamageZonesByZoneId,
      MAX_RUNTIME_AREA_VFX,
      MAX_RUNTIME_FLOATING_TEXT,
      MAX_RUNTIME_HIT_VFX,
      MAX_RUNTIME_PROJECTILE_VISUALS,
      PENETRATING_SHOT_IMPACT_DURATION_MS,
      PROJECTILE_BODY_EXIT_FADE_DURATION,
      nextAreaNovaId,
      nextBoltId,
      nextChainSegmentId,
      nextDamageZoneId,
      nextHitVfxId,
      nextMeleeArcId,
      nextPlayerBuffId,
      nextTextId,
      setRuntimePlayerBuffs
    });
  }

  function consumeSkillEventBatch(events: SkillEvent[]) {
    return skillEventConsumerRuntime().consumeSkillEventBatch(events);
  }

  function consumeSkillEventTimeline(events: SkillEvent[]) {
    return skillEventConsumerRuntime().consumeSkillEventTimeline(events);
  }

  function consumeImmediateSkillEvents(events: SkillEvent[]) {
    return skillEventConsumerRuntime().consumeImmediateSkillEvents(events);
  }

  function consumeScheduledSkillEvents(dt: number) {
    return skillEventConsumerRuntime().consumeScheduledSkillEvents(dt);
  }

  function updateActiveDamageZones(dt: number) {
    return skillEventConsumerRuntime().updateActiveDamageZones(dt);
  }

  function consumeSkillEvent(event: SkillEvent) {
    return skillEventConsumerRuntime().consumeSkillEvent(event);
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
    const applyChance = 100 - enemyStatusApplyResistancePercent(targetEnemy, statusType, (type) => frontendElementalAilmentTypes().has(type));
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
      stackMode: frontendEnemyBuffStackModeFromValue(payload.stack_mode),
      stackCount: 1,
      maxStacks: Math.max(1, Math.round(Number(payload.max_stacks ?? 1))),
      damageType: event.damage_type,
      nextFloatingTextIn: DOT_FLOATING_TEXT_INTERVAL_SECONDS,
      sourceSkillId
    };
    const next = enemiesStateRef.current.map((enemy) => {
      if (enemy.id !== targetId || enemy.hp <= 0) return enemy;
      const existing = (enemy.activeBuffs ?? []).find((buff) => buff.statusType === nextBuff.statusType && buff.sourceSkillId === nextBuff.sourceSkillId);
      const mergedBuff = mergeFrontendEnemyStatusBuff(existing, nextBuff);
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
    if (nextState.equipment_slots) setEquipmentSlots(normalizeEquipmentSlotsState(nextState.equipment_slots, EQUIPMENT_SLOT_COUNT));
  }

  function damageApplicationRuntime() {
    return createDamageApplicationRuntime({
      enemiesStateRef,
      setEnemies,
      setRuntimePlayer,
      setKills,
      setCombatLogs,
      consumeSkillEventBatch,
      applyDamageToEnemyResources,
      damageEventAmountAgainstEnemy,
      elapsedRef,
      frontendSkillEvent,
      frontendUniqueTargetsByDistance,
      gainWarIntentPoint,
      onKillRecastCounts,
      recoverFrontendPlayerOnHit,
      shouldRetainEnemyForGameplayOrDamageFlash,
      spawnFrontendDrops,
      stablePercent
    });
  }

  function applyDamageEventBatch(events: SkillEvent[]) {
    return damageApplicationRuntime().applyDamageEventBatch(events);
  }

async function placeFloatingItem(current: FloatingGem, target: DropTarget, event: globalThis.MouseEvent): Promise<PlacementResult> {
    if (target.kind === "invalid") return { type: "reject" };
    if (isDropBackToOrigin(current, target, state, inventorySlotsForItem(current.gem), equipmentSlots, normalizeStashPages(state?.stash_pages))) return { type: "place" };
    if (target.kind === "map") {
      if (isInventoryItemLocked(current.gem.instance_id)) {
        showPlacementPrompt("物品已锁定，不能丢弃。", event.clientX, event.clientY);
        return { type: "reject" };
      }
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
    const targetItem = inventoryItemById(state, inventorySlotsForItem(dragged)[slotIndex]);
    setEquipmentSlots((slots) => removeItemsFromEquipmentSlots(slots, [instanceId]));
    moveItemToBagSlot(dragged, slotIndex);
    setActiveInventoryBagTab(inventoryBagTabForItem(dragged));
    if (!dragged.board_position) {
      applyFrontendState((currentState) => ({
        ...currentState,
        stash_pages: removeItemsFromStashPages(currentState.stash_pages, [instanceId]),
        equipment_slots: removeItemsFromEquipmentSlots(normalizeEquipmentSlotsState(currentState.equipment_slots ?? [], EQUIPMENT_SLOT_COUNT), [instanceId]),
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
    removeItemsFromBagSlots([instanceId, targetItem?.instance_id ?? ""]);
    setEquipmentSlots((slots) => removeItemsFromEquipmentSlots(slots, [instanceId]));
    applyFrontendState((currentState) => {
      const unmountedState = dragged.board_position ? optimisticUnmountBoardItem(currentState, instanceId) : currentState;
      return {
        ...unmountedState,
        stash_pages: moveItemToStashSlot(unmountedState.stash_pages, instanceId, safePageIndex, safeSlotIndex),
        equipment_slots: removeItemsFromEquipmentSlots(normalizeEquipmentSlotsState(unmountedState.equipment_slots ?? [], EQUIPMENT_SLOT_COUNT), [instanceId])
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
    const previousInventorySlots = activeInventorySlots;
    const previousEquipmentSlots = equipmentSlots;
    setEquipmentSlots((slots) => moveItemToEquipmentSlotState(removeItemsFromEquipmentSlots(slots, displacedIds), instanceId, targetIndices, EQUIPMENT_SLOT_COUNT));
    removeItemsFromBagSlots([instanceId, targetItem?.instance_id ?? ""]);
    applyFrontendState((currentState) => ({
      ...currentState,
      stash_pages: removeItemsFromStashPages(currentState.stash_pages, [instanceId]),
      equipment_slots: moveItemToEquipmentSlotState(
        removeItemsFromEquipmentSlots(normalizeEquipmentSlotsState(currentState.equipment_slots ?? [], EQUIPMENT_SLOT_COUNT), displacedIds),
        instanceId,
        targetIndices,
        EQUIPMENT_SLOT_COUNT
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
    const previousInventorySlots = activeInventorySlots;
    const previousEquipmentSlots = equipmentSlots;
    applyFrontendState((currentState) => ({
      ...optimisticPlaceItemOnBoard(currentState, instanceId, row, column, targetItem?.instance_id),
      stash_pages: removeItemsFromStashPages(currentState.stash_pages, [instanceId, targetItem?.instance_id ?? ""])
    }));
    removeItemsFromBagSlots([instanceId, targetItem?.instance_id ?? ""]);
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
    if (isInventoryItemLocked(instanceId)) {
      setNotice("物品已锁定，不能丢弃。");
      return;
    }
    const drop = createDiscardDrop(prompt.item, prompt.position);
    dropDisplayPositions.current.set(drop.drop_id, prompt.position);
    knownDropIds.current.add(drop.drop_id);
    removeItemsFromBagSlots([instanceId]);
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
    return resolveSelectedFrontendMapStage(stages, stageIdOverride) as MapProgressionStageView | null;
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
      .map((enemy, index) => createGuaranteedNextMapEntryDrop(enemy, stage, stages, index, () => frontendDropId.current++) as DropPrompt | null)
      .filter((drop): drop is DropPrompt => Boolean(drop));
    const drops = killedEnemies
      .flatMap((enemy, index) => {
        const attempts = frontendMonsterDropAttempts(enemy, index, elapsedRef.current);
        return Array.from({ length: attempts }, (_, attemptIndex) => createFrontendDrop(enemy, index * 100 + attemptIndex, {
          stage,
          stages,
          gmGems: gmOptions?.gems ?? [],
          elapsedSeconds: elapsedRef.current,
          nextDropId: () => frontendDropId.current++,
          fallbackBaseGemInstanceId: state?.inventory.find((item) => item.item_kind !== "equipment")?.instance_id
        }) as DropPrompt | null);
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

  function createFrontendInventoryItemFromDrop(drop: DropPrompt, current: AppState): Gem {
    return createFrontendInventoryItem(drop, current, {
      cloneFrontendData,
      cloneFrontendInitialAppStateSeed,
      frontendGemDropPool,
      gmEquipmentSources: gmOptions?.equipment_sources ?? [],
      nextItemId: () => frontendItemId.current++
    }) as Gem;
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
      inventory: [...current.inventory, createFrontendInventoryItemFromDrop(target, current)]
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
    if (inventoryLockMode) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
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
  const lockedItemIds = useMemo(() => {
    const result = new Set<string>();
    for (const item of state?.inventory ?? []) {
      const rarityLocked = isInventoryItemLockedByRarity(item, activeLockRarities);
      if ((rarityLocked && !manualUnlockedItemIds.has(item.instance_id)) || manualLockedItemIds.has(item.instance_id)) {
        result.add(item.instance_id);
      }
    }
    return result;
  }, [activeLockRarities, manualLockedItemIds, manualUnlockedItemIds, state]);
  const isInventoryItemLocked = (instanceId: string) => lockedItemIds.has(instanceId);
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
  const activeInventorySlots = activeInventoryBagTab === "gem" ? gemInventorySlots : equipmentInventorySlots;
  const bagSlots = activeInventorySlots.map((instanceId) => (instanceId ? fullGemById.get(instanceId) ?? null : null));
  const equippedItems = equipmentSlots.map((instanceId) => (instanceId ? fullGemById.get(instanceId) ?? null : null));
  const stashPages = normalizeStashPages(state?.stash_pages, state ?? undefined);
  const activeStashSlots = stashPages[stashPageIndex] ?? [];

  function inventoryBagTabForItem(item: Gem): InventoryBagTab {
    return isGemItem(item) ? "gem" : "equipment";
  }

  function inventorySlotsForItem(item: Gem) {
    return inventoryBagTabForItem(item) === "gem" ? gemInventorySlots : equipmentInventorySlots;
  }

  function removeItemsFromBagSlots(instanceIds: string[]) {
    setEquipmentInventorySlots((slots) => removeItemsFromInventorySlots(slots, instanceIds));
    setGemInventorySlots((slots) => removeItemsFromInventorySlots(slots, instanceIds));
  }

  function moveItemToBagSlot(item: Gem, slotIndex: number) {
    const setSlots = isGemItem(item) ? setGemInventorySlots : setEquipmentInventorySlots;
    setSlots((slots) => moveItemToInventorySlotState(slots, item.instance_id, slotIndex, INVENTORY_SLOT_COUNT));
  }

  function changeInventoryBagTab(tab: InventoryBagTab) {
    setActiveInventoryBagTab(tab);
    setHoveredBagSlot(null);
    setHoveredGemId(null);
    setTooltip(null);
  }

  function toggleInventoryLockMode() {
    clearFloatingGem();
    clearDragHoverState();
    setInventoryLockMode((current) => !current);
  }

  function toggleInventoryItemLock(instanceId: string) {
    const currentlyLocked = isInventoryItemLocked(instanceId);
    setManualLockedItemIds((current) => {
      const next = new Set(current);
      if (currentlyLocked) next.delete(instanceId);
      else next.add(instanceId);
      return next;
    });
    setManualUnlockedItemIds((current) => {
      const next = new Set(current);
      if (currentlyLocked) next.add(instanceId);
      else next.delete(instanceId);
      return next;
    });
  }

  function toggleInventoryLockRarity(rarity: InventoryLockRarity) {
    setActiveLockRarities((current) => {
      const next = new Set(current);
      if (next.has(rarity)) next.delete(rarity);
      else next.add(rarity);
      return next;
    });
  }

  function organizeActiveInventoryTab() {
    if (floatingGemRef.current) {
      setNotice("请先放下正在拖动的物品，再整理背包。");
      return;
    }
    clearDragHoverState();
    setHoveredGemId(null);
    setTooltip(null);
    const nextSlots = (slots: (string | null)[]) => organizeInventorySlots(slots, fullGemById, activeInventoryBagTab, lockedItemIds);
    if (activeInventoryBagTab === "gem") {
      setGemInventorySlots(nextSlots);
      setNotice("已整理宝石页签。");
      return;
    }
    setEquipmentInventorySlots(nextSlots);
    setNotice("已整理装备页签。");
  }

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
          return createFrontendInventoryItemFromDrop(drop, current);
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
        const item = createFrontendInventoryItemFromDrop(drop, current);
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
  const anchoredBolts = anchorProjectilesToTargets(bolts, enemies, usesCanvasProjectileVfx);
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
    statNumber(state.player_stats?.move_speed, PLAYER_SPEED) * playerMovementSpeedMultiplier(activePlayerBuffs),
    PLAYER_SPEED
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
        <AppTopHud
          title={APP_TITLE}
          notice={notice}
          skillEditorMode={skillEditorMode}
          onOpenSkillEditor={openSkillEditorPanel}
        />
      )}

      {!monsterTestMode && !skillEditorMode && entryStep === "title" && (
        <EntryTitleScreen
          title={APP_TITLE}
          onStart={() => {
            refreshFrontendSaveSlots();
            setEntryStep("save");
            setNotice("请选择新建游戏、继续游戏或存档槽位。");
          }}
        />
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

      <GameShellOverlays
        releaseDebugToolsEnabled={RELEASE_DEBUG_TOOLS_ENABLED}
        monsterTestMode={monsterTestMode}
        skillEditorMode={skillEditorMode}
        playing={playing}
        restAreaMapActive={restAreaMapActive}
        entryStep={entryStep}
        restAreaPanel={restAreaPanel}
        gameFailureOpen={gameFailureOpen}
        battlePauseOpen={battlePauseOpen}
        battlePauseView={battlePauseView}
        bossPortalConfirm={bossPortalConfirm}
        mapDebugEnabled={mapDebugEnabled}
        proceduralSpawnDebug={proceduralSpawnDebug}
        spawnPlanWarnings={spawnPlanWarnings}
        runtimeBoundaryScanLine={runtimeBoundaryScanLine}
        runtimeDebugCornerSummary={runtimeDebugCornerSummary}
        combatLogs={combatLogs}
        skillEditorDebugOptions={skillEditorDebugOptions}
        skillEditorCameraSettings={skillEditorCameraSettings}
        battleMapReady={Boolean(battleMap)}
        progression={state.map_progression}
        resolutionPresets={GAME_RESOLUTION_PRESETS}
        resolutionMode={gameResolutionMode}
        stageScopeText={stageScopeLabel}
        stageBossPoolText={stageBossPackPoolLabel}
        onMapDebugChange={setMapDebugEnabled}
        onGameFailureClose={() => setGameFailureOpen(false)}
        onPauseViewChange={setBattlePauseView}
        onResolutionModeChange={applyGameResolutionMode}
        onPauseContinue={continueBattleFromPause}
        onExitRun={exitCurrentRunToRestArea}
        onEndGame={endGameToTitle}
        onPortalConfirm={confirmBossPortalExit}
        onPortalCancel={cancelBossPortalConfirm}
        onSkillEditorDebugOptionsChange={setSkillEditorDebugOptions}
        onSkillEditorCameraSettingsChange={setSkillEditorCameraSettings}
        onStartStage={startGame}
        onCloseRestAreaPanel={closeRestAreaPanel}
      />

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

      {bagOpen && (
        <InventoryOverlay>
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
            <EquipmentPanel
              slotSpecs={EQUIPMENT_SLOT_SPECS}
              equippedItems={equippedItems}
              equipmentSlots={equipmentSlots}
              mainWeaponSlotIndex={MAIN_WEAPON_SLOT_INDEX}
              offWeaponSlotIndex={OFF_WEAPON_SLOT_INDEX}
              hoveredEquipmentSlot={hoveredEquipmentSlot}
              hoveredGemId={hoveredGemId}
              floatingGem={floatingGem}
              lockModeActive={inventoryLockMode}
              isTwoHandedWeapon={isTwoHandedWeapon}
              isFloatingOrigin={isFloatingOrigin}
              itemCellClassName={resolveEquipmentCellClass}
              emptyCellClassName={equipmentEmptyCellClass}
              renderGem={(gem) => <GemOrb gem={gem} />}
              renderGhost={() => <GemGhost />}
              onBeginDrag={beginDrag}
              onPointerDrag={beginPointerDrag}
              onHoverGem={onGemHover}
              onHoverEquipmentSlot={setHoveredEquipmentSlot}
              onLeaveEquipmentSlot={() => setHoveredEquipmentSlot(null)}
              onLeaveGem={() => {
                setHoveredGemId(null);
                setTooltip(null);
              }}
            />

            <InventorySkillBoardPanel
              cells={state.board.cells}
              fullGemById={fullGemById}
              hoveredBoardGemId={hoveredBoardGemId}
              linkedGemIds={linkedGemIds}
              supportPreview={supportPreview}
              floatingGemId={floatingGem?.gem.instance_id ?? null}
              selectedGemInstanceId={selectedGemInstanceId}
              legalPlacementCells={legalPlacementCells}
              hoveredBoardCell={hoveredBoardCell}
              previewCell={previewCell}
              previewAffectedCells={previewAffectedCells}
              previewInvalidReason={previewInvalidReason}
              persistentSupportLines={persistentSupportLines}
              activeTargetLines={activeTargetLines}
              showPersistentSupportLines={showPersistentSupportLines}
              placementPreview={placementPreview}
              interactionDisabled={inventoryLockMode}
              renderGem={(gem) => <GemOrb gem={gem} />}
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
              onTogglePersistentSupportLines={setShowPersistentSupportLines}
            />

            <InventoryBagPanel
              activeTab={activeInventoryBagTab}
              slots={bagSlots}
              floatingGem={floatingGem}
              hoveredBagSlot={hoveredBagSlot}
              hoveredGemId={hoveredGemId}
              lockModeActive={inventoryLockMode}
              lockedItemIds={lockedItemIds}
              activeLockRarities={activeLockRarities}
              cellClassName={resolveBagCellClass}
              emptyCellClassName={bagEmptyCellClass}
              isFloatingOrigin={isFloatingOrigin}
              renderGem={(gem) => <GemOrb gem={gem} />}
              renderGhost={() => <GemGhost />}
              onTabChange={changeInventoryBagTab}
              onBeginDrag={beginDrag}
              onPointerDrag={beginPointerDrag}
              onToggleLockMode={toggleInventoryLockMode}
              onToggleItemLock={toggleInventoryItemLock}
              onToggleLockRarity={toggleInventoryLockRarity}
              onOrganize={organizeActiveInventoryTab}
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
        </InventoryOverlay>
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
    equipment_slots: removeItemsFromEquipmentSlots(normalizeEquipmentSlotsState(state.equipment_slots ?? [], EQUIPMENT_SLOT_COUNT), [instanceId]),
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

function sanitizeEquipmentSlotsForState(state: AppState): AppState {
  const normalizedSlots = normalizeEquipmentSlotsState(state.equipment_slots ?? [], EQUIPMENT_SLOT_COUNT);
  const equipment_slots = normalizedSlots.map((instanceId, slotIndex) => {
    if (!instanceId) return null;
    const item = inventoryItemById(state, instanceId);
    const slot = EQUIPMENT_SLOT_SPECS[slotIndex];
    return item && slot && canPlaceItemInEquipmentSlot(item, slot) ? instanceId : null;
  });
  return { ...state, equipment_slots };
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

function monsterSkillMaterializedParams(skill: MonsterSkillDefinition | null, bossPattern?: MonsterBossPattern | null): Record<string, unknown> | undefined {
  if (skill) {
    return {
      module: skill.module,
      cooldown_ms: skill.cooldown_ms,
      windup_ms: skill.windup_ms,
      range: skill.range,
      damage_multiplier: skill.damage_multiplier,
      projectile_speed: skill.projectile_speed,
      projectile_count: skill.projectile_count,
      radius: skill.radius,
      warning_ms: skill.warning_ms,
      buff_radius: skill.buff_radius,
      guard_duration_ms: skill.guard_duration_ms
    };
  }
  if (!bossPattern) return undefined;
  return {
    boss_pattern_id: bossPattern.id,
    skill_count: bossPattern.skills.length,
    skills: bossPattern.skills.map((patternSkill) => ({
      id: patternSkill.id,
      role: patternSkill.role,
      module: patternSkill.module,
      cooldown_ms: patternSkill.cooldown_ms,
      initial_cooldown_ms: patternSkill.initial_cooldown_ms,
      range: patternSkill.range
    }))
  };
}

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
    const bossPattern = monsterBossPatternFor(MONSTER_SKILL_CONFIG, skillAssignment?.boss_pattern_id);
    const bossMajorSkill = bossPattern?.skills.find((skill) => skill.role === "major");
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
      monsterSkillModule: baseSkill?.module,
      monsterSkillRange: baseSkill?.range,
      monsterSkillCooldownMs: baseSkill?.cooldown_ms,
      monsterBossPatternSkillCount: bossPattern?.skills.length,
      monsterBossMajorInitialCooldownMs: bossMajorSkill?.initial_cooldown_ms,
      monsterSkillParams: monsterSkillMaterializedParams(baseSkill, bossPattern),
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

function normalizedWorldDirection(direction: { x: number; y: number }) {
  const length = Math.hypot(direction.x, direction.y) || 1;
  return { x: direction.x / length, y: direction.y / length };
}

function worldDirectionToBattleScreenAngle(direction: { x: number; y: number }, origin: { x: number; y: number }) {
  const start = projectBattleWorldToScreen(origin.x, origin.y);
  const end = projectBattleWorldToScreen(origin.x + direction.x, origin.y + direction.y);
  return Math.atan2(end.y - start.y, end.x - start.x);
}

function randomAngleOffset(maxDegrees: number) {
  if (maxDegrees <= 0) return 0;
  return (Math.random() * 2 - 1) * maxDegrees;
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

function renderBattleRenderItem(item: BattlePresentationRenderItem, depthIndex: number, animationContexts: BattleAnimationContexts) {
  return renderBattlePresentationItem(item, depthIndex, animationContexts, battleRenderPresentationHelpers());
}

function shouldRenderLegacyBattleItem(item: BattleRenderItem) {
  return shouldRenderLegacyBattleItemState(item, CANVAS_GEOMETRY_BATTLE_OBJECTS, CANVAS_GEOMETRY_SKILL_EFFECTS);
}

function battleRenderPresentationHelpers(): BattleRenderPresentationHelpers {
  return {
    projectBattleWorldToScreen,
    normalizedWorldDirection,
    worldDirectionToBattleScreenAngle,
    hasShapeEffect,
    clamp,
    zIndexBase: BATTLE_ENTITY_Z_INDEX_BASE,
    unitRenderScale: UNIT_RENDER_SCALE,
    enemyHealthVisibleSeconds: ENEMY_HEALTH_VISIBLE_SECONDS,
    enemyDamageFlashSeconds: ENEMY_DAMAGE_FLASH_SECONDS
  };
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
  const baseSkillLevelSection = frontendSkillPreviewBaseLevelSection(skill, frontendRecord);
  const projectileLine = frontendProjectileCountTooltipLine(gem, skill, statValue, formatPreviewNumber);
  const channelLines = frontendChannelStackTooltipLines(gem, skill, formatPreviewNumber);
  const guardLines = frontendGuardTooltipLines(skill, formatPreviewNumber);
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
        base_skill_level: baseSkillLevelSection,
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

  function damageDisplayKey(event: Pick<SkillEvent, "target_entity" | "skill_instance_id" | "payload">) {
    return [
      event.skill_instance_id,
      String(event.target_entity ?? event.payload?.target_entity ?? ""),
      String(event.payload?.zone_id ?? event.payload?.area_id ?? event.payload?.projectile_id ?? ""),
      String(event.payload?.tick_index ?? ""),
      String(event.payload?.tick_time_ms ?? event.payload?.hit_marker_event_id ?? event.payload?.marker_id ?? "")
    ].join("|");
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
  const bossPattern = monsterBossPatternFor(MONSTER_SKILL_CONFIG, skillAssignment?.boss_pattern_id);
  const bossMajorSkill = bossPattern?.skills.find((skill) => skill.role === "major");
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
    monsterSkillModule: baseSkill?.module,
    monsterSkillRange: baseSkill?.range,
    monsterSkillCooldownMs: baseSkill?.cooldown_ms,
    monsterBossPatternSkillCount: bossPattern?.skills.length,
    monsterBossMajorInitialCooldownMs: bossMajorSkill?.initial_cooldown_ms,
    monsterSkillParams: monsterSkillMaterializedParams(baseSkill, bossPattern),
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
