import stardustCoreIcon from "./assets/items/stardust_core.png";
import stardustMotesIcon from "./assets/items/stardust_motes.png";
import stardustSandIcon from "./assets/items/stardust_sand.png";
import ashFineIcon from "./assets/items/ash_fine.png";
import ashPreciousIcon from "./assets/items/ash_precious.png";
import ashPeerlessIcon from "./assets/items/ash_peerless.png";
import ashSupremeIcon from "./assets/items/ash_supreme.png";
import { createFrontendItemTooltipView, type TooltipView } from "./components/tooltips/tooltipViewModel";

export const DEFAULT_ORDINARY_ITEM_MAX_STACK_COUNT = 999;

export type FrontendOrdinaryItemDefinition = {
  id: string;
  nameText: string;
  descriptionText: string;
  categoryText: string;
  rarityText: string;
  iconText: string;
  iconColorKey: string;
  maxStackCount: number;
  iconSprite: string;
  aliases: readonly string[];
};

type FrontendOrdinaryItemInstance = {
  instance_id: string;
  item_kind: "ordinary";
  name_text: string;
  description_text: string;
  category_text: string;
  rarity_text: string;
  gem_kind: "";
  gem_type: { id: string; display_text: string; identity_text: string };
  tags: readonly { id?: string; text: string; tone?: string }[];
  current_effective_targets: readonly { name_text: string }[];
  board_position: null;
  level?: number;
  stack_count: number;
  max_stack_count: number;
  tooltip_view: TooltipView;
};

const FRONTEND_ORDINARY_ITEM_DEFINITIONS: readonly FrontendOrdinaryItemDefinition[] = [
  {
    id: "stardust_motes",
    nameText: "星尘微屑",
    descriptionText: "散落的微光星尘，可作为基础合成材料。",
    categoryText: "星尘材料",
    rarityText: "材料",
    iconText: "尘",
    iconColorKey: "cyan",
    maxStackCount: DEFAULT_ORDINARY_ITEM_MAX_STACK_COUNT,
    iconSprite: stardustMotesIcon,
    aliases: ["stardust_motes", "星尘微屑"],
  },
  {
    id: "stardust_sand",
    nameText: "星尘凝砂",
    descriptionText: "凝结成砂的星尘，适合用于更稳定的锻造配方。",
    categoryText: "星尘材料",
    rarityText: "材料",
    iconText: "砂",
    iconColorKey: "white",
    maxStackCount: DEFAULT_ORDINARY_ITEM_MAX_STACK_COUNT,
    iconSprite: stardustSandIcon,
    aliases: ["stardust_sand", "星尘凝砂"],
  },
  {
    id: "stardust_core",
    nameText: "星尘源核",
    descriptionText: "高密度星尘凝成的核心结晶，常见于高阶配方。",
    categoryText: "星尘材料",
    rarityText: "材料",
    iconText: "核",
    iconColorKey: "orange",
    maxStackCount: DEFAULT_ORDINARY_ITEM_MAX_STACK_COUNT,
    iconSprite: stardustCoreIcon,
    aliases: ["stardust_core", "星尘源核"],
  },
  {
    id: "ash_fine",
    nameText: "优质灰烬",
    descriptionText: "经过筛炼后的灰烬，保留了稳定而细密的余烬纹理。",
    categoryText: "灰烬材料",
    rarityText: "材料",
    iconText: "灰",
    iconColorKey: "white",
    maxStackCount: DEFAULT_ORDINARY_ITEM_MAX_STACK_COUNT,
    iconSprite: ashFineIcon,
    aliases: ["ash_fine", "优质灰烬"],
  },
  {
    id: "ash_precious",
    nameText: "珍贵灰烬",
    descriptionText: "带有柔和辉光的灰烬材料，常用于更精细的塑形工序。",
    categoryText: "灰烬材料",
    rarityText: "材料",
    iconText: "珍",
    iconColorKey: "cyan",
    maxStackCount: DEFAULT_ORDINARY_ITEM_MAX_STACK_COUNT,
    iconSprite: ashPreciousIcon,
    aliases: ["ash_precious", "珍贵灰烬"],
  },
  {
    id: "ash_peerless",
    nameText: "稀世灰烬",
    descriptionText: "极为少见的高纯度灰烬，能在锻造中留下更深的余辉。",
    categoryText: "灰烬材料",
    rarityText: "材料",
    iconText: "稀",
    iconColorKey: "orange",
    maxStackCount: DEFAULT_ORDINARY_ITEM_MAX_STACK_COUNT,
    iconSprite: ashPeerlessIcon,
    aliases: ["ash_peerless", "稀世灰烬"],
  },
  {
    id: "ash_supreme",
    nameText: "至臻灰烬",
    descriptionText: "近乎完美凝结的顶级灰烬，只会出现在最纯粹的余烬之中。",
    categoryText: "灰烬材料",
    rarityText: "材料",
    iconText: "臻",
    iconColorKey: "yellow",
    maxStackCount: DEFAULT_ORDINARY_ITEM_MAX_STACK_COUNT,
    iconSprite: ashSupremeIcon,
    aliases: ["ash_supreme", "至臻灰烬"],
  },
];

const ORDINARY_ITEM_DESCRIPTION_OVERRIDES: Record<string, string> = {
  ash_fine: "用于在打造中为物品等级 75 级及以下的装备添加初阶或进阶词缀。",
  ash_precious: "用于在打造中为物品等级 76 级及以上的装备添加初阶词缀。",
  ash_peerless: "用于在打造中为物品等级 76 级及以上的装备添加进阶词缀。",
  ash_supreme: "用于在打造中为可打造至臻词缀的装备添加至臻词缀。",
};

const FRONTEND_ORDINARY_ITEM_BY_ALIAS = new Map<string, FrontendOrdinaryItemDefinition>();

for (const definition of FRONTEND_ORDINARY_ITEM_DEFINITIONS) {
  FRONTEND_ORDINARY_ITEM_BY_ALIAS.set(definition.id, definition);
  FRONTEND_ORDINARY_ITEM_BY_ALIAS.set(definition.nameText, definition);
  definition.aliases.forEach((alias) => FRONTEND_ORDINARY_ITEM_BY_ALIAS.set(alias, definition));
}

export function frontendOrdinaryItemDefinitions() {
  return FRONTEND_ORDINARY_ITEM_DEFINITIONS.map((definition) => ({
    ...definition,
    descriptionText: ordinaryItemDescriptionText(definition),
  }));
}

export function frontendOrdinaryItemDefinitionById(source: string | undefined | null) {
  return source ? FRONTEND_ORDINARY_ITEM_BY_ALIAS.get(source) ?? null : null;
}

export function frontendOrdinaryItemIconSprite(source: string | undefined | null) {
  return frontendOrdinaryItemDefinitionById(source)?.iconSprite;
}

function ordinaryItemTooltipView(
  definition: FrontendOrdinaryItemDefinition,
  stackCount: number,
  maxStackCount: number
) {
  return createFrontendItemTooltipView({
    nameText: definition.nameText,
    rarityText: definition.rarityText,
    categoryText: definition.categoryText,
    identityText: definition.id,
    descriptionText: ordinaryItemDescriptionText(definition),
    iconText: definition.iconText,
    iconColorKey: definition.iconColorKey,
    iconSprite: definition.iconSprite,
    tags: [
      { id: "ordinary_item", text: definition.categoryText, tone: "category" },
      { id: "stackable", text: "可堆叠", tone: "type" },
    ],
    statLines: [
      { label_text: "数量", value_text: String(stackCount) },
      { label_text: "堆叠上限", value_text: String(maxStackCount) },
    ],
  });
}

export function createFrontendOrdinaryItem(
  definition: FrontendOrdinaryItemDefinition,
  {
    instanceId,
    stackCount = 1,
    maxStackCount = definition.maxStackCount,
  }: {
    instanceId: string;
    stackCount?: number;
    maxStackCount?: number;
  }
): FrontendOrdinaryItemInstance {
  const normalizedStackCount = Math.max(1, Math.floor(Number(stackCount) || 1));
  const normalizedMaxStackCount = Math.max(normalizedStackCount, Math.floor(Number(maxStackCount) || definition.maxStackCount));
  const tags = [
    { id: "ordinary_item", text: definition.categoryText, tone: "category" as const },
    { id: "stackable", text: `可堆叠 ${normalizedMaxStackCount}`, tone: "type" as const },
  ];
  return {
    instance_id: instanceId,
    item_kind: "ordinary",
    name_text: definition.nameText,
    description_text: ordinaryItemDescriptionText(definition),
    category_text: definition.categoryText,
    rarity_text: definition.rarityText,
    gem_kind: "",
    gem_type: {
      id: definition.id,
      display_text: definition.nameText,
      identity_text: definition.id,
    },
    tags,
    current_effective_targets: [],
    board_position: null,
    stack_count: normalizedStackCount,
    max_stack_count: normalizedMaxStackCount,
    tooltip_view: ordinaryItemTooltipView(definition, normalizedStackCount, normalizedMaxStackCount),
  };
}

function ordinaryItemDescriptionText(definition: FrontendOrdinaryItemDefinition) {
  return ORDINARY_ITEM_DESCRIPTION_OVERRIDES[definition.id] ?? definition.descriptionText;
}
