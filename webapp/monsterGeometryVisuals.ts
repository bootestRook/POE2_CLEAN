import type { UnitVisualType } from "./unitAssets";
import type { MonsterRarity, MonsterType } from "./mapSpawnRuntime";

export type MonsterGeometryTier = MonsterRarity;

export type MonsterGeometryShape =
  | "circle_ring"
  | "triangle"
  | "square_dot"
  | "diamond_tail"
  | "double_triangle"
  | "hex_eye"
  | "cluster"
  | "needle_ghost"
  | "circle_square"
  | "tri_in_tri"
  | "crystal_cross"
  | "hex_core"
  | "broken_ring_bolt"
  | "square_invtri"
  | "wind_wheel"
  | "double_diamond"
  | "tri_crown"
  | "ring_square_corners"
  | "star_diamonds"
  | "hex_tri_layers"
  | "square_spikes"
  | "double_ring_eye"
  | "obelisk"
  | "twin_shadow"
  | "boss_king"
  | "boss_void"
  | "boss_pinwheel"
  | "boss_star_mother"
  | "boss_judicator"
  | "boss_eclipse"
  | "boss_mirror"
  | "boss_triad";

export type MonsterGeometryVisual = {
  id: string;
  tier: MonsterGeometryTier;
  monsterType: MonsterType;
  shape: MonsterGeometryShape;
  primaryColor: string;
  accentColor: string;
  sizePx: number;
  fallbackUnitVisual: UnitVisualType;
};

export type MonsterRarityVisual = {
  healthClass: string;
  accentColor: string;
  labelText: string;
};

export const MONSTER_RARITY_VISUALS: Record<MonsterRarity, MonsterRarityVisual> = {
  normal: { healthClass: "monster-rarity-normal", accentColor: "#d9dde1", labelText: "普通" },
  magic: { healthClass: "monster-rarity-magic", accentColor: "#61c6e8", labelText: "魔法" },
  rare: { healthClass: "monster-rarity-rare", accentColor: "#f2b84b", labelText: "稀有" },
  legendary_boss: { healthClass: "monster-rarity-legendary-boss", accentColor: "#8e5af7", labelText: "传奇" },
  supreme_boss: { healthClass: "monster-rarity-supreme-boss", accentColor: "#ff5f6d", labelText: "至高" }
};

export const MONSTER_GEOMETRY_VISUALS: Record<string, MonsterGeometryVisual> = {
  mon_100101: visual("mon_100101", "normal", "circle_ring", "#F7F7F2", "#D9DDE1", 38, "enemy_imp"),
  mon_100102: visual("mon_100102", "normal", "triangle", "#F7F7F2", "#D9DDE1", 38, "enemy_imp"),
  mon_100103: visual("mon_100103", "normal", "square_dot", "#F7F7F2", "#D9DDE1", 38, "enemy_imp"),
  mon_100104: visual("mon_100104", "normal", "diamond_tail", "#F7F7F2", "#D9DDE1", 38, "enemy_imp"),
  mon_100105: visual("mon_100105", "normal", "double_triangle", "#F7F7F2", "#D9DDE1", 38, "enemy_imp"),
  mon_100106: visual("mon_100106", "normal", "hex_eye", "#F7F7F2", "#D9DDE1", 38, "enemy_imp"),
  mon_100107: visual("mon_100107", "normal", "cluster", "#F7F7F2", "#D9DDE1", 38, "enemy_imp"),
  mon_100108: visual("mon_100108", "normal", "needle_ghost", "#F7F7F2", "#D9DDE1", 38, "enemy_imp"),
  mon_200101: visual("mon_200101", "magic", "circle_square", "#F7F7F2", "#D9DDE1", 46, "enemy_imp"),
  mon_200102: visual("mon_200102", "magic", "tri_in_tri", "#F7F7F2", "#D9DDE1", 46, "enemy_imp"),
  mon_200103: visual("mon_200103", "magic", "crystal_cross", "#F7F7F2", "#D9DDE1", 46, "enemy_imp"),
  mon_200104: visual("mon_200104", "magic", "hex_core", "#F7F7F2", "#D9DDE1", 46, "enemy_imp"),
  mon_200105: visual("mon_200105", "magic", "broken_ring_bolt", "#F7F7F2", "#D9DDE1", 46, "enemy_imp"),
  mon_200106: visual("mon_200106", "magic", "square_invtri", "#F7F7F2", "#D9DDE1", 46, "enemy_imp"),
  mon_200107: visual("mon_200107", "magic", "wind_wheel", "#F7F7F2", "#D9DDE1", 46, "enemy_imp"),
  mon_200108: visual("mon_200108", "magic", "double_diamond", "#F7F7F2", "#D9DDE1", 46, "enemy_imp"),
  mon_300101: visual("mon_300101", "rare", "tri_crown", "#F7F7F2", "#D9DDE1", 58, "enemy_brute"),
  mon_300102: visual("mon_300102", "rare", "ring_square_corners", "#F7F7F2", "#D9DDE1", 58, "enemy_brute"),
  mon_300103: visual("mon_300103", "rare", "star_diamonds", "#F7F7F2", "#D9DDE1", 58, "enemy_brute"),
  mon_300104: visual("mon_300104", "rare", "hex_tri_layers", "#F7F7F2", "#D9DDE1", 58, "enemy_brute"),
  mon_300105: visual("mon_300105", "rare", "square_spikes", "#F7F7F2", "#D9DDE1", 58, "enemy_brute"),
  mon_300106: visual("mon_300106", "rare", "double_ring_eye", "#F7F7F2", "#D9DDE1", 58, "enemy_brute"),
  mon_300107: visual("mon_300107", "rare", "obelisk", "#F7F7F2", "#D9DDE1", 58, "enemy_brute"),
  mon_300108: visual("mon_300108", "rare", "twin_shadow", "#F7F7F2", "#D9DDE1", 58, "enemy_brute"),
  mon_400001: visual("mon_400001", "legendary_boss", "boss_king", "#F7F7F2", "#D9DDE1", 82, "enemy_brute"),
  mon_400002: visual("mon_400002", "legendary_boss", "boss_void", "#F7F7F2", "#D9DDE1", 82, "enemy_brute"),
  mon_400003: visual("mon_400003", "legendary_boss", "boss_pinwheel", "#F7F7F2", "#D9DDE1", 82, "enemy_brute"),
  mon_400004: visual("mon_400004", "legendary_boss", "boss_star_mother", "#F7F7F2", "#D9DDE1", 82, "enemy_brute"),
  mon_400005: visual("mon_400005", "legendary_boss", "boss_judicator", "#F7F7F2", "#D9DDE1", 82, "enemy_brute"),
  mon_500001: visual("mon_500001", "supreme_boss", "boss_eclipse", "#F7F7F2", "#D9DDE1", 82, "enemy_brute"),
  mon_400006: visual("mon_400006", "legendary_boss", "boss_mirror", "#F7F7F2", "#D9DDE1", 82, "enemy_brute"),
  mon_500002: visual("mon_500002", "supreme_boss", "boss_triad", "#F7F7F2", "#D9DDE1", 82, "enemy_brute"),
  mon_400007: visual("mon_400007", "legendary_boss", "boss_king", "#F7F7F2", "#D9DDE1", 82, "enemy_brute"),
  mon_400008: visual("mon_400008", "legendary_boss", "boss_void", "#F7F7F2", "#D9DDE1", 82, "enemy_brute"),
  mon_400009: visual("mon_400009", "legendary_boss", "boss_pinwheel", "#F7F7F2", "#D9DDE1", 82, "enemy_brute"),
  mon_400010: visual("mon_400010", "legendary_boss", "boss_star_mother", "#F7F7F2", "#D9DDE1", 82, "enemy_brute"),
  mon_500003: visual("mon_500003", "supreme_boss", "boss_judicator", "#F7F7F2", "#D9DDE1", 82, "enemy_brute"),
  mon_500004: visual("mon_500004", "supreme_boss", "boss_eclipse", "#F7F7F2", "#D9DDE1", 82, "enemy_brute"),
  mon_500005: visual("mon_500005", "supreme_boss", "boss_mirror", "#F7F7F2", "#D9DDE1", 82, "enemy_brute"),
  mon_500006: visual("mon_500006", "supreme_boss", "boss_triad", "#F7F7F2", "#D9DDE1", 82, "enemy_brute")
};

export function resolveMonsterGeometryVisual(monsterId?: string) {
  return monsterId ? MONSTER_GEOMETRY_VISUALS[monsterId] : undefined;
}

export function fallbackUnitVisualForMonster(monsterId?: string): UnitVisualType {
  return resolveMonsterGeometryVisual(monsterId)?.fallbackUnitVisual
    ?? (monsterId === "enemy_brute" ? "enemy_brute" : "enemy_imp");
}

function visual(
  id: string,
  tier: MonsterGeometryTier,
  shape: MonsterGeometryShape,
  primaryColor: string,
  accentColor: string,
  sizePx: number,
  fallbackUnitVisual: UnitVisualType
): MonsterGeometryVisual {
  return { id, tier, monsterType: monsterTypeForShape(shape), shape, primaryColor, accentColor, sizePx, fallbackUnitVisual };
}

function monsterTypeForShape(shape: MonsterGeometryShape): MonsterType {
  if (shape === "circle_ring" || shape === "triangle" || shape === "cluster") return "minion";
  if (shape === "diamond_tail" || shape === "double_triangle" || shape === "tri_crown" || shape === "boss_king") return "melee";
  if (shape === "hex_eye" || shape === "crystal_cross" || shape === "circle_square" || shape === "hex_core" || shape === "tri_in_tri" || shape === "double_ring_eye" || shape === "boss_judicator" || shape === "boss_eclipse") return "ranged";
  if (shape === "broken_ring_bolt" || shape === "wind_wheel" || shape === "boss_pinwheel") return "charger";
  if (shape === "square_dot" || shape === "ring_square_corners" || shape === "square_spikes" || shape === "obelisk" || shape === "square_invtri" || shape === "hex_tri_layers" || shape === "boss_void") return "tank";
  if (shape === "needle_ghost" || shape === "twin_shadow" || shape === "boss_mirror") return "assassin";
  return "support";
}
