export type FrontendPassiveEffect = {
  target?: string;
  stat?: string;
  value?: number;
  layer?: string;
};

export type ShapeEffectPreview = { id: string; text: string };

export type SkillAppliedModifier = {
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

export type SkillPreview = {
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
