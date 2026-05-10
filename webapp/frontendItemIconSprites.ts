import stardustCoreIcon from "./assets/items/stardust_core.png";
import stardustMotesIcon from "./assets/items/stardust_motes.png";
import stardustSandIcon from "./assets/items/stardust_sand.png";

const ITEM_ICON_SPRITES: Record<string, string> = {
  stardust_motes: stardustMotesIcon,
  stardust_sand: stardustSandIcon,
  stardust_core: stardustCoreIcon,
  "\u661f\u5c18\u5fae\u5c51": stardustMotesIcon,
  "\u661f\u5c18\u51dd\u7802": stardustSandIcon,
  "\u661f\u5c18\u6e90\u6838": stardustCoreIcon,
};

export function frontendItemIconSprite(source: string | undefined | null) {
  return source ? ITEM_ICON_SPRITES[source] : undefined;
}
