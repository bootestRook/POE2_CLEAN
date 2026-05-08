import type { TooltipRichLine } from "./TooltipPrimitives";
import type { TooltipStatLine, TooltipView } from "./tooltipViewModel";

const tooltipHighlightTones: Record<string, string> = {
  "红色": "color-red",
  "蓝色": "color-blue",
  "绿色": "color-green",
  "粉色": "color-pink",
  "黄色": "color-yellow",
  "白色": "color-white",
  "黑色": "color-black",
  "青色": "color-cyan",
  "橙色": "color-orange",
  "火焰": "damage-fire",
  "冰霜": "damage-cold",
  "闪电": "damage-lightning",
  "物理": "damage-physical",
  "混沌": "damage-chaos"
};

const tooltipHighlightTerms = Object.keys(tooltipHighlightTones).sort((left, right) => right.length - left.length);

export function highlightTooltipText(text: string): TooltipRichLine {
  const segments: TooltipRichLine = [];
  let index = 0;
  while (index < text.length) {
    const term = tooltipHighlightTerms.find((candidate) => text.startsWith(candidate, index));
    if (term) {
      segments.push({ text: term, tone: tooltipHighlightTones[term] });
      index += term.length;
      continue;
    }
    const nextIndex = tooltipHighlightTerms.reduce((next, candidate) => {
      const found = text.indexOf(candidate, index + 1);
      return found >= 0 ? Math.min(next, found) : next;
    }, text.length);
    segments.push({ text: text.slice(index, nextIndex), tone: "body" });
    index = nextIndex;
  }
  return segments;
}

export function activeDpsToneClass(valueText: string) {
  if (valueText.includes("↘") || valueText.includes("-")) {
    return "tooltip-tone-color-red";
  }
  if (valueText.includes("↗") || valueText.includes("+")) {
    return "tooltip-tone-color-green";
  }
  return "tooltip-tone-body";
}

export function equipmentRarityTone(rarity: unknown) {
  const key = String(rarity ?? "").trim().toLowerCase();
  if (key === "white" || key === "白色" || key === "普通") return "white";
  if (key === "blue" || key === "蓝色" || key === "魔法") return "blue";
  if (key === "purple" || key === "紫色" || key === "稀有") return "purple";
  if (key === "pink" || key === "粉色" || key === "传奇") return "pink";
  return "white";
}

export function equipmentTooltipAffixLine(effect: string, tier: unknown) {
  const tierNumber = Number(tier);
  const suffix = Number.isFinite(tierNumber) ? `\uff08T${tierNumber}\uff09` : "";
  const normalizedEffect = effect.trim().replace(/([%\uff05])\s+(?=\p{Script=Han})/gu, "$1");
  return `${normalizedEffect}${suffix}`;
}

export function frontendDamageComponentTooltipLines(
  components: Record<string, number> | undefined,
  formatPreviewNumber: (value: number) => string
) {
  if (!components || typeof components !== "object" || Array.isArray(components)) return [];
  return Object.entries(components)
    .map(([damageType, amount]) => ({
      label_text: frontendDamageTypeLabel(damageType),
      value_text: formatPreviewNumber(amount),
    }))
    .filter((line) => line.label_text && Number(line.value_text) > 0);
}

export function frontendEquipmentGrantedTooltipLines(
  effects: unknown,
  formatPreviewNumber: (value: number) => string
) {
  if (!Array.isArray(effects)) return [];
  return effects
    .map((effect) => {
      if (!effect || typeof effect !== "object" || Array.isArray(effect)) return null;
      const record = effect as Record<string, unknown>;
      if (record.effect_kind !== "direct_damage") return null;
      const damageType = String(record.damage_type ?? "");
      const resolvedDamageType = damageType === "generic" ? "" : damageType;
      const multiplier = Math.max(0, Number(record.damage_multiplier ?? 1));
      const min = Number(record.value_min ?? record.value ?? 0) * multiplier;
      const max = Number(record.value_max ?? record.value ?? min) * multiplier;
      const low = Math.min(min, max);
      const high = Math.max(min, max);
      if (!Number.isFinite(low) || !Number.isFinite(high) || high <= 0) return null;
      return {
        label_text: `\u88c5\u5907\u9644\u52a0${frontendDamageTypeLabel(resolvedDamageType || "generic")}`,
        value_text: Math.round(low) === Math.round(high)
          ? formatPreviewNumber(high)
          : `${formatPreviewNumber(low)} - ${formatPreviewNumber(high)}`,
      };
    })
    .filter((line): line is TooltipStatLine => Boolean(line));
}

export function frontendDamageTypeLabel(damageType: string) {
  if (damageType === "generic") return "\u4f24\u5bb3";
  if (damageType === "physical") return "\u7269\u7406\u4f24\u5bb3";
  if (damageType === "fire") return "\u706b\u7130\u4f24\u5bb3";
  if (damageType === "cold") return "\u51b0\u971c\u4f24\u5bb3";
  if (damageType === "lightning") return "\u95ea\u7535\u4f24\u5bb3";
  if (damageType === "chaos") return "\u6df7\u6c8c\u4f24\u5bb3";
  if (damageType === "true") return "\u771f\u5b9e\u4f24\u5bb3";
  return `${damageType}\u4f24\u5bb3`;
}

export function frontendGuardTooltipLines(
  skill: { runtime_params?: Record<string, unknown> },
  formatPreviewNumber: (value: number) => string
): TooltipStatLine[] {
  const params = skill.runtime_params ?? {};
  const absorbPercent = Number(params.guard_absorb_percent ?? 0);
  const absorbAmount = Number(params.guard_absorb_amount ?? 0);
  const lines: TooltipStatLine[] = [];
  if (Number.isFinite(absorbPercent) && absorbPercent > 0) {
    lines.push({
      label_text: "\u5438\u6536\u4f24\u5bb3\u6bd4\u4f8b",
      value_text: `${formatPreviewNumber(absorbPercent)}%`,
    });
  }
  if (Number.isFinite(absorbAmount) && absorbAmount > 0) {
    lines.push({
      label_text: "\u5438\u6536\u4f24\u5bb3\u4e0a\u9650",
      value_text: formatPreviewNumber(absorbAmount),
    });
  }
  return lines;
}

export function frontendSupportModifierTooltipLines(
  skill: {
    active_gem_instance_id: string;
    applied_modifiers?: readonly {
      source_instance_id?: string;
      source_name_text?: string;
      stat?: { id?: string; text?: string };
      value?: number;
      relation_text?: string;
      applied?: boolean;
    }[];
  },
  formatModifierValue: (stat: string, value: number) => string
) {
  return (skill.applied_modifiers ?? [])
    .filter((modifier) => modifier.applied && modifier.source_instance_id && modifier.source_instance_id !== skill.active_gem_instance_id && Number(modifier.value) !== 0)
    .map((modifier) => {
      const statId = String(modifier.stat?.id ?? "");
      const statText = frontendSupportStatText(statId, String(modifier.stat?.text ?? statId));
      const valueText = formatModifierValue(statId, Number(modifier.value));
      const relationText = modifier.relation_text ? ` / ${modifier.relation_text}` : "";
      return `${modifier.source_name_text}: ${statText} ${valueText}${relationText}`;
    });
}

function frontendSupportStatText(statId: string, fallback: string) {
  if (fallback && !fallback.startsWith("未配置文案")) return fallback;
  return FRONTEND_SUPPORT_STAT_TEXT[statId] ?? statId;
}

const FRONTEND_SUPPORT_STAT_TEXT: Record<string, string> = {
  added_chaos_damage: "附加混沌伤害",
  added_cold_damage: "附加冰霜伤害",
  added_fire_damage: "附加火焰伤害",
  added_fire_damage_from_physical_percent: "物理额外火焰伤害",
  added_lightning_damage: "附加闪电伤害",
  ailment_damage_add_percent: "异常伤害提高",
  area_add_percent: "范围扩大",
  area_damage_add_percent: "范围伤害提高",
  attack_speed_add_percent: "攻击速度提高",
  bounce_count_add: "弹射次数",
  cast_speed_add_percent: "施法速度提高",
  channel_min_stacks_add: "引导最低层数",
  cold_damage_add_percent: "冰霜伤害提高",
  continuous_attack_chance_percent: "连续攻击概率",
  continuous_attack_damage_step_percent: "连续攻击伤害递增",
  conversion_lightning_to_cold_percent: "闪电转冰霜",
  conversion_physical_to_fire_percent: "物理转火焰",
  cooldown_recovery_add_percent: "冷却回复速度提高",
  crit_damage_add_percent: "暴击伤害提高",
  crit_rating: "暴击值",
  damage_final_percent: "最终伤害修正",
  deterioration_chance_add_percent: "恶化概率",
  deterioration_extra_stack_chance_percent: "额外恶化层数概率",
  dot_damage_add_percent: "持续伤害提高",
  duration_add_percent: "持续时间提高",
  elemental_damage_add_percent: "元素伤害提高",
  energy_blessing_damage_per_stack_percent: "每层能量祝福伤害",
  guard_internal_cooldown_ms: "守护内置冷却",
  guard_trigger_count: "守护触发次数",
  ignite_chance_add_percent: "点燃概率提高",
  ignite_damage_bonus_max_percent: "点燃伤害上限提高",
  ignite_damage_bonus_per_stack_percent: "每层点燃伤害提高",
  ignite_stacks_add: "点燃层数",
  knockback_chance_percent: "击退概率",
  knockback_distance_add_percent: "击退距离提高",
  lightning_damage_add_percent: "闪电伤害提高",
  melee_damage_add_percent: "近战伤害提高",
  physical_damage_add_percent: "物理伤害提高",
  prevent_elemental_ailments: "免疫元素异常",
  projectile_count_add: "投射物数量",
  projectile_speed_add_percent: "投射物速度提高",
  slash_chance_add_percent: "斩击概率",
  split_projectile_chance_percent: "投射物分裂概率",
  split_projectile_count_add: "分裂投射物数量",
  status_chance_add_percent: "状态施加概率提高",
};

export function mergeFrontendSkillPreviewBonusLines(lines: string[], bonusLines: string[]) {
  const merged = [...lines];
  const seen = new Set(merged);
  for (const line of bonusLines) {
    if (seen.has(line)) continue;
    seen.add(line);
    merged.unshift(line);
  }
  return merged;
}

export function mergeFrontendSkillPreviewTooltipLines(
  lines: TooltipStatLine[],
  skill: { final_damage?: number },
  componentLines: TooltipStatLine[],
  formatPreviewNumber: (value: number) => string,
  levelText = ""
) {
  const nextLines = lines.map((line) => {
    if (isPrimaryDamageTooltipLine(line.label_text)) {
      return { ...line, value_text: formatPreviewNumber(skill.final_damage ?? Number(line.value_text)) };
    }
    if (levelText && isSkillLevelTooltipLine(line.label_text)) {
      return { ...line, value_text: levelText };
    }
    return line;
  });
  const insertAfter = nextLines.findIndex((line) => isPrimaryDamageTooltipLine(line.label_text));
  const existingLabels = new Set(nextLines.map((line) => line.label_text));
  const missingComponentLines = componentLines.filter((line) => !existingLabels.has(line.label_text));
  if (missingComponentLines.length === 0) return nextLines;
  if (insertAfter < 0) return [...nextLines, ...missingComponentLines];
  return [...nextLines.slice(0, insertAfter + 1), ...missingComponentLines, ...nextLines.slice(insertAfter + 1)];
}

export function frontendProjectileCountTooltipLine(
  gem: { tags?: readonly { id?: string; text: string }[] },
  skill: { tags?: readonly { id?: string; text: string }[]; projectile_count?: number; skill_stats?: Record<string, number | boolean> },
  statValue: (stats: Record<string, number | boolean> | undefined, stat: string) => number,
  formatPreviewNumber: (value: number) => string
): TooltipStatLine | null {
  const tagIds = new Set([
    ...(gem.tags ?? []).map((tag) => tag.id ?? tag.text),
    ...(skill.tags ?? []).map((tag) => tag.id ?? tag.text),
  ]);
  if (!tagIds.has("projectile")) return null;
  const totalCount = Math.max(1, Math.round(Number(skill.projectile_count ?? 1)));
  const addedCount = Math.round(statValue(skill.skill_stats, "projectile_count_add"));
  const valueText = addedCount > 0
    ? `${totalCount}(${Math.max(1, totalCount - addedCount)}+${addedCount})`
    : formatPreviewNumber(totalCount);
  return {
    label_text: "\u6295\u5c04\u7269\u6570\u91cf",
    value_text: valueText,
  };
}

export function frontendChannelStackTooltipLines(
  gem: { tags?: readonly { id?: string; text: string }[] },
  skill: { tags?: readonly { id?: string; text: string }[]; runtime_params?: Record<string, unknown> },
  formatPreviewNumber: (value: number) => string
): TooltipStatLine[] {
  const tagIds = new Set([
    ...(gem.tags ?? []).map((tag) => tag.id ?? tag.text),
    ...(skill.tags ?? []).map((tag) => tag.id ?? tag.text),
  ]);
  if (!tagIds.has("channel")) return [];
  const minStacks = Number(skill.runtime_params?.channel_min_stacks ?? 0);
  const maxStacks = Number(skill.runtime_params?.channel_max_stacks);
  if (!Number.isFinite(maxStacks) || maxStacks <= 0) return [];
  return [
    {
      label_text: "\u5f15\u5bfc\u5c42\u6570\u4e0b\u9650",
      value_text: formatPreviewNumber(Math.max(0, Math.round(Number.isFinite(minStacks) ? minStacks : 0))),
    },
    {
      label_text: "\u5f15\u5bfc\u5c42\u6570\u4e0a\u9650",
      value_text: formatPreviewNumber(Math.max(1, Math.round(maxStacks))),
    },
  ];
}

function isPrimaryDamageTooltipLine(labelText: string) {
  return labelText.includes("\u4f24\u5bb3") || labelText.includes("\u6d5c\u3085");
}

export function isSkillLevelTooltipLine(labelText: string) {
  return labelText === "\u7b49\u7ea7";
}

export function frontendSkillPreviewEffectiveLevelText(
  skill: { source_context?: Record<string, unknown> },
  frontendRecord: (value: unknown) => Record<string, unknown>
) {
  const sourceContext = frontendRecord(skill.source_context);
  const equipmentLevelAdd = Math.max(0, Math.floor(Number(sourceContext.equipment_skill_level_add ?? 0)));
  if (equipmentLevelAdd <= 0) return "";
  const effectiveLevel = Math.max(1, Math.floor(Number(sourceContext.effective_gem_level ?? 1)));
  const baseLevel = Math.max(1, effectiveLevel - equipmentLevelAdd);
  return `${effectiveLevel}(${baseLevel}+${equipmentLevelAdd})`;
}

export function buildGemTooltipViewModelWithNormalizers<TGem extends { tooltip_view?: TooltipView }, TView extends TooltipView>(
  gem: TGem,
  normalizeSupportTooltipView: (gem: TGem, view: TView) => TView,
  normalizeActiveTooltipView: (gem: TGem, view: TView) => TView
) {
  const view = gem.tooltip_view as TView | undefined;
  if (!view) return view;
  if (view.variant === "support") return normalizeSupportTooltipView(gem, view);
  if (view.variant !== "active" && view.variant !== "passive") return view;
  return normalizeActiveTooltipView(gem, view);
}

export function normalizedTooltipSubtitle(subtitle: string, tags: readonly { text: string }[]) {
  const parts = subtitle.split("、").filter(Boolean);
  if (parts.length === 0) return subtitle;
  const colorText = parts[0];
  return [colorText, ...tags.map((tag) => tag.text)].join("、");
}

export function frontendGemLevelText(gem: { level?: number }) {
  return String(Math.max(1, Math.floor(Number(gem.level ?? 1))));
}

export function ensureGemLevelStatLine(gem: { level?: number }, lines: TooltipStatLine[]) {
  const levelText = frontendGemLevelText(gem);
  let found = false;
  const nextLines = lines.map((line) => {
    if (!isSkillLevelTooltipLine(line.label_text)) return line;
    found = true;
    return { ...line, value_text: levelText };
  });
  if (found) return nextLines;
  return [{ label_text: "\u7b49\u7ea7", value_text: levelText }, ...nextLines];
}

const RELEASE_INTERVAL_LABELS = new Set(["攻击间隔", "施法时间", "实际释放间隔", "释放间隔", "基础释放间隔"]);

export function ensureReleaseIntervalStatLine(
  gem: {
    tags?: readonly { id?: string; text: string }[];
    base_effect?: { base_release_interval_ms?: number; release_interval_ms?: number };
  },
  lines: TooltipStatLine[],
  frontendSkillPreviewsBySkillTag: () => Record<string, { release_interval_ms?: number }>,
  formatPreviewNumber: (value: number) => string
) {
  if (lines.some((line) => RELEASE_INTERVAL_LABELS.has(line.label_text))) return lines;
  const skillTag = gem.tags?.find((tag) => typeof tag.id === "string" && tag.id.startsWith("skill_"))?.id ?? "";
  const preview = skillTag ? frontendSkillPreviewsBySkillTag()[skillTag] : undefined;
  const releaseIntervalMs = Number(
    preview?.release_interval_ms
      ?? gem.base_effect?.release_interval_ms
      ?? gem.base_effect?.base_release_interval_ms
      ?? 0
  );
  if (!Number.isFinite(releaseIntervalMs) || releaseIntervalMs <= 0) return lines;
  const tagIds = new Set((gem.tags ?? []).map((tag) => tag.id ?? tag.text));
  if (!tagIds.has("attack") && !tagIds.has("spell")) return lines;
  const line = {
    label_text: tagIds.has("spell") ? "施法时间" : "攻击间隔",
    value_text: `${formatPreviewNumber(releaseIntervalMs)} 毫秒`,
  };
  const insertAfter = Math.max(
    lines.findIndex((candidate) => candidate.label_text === "冷却"),
    lines.findIndex((candidate) => ["攻击伤害", "法术伤害", "技能伤害"].includes(candidate.label_text)),
  );
  if (insertAfter < 0) return [...lines, line];
  return [...lines.slice(0, insertAfter + 1), line, ...lines.slice(insertAfter + 1)];
}
