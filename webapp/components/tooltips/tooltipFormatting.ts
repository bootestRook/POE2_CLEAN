import type { TooltipRichLine } from "./TooltipPrimitives";

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
