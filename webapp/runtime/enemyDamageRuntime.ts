import type { SkillEvent } from "../types/combatRuntimeTypes";
import type { Enemy } from "../types/enemyTypes";
import { clamp } from "../utils/math2d";

export type StablePercentRoll = (seed: string) => number;
export type ElementalAilmentPredicate = (statusType: string) => boolean;

export function enemyStatusApplyResistancePercent(
  enemy: Enemy,
  statusType: string,
  isElementalAilment: ElementalAilmentPredicate
) {
  let resistance = enemyNumericStat(enemy, "ailment_resistance_percent");
  if (isElementalAilment(statusType)) {
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

export function enemyStatusDurationMultiplier(enemy: Enemy, statusType: string) {
  let resistance = enemyNumericStat(enemy, "ailment_resistance_percent");
  if (enemyControlStatusTypes().has(statusType)) {
    resistance += enemyNumericStat(enemy, "control_resistance_percent");
  }
  return Math.max(0, 1 - clamp(resistance, 0, 100) / 100);
}

export function enemyControlStatusTypes() {
  return new Set(["frozen", "freeze", "stun", "stunned", "knockback", "numbed", "chill"]);
}

export function damageEventAmountAgainstEnemy(event: SkillEvent, enemy: Enemy, stablePercent: StablePercentRoll) {
  if (enemy.supremeBossInvulnerableUntilMs !== undefined && event.timestamp_ms < enemy.supremeBossInvulnerableUntilMs) return 0;
  const components = event.payload?.damage_components;
  const multiplier = damageOverTimeAggravationMultiplier(event, enemy);
  const doubleDamageMultiplier = doubleDamageEventMultiplier(event, stablePercent);
  const resistancePenetrationPercent = Number(event.payload?.resistance_penetration_percent ?? 0);
  const armorReductionPenetrationPercent = Number(event.payload?.armor_reduction_penetration_percent ?? 0);
  if (components && typeof components === "object" && !Array.isArray(components)) {
    return Object.entries(components as Record<string, unknown>).reduce((total, [damageType, value]) => {
      return total + scaledDamageAgainstEnemy(damageType, Number(value ?? 0), enemy, resistancePenetrationPercent, armorReductionPenetrationPercent, event.event_id, stablePercent);
    }, 0) * multiplier * doubleDamageMultiplier;
  }
  return scaledDamageAgainstEnemy(event.damage_type, Number(event.amount ?? 0), enemy, resistancePenetrationPercent, armorReductionPenetrationPercent, event.event_id, stablePercent) * multiplier * doubleDamageMultiplier;
}

export function doubleDamageEventMultiplier(event: SkillEvent, stablePercent: StablePercentRoll) {
  const chance = clamp(Number(event.payload?.double_damage_chance_percent ?? 0), 0, 100);
  if (chance <= 0) return 1;
  return stablePercent(`${event.event_id}:double_damage`) < chance ? 2 : 1;
}

export function damageOverTimeAggravationMultiplier(event: SkillEvent, enemy: Enemy) {
  const bonusPer10 = Math.max(0, Number(event.payload?.dot_damage_bonus_per_10_aggravation_percent ?? 0));
  if (bonusPer10 <= 0) return 1;
  const bonusPercent = (enemy.activeBuffs ?? [])
    .filter((buff) => buff.statusType === "aggravation" && buff.remaining > 0)
    .reduce((total, buff) => total + ((buff.baseValue ?? 0) / 10) * buff.valuePercent * enemyBuffStackCount(buff), 0);
  return 1 + bonusPercent / 100;
}

export function scaledDamageAgainstEnemy(
  damageType: string,
  amount: number,
  enemy: Enemy,
  resistancePenetrationPercent = 0,
  armorReductionPenetrationPercent = 0,
  rollKey = "",
  stablePercent: StablePercentRoll
) {
  if (amount <= 0) return Math.max(0, amount);
  let scaledAmount = Math.max(0, amount);
  if (damageType === "true") return scaledAmount;
  if (monsterDamageAvoided(enemy, rollKey, stablePercent)) return 0;
  if (monsterDamageBlocked(enemy, rollKey, stablePercent)) {
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
    .reduce((total, buff) => total + buff.valuePercent * enemyBuffStackCount(buff), 0);
  return scaledAmount * (1 + takenIncrease / 100);
}

export function monsterDamageAvoided(enemy: Enemy, rollKey: string, stablePercent: StablePercentRoll) {
  const chance = Math.min(75, Math.max(0, enemyNumericStat(enemy, "damage_avoidance_percent")));
  if (chance <= 0) return false;
  return stablePercent(`${rollKey || `enemy:${enemy.id}`}:monster_damage_avoid`) < chance;
}

export function monsterDamageBlocked(enemy: Enemy, rollKey: string, stablePercent: StablePercentRoll) {
  const chance = Math.min(75, Math.max(0, enemyNumericStat(enemy, "block_chance_percent")));
  if (chance <= 0) return false;
  return stablePercent(`${rollKey || `enemy:${enemy.id}`}:monster_block`) < chance;
}

export function monsterBlockDamageReduction(enemy: Enemy) {
  return Math.min(90, Math.max(0, enemyNumericStat(enemy, "block_damage_reduction_percent")));
}

export function applyDamageToEnemyResources(enemy: Enemy, damage: number): Pick<Enemy, "hp" | "currentEnergyShield"> {
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

export function enemyResistancePercent(enemy: Enemy, damageType: string) {
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

export function enemyNumericStat(enemy: Enemy, stat: string) {
  const value = (enemy as Enemy & Record<string, unknown>)[stat];
  return typeof value === "number" ? value : 0;
}

export function statusIncreasesDamageTakenFrom(statusType: string, damageType: string) {
  if (statusType === "frostbite") return damageType === "cold";
  if (statusType === "numbed") return damageType === "lightning";
  if (statusType === "damage_taken_increase") return true;
  return false;
}

function enemyBuffStackCount(buff: { stackCount?: number }) {
  return Math.max(1, Math.round(Number(buff.stackCount ?? 1)));
}
