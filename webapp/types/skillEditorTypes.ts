export type SkillEditorSchemaStatus = {
  is_valid: boolean;
  text: string;
  errors: string[];
};

export type SecondaryHitConfig = {
  id?: string;
  trigger?: string;
  shape?: string;
  placement?: string;
  offset_distance?: number;
  radius?: number;
  base_damage?: number;
  weapon_attack_percent?: number;
  max_targets?: number;
  delay_ms?: number;
  vfx_key?: string;
  hit_vfx_key?: string;
  reason_key?: string;
  damage_conversions?: Record<string, unknown>[];
  damage_components?: Record<string, number>;
  ailments?: Record<string, unknown>[];
  hit_marker_id?: string;
  trigger_marker_id?: string;
  search_module_id?: string;
  direct_damage_module_id?: string;
};

export type SkillPackageData = {
  id: string;
  version: string;
  display: {
    name_key: string;
    description_key: string;
  };
  classification: {
    tags: string[];
    damage_type: string;
    damage_form: string;
  };
  cast: {
    mode: string;
    target_selector: string;
    search_range: number;
    cooldown_ms: number;
    windup_ms: number;
    recovery_ms: number;
  };
  behavior: {
    template: string;
    params: {
      projectile_count?: number;
      burst_interval_ms?: number;
      spread_angle_deg?: number;
      angle_step?: number;
      random_angle_jitter_deg?: number;
      projectile_speed?: number;
      projectile_width?: number;
      projectile_height?: number;
      max_distance?: number;
      hit_policy?: string;
      pierce_count?: number;
      collision_radius?: number;
      spawn_offset?: { x: number; y: number };
      projectile_radius?: number;
      impact_radius?: number;
      max_targets?: number;
      arc_angle?: number;
      arc_radius?: number;
      windup_ms?: number;
      hit_at_ms?: number;
      facing_policy?: string;
      hit_shape?: string;
      status_chance_scale?: number;
      slash_vfx_key?: string;
      min_duration_ms?: number;
      max_duration_ms?: number;
      [key: string]: unknown;
    };
  };
  modules?: {
    id: string;
    type: string;
    trigger?: {
      trigger_marker_id?: string;
      trigger_delay_ms?: number;
      [key: string]: unknown;
    };
    params: {
      [key: string]: unknown;
    };
  }[];
  hit: {
    base_damage: number;
    can_crit: boolean;
    can_apply_status: boolean;
    damage_timing?: string;
    hit_delay_ms?: number;
    hit_radius?: number;
    target_policy?: string;
    secondary_hits?: SecondaryHitConfig[];
  };
  scaling: {
    additive_stats: string[];
    final_stats: string[];
    runtime_params: string[];
  };
  presentation: {
    vfx: string;
    cast_vfx_key?: string;
    projectile_vfx_key?: string;
    hit_vfx_key?: string;
    sfx: string;
    floating_text: string;
    floating_text_style?: string;
    screen_feedback: string;
    vfx_scale?: number;
    hit_stop_ms?: number;
    camera_shake?: number;
  };
  preview: {
    show_fields: string[];
  };
};

export type SkillEditorEntry = {
  id: string;
  name_text: string;
  migrated: boolean;
  openable: boolean;
  editable: boolean;
  status_text: string;
  skill_yaml_path: string;
  behavior_template: string;
  schema_status: SkillEditorSchemaStatus;
  detail: {
    id: string;
    version: string;
    damage_type: string;
    damage_form: string;
    tags: string[];
    cooldown_ms: number | string | null;
    base_damage: number | string | null;
  } | null;
  package_data: SkillPackageData | null;
};

export type SkillEditorOption = {
  value: string;
  text: string;
};

export type SkillEditorModifierStat = {
  stat: string;
  stat_text: string;
  value: number;
  layer: string;
  layer_text: string;
  relation?: string;
  relation_text?: string;
};

export type SkillEditorTestModifier = {
  id: string;
  name_text: string;
  description_text: string;
  source_text: string;
  category: string;
  stats: SkillEditorModifierStat[];
  filter_text: string;
};

export type SkillEditorModifierStackView = {
  panel_title_text: string;
  available_title_text: string;
  selected_title_text: string;
  notice_text: string;
  relation_label_text: string;
  power_label_text: string;
  apply_button_text: string;
  clear_button_text: string;
  relation_options: SkillEditorOption[];
  power_limits: { min: number; max: number };
  available_modifiers: SkillEditorTestModifier[];
};

export type SkillEditorModifierPreview = {
  skill_id: string;
  skill_name_text: string;
  relation: string;
  relation_text: string;
  source_power: number;
  target_power: number;
  conduit_power: number;
  baseline: {
    final_damage: number;
    final_cooldown_ms: number;
    projectile_count: number;
    projectile_speed: number;
    arc_radius?: number;
    chain_radius?: number;
    chain_count?: number;
    status_chance_scale?: number;
  };
  tested: {
    final_damage: number;
    final_cooldown_ms: number;
    projectile_count: number;
    projectile_speed: number;
    arc_radius?: number;
    chain_radius?: number;
    chain_count?: number;
    status_chance_scale?: number;
  };
  applied_modifiers: SkillEditorPreviewModifier[];
  unapplied_modifiers: SkillEditorPreviewModifier[];
  writes_real_data: boolean;
};

export type SkillTestArenaEnemy = {
  enemy_id: string;
  name_text: string;
  position: { x: number; y: number };
  max_life: number;
  current_life: number;
  is_alive: boolean;
};

export type SkillTestArenaView = {
  panel_title_text: string;
  entry_button_text: string;
  notice_text: string;
  skills: {
    id: string;
    name_text: string;
    testable: boolean;
    status_text: string;
  }[];
  scenes: {
    scene_id: string;
    name_text: string;
    enemies: SkillTestArenaEnemy[];
  }[];
};

export type SkillTestArenaEventSummary = {
  event_id: string;
  type: string;
  type_text: string;
  delay_ms: number;
  duration_ms: number;
  target_entity: string;
  amount: number | null;
  projectile_index?: number;
  segment_index?: number;
};

export type SkillEventTimelineItem = {
  event_id: string;
  type: string;
  type_text: string;
  original_index: number;
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
  payload: Record<string, unknown>;
  payload_text: string;
};

export type SkillEventTimelineChecks = {
  has_projectile_spawn: boolean;
  has_multiple_projectile_spawn: boolean;
  has_damage_zone?: boolean;
  has_area_spawn?: boolean;
  has_melee_arc?: boolean;
  has_chain_segment?: boolean;
  has_multiple_chain_segment?: boolean;
  has_projectile_hit: boolean;
  has_damage: boolean;
  has_hit_vfx: boolean;
  has_floating_text: boolean;
  damage_after_or_at_projectile_spawn: boolean;
  damage_after_or_at_area_hit?: boolean;
  damage_after_or_at_melee_hit?: boolean;
  damage_after_or_at_damage_zone_hit?: boolean;
  damage_after_or_at_chain_segment?: boolean;
  chain_no_repeat_targets?: boolean;
  chain_hits_multiple_targets?: boolean;
  area_center_passed?: boolean;
  melee_arc_origin_passed?: boolean;
  damage_zone_origin_passed?: boolean;
  flight_no_damage_passed: boolean;
  fan_direction_passed: boolean;
  basic_timing_passed: boolean;
};

export type SkillTestArenaDamageResult = {
  enemy_id: string;
  name_text: string;
  amount: number;
  delay_ms: number;
  projectile_index?: number;
  segment_index?: number;
};

export type SkillTestArenaStage = {
  stage_name_text: string;
  monsters: SkillTestArenaEnemy[];
  hit_targets: { enemy_id: string; name_text: string }[];
  damage_results: SkillTestArenaDamageResult[];
  applied_event_count: number;
  event_summary: SkillTestArenaEventSummary[];
  total_event_count: number;
};

export type SkillTestArenaResult = {
  skill_id: string;
  skill_name_text: string;
  scene_id: string;
  scene_name_text: string;
  modifier_stack_enabled: boolean;
  modifier_relation_text: string;
  source_power: number;
  target_power: number;
  conduit_power: number;
  baseline: SkillEditorModifierPreview["baseline"];
  tested: SkillEditorModifierPreview["tested"];
  monsters: SkillTestArenaEnemy[];
  initial_monsters: SkillTestArenaEnemy[];
  hit_targets: { enemy_id: string; name_text: string }[];
  damage_results: SkillTestArenaDamageResult[];
  event_count: number;
  event_counts: Record<string, number>;
  has_projectile_spawn: boolean;
  has_damage_zone?: boolean;
  has_area_spawn?: boolean;
  has_melee_arc?: boolean;
  has_chain_segment?: boolean;
  has_damage: boolean;
  has_hit_vfx: boolean;
  has_floating_text: boolean;
  flight_no_damage_passed: boolean;
  flight_duration_ms: number;
  stages: SkillTestArenaStage[];
  event_summary: SkillTestArenaEventSummary[];
  event_timeline: SkillEventTimelineItem[];
  timeline_supported_types: { type: string; text: string }[];
  timeline_checks: SkillEventTimelineChecks;
  writes_real_data: boolean;
};

export type SkillEditorPreviewModifier = {
  id: string;
  name_text: string;
  stat: SkillEditorModifierStat;
  value: number;
  layer: string;
  layer_text: string;
  relation: string;
  relation_text: string;
  reason_key: string;
  reason_text: string;
  applied: boolean;
};

export type SkillEditorState = {
  title_text: string;
  subtitle_text: string;
  selected_id: string;
  entries: SkillEditorEntry[];
  options: {
    damage_types: SkillEditorOption[];
    damage_forms: SkillEditorOption[];
    cast_modes: SkillEditorOption[];
    target_selectors: SkillEditorOption[];
    hit_policies: SkillEditorOption[];
    damage_timings: SkillEditorOption[];
    center_policies: SkillEditorOption[];
    zone_shapes: SkillEditorOption[];
    origin_policies: SkillEditorOption[];
    facing_policies: SkillEditorOption[];
    hit_shapes: SkillEditorOption[];
    damage_falloff_modes: SkillEditorOption[];
    target_policies: SkillEditorOption[];
    chain_target_policies: SkillEditorOption[];
    preview_fields: SkillEditorOption[];
  };
  modifier_stack: SkillEditorModifierStackView;
  test_arena: SkillTestArenaView;
};

export type SkillEditorDebugOptions = {
  showLaunchPoints: boolean;
  showTargetPoint: boolean;
  showDirectionLines: boolean;
  showCollisionRadius: boolean;
  showSearchRange: boolean;
};

export type SkillEditorCameraSettings = {
  zoom: number;
};

export type SkillEditorSaveResponse<TState = unknown> = {
  ok: boolean;
  message_text: string;
  state: TState;
};

export type SkillEditorModifierPreviewResponse = {
  ok: boolean;
  message_text: string;
  preview: SkillEditorModifierPreview | null;
};

export type SkillTestArenaResponse = {
  ok: false;
  message_text: string;
  result: null;
} | {
  ok: true;
  message_text: string;
  result: SkillTestArenaResult;
};
