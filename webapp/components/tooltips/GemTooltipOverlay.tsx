import type { ReactNode } from "react";
import { RichText, TooltipSection, TooltipTag } from "./TooltipPrimitives";
import type { TooltipRichLine, TooltipTagView } from "./TooltipPrimitives";

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
  tags: TooltipTagView[];
  summary_lines?: TooltipRichLine[];
  sections: {
    description: { title_text: string; lines: string[] };
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
  normalizedEquipmentTooltipTags: (gem: TGem, view: TView, rarityTone: string) => TooltipTagView[];
  equipmentTooltipStatLines: (gem: TGem, lines: TooltipStatLineView[]) => TooltipStatLineView[];
  equipmentTooltipBonusLines: (gem: TGem, lines: string[]) => string[];
  frontendGemLevelText: (gem: TGem) => string;
  isEquipmentTooltip: (gem: TGem) => boolean;
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
  const equipmentTooltip = isEquipmentTooltip(gem);
  const showDescriptionSection = isActiveTooltip || !equipmentTooltip;
  const showSubtitle = isActiveTooltip || !equipmentTooltip;
  const showIdentity = Boolean(view.type_identity_text) && !equipmentTooltip;
  const statLines = equipmentTooltip ? equipmentTooltipStatLines(gem, sections.stats.lines) : sections.stats.lines;
  const bonusLines = equipmentTooltip && sections.bonuses ? equipmentTooltipBonusLines(gem, sections.bonuses.lines) : sections.bonuses?.lines ?? [];
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
      {showDescriptionSection && <TooltipSection title={sections.description.title_text}>
        {sections.description.lines.map((line) => isActiveTooltip ? <RichText key={line} line={highlightTooltipText(line)} /> : <p key={line}>{line}</p>)}
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
      {sections.bonuses && bonusLines.length > 0 && (
        <TooltipSection title={sections.bonuses.title_text}>
          {bonusLines.map((line, index) => <p key={`${index}-${line}`} className={`tooltip-bonus-line ${isActiveTooltip ? "tooltip-tone-rule" : ""}`}>{line}</p>)}
        </TooltipSection>
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
