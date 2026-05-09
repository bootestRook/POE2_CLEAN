import type { MonsterSkillRange } from "../monsterSkillRuntime";
import type { MonsterSkillShape, MonsterType, ProceduralSpawnRarity, ProceduralZoneType } from "../mapSpawnRuntime";

export type MonsterHitKind = "attack" | "spell";

export type MonsterOffenseModifiers = Record<string, number>;

export type EnemyBuff = {
  buffType: string;
  statusType: string;
  polarity: "positive" | "negative";
  remaining: number;
  duration: number;
  valuePercent: number;
  baseValue?: number;
  baseDamagePerSecond?: number;
  damageType?: string;
  nextFloatingTextIn?: number;
  sourceSkillId: string;
};

export type Enemy = {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  lastDamagedAt?: number;
  monsterId?: string;
  visualPrimaryColor?: string;
  authored?: boolean;
  boss?: boolean;
  spawnPlanSourceId?: string;
  proceduralMonsterPackId?: string;
  proceduralZoneType?: ProceduralZoneType;
  spawnRarity?: ProceduralSpawnRarity;
  monsterType?: MonsterType;
  movementSpeedMultiplier?: number;
  skillShape?: MonsterSkillShape;
  nemesis?: boolean;
  lifeMultiplier?: number;
  damageMultiplier?: number;
  baseDamage?: number;
  accuracy?: number;
  critChancePercent?: number;
  critDamagePercent?: number;
  doubleDamageChancePercent?: number;
  ignite_chance_percent?: number;
  chill_chance_percent?: number;
  freeze_chance_percent?: number;
  shock_chance_percent?: number;
  wither_chance_percent?: number;
  corrosion_ailment_chance_percent?: number;
  control_resistance_percent?: number;
  knockback_resistance_percent?: number;
  freeze_resistance_percent?: number;
  stun_resistance_percent?: number;
  ailment_resistance_percent?: number;
  elemental_ailment_resistance_percent?: number;
  dot_damage_add_percent?: number;
  dot_duration_add_percent?: number;
  reap_damage_add_percent?: number;
  agony_damage_add_percent?: number;
  armor?: number;
  fire_resistance_percent?: number;
  cold_resistance_percent?: number;
  lightning_resistance_percent?: number;
  chaos_resistance_percent?: number;
  corrosion_resistance_percent?: number;
  erosion_resistance_percent?: number;
  damage_mitigation_final_percent?: number;
  damage_avoidance_percent?: number;
  block_chance_percent?: number;
  block_damage_reduction_percent?: number;
  currentEnergyShield?: number;
  maxEnergyShield?: number;
  damageType?: string;
  hitKind?: MonsterHitKind;
  attackRange?: number;
  attackCadenceMs?: number;
  offenseModifiers?: MonsterOffenseModifiers;
  monsterSkillId?: string;
  bossPatternId?: string;
  monsterSkillForm?: string;
  monsterSkillRange?: MonsterSkillRange;
  monsterSkillDamageMultiplierBonus?: number;
  monsterSkillBuffUntilMs?: number;
  monsterGuardDamageReductionPercent?: number;
  monsterGuardUntilMs?: number;
  activeMonsterSkillUntilMs?: number;
  supremeBossInvulnerableUntilMs?: number;
  aggroLocked?: boolean;
  runtimeTier?: EnemyRuntimeTier;
  attackStartedAtMs?: number;
  attackUntilMs?: number;
  nextAttackReadyAtMs?: number;
  nextThinkAt?: number;
  knockbackUntilMs?: number;
  engagementTier?: EnemyEngagementTier;
  engagementRing?: number;
  engagementSlot?: number;
  velocityX?: number;
  velocityY?: number;
  navTargetGridX?: number;
  navTargetGridY?: number;
  activeBuffs?: EnemyBuff[];
};

export type EncounterMonsterPalette = {
  primary: string;
};

export type EnemyRuntimeTier = "dormant" | "aware" | "active" | "visible" | "dead";
export type EnemyEngagementTier = "inner" | "outer";

export type RuntimeEncounterAggroSource = {
  id: string;
  kind: "monster" | "boss";
  x: number;
  y: number;
  aggroRadius: number;
};

export type RuntimeBoundaryScanSummary = {
  status: "idle" | "running" | "done";
  tested: number;
  passed: number;
  failed: number;
  failures: string[];
};

