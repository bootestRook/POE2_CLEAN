import type { CSSProperties } from "react";
import { frontendEquipmentIconSprite } from "../../frontendEquipmentIconSprites";
import { isGemItem } from "../inventory/equipmentRules";
import { gemColorKey, romanGemLevel } from "../../utils/gemDisplay";
import { gemIconSprite } from "./gemIconSprites";
import { buildEquipmentRarityToneForGem } from "./tooltipFormatting";
import type { TooltipView } from "./tooltipViewModel";

type GemOrbSource = {
  item_kind?: "gem" | "ordinary" | "equipment";
  name_text: string;
  category_text: string;
  rarity_text: string;
  gem_kind?: string;
  sudoku_digit?: number;
  gem_type: { id?: string; number?: number; display_text: string; identity_text: string };
  tags: readonly { id?: string; text: string }[];
  tooltip_view?: TooltipView;
  level?: number;
  equipment_rarity?: string;
  equipment_affixes?: readonly { effect: string; tier: unknown }[];
};

export function GemOrb({ gem }: { gem: GemOrbSource }) {
  const isGem = isGemItem(gem);
  const equipmentTone = buildEquipmentRarityToneForGem(gem);
  const sprite: string = (gem.tooltip_view?.icon_sprite
    || (isGem ? gemIconSprite(gem) : "")
    || (gem.item_kind === "equipment" ? frontendEquipmentIconSprite(gem.gem_type?.id ?? gem.gem_type?.display_text ?? gem.category_text) : "")
    || "");
  const className: string = !isGem
    ? `item-orb ${equipmentTone ? `item-orb-rarity-${equipmentTone}` : ""}`
    : `gem-orb-color-${String(gem.tooltip_view?.icon_color_key ?? gemColorKey(gem))}`;
  const level = isGem ? Math.max(1, Math.floor(Number(gem.level ?? 1))) : 0;
  return (
    <GemOrbView
      className={className}
      sprite={sprite}
      iconText={gem.tooltip_view?.icon_text ?? gem.name_text.slice(0, 1)}
      levelText={level > 0 ? romanGemLevel(level) : ""}
    />
  );
}

export function GemOrbView({
  className,
  sprite,
  iconText,
  levelText
}: {
  className: string;
  sprite: string;
  iconText: string;
  levelText: string;
}) {
  const style = sprite ? ({ "--gem-icon-sprite": `url(${sprite})` } as CSSProperties) : undefined;
  return (
    <span className={`gem-orb ${className} ${sprite ? "gem-orb-sprite" : ""}`} style={style}>
      {sprite ? <span className="gem-orb-label">{iconText}</span> : iconText}
      {levelText ? <span className="gem-orb-roman-level">{levelText}</span> : null}
    </span>
  );
}
