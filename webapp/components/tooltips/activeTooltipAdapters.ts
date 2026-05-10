import type { TooltipTagView } from "./TooltipPrimitives";
import { FRONTEND_SKILL_LEVEL_TABLES } from "../../frontendSkillLevelTables";
import {
  ensureGemLevelStatLine,
  ensureReleaseIntervalStatLine,
  isSkillLevelTooltipLine,
  normalizedTooltipSubtitle
} from "./tooltipFormatting";
import { frontendDisplayGemKindTag, frontendTargetTagTexts } from "./tooltipGemTags";
import type { TooltipStatLine, TooltipView } from "./tooltipViewModel";

type ActiveTooltipGem = {
  instance_id?: string;
  base_gem_id?: string;
  level?: number;
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
    const leveledView = normalizeActiveTooltipLevel(gem, view, deps);
    const tags = view.tags
      .filter((tag) => !HIDDEN_ACTIVE_TOOLTIP_TAG_IDS.has(tag.id ?? ""))
      .filter((tag) => shouldShowTooltipTagForGem(gem, tag, deps))
      .map((tag) => frontendDisplayGemKindTag(gem, tag));
    const statLines = normalizePassiveTooltipStatLines(
      gem,
      ensureReleaseIntervalStatLine(gem, ensureGemLevelStatLine(gem, leveledView.sections.stats.lines), deps.frontendSkillPreviewsBySkillTag, deps.formatPreviewNumber),
      deps
    );
    const sections = {
      ...leveledView.sections,
      stats: {
        ...leveledView.sections.stats,
        lines: statLines,
      },
    };
    return {
      ...leveledView,
      tags,
      subtitle_text: normalizedTooltipSubtitle(view.subtitle_text, tags),
      sections,
    };
  };
}

function normalizeActiveTooltipLevel(gem: ActiveTooltipGem, view: TooltipView, deps: ActiveTooltipAdapterDeps): TooltipView {
  if (view.variant !== "active") return view;
  const level = activeTooltipGemLevel(gem);
  const levelValues = activeTooltipLevelValues(gem, level);
  const baseEffect = deps.frontendRecord(gem.base_effect);
  const damage = activeTooltipLevelNumber(
    levelValues,
    "base_damage",
    Number(baseEffect.base_damage ?? baseEffect.final_damage ?? baseEffect.damage ?? NaN)
  );
  const lines = view.sections.stats.lines.map((line) => (
    Number.isFinite(damage) && isPrimaryDamageTooltipLine(line.label_text)
      ? { ...line, value_text: deps.formatPreviewNumber(damage) }
      : line
  ));
  return {
    ...view,
    sections: {
      ...view.sections,
      stats: {
        ...view.sections.stats,
        lines,
      },
      base_skill_level: {
        ...view.sections.base_skill_level,
        lines: [`\u57fa\u7840\u6280\u80fd\u7b49\u7ea7\u4e3a ${level}`],
      },
    },
  };
}

function activeTooltipGemLevel(gem: ActiveTooltipGem) {
  return Math.max(1, Math.floor(Number(gem.level ?? 1)));
}

function activeTooltipLevelValues(gem: ActiveTooltipGem, level: number) {
  const tableId = String(gem.base_gem_id ?? gem.instance_id ?? "");
  const table = (FRONTEND_SKILL_LEVEL_TABLES as Record<string, Record<number, Record<string, number>>>)[tableId];
  if (!table) return {};
  const levels = Object.keys(table).map(Number).filter(Number.isFinite).sort((left, right) => left - right);
  if (levels.length === 0) return {};
  const clampedLevel = Math.max(levels[0], Math.min(levels[levels.length - 1], level));
  return table[clampedLevel] ?? {};
}

function activeTooltipLevelNumber(levelValues: Record<string, number>, key: string, fallback: number) {
  const value = levelValues[key];
  return Number.isFinite(value) ? value : fallback;
}

function isPrimaryDamageTooltipLine(labelText: string) {
  return labelText.includes("\u4f24\u5bb3") || labelText.includes("\u6d5c\u3085");
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
