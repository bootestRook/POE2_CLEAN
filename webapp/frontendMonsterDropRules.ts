import type { MonsterType, ProceduralSpawnRarity } from "./mapSpawnRuntime";

export type FrontendMonsterDropRule = {
  drop_quantity_multiplier: number;
  drop_rarity_multiplier: number;
  drop_pool_id: string;
  currency_drop_weight: number;
};

const DEFAULT_DROP_POOL_ID = "map_default";
const DEFAULT_LOOT_KINDS = ["equipment", "gem", "map_entry"] as const;

const DROP_POOL_LOOT_KINDS: Record<string, readonly typeof DEFAULT_LOOT_KINDS[number][]> = {
  map_default: DEFAULT_LOOT_KINDS
};

const BASE_DROP_RULE: FrontendMonsterDropRule = {
  drop_quantity_multiplier: 1,
  drop_rarity_multiplier: 1,
  drop_pool_id: DEFAULT_DROP_POOL_ID,
  currency_drop_weight: 0
};

const RARITY_DROP_RULES: Record<string, FrontendMonsterDropRule> = {
  normal: BASE_DROP_RULE,
  magic: { drop_quantity_multiplier: 1.35, drop_rarity_multiplier: 1.25, drop_pool_id: DEFAULT_DROP_POOL_ID, currency_drop_weight: 0 },
  rare: { drop_quantity_multiplier: 2.25, drop_rarity_multiplier: 1.75, drop_pool_id: DEFAULT_DROP_POOL_ID, currency_drop_weight: 0 },
  legendary_boss: { drop_quantity_multiplier: 5, drop_rarity_multiplier: 2.8, drop_pool_id: DEFAULT_DROP_POOL_ID, currency_drop_weight: 0 },
  supreme_boss: { drop_quantity_multiplier: 6.5, drop_rarity_multiplier: 3.25, drop_pool_id: DEFAULT_DROP_POOL_ID, currency_drop_weight: 0 },
  boss: { drop_quantity_multiplier: 5, drop_rarity_multiplier: 2.8, drop_pool_id: DEFAULT_DROP_POOL_ID, currency_drop_weight: 0 }
};

const MONSTER_TYPE_DROP_RULES: Partial<Record<MonsterType, FrontendMonsterDropRule>> = {
  minion: { drop_quantity_multiplier: 0.75, drop_rarity_multiplier: 0.9, drop_pool_id: DEFAULT_DROP_POOL_ID, currency_drop_weight: 0 },
  melee: BASE_DROP_RULE,
  ranged: { drop_quantity_multiplier: 1, drop_rarity_multiplier: 1.05, drop_pool_id: DEFAULT_DROP_POOL_ID, currency_drop_weight: 0 },
  charger: { drop_quantity_multiplier: 1.1, drop_rarity_multiplier: 1.05, drop_pool_id: DEFAULT_DROP_POOL_ID, currency_drop_weight: 0 },
  tank: { drop_quantity_multiplier: 1.15, drop_rarity_multiplier: 1, drop_pool_id: DEFAULT_DROP_POOL_ID, currency_drop_weight: 0 },
  assassin: { drop_quantity_multiplier: 1.05, drop_rarity_multiplier: 1.1, drop_pool_id: DEFAULT_DROP_POOL_ID, currency_drop_weight: 0 },
  support: { drop_quantity_multiplier: 1.2, drop_rarity_multiplier: 1.15, drop_pool_id: DEFAULT_DROP_POOL_ID, currency_drop_weight: 0 }
};

export function resolveFrontendMonsterDropRule(
  rarity: ProceduralSpawnRarity | string | undefined,
  monsterType: MonsterType | undefined,
  boss: boolean
): FrontendMonsterDropRule {
  const rarityKey = boss ? String(rarity ?? "boss") : String(rarity ?? "normal");
  const rarityRule = RARITY_DROP_RULES[rarityKey] ?? RARITY_DROP_RULES.normal;
  const typeRule = monsterType ? MONSTER_TYPE_DROP_RULES[monsterType] ?? BASE_DROP_RULE : BASE_DROP_RULE;
  return {
    drop_quantity_multiplier: Math.max(0, rarityRule.drop_quantity_multiplier * typeRule.drop_quantity_multiplier),
    drop_rarity_multiplier: Math.max(0, rarityRule.drop_rarity_multiplier * typeRule.drop_rarity_multiplier),
    drop_pool_id: typeRule.drop_pool_id || rarityRule.drop_pool_id || DEFAULT_DROP_POOL_ID,
    currency_drop_weight: Math.max(0, rarityRule.currency_drop_weight + typeRule.currency_drop_weight)
  };
}

export function scaleFrontendDropRarityWeights<T extends Record<string, number>>(
  weights: T,
  multiplier: number,
  highQualityKeys: readonly (keyof T)[]
): T {
  const next = { ...weights };
  if (!Number.isFinite(multiplier) || multiplier === 1) return next;
  for (const key of highQualityKeys) {
    const current = Number(next[key] ?? 0);
    next[key] = Math.max(0, Math.round(current * Math.max(0, multiplier))) as T[keyof T];
  }
  return next;
}

export function allowedFrontendLootKindsForPool(dropPoolId: string | undefined) {
  return DROP_POOL_LOOT_KINDS[dropPoolId || DEFAULT_DROP_POOL_ID] ?? DEFAULT_LOOT_KINDS;
}
