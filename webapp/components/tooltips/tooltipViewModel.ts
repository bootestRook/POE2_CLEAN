import type { TooltipRichLine, TooltipTagView } from "./TooltipPrimitives";

export type TooltipView = {
  variant?: "active" | "passive" | "support";
  icon_text: string;
  icon_color_key?: string;
  icon_sprite?: string;
  rarity_tone?: string;
  name_text: string;
  subtitle_text: string;
  type_identity_text: string;
  tags: readonly TooltipTagView[];
  summary_lines?: TooltipRichLine[];
  sections: {
    description: { title_text: string; lines: string[] };
    stats: { title_text: string; lines: TooltipStatLine[] };
    recent_dps?: { title_text: string; lines: TooltipStatLine[] };
    bonuses?: { title_text: string; lines: string[] };
    base_skill_level?: { lines: string[] };
    conditions?: { rich_lines: TooltipRichLine[] };
    support_rules?: { rich_lines: TooltipRichLine[] };
    base_bonuses?: { rich_lines: TooltipRichLine[] };
    current_targets?: { title_text: string; lines: TooltipTargetLine[] };
    rules?: { title_text: string; lines: string[] };
  };
};

export type TooltipStatLine = {
  label_text: string;
  value_text: string;
};

export type TooltipTargetLine = {
  name_text: string;
  status_text: string;
};

export function createFrontendItemTooltipView(item: {
  nameText: string;
  rarityText: string;
  categoryText: string;
  identityText: string;
  descriptionText: string;
  iconText: string;
  iconColorKey?: string;
  iconSprite?: string;
  rarityTone?: string;
  tags: readonly TooltipTagView[];
  statLines?: TooltipStatLine[];
  bonusLines?: string[];
}): TooltipView {
  return {
    icon_text: item.iconText,
    icon_color_key: item.iconColorKey ?? "orange",
    icon_sprite: item.iconSprite,
    rarity_tone: item.rarityTone,
    name_text: item.nameText,
    subtitle_text: `${item.rarityText} \u00b7 ${item.categoryText}`,
    type_identity_text: item.identityText,
    tags: item.tags,
    sections: {
      description: {
        title_text: "\u8bf4\u660e",
        lines: [item.descriptionText]
      },
      stats: {
        title_text: "\u5c5e\u6027",
        lines: item.statLines ?? []
      },
      bonuses: item.bonusLines && item.bonusLines.length > 0 ? {
        title_text: "\u8bcd\u7f00",
        lines: item.bonusLines
      } : undefined
    }
  };
}
