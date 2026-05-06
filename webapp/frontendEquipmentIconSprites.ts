import amuletIcon from "./assets/equipment-icons/amulet.png";
import beltIcon from "./assets/equipment-icons/belt.png";
import bowIcon from "./assets/equipment-icons/bow.png";
import cannonIcon from "./assets/equipment-icons/cannon.png";
import clawIcon from "./assets/equipment-icons/claw.png";
import crossbowIcon from "./assets/equipment-icons/crossbow.png";
import daggerIcon from "./assets/equipment-icons/dagger.png";
import dexterityBootsIcon from "./assets/equipment-icons/dexterity_boots.png";
import dexterityChestIcon from "./assets/equipment-icons/dexterity_chest.png";
import dexterityGlovesIcon from "./assets/equipment-icons/dexterity_gloves.png";
import dexterityHeadIcon from "./assets/equipment-icons/dexterity_head.png";
import dexterityShieldIcon from "./assets/equipment-icons/dexterity_shield.png";
import intelligenceBootsIcon from "./assets/equipment-icons/intelligence_boots.png";
import intelligenceChestIcon from "./assets/equipment-icons/intelligence_chest.png";
import intelligenceGlovesIcon from "./assets/equipment-icons/intelligence_gloves.png";
import intelligenceHeadIcon from "./assets/equipment-icons/intelligence_head.png";
import intelligenceShieldIcon from "./assets/equipment-icons/intelligence_shield.png";
import martialStaffIcon from "./assets/equipment-icons/martial_staff.png";
import musketIcon from "./assets/equipment-icons/musket.png";
import oneHandedAxeIcon from "./assets/equipment-icons/one_handed_axe.png";
import oneHandedHammerIcon from "./assets/equipment-icons/one_handed_hammer.png";
import oneHandedSwordIcon from "./assets/equipment-icons/one_handed_sword.png";
import pistolIcon from "./assets/equipment-icons/pistol.png";
import ringIcon from "./assets/equipment-icons/ring.png";
import scepterIcon from "./assets/equipment-icons/scepter.png";
import spiritRingIcon from "./assets/equipment-icons/spirit_ring.png";
import spiritStaffIcon from "./assets/equipment-icons/spirit_staff.png";
import staffIcon from "./assets/equipment-icons/staff.png";
import strengthBootsIcon from "./assets/equipment-icons/strength_boots.png";
import strengthChestIcon from "./assets/equipment-icons/strength_chest.png";
import strengthGlovesIcon from "./assets/equipment-icons/strength_gloves.png";
import strengthHeadIcon from "./assets/equipment-icons/strength_head.png";
import strengthShieldIcon from "./assets/equipment-icons/strength_shield.png";
import tinStaffIcon from "./assets/equipment-icons/tin_staff.png";
import twoHandedAxeIcon from "./assets/equipment-icons/two_handed_axe.png";
import twoHandedHammerIcon from "./assets/equipment-icons/two_handed_hammer.png";
import twoHandedSwordIcon from "./assets/equipment-icons/two_handed_sword.png";
import wandIcon from "./assets/equipment-icons/wand.png";

const EQUIPMENT_ICON_SPRITES: Record<string, string> = {
  力量头部: strengthHeadIcon,
  力量胸甲: strengthChestIcon,
  力量手套: strengthGlovesIcon,
  力量鞋子: strengthBootsIcon,
  力量盾牌: strengthShieldIcon,
  敏捷头部: dexterityHeadIcon,
  敏捷胸甲: dexterityChestIcon,
  敏捷手套: dexterityGlovesIcon,
  敏捷鞋子: dexterityBootsIcon,
  敏捷盾牌: dexterityShieldIcon,
  智慧头部: intelligenceHeadIcon,
  智慧胸甲: intelligenceChestIcon,
  智慧手套: intelligenceGlovesIcon,
  智慧鞋子: intelligenceBootsIcon,
  智慧盾牌: intelligenceShieldIcon,
  项链: amuletIcon,
  腰带: beltIcon,
  戒指: ringIcon,
  灵戒: spiritRingIcon,
  匕首: daggerIcon,
  爪: clawIcon,
  单手剑: oneHandedSwordIcon,
  双手剑: twoHandedSwordIcon,
  单手斧: oneHandedAxeIcon,
  双手斧: twoHandedAxeIcon,
  单手锤: oneHandedHammerIcon,
  双手锤: twoHandedHammerIcon,
  弓: bowIcon,
  弩: crossbowIcon,
  手枪: pistolIcon,
  火枪: musketIcon,
  火炮: cannonIcon,
  法杖: staffIcon,
  魔杖: wandIcon,
  灵杖: spiritStaffIcon,
  手杖: scepterIcon,
  武杖: martialStaffIcon,
  锡杖: tinStaffIcon,
};

export function frontendEquipmentIconSprite(source: string | undefined | null) {
  return source ? EQUIPMENT_ICON_SPRITES[source] : undefined;
}
