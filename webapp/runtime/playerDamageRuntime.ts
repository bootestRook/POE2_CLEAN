type StatValue = {
  value?: number | boolean;
};

type PlayerStats = Record<string, StatValue | undefined> | undefined;

type MonsterDamageEnemy = {
  id: number;
  baseDamage?: number;
  damageMultiplier?: number;
  monsterSkillDamageMultiplierBonus?: number;
  damageType?: string;
  hitKind?: string;
  accuracy?: number;
  critChancePercent?: number;
  critDamagePercent?: number;
  doubleDamageChancePercent?: number;
  offenseModifiers?: Record<string, number | undefined>;
};

type PlayerDamageState = {
  hp: number;
  maxHp: number;
  currentMana: number;
  maxMana: number;
  currentEnergyShield: number;
  maxEnergyShield: number;
};

export function monsterOffenseModifier(enemy: MonsterDamageEnemy, statId: string) {
  return Number(enemy.offenseModifiers?.[statId] ?? 0);
}

export function monsterOutgoingDamage(enemy: MonsterDamageEnemy) {
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

export function monsterAccuracy(enemy: MonsterDamageEnemy) {
  const baseAccuracy = Math.max(1, Number(enemy.accuracy ?? 100));
  const additivePercent =
    monsterOffenseModifier(enemy, "accuracy_add_percent")
    + monsterOffenseModifier(enemy, "hit_accuracy_add_percent");
  const finalPercent = monsterOffenseModifier(enemy, "accuracy_final_percent");
  return baseAccuracy
    * Math.max(0, 1 + additivePercent / 100)
    * Math.max(0, 1 + finalPercent / 100);
}

export function playerEvasionChanceAgainstMonster(enemy: MonsterDamageEnemy, stats: PlayerStats) {
  const evasion = statNumber(stats?.evasion, 0);
  const evasionAddPercent = statNumber(stats?.evasion_add_percent, 0);
  const effectiveEvasion = Math.max(0, evasion * (1 + evasionAddPercent / 100));
  if (effectiveEvasion <= 0) return 0;
  return Math.min(0.95, effectiveEvasion / (effectiveEvasion + monsterAccuracy(enemy)));
}

export function resolveMonsterHitAgainstPlayer(
  enemy: MonsterDamageEnemy,
  player: PlayerDamageState,
  stats: PlayerStats,
  blocked = false,
  timestampMs = 0
) {
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

  const resourceResult = applyDamageToPlayerResources(player, incoming, stats, { useManaBeforeLife: false });
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
    totalDamage: resourceResult.totalDamage,
    shieldDamage: resourceResult.shieldDamage,
    lifeDamage: resourceResult.lifeDamage,
    nextPlayer: resourceResult.nextPlayer
  };
}

export function monsterCritChancePercent(enemy: MonsterDamageEnemy) {
  return clamp(
    Number(enemy.critChancePercent ?? 5)
    + monsterOffenseModifier(enemy, "crit_chance_percent")
    + monsterOffenseModifier(enemy, "critical_chance_percent"),
    0,
    95
  );
}

export function monsterCritDamagePercent(enemy: MonsterDamageEnemy) {
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

export function monsterDoubleDamageChancePercent(enemy: MonsterDamageEnemy) {
  return clamp(
    Number(enemy.doubleDamageChancePercent ?? 0)
    + monsterOffenseModifier(enemy, "double_damage_chance_percent"),
    0,
    100
  );
}

export function convertIncomingPlayerDamageComponents(components: Record<string, number>, stats: PlayerStats) {
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

export function mitigateIncomingPlayerDamageComponent(amount: number, damageType: string, stats: PlayerStats, penetrationPercent: number) {
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

export function playerResistancePercent(stats: PlayerStats, damageType: string, penetrationPercent: number) {
  if (damageType === "fire") return Math.min(playerResistanceCap(stats, "fire"), statNumber(stats?.fire_resistance_percent, 0) + statNumber(stats?.elemental_resistance_percent, 0)) - penetrationPercent;
  if (damageType === "cold") return Math.min(playerResistanceCap(stats, "cold"), statNumber(stats?.cold_resistance_percent, 0) + statNumber(stats?.elemental_resistance_percent, 0)) - penetrationPercent;
  if (damageType === "lightning") return Math.min(playerResistanceCap(stats, "lightning"), statNumber(stats?.lightning_resistance_percent, 0) + statNumber(stats?.elemental_resistance_percent, 0)) - penetrationPercent;
  if (damageType === "chaos") return Math.min(playerResistanceCap(stats, "chaos"), statNumber(stats?.chaos_resistance_percent, 0)) - penetrationPercent;
  return 0;
}

export function playerResistanceCap(stats: PlayerStats, damageType: string) {
  if (damageType === "chaos") return clamp(statNumber(stats?.max_chaos_resistance_percent, 75), 0, 100);
  const elementalCap = statNumber(stats?.max_elemental_resistance_percent, 75) - 75;
  if (damageType === "fire") return clamp(statNumber(stats?.max_fire_resistance_percent, 75) + elementalCap, 0, 100);
  if (damageType === "cold") return clamp(statNumber(stats?.max_cold_resistance_percent, 75) + elementalCap, 0, 100);
  if (damageType === "lightning") return clamp(statNumber(stats?.max_lightning_resistance_percent, 75) + elementalCap, 0, 100);
  return 0;
}

export function applyDamageToPlayerResources(
  player: PlayerDamageState,
  damage: number,
  stats: PlayerStats,
  options: { useManaBeforeLife?: boolean } = {}
) {
  let incoming = Math.max(0, damage);
  const manaSoakPercent = options.useManaBeforeLife ? clamp(statNumber(stats?.damage_taken_from_mana_before_life_percent, 0), 0, 100) : 0;
  let currentMana = player.currentMana;
  if (manaSoakPercent > 0 && currentMana > 0) {
    const manaPortion = incoming * manaSoakPercent / 100;
    const spentMana = Math.min(currentMana, manaPortion);
    currentMana -= spentMana;
    incoming -= spentMana;
  }
  const totalDamage = Math.max(0, incoming);
  const shieldDamage = Math.min(Math.max(0, player.currentEnergyShield), totalDamage);
  const lifeDamage = Math.max(0, totalDamage - shieldDamage);
  return {
    totalDamage,
    shieldDamage,
    lifeDamage,
    nextPlayer: {
      ...player,
      currentMana: clamp(currentMana, 0, player.maxMana),
      currentEnergyShield: clamp(player.currentEnergyShield - shieldDamage, 0, player.maxEnergyShield),
      hp: clamp(player.hp - lifeDamage, 0, player.maxHp)
    }
  };
}

function monsterOutgoingAilments(enemy: MonsterDamageEnemy, stats: PlayerStats, timestampMs: number) {
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

function monsterOutgoingAilmentChanceAgainstPlayer(statusType: string, chancePercent: number, stats: PlayerStats) {
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

function frontendPlayerStatusImmunityStats(statusType: string) {
  return [
    `immune_${statusType}`,
    `${statusType}_immunity`,
    `avoid_${statusType}_as_boolean`
  ];
}

function frontendElementalAilmentTypes() {
  return new Set(["ignite", "chill", "frozen", "freeze", "shock"]);
}

function enemyNumericStat(enemy: MonsterDamageEnemy, statId: string) {
  return Number(enemy.offenseModifiers?.[statId] ?? 0);
}

function statNumber(stat: StatValue | undefined, fallback: number) {
  return typeof stat?.value === "number" ? stat.value : fallback;
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
