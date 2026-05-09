import { gemColorKey, gemSudokuDigit } from "../../utils/gemDisplay";
import type { TooltipRichLine, TooltipTagView } from "./TooltipPrimitives";

export type TooltipGemTagSource = {
  gem_kind?: string;
  gem_type?: { id?: string; number?: number; display_text?: string; identity_text?: string };
  sudoku_digit?: number;
  tags: readonly { id?: string; text: string }[];
  tooltip_view?: { icon_color_key?: string };
};

function isActiveGem(gem: TooltipGemTagSource) {
  return gem.gem_kind === "active_skill" || gem.tags.some((tag) => tag.id === "active_skill_gem");
}

function isPassiveGem(gem: TooltipGemTagSource) {
  return gem.gem_kind === "passive_skill" || gem.tags.some((tag) => tag.id === "passive_skill_gem");
}

function isSupportGem(gem: TooltipGemTagSource) {
  return gem.gem_kind === "support" || gem.tags.some((tag) => tag.id === "support_gem");
}

export function frontendGemKindTagText(gem: TooltipGemTagSource) {
  if (isActiveGem(gem)) return "\u4e3b\u52a8\u6280\u80fd";
  if (isPassiveGem(gem)) return "\u88ab\u52a8\u6280\u80fd";
  if (isSupportGem(gem)) return "\u8f85\u52a9\u6280\u80fd";
  return "\u5b9d\u77f3";
}

const FRONTEND_GEM_COLOR_TEXT_BY_KEY: Record<string, string> = {
  red: "\u7ea2\u8272",
  blue: "\u84dd\u8272",
  green: "\u7eff\u8272",
  pink: "\u7c89\u8272",
  yellow: "\u9ec4\u8272",
  white: "\u767d\u8272",
  black: "\u9ed1\u8272",
  cyan: "\u9752\u8272",
  orange: "\u6a59\u8272",
};

export function frontendGemColorTag(gem: TooltipGemTagSource) {
  const key = gem.tooltip_view?.icon_color_key ?? gemColorKey(gem);
  return {
    text: FRONTEND_GEM_COLOR_TEXT_BY_KEY[key] ?? gem.gem_type?.display_text ?? "\u5b9d\u77f3",
    tone: `color-${key}`,
  };
}

export function isGemTypeTagText(gem: TooltipGemTagSource, text: string) {
  const digit = gemSudokuDigit(gem);
  return text === gem.gem_type?.display_text || text === `${digit}\u53f7\u5b9d\u77f3`;
}

export function frontendDisplayGemKindTag(gem: TooltipGemTagSource, tag: TooltipTagView): TooltipTagView {
  if ((tag.id ?? "").startsWith("gem_type_") || isGemTypeTagText(gem, tag.text)) {
    return { ...tag, ...frontendGemColorTag(gem) };
  }
  if ((tag.id ?? "") !== "gem" && tag.text !== "\u5b9d\u77f3") return tag;
  return { ...tag, text: frontendGemKindTagText(gem) };
}

export function replaceGemTagRichLines(gem: TooltipGemTagSource, lines: TooltipRichLine[] | undefined) {
  return lines?.map((line) => line.map((segment) => (
    isGemTypeTagText(gem, segment.text)
      ? { ...segment, ...frontendGemColorTag(gem) }
      : segment.text === "\u5b9d\u77f3" ? { ...segment, text: frontendGemKindTagText(gem) } : segment
  )));
}

export function replaceGemTagRichLineSection(gem: TooltipGemTagSource, section: { rich_lines: TooltipRichLine[] } | undefined) {
  if (!section) return section;
  return {
    ...section,
    rich_lines: replaceGemTagRichLines(gem, section.rich_lines) ?? [],
  };
}

export function normalizeSupportConditionRichLineSection(
  gem: TooltipGemTagSource,
  section: { rich_lines: TooltipRichLine[] } | undefined,
  readRecord: (value: unknown) => Record<string, unknown>
) {
  const normalized = replaceGemTagRichLineSection(gem, section);
  if (!normalized) return normalized;
  const targetLine = supportTargetTagRichLine(gem, readRecord);
  return {
    ...normalized,
    rich_lines: [targetLine, ...normalized.rich_lines.slice(1)],
  };
}

export function supportTargetTagRichLine(
  gem: TooltipGemTagSource,
  readRecord: (value: unknown) => Record<string, unknown>
): TooltipRichLine {
  const targetTexts = frontendTargetTagTexts(gem, readRecord);
  const targetText = targetTexts.length > 0 ? targetTexts.join("\u3001") : "\u6240\u6709\u7c7b\u578b";
  return [
    { text: "\u8f85\u52a9\uff1a", tone: "label" },
    { text: targetText, tone: "body" },
  ];
}

export function frontendTargetTagTexts(
  gem: TooltipGemTagSource,
  readRecord: (value: unknown) => Record<string, unknown>
) {
  const canAffect = readRecord(readRecord(gem).can_affect);
  const tags = [
    ...frontendTagTextEntries(canAffect.tags_any, readRecord),
    ...frontendTagTextEntries(canAffect.tags_all, readRecord),
  ];
  const seen = new Set<string>();
  return tags.filter((tag) => {
    if (!tag.text || isNonTargetSupportTag(tag, gem) || seen.has(tag.text)) return false;
    seen.add(tag.text);
    return true;
  }).map((tag) => tag.text);
}

function frontendTagTextEntries(value: unknown, readRecord: (value: unknown) => Record<string, unknown>) {
  return Array.isArray(value)
    ? value.map((entry) => {
      const record = readRecord(entry);
      return {
        id: String(record.id ?? ""),
        text: String(record.text ?? record.id ?? ""),
      };
    })
    : [];
}

function isNonTargetSupportTag(tag: { id: string; text: string }, gem: TooltipGemTagSource) {
  return tag.id === "gem"
    || tag.id === "support_gem"
    || tag.id === "active_skill_gem"
    || tag.id === "passive_skill_gem"
    || tag.id === "loot_gem"
    || tag.id.startsWith("gem_type_")
    || tag.text === "\u5b9d\u77f3"
    || tag.text === frontendGemKindTagText(gem)
    || isGemTypeTagText(gem, tag.text);
}
