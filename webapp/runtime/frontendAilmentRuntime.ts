import type { EnemyBuff } from "../types/enemyTypes";
import type { SkillPreview } from "../types/skillPreviewTypes";

type EnemyBuffStackMode = NonNullable<EnemyBuff["stackMode"]>;

function numericStat(stats: Record<string, number | boolean> | undefined, stat: string) {
  const value = Number(stats?.[stat] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function numericRuntimeParam(skill: SkillPreview, stat: string) {
  const runtimeValue = Number(skill.runtime_params?.[stat] ?? 0);
  if (Number.isFinite(runtimeValue) && runtimeValue !== 0) return runtimeValue;
  return numericStat(skill.skill_stats, stat);
}

export function frontendAilmentStackMode(statusType: string, configuredMode: EnemyBuff["stackMode"]): EnemyBuffStackMode {
  if (statusType === "deterioration") return "stack_value";
  if (configuredMode === "independent" || configuredMode === "stack_value" || configuredMode === "refresh_duration") return configuredMode;
  return "refresh_duration";
}

export function frontendAilmentStackCount(skill: SkillPreview, statusType: string, roll: number) {
  if (statusType !== "deterioration") return 1;
  const extraStackChance = Math.max(0, Math.min(100, numericRuntimeParam(skill, "deterioration_extra_stack_chance_percent")));
  return 1 + (extraStackChance > 0 && roll * 100 < extraStackChance ? 1 : 0);
}
