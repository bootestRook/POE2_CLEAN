import { ReactNode, useEffect, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { clientToGameViewportPoint, currentGameViewportMetrics } from "../../utils/gameViewportMetrics";
import { unprojectScreenToWorld } from "../../isoProjection";
import type {
  SkillEditorCameraSettings,
  SkillEditorDebugOptions,
  SkillEditorEntry,
  SkillEditorModifierPreview,
  SkillEditorModifierPreviewResponse,
  SkillEditorModifierStat,
  SkillEditorOption,
  SkillEditorSaveResponse,
  SkillEditorState,
  SkillPackageData,
  SkillTestArenaEnemy,
  SkillTestArenaResponse,
  SkillTestArenaResult,
  SkillTestArenaStage,
  SkillTestArenaView,
  SkillEventTimelineItem
} from "../../types/skillEditorTypes";
import { requestSkillEditorModifierPreview, requestSkillEditorSave, requestSkillTestArenaRun } from "./disabledSkillEditorRequests";
import { normalizeSkillEditorCameraSettings, saveSkillEditorCameraSettings, SKILL_EDITOR_CAMERA_MAX_ZOOM, SKILL_EDITOR_CAMERA_MIN_ZOOM } from "./disabledSkillEditorSettings";

type AppState = any;
type Camera2D = { screenX: number; screenY: number; zoom: number };
type RuntimePerfSummary = { frame_ms: number; logic_ms: number };
const MAX_SKILL_EDITOR_TIMELINE_ROWS = 40;

function projectBattleWorldToScreen(worldX: number, worldY: number) {
  return { x: worldX, y: worldY };
}

function isProjectileSkillTemplate(behaviorTemplate: string | undefined) {
  return behaviorTemplate === "projectile" || behaviorTemplate === "line_pierce";
}

export function SkillEditorPanel({
  editor,
  selectedId,
  onSelect,
  onState,
  onPreviewPackage,
  playerPosition,
  battleCamera,
  cameraSettings,
  debugOptions,
  runtimePerfSummary,
  onCameraSettingsChange,
  onDebugOptionsChange,
  onClose
}: {
  editor: SkillEditorState;
  selectedId: string;
  onSelect: (skillId: string) => void;
  onState: (state: AppState) => void;
  onPreviewPackage: (packageData: SkillPackageData | null) => void;
  playerPosition: { x: number; y: number };
  battleCamera: Camera2D;
  cameraSettings: SkillEditorCameraSettings;
  debugOptions: SkillEditorDebugOptions;
  runtimePerfSummary: RuntimePerfSummary;
  onCameraSettingsChange: (settings: SkillEditorCameraSettings) => void;
  onDebugOptionsChange: (options: SkillEditorDebugOptions) => void;
  onClose: () => void;
}) {
  const selectedEntry = (editor.entries.find((entry) => entry.id === selectedId && entry.openable)
    ?? editor.entries.find((entry) => entry.openable)
    ?? null) as SkillEditorEntry;
  const detail = selectedEntry?.detail ?? null;
  const [draftState, setDraft] = useState<SkillPackageData | null>(() => clonePackageData(selectedEntry?.package_data ?? null));
  const draft = draftState as SkillPackageData;
  const [draftSourceId, setDraftSourceId] = useState(selectedEntry?.id ?? "");
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedModifierIds, setSelectedModifierIds] = useState<string[]>([]);
  const [testRelation, setTestRelation] = useState("adjacent");
  const [sourcePower, setSourcePower] = useState(1);
  const [targetPower, setTargetPower] = useState(1);
  const [conduitPower, setConduitPower] = useState(1);
  const [modifierPreview, setModifierPreview] = useState<SkillEditorModifierPreview | null>(null);
  const [modifierMessage, setModifierMessage] = useState("");
  const [modifierPreviewing, setModifierPreviewing] = useState(false);
  const [arenaSkillId, setArenaSkillId] = useState("active_split_firebolt");
  const [arenaSceneId, setArenaSceneId] = useState(editor.test_arena.scenes[0]?.scene_id ?? "single_dummy");
  const [arenaUseModifierStack, setArenaUseModifierStack] = useState(false);
  const [arenaResult, setArenaResult] = useState<SkillTestArenaResult | null>(null);
  const [arenaStageIndex, setArenaStageIndex] = useState(0);
  const [arenaMessage, setArenaMessage] = useState("");
  const [arenaRunning, setArenaRunning] = useState(false);
  const [arenaPaused, setArenaPaused] = useState(false);
  const [cameraZoomDraft, setCameraZoomDraft] = useState(cameraSettings.zoom);
  const [cameraMessage, setCameraMessage] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("projectile_spawn");
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [runLogs, setRunLogs] = useState<string[]>([]);
  const [launchAdjustmentSnapshot, setLaunchAdjustmentSnapshot] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const nextId = selectedEntry?.id ?? "";
    if (nextId === draftSourceId) return;
    setDraft(clonePackageData(selectedEntry?.package_data ?? null));
    setDraftSourceId(nextId);
    setSaveMessage("");
    setSelectedModifierIds([]);
    setModifierPreview(null);
    setModifierMessage("");
    setArenaResult(null);
    setArenaStageIndex(0);
    setArenaMessage("");
    setArenaPaused(false);
    setSelectedEventType("projectile_spawn");
    setValidationErrors([]);
    setRunLogs([]);
    setLaunchAdjustmentSnapshot(null);
  }, [selectedEntry?.id, selectedEntry?.package_data, draftSourceId]);

  useEffect(() => {
    onPreviewPackage(selectedEntry?.editable && draft ? draft : null);
  }, [draft, onPreviewPackage, selectedEntry?.editable]);

  useEffect(() => {
    setCameraZoomDraft(cameraSettings.zoom);
  }, [cameraSettings.zoom]);

  function updateDraft(mutator: (next: SkillPackageData) => void) {
    setDraft((current) => {
      const next = clonePackageData(current);
      if (!next) return current;
      mutator(next);
      return next;
    });
  }

  function validateDraftBeforeSave() {
    if (!selectedEntry) return ["当前没有选中的技能。"];
    if (!draft) return ["当前技能包对象不存在，无法保存。"];
    const errors: string[] = [];
    const params = draft.behavior.params ?? {};
    const allowedTemplates = new Set(["projectile", "module_chain", "chain", "player_nova", "melee_arc", "damage_zone", "orbit_emitter", "line_pierce", "orbit", "delayed_area"]);
    const projectileAllowedParams = new Set([
      "projectile_count",
      "burst_interval_ms",
      "spread_angle_deg",
      "angle_step",
      "random_angle_jitter_deg",
      "projectile_speed",
      "projectile_width",
      "projectile_height",
      "max_distance",
      "hit_policy",
      "pierce_count",
      "collision_radius",
      "spawn_offset",
      "projectile_radius",
      "impact_radius",
      "max_targets",
      "trajectory",
      "travel_time_ms",
      "arc_height",
      "target_policy",
      "impact_marker_id",
      "vfx_key",
      "min_duration_ms",
      "max_duration_ms"
    ]);
    const playerNovaAllowedParams = new Set([
      "radius",
      "expand_duration_ms",
      "hit_at_ms",
      "max_targets",
      "center_policy",
      "damage_falloff_by_distance",
      "ring_width",
      "status_chance_scale"
    ]);
    const meleeArcAllowedParams = new Set([
      "arc_angle",
      "arc_radius",
      "windup_ms",
      "hit_at_ms",
      "max_targets",
      "facing_policy",
      "hit_shape",
      "status_chance_scale",
      "slash_vfx_key"
    ]);
    const damageZoneAllowedParams = new Set([
      "shape",
      "origin_policy",
      "facing_policy",
      "hit_at_ms",
      "max_targets",
      "status_chance_scale",
      "zone_vfx_key",
      "radius",
      "length",
      "width",
      "angle_offset_deg",
      "expand_duration_ms",
      "ring_width",
      "trigger_marker_id",
      "trigger_delay_ms",
      "vfx_key"
    ]);
    const chainAllowedParams = new Set([
      "chain_count",
      "chain_radius",
      "chain_delay_ms",
      "damage_falloff_per_chain",
      "target_policy",
      "allow_repeat_target",
      "max_targets",
      "segment_vfx_key"
    ]);
    const orbitEmitterAllowedParams = new Set([
      "orbit_center_policy",
      "duration_ms",
      "tick_interval_ms",
      "orbit_radius",
      "orbit_speed_deg_per_sec",
      "orb_count",
      "start_angle_deg",
      "orbit_radius_cycle_enabled",
      "orbit_radius_cycle_amplitude",
      "orbit_radius_cycle_period_ms",
      "orbit_radius_cycle_phase_deg",
      "tick_marker_id",
      "spawn_vfx_key",
      "tick_vfx_key"
    ]);
    const allowedParams = draft.behavior.template === "player_nova"
      ? playerNovaAllowedParams
      : draft.behavior.template === "melee_arc"
          ? meleeArcAllowedParams
          : draft.behavior.template === "damage_zone"
            ? damageZoneAllowedParams
            : draft.behavior.template === "chain"
              ? chainAllowedParams
              : draft.behavior.template === "orbit_emitter"
                ? orbitEmitterAllowedParams
                : projectileAllowedParams;

    if (draft.id !== selectedEntry.id) errors.push("技能 ID 必须与当前选择的技能一致。");
    if (!allowedTemplates.has(draft.behavior.template)) errors.push("行为模板不在允许范围内。");
    if (draft.presentation.vfx_scale !== undefined) requireNumberRange(draft.presentation.vfx_scale, "特效放大倍数", 0.1, 10, errors);
    if (isProjectileSkillTemplate(draft.behavior.template) || draft.behavior.template === "player_nova" || draft.behavior.template === "melee_arc" || draft.behavior.template === "damage_zone" || draft.behavior.template === "chain" || draft.behavior.template === "orbit_emitter") {
      for (const key of Object.keys(params)) {
        if (!allowedParams.has(key)) errors.push(`行为参数 ${key} 不属于当前行为模板。`);
      }
    }
    if (draft.modules?.length) {
      const markers = new Set<string>();
      for (const module of draft.modules) {
        if (!module.id || !module.type) errors.push("模块必须包含 id 和 type。");
        const moduleParams = module.params ?? {};
        const moduleAllowedParams = module.type === "damage_zone"
          ? damageZoneAllowedParams
          : module.type === "projectile"
            ? projectileAllowedParams
            : module.type === "orbit_emitter"
              ? orbitEmitterAllowedParams
              : allowedParams;
        for (const key of Object.keys(moduleParams)) {
          if (!moduleAllowedParams.has(key)) errors.push(`模块参数 ${module.id}.${key} 不属于 ${module.type}。`);
        }
        if (module.type === "projectile") {
          const marker = String(moduleParams.impact_marker_id ?? "");
          if (!marker) errors.push("投射物模块必须声明落地标识。");
          markers.add(marker);
        } else if (module.type === "orbit_emitter") {
          const marker = String(moduleParams.tick_marker_id ?? "");
          if (!marker) errors.push("环绕模块必须声明 tick 标识。");
          markers.add(marker);
        }
      }
      for (const module of draft.modules) {
        const trigger = module.trigger;
        if (trigger?.trigger_marker_id && !markers.has(String(trigger.trigger_marker_id))) {
          errors.push("伤害区触发标识必须来自已有模块标识。");
        }
      }
    }
    if (draft.behavior.template === "damage_zone") {
      if (!editor.options.zone_shapes.some((option) => option.value === params.shape)) errors.push("结算区域类型必须使用已有选项。");
      if (!editor.options.origin_policies.some((option) => option.value === params.origin_policy)) errors.push("起点规则必须使用已有选项。");
      if (!editor.options.facing_policies.some((option) => option.value === params.facing_policy)) errors.push("朝向规则必须使用已有选项。");
      requireIntegerAtLeast(params.hit_at_ms, "命中时机毫秒", 0, errors);
      requireIntegerAtLeast(params.max_targets, "最大目标数", 1, errors);
      requireNumberRange(params.status_chance_scale, "状态几率倍率", 0, 10, errors);
      if (params.shape === "circle") {
        requireNumberAtLeast(params.radius, "半径", 1, errors);
        requireIntegerAtLeast(params.expand_duration_ms, "扩散时长毫秒", 0, errors);
        requireNumberAtLeast(params.ring_width, "新星环宽", 1, errors);
        if (params.length !== undefined || params.width !== undefined || params.angle_offset_deg !== undefined) errors.push("圆形伤害区域不能写入矩形专属参数。");
      } else if (params.shape === "rectangle") {
        requireNumberAtLeast(params.length, "长度", 1, errors);
        requireNumberAtLeast(params.width, "宽度", 1, errors);
        requireNumberRange(params.angle_offset_deg, "角度", -180, 180, errors);
        if (params.radius !== undefined || params.expand_duration_ms !== undefined || params.ring_width !== undefined) errors.push("矩形伤害区域不能写入圆形专属参数。");
      }
      if (typeof params.zone_vfx_key !== "string" || !/^[a-z][a-z0-9_.-]*\.[a-z0-9_.-]+$/.test(params.zone_vfx_key)) {
        errors.push("区域特效键必须是配置键。");
      }
    } else if (draft.behavior.template === "player_nova") {
      requireNumberAtLeast(params.radius, "半径", 1, errors);
      requireIntegerAtLeast(params.expand_duration_ms, "扩散时长毫秒", 0, errors);
      requireIntegerAtLeast(params.hit_at_ms, "命中时机毫秒", 0, errors);
      if (Number(params.hit_at_ms) > Number(params.expand_duration_ms)) errors.push("命中时机毫秒不能大于扩散时长毫秒。");
      requireIntegerAtLeast(params.max_targets, "最大目标数", 1, errors);
      requireNumberAtLeast(params.ring_width, "新星环宽", 1, errors);
      requireNumberRange(params.status_chance_scale, "状态几率倍率", 0, 10, errors);
      if (params.center_policy !== undefined && !editor.options.center_policies.some((option) => option.value === params.center_policy)) {
        errors.push("中心规则必须使用已有选项。");
      }
      if (params.damage_falloff_by_distance !== undefined && !editor.options.damage_falloff_modes.some((option) => option.value === params.damage_falloff_by_distance)) {
        errors.push("距离衰减规则必须使用已有选项。");
      }
    } else if (draft.behavior.template === "melee_arc") {
      requireNumberRange(params.arc_angle, "扇形角度", 1, 180, errors);
      requireNumberAtLeast(params.arc_radius, "扇形半径", 1, errors);
      requireIntegerAtLeast(params.windup_ms, "前摇毫秒", 0, errors);
      requireIntegerAtLeast(params.hit_at_ms, "命中时机毫秒", 0, errors);
      if (Number(params.hit_at_ms) < Number(params.windup_ms)) errors.push("命中时机毫秒不能早于前摇毫秒。");
      requireIntegerAtLeast(params.max_targets, "最大目标数", 1, errors);
      requireNumberRange(params.status_chance_scale, "状态几率倍率", 0, 10, errors);
      if (!editor.options.facing_policies.some((option) => option.value === params.facing_policy)) {
        errors.push("朝向规则必须使用已有选项。");
      }
      if (!editor.options.hit_shapes.some((option) => option.value === params.hit_shape)) {
        errors.push("命中形状必须使用已有选项。");
      }
      if (typeof params.slash_vfx_key !== "string" || !/^[a-z][a-z0-9_.-]*\.[a-z0-9_.-]+$/.test(params.slash_vfx_key)) {
        errors.push("斩击特效键必须是配置键。");
      }
    } else if (draft.behavior.template === "chain") {
      requireIntegerAtLeast(params.chain_count, "连锁次数", 1, errors);
      requireNumberAtLeast(params.chain_radius, "连锁半径", 1, errors);
      requireIntegerAtLeast(params.chain_delay_ms, "连锁间隔毫秒", 0, errors);
      requireNumberRange(params.damage_falloff_per_chain, "每跳伤害衰减", 0, 1, errors);
      requireIntegerAtLeast(params.max_targets, "最大目标数", 1, errors);
      if (!editor.options.chain_target_policies.some((option) => option.value === params.target_policy)) {
        errors.push("连锁目标规则必须使用已有选项。");
      }
      if (typeof params.allow_repeat_target !== "boolean") {
        errors.push("允许重复命中必须是布尔值。");
      }
      if (typeof params.segment_vfx_key !== "string" || !/^[a-z][a-z0-9_.-]*\.[a-z0-9_.-]+$/.test(params.segment_vfx_key)) {
        errors.push("连锁段特效键必须是配置键。");
      }
    } else if (draft.behavior.template === "orbit_emitter") {
      if (params.orbit_center_policy !== "caster") errors.push("环绕中心第一版只支持 caster。");
      requireIntegerAtLeast(params.duration_ms, "持续毫秒", 1, errors);
      requireIntegerAtLeast(params.tick_interval_ms, "tick 间隔毫秒", 1, errors);
      if (Number(params.tick_interval_ms) > Number(params.duration_ms)) errors.push("tick 间隔毫秒不能大于持续毫秒。");
      requireNumberAtLeast(params.orbit_radius, "轨道半径", 1, errors);
      requireNumberAtLeast(params.orbit_speed_deg_per_sec, "每秒角速度", -Number.MAX_SAFE_INTEGER, errors);
      requireIntegerAtLeast(params.orb_count, "熔岩球数量", 1, errors);
      requireNumberRange(params.start_angle_deg, "起始角度", -360, 360, errors);
      if (params.orbit_radius_cycle_enabled !== undefined && typeof params.orbit_radius_cycle_enabled !== "boolean") errors.push("半径循环开关必须是布尔值。");
      requireNumberAtLeast(params.orbit_radius_cycle_amplitude, "半径循环振幅", 0, errors);
      requireIntegerAtLeast(params.orbit_radius_cycle_period_ms, "半径循环周期毫秒", 1, errors);
      requireNumberRange(params.orbit_radius_cycle_phase_deg, "半径循环相位", -360, 360, errors);
      if (typeof params.tick_marker_id !== "string" || !/^[a-z][a-z0-9_]*$/.test(params.tick_marker_id)) errors.push("tick 标识必须是配置标识。");
      if (typeof params.spawn_vfx_key !== "string" || !/^[a-z][a-z0-9_.-]*\.[a-z0-9_.-]+$/.test(params.spawn_vfx_key)) errors.push("生成特效键必须是配置键。");
      if (typeof params.tick_vfx_key !== "string" || !/^[a-z][a-z0-9_.-]*\.[a-z0-9_.-]+$/.test(params.tick_vfx_key)) errors.push("tick 特效键必须是配置键。");
    } else {
      requirePositiveInteger(params.projectile_count, "投射物数量", errors);
      requireNumberAtLeast(params.projectile_speed, "投射物速度", 1, errors);
      requireNumberAtLeast(params.projectile_width, "投射物宽度", 1, errors);
      requireNumberAtLeast(params.projectile_height, "投射物高度", 1, errors);
      requireNumberAtLeast(params.max_distance, "最大距离", 1, errors);
      requireNumberAtLeast(params.collision_radius, "碰撞半径", 0, errors);
      if (params.burst_interval_ms !== undefined) requireIntegerAtLeast(params.burst_interval_ms, "连发间隔毫秒", 0, errors);
      if (params.pierce_count !== undefined) requireIntegerAtLeast(params.pierce_count, "穿透次数", 0, errors);
      if (params.max_targets !== undefined) requireIntegerAtLeast(params.max_targets, "最大目标数", 1, errors);
      if (params.min_duration_ms !== undefined) requireIntegerAtLeast(params.min_duration_ms, "最短生命周期", 0, errors);
      if (params.max_duration_ms !== undefined) requireIntegerAtLeast(params.max_duration_ms, "最长生命周期", 1, errors);
      if (params.spread_angle_deg !== undefined) requireNumberRange(params.spread_angle_deg, "散射角度", 0, 180, errors);
      if (params.angle_step !== undefined) requireNumberRange(params.angle_step, "角度间隔", 0, 90, errors);
      if (params.random_angle_jitter_deg !== undefined) requireNumberRange(params.random_angle_jitter_deg, "随机角度偏移", 0, 45, errors);
      if (params.hit_policy !== undefined && !editor.options.hit_policies.some((option) => option.value === params.hit_policy)) {
        errors.push("命中后行为必须使用已有选项。");
      }
    }
    if (draft.cast.target_selector && !editor.options.target_selectors.some((option) => option.value === draft.cast.target_selector)) {
      errors.push("目标选择方式必须使用已有选项。");
    }
    if (draft.hit.target_policy && !editor.options.target_policies.some((option) => option.value === draft.hit.target_policy)) {
      errors.push("目标规则必须使用已有选项。");
    }
    if (draft.hit.damage_timing && !editor.options.damage_timings.some((option) => option.value === draft.hit.damage_timing)) {
      errors.push("伤害时机必须使用已有选项。");
    }
    return errors;
  }

  async function saveDraft() {
    if (!selectedEntry || !draft || !selectedEntry.editable) return;
    const nextValidationErrors = validateDraftBeforeSave();
    setValidationErrors(nextValidationErrors);
    if (nextValidationErrors.length > 0) {
      setSaveMessage("保存前校验失败，请先修正面板内错误。");
      return;
    }
    setSaving(true);
    setSaveMessage("正在保存。");
    try {
      const payload: SkillEditorSaveResponse<AppState> = await requestSkillEditorSave(selectedEntry.id, draft);
      onState(payload.state);
      setSaveMessage(payload.message_text);
      if (payload.ok) {
        const refreshed = payload.state.skill_editor?.entries.find((entry) => entry.id === selectedEntry.id);
        setDraft(clonePackageData(refreshed?.package_data ?? null));
        setDraftSourceId(refreshed?.id ?? selectedEntry.id);
      }
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : "保存失败。");
    } finally {
      setSaving(false);
    }
  }

  const projectileParams = draft?.behavior.params;
  const canEdit = Boolean(selectedEntry?.editable && draft);
  const modifierStack = editor.modifier_stack;
  const testArena = editor.test_arena;
  const selectedArenaScene = testArena.scenes.find((scene) => scene.scene_id === arenaSceneId) ?? testArena.scenes[0] ?? null;
  const selectedArenaSkill = testArena.skills.find((skill) => skill.id === arenaSkillId) ?? testArena.skills.find((skill) => skill.testable) ?? null;
  const currentArenaStage = arenaResult?.stages[Math.min(arenaStageIndex, Math.max(0, arenaResult.stages.length - 1))] ?? null;
  const availableModifierById = useMemo(
    () => new Map(modifierStack.available_modifiers.map((modifier) => [modifier.id, modifier])),
    [modifierStack.available_modifiers]
  );
  const selectedModifiers = selectedModifierIds
    .map((modifierId) => availableModifierById.get(modifierId))
    .filter((modifier): modifier is SkillEditorTestModifier => Boolean(modifier));
  const powerError = validateModifierPower(sourcePower, targetPower, conduitPower, modifierStack.power_limits);
  const canAdjustLaunchPoint = Boolean(canEdit && draft?.behavior.template === "projectile");
  const launchAdjustmentActive = Boolean(launchAdjustmentSnapshot && draft);
  const currentLaunchOffset = draft?.behavior.params.spawn_offset ?? { x: 0, y: 0 };
  const currentLaunchWorldPosition = draft
    ? {
        x: playerPosition.x + Number(currentLaunchOffset.x ?? 0),
        y: playerPosition.y + Number(currentLaunchOffset.y ?? 0)
      }
    : playerPosition;

  function beginLaunchPointAdjustment() {
    if (!draft || !canAdjustLaunchPoint) return;
    const offset = draft.behavior.params.spawn_offset ?? { x: 0, y: 0 };
    setSelectedEventType("projectile_spawn");
    onDebugOptionsChange({ ...debugOptions, showLaunchPoints: true, showDirectionLines: true });
    setLaunchAdjustmentSnapshot({
      x: Number(offset.x ?? 0),
      y: Number(offset.y ?? 0)
    });
  }

  function updateLaunchPointFromWorld(worldPosition: { x: number; y: number }) {
    updateDraft((next) => {
      next.behavior.params.spawn_offset = {
        x: Math.round(worldPosition.x - playerPosition.x),
        y: Math.round(worldPosition.y - playerPosition.y)
      };
    });
  }

  function confirmLaunchPointAdjustment() {
    setLaunchAdjustmentSnapshot(null);
    setSaveMessage("发射位置已确认，保存技能包后写入配置。");
  }

  function cancelLaunchPointAdjustment() {
    const snapshot = launchAdjustmentSnapshot;
    if (snapshot) {
      updateDraft((next) => {
        next.behavior.params.spawn_offset = { ...snapshot };
      });
    }
    setLaunchAdjustmentSnapshot(null);
    setSaveMessage("已取消发射位置调整。");
  }

  function addTestModifier(modifierId: string) {
    setSelectedModifierIds((current) => current.includes(modifierId) ? current : [...current, modifierId]);
    setModifierMessage("");
  }

  function removeTestModifier(modifierId: string) {
    setSelectedModifierIds((current) => current.filter((item) => item !== modifierId));
    setModifierPreview(null);
    setModifierMessage("");
  }

  function clearTestModifiers() {
    setSelectedModifierIds([]);
    setModifierPreview(null);
    setModifierMessage("测试栈已清空。");
  }

  async function applyTestModifiers() {
    if (!selectedEntry) return;
    if (powerError) {
      setModifierMessage(powerError);
      return;
    }
    setModifierPreviewing(true);
    setModifierMessage("正在计算测试结果。");
    try {
      const result: SkillEditorModifierPreviewResponse = await requestSkillEditorModifierPreview({
        skill_id: selectedEntry.id,
        modifier_ids: selectedModifierIds,
        relation: testRelation,
        source_power: sourcePower,
        target_power: targetPower,
        conduit_power: conduitPower
      });
      setModifierPreview(result.preview);
      setModifierMessage(result.message_text);
    } catch (error) {
      setModifierPreview(null);
      setModifierMessage(error instanceof Error ? error.message : "测试栈计算失败。");
    } finally {
      setModifierPreviewing(false);
    }
  }

  async function runArenaRequest(finalStage: boolean) {
    if (!draft || !selectedArenaSkill?.testable || !selectedArenaScene) {
      setArenaMessage("当前技能不可测试。");
      setRunLogs((current) => ["当前技能不可测试。", ...current].slice(0, 8));
      return null;
    }
    if (arenaUseModifierStack && powerError) {
      setArenaMessage(powerError);
      setRunLogs((current) => [powerError, ...current].slice(0, 8));
      return null;
    }
    setArenaRunning(true);
    setArenaMessage("正在运行技能测试场。");
    try {
      const arenaPackage = selectedEntry?.id === arenaSkillId
        ? draft
        : clonePackageData(editor.entries.find((entry) => entry.id === arenaSkillId)?.package_data ?? null);
      const response: SkillTestArenaResponse = await requestSkillTestArenaRun({
        skill_id: arenaSkillId,
        scene_id: selectedArenaScene.scene_id,
        package: arenaPackage,
        use_modifier_stack: arenaUseModifierStack,
        modifier_ids: selectedModifierIds,
        relation: testRelation,
        source_power: sourcePower,
        target_power: targetPower,
        conduit_power: conduitPower
      });
      if (!response.ok || !response.result) {
        setArenaResult(null);
        setArenaStageIndex(0);
        setArenaMessage(response.message_text);
        setRunLogs((current) => [response.message_text, ...current].slice(0, 8));
        return null;
      }
      const arenaRunResult = response.result;
      setArenaResult(arenaRunResult);
      setArenaStageIndex(finalStage ? Math.max(0, arenaRunResult.stages.length - 1) : 0);
      setArenaMessage(response.message_text);
      setRunLogs((current) => [`${response.result.skill_name_text} / ${response.result.scene_name_text}：${response.message_text}`, ...current].slice(0, 8));
      return arenaRunResult;
    } catch (error) {
      setArenaResult(null);
      setArenaStageIndex(0);
      const message = error instanceof Error ? error.message : "技能测试场运行失败。";
      setArenaMessage(message);
      setRunLogs((current) => [message, ...current].slice(0, 8));
      return null;
    } finally {
      setArenaRunning(false);
    }
  }

  async function runArena() {
    if (arenaPaused) {
      setArenaMessage("测试已暂停，继续后才能自动推进。");
      return;
    }
    await runArenaRequest(true);
  }

  async function stepArena() {
    if (!arenaResult) {
      await runArenaRequest(false);
      return;
    }
    setArenaStageIndex((current) => Math.min(current + 1, Math.max(0, arenaResult.stages.length - 1)));
    setArenaMessage("已推进一个测试阶段。");
  }

  function pauseArena() {
    setArenaPaused((current) => {
      const next = !current;
      setArenaMessage(next ? "测试已暂停。" : "测试已继续。");
      return next;
    });
  }

  function resetArena() {
    setArenaResult(null);
    setArenaStageIndex(0);
    setArenaPaused(false);
    setArenaMessage("测试场已重置。");
  }

  function saveCameraSettings() {
    const nextSettings = normalizeSkillEditorCameraSettings({ zoom: cameraZoomDraft });
    saveSkillEditorCameraSettings(nextSettings);
    onCameraSettingsChange(nextSettings);
    setCameraZoomDraft(nextSettings.zoom);
    setCameraMessage("镜头 POV 已保存，并应用到所有测试场景。");
  }

  const timelineEvents = arenaResult?.event_timeline ?? [];
  const selectedTimelineEvent = timelineEvents.find((event) => event.type === selectedEventType) ?? timelineEvents[0] ?? null;
  const supportedEventTypes = (arenaResult?.timeline_supported_types.length ? arenaResult.timeline_supported_types : [
    { type: "cast_start", text: "释放开始" },
    { type: "projectile_spawn", text: "投射物生成" },
    { type: "projectile_hit", text: "投射物命中" },
    { type: "damage", text: "伤害结算" },
    { type: "hit_vfx", text: "命中特效" },
    { type: "floating_text", text: "伤害浮字" },
    { type: "cooldown_update", text: "冷却更新" }
  ]);
  const isProjectileEventSelected = selectedEventType === "projectile_spawn"
    || selectedEventType === "projectile_hit"
    || selectedEventType === "area_spawn"
    || isProjectileSkillTemplate(draft?.behavior.template)
    || draft?.behavior.template === "player_nova"
    || draft?.behavior.template === "melee_arc"
    || draft?.behavior.template === "damage_zone"
    || draft?.behavior.template === "chain"
    || draft?.behavior.template === "module_chain";
  const draftPreview = draft ? projectileDebugPreviewFromDraft(draft, selectedArenaScene) : null;
  const eventDebug = projectileDebugFromEvent(selectedTimelineEvent) ?? draftPreview;

  if (launchAdjustmentActive) {
    return (
      <section className="skill-editor-overlay skill-editor-overlay-adjusting" aria-label="发射位置直接调整">
        <LaunchPointAdjustmentOverlay
          worldPosition={currentLaunchWorldPosition}
          offset={currentLaunchOffset}
          battleCamera={battleCamera}
          onDragWorldPosition={updateLaunchPointFromWorld}
          onConfirm={confirmLaunchPointAdjustment}
          onCancel={cancelLaunchPointAdjustment}
        />
      </section>
    );
  }

  return (
    <section className="skill-editor-overlay" aria-label="技能编辑器">
      <div className="skill-editor-shell">
        <header className="skill-editor-header">
          <div>
            <h2>{editor.title_text}</h2>
            <p>{editor.subtitle_text}</p>
          </div>
          <button className="skill-editor-close" type="button" onClick={onClose}>
            关闭
          </button>
        </header>

        <div className="skill-editor-workspace">
          <aside className="skill-editor-left-pane" aria-label="技能与事件列表">
            <section className="skill-editor-pane-section">
              <h3>技能列表</h3>
              <ul className="skill-editor-compact-list">
                {editor.entries.map((entry) => (
                  <li key={entry.id} className={`skill-editor-entry ${entry.openable ? "skill-editor-entry-openable" : "skill-editor-entry-locked"}`}>
                    <div>
                      <strong>{entry.name_text}</strong>
                      <code>{entry.id}</code>
                      <span>{entry.status_text}</span>
                    </div>
                    {entry.openable ? (
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(entry.id);
                          if (testArena.skills.find((skill) => skill.id === entry.id)?.testable) {
                            setArenaSkillId(entry.id);
                            setArenaResult(null);
                            setArenaStageIndex(0);
                            setSelectedEventType("projectile_spawn");
                          }
                        }}
                        aria-pressed={selectedEntry?.id === entry.id}
                      >
                        打开
                      </button>
                    ) : (
                      <span className="skill-editor-locked-text">不可打开</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="skill-editor-pane-section">
              <h3>事件类型列表</h3>
              <div className="skill-editor-event-type-list">
                {supportedEventTypes.map((eventType) => (
                  <button
                    key={eventType.type}
                    type="button"
                    className={selectedEventType === eventType.type ? "active" : ""}
                    onClick={() => setSelectedEventType(eventType.type)}
                  >
                    {eventType.text}
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <main className="skill-editor-middle-pane" aria-label="技能事件列表">
            {selectedEntry && detail ? (
              <>
                <div className="skill-editor-detail-heading">
                  <div>
                    <h3>{selectedEntry.name_text}</h3>
                    <p>中间显示当前技能逻辑事件；运行预览后显示真实技能事件时间线。</p>
                  </div>
                  <span className={selectedEntry.schema_status.is_valid ? "skill-editor-status-pass" : "skill-editor-status-fail"}>
                    {selectedEntry.schema_status.text}
                  </span>
                </div>
                {selectedEntry.schema_status.errors.length > 0 && (
                  <div className="skill-editor-errors" role="alert">
                    {selectedEntry.schema_status.errors.map((error) => <p key={error}>{error}</p>)}
                  </div>
                )}
                <dl className="skill-editor-fields">
                  <ReadOnlyField label="技能中文名" value={selectedEntry.name_text} />
                  <ReadOnlyField label="技能配置来源" value="正式技能配置文件" />
                  <ReadOnlyField label="行为模板" value={selectedEntry.behavior_template} />
                  <ReadOnlyField label="结构校验状态" value={selectedEntry.schema_status.text} />
                </dl>
                <SkillEditorEventList
                  supportedEventTypes={supportedEventTypes}
                  timelineEvents={timelineEvents}
                  selectedEventType={selectedEventType}
                  onSelectEventType={setSelectedEventType}
                />
                {arenaResult && currentArenaStage ? (
                  <SkillTestArenaResultView result={arenaResult} stage={currentArenaStage} stageIndex={arenaStageIndex} />
                ) : (
                  <div className="skill-test-arena-result">
                    <h5>预览等待运行</h5>
                    <p>点击底部“运行预览”后，这里会显示测试场结果和真实技能事件时间线。</p>
                  </div>
                )}
              </>
            ) : (
              <p className="skill-editor-empty">该技能尚未迁移为技能包，当前不可打开。</p>
            )}
          </main>

          <aside className="skill-editor-right-pane" aria-label="选中事件参数面板">
            {draft && selectedEntry ? (
              <>
                <div className="skill-editor-parameter-heading">
                  <h3>当前选中事件参数</h3>
                  <p>{supportedEventTypes.find((eventType) => eventType.type === selectedEventType)?.text ?? "未识别事件"}</p>
                </div>
                {validationErrors.length > 0 && (
                  <div className="skill-editor-errors" role="alert">
                    {validationErrors.map((error) => <p key={error}>{error}</p>)}
                  </div>
                )}
                {isProjectileEventSelected ? (
                  <ProjectileParameterPanel
                    draft={draft}
                    canEdit={canEdit}
                    editor={editor}
                    debugOptions={debugOptions}
                    eventDebug={eventDebug}
                    canAdjustLaunchPoint={canAdjustLaunchPoint}
                    onBeginLaunchPointAdjustment={beginLaunchPointAdjustment}
                    onDebugOptionsChange={onDebugOptionsChange}
                    updateDraft={updateDraft}
                  />
                ) : (
                  <GenericEventParameterPanel event={selectedTimelineEvent} selectedEventType={selectedEventType} />
                )}
                <EditorSection title={modifierStack.panel_title_text}>
                  <div className="skill-editor-modifier-stack">
                    <p className="skill-editor-test-notice">{modifierStack.notice_text}</p>
                    <div className="skill-editor-modifier-controls">
                      <SelectInput label={modifierStack.relation_label_text} value={testRelation} options={modifierStack.relation_options} onChange={setTestRelation} />
                      <NumberInput label="来源强度" value={sourcePower} min={modifierStack.power_limits.min} onChange={setSourcePower} />
                      <NumberInput label="目标强度" value={targetPower} min={modifierStack.power_limits.min} onChange={setTargetPower} />
                      <NumberInput label="导管强度" value={conduitPower} min={modifierStack.power_limits.min} onChange={setConduitPower} />
                    </div>
                    <div className="skill-editor-actions">
                      <button type="button" disabled={modifierPreviewing} onClick={applyTestModifiers}>
                        {modifierPreviewing ? "计算中" : modifierStack.apply_button_text}
                      </button>
                      <button type="button" disabled={selectedModifierIds.length === 0} onClick={clearTestModifiers}>
                        {modifierStack.clear_button_text}
                      </button>
                    </div>
                    <div className="skill-editor-modifier-list">
                      {modifierStack.available_modifiers.slice(0, 8).map((modifier) => {
                        const selected = selectedModifierIds.includes(modifier.id);
                        return (
                          <article key={modifier.id} className="skill-editor-modifier-card">
                            <div>
                              <strong>{modifier.name_text}</strong>
                              <span>{modifier.description_text}</span>
                            </div>
                            <button type="button" disabled={selected} onClick={() => addTestModifier(modifier.id)}>
                              {selected ? "已加入" : "加入测试栈"}
                            </button>
                          </article>
                        );
                      })}
                    </div>
                    {modifierMessage && (
                      <p className={modifierMessage.includes("失败") || modifierMessage.includes("必须") ? "skill-editor-save-error" : "skill-editor-save-ok"} role="status">
                        {modifierMessage}
                      </p>
                    )}
                    {modifierPreview && <ModifierPreviewResult preview={modifierPreview} />}
                  </div>
                </EditorSection>
              </>
            ) : (
              <p className="skill-editor-empty">当前没有可编辑参数。</p>
            )}
          </aside>
        </div>

        <footer className="skill-editor-bottom-bar" aria-label="运行保存与校验">
          <div className="skill-test-arena-controls">
            <label className="skill-editor-field">
              <span>测试技能</span>
              <select
                value={arenaSkillId}
                onChange={(event) => {
                  setArenaSkillId(event.target.value);
                  setArenaResult(null);
                  setArenaStageIndex(0);
                  setArenaMessage("");
                }}
              >
                {testArena.skills.map((skill) => (
                  <option key={skill.id} value={skill.id} disabled={!skill.testable}>
                    {skill.name_text}（{skill.status_text}）
                  </option>
                ))}
              </select>
            </label>
            <SelectInput
              label="测试场景"
              value={selectedArenaScene?.scene_id ?? ""}
              options={testArena.scenes.map((scene) => ({ value: scene.scene_id, text: scene.name_text }))}
              onChange={(value) => {
                setArenaSceneId(value);
                setArenaResult(null);
                setArenaStageIndex(0);
                setArenaMessage("");
              }}
            />
            <CheckboxInput
              label="启用测试词缀栈"
              checked={arenaUseModifierStack}
              onChange={(value) => {
                setArenaUseModifierStack(value);
                setArenaResult(null);
                setArenaStageIndex(0);
              }}
            />
            <NumberInput
              label="镜头 POV"
              value={cameraZoomDraft}
              min={SKILL_EDITOR_CAMERA_MIN_ZOOM}
              max={SKILL_EDITOR_CAMERA_MAX_ZOOM}
              onChange={(value) => {
                setCameraZoomDraft(value);
                setCameraMessage("");
              }}
            />
          </div>
          <div className="skill-editor-actions">
            <button type="button" disabled={arenaRunning || arenaPaused || !selectedArenaSkill?.testable} onClick={runArena}>
              {arenaRunning ? "运行中" : "运行预览"}
            </button>
            <button type="button" disabled={arenaRunning} onClick={pauseArena}>
              {arenaPaused ? "继续" : "暂停"}
            </button>
            <button type="button" disabled={arenaRunning || !selectedArenaSkill?.testable} onClick={stepArena}>
              单步
            </button>
            <button type="button" disabled={arenaRunning} onClick={resetArena}>
              重置
            </button>
            <button type="button" disabled={!canEdit || saving} onClick={saveDraft}>
              {saving ? "保存中" : "保存技能包"}
            </button>
            <button type="button" onClick={saveCameraSettings}>
              保存镜头参数
            </button>
          </div>
          <div className="skill-editor-bottom-feedback">
            {cameraMessage && (
              <p className="skill-editor-save-ok" role="status">
                {cameraMessage}
              </p>
            )}
            {arenaMessage && (
              <p className={arenaMessage.includes("失败") || arenaMessage.includes("不可") || arenaMessage.includes("必须") ? "skill-editor-save-error" : "skill-editor-save-ok"} role="status">
                {arenaMessage}
              </p>
            )}
            {saveMessage && (
              <p className={saveMessage.includes("成功") ? "skill-editor-save-ok" : "skill-editor-save-error"} role="status">
                {saveMessage}
              </p>
            )}
            <div className="skill-editor-runtime-perf" aria-label="运行性能摘要">
              <strong>运行性能</strong>
              <span>帧耗时 {formatPreviewNumber(runtimePerfSummary.frame_ms)} 毫秒</span>
              <span>逻辑 {formatPreviewNumber(runtimePerfSummary.logic_ms)} 毫秒</span>
              <span>事件 {runtimePerfSummary.consumed_events_this_frame} / 排队 {runtimePerfSummary.scheduled_events}</span>
              <span>对象 投射物 {runtimePerfSummary.active_projectiles}，特效 {runtimePerfSummary.active_hit_vfx + runtimePerfSummary.active_area_vfx}，浮字 {runtimePerfSummary.active_floating_text}</span>
              <span>掉帧 {runtimePerfSummary.dropped_frame_count}</span>
            </div>
            <div className="skill-editor-run-log" aria-label="运行日志">
              <strong>运行日志</strong>
              {runLogs.length > 0 ? runLogs.map((log, index) => <span key={`${log}-${index}`}>{log}</span>) : <span>暂无运行日志。</span>}
            </div>
          </div>
        </footer>
      </div>
    </section>
  );

  return (
    <section className="skill-editor-overlay" aria-label="技能编辑器">
      <div className="skill-editor-shell">
        <header className="skill-editor-header">
          <div>
            <h2>{editor.title_text}</h2>
            <p>{editor.subtitle_text}</p>
          </div>
          <button className="skill-editor-close" type="button" onClick={onClose}>
            关闭
          </button>
        </header>
        <div className="skill-editor-body">
          <aside className="skill-editor-list" aria-label="技能文件列表">
            <h3>技能文件列表</h3>
            <ul>
              {editor.entries.map((entry) => (
                <li key={entry.id} className={`skill-editor-entry ${entry.openable ? "skill-editor-entry-openable" : "skill-editor-entry-locked"}`}>
                  <div>
                    <strong>{entry.name_text}</strong>
                    <code>{entry.id}</code>
                    <span>{entry.status_text}</span>
                  </div>
                  {entry.openable ? (
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(entry.id);
                        if (testArena.skills.find((skill) => skill.id === entry.id)?.testable) {
                          setArenaSkillId(entry.id);
                          setArenaResult(null);
                          setArenaStageIndex(0);
                        }
                      }}
                      aria-pressed={selectedEntry?.id === entry.id}
                    >
                      打开
                    </button>
                  ) : (
                    <span className="skill-editor-locked-text">不可打开</span>
                  )}
                </li>
              ))}
            </ul>
          </aside>
          <section className="skill-editor-detail" aria-label="技能包详情">
            {selectedEntry && detail ? (
              <>
                <div className="skill-editor-detail-heading">
                  <div>
                    <h3>{selectedEntry.name_text}</h3>
                    <p>仅编辑已迁移技能包允许的字段，保存前执行结构和白名单校验。</p>
                  </div>
                  <span className={selectedEntry.schema_status.is_valid ? "skill-editor-status-pass" : "skill-editor-status-fail"}>
                    {selectedEntry.schema_status.text}
                  </span>
                </div>
                {selectedEntry.schema_status.errors.length > 0 && (
                  <div className="skill-editor-errors" role="alert">
                    {selectedEntry.schema_status.errors.map((error) => <p key={error}>{error}</p>)}
                  </div>
                )}
                <dl className="skill-editor-fields">
                  <ReadOnlyField label="技能中文名" value={selectedEntry.name_text} />
                  <ReadOnlyField label="技能配置来源" value="正式技能配置文件" />
                  <ReadOnlyField label="行为模板" value={selectedEntry.behavior_template} />
                  <ReadOnlyField label="结构校验状态" value={selectedEntry.schema_status.text} />
                </dl>
                {draft ? (
                  <div className="skill-editor-form">
                    <EditorSection title="基础信息模块">
                      <div className="skill-editor-form-grid">
                        <ReadOnlyInput label="技能编号（只读）" value={draft.id} />
                        <TextInput label="版本" value={draft.version} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.version = value; })} />
                        <TextInput label="名称本地化键" value={draft.display.name_key} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.display.name_key = value; })} />
                        <TextInput label="描述本地化键" value={draft.display.description_key} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.display.description_key = value; })} />
                        <SelectInput
                          label="伤害类型"
                          value={draft.classification.damage_type}
                          options={editor.options.damage_types}
                          disabled={!canEdit}
                          onChange={(value) => updateDraft((next) => { next.classification.damage_type = value; })}
                        />
                        <SelectInput
                          label="伤害形式"
                          value={draft.classification.damage_form}
                          options={editor.options.damage_forms}
                          disabled={!canEdit}
                          onChange={(value) => updateDraft((next) => { next.classification.damage_form = value; })}
                        />
                        <EditableStringList
                          label="分类标签"
                          values={draft.classification.tags}
                          disabled={!canEdit}
                          onChange={(values) => updateDraft((next) => { next.classification.tags = values; })}
                        />
                      </div>
                    </EditorSection>
                    <EditorSection title="释放参数模块">
                      <div className="skill-editor-form-grid">
                        <SelectInput
                          label="释放模式"
                          value={draft.cast.mode}
                          options={editor.options.cast_modes}
                          disabled={!canEdit}
                          onChange={(value) => updateDraft((next) => { next.cast.mode = value; })}
                        />
                        <SelectInput
                          label="目标选择"
                          value={draft.cast.target_selector}
                          options={editor.options.target_selectors}
                          disabled={!canEdit}
                          onChange={(value) => updateDraft((next) => { next.cast.target_selector = value; })}
                        />
                        <NumberInput label="搜索范围" value={draft.cast.search_range} min={0} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.cast.search_range = value; })} />
                        <NumberInput label="冷却毫秒" value={draft.cast.cooldown_ms} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.cast.cooldown_ms = value; })} />
                        <NumberInput label="前摇毫秒" value={draft.cast.windup_ms} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.cast.windup_ms = value; })} />
                        <NumberInput label="后摇毫秒" value={draft.cast.recovery_ms} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.cast.recovery_ms = value; })} />
                      </div>
                    </EditorSection>
                    <EditorSection title={draft.behavior.template === "damage_zone" ? "伤害结算区域" : draft.behavior.template === "player_nova" ? "范围新星模块" : draft.behavior.template === "melee_arc" ? "近战扇形模块" : draft.behavior.template === "chain" ? "连锁模块" : "投射物模块"}>
                      <div className="skill-editor-form-grid">
                        {draft.behavior.template === "damage_zone" ? (
                          <>
                            <SelectInput label="结算区域类型" value={String(projectileParams?.shape ?? "circle")} options={editor.options.zone_shapes} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.shape = value; })} />
                            <SelectInput label="起点规则" value={String(projectileParams?.origin_policy ?? "caster")} options={editor.options.origin_policies} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.origin_policy = value; })} />
                            <SelectInput label="朝向规则" value={String(projectileParams?.facing_policy ?? "none")} options={editor.options.facing_policies} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.facing_policy = value; })} />
                            {String(projectileParams?.shape ?? "circle") === "rectangle" ? (
                              <>
                                <NumberInput label="长" value={numberValue(projectileParams?.length, 1)} min={1} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.length = value; })} />
                                <NumberInput label="宽" value={numberValue(projectileParams?.width, 1)} min={1} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.width = value; })} />
                                <NumberInput label="角度" value={numberValue(projectileParams?.angle_offset_deg, 0)} min={-180} max={180} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.angle_offset_deg = value; })} />
                              </>
                            ) : (
                              <>
                                <NumberInput label="半径" value={numberValue(projectileParams?.radius, 1)} min={1} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.radius = value; })} />
                                <ReadOnlyInput label="角度" value="360°" />
                              </>
                            )}
                            <NumberInput label="命中时机毫秒" value={numberValue(projectileParams?.hit_at_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.hit_at_ms = value; })} />
                            <NumberInput label="最大目标数" value={numberValue(projectileParams?.max_targets, 1)} min={1} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.max_targets = value; })} />
                            <NumberInput label="状态几率倍率" value={numberValue(projectileParams?.status_chance_scale, 1)} min={0} max={10} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.status_chance_scale = value; })} />
                            <TextInput label="区域特效键" value={String(projectileParams?.zone_vfx_key ?? "")} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.zone_vfx_key = value; })} />
                            <ReadOnlyInput label="只读范围摘要" value={damageZoneRangeSummary(draft)} />
                            <ReadOnlyInput label="只读命中时机摘要" value={damageZoneHitTimingSummary(draft)} />
                          </>
                        ) : draft.behavior.template === "player_nova" ? (
                          <>
                            <NumberInput label="半径" value={numberValue(projectileParams?.radius, 1)} min={1} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.radius = value; })} />
                            <NumberInput label="扩散时长毫秒" value={numberValue(projectileParams?.expand_duration_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.expand_duration_ms = value; })} />
                            <NumberInput label="命中时机毫秒" value={numberValue(projectileParams?.hit_at_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.hit_at_ms = value; })} />
                            <NumberInput label="最大目标数" value={numberValue(projectileParams?.max_targets, 1)} min={1} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.max_targets = value; })} />
                            <SelectInput
                              label="中心规则"
                              value={String(projectileParams?.center_policy ?? "player_center")}
                              options={editor.options.center_policies}
                              disabled={!canEdit}
                              onChange={(value) => updateDraft((next) => { next.behavior.params.center_policy = value; })}
                            />
                            <SelectInput
                              label="距离衰减"
                              value={String(projectileParams?.damage_falloff_by_distance ?? "none")}
                              options={editor.options.damage_falloff_modes}
                              disabled={!canEdit}
                              onChange={(value) => updateDraft((next) => { next.behavior.params.damage_falloff_by_distance = value; })}
                            />
                            <NumberInput label="新星环宽" value={numberValue(projectileParams?.ring_width, 1)} min={1} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.ring_width = value; })} />
                            <NumberInput label="状态几率倍率" value={numberValue(projectileParams?.status_chance_scale, 1)} min={0} max={10} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.status_chance_scale = value; })} />
                            <ReadOnlyInput label="只读范围摘要" value={playerNovaRangeSummary(draft)} />
                            <ReadOnlyInput label="只读命中时机摘要" value={playerNovaHitTimingSummary(draft)} />
                          </>
                        ) : draft.behavior.template === "melee_arc" ? (
                          <>
                            <NumberInput label="扇形角度" value={numberValue(projectileParams?.arc_angle, 1)} min={1} max={180} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.arc_angle = value; })} />
                            <NumberInput label="扇形半径" value={numberValue(projectileParams?.arc_radius, 1)} min={1} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.arc_radius = value; })} />
                            <NumberInput label="前摇毫秒" value={numberValue(projectileParams?.windup_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.windup_ms = value; })} />
                            <NumberInput label="命中时机毫秒" value={numberValue(projectileParams?.hit_at_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.hit_at_ms = value; })} />
                            <NumberInput label="最大目标数" value={numberValue(projectileParams?.max_targets, 1)} min={1} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.max_targets = value; })} />
                            <SelectInput label="朝向规则" value={String(projectileParams?.facing_policy ?? "nearest_target")} options={editor.options.facing_policies} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.facing_policy = value; })} />
                            <SelectInput label="命中形状" value={String(projectileParams?.hit_shape ?? "sector")} options={editor.options.hit_shapes} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.hit_shape = value; })} />
                            <NumberInput label="状态几率倍率" value={numberValue(projectileParams?.status_chance_scale, 1)} min={0} max={10} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.status_chance_scale = value; })} />
                            <TextInput label="斩击特效键" value={String(projectileParams?.slash_vfx_key ?? "")} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.slash_vfx_key = value; })} />
                            <ReadOnlyInput label="只读扇形范围摘要" value={meleeArcRangeSummary(draft)} />
                            <ReadOnlyInput label="只读命中时机摘要" value={meleeArcHitTimingSummary(draft)} />
                          </>
                        ) : draft.behavior.template === "chain" ? (
                          <>
                            <NumberInput label="连锁次数" value={numberValue(projectileParams?.chain_count, 1)} min={1} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.chain_count = value; })} />
                            <NumberInput label="连锁半径" value={numberValue(projectileParams?.chain_radius, 1)} min={1} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.chain_radius = value; })} />
                            <NumberInput label="连锁间隔毫秒" value={numberValue(projectileParams?.chain_delay_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.chain_delay_ms = value; })} />
                            <NumberInput label="每跳伤害衰减" value={numberValue(projectileParams?.damage_falloff_per_chain, 0)} min={0} max={1} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.damage_falloff_per_chain = value; })} />
                            <SelectInput label="连锁目标规则" value={String(projectileParams?.target_policy ?? "nearest_not_hit")} options={editor.options.chain_target_policies} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.target_policy = value; })} />
                            <CheckboxInput label="允许重复命中" checked={Boolean(projectileParams?.allow_repeat_target ?? false)} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.allow_repeat_target = value; })} />
                            <NumberInput label="最大目标数" value={numberValue(projectileParams?.max_targets, 1)} min={1} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.max_targets = value; })} />
                            <TextInput label="连锁段特效键" value={String(projectileParams?.segment_vfx_key ?? "")} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.segment_vfx_key = value; })} />
                            <ReadOnlyInput label="只读最大链段摘要" value={chainSegmentSummary(draft)} />
                            <ReadOnlyInput label="只读预计链总时长摘要" value={chainDurationSummary(draft)} />
                          </>
                        ) : (
                          <>
                            <NumberInput label="投射物数量" value={numberValue(projectileParams?.projectile_count, 1)} min={1} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.projectile_count = value; })} />
                            <NumberInput label="连发间隔毫秒" value={numberValue(projectileParams?.burst_interval_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.burst_interval_ms = value; })} />
                            <NumberInput label="散射角度" value={numberValue(projectileParams?.spread_angle_deg, 0)} min={0} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.spread_angle_deg = value; })} />
                            <NumberInput label="随机角度偏移" value={numberValue(projectileParams?.random_angle_jitter_deg, 0)} min={0} max={45} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.random_angle_jitter_deg = value; })} />
                            <NumberInput label="投射物速度" value={numberValue(projectileParams?.projectile_speed, 1)} min={1} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.projectile_speed = value; })} />
                            <NumberInput label="投射物宽度" value={numberValue(projectileParams?.projectile_width, 1)} min={1} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.projectile_width = value; })} />
                            <NumberInput label="投射物高度" value={numberValue(projectileParams?.projectile_height, 1)} min={1} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.projectile_height = value; })} />
                            <NumberInput label="最大距离" value={numberValue(projectileParams?.max_distance, 1)} min={1} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.max_distance = value; })} />
                            <SelectInput
                              label="命中规则"
                              value={String(projectileParams?.hit_policy ?? "first_hit")}
                              options={editor.options.hit_policies}
                              disabled={!canEdit}
                              onChange={(value) => updateDraft((next) => { next.behavior.params.hit_policy = value; })}
                            />
                            <NumberInput label="贯穿次数" value={numberValue(projectileParams?.pierce_count, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.pierce_count = value; })} />
                            <NumberInput label="碰撞半径" value={numberValue(projectileParams?.collision_radius, 0)} min={0} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.collision_radius = value; })} />
                            <NumberInput label="生成偏移横向" value={numberValue(projectileParams?.spawn_offset?.x, 0)} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.spawn_offset = { ...(next.behavior.params.spawn_offset ?? { x: 0, y: 0 }), x: value }; })} />
                            <NumberInput label="生成偏移纵向" value={numberValue(projectileParams?.spawn_offset?.y, 0)} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.spawn_offset = { ...(next.behavior.params.spawn_offset ?? { x: 0, y: 0 }), y: value }; })} />
                            <ReadOnlyInput label="只读飞行时间" value={`${projectileTravelDurationMs(draft)} ms`} />
                          </>
                        )}
                      </div>
                    </EditorSection>
                    <EditorSection title="伤害点模块">
                      <div className="skill-editor-form-grid">
                        <NumberInput label="基础伤害" value={draft.hit.base_damage} min={0} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.base_damage = value; })} />
                        <CheckboxInput label="可以暴击" checked={draft.hit.can_crit} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.can_crit = value; })} />
                        <CheckboxInput label="可以施加状态" checked={draft.hit.can_apply_status} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.can_apply_status = value; })} />
                        <SelectInput
                          label="伤害时机"
                          value={draft.hit.damage_timing ?? "on_projectile_hit"}
                          options={editor.options.damage_timings}
                          disabled={!canEdit}
                          onChange={(value) => updateDraft((next) => { next.hit.damage_timing = value; })}
                        />
                        <NumberInput label="命中延迟毫秒" value={numberValue(draft.hit.hit_delay_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.hit_delay_ms = value; })} />
                        <NumberInput label="命中半径" value={numberValue(draft.hit.hit_radius, 0)} min={0} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.hit_radius = value; })} />
                        <SelectInput
                          label="目标规则"
                          value={draft.hit.target_policy ?? "selected_target"}
                          options={editor.options.target_policies}
                          disabled={!canEdit}
                          onChange={(value) => updateDraft((next) => { next.hit.target_policy = value; })}
                        />
                        <ReadOnlyInput label="伤害类型" value={draft.classification.damage_type} />
                        <ReadOnlyInput label="伤害形式" value={draft.classification.damage_form} />
                      </div>
                    </EditorSection>
                    <EditorSection title="表现模块">
                      <div className="skill-editor-form-grid">
                        <TextInput label="释放特效键" value={draft.presentation.cast_vfx_key ?? ""} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.cast_vfx_key = value; })} />
                        <TextInput label="投射物特效键" value={draft.presentation.projectile_vfx_key ?? ""} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.projectile_vfx_key = value; })} />
                        <TextInput label="命中特效键" value={draft.presentation.hit_vfx_key ?? ""} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.hit_vfx_key = value; })} />
                        <NumberInput label="特效放大倍数" value={numberValue(draft.presentation.vfx_scale, 1)} min={0.1} max={10} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.vfx_scale = value; })} />
                        <TextInput label="音效键" value={draft.presentation.sfx} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.sfx = value; })} />
                        <TextInput label="浮字样式键" value={draft.presentation.floating_text_style ?? ""} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.floating_text_style = value; })} />
                        <NumberInput label="命中停顿毫秒" value={numberValue(draft.presentation.hit_stop_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.hit_stop_ms = value; })} />
                        <NumberInput label="镜头震动" value={numberValue(draft.presentation.camera_shake, 0)} min={0} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.camera_shake = value; })} />
                        <ReadOnlyInput label="通用特效键" value={draft.presentation.vfx} />
                        <ReadOnlyInput label="浮字键" value={draft.presentation.floating_text} />
                        <ReadOnlyInput label="屏幕反馈键" value={draft.presentation.screen_feedback} />
                      </div>
                    </EditorSection>
                    <EditorSection title="预览字段模块">
                      <CheckboxList
                        label="预览字段"
                        values={draft.preview.show_fields}
                        options={editor.options.preview_fields}
                        disabled={!canEdit}
                        onChange={(values) => updateDraft((next) => { next.preview.show_fields = values; })}
                      />
                    </EditorSection>
                    <EditorSection title={modifierStack.panel_title_text}>
                      <div className="skill-editor-modifier-stack">
                        <p className="skill-editor-test-notice">{modifierStack.notice_text}</p>
                        <div className="skill-editor-modifier-controls">
                          <SelectInput
                            label={modifierStack.relation_label_text}
                            value={testRelation}
                            options={modifierStack.relation_options}
                            onChange={setTestRelation}
                          />
                          <NumberInput label="来源强度" value={sourcePower} min={modifierStack.power_limits.min} onChange={setSourcePower} />
                          <NumberInput label="目标强度" value={targetPower} min={modifierStack.power_limits.min} onChange={setTargetPower} />
                          <NumberInput label="导管强度" value={conduitPower} min={modifierStack.power_limits.min} onChange={setConduitPower} />
                        </div>
                        <div className="skill-editor-modifier-columns">
                          <div className="skill-editor-modifier-column">
                            <h5>{modifierStack.available_title_text}</h5>
                            <div className="skill-editor-modifier-list">
                              {modifierStack.available_modifiers.map((modifier) => {
                                const selected = selectedModifierIds.includes(modifier.id);
                                return (
                                  <article key={modifier.id} className="skill-editor-modifier-card">
                                    <div>
                                      <strong>{modifier.name_text}</strong>
                                      <span>{modifier.description_text}</span>
                                      <small>{modifier.filter_text}</small>
                                    </div>
                                    <ModifierStatList stats={modifier.stats} />
                                    <button type="button" disabled={selected} onClick={() => addTestModifier(modifier.id)}>
                                      {selected ? "已加入" : "加入测试栈"}
                                    </button>
                                  </article>
                                );
                              })}
                            </div>
                          </div>
                          <div className="skill-editor-modifier-column">
                            <h5>{modifierStack.selected_title_text}</h5>
                            {selectedModifiers.length > 0 ? (
                              <div className="skill-editor-selected-modifiers">
                                {selectedModifiers.map((modifier) => (
                                  <div key={modifier.id} className="skill-editor-selected-modifier">
                                    <span>{modifier.name_text}</span>
                                    <button type="button" onClick={() => removeTestModifier(modifier.id)}>移除</button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="skill-editor-test-empty">尚未选择测试效果。</p>
                            )}
                            <div className="skill-editor-actions">
                              <button type="button" disabled={modifierPreviewing} onClick={applyTestModifiers}>
                                {modifierPreviewing ? "计算中" : modifierStack.apply_button_text}
                              </button>
                              <button type="button" disabled={selectedModifierIds.length === 0} onClick={clearTestModifiers}>
                                {modifierStack.clear_button_text}
                              </button>
                            </div>
                            {modifierMessage && (
                              <p className={modifierMessage.includes("失败") || modifierMessage.includes("必须") ? "skill-editor-save-error" : "skill-editor-save-ok"} role="status">
                                {modifierMessage}
                              </p>
                            )}
                            {modifierPreview && <ModifierPreviewResult preview={modifierPreview as SkillEditorModifierPreview} />}
                          </div>
                        </div>
                      </div>
                    </EditorSection>
                    <EditorSection title={testArena.panel_title_text}>
                      <div className="skill-test-arena">
                        <p className="skill-editor-test-notice">{testArena.notice_text}</p>
                        <div className="skill-test-arena-controls">
                          <label className="skill-editor-field">
                            <span>测试技能</span>
                            <select
                              value={arenaSkillId}
                              onChange={(event) => {
                                setArenaSkillId(event.target.value);
                                setArenaResult(null);
                                setArenaStageIndex(0);
                                setArenaMessage("");
                              }}
                            >
                              {testArena.skills.map((skill) => (
                                <option key={skill.id} value={skill.id} disabled={!skill.testable}>
                                  {skill.name_text}（{skill.status_text}）
                                </option>
                              ))}
                            </select>
                          </label>
                          <SelectInput
                            label="测试场景"
                            value={selectedArenaScene?.scene_id ?? ""}
                            options={testArena.scenes.map((scene) => ({ value: scene.scene_id, text: scene.name_text }))}
                            onChange={(value) => {
                              setArenaSceneId(value);
                              setArenaResult(null);
                              setArenaStageIndex(0);
                              setArenaMessage("");
                            }}
                          />
                          <CheckboxInput
                            label="启用测试词缀栈"
                            checked={arenaUseModifierStack}
                            onChange={(value) => {
                              setArenaUseModifierStack(value);
                              setArenaResult(null);
                              setArenaStageIndex(0);
                            }}
                          />
                        </div>
                        <div className="skill-editor-actions">
                          <button type="button" disabled={arenaRunning || arenaPaused || !selectedArenaSkill?.testable} onClick={runArena}>
                            {arenaRunning ? "运行中" : "运行测试"}
                          </button>
                          <button type="button" disabled={arenaRunning} onClick={pauseArena}>
                            {arenaPaused ? "继续" : "暂停"}
                          </button>
                          <button type="button" disabled={arenaRunning || !selectedArenaSkill?.testable} onClick={stepArena}>
                            单步
                          </button>
                          <button type="button" disabled={arenaRunning} onClick={resetArena}>
                            重置
                          </button>
                        </div>
                        {arenaMessage && (
                          <p className={arenaMessage.includes("失败") || arenaMessage.includes("不可") || arenaMessage.includes("必须") ? "skill-editor-save-error" : "skill-editor-save-ok"} role="status">
                            {arenaMessage}
                          </p>
                        )}
                        {selectedArenaScene && !arenaResult && (
                          <div className="skill-test-arena-result">
                            <h5>{selectedArenaScene.name_text}</h5>
                            <MonsterLifeList monsters={selectedArenaScene.enemies} />
                            <p>选择场景后点击运行测试或单步，结果只在本次编辑器会话中生效。</p>
                          </div>
                        )}
                        {arenaResult && currentArenaStage && (
                          <SkillTestArenaResultView
                            result={arenaResult as SkillTestArenaResult}
                            stage={currentArenaStage as SkillTestArenaStage}
                            stageIndex={arenaStageIndex}
                          />
                        )}
                      </div>
                    </EditorSection>
                    <div className="skill-editor-actions">
                      <button type="button" disabled={!canEdit || saving} onClick={saveDraft}>
                        {saving ? "保存中" : "保存技能包"}
                      </button>
                      {saveMessage && (
                        <p className={saveMessage.includes("成功") ? "skill-editor-save-ok" : "skill-editor-save-error"} role="status">
                          {saveMessage}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="skill-editor-empty">当前技能包未通过校验，修复配置后才能编辑。</p>
                )}
              </>
            ) : (
              <p className="skill-editor-empty">该技能尚未迁移为技能包，当前不可打开。</p>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

type ProjectileDebugSnapshot = {
  spawn: { x: number; y: number };
  vfxSpawn: { x: number; y: number };
  target: { x: number; y: number };
  direction: { x: number; y: number };
  vfxDirection: { x: number; y: number };
};

function LaunchPointAdjustmentOverlay({
  worldPosition,
  offset,
  battleCamera,
  onDragWorldPosition,
  onConfirm,
  onCancel
}: {
  worldPosition: { x: number; y: number };
  offset: { x: number; y: number };
  battleCamera: Camera2D;
  onDragWorldPosition: (worldPosition: { x: number; y: number }) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const viewportPoint = battleWorldToViewport(worldPosition, battleCamera);

  function updateFromPointer(event: ReactPointerEvent<HTMLElement>) {
    onDragWorldPosition(viewportToBattleWorld(event.clientX, event.clientY, battleCamera));
  }

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    updateFromPointer(event);
  }

  function moveDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragging) return;
    event.preventDefault();
    updateFromPointer(event);
  }

  function endDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
  }

  return (
    <>
      <div className="skill-editor-adjustment-toolbar" role="status" aria-live="polite">
        <div>
          <strong>拖拽调整发射点</strong>
          <span>当前偏移：x {formatPreviewNumber(offset.x)}，y {formatPreviewNumber(offset.y)}</span>
        </div>
        <div className="skill-editor-adjustment-actions">
          <button type="button" onClick={onConfirm}>确认位置</button>
          <button type="button" onClick={onCancel}>取消</button>
        </div>
      </div>
      <button
        className={`skill-editor-launch-drag-handle ${dragging ? "dragging" : ""}`}
        type="button"
        aria-label="拖拽发射点"
        title="拖拽发射点"
        style={{ left: viewportPoint.x, top: viewportPoint.y }}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span />
      </button>
    </>
  );
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

function SkillEditorEventList({
  supportedEventTypes,
  timelineEvents,
  selectedEventType,
  onSelectEventType
}: {
  supportedEventTypes: { type: string; text: string }[];
  timelineEvents: SkillEventTimelineItem[];
  selectedEventType: string;
  onSelectEventType: (type: string) => void;
}) {
  const groupedEvents = timelineEvents.length > 0 ? timelineEvents.slice(0, MAX_SKILL_EDITOR_TIMELINE_ROWS) : [];
  const hiddenEventCount = Math.max(0, timelineEvents.length - groupedEvents.length);
  return (
    <section className="skill-editor-event-panel" aria-label="技能事件列表">
      <div className="skill-event-timeline-heading">
        <div>
          <h5>{timelineEvents.length > 0 ? "真实技能事件时间线" : "技能逻辑事件列表"}</h5>
          <p>{timelineEvents.length > 0 ? "数据来自本次测试场运行。" : "运行预览前显示当前技能可用的逻辑事件类型。"}</p>
        </div>
        <span>{timelineEvents.length > 0 ? `${timelineEvents.length} 个事件` : `${supportedEventTypes.length} 类事件`}</span>
      </div>
      {groupedEvents.length > 0 ? (
        <>
          <ol className="skill-event-timeline-list">
            {groupedEvents.map((event) => (
              <li key={event.event_id} className={`skill-event-timeline-item skill-event-${event.type}`}>
                <button type="button" className="skill-editor-event-select" onClick={() => onSelectEventType(event.type)}>
                  <strong>{event.type_text}</strong>
                  <span>事件时间 {event.timestamp_ms} 毫秒</span>
                </button>
              </li>
            ))}
          </ol>
          {hiddenEventCount > 0 && (
            <p className="skill-event-timeline-limit">已限制首屏渲染，剩余 {hiddenEventCount} 个事件可通过事件类型筛选查看。</p>
          )}
        </>
      ) : (
        <div className="skill-editor-logical-events">
          {supportedEventTypes.map((eventType) => (
            <button
              key={eventType.type}
              type="button"
              className={selectedEventType === eventType.type ? "active" : ""}
              onClick={() => onSelectEventType(eventType.type)}
            >
              {eventType.text}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function ProjectileParameterPanel({
  draft,
  canEdit,
  editor,
  debugOptions,
  eventDebug,
  canAdjustLaunchPoint,
  onBeginLaunchPointAdjustment,
  onDebugOptionsChange,
  updateDraft
}: {
  draft: SkillPackageData;
  canEdit: boolean;
  editor: SkillEditorState;
  debugOptions: SkillEditorDebugOptions;
  eventDebug: ProjectileDebugSnapshot | null;
  canAdjustLaunchPoint: boolean;
  onBeginLaunchPointAdjustment: () => void;
  onDebugOptionsChange: (options: SkillEditorDebugOptions) => void;
  updateDraft: (mutator: (next: SkillPackageData) => void) => void;
}) {
  const params = draft.behavior.params;
  const orbitModuleIndex = draft.modules?.findIndex((module) => module.type === "orbit_emitter") ?? -1;
  const projectileModuleIndex = draft.modules?.findIndex((module) => module.type === "projectile") ?? -1;
  const damageZoneModuleIndex = draft.modules?.findIndex((module) => module.type === "damage_zone") ?? -1;
  const orbitModule = orbitModuleIndex >= 0 ? draft.modules?.[orbitModuleIndex] : null;
  const projectileModule = projectileModuleIndex >= 0 ? draft.modules?.[projectileModuleIndex] : null;
  const damageZoneModule = damageZoneModuleIndex >= 0 ? draft.modules?.[damageZoneModuleIndex] : null;
  const orbitModuleParams = orbitModule?.params ?? {};
  const projectileModuleParams = projectileModule?.params ?? {};
  const damageZoneModuleParams = damageZoneModule?.params ?? {};
  const damageZoneTrigger = damageZoneModule?.trigger ?? {};
  const updateModuleParam = (moduleIndex: number, key: string, value: unknown) => {
    updateDraft((next) => {
      if (!next.modules?.[moduleIndex]) return;
      next.modules[moduleIndex].params = { ...(next.modules[moduleIndex].params ?? {}), [key]: value };
    });
  };
  const updateModuleTrigger = (moduleIndex: number, key: string, value: unknown) => {
    updateDraft((next) => {
      if (!next.modules?.[moduleIndex]) return;
      next.modules[moduleIndex].trigger = { ...(next.modules[moduleIndex].trigger ?? {}), [key]: value };
    });
  };
  const directionModeText = draft.cast.target_selector === "target_enemy" ? "朝当前目标" : "朝最近目标";
  const sourceText = draft.id ? "施法者 / 测试玩家" : "施法者";
  const setDebugOption = (key: keyof SkillEditorDebugOptions, value: boolean) => {
    onDebugOptionsChange({ ...debugOptions, [key]: value });
  };
  const setDamageZoneShape = (shape: string) => {
    updateDraft((next) => {
      next.behavior.params.shape = shape;
      if (shape === "rectangle") {
        next.behavior.params.length = numberValue(next.behavior.params.length, numberValue(next.behavior.params.radius, numberValue(next.hit.hit_radius, 320)));
        next.behavior.params.width = numberValue(next.behavior.params.width, 96);
        next.behavior.params.angle_offset_deg = numberValue(next.behavior.params.angle_offset_deg, 0);
        delete next.behavior.params.radius;
        delete next.behavior.params.expand_duration_ms;
        delete next.behavior.params.ring_width;
      } else {
        next.behavior.params.radius = numberValue(next.behavior.params.radius, numberValue(next.hit.hit_radius, numberValue(next.behavior.params.length, 360)));
        next.behavior.params.expand_duration_ms = numberValue(next.behavior.params.expand_duration_ms, numberValue(next.behavior.params.hit_at_ms, 0));
        next.behavior.params.ring_width = numberValue(next.behavior.params.ring_width, 48);
        delete next.behavior.params.length;
        delete next.behavior.params.width;
        delete next.behavior.params.angle_offset_deg;
      }
    });
  };
  if (orbitModule && damageZoneModule && orbitModuleIndex >= 0 && damageZoneModuleIndex >= 0) {
    const tickMarkerId = String(orbitModuleParams.tick_marker_id ?? "");
    const triggerMarkerId = String(damageZoneTrigger.trigger_marker_id ?? "");
    const durationMs = numberValue(orbitModuleParams.duration_ms, 1);
    const tickIntervalMs = numberValue(orbitModuleParams.tick_interval_ms, 1);
    const estimatedTickCount = Math.max(0, Math.floor(durationMs / Math.max(1, tickIntervalMs)) * numberValue(orbitModuleParams.orb_count, 1));
    const linkStatus = tickMarkerId && tickMarkerId === triggerMarkerId ? "已连接" : "未连接";
    const markerOptions = tickMarkerId ? [{ value: tickMarkerId, text: tickMarkerId }] : [];
    return (
      <div className="skill-editor-projectile-panel">
        <EditorSection title="技能模块链">
          <div className="skill-editor-form-grid">
            <ReadOnlyInput label="技能编号" value={draft.id} />
            <ReadOnlyInput label="行为模板" value="module_chain" />
            <ReadOnlyInput label="模块 1" value={`${orbitModule.id} / orbit_emitter`} />
            <ReadOnlyInput label="模块 2" value={`${damageZoneModule.id} / damage_zone`} />
            <ReadOnlyInput label="链接" value={`${tickMarkerId} → ${triggerMarkerId}`} />
            <ReadOnlyInput label="连接状态" value={linkStatus} />
          </div>
        </EditorSection>
        <EditorSection title="环绕模块">
          <div className="skill-editor-form-grid">
            <SelectInput label="环绕中心" value={String(orbitModuleParams.orbit_center_policy ?? "caster")} options={[{ value: "caster", text: "caster" }]} disabled={!canEdit} onChange={(value) => updateModuleParam(orbitModuleIndex, "orbit_center_policy", value)} />
            <NumberInput label="持续毫秒" value={durationMs} min={1} integer disabled={!canEdit} onChange={(value) => updateModuleParam(orbitModuleIndex, "duration_ms", value)} />
            <NumberInput label="tick 间隔毫秒" value={tickIntervalMs} min={1} integer disabled={!canEdit} onChange={(value) => updateModuleParam(orbitModuleIndex, "tick_interval_ms", value)} />
            <NumberInput label="轨道半径" value={numberValue(orbitModuleParams.orbit_radius, 1)} min={1} disabled={!canEdit} onChange={(value) => updateModuleParam(orbitModuleIndex, "orbit_radius", value)} />
            <NumberInput label="每秒角速度" value={numberValue(orbitModuleParams.orbit_speed_deg_per_sec, 0)} disabled={!canEdit} onChange={(value) => updateModuleParam(orbitModuleIndex, "orbit_speed_deg_per_sec", value)} />
            <NumberInput label="熔岩球数量" value={numberValue(orbitModuleParams.orb_count, 1)} min={1} integer disabled={!canEdit} onChange={(value) => updateModuleParam(orbitModuleIndex, "orb_count", value)} />
            <NumberInput label="起始角度" value={numberValue(orbitModuleParams.start_angle_deg, 0)} disabled={!canEdit} onChange={(value) => updateModuleParam(orbitModuleIndex, "start_angle_deg", value)} />
            <CheckboxInput label="半径循环变化" checked={Boolean(orbitModuleParams.orbit_radius_cycle_enabled ?? false)} disabled={!canEdit} onChange={(value) => updateModuleParam(orbitModuleIndex, "orbit_radius_cycle_enabled", value)} />
            <NumberInput label="半径循环振幅" value={numberValue(orbitModuleParams.orbit_radius_cycle_amplitude, 0)} min={0} disabled={!canEdit} onChange={(value) => updateModuleParam(orbitModuleIndex, "orbit_radius_cycle_amplitude", value)} />
            <NumberInput label="半径循环周期毫秒" value={numberValue(orbitModuleParams.orbit_radius_cycle_period_ms, 1000)} min={1} integer disabled={!canEdit} onChange={(value) => updateModuleParam(orbitModuleIndex, "orbit_radius_cycle_period_ms", value)} />
            <NumberInput label="半径循环相位" value={numberValue(orbitModuleParams.orbit_radius_cycle_phase_deg, 0)} disabled={!canEdit} onChange={(value) => updateModuleParam(orbitModuleIndex, "orbit_radius_cycle_phase_deg", value)} />
            <TextInput label="tick 标识" value={tickMarkerId} disabled={!canEdit} onChange={(value) => updateModuleParam(orbitModuleIndex, "tick_marker_id", value)} />
            <TextInput label="生成特效" value={String(orbitModuleParams.spawn_vfx_key ?? "")} disabled={!canEdit} onChange={(value) => updateModuleParam(orbitModuleIndex, "spawn_vfx_key", value)} />
            <TextInput label="tick 特效" value={String(orbitModuleParams.tick_vfx_key ?? "")} disabled={!canEdit} onChange={(value) => updateModuleParam(orbitModuleIndex, "tick_vfx_key", value)} />
          </div>
        </EditorSection>
        <EditorSection title="伤害区模块">
          <div className="skill-editor-form-grid">
            <SelectInput label="触发标识" value={triggerMarkerId} options={markerOptions} disabled={!canEdit || markerOptions.length === 0} onChange={(value) => updateModuleTrigger(damageZoneModuleIndex, "trigger_marker_id", value)} />
            <NumberInput label="触发延迟毫秒" value={numberValue(damageZoneTrigger.trigger_delay_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateModuleTrigger(damageZoneModuleIndex, "trigger_delay_ms", value)} />
            <ReadOnlyInput label="形状" value={String(damageZoneModuleParams.shape ?? "circle")} />
            <ReadOnlyInput label="原点规则" value={String(damageZoneModuleParams.origin_policy ?? "trigger_position")} />
            <NumberInput label="每 tick 半径" value={numberValue(damageZoneModuleParams.radius, 1)} min={1} disabled={!canEdit} onChange={(value) => updateModuleParam(damageZoneModuleIndex, "radius", value)} />
            <NumberInput label="命中时机毫秒" value={numberValue(damageZoneModuleParams.hit_at_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateModuleParam(damageZoneModuleIndex, "hit_at_ms", value)} />
            <NumberInput label="最大目标数" value={numberValue(damageZoneModuleParams.max_targets, 1)} min={1} integer disabled={!canEdit} onChange={(value) => updateModuleParam(damageZoneModuleIndex, "max_targets", value)} />
            <SelectInput label="伤害类型" value={draft.classification.damage_type} options={editor.options.damage_types} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.classification.damage_type = value; })} />
            <TextInput label="命中特效" value={String(damageZoneModuleParams.vfx_key ?? "")} disabled={!canEdit} onChange={(value) => updateModuleParam(damageZoneModuleIndex, "vfx_key", value)} />
          </div>
        </EditorSection>
        <EditorSection title="只读摘要">
          <div className="skill-editor-form-grid">
            <ReadOnlyInput label="预计 tick 次数" value={estimatedTickCount} />
            <ReadOnlyInput label="预计总持续时间" value={`${durationMs} ms`} />
            <ReadOnlyInput label="轨道半径" value={numberValue(orbitModuleParams.orbit_radius, 1)} />
            <ReadOnlyInput label="每 tick 命中半径" value={numberValue(damageZoneModuleParams.radius, 1)} />
            <ReadOnlyInput label="模块链状态" value={linkStatus} />
          </div>
        </EditorSection>
      </div>
    );
  }
  if (projectileModule && damageZoneModule && projectileModuleIndex >= 0 && damageZoneModuleIndex >= 0) {
    return (
      <div className="skill-editor-projectile-panel">
        <EditorSection title="技能模块链">
          <div className="skill-editor-form-grid">
            <ReadOnlyInput label="技能编号" value={draft.id} />
            <ReadOnlyInput label="行为模板" value="module_chain" />
            <ReadOnlyInput label="模块 1" value={`${projectileModule.id} / projectile`} />
            <ReadOnlyInput label="模块 2" value={`${damageZoneModule.id} / damage_zone`} />
            <ReadOnlyInput label="链接" value={`${String(projectileModuleParams.impact_marker_id ?? "")} → ${String(damageZoneTrigger.trigger_marker_id ?? "")}`} />
          </div>
        </EditorSection>
        <EditorSection title="投射物模块">
          <div className="skill-editor-form-grid">
            <SelectInput label="轨迹" value={String(projectileModuleParams.trajectory ?? "linear")} options={[{ value: "linear", text: "linear" }, { value: "ballistic", text: "ballistic" }]} disabled={!canEdit} onChange={(value) => updateModuleParam(projectileModuleIndex, "trajectory", value)} />
            <NumberInput label="飞行时间毫秒" value={numberValue(projectileModuleParams.travel_time_ms, 1)} min={1} integer disabled={!canEdit} onChange={(value) => updateModuleParam(projectileModuleIndex, "travel_time_ms", value)} />
            <NumberInput label="抛物线高度" value={numberValue(projectileModuleParams.arc_height, 0)} min={0} disabled={!canEdit} onChange={(value) => updateModuleParam(projectileModuleIndex, "arc_height", value)} />
            <SelectInput label="目标规则" value={String(projectileModuleParams.target_policy ?? "target_position")} options={[{ value: "nearest_enemy", text: "nearest_enemy" }, { value: "random_enemy", text: "random_enemy" }, { value: "nearest_unique_enemy", text: "nearest_unique_enemy" }, { value: "target_position", text: "target_position" }]} disabled={!canEdit} onChange={(value) => updateModuleParam(projectileModuleIndex, "target_policy", value)} />
            <TextInput label="落地标识" value={String(projectileModuleParams.impact_marker_id ?? "")} disabled={!canEdit} onChange={(value) => updateModuleParam(projectileModuleIndex, "impact_marker_id", value)} />
            <NumberInput label="投射物速度" value={numberValue(projectileModuleParams.projectile_speed, 1)} min={1} disabled={!canEdit} onChange={(value) => updateModuleParam(projectileModuleIndex, "projectile_speed", value)} />
            <NumberInput label="投射物宽度" value={numberValue(projectileModuleParams.projectile_width, 1)} min={1} disabled={!canEdit} onChange={(value) => updateModuleParam(projectileModuleIndex, "projectile_width", value)} />
            <NumberInput label="投射物高度" value={numberValue(projectileModuleParams.projectile_height, 1)} min={1} disabled={!canEdit} onChange={(value) => updateModuleParam(projectileModuleIndex, "projectile_height", value)} />
            <TextInput label="投射物特效" value={String(projectileModuleParams.vfx_key ?? "")} disabled={!canEdit} onChange={(value) => updateModuleParam(projectileModuleIndex, "vfx_key", value)} />
          </div>
        </EditorSection>
        <EditorSection title="伤害区模块">
          <div className="skill-editor-form-grid">
            <SelectInput label="触发标识" value={String(damageZoneTrigger.trigger_marker_id ?? "")} options={[{ value: String(projectileModuleParams.impact_marker_id ?? ""), text: String(projectileModuleParams.impact_marker_id ?? "") }]} disabled={!canEdit} onChange={(value) => updateModuleTrigger(damageZoneModuleIndex, "trigger_marker_id", value)} />
            <NumberInput label="触发延迟毫秒" value={numberValue(damageZoneTrigger.trigger_delay_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateModuleTrigger(damageZoneModuleIndex, "trigger_delay_ms", value)} />
            <ReadOnlyInput label="形状" value={String(damageZoneModuleParams.shape ?? "circle")} />
            <ReadOnlyInput label="原点规则" value={String(damageZoneModuleParams.origin_policy ?? "trigger_position")} />
            <NumberInput label="半径" value={numberValue(damageZoneModuleParams.radius, 1)} min={1} disabled={!canEdit} onChange={(value) => updateModuleParam(damageZoneModuleIndex, "radius", value)} />
            <NumberInput label="命中时机毫秒" value={numberValue(damageZoneModuleParams.hit_at_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateModuleParam(damageZoneModuleIndex, "hit_at_ms", value)} />
            <NumberInput label="最大目标数" value={numberValue(damageZoneModuleParams.max_targets, 1)} min={1} integer disabled={!canEdit} onChange={(value) => updateModuleParam(damageZoneModuleIndex, "max_targets", value)} />
            <SelectInput label="伤害类型" value={draft.classification.damage_type} options={editor.options.damage_types} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.classification.damage_type = value; })} />
            <TextInput label="爆炸特效" value={String(damageZoneModuleParams.vfx_key ?? "")} disabled={!canEdit} onChange={(value) => updateModuleParam(damageZoneModuleIndex, "vfx_key", value)} />
          </div>
        </EditorSection>
        <EditorSection title="表现">
          <div className="skill-editor-form-grid">
            <TextInput label="施法特效" value={draft.presentation.cast_vfx_key ?? ""} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.cast_vfx_key = value; })} />
            <TextInput label="通用视觉效果" value={draft.presentation.vfx} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.vfx = value; })} />
            <NumberInput label="特效放大倍数" value={numberValue(draft.presentation.vfx_scale, 1)} min={0.1} max={10} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.vfx_scale = value; })} />
            <TextInput label="音效" value={draft.presentation.sfx} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.sfx = value; })} />
            <TextInput label="伤害浮字" value={draft.presentation.floating_text} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.floating_text = value; })} />
            <TextInput label="屏幕反馈" value={draft.presentation.screen_feedback} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.screen_feedback = value; })} />
          </div>
        </EditorSection>
      </div>
    );
  }
  if (draft.behavior.template === "damage_zone") {
    const shape = String(params.shape ?? "circle");
    return (
      <div className="skill-editor-projectile-panel">
        <EditorSection title="伤害结算区域">
          <div className="skill-editor-form-grid">
            <ReadOnlyInput label="技能编号" value={draft.id} />
            <ReadOnlyInput label="行为模板" value={draft.behavior.template} />
            <SelectInput label="结算区域类型" value={shape} options={editor.options.zone_shapes} disabled={!canEdit} onChange={setDamageZoneShape} />
            <SelectInput label="起点规则" value={String(params.origin_policy ?? "caster")} options={editor.options.origin_policies} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.origin_policy = value; })} />
            <SelectInput label="朝向规则" value={String(params.facing_policy ?? "none")} options={editor.options.facing_policies} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.facing_policy = value; })} />
            {shape === "rectangle" ? (
              <>
                <NumberInput label="长" value={numberValue(params.length, 1)} min={1} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.length = value; })} />
                <NumberInput label="宽" value={numberValue(params.width, 1)} min={1} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.width = value; })} />
                <NumberInput label="角度" value={numberValue(params.angle_offset_deg, 0)} min={-180} max={180} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.angle_offset_deg = value; })} />
              </>
            ) : (
              <>
                <NumberInput label="半径" value={numberValue(params.radius, 1)} min={1} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.radius = value; })} />
                <NumberInput label="扩散时长毫秒" value={numberValue(params.expand_duration_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.expand_duration_ms = value; })} />
                <NumberInput label="环宽" value={numberValue(params.ring_width, 1)} min={1} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.ring_width = value; })} />
              </>
            )}
            <NumberInput label="命中时机毫秒" value={numberValue(params.hit_at_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.hit_at_ms = value; })} />
            <NumberInput label="最大目标数" value={numberValue(params.max_targets, 1)} min={1} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.max_targets = value; })} />
            <NumberInput label="状态几率倍率" value={numberValue(params.status_chance_scale, 1)} min={0} max={10} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.status_chance_scale = value; })} />
            <TextInput label="区域特效键" value={String(params.zone_vfx_key ?? "")} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.zone_vfx_key = value; })} />
            <ReadOnlyInput label="只读范围摘要" value={damageZoneRangeSummary(draft)} />
          </div>
        </EditorSection>
        <EditorSection title="伤害">
          <div className="skill-editor-form-grid">
            <NumberInput label="基础伤害" value={draft.hit.base_damage} min={0} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.base_damage = value; })} />
            <SelectInput label="伤害时机" value={draft.hit.damage_timing ?? "on_damage_zone_hit"} options={editor.options.damage_timings} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.damage_timing = value; })} />
            <NumberInput label="命中延迟毫秒" value={numberValue(draft.hit.hit_delay_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.hit_delay_ms = value; })} />
            <NumberInput label="命中范围" value={numberValue(draft.hit.hit_radius, 0)} min={0} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.hit_radius = value; })} />
            <CheckboxInput label="可以暴击" checked={draft.hit.can_crit} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.can_crit = value; })} />
            <CheckboxInput label="可以附加状态" checked={draft.hit.can_apply_status} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.can_apply_status = value; })} />
            <ReadOnlyInput label="只读命中时机摘要" value={damageZoneHitTimingSummary(draft)} />
          </div>
        </EditorSection>
        <EditorSection title="表现">
          <div className="skill-editor-form-grid">
            <TextInput label="施法特效" value={draft.presentation.cast_vfx_key ?? ""} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.cast_vfx_key = value; })} />
            <TextInput label="命中特效" value={draft.presentation.hit_vfx_key ?? ""} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.hit_vfx_key = value; })} />
            <TextInput label="通用视觉效果" value={draft.presentation.vfx} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.vfx = value; })} />
            <NumberInput label="特效放大倍数" value={numberValue(draft.presentation.vfx_scale, 1)} min={0.1} max={10} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.vfx_scale = value; })} />
            <TextInput label="音效" value={draft.presentation.sfx} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.sfx = value; })} />
            <TextInput label="伤害浮字" value={draft.presentation.floating_text} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.floating_text = value; })} />
            <TextInput label="屏幕反馈" value={draft.presentation.screen_feedback} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.screen_feedback = value; })} />
          </div>
        </EditorSection>
        <EditorSection title="调试">
          <div className="skill-editor-debug-options">
            <CheckboxInput label="显示目标点" checked={debugOptions.showTargetPoint} onChange={(value) => setDebugOption("showTargetPoint", value)} />
            <CheckboxInput label="显示飞行方向线" checked={debugOptions.showDirectionLines} onChange={(value) => setDebugOption("showDirectionLines", value)} />
            <CheckboxInput label="显示搜索范围" checked={debugOptions.showSearchRange} onChange={(value) => setDebugOption("showSearchRange", value)} />
          </div>
          <p className="skill-editor-test-notice">调试开关只保存在编辑器临时状态中，不会写入正式技能配置文件。</p>
        </EditorSection>
      </div>
    );
  }
  if (draft.behavior.template === "player_nova") {
    return (
      <div className="skill-editor-projectile-panel">
        <EditorSection title="范围新星">
          <div className="skill-editor-form-grid">
            <ReadOnlyInput label="技能编号" value={draft.id} />
            <ReadOnlyInput label="行为模板" value={draft.behavior.template} />
            <SelectInput label="中心规则" value={String(params.center_policy ?? "player_center")} options={editor.options.center_policies} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.center_policy = value; })} />
            <NumberInput label="半径" value={numberValue(params.radius, 1)} min={1} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.radius = value; })} />
            <NumberInput label="新星环宽" value={numberValue(params.ring_width, 1)} min={1} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.ring_width = value; })} />
            <NumberInput label="最大目标数" value={numberValue(params.max_targets, 1)} min={1} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.max_targets = value; })} />
            <SelectInput label="距离衰减" value={String(params.damage_falloff_by_distance ?? "none")} options={editor.options.damage_falloff_modes} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.damage_falloff_by_distance = value; })} />
            <NumberInput label="状态几率倍率" value={numberValue(params.status_chance_scale, 1)} min={0} max={10} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.status_chance_scale = value; })} />
            <ReadOnlyInput label="只读范围摘要" value={playerNovaRangeSummary(draft)} />
          </div>
        </EditorSection>
        <EditorSection title="时序">
          <div className="skill-editor-form-grid">
            <NumberInput label="扩散时长毫秒" value={numberValue(params.expand_duration_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.expand_duration_ms = value; })} />
            <NumberInput label="命中时机毫秒" value={numberValue(params.hit_at_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.hit_at_ms = value; })} />
            <SelectInput label="伤害时机" value={draft.hit.damage_timing ?? "on_area_hit"} options={editor.options.damage_timings} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.damage_timing = value; })} />
            <NumberInput label="命中延迟毫秒" value={numberValue(draft.hit.hit_delay_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.hit_delay_ms = value; })} />
            <NumberInput label="命中范围" value={numberValue(draft.hit.hit_radius, 0)} min={0} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.hit_radius = value; })} />
            <ReadOnlyInput label="只读命中时机摘要" value={playerNovaHitTimingSummary(draft)} />
          </div>
        </EditorSection>
        <EditorSection title="表现">
          <div className="skill-editor-form-grid">
            <TextInput label="释放特效" value={draft.presentation.cast_vfx_key ?? ""} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.cast_vfx_key = value; })} />
            <TextInput label="命中特效" value={draft.presentation.hit_vfx_key ?? ""} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.hit_vfx_key = value; })} />
            <TextInput label="通用视觉效果" value={draft.presentation.vfx} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.vfx = value; })} />
            <NumberInput label="特效放大倍数" value={numberValue(draft.presentation.vfx_scale, 1)} min={0.1} max={10} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.vfx_scale = value; })} />
            <TextInput label="音效" value={draft.presentation.sfx} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.sfx = value; })} />
            <TextInput label="伤害浮字" value={draft.presentation.floating_text} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.floating_text = value; })} />
            <TextInput label="屏幕反馈" value={draft.presentation.screen_feedback} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.screen_feedback = value; })} />
          </div>
        </EditorSection>
      </div>
    );
  }
  if (draft.behavior.template === "melee_arc") {
    return (
      <div className="skill-editor-projectile-panel">
        <EditorSection title="近战扇形">
          <div className="skill-editor-form-grid">
            <ReadOnlyInput label="技能编号" value={draft.id} />
            <ReadOnlyInput label="行为模板" value={draft.behavior.template} />
            <SelectInput label="朝向规则" value={String(params.facing_policy ?? "nearest_target")} options={editor.options.facing_policies} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.facing_policy = value; })} />
            <SelectInput label="命中形状" value={String(params.hit_shape ?? "sector")} options={editor.options.hit_shapes} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.hit_shape = value; })} />
            <NumberInput label="扇形角度" value={numberValue(params.arc_angle, 1)} min={1} max={180} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.arc_angle = value; })} />
            <NumberInput label="扇形半径" value={numberValue(params.arc_radius, 1)} min={1} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.arc_radius = value; })} />
            <NumberInput label="最大目标数" value={numberValue(params.max_targets, 1)} min={1} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.max_targets = value; })} />
            <NumberInput label="状态几率倍率" value={numberValue(params.status_chance_scale, 1)} min={0} max={10} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.status_chance_scale = value; })} />
            <ReadOnlyInput label="只读扇形范围摘要" value={meleeArcRangeSummary(draft)} />
          </div>
        </EditorSection>
        <EditorSection title="时序">
          <div className="skill-editor-form-grid">
            <NumberInput label="前摇毫秒" value={numberValue(params.windup_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.windup_ms = value; })} />
            <NumberInput label="命中时机毫秒" value={numberValue(params.hit_at_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.hit_at_ms = value; })} />
            <SelectInput label="伤害时机" value={draft.hit.damage_timing ?? "on_melee_hit"} options={editor.options.damage_timings} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.damage_timing = value; })} />
            <NumberInput label="命中延迟毫秒" value={numberValue(draft.hit.hit_delay_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.hit_delay_ms = value; })} />
            <NumberInput label="命中范围" value={numberValue(draft.hit.hit_radius, 0)} min={0} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.hit_radius = value; })} />
            <ReadOnlyInput label="只读命中时机摘要" value={meleeArcHitTimingSummary(draft)} />
          </div>
        </EditorSection>
        <EditorSection title="表现">
          <div className="skill-editor-form-grid">
            <TextInput label="斩击特效键" value={String(params.slash_vfx_key ?? "")} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.slash_vfx_key = value; })} />
            <TextInput label="施法特效" value={draft.presentation.cast_vfx_key ?? ""} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.cast_vfx_key = value; })} />
            <TextInput label="命中特效" value={draft.presentation.hit_vfx_key ?? ""} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.hit_vfx_key = value; })} />
            <TextInput label="通用视觉效果" value={draft.presentation.vfx} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.vfx = value; })} />
            <NumberInput label="特效放大倍数" value={numberValue(draft.presentation.vfx_scale, 1)} min={0.1} max={10} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.vfx_scale = value; })} />
            <TextInput label="音效" value={draft.presentation.sfx} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.sfx = value; })} />
            <TextInput label="伤害浮字" value={draft.presentation.floating_text} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.floating_text = value; })} />
            <TextInput label="屏幕反馈" value={draft.presentation.screen_feedback} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.screen_feedback = value; })} />
          </div>
        </EditorSection>
      </div>
    );
  }
  return (
    <div className="skill-editor-projectile-panel">
      <EditorSection title="基础">
        <div className="skill-editor-form-grid">
          <ReadOnlyInput label="技能编号" value={draft.id} />
          <ReadOnlyInput label="技能标签" value={draft.classification.tags.join("，")} />
          <ReadOnlyInput label="行为模板" value={draft.behavior.template} />
          <SelectInput label="伤害类型" value={draft.classification.damage_type} options={editor.options.damage_types} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.classification.damage_type = value; })} />
          <SelectInput label="伤害形式" value={draft.classification.damage_form} options={editor.options.damage_forms} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.classification.damage_form = value; })} />
          <SelectInput label="目标选择方式" value={draft.cast.target_selector} options={editor.options.target_selectors} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.cast.target_selector = value; })} />
        </div>
      </EditorSection>
      <EditorSection title="发射位置">
        <div className="skill-editor-form-grid">
          <ReadOnlyInput label="发射来源" value={sourceText} />
          <NumberInput label="发射偏移横向" value={numberValue(params.spawn_offset?.x, 0)} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.spawn_offset = { ...(next.behavior.params.spawn_offset ?? { x: 0, y: 0 }), x: value }; })} />
          <NumberInput label="发射偏移纵向" value={numberValue(params.spawn_offset?.y, 0)} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.spawn_offset = { ...(next.behavior.params.spawn_offset ?? { x: 0, y: 0 }), y: value }; })} />
          <ReadOnlyInput label="逻辑发射点" value={formatPoint(eventDebug?.spawn)} />
          <ReadOnlyInput label="特效发射点" value={formatPoint(eventDebug?.vfxSpawn)} />
          <button className="skill-editor-inline-action" type="button" disabled={!canAdjustLaunchPoint} onClick={onBeginLaunchPointAdjustment}>
            直接调整
          </button>
        </div>
      </EditorSection>
      <EditorSection title="发射方向">
        <div className="skill-editor-form-grid">
          <ReadOnlyInput label="当前方向模式" value={directionModeText} />
          <NumberInput label="扇形角度" value={numberValue(params.spread_angle_deg, 0)} min={0} max={180} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.spread_angle_deg = value; })} />
          <NumberInput label="角度间隔" value={numberValue(params.angle_step, 0)} min={0} max={90} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.angle_step = value; })} />
          <ReadOnlyInput label="逻辑飞行方向" value={formatPoint(eventDebug?.direction)} />
          <ReadOnlyInput label="特效飞行方向" value={formatPoint(eventDebug?.vfxDirection)} />
        </div>
      </EditorSection>
      <EditorSection title="目标搜索">
        <div className="skill-editor-form-grid">
          <SelectInput label="释放目标选择" value={draft.cast.target_selector} options={editor.options.target_selectors} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.cast.target_selector = value; })} />
          <NumberInput label="释放搜索范围" value={draft.cast.search_range} min={0} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.cast.search_range = value; })} />
          <SelectInput label="命中目标规则" value={draft.hit.target_policy ?? "selected_target"} options={editor.options.target_policies} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.target_policy = value; })} />
          <NumberInput label="最大目标数" value={numberValue(params.max_targets, 1)} min={1} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.max_targets = value; })} />
        </div>
      </EditorSection>
      <EditorSection title="发射组">
        <div className="skill-editor-form-grid">
          <NumberInput label="投射物数量" value={numberValue(params.projectile_count, 1)} min={1} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.projectile_count = value; })} />
          <NumberInput label="连发间隔毫秒" value={numberValue(params.burst_interval_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.burst_interval_ms = value; })} />
          <NumberInput label="扇形角度" value={numberValue(params.spread_angle_deg, 0)} min={0} max={180} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.spread_angle_deg = value; })} />
          <NumberInput label="角度间隔" value={numberValue(params.angle_step, 0)} min={0} max={90} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.angle_step = value; })} />
          <NumberInput label="随机角度偏移" value={numberValue(params.random_angle_jitter_deg, 0)} min={0} max={45} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.random_angle_jitter_deg = value; })} />
        </div>
      </EditorSection>
      <EditorSection title="运动">
        <div className="skill-editor-form-grid">
          <NumberInput label="投射物速度" value={numberValue(params.projectile_speed, 1)} min={1} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.projectile_speed = value; })} />
          <NumberInput label="最大距离" value={numberValue(params.max_distance, 1)} min={1} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.max_distance = value; })} />
          <NumberInput label="最短持续毫秒" value={numberValue(params.min_duration_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.min_duration_ms = value; })} />
          <NumberInput label="最长持续毫秒" value={numberValue(params.max_duration_ms, 1)} min={1} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.max_duration_ms = value; })} />
        </div>
      </EditorSection>
      <EditorSection title="碰撞">
        <div className="skill-editor-form-grid">
          <NumberInput label="投射物宽度" value={numberValue(params.projectile_width, 1)} min={1} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.projectile_width = value; })} />
          <NumberInput label="投射物高度" value={numberValue(params.projectile_height, 1)} min={1} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.projectile_height = value; })} />
          <NumberInput label="碰撞半径" value={numberValue(params.collision_radius, 0)} min={0} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.collision_radius = value; })} />
          <NumberInput label="投射物半径" value={numberValue(params.projectile_radius, 0)} min={0} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.projectile_radius = value; })} />
          <NumberInput label="命中半径" value={numberValue(params.impact_radius, 0)} min={0} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.impact_radius = value; })} />
          <SelectInput label="命中后行为" value={String(params.hit_policy ?? "first_hit")} options={editor.options.hit_policies} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.hit_policy = value; })} />
          <NumberInput label="穿透次数" value={numberValue(params.pierce_count, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.behavior.params.pierce_count = value; })} />
        </div>
      </EditorSection>
      <EditorSection title="伤害">
        <div className="skill-editor-form-grid">
          <NumberInput label="命中基础伤害" value={draft.hit.base_damage} min={0} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.base_damage = value; })} />
          <SelectInput label="伤害时机" value={draft.hit.damage_timing ?? "on_projectile_hit"} options={editor.options.damage_timings} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.damage_timing = value; })} />
          <NumberInput label="命中延迟毫秒" value={numberValue(draft.hit.hit_delay_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.hit_delay_ms = value; })} />
          <NumberInput label="命中范围" value={numberValue(draft.hit.hit_radius, 0)} min={0} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.hit_radius = value; })} />
          <CheckboxInput label="可以暴击" checked={draft.hit.can_crit} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.can_crit = value; })} />
          <CheckboxInput label="可以附加状态" checked={draft.hit.can_apply_status} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.hit.can_apply_status = value; })} />
        </div>
      </EditorSection>
      <EditorSection title="表现">
        <div className="skill-editor-form-grid">
          <TextInput label="施法特效" value={draft.presentation.cast_vfx_key ?? ""} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.cast_vfx_key = value; })} />
          <TextInput label="投射物特效" value={draft.presentation.projectile_vfx_key ?? ""} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.projectile_vfx_key = value; })} />
          <TextInput label="命中特效" value={draft.presentation.hit_vfx_key ?? ""} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.hit_vfx_key = value; })} />
          <TextInput label="通用视觉效果" value={draft.presentation.vfx} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.vfx = value; })} />
          <NumberInput label="特效放大倍数" value={numberValue(draft.presentation.vfx_scale, 1)} min={0.1} max={10} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.vfx_scale = value; })} />
          <TextInput label="音效" value={draft.presentation.sfx} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.sfx = value; })} />
          <TextInput label="伤害浮字" value={draft.presentation.floating_text} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.floating_text = value; })} />
          <TextInput label="浮字样式" value={draft.presentation.floating_text_style ?? ""} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.floating_text_style = value; })} />
          <TextInput label="屏幕反馈" value={draft.presentation.screen_feedback} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.screen_feedback = value; })} />
          <NumberInput label="命中停顿毫秒" value={numberValue(draft.presentation.hit_stop_ms, 0)} min={0} integer disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.hit_stop_ms = value; })} />
          <NumberInput label="镜头震动" value={numberValue(draft.presentation.camera_shake, 0)} min={0} disabled={!canEdit} onChange={(value) => updateDraft((next) => { next.presentation.camera_shake = value; })} />
        </div>
      </EditorSection>
      <EditorSection title="调试">
        <div className="skill-editor-debug-options">
          <CheckboxInput label="显示发射点" checked={debugOptions.showLaunchPoints} onChange={(value) => setDebugOption("showLaunchPoints", value)} />
          <CheckboxInput label="显示目标点" checked={debugOptions.showTargetPoint} onChange={(value) => setDebugOption("showTargetPoint", value)} />
          <CheckboxInput label="显示飞行方向线" checked={debugOptions.showDirectionLines} onChange={(value) => setDebugOption("showDirectionLines", value)} />
          <CheckboxInput label="显示碰撞半径" checked={debugOptions.showCollisionRadius} onChange={(value) => setDebugOption("showCollisionRadius", value)} />
          <CheckboxInput label="显示搜索范围" checked={debugOptions.showSearchRange} onChange={(value) => setDebugOption("showSearchRange", value)} />
        </div>
        <p className="skill-editor-test-notice">调试开关只保存在编辑器临时状态中，不会写入正式技能配置文件。</p>
      </EditorSection>
    </div>
  );
}

function GenericEventParameterPanel({ event, selectedEventType }: { event: SkillEventTimelineItem | null; selectedEventType: string }) {
  return (
    <EditorSection title="事件参数">
      <div className="skill-editor-form-grid">
        <ReadOnlyInput label="事件类型" value={event?.type_text ?? "未识别事件"} />
        <ReadOnlyInput label="事件时间" value={event ? `${event.timestamp_ms} 毫秒` : "未运行预览"} />
        <ReadOnlyInput label="来源实体" value={event?.source_entity ?? "无"} />
        <ReadOnlyInput label="目标实体" value={event?.target_entity ?? "无"} />
        <ReadOnlyInput label="数值" value={event?.amount === null || event?.amount === undefined ? "无" : formatPreviewNumber(event.amount)} />
        <ReadOnlyInput label="特效标识" value={event?.vfx_key ?? "无"} />
      </div>
    </EditorSection>
  );
}

function projectileDebugFromEvent(event: SkillEventTimelineItem | null): ProjectileDebugSnapshot | null {
  if (!event || !event.payload || typeof event.payload !== "object") return null;
  const payload = event.payload as Record<string, unknown>;
  const spawn = pointFromUnknown(payload.spawn_world_position) ?? pointFromUnknown(event.position);
  const target = pointFromUnknown(payload.target_world_position) ?? pointFromUnknown(payload.impact_world_position) ?? pointFromUnknown(event.position);
  const direction = pointFromUnknown(payload.direction_world) ?? pointFromUnknown(event.direction);
  if (!spawn || !target || !direction) return null;
  return {
    spawn,
    vfxSpawn: pointFromUnknown(payload.vfx_spawn_world_position) ?? spawn,
    target,
    direction,
    vfxDirection: pointFromUnknown(payload.vfx_direction_world) ?? direction
  };
}

function projectileDebugPreviewFromDraft(packageData: SkillPackageData, scene: SkillTestArenaView["scenes"][number] | null): ProjectileDebugSnapshot {
  const params = packageData.behavior.params;
  const spawn = projectileSpawnWorldPosition({ x: 0, y: -12 }, params);
  const target = scene?.enemies[0]?.position ?? { x: Number(params.max_distance ?? 520), y: -12 };
  const direction = guideDirection(spawn, target);
  return { spawn, vfxSpawn: spawn, target, direction, vfxDirection: direction };
}

function pointFromUnknown(value: unknown): { x: number; y: number } | null {
  if (!value || typeof value !== "object") return null;
  const point = value as { x?: unknown; y?: unknown };
  const x = Number(point.x);
  const y = Number(point.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function formatPoint(point: { x: number; y: number } | null | undefined) {
  if (!point) return "暂无";
  return `x ${formatPreviewNumber(point.x)}，y ${formatPreviewNumber(point.y)}`;
}

function requirePositiveInteger(value: unknown, label: string, errors: string[]) {
  requireIntegerAtLeast(value, label, 1, errors);
}

function requireIntegerAtLeast(value: unknown, label: string, minimum: number, errors: string[]) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum) errors.push(`${label} 必须是不小于 ${minimum} 的整数。`);
}

function requireNumberAtLeast(value: unknown, label: string, minimum: number, errors: string[]) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum) errors.push(`${label} 必须是不小于 ${minimum} 的数字。`);
}

function requireNumberRange(value: unknown, label: string, minimum: number, maximum: number, errors: string[]) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) errors.push(`${label} 必须在 ${minimum} 到 ${maximum} 之间。`);
}

function EditorSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="skill-editor-section" aria-label={title}>
      <h4>{title}</h4>
      {children}
    </section>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ReadOnlyInput({ label, value }: { label: string; value: ReactNode }) {
  return (
    <label className="skill-editor-field">
      <span>{label}</span>
      <input value={String(value ?? "")} readOnly aria-readonly="true" />
    </label>
  );
}

function TextInput({
  label,
  value,
  disabled,
  onChange
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="skill-editor-field">
      <span>{label}</span>
      <input value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberInput({
  label,
  value,
  min,
  max,
  integer,
  disabled,
  onChange
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  integer?: boolean;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="skill-editor-field">
      <span>{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={integer ? 1 : 0.01}
        disabled={disabled}
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          onChange(integer ? Math.trunc(nextValue) : nextValue);
        }}
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  options,
  disabled,
  onChange
}: {
  label: string;
  value: string;
  options: SkillEditorOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="skill-editor-field">
      <span>{label}</span>
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.text}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxInput({
  label,
  checked,
  disabled,
  onChange
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="skill-editor-check-field">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function EditableStringList({
  label,
  values,
  disabled,
  onChange
}: {
  label: string;
  values: string[];
  disabled?: boolean;
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="skill-editor-list-editor">
      <span>{label}</span>
      {values.map((value, index) => (
        <div key={`${value}-${index}`} className="skill-editor-list-row">
          <input
            value={value}
            disabled={disabled}
            onChange={(event) => {
              const next = values.slice();
              next[index] = event.target.value;
              onChange(next);
            }}
          />
          <button type="button" disabled={disabled || values.length <= 1} onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}>
            删除
          </button>
        </div>
      ))}
      <button type="button" disabled={disabled} onClick={() => onChange([...values, ""])}>
        添加
      </button>
    </div>
  );
}

function CheckboxList({
  label,
  values,
  options,
  disabled,
  onChange
}: {
  label: string;
  values: string[];
  options: SkillEditorOption[];
  disabled?: boolean;
  onChange: (values: string[]) => void;
}) {
  const selected = new Set(values);
  return (
    <div className="skill-editor-checkbox-list">
      <span>{label}</span>
      <div>
        {options.map((option) => (
          <label key={option.value}>
            <input
              type="checkbox"
              checked={selected.has(option.value)}
              disabled={disabled}
              onChange={(event) => {
                if (event.target.checked) {
                  onChange([...values, option.value]);
                } else {
                  onChange(values.filter((value) => value !== option.value));
                }
              }}
            />
            <span>{option.text}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ModifierStatList({ stats }: { stats: SkillEditorModifierStat[] }) {
  return (
    <ul className="skill-editor-modifier-stats">
      {stats.map((stat, index) => (
        <li key={`${stat.stat}-${index}`}>
          <span>{stat.stat_text}</span>
          <b>{formatModifierValue(stat.stat, stat.value)}</b>
          <em>{stat.layer_text}{stat.relation_text ? ` / ${stat.relation_text}` : ""}</em>
        </li>
      ))}
    </ul>
  );
}

function ModifierPreviewResult({ preview }: { preview: SkillEditorModifierPreview }) {
  const rows = [
    ["原始最终伤害", preview.baseline.final_damage, "测试后最终伤害", preview.tested.final_damage],
    ["原始最终冷却", preview.baseline.final_cooldown_ms, "测试后最终冷却", preview.tested.final_cooldown_ms],
    ["原始投射物数量", preview.baseline.projectile_count, "测试后投射物数量", preview.tested.projectile_count],
    ["原始投射物速度", preview.baseline.projectile_speed, "测试后投射物速度", preview.tested.projectile_speed]
  ] as const;
  return (
    <div className="skill-editor-modifier-preview">
      <h5>临时最终技能实例预览</h5>
      <dl>
        {rows.map(([leftLabel, leftValue, rightLabel, rightValue]) => (
          <div key={leftLabel}>
            <dt>{leftLabel}</dt>
            <dd>{formatPreviewNumber(leftValue)}</dd>
            <dt>{rightLabel}</dt>
            <dd>{formatPreviewNumber(rightValue)}</dd>
          </div>
        ))}
      </dl>
      <p>模拟关系：{preview.relation_text}；来源强度：{preview.source_power}；目标强度：{preview.target_power}；导管强度：{preview.conduit_power}</p>
      <h6>生效词缀列表</h6>
      {preview.applied_modifiers.length > 0 ? (
        <ul className="skill-editor-preview-modifier-list">
          {preview.applied_modifiers.map((modifier, index) => (
            <li key={`${modifier.id}-${modifier.stat.stat}-${index}`}>
              {modifier.name_text}：{modifier.stat.stat_text} {formatModifierValue(modifier.stat.stat, modifier.value)}（{modifier.layer_text}，{modifier.relation_text}）
            </li>
          ))}
        </ul>
      ) : (
        <p className="skill-editor-test-empty">没有生效的测试词缀。</p>
      )}
      <h6>未生效词缀列表</h6>
      {preview.unapplied_modifiers.length > 0 ? (
        <ul className="skill-editor-preview-modifier-list">
          {preview.unapplied_modifiers.map((modifier, index) => (
            <li key={`${modifier.id}-${modifier.stat.stat}-off-${index}`}>
              {modifier.name_text}：{modifier.reason_text}
            </li>
          ))}
        </ul>
      ) : (
        <p className="skill-editor-test-empty">没有未生效项。</p>
      )}
    </div>
  );
}

function SkillTestArenaResultView({
  result,
  stage,
  stageIndex
}: {
  result: SkillTestArenaResult;
  stage: SkillTestArenaStage;
  stageIndex: number;
}) {
  return (
    <div className="skill-test-arena-result">
      <div className="skill-test-arena-summary">
        <h5>本次测试结果</h5>
        <dl>
          <div><dt>测试技能</dt><dd>{result.skill_name_text}</dd></div>
          <div><dt>测试场景</dt><dd>{result.scene_name_text}</dd></div>
          <div><dt>测试栈状态</dt><dd>{result.modifier_stack_enabled ? "已启用" : "未启用"}</dd></div>
          <div><dt>当前阶段</dt><dd>{stage.stage_name_text}</dd></div>
          <div><dt>事件数量</dt><dd>{result.event_count}</dd></div>
          <div><dt>飞行时间</dt><dd>{formatPreviewNumber(result.flight_duration_ms)} 毫秒</dd></div>
        </dl>
      </div>
      <div className="skill-test-arena-checks">
        {result.has_area_spawn && <span>已生成范围</span>}
        {result.has_melee_arc && <span>已生成近战扇形</span>}
        {result.has_damage_zone && <span>已生成伤害结算区域</span>}
        {result.has_chain_segment && <span>已生成连锁段</span>}
        <span>{result.has_projectile_spawn ? "已生成投射物" : result.has_chain_segment ? "连锁段已生效" : result.has_damage_zone ? "伤害区域已生效" : result.has_area_spawn ? "范围生成已生效" : result.has_melee_arc ? "近战扇形已生效" : "缺少技能生成事件"}</span>
        <span>{result.has_damage ? "已生成伤害" : "缺少伤害"}</span>
        <span>{result.has_hit_vfx ? "已生成命中特效" : "缺少命中特效"}</span>
        <span>{result.has_floating_text ? "已生成伤害浮字" : "缺少伤害浮字"}</span>
        <span>{result.flight_no_damage_passed ? "飞行期间未扣血：通过" : "飞行期间未扣血：未通过"}</span>
      </div>
      <div className="skill-test-arena-columns">
        <div>
          <h5>怪物生命</h5>
          <MonsterLifeList monsters={stage.monsters} />
        </div>
        <div>
          <h5>命中目标</h5>
          {stage.hit_targets.length > 0 ? (
            <ul className="skill-test-arena-list">
              {stage.hit_targets.map((target) => <li key={target.enemy_id}>{target.name_text}</li>)}
            </ul>
          ) : (
            <p className="skill-editor-test-empty">当前阶段尚未命中目标。</p>
          )}
        </div>
        <div>
          <h5>实际伤害结果</h5>
          {stage.damage_results.length > 0 ? (
            <ul className="skill-test-arena-list">
              {stage.damage_results.map((damage, index) => (
                <li key={`${damage.enemy_id}-${damage.projectile_index}-${index}`}>
                  {damage.name_text}：{formatPreviewNumber(damage.amount)} 点，延迟 {damage.delay_ms} 毫秒
                </li>
              ))}
            </ul>
          ) : (
            <p className="skill-editor-test-empty">当前阶段尚未结算伤害。</p>
          )}
        </div>
      </div>
      <div className="skill-test-arena-summary">
        <h5>参数变化</h5>
        <dl>
          <div><dt>原始最终伤害</dt><dd>{formatPreviewNumber(result.baseline.final_damage)}</dd></div>
          <div><dt>测试后最终伤害</dt><dd>{formatPreviewNumber(result.tested.final_damage)}</dd></div>
          <div><dt>原始最终冷却</dt><dd>{formatPreviewNumber(result.baseline.final_cooldown_ms)}</dd></div>
          <div><dt>测试后最终冷却</dt><dd>{formatPreviewNumber(result.tested.final_cooldown_ms)}</dd></div>
          <div><dt>原始投射物数量</dt><dd>{formatPreviewNumber(result.baseline.projectile_count)}</dd></div>
          <div><dt>测试后投射物数量</dt><dd>{formatPreviewNumber(result.tested.projectile_count)}</dd></div>
          <div><dt>原始投射物速度</dt><dd>{formatPreviewNumber(result.baseline.projectile_speed)}</dd></div>
          <div><dt>测试后投射物速度</dt><dd>{formatPreviewNumber(result.tested.projectile_speed)}</dd></div>
        </dl>
      </div>
      <div className="skill-test-arena-events">
        <h5>本次事件原始摘要</h5>
        <p>当前显示第 {stageIndex + 1} 个测试阶段，已应用 {stage.applied_event_count} / {stage.total_event_count} 个事件。</p>
        {stage.event_summary.length > 0 ? (
          <ul className="skill-test-arena-list">
            {stage.event_summary.map((event) => (
              <li key={event.event_id}>
                {event.type_text}：延迟 {event.delay_ms} 毫秒，持续 {event.duration_ms} 毫秒，目标 {event.target_entity || "无"}{event.amount !== null ? `，数值 ${formatPreviewNumber(event.amount)}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="skill-editor-test-empty">当前阶段没有事件。</p>
        )}
      </div>
      <SkillEventTimelineView result={result} visibleEventCount={stage.applied_event_count} />
    </div>
  );
}

function SkillEventTimelineView({ result, visibleEventCount }: { result: SkillTestArenaResult; visibleEventCount: number }) {
  const visibleEvents = result.event_timeline.slice(0, Math.min(visibleEventCount, MAX_SKILL_EDITOR_TIMELINE_ROWS));
  const hiddenEventCount = Math.max(0, visibleEventCount - visibleEvents.length);
  return (
    <div className="skill-event-timeline">
      <div className="skill-event-timeline-heading">
        <div>
          <h5>技能事件时间线</h5>
          <p>数据来自本次测试运行的真实技能事件序列，重置或切换场景后会清空旧结果。</p>
        </div>
        <span>{visibleEvents.length} / {result.event_timeline.length} 个事件</span>
      </div>
      <div className="skill-event-supported-types" aria-label="支持识别的事件类型">
        {result.timeline_supported_types.map((eventType) => (
          <span key={eventType.type}>{eventType.text}</span>
        ))}
      </div>
      <div className="skill-event-checks">
        <TimelineCheck label="存在范围生成" passed={Boolean(result.timeline_checks.has_area_spawn)} />
        <TimelineCheck label="范围以玩家为中心" passed={Boolean(result.timeline_checks.area_center_passed ?? true)} />
        <TimelineCheck label="存在伤害结算区域" passed={Boolean(result.timeline_checks.has_damage_zone)} />
        <TimelineCheck label="伤害区域从玩家发出" passed={Boolean(result.timeline_checks.damage_zone_origin_passed ?? true)} />
        <TimelineCheck label="存在近战扇形" passed={Boolean(result.timeline_checks.has_melee_arc)} />
        <TimelineCheck label="扇形从玩家发出" passed={Boolean(result.timeline_checks.melee_arc_origin_passed ?? true)} />
        <TimelineCheck label="存在连锁段" passed={Boolean(result.timeline_checks.has_chain_segment)} />
        <TimelineCheck label="存在多段连锁" passed={Boolean(result.timeline_checks.has_multiple_chain_segment ?? true)} />
        <TimelineCheck label="默认不重复命中" passed={Boolean(result.timeline_checks.chain_no_repeat_targets ?? true)} />
        <TimelineCheck label="存在投射物生成" passed={result.timeline_checks.has_projectile_spawn} />
        <TimelineCheck label="存在多枚投射物" passed={result.timeline_checks.has_multiple_projectile_spawn} />
        <TimelineCheck label="存在投射物命中" passed={result.timeline_checks.has_projectile_hit} />
        <TimelineCheck label="存在伤害结算" passed={result.timeline_checks.has_damage} />
        <TimelineCheck label="存在命中特效" passed={result.timeline_checks.has_hit_vfx} />
        <TimelineCheck label="存在伤害浮字" passed={result.timeline_checks.has_floating_text} />
        <TimelineCheck label="伤害不早于投射物生成" passed={result.timeline_checks.damage_after_or_at_projectile_spawn} />
        <TimelineCheck label="伤害不早于命中时机" passed={Boolean(result.timeline_checks.damage_after_or_at_area_hit ?? true)} />
        <TimelineCheck label="伤害不早于近战命中" passed={Boolean(result.timeline_checks.damage_after_or_at_melee_hit ?? true)} />
        <TimelineCheck label="伤害不早于连锁段" passed={Boolean(result.timeline_checks.damage_after_or_at_chain_segment ?? true)} />
        <TimelineCheck label="飞行期间未扣血" passed={result.timeline_checks.flight_no_damage_passed} />
        <TimelineCheck label="扇形方向可见" passed={result.timeline_checks.fan_direction_passed} />
        <TimelineCheck label="基础时序检查" passed={result.timeline_checks.basic_timing_passed} />
      </div>
      {visibleEvents.length > 0 ? (
        <>
          <ol className="skill-event-timeline-list">
            {visibleEvents.map((event) => (
              <li key={event.event_id} className={`skill-event-timeline-item skill-event-${event.type}`}>
                <div className="skill-event-timeline-item-head">
                  <strong>{event.type_text}</strong>
                  <span>事件时间 {event.timestamp_ms} 毫秒</span>
                </div>
                <dl>
                  <div><dt>延迟</dt><dd>{event.delay_ms} 毫秒</dd></div>
                  <div><dt>持续时间</dt><dd>{event.duration_ms} 毫秒</dd></div>
                  <div><dt>来源实体</dt><dd>{event.source_entity || "无"}</dd></div>
                  <div><dt>目标实体</dt><dd>{event.target_entity || "无"}</dd></div>
                  <div><dt>数值</dt><dd>{event.amount === null ? "无" : formatPreviewNumber(event.amount)}</dd></div>
                  <div><dt>伤害类型</dt><dd>{event.damage_type ? damageTypeText(event.damage_type) : "无"}</dd></div>
                  <div><dt>特效标识</dt><dd>{event.vfx_key || "无"}</dd></div>
                  <div><dt>原因标识</dt><dd>{event.reason_key || "无"}</dd></div>
                </dl>
                <details>
                  <summary>附加数据</summary>
                  <pre>{event.payload_text || JSON.stringify(event.payload, null, 2)}</pre>
                </details>
              </li>
            ))}
          </ol>
          {hiddenEventCount > 0 && (
            <p className="skill-event-timeline-limit">当前阶段还有 {hiddenEventCount} 个事件未在首屏展开，完整事件仍保留在测试结果中。</p>
          )}
        </>
      ) : (
        <p className="skill-editor-test-empty">当前测试阶段尚无可显示事件。</p>
      )}
    </div>
  );
}

function TimelineCheck({ label, passed }: { label: string; passed: boolean }) {
  return <span className={passed ? "skill-event-check-pass" : "skill-event-check-fail"}>{label}：{passed ? "通过" : "未通过"}</span>;
}

function MonsterLifeList({ monsters }: { monsters: SkillTestArenaEnemy[] }) {
  return (
    <ul className="skill-test-arena-list">
      {monsters.map((monster) => (
        <li key={monster.enemy_id}>
          {monster.name_text}：{formatPreviewNumber(monster.current_life)} / {formatPreviewNumber(monster.max_life)}，{monster.is_alive ? "存活" : "已击破"}
        </li>
      ))}
    </ul>
  );
}

function validateModifierPower(
  sourcePower: number,
  targetPower: number,
  conduitPower: number,
  limits: { min: number; max: number }
) {
  const values = [
    ["source_power", sourcePower],
    ["target_power", targetPower],
    ["conduit_power", conduitPower]
  ] as const;
  for (const [label, value] of values) {
    if (!Number.isFinite(value)) return `${label} 必须是合法数字。`;
    if (value < limits.min || value > limits.max) return `${label} 必须在 ${limits.min} 到 ${limits.max} 之间。`;
  }
  return "";
}

function formatPreviewNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatModifierValue(stat: string, value: number) {
  if (stat === "conduit_multiplier") return `×${formatPreviewNumber(value)}`;
  if (stat.endsWith("_percent")) return `${value >= 0 ? "+" : ""}${formatPreviewNumber(value)}%`;
  return `${value >= 0 ? "+" : ""}${formatPreviewNumber(value)}`;
}

function clonePackageData(packageData: SkillPackageData | null | undefined): SkillPackageData | null {
  return packageData ? JSON.parse(JSON.stringify(packageData)) as SkillPackageData : null;
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function clampProjectileDuration(durationMs: number, minDurationMs: number, maxDurationMs: number | null) {
  const minClamped = Math.max(minDurationMs, durationMs);
  return maxDurationMs === null ? minClamped : Math.min(minClamped, maxDurationMs);
}

function projectileTravelDurationMs(packageData: SkillPackageData) {
  const speed = numberValue(packageData.behavior.params.projectile_speed, 1);
  const distance = numberValue(packageData.behavior.params.max_distance, 0);
  if (speed <= 0) return 0;
  return Math.round((distance / speed) * 1000);
}

function projectileTravelSummary(packageData: SkillPackageData) {
  const durationMs = projectileTravelDurationMs(packageData);
  const count = Math.max(1, Math.round(numberValue(packageData.behavior.params.projectile_count, 1)));
  return `${count} 枚，每枚约 ${durationMs} ms`;
}

function playerNovaRangeSummary(packageData: SkillPackageData) {
  const radius = numberValue(packageData.behavior.params.radius, 0);
  const ringWidth = numberValue(packageData.behavior.params.ring_width, 0);
  const maxTargets = Math.max(1, Math.round(numberValue(packageData.behavior.params.max_targets, 1)));
  return `半径 ${radius}，环宽 ${ringWidth}，最多命中 ${maxTargets} 个目标`;
}

function playerNovaHitTimingSummary(packageData: SkillPackageData) {
  const expandDurationMs = Math.max(0, Math.round(numberValue(packageData.behavior.params.expand_duration_ms, 0)));
  const hitAtMs = Math.max(0, Math.round(numberValue(packageData.behavior.params.hit_at_ms, 0)));
  return `扩散 ${expandDurationMs} ms，${hitAtMs} ms 时结算伤害`;
}

function meleeArcRangeSummary(packageData: SkillPackageData) {
  const arcAngle = clamp(numberValue(packageData.behavior.params.arc_angle, 0), 1, 180);
  const arcRadius = Math.max(1, numberValue(packageData.behavior.params.arc_radius, 1));
  const maxTargets = Math.max(1, Math.round(numberValue(packageData.behavior.params.max_targets, 1)));
  return `半径 ${formatPreviewNumber(arcRadius)}，角度 ${formatPreviewNumber(arcAngle)}°，最多命中 ${maxTargets} 个目标`;
}

function meleeArcHitTimingSummary(packageData: SkillPackageData) {
  const windupMs = Math.max(0, Math.round(numberValue(packageData.behavior.params.windup_ms, 0)));
  const hitAtMs = Math.max(0, Math.round(numberValue(packageData.behavior.params.hit_at_ms, 0)));
  return `前摇 ${windupMs} ms，${hitAtMs} ms 时结算伤害`;
}

function chainSegmentSummary(packageData: SkillPackageData) {
  const params = packageData.behavior.params;
  const chainCount = Math.max(1, Math.round(numberValue(params.chain_count, 1)));
  const maxTargets = Math.max(1, Math.round(numberValue(params.max_targets, chainCount)));
  const chainRadius = Math.max(1, numberValue(params.chain_radius, 1));
  return `最多 ${Math.min(chainCount, maxTargets)} 段，跳跃半径 ${formatPreviewNumber(chainRadius)}`;
}

function chainDurationSummary(packageData: SkillPackageData) {
  const params = packageData.behavior.params;
  const chainCount = Math.max(1, Math.round(numberValue(params.chain_count, 1)));
  const maxTargets = Math.max(1, Math.round(numberValue(params.max_targets, chainCount)));
  const segmentCount = Math.min(chainCount, maxTargets);
  const chainDelayMs = Math.max(0, Math.round(numberValue(params.chain_delay_ms, 0)));
  const windupMs = Math.max(0, Math.round(numberValue(packageData.cast.windup_ms, 0)));
  return `前摇 ${windupMs} ms，预计 ${windupMs + Math.max(0, segmentCount - 1) * chainDelayMs} ms 完成`;
}

function damageZoneRangeSummary(packageData: SkillPackageData) {
  const params = packageData.behavior.params;
  const maxTargets = Math.max(1, Math.round(numberValue(params.max_targets, 1)));
  if (String(params.shape ?? "circle") === "rectangle") {
    return `矩形，长 ${formatPreviewNumber(numberValue(params.length, 0))}，宽 ${formatPreviewNumber(numberValue(params.width, 0))}，角度 ${formatPreviewNumber(numberValue(params.angle_offset_deg, 0))}°，最多命中 ${maxTargets} 个目标`;
  }
  return `圆形，半径 ${formatPreviewNumber(numberValue(params.radius, 0))}，角度 360°，最多命中 ${maxTargets} 个目标`;
}

function damageZoneHitTimingSummary(packageData: SkillPackageData) {
  const hitAtMs = Math.max(0, Math.round(numberValue(packageData.behavior.params.hit_at_ms, 0)));
  return `${hitAtMs} ms 时通过 damage 事件结算伤害`;
}

function projectileLaneOffsets(projectileCount: number, spacing = 18) {
  const visibleCount = Math.max(1, Math.min(12, Math.round(projectileCount)));
  const center = (visibleCount - 1) / 2;
  return Array.from({ length: visibleCount }, (_, index) => (index - center) * spacing);
}

