export type FrontendWeightedDropPoolEntry<TValue extends string | number> = {
  value: TValue;
  weight: number;
};

export type FrontendMaterialDropPoolEntry = {
  itemId: string;
  weight: number;
  allowedInLevel: readonly string[];
};

export type FrontendEquipmentDropPoolEntry = {
  baseType: string;
  weight: number;
  minTier: number;
  maxTier: number;
};

export type FrontendMapEntryDropPoolEntry = {
  mapId: string;
  weight: number;
};

export type FrontendLevelDropModifier = {
  quantityBonus: number;
  rarityBonus: number;
};

export const FRONTEND_GEM_SUDOKU_TYPE_DROP_POOL: readonly FrontendWeightedDropPoolEntry<number>[] = [
  { value: 1, weight: 150 },
  { value: 2, weight: 120 },
  { value: 3, weight: 80 },
  { value: 4, weight: 80 },
  { value: 5, weight: 80 },
  { value: 6, weight: 80 },
  { value: 7, weight: 80 },
  { value: 8, weight: 80 },
  { value: 9, weight: 50 },
];

export const FRONTEND_MATERIAL_DROP_POOL: readonly FrontendMaterialDropPoolEntry[] = [
  { itemId: "stardust_motes", weight: 300, allowedInLevel: ["start_i_01", "start_ii_01", "borderland_01", "depths_01", "danger_i_01", "timemark_1_01"] },
  { itemId: "stardust_sand", weight: 100, allowedInLevel: ["start_ii_01", "borderland_01", "depths_01", "danger_i_01", "timemark_1_01"] },
  { itemId: "stardust_core", weight: 50, allowedInLevel: ["timemark_1_01", "timemark_1_02", "timemark_8_4"] },
  { itemId: "ash_fine", weight: 150, allowedInLevel: ["start_ii_01", "timemark_1_01", "timemark_1_02"] },
  { itemId: "ash_precious", weight: 100, allowedInLevel: ["timemark_1_01", "timemark_1_02", "timemark_8_4"] },
  { itemId: "ash_peerless", weight: 75, allowedInLevel: ["timemark_1_01", "timemark_1_02", "timemark_8_4"] },
  { itemId: "ash_supreme", weight: 50, allowedInLevel: ["timemark_1_01", "timemark_1_02", "timemark_8_4"] },
];

export const FRONTEND_EQUIPMENT_DROP_POOL: readonly FrontendEquipmentDropPoolEntry[] = [
  { baseType: "匕首", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "爪", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "单手剑", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "单手斧", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "单手锤", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "双手剑", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "双手斧", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "双手锤", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "弓", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "弩", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "手枪", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "火枪", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "火炮", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "手杖", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "武杖", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "法杖", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "魔杖", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "灵杖", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "锡杖", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "力量头部", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "敏捷头部", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "智慧头部", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "手套", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "胸甲", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "鞋子", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "盾牌", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "戒指", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "灵戒", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "项链", weight: 50, minTier: 0, maxTier: 6 },
  { baseType: "腰带", weight: 50, minTier: 0, maxTier: 6 },
];

export const FRONTEND_MAP_ENTRY_DROP_POOL: readonly FrontendMapEntryDropPoolEntry[] = [
  { mapId: "start_i_02", weight: 50 },
  { mapId: "start_i_03", weight: 25 },
  { mapId: "start_ii_01", weight: 50 },
  { mapId: "timemark_8_4", weight: 10 },
];

export const FRONTEND_LEVEL_DROP_MODIFIERS: Record<string, FrontendLevelDropModifier> = {
  start_i: { quantityBonus: 0, rarityBonus: 0 },
  start_ii: { quantityBonus: 0.05, rarityBonus: 0.05 },
  borderland: { quantityBonus: 0.1, rarityBonus: 0.1 },
  depths: { quantityBonus: 0.15, rarityBonus: 0.15 },
  danger_i: { quantityBonus: 0.2, rarityBonus: 0.2 },
  danger_ii: { quantityBonus: 0.25, rarityBonus: 0.25 },
  timemark_1: { quantityBonus: 0.3, rarityBonus: 0.3 },
  timemark_2: { quantityBonus: 0.35, rarityBonus: 0.35 },
  timemark_3: { quantityBonus: 0.4, rarityBonus: 0.4 },
  timemark_4: { quantityBonus: 0.45, rarityBonus: 0.45 },
  timemark_5: { quantityBonus: 0.5, rarityBonus: 0.5 },
  timemark_6: { quantityBonus: 0.55, rarityBonus: 0.55 },
  timemark_7: { quantityBonus: 0.6, rarityBonus: 0.6 },
  timemark_8: { quantityBonus: 0.65, rarityBonus: 0.65 },
};

export const FRONTEND_GEM_DROP_CONSTRAINTS = {
  allowedAffixV1: true,
  sudokuUniquePerRow: true,
  sudokuUniquePerColumn: true,
  sudokuUniquePerBox: true,
  supportTargetValid: true,
  conduitValid: true,
} as const;

export function chooseFrontendWeightedEntry<TEntry extends { weight: number }>(
  entries: readonly TEntry[],
  roll: number
): TEntry | null {
  const candidates = entries.filter((entry) => entry.weight > 0);
  const total = candidates.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= 0) return null;
  let cursor = Math.max(0, Math.min(roll, 0.999999999)) * total;
  for (const entry of candidates) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry;
  }
  return candidates[candidates.length - 1] ?? null;
}

export function frontendLevelDropModifier(stageId: string | undefined) {
  return FRONTEND_LEVEL_DROP_MODIFIERS[frontendLevelModifierKey(stageId)] ?? FRONTEND_LEVEL_DROP_MODIFIERS.start_i;
}

export function frontendMaterialDropCandidates(stageId: string | undefined) {
  return FRONTEND_MATERIAL_DROP_POOL.filter((entry) => entry.allowedInLevel.includes(String(stageId ?? "")));
}

export function frontendEquipmentDropPoolSourceCandidates(
  baseType: string,
  sourceOptions: readonly string[]
): readonly string[] {
  if (sourceOptions.includes(baseType)) return [baseType];
  if (["手套", "胸甲", "鞋子", "盾牌"].includes(baseType)) {
    return sourceOptions.filter((source) => source.includes(baseType));
  }
  return [];
}

function frontendLevelModifierKey(stageId: string | undefined) {
  const id = String(stageId ?? "");
  if (id.startsWith("start_i_")) return "start_i";
  if (id.startsWith("start_ii_")) return "start_ii";
  if (id.startsWith("borderland_")) return "borderland";
  if (id.startsWith("depths_")) return "depths";
  if (id.startsWith("danger_i_")) return "danger_i";
  if (id.startsWith("danger_ii_")) return "danger_ii";
  const timemark = /^timemark_(\d+)_/.exec(id);
  if (timemark) return `timemark_${timemark[1]}`;
  return "start_i";
}
