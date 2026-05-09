import type { TooltipTagView } from "./TooltipPrimitives";
import {
  ensureGemLevelStatLine,
  ensureReleaseIntervalStatLine,
  isSkillLevelTooltipLine,
  normalizedTooltipSubtitle
} from "./tooltipFormatting";
import { frontendDisplayGemKindTag, frontendTargetTagTexts } from "./tooltipGemTags";
import type { TooltipStatLine, TooltipView } from "./tooltipViewModel";

type ActiveTooltipGem = {
  gem_kind?: string;
  base_effect?: unknown;
  tags: readonly { id?: string; text: string }[];
};

type SkillPreviewLookup = ReadonlyMap<string, unknown>;

type ActiveTooltipAdapterDeps = {
  frontendSkillPreviewsBySkillTag: SkillPreviewLookup;
  formatPreviewNumber: (value: number) => string;
  isPassiveGem: (gem: ActiveTooltipGem) => boolean;
  frontendRecord: (value: unknown) => Record<string, unknown>;
  frontendGemBaseModifiers: (gem: ActiveTooltipGem) => readonly { target_text?: unknown }[];
  frontendDamageMapTotal: (value: unknown) => number;
};

const HIDDEN_ACTIVE_TOOLTIP_TAG_IDS = new Set(["bow", "gun", "cannon"]);
const NON_DAMAGE_PASSIVE_HIDDEN_TOOLTIP_TAG_IDS = new Set([
  "attack",
  "spell",
  "melee",
  "ranged",
  "projectile",
  "area",
  "dot",
  "hit",
  "damage",
  "physical",
  "fire",
  "cold",
  "lightning",
  "chaos",
  "elemental",
]);

export function createNormalizeActiveTooltipView(deps: ActiveTooltipAdapterDeps) {
  return function normalizeActiveTooltipView(gem: ActiveTooltipGem, view: TooltipView): TooltipView {
    const tags = view.tags
      .filter((tag) => !HIDDEN_ACTIVE_TOOLTIP_TAG_IDS.has(tag.id ?? ""))
      .filter((tag) => shouldShowTooltipTagForGem(gem, tag, deps))
      .map((tag) => frontendDisplayGemKindTag(gem, tag));
    const statLines = normalizePassiveTooltipStatLines(
      gem,
      ensureReleaseIntervalStatLine(gem, ensureGemLevelStatLine(gem, view.sections.stats.lines), deps.frontendSkillPreviewsBySkillTag, deps.formatPreviewNumber),
      deps
    );
    const sections = {
      ...view.sections,
      stats: {
        ...view.sections.stats,
        lines: statLines,
      },
    };
    return {
      ...view,
      tags,
      subtitle_text: normalizedTooltipSubtitle(view.subtitle_text, tags),
      sections,
    };
  };
}

function shouldShowTooltipTagForGem(gem: ActiveTooltipGem, tag: TooltipTagView, deps: ActiveTooltipAdapterDeps) {
  if (!deps.isPassiveGem(gem) || passiveGemCanDealDamage(gem, deps)) return true;
  return !NON_DAMAGE_PASSIVE_HIDDEN_TOOLTIP_TAG_IDS.has(tag.id ?? "");
}

function passiveGemCanDealDamage(gem: ActiveTooltipGem, deps: ActiveTooltipAdapterDeps) {
  const baseEffect = deps.frontendRecord(deps.frontendRecord(gem).base_effect);
  if (frontendDirectDamageTotal(baseEffect, deps) > 0) return true;
  const hit = deps.frontendRecord(baseEffect.hit);
  if (frontendDirectDamageTotal(hit, deps) > 0) return true;
  const runtimeParams = deps.frontendRecord(baseEffect.runtime_params);
  return frontendDirectDamageTotal(runtimeParams, deps) > 0;
}

function normalizePassiveTooltipStatLines(gem: ActiveTooltipGem, lines: TooltipStatLine[], deps: ActiveTooltipAdapterDeps) {
  if (!deps.isPassiveGem(gem)) return lines;
  const nextLines = lines.filter((line) => !isPassiveTooltipEffectStatLine(line));
  if (!passiveAffectsActiveSkills(gem, deps)) return nextLines;
  const targetTexts = frontendTargetTagTexts(gem, deps.frontendRecord);
  if (targetTexts.length === 0) return nextLines;
  const targetLine = {
    label_text: "\u5f71\u54cd\u4e3b\u52a8\u6280\u80fd",
    value_text: targetTexts.join("\u3001"),
  };
  const levelLineIndex = nextLines.findIndex((line) => isSkillLevelTooltipLine(line.label_text));
  if (levelLineIndex < 0) return [targetLine, ...nextLines];
  return [...nextLines.slice(0, levelLineIndex + 1), targetLine, ...nextLines.slice(levelLineIndex + 1)];
}

function isPassiveTooltipEffectStatLine(line: TooltipStatLine) {
  return !isSkillLevelTooltipLine(line.label_text);
}

function passiveAffectsActiveSkills(gem: ActiveTooltipGem, deps: ActiveTooltipAdapterDeps) {
  return deps.frontendGemBaseModifiers(gem)
    .some((modifier) => String(modifier.target_text ?? "").includes("\u5f71\u54cd\u4e3b\u52a8\u6280\u80fd"));
}

function frontendDirectDamageTotal(value: Record<string, unknown>, deps: ActiveTooltipAdapterDeps) {
  return [
    value.base_damage,
    value.damage,
    value.final_damage,
    value.amount,
  ].reduce<number>((total, next) => total + Math.max(0, Number(next) || 0), 0)
    + deps.frontendDamageMapTotal(value.damage_components);
}
