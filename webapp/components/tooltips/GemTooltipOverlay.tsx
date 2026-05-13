import type { ReactNode } from "react";
import { RichText, TooltipSection, TooltipTag } from "./TooltipPrimitives";
import type { TooltipRichLine, TooltipTagView } from "./TooltipPrimitives";
import { equipmentTooltipAffixGroup, equipmentTooltipAffixLine } from "./tooltipFormatting";

export type TooltipStatLineView = {
  label_text: string;
  value_text: string;
};

export type TooltipTargetLineView = {
  name_text: string;
  status_text: string;
};

export type GemTooltipViewModel = {
  variant?: string;
  name_text: string;
  subtitle_text: string;
  type_identity_text?: string;
  tags: readonly TooltipTagView[];
  summary_lines?: TooltipRichLine[];
  sections: {
    description: { title_text?: string; lines?: string[]; rich_lines?: TooltipRichLine[] };
    stats: { title_text: string; lines: TooltipStatLineView[] };
    recent_dps?: { title_text: string; lines: TooltipStatLineView[] };
    bonuses?: { title_text: string; lines: string[] };
    rules?: { title_text: string; lines: string[] };
    base_skill_level?: { title_text?: string; lines: string[] };
    conditions?: { rich_lines: TooltipRichLine[] };
    support_rules?: { rich_lines: TooltipRichLine[] };
    base_bonuses?: { rich_lines: TooltipRichLine[] };
    current_targets?: { title_text: string; lines: TooltipTargetLineView[] };
  };
};

export type GemTooltipPosition<TGem> = {
  gem: TGem;
  comparisonGem?: TGem | null;
  left: number;
  top: number;
  transform: string;
};

type GemTooltipOverlayProps<TGem, TTooltip extends GemTooltipPosition<TGem>, TView extends GemTooltipViewModel> = {
  tooltip: TTooltip;
  compareModifierHeld: boolean;
  getComparisonTooltipPosition: (tooltip: TTooltip) => Omit<TTooltip, "gem" | "comparisonGem">;
  buildViewModel: (gem: TGem) => TView | null | undefined;
  renderGemOrb: (gem: TGem) => ReactNode;
  highlightTooltipText: (text: string) => TooltipRichLine;
  activeDpsToneClass: (valueText: string) => string;
  equipmentTooltipRarityTone: (gem: TGem, view?: TView) => string;
  normalizedEquipmentTooltipTags: (gem: TGem, view: TView, rarityTone: string) => readonly TooltipTagView[];
  equipmentTooltipStatLines: (gem: TGem, lines: TooltipStatLineView[]) => TooltipStatLineView[];
  equipmentTooltipBonusLines: (gem: TGem, lines: string[]) => string[];
  frontendGemLevelText: (gem: TGem) => string;
  isEquipmentTooltip: (gem: TGem) => boolean;
};

type EquipmentTooltipAffix = {
  effect: string;
  tier: unknown;
  gen?: unknown;
};

type EquipmentTooltipAffixSection = {
  key: "base" | "explicit";
  title: string;
  lines: EquipmentTooltipAffixLine[];
};

type EquipmentTooltipAffixLine = {
  text: string;
  tier: unknown;
};

export function GemTooltipOverlay<TGem, TTooltip extends GemTooltipPosition<TGem>, TView extends GemTooltipViewModel>(props: GemTooltipOverlayProps<TGem, TTooltip, TView>) {
  const comparisonGem = props.tooltip.comparisonGem ?? null;
  const comparisonPosition = comparisonGem && props.compareModifierHeld ? props.getComparisonTooltipPosition(props.tooltip) : null;
  return (
    <>
      <GemTooltipPanel {...props} tooltip={props.tooltip} showCompareHint={Boolean(comparisonGem) && !props.compareModifierHeld} />
      {comparisonGem && comparisonPosition && (
        <GemTooltipPanel
          {...props}
          tooltip={{ gem: comparisonGem, ...comparisonPosition } as TTooltip}
          className="equipment-compare-tooltip"
        />
      )}
    </>
  );
}

function GemTooltipPanel<TGem, TTooltip extends GemTooltipPosition<TGem>, TView extends GemTooltipViewModel>({
  tooltip,
  className = "",
  showCompareHint = false,
  buildViewModel,
  renderGemOrb,
  highlightTooltipText,
  activeDpsToneClass,
  equipmentTooltipRarityTone,
  normalizedEquipmentTooltipTags,
  equipmentTooltipStatLines,
  equipmentTooltipBonusLines,
  frontendGemLevelText,
  isEquipmentTooltip
}: GemTooltipOverlayProps<TGem, TTooltip, TView> & {
  tooltip: GemTooltipPosition<TGem>;
  className?: string;
  showCompareHint?: boolean;
}) {
  const { gem, left, top, transform } = tooltip;
  const view = buildViewModel(gem);
  if (!view) return null;
  if (view.variant === "support") {
    return (
      <SupportGemTooltip
        gem={gem}
        view={view}
        left={left}
        top={top}
        transform={transform}
        renderGemOrb={renderGemOrb}
        frontendGemLevelText={frontendGemLevelText}
      />
    );
  }
  const isActiveTooltip = view.variant === "active" || view.variant === "passive";
  const equipmentTone = equipmentTooltipRarityTone(gem, view);
  const titleClassName = isActiveTooltip
    ? "tooltip-tone-title"
    : equipmentTone ? `tooltip-rarity-title tooltip-rarity-${equipmentTone}` : undefined;
  const tooltipTags = isActiveTooltip ? view.tags : normalizedEquipmentTooltipTags(gem, view, equipmentTone);
  const sections = view.sections;
  const descriptionLines = sections.description?.lines ?? [];
  const equipmentTooltip = isEquipmentTooltip(gem);
  const showDescriptionSection = isActiveTooltip || !equipmentTooltip;
  const showSubtitle = isActiveTooltip || !equipmentTooltip;
  const showIdentity = Boolean(view.type_identity_text) && !equipmentTooltip;
  const statLines = equipmentTooltip ? equipmentTooltipStatLines(gem, sections.stats.lines) : sections.stats.lines;
  const bonusLines = equipmentTooltip && sections.bonuses ? equipmentTooltipBonusLines(gem, sections.bonuses.lines) : sections.bonuses?.lines ?? [];
  const equipmentAffixSections = equipmentTooltip ? groupedEquipmentAffixSections(gem, bonusLines) : [];
  return (
    <div className={`gem-tooltip ${isActiveTooltip ? "active-tooltip" : ""} ${className}`.trim()} style={{ left, top, transform }}>
      <div className="tooltip-header">
        {renderGemOrb(gem)}
        <div className="tooltip-heading">
          <h3 className={titleClassName}>{view.name_text}</h3>
          {showSubtitle && (isActiveTooltip ? <RichText line={highlightTooltipText(view.subtitle_text ?? "")} /> : <p>{view.subtitle_text}</p>)}
        </div>
      </div>
      {showIdentity && <p className="tooltip-identity">{view.type_identity_text}</p>}
      {!isActiveTooltip && <div className="tooltip-tag-list">{tooltipTags.map((tag) => <TooltipTag key={`${tag.id ?? tag.text}-${tag.text}`} tag={tag} />)}</div>}
      {showDescriptionSection && <TooltipSection title={sections.description?.title_text ?? ""}>
        {descriptionLines.map((line) => isActiveTooltip ? <RichText key={line} line={highlightTooltipText(line)} /> : <p key={line}>{line}</p>)}
      </TooltipSection>}
      {statLines.length > 0 && <TooltipSection title={sections.stats.title_text}>
        <dl className="tooltip-stat-list">
          {statLines.map((line) => (
            <div key={`${line.label_text}-${line.value_text}`} className="tooltip-stat-line">
              <dt className={isActiveTooltip ? "tooltip-tone-body" : undefined}>{line.label_text}：</dt>
              <dd className={isActiveTooltip ? "tooltip-tone-body" : undefined}>
                {isActiveTooltip ? <RichText line={highlightTooltipText(line.value_text)} className="tooltip-stat-rich-value" /> : line.value_text}
              </dd>
            </div>
          ))}
        </dl>
      </TooltipSection>}
      {sections.recent_dps && sections.recent_dps.lines.length > 0 && (
        <TooltipSection title={sections.recent_dps.title_text}>
          <dl className="tooltip-stat-list">
            {sections.recent_dps.lines.map((line) => (
              <div key={`${line.label_text}-${line.value_text}`} className="tooltip-stat-line">
                <dt className={isActiveTooltip ? "tooltip-tone-body" : undefined}>{line.label_text}：</dt>
                <dd className={isActiveTooltip ? activeDpsToneClass(line.value_text) : undefined}>{line.value_text}</dd>
              </div>
            ))}
          </dl>
        </TooltipSection>
      )}
      {sections.bonuses && bonusLines.length > 0 && !equipmentTooltip && (
        <TooltipSection title={sections.bonuses.title_text}>
          {bonusLines.map((line, index) => <p key={`${index}-${line}`} className={`tooltip-bonus-line ${isActiveTooltip ? "tooltip-tone-rule" : ""}`}>{line}</p>)}
        </TooltipSection>
      )}
      {sections.bonuses && equipmentTooltip && equipmentAffixSections.length > 0 && (
        <section className="tooltip-section equipment-affix-section">
          <div className="tooltip-section-content">
          <div className="equipment-affix-groups">
            {equipmentAffixSections.map((section) => (
              <div key={section.key} className={`equipment-affix-group equipment-affix-group-${section.key}`}>
                <div className="equipment-affix-divider">
                  <span>{section.title}</span>
                </div>
                {section.lines.map((line, index) => (
                  <p key={`${section.key}-${index}-${line.text}`} className={`tooltip-bonus-line equipment-affix-line equipment-affix-line-${equipmentAffixTierTone(line.tier)}`}>
                    <span className="equipment-affix-bullet" aria-hidden="true" />
                    <span className="equipment-affix-text">{line.text}</span>
                  </p>
                ))}
              </div>
            ))}
          </div>
          </div>
        </section>
      )}
      {view.variant === "active" && sections.base_skill_level && sections.base_skill_level.lines.length > 0 && (
        <TooltipSection title="">
          {sections.base_skill_level.lines.map((line) => <p key={line} className="tooltip-tone-bonus-positive">{line}</p>)}
        </TooltipSection>
      )}
      {sections.current_targets && sections.current_targets.lines.length > 0 && <TooltipSection title={sections.current_targets.title_text}>
        {sections.current_targets.lines.map((line) => (
          <p key={`${line.name_text}-${line.status_text}`} className="tooltip-target-line">
            <span>{line.name_text}</span>
            <strong>{line.status_text}</strong>
          </p>
        ))}
      </TooltipSection>}
      {sections.rules && sections.rules.lines.length > 0 && <TooltipSection title={sections.rules.title_text}>
        {sections.rules.lines.map((line) => <p key={line} className={isActiveTooltip ? "tooltip-tone-bonus-positive" : undefined}>{line}</p>)}
      </TooltipSection>}
      {showCompareHint && <div className="equipment-compare-hint">按住ctrl对比</div>}
    </div>
  );
}

function groupedEquipmentAffixSections<TGem>(gem: TGem, fallbackLines: string[]): EquipmentTooltipAffixSection[] {
  const affixes = equipmentAffixesForTooltip(gem);
  if (affixes.length === 0) {
    return fallbackLines.length > 0 ? [{ key: "explicit", title: "词缀", lines: fallbackLines.map((text) => ({ text, tier: null })) }] : [];
  }
  const grouped = affixes.reduce<Record<EquipmentTooltipAffixSection["key"], EquipmentTooltipAffixLine[]>>((acc, affix) => {
    acc[equipmentTooltipAffixGroup(affix.gen)].push({
      text: equipmentTooltipAffixLine(affix.effect, affix.tier, affix.gen),
      tier: affix.tier
    });
    return acc;
  }, { base: [], explicit: [] });
  return [
    { key: "base", title: "基础词缀", lines: grouped.base },
    { key: "explicit", title: "随机词缀", lines: grouped.explicit },
  ].filter((section): section is EquipmentTooltipAffixSection => section.lines.length > 0);
}

function equipmentAffixTierTone(tier: unknown): "bluewhite" | "purple" | "orange" {
  const tierNumber = Number(tier);
  if (!Number.isFinite(tierNumber)) return "bluewhite";
  if (tierNumber <= 1) return "orange";
  if (tierNumber <= 4) return "purple";
  return "bluewhite";
}

function equipmentAffixesForTooltip<TGem>(gem: TGem): EquipmentTooltipAffix[] {
  const affixes = (gem as { equipment_affixes?: unknown }).equipment_affixes;
  if (!Array.isArray(affixes)) return [];
  return affixes.filter((affix): affix is EquipmentTooltipAffix => (
    Boolean(affix)
    && typeof affix === "object"
    && !Array.isArray(affix)
    && typeof (affix as { effect?: unknown }).effect === "string"
  ));
}

function SupportGemTooltip<TGem>({
  gem,
  view,
  left,
  top,
  transform,
  renderGemOrb,
  frontendGemLevelText
}: {
  gem: TGem;
  view: GemTooltipViewModel;
  left: number;
  top: number;
  transform: string;
  renderGemOrb: (gem: TGem) => ReactNode;
  frontendGemLevelText: (gem: TGem) => string;
}) {
  const sections = view.sections;
  const levelText = frontendGemLevelText(gem);
  const descriptionLines = supportDescriptionRichLines(sections.description);
  return (
    <div className="gem-tooltip support-tooltip" style={{ left, top, transform }}>
      <div className="tooltip-header">
        {renderGemOrb(gem)}
        <div className="tooltip-heading">
          <h3 className="support-tooltip-name">{view.name_text}</h3>
          <RichText line={[{ text: `等级 ${levelText}`, tone: "bonus-positive" }]} className="support-tooltip-summary" />
          {(view.summary_lines ?? []).map((line, index) => <RichText key={index} line={line} className="support-tooltip-summary" />)}
        </div>
      </div>
      {descriptionLines.length > 0 && (
        <TooltipSection title="">
          {descriptionLines.map((line, index) => <RichText key={index} line={line} />)}
        </TooltipSection>
      )}
      {sections.conditions && sections.conditions.rich_lines.length > 0 && (
        <TooltipSection title="">
          {sections.conditions.rich_lines.map((line, index) => <RichText key={index} line={line} />)}
        </TooltipSection>
      )}
      {sections.support_rules && sections.support_rules.rich_lines.length > 0 && (
        <TooltipSection title="">
          {sections.support_rules.rich_lines.map((line, index) => <RichText key={index} line={line} />)}
        </TooltipSection>
      )}
      {sections.base_bonuses && sections.base_bonuses.rich_lines.length > 0 && (
        <TooltipSection title="">
          {sections.base_bonuses.rich_lines.map((line, index) => <RichText key={index} line={line} />)}
        </TooltipSection>
      )}
    </div>
  );
}

function supportDescriptionRichLines(section: GemTooltipViewModel["sections"]["description"] | undefined): TooltipRichLine[] {
  if (!section) return [];
  if (section.rich_lines && section.rich_lines.length > 0) return section.rich_lines;
  return (section.lines ?? []).map((line) => [{ text: line, tone: "body" }]);
}
