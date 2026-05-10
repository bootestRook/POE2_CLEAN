export type SkillEvent = {
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
