import type { TooltipRichLine } from "./TooltipPrimitives";
import type { TooltipStatLine } from "./tooltipViewModel";

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
