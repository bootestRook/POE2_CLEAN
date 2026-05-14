import type { SkillPreview } from "../types/skillPreviewTypes";

export const FRONTEND_PHASE_DASH_BASE_GEM_ID = "active_phase_dash";
export const FRONTEND_PHASE_DASH_SKILL_TAG = "skill_phase_dash";

const PHASE_DASH_LEVEL_20_DAMAGE = 200;

export const FRONTEND_PHASE_DASH_SKILL_LEVEL_TABLE = Object.fromEntries(
  Array.from({ length: 40 }, (_, index) => {
    const level = index + 1;
    const baseDamage = level <= 20
      ? 20 + (level - 1) * ((PHASE_DASH_LEVEL_20_DAMAGE - 20) / 19)
      : PHASE_DASH_LEVEL_20_DAMAGE + (level - 20) * (PHASE_DASH_LEVEL_20_DAMAGE * 0.005);
    return [level, {
      base_damage: Number(baseDamage.toFixed(2)),
      mana_cost: 0,
      base_cooldown_ms: 3000,
      release_interval_ms: 0
    }];
  })
) as Record<number, Record<string, number>>;

const phaseDashTags = [
  { id: "active_skill_gem", text: "\u4e3b\u52a8\u6280\u80fd\u5b9d\u77f3" },
  { id: "gem", text: "\u5b9d\u77f3" },
  { id: "loot_gem", text: "\u53ef\u6389\u843d\u5b9d\u77f3" },
  { id: "movement", text: "\u4f4d\u79fb" },
  { id: "displacement", text: "\u4f4d\u79fb" },
  { id: "physical", text: "\u7269\u7406" },
  { id: FRONTEND_PHASE_DASH_SKILL_TAG, text: "\u76f8\u4f4d\u51b2\u523a" }
] as const;

export const FRONTEND_PHASE_DASH_GEM = {
  instance_id: FRONTEND_PHASE_DASH_BASE_GEM_ID,
  base_gem_id: FRONTEND_PHASE_DASH_BASE_GEM_ID,
  name_text: "\u76f8\u4f4d\u51b2\u523a",
  description_text: "\u6309\u4e0b\u7a7a\u683c\u952e\u65f6\u5411\u9f20\u6807\u65b9\u5411\u4f4d\u79fb\uff0c\u4f4d\u79fb\u8def\u5f84\u4e0a\u7684\u654c\u4eba\u4f1a\u53d7\u5230\u7269\u7406\u4f24\u5bb3\u3002",
  category_text: "\u4e3b\u52a8\u6280\u80fd\u5b9d\u77f3",
  gem_type: {
    id: "gem_type_1",
    number: 1,
    display_text: "1\u53f7\u5b9d\u77f3",
    identity_text: "\u4e00\u53f7\u4e3b\u52a8\u6280\u80fd\u8eab\u4efd",
    color_key: "red"
  },
  gem_kind: "active_skill",
  gem_kind_text: "\u4e3b\u52a8\u6280\u80fd\u5b9d\u77f3",
  sudoku_digit: 1,
  rarity_text: "\u666e\u901a",
  level: 1,
  locked: false,
  board_position: null,
  tags: phaseDashTags,
  current_effective_targets: [],
  visual_effect: "skill_event.phase_dash.vfx",
  shape_effect: "",
  shape_effect_text: "",
  tooltip_view: {
    variant: "active",
    icon_text: "\u51b2",
    icon_color_key: "red",
    icon_sprite: "",
    name_text: "\u76f8\u4f4d\u51b2\u523a",
    subtitle_text: "\u7ea2\u8272\u3001\u5b9d\u77f3\u3001\u4f4d\u79fb\u3001\u7269\u7406",
    type_identity_text: "",
    tags: [
      { id: "gem", text: "\u5b9d\u77f3" },
      { id: "movement", text: "\u4f4d\u79fb" },
      { id: "physical", text: "\u7269\u7406" }
    ],
    sections: {
      description: {
        title_text: "\u63cf\u8ff0",
        lines: [
          "\u6309\u7a7a\u683c\u5411\u9f20\u6807\u65b9\u5411\u51b2\u523a 200px\uff0c\u4e0d\u4f1a\u7a7f\u8fc7\u5899\u4f53\u3002\u4f4d\u79fb\u8def\u5f84\u4e0a\u7684\u654c\u4eba\u4f1a\u53d7\u5230\u7269\u7406\u4f24\u5bb3\u3002"
        ]
      },
      stats: {
        title_text: "\u6838\u5fc3\u6570\u503c",
        lines: [
          { label_text: "\u7b49\u7ea7", value_text: "1" },
          { label_text: "\u7269\u7406\u4f24\u5bb3", value_text: "20" },
          { label_text: "\u51b7\u5374\u65f6\u95f4", value_text: "3\u79d2" },
          { label_text: "\u4f4d\u79fb\u8ddd\u79bb", value_text: "200px" }
        ]
      },
      recent_dps: {
        title_text: "\u8fd1\u671f DPS",
        lines: []
      },
      base_skill_level: {
        lines: [
          "\u57fa\u7840\u6280\u80fd\u7b49\u7ea7\u4e3a 1"
        ]
      },
      bonuses: {
        title_text: "\u5f53\u524d\u52a0\u6210",
        lines: [
          "\u540c\u989c\u8272\u5b9d\u77f3\u4e0d\u80fd\u4f4d\u4e8e\u540c\u4e00\u884c\u3001\u5217\u6216\u5bab\u683c"
        ]
      }
    }
  }
};

export const FRONTEND_PHASE_DASH_SKILL_PREVIEW: SkillPreview = {
  active_gem_instance_id: FRONTEND_PHASE_DASH_BASE_GEM_ID,
  name_text: "\u76f8\u4f4d\u51b2\u523a",
  skill_template_id: FRONTEND_PHASE_DASH_SKILL_TAG,
  skill_package_id: FRONTEND_PHASE_DASH_BASE_GEM_ID,
  skill_package_version: "1.0.0",
  base_gem_id: FRONTEND_PHASE_DASH_BASE_GEM_ID,
  template_text: "\u76f8\u4f4d\u51b2\u523a",
  damage_type: "physical",
  behavior_type: "manual_displacement",
  behavior_template: "manual_displacement",
  visual_effect: "skill_event.phase_dash.vfx",
  cast: {
    mode: "instant",
    target_selector: "ground",
    search_range: 0,
    cooldown_ms: 3000,
    release_interval_ms: 0,
    base_cooldown_ms: 3000,
    trigger_interval_ms: 0,
    mana_cost: 0,
    windup_ms: 0,
    recovery_ms: 0
  },
  hit: {
    base_damage: 20,
    can_crit: false,
    can_apply_status: false,
    damage_timing: "on_displacement_sweep",
    hit_delay_ms: 0,
    hit_radius: 36,
    target_policy: "swept_path",
    damage_components: { physical: 20 }
  },
  runtime_params: {
    player_displacement_skill: true,
    displacement_distance_px: 200,
    displacement_hit_radius: 36,
    displacement_duration_ms: 160,
    displacement_max_targets: 999,
    frontend_skill_tags: ["movement", "displacement", "physical"]
  },
  presentation_keys: {
    vfx: "skill_event.phase_dash.vfx",
    cast_vfx_key: "skill_event.phase_dash.vfx",
    hit_vfx_key: "skill_event.phase_dash.vfx",
    floating_text: "skill_event.phase_dash.floating_text"
  },
  source_context: {
    base_gem_id: FRONTEND_PHASE_DASH_BASE_GEM_ID,
    base_gem_level: 1,
    effective_gem_level: 1,
    level_values: FRONTEND_PHASE_DASH_SKILL_LEVEL_TABLE[1]
  },
  shape_effects: [],
  final_damage: 20,
  base_damage: 20,
  non_crit_damage: 20,
  expected_hit_damage: 20,
  base_damage_components: { physical: 20 },
  final_damage_components: { physical: 20 },
  uses_per_second: 1 / 3,
  base_release_interval_ms: 0,
  release_interval_ms: 0,
  actual_interval_ms: 3000,
  base_cooldown_ms: 3000,
  trigger_interval_ms: 0,
  mana_cost: 0,
  preview_dps: 20 / 3,
  final_cooldown_ms: 3000,
  projectile_count: 1,
  area_multiplier: 1,
  speed_multiplier: 1,
  tags: phaseDashTags,
  applied_modifiers: []
};

export function frontendDisplacementSkillLevelTableForId(tableId: string) {
  return tableId === FRONTEND_PHASE_DASH_BASE_GEM_ID ? FRONTEND_PHASE_DASH_SKILL_LEVEL_TABLE : null;
}
