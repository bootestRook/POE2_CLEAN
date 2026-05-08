export type FrontendPlayableSkillRuntimeFamily =
  | "projectile"
  | "chain"
  | "module_chain"
  | "damage_zone"
  | "melee_arc"
  | "player_nova"
  | "direct_hit";

export type FrontendPlayableSkillRuntimeModule = {
  family: FrontendPlayableSkillRuntimeFamily;
  eventBuilderName: string;
  primaryEventTypes: readonly string[];
  consumerBehaviors: readonly string[];
};

export const FRONTEND_PLAYABLE_SKILL_RUNTIME_MODULES: readonly FrontendPlayableSkillRuntimeModule[] = [
  {
    family: "projectile",
    eventBuilderName: "buildFrontendProjectileSkillEvents",
    primaryEventTypes: ["projectile_spawn", "projectile_hit", "damage", "hit_vfx", "floating_text"],
    consumerBehaviors: ["projectile visual scheduling", "damage application", "hit feedback"]
  },
  {
    family: "chain",
    eventBuilderName: "buildFrontendChainSkillEvents",
    primaryEventTypes: ["chain_segment", "damage", "hit_vfx", "floating_text"],
    consumerBehaviors: ["chain segment visual scheduling", "damage application", "hit feedback"]
  },
  {
    family: "module_chain",
    eventBuilderName: "buildFrontendModuleChainSkillEvents",
    primaryEventTypes: ["projectile_spawn", "projectile_impact", "damage_zone", "damage", "hit_vfx", "floating_text"],
    consumerBehaviors: ["module-chain sequencing", "damage-zone registration", "damage application"]
  },
  {
    family: "damage_zone",
    eventBuilderName: "buildFrontendDamageZoneSkillEvents",
    primaryEventTypes: ["damage_zone", "damage_zone_hit", "forced_movement", "status_apply", "damage", "hit_vfx", "floating_text"],
    consumerBehaviors: ["dynamic damage-zone ticks", "forced movement", "status application", "damage application"]
  },
  {
    family: "melee_arc",
    eventBuilderName: "buildFrontendMeleeArcSkillEvents",
    primaryEventTypes: ["melee_arc", "damage", "hit_vfx", "floating_text"],
    consumerBehaviors: ["melee arc visual scheduling", "arc target damage", "hit feedback"]
  },
  {
    family: "player_nova",
    eventBuilderName: "buildFrontendNovaSkillEvents",
    primaryEventTypes: ["area_spawn", "damage", "hit_vfx", "floating_text"],
    consumerBehaviors: ["nova visual scheduling", "area target damage", "kill-triggered follow-ups"]
  }
];

export function frontendPlayableSkillRuntimeFamilyForBehavior(behavior: string | undefined, hasProjectileDamageZoneModules = false): FrontendPlayableSkillRuntimeFamily {
  if (hasProjectileDamageZoneModules) return "module_chain";
  if (behavior === "chain") return "chain";
  if (behavior === "module_chain") return "module_chain";
  if (behavior === "damage_zone") return "damage_zone";
  if (behavior === "melee_arc") return "melee_arc";
  if (behavior === "player_nova" || behavior === "nova") return "player_nova";
  if (behavior === "projectile" || behavior === "fan_projectile") return "projectile";
  return "direct_hit";
}

export function frontendPlayableSkillRuntimeModuleForFamily(family: FrontendPlayableSkillRuntimeFamily) {
  return FRONTEND_PLAYABLE_SKILL_RUNTIME_MODULES.find((module) => module.family === family);
}
