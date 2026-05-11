import frontendEquipmentDataUrl from "./data/equipment/frontendEquipmentData.json?url";

export type FrontendEquipmentAffixDefinition = {
  affix_id: string;
  source_modifier_id: string;
  source: string;
  library: "base" | "initial" | "advanced" | "pinnacle" | string;
  gen: "base" | "prefix" | "suffix" | string;
  tier: number;
  required_level: number;
  weight: number;
  effect: string;
  family_id: string;
  enabled: boolean;
  disabled_reason: string;
  operations?: FrontendEquipmentEffectOperation[];
};

export type FrontendEquipmentEffectOperation = {
  kind: string;
  stat: string;
  value: number;
  value_min: number | null;
  value_max: number | null;
  runtime_hook: string;
  payload: Record<string, unknown> | null;
  source_text: string;
};

export type FrontendEquipmentAffixRoll = {
  affix_id: string;
  source_modifier_id: string;
  library: string;
  gen: string;
  tier: number;
  effect: string;
  family_id: string;
  operations: FrontendEquipmentEffectOperation[];
};

export type FrontendEquipmentItem = {
  source: string;
  level: number;
  rarity: string;
  base_affix: FrontendEquipmentAffixRoll;
  prefix_affixes: FrontendEquipmentAffixRoll[];
  suffix_affixes: FrontendEquipmentAffixRoll[];
};

export type FrontendEquipmentStatModifier = {
  source_modifier_id: string;
  kind: string;
  stat: string;
  value: number;
  value_min?: number | null;
  value_max?: number | null;
  source_text?: string;
  reason_key: string;
  runtime_hook?: string;
  payload?: Record<string, unknown> | null;
};

type FrontendEquipmentDataState = {
  definitions: FrontendEquipmentAffixDefinition[];
  definitionsById: Map<string, FrontendEquipmentAffixDefinition>;
  sourceOptions: string[];
};

let equipmentDataState: FrontendEquipmentDataState | null = null;
let equipmentDataPromise: Promise<FrontendEquipmentDataState> | null = null;

export function preloadFrontendEquipmentData(): Promise<FrontendEquipmentDataState> {
  if (equipmentDataState) return Promise.resolve(equipmentDataState);
  equipmentDataPromise ??= fetch(frontendEquipmentDataUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`Equipment data failed to load: ${response.status} ${response.statusText}`);
      return response.json() as Promise<{ definitions: FrontendEquipmentAffixDefinition[] }>;
    })
    .then((data) => {
      const definitions = data.definitions;
      const state = {
        definitions,
        definitionsById: new Map(definitions.map((definition) => [definition.affix_id, definition])),
        sourceOptions: Array.from(new Set(definitions.filter((definition) => definition.library === "base").map((definition) => definition.source))).sort()
      };
      equipmentDataState = state;
      return state;
    });
  return equipmentDataPromise;
}

function frontendEquipmentDataState() {
  if (!equipmentDataState) {
    throw new Error("Equipment data has not loaded yet.");
  }
  return equipmentDataState;
}

function frontendEquipmentDefinitions() {
  return frontendEquipmentDataState().definitions;
}

function frontendEquipmentDefinitionsById() {
  return frontendEquipmentDataState().definitionsById;
}

function frontendEquipmentSourceOptions() {
  return frontendEquipmentDataState().sourceOptions;
}

const FRONTEND_BASE_MOVE_SPEED = 250;
const WEAPON_EQUIPMENT_SOURCE_KEYWORDS = [
  "\u5315\u9996",
  "\u5355\u624b\u5251",
  "\u5355\u624b\u65a7",
  "\u5355\u624b\u9524",
  "\u53cc\u624b\u5251",
  "\u53cc\u624b\u65a7",
  "\u53cc\u624b\u9524",
  "\u5f13",
  "\u5f29",
  "\u624b\u6756",
  "\u624b\u67aa",
  "\u6b66\u6756",
  "\u6cd5\u6756",
  "\u706b\u67aa",
  "\u706b\u70ae",
  "\u7075\u6756",
  "\u722a",
  "\u9521\u6756",
  "\u9b54\u6756",
];
const NON_WEAPON_EQUIPMENT_SOURCE_SLOT_KEYWORDS = [
  ["\u5934\u90e8"],
  ["\u624b\u5957"],
  ["\u76fe\u724c"],
  ["\u80f8\u7532"],
  ["\u978b\u5b50"],
  ["\u6212"],
  ["\u8170\u5e26"],
  ["\u9879\u94fe"],
];

const RARITY_COUNTS: Record<string, [number, number]> = {
  white: [0, 0],
  blue: [1, 2],
  purple: [3, 5],
  pink: [6, 6],
};

export function frontendEquipmentSources() {
  return frontendEquipmentSourceOptions().map((source) => ({ id: source, name_text: source }));
}

export function frontendEquipmentRarities() {
  return [
    { id: "white", name_text: "白色", affix_count: 0 },
    { id: "blue", name_text: "蓝色", affix_count: 2 },
    { id: "purple", name_text: "紫色", affix_count: 5 },
    { id: "pink", name_text: "粉色", affix_count: 6 },
  ];
}

export function frontendEquipmentRarityText(rarity: string) {
  return frontendEquipmentRarities().find((item) => item.id === rarity)?.name_text ?? rarity;
}

export function frontendEquipmentRarityForAffixCount(count: number) {
  if (count <= 0) return "white";
  if (count <= 2) return "blue";
  if (count <= 5) return "purple";
  return "pink";
}

export function prefixSuffixCapacity(level: number): { prefix: number; suffix: number } {
  if (level <= 10) return { prefix: 1, suffix: 0 };
  if (level <= 25) return { prefix: 1, suffix: 1 };
  if (level <= 40) return { prefix: 2, suffix: 1 };
  if (level <= 60) return { prefix: 2, suffix: 2 };
  if (level <= 80) return { prefix: 3, suffix: 2 };
  return { prefix: 3, suffix: 3 };
}

export function frontendEquipmentAffixOptions(source: string, level: number) {
  return frontendEquipmentDefinitions()
    .filter((definition) => definition.source === source && definition.enabled && definition.required_level <= level)
    .map((definition) => ({
      id: definition.affix_id,
      name_text: frontendEquipmentAffixDefinitionText(definition),
      effect_text: definition.effect,
      library: definition.library,
      gen: definition.gen,
      tier: definition.tier,
      family_id: definition.family_id,
      required_level: definition.required_level,
    }));
}

export function frontendEquipmentSourceForAffixRoll(affix: Pick<FrontendEquipmentAffixRoll, "affix_id"> | null | undefined) {
  if (!affix?.affix_id) return null;
  if (!equipmentDataState) return null;
  return frontendEquipmentDefinitionsById().get(affix.affix_id)?.source ?? null;
}

export function chooseFrontendEquipmentSource(seed: number) {
  const sourceOptions = frontendEquipmentSourceOptions();
  if (sourceOptions.length === 0) return "装备";
  const rng = seedRandom(seed);
  const buckets = frontendEquipmentSourceDropBuckets().filter((bucket) => bucket.length > 0);
  if (buckets.length === 0) return sourceOptions[Math.floor(rng.nextFloat() * sourceOptions.length) % sourceOptions.length];
  const bucket = buckets[Math.floor(rng.nextFloat() * buckets.length) % buckets.length];
  return bucket[Math.floor(rng.nextFloat() * bucket.length) % bucket.length];
}

export function frontendEquipmentSourceDropBuckets() {
  const sourceOptions = frontendEquipmentSourceOptions();
  const weaponSources = sourceOptions.filter(isWeaponEquipmentSource);
  const otherSourceBuckets = NON_WEAPON_EQUIPMENT_SOURCE_SLOT_KEYWORDS
    .map((keywords) => sourceOptions.filter((source) => !isWeaponEquipmentSource(source) && keywords.some((keyword) => source.includes(keyword))))
    .filter((bucket) => bucket.length > 0);
  const bucketedOtherSources = new Set(otherSourceBuckets.flat());
  const fallbackOtherSources = sourceOptions.filter((source) => !isWeaponEquipmentSource(source) && !bucketedOtherSources.has(source)).map((source) => [source]);
  return [weaponSources, ...otherSourceBuckets, ...fallbackOtherSources];
}

export function generateFrontendEquipment(source: string, level: number, rarity: string, seed: number): FrontendEquipmentItem {
  const rng = seedRandom(seed);
  const normalizedLevel = clampInt(level, 1, 100);
  const [minCount, maxCount] = RARITY_COUNTS[rarity] ?? RARITY_COUNTS.white;
  const rolledCount = maxCount > minCount ? rng.nextInt(minCount, maxCount) : minCount;
  const capacity = prefixSuffixCapacity(normalizedLevel);
  const targetCount = Math.min(rolledCount, capacity.prefix + capacity.suffix);
  let item: FrontendEquipmentItem = {
    source,
    level: normalizedLevel,
    rarity,
    base_affix: rollDefinition(weightedChoice(baseCandidates(source), rng), rng),
    prefix_affixes: [],
    suffix_affixes: [],
  };

  for (let index = 0; index < targetCount; index += 1) {
    const options = randomGenerationOptions(item);
    if (options.length === 0) break;
    const option = options[rng.nextInt(0, options.length - 1)];
    item = addAffixRoll(item, rollDefinition(weightedChoice(option.candidates, rng), rng));
  }
  return item;
}

export function createSpecifiedFrontendEquipment(source: string, level: number, affixIds: string[], seed: number): FrontendEquipmentItem {
  const rng = seedRandom(seed);
  const normalizedLevel = clampInt(level, 1, 100);
  const selectedBaseDefinitions: FrontendEquipmentAffixDefinition[] = [];
  const ordinaryDefinitions: FrontendEquipmentAffixDefinition[] = [];
  for (const affixId of affixIds) {
    const definition = frontendEquipmentDefinitionsById().get(affixId);
    if (!definition || !definition.enabled || definition.source !== source || definition.required_level > normalizedLevel) {
      throw new Error(`GM 装备词缀不匹配当前装备类型或等级：${affixId}`);
    }
    if (definition.library === "base") selectedBaseDefinitions.push(definition);
    else ordinaryDefinitions.push(definition);
  }
  if (selectedBaseDefinitions.length > 1) throw new Error("GM 装备只能选择 1 条基础词缀。");

  const capacity = prefixSuffixCapacity(normalizedLevel);
  const seenFamilies = new Set<string>();
  let prefixCount = 0;
  let suffixCount = 0;
  let advancedCount = 0;
  let pinnacleCount = 0;
  const selectedRolls: FrontendEquipmentAffixRoll[] = [];
  for (const definition of ordinaryDefinitions) {
    if (seenFamilies.has(definition.family_id)) throw new Error("GM 装备不能添加同族重复词缀。");
    if (definition.gen === "prefix") {
      prefixCount += 1;
      if (prefixCount > capacity.prefix) throw new Error("GM 装备前缀数量超过当前等级上限。");
    } else if (definition.gen === "suffix") {
      suffixCount += 1;
      if (suffixCount > capacity.suffix) throw new Error("GM 装备后缀数量超过当前等级上限。");
    } else {
      throw new Error("GM 装备只支持前缀/后缀。");
    }
    if (definition.library === "advanced") {
      advancedCount += 1;
      if (advancedCount > 2) throw new Error("GM 装备进阶词缀最多 2 条。");
    }
    if (definition.library === "pinnacle") {
      if (normalizedLevel < 100) throw new Error("GM 装备至臻词缀需要 100 级装备。");
      pinnacleCount += 1;
      if (pinnacleCount > 2) throw new Error("GM 装备至臻词缀最多 2 条。");
    }
    seenFamilies.add(definition.family_id);
    selectedRolls.push(rollDefinition(definition, rng));
  }

  return {
    source,
    level: normalizedLevel,
    rarity: frontendEquipmentRarityForAffixCount(selectedRolls.length),
    base_affix: rollDefinition(selectedBaseDefinitions[0] ?? weightedChoice(baseCandidates(source), rng), rng),
    prefix_affixes: selectedRolls.filter((roll) => roll.gen === "prefix"),
    suffix_affixes: selectedRolls.filter((roll) => roll.gen === "suffix"),
  };
}

export function craftFrontendEquipmentAffix(item: FrontendEquipmentItem, library: string, gen: string, seed: number): FrontendEquipmentItem {
  if (!["initial", "advanced", "pinnacle"].includes(library)) throw new Error(`不支持的装备词缀库：${library}`);
  if (!["prefix", "suffix"].includes(gen)) throw new Error(`不支持的装备词缀类型：${gen}`);
  validateCanAdd(item, library, gen);
  const candidates = affixCandidates(item.source, item.level, library, gen, item);
  if (candidates.length === 0) throw new Error("可用装备词缀候选不足。");
  return addAffixRoll(item, rollDefinition(weightedChoice(candidates, seedRandom(seed)), seedRandom(seed + 17)));
}

export function rerollFrontendEquipmentAffix(
  item: FrontendEquipmentItem,
  library: string,
  gen: string,
  index: number,
  seed: number
): FrontendEquipmentItem {
  if (!["initial", "advanced", "pinnacle"].includes(library)) throw new Error(`不支持的装备词缀库：${library}`);
  if (!["prefix", "suffix"].includes(gen)) throw new Error(`不支持的装备词缀类型：${gen}`);
  if (!Number.isInteger(index) || index < 0) throw new Error("词缀位置不正确。");

  const currentAffixes = gen === "prefix" ? item.prefix_affixes : item.suffix_affixes;
  const currentAffix = currentAffixes[index];
  if (!currentAffix) throw new Error("请先选择已有词缀的位置。");

  const itemWithoutSelectedAffix: FrontendEquipmentItem = {
    ...item,
    prefix_affixes: gen === "prefix" ? item.prefix_affixes.filter((_, affixIndex) => affixIndex !== index) : [...item.prefix_affixes],
    suffix_affixes: gen === "suffix" ? item.suffix_affixes.filter((_, affixIndex) => affixIndex !== index) : [...item.suffix_affixes],
  };
  validateCanReplace(itemWithoutSelectedAffix, library);

  const candidates = affixCandidates(item.source, item.level, library, gen, itemWithoutSelectedAffix);
  if (candidates.length === 0) throw new Error("可用装备词缀候选不足。");

  const nextAffix = rollDefinition(weightedChoice(candidates, seedRandom(seed)), seedRandom(seed + 17));
  const replaceAt = (affixes: FrontendEquipmentAffixRoll[]) => affixes.map((affix, affixIndex) => (affixIndex === index ? nextAffix : affix));
  return {
    ...item,
    rarity: frontendEquipmentRarityForAffixCount(item.prefix_affixes.length + item.suffix_affixes.length),
    prefix_affixes: gen === "prefix" ? replaceAt(item.prefix_affixes) : item.prefix_affixes,
    suffix_affixes: gen === "suffix" ? replaceAt(item.suffix_affixes) : item.suffix_affixes,
  };
}

export function frontendEquipmentAffixTexts(item: FrontendEquipmentItem) {
  return [item.base_affix, ...item.prefix_affixes, ...item.suffix_affixes].map(frontendEquipmentAffixRollText);
}

export function frontendEquipmentOrdinaryAffixTexts(item: FrontendEquipmentItem) {
  return [...item.prefix_affixes, ...item.suffix_affixes].map(frontendEquipmentAffixRollText);
}

export function frontendEquipmentStatModifiers(item: FrontendEquipmentItem): FrontendEquipmentStatModifier[] {
  const normalizedItem = normalizeFrontendEquipmentItem(item);
  const affixes = [normalizedItem.base_affix, ...normalizedItem.prefix_affixes, ...normalizedItem.suffix_affixes];
  return [
    ...localFrontendEquipmentStatModifiers(normalizedItem),
    ...affixes.flatMap((affix) =>
      affix.operations
      .filter((operation) =>
        ["player_stat", "skill_stat", "damage_stat", "runtime_hook"].includes(operation.kind)
        && (operation.stat || operation.runtime_hook)
        && !operation.stat.startsWith("local_")
      )
      .map((operation) => ({
        source_modifier_id: affix.source_modifier_id,
        kind: operation.kind,
        stat: operation.stat || operation.runtime_hook,
        value: operation.value,
        value_min: operation.value_min,
        value_max: operation.value_max,
        source_text: operation.source_text,
        reason_key: "modifier.equipment_affix",
        runtime_hook: operation.runtime_hook,
        payload: operation.payload,
      }))
    ),
  ];
}

function normalizeFrontendEquipmentItem(item: FrontendEquipmentItem): FrontendEquipmentItem {
  return {
    ...item,
    base_affix: normalizeFrontendEquipmentAffixRoll(item.base_affix),
    prefix_affixes: item.prefix_affixes.map(normalizeFrontendEquipmentAffixRoll),
    suffix_affixes: item.suffix_affixes.map(normalizeFrontendEquipmentAffixRoll),
  };
}

function normalizeFrontendEquipmentAffixRoll(affix: FrontendEquipmentAffixRoll): FrontendEquipmentAffixRoll {
  return {
    ...affix,
    operations: normalizeFrontendEquipmentEffectOperations(affix.effect, affix.operations),
  };
}

function normalizeFrontendEquipmentEffectOperations(effect: string, operations: FrontendEquipmentEffectOperation[]): FrontendEquipmentEffectOperation[] {
  const normalized: FrontendEquipmentEffectOperation[] = [];
  const seen = new Set<string>();
  for (const operation of operations) {
    let nextOperation = operation;
    if (isGlobalMaxEnergyShieldPercentOperation(effect, operation)) {
      nextOperation = { ...operation, kind: "player_stat", stat: "max_energy_shield_add_percent" };
    }
    if (nextOperation.value_min !== null || nextOperation.value_max !== null) {
      const values = rolledValuesFromRenderedSourceText(effect, nextOperation.source_text);
      if (values.length === 1) {
        nextOperation = { ...nextOperation, value: values[0], value_min: values[0], value_max: values[0] };
      } else if (values.length > 1) {
        const minimum = Math.min(...values);
        const maximum = Math.max(...values);
        nextOperation = { ...nextOperation, value: (minimum + maximum) / 2, value_min: minimum, value_max: maximum };
      }
    }
    const key = [
      nextOperation.kind,
      nextOperation.stat,
      nextOperation.runtime_hook,
      nextOperation.source_text,
      nextOperation.value,
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(nextOperation);
  }
  return normalized;
}

function isGlobalMaxEnergyShieldPercentOperation(effect: string, operation: FrontendEquipmentEffectOperation) {
  const text = operation.source_text || effect;
  return text.includes("%")
    && text.includes("\u6700\u5927\u62a4\u76fe")
    && !text.includes("\u8be5\u88c5\u5907\u62a4\u76fe")
    && (operation.stat === "max_energy_shield" || operation.stat === "damage_final_percent");
}

type FrontendMutableStatMap = Record<string, { value?: unknown; trace?: Record<string, number>; [key: string]: unknown }>;

export function applyFrontendEquipmentStatModifiers<T extends FrontendMutableStatMap>(
  baseStats: T,
  modifiers: FrontendEquipmentStatModifier[]
): T {
  const next = JSON.parse(JSON.stringify(baseStats)) as FrontendMutableStatMap;
  let moveSpeedAddPercent = 0;
  let strengthAdd = 0;
  let dexterityAdd = 0;
  let intelligenceAdd = 0;
  for (const modifier of modifiers) {
    if (modifier.kind !== "player_stat") continue;
    if (modifier.stat === "move_speed") {
      moveSpeedAddPercent += modifier.value;
      continue;
    }
    const traceKey = modifier.reason_key === "modifier.passive_self_stat" ? "passive" : "equipment";
    const current = next[modifier.stat] ?? { label_text: modifier.stat, value: 0, trace: {} };
    const numericValue = typeof current.value === "number" ? current.value : 0;
    next[modifier.stat] = {
      ...current,
      value: numericValue + modifier.value,
      trace: {
        ...(current.trace ?? {}),
        [traceKey]: Number((current.trace?.[traceKey] ?? 0) + modifier.value),
      },
    };
    if (modifier.stat === "strength") strengthAdd += modifier.value;
    if (modifier.stat === "dexterity") dexterityAdd += modifier.value;
    if (modifier.stat === "intelligence") intelligenceAdd += modifier.value;
  }
  addFrontendDerivedStat(next, "max_life", strengthAdd * 0.5);
  addFrontendDerivedStat(next, "melee_damage_add_percent", strengthAdd * 0.2);
  addFrontendDerivedStat(next, "attack_speed_add_percent", dexterityAdd * 0.2);
  addFrontendDerivedStat(next, "cast_speed_add_percent", dexterityAdd * 0.2);
  addFrontendDerivedStat(next, "evasion_add_percent", dexterityAdd * 0.2);
  addFrontendDerivedStat(next, "max_mana", intelligenceAdd * 0.5);
  const energyShieldAddPercent = frontendStatValue(next.max_energy_shield_add_percent);
  if (energyShieldAddPercent) {
    addFrontendDerivedStat(next, "max_energy_shield", frontendStatValue(next.max_energy_shield) * energyShieldAddPercent / 100);
  }
  if (intelligenceAdd) {
    addFrontendDerivedStat(next, "max_energy_shield", frontendStatValue(next.max_energy_shield) * intelligenceAdd * 0.002);
  }
  if (moveSpeedAddPercent !== 0) {
    const current = next.move_speed ?? { label_text: "move_speed", value: FRONTEND_BASE_MOVE_SPEED, trace: {} };
    const baseValue = typeof current.value === "number" ? current.value : FRONTEND_BASE_MOVE_SPEED;
    next.move_speed = {
      ...current,
      value: baseValue * (1 + moveSpeedAddPercent / 100),
      trace: {
        ...(current.trace ?? {}),
        equipment: Number((current.trace?.equipment ?? 0) + moveSpeedAddPercent),
      },
    };
  }
  return next as T;
}

function localFrontendEquipmentStatModifiers(item: FrontendEquipmentItem): FrontendEquipmentStatModifier[] {
  const baseOperations = item.base_affix.operations;
  const basePhysicalDamage = baseOperations
    .filter((operation) => ["added_physical_damage", "local_added_physical_damage"].includes(operation.stat))
    .reduce((total, operation) => total + operation.value, 0);
  const baseArmor = baseOperations.filter((operation) => operation.stat === "local_armor").reduce((total, operation) => total + operation.value, 0);
  const baseEvasion = baseOperations.filter((operation) => operation.stat === "local_evasion").reduce((total, operation) => total + operation.value, 0);
  const baseEnergyShield = baseOperations.filter((operation) => operation.stat === "local_energy_shield").reduce((total, operation) => total + operation.value, 0);
  let localArmor = 0;
  let localEvasion = 0;
  let localEnergyShield = 0;
  let localPhysicalPercent = 0;
  let localAddedPhysical = 0;
  let localEnergyShieldPercent = 0;
  const localAddedDamage: Record<string, { value: number; value_min: number | null; value_max: number | null }> = {};
  for (const operation of baseOperations) {
    addLocalDamageOperation(operation, localAddedDamage, false);
  }
  for (const operation of [...item.prefix_affixes, ...item.suffix_affixes].flatMap((affix) => affix.operations)) {
    if (operation.stat === "local_armor") localArmor += operation.value;
    else if (operation.stat === "local_evasion") localEvasion += operation.value;
    else if (operation.stat === "local_energy_shield") localEnergyShield += operation.value;
    else if (operation.stat === "local_physical_damage_add_percent") localPhysicalPercent += operation.value;
    else if (operation.stat === "local_energy_shield_add_percent") localEnergyShieldPercent += operation.value;
    else if (operation.stat === "local_added_physical_damage") localAddedPhysical += operation.value;
    else addLocalDamageOperation(operation, localAddedDamage, true);
  }
  const modifiers: FrontendEquipmentStatModifier[] = [];
  const weaponDamage = basePhysicalDamage * (1 + localPhysicalPercent / 100) + localAddedPhysical;
  if (weaponDamage > 0) modifiers.push(frontendEquipmentModifier(item.base_affix.source_modifier_id, "damage_stat", "weapon_attack_base_damage", weaponDamage));
  const armor = baseArmor + localArmor;
  const evasion = baseEvasion + localEvasion;
  const energyShield = (baseEnergyShield + localEnergyShield) * (1 + localEnergyShieldPercent / 100);
  if (armor > 0) modifiers.push(frontendEquipmentModifier(item.base_affix.source_modifier_id, "player_stat", "armor", armor));
  if (evasion > 0) modifiers.push(frontendEquipmentModifier(item.base_affix.source_modifier_id, "player_stat", "evasion", evasion));
  if (energyShield > 0) modifiers.push(frontendEquipmentModifier(item.base_affix.source_modifier_id, "player_stat", "max_energy_shield", energyShield));
  for (const [damageType, roll] of Object.entries(localAddedDamage)) {
    if (roll.value > 0) {
      modifiers.push(frontendEquipmentModifier(
        item.base_affix.source_modifier_id,
        "damage_stat",
        `added_${damageType}_damage`,
        roll.value,
        roll.value_min,
        roll.value_max,
      ));
    }
  }
  return modifiers;
}

function addLocalDamageOperation(
  operation: FrontendEquipmentEffectOperation,
  localAddedDamage: Record<string, { value: number; value_min: number | null; value_max: number | null }>,
  includePhysical: boolean
) {
  if (!operation.stat.startsWith("local_added_") || !operation.stat.endsWith("_damage")) return;
  const damageType = operation.stat.replace(/^local_added_/, "").replace(/_damage$/, "");
  if (!includePhysical && damageType === "physical") return;
  const current = localAddedDamage[damageType] ?? { value: 0, value_min: 0, value_max: 0 };
  localAddedDamage[damageType] = {
    value: current.value + operation.value,
    value_min: frontendNullableSum(current.value_min, operation.value_min ?? operation.value),
    value_max: frontendNullableSum(current.value_max, operation.value_max ?? operation.value),
  };
}

function frontendNullableSum(left: number | null, right: number | null) {
  if (left === null && right === null) return null;
  return Number(left ?? 0) + Number(right ?? 0);
}

function frontendEquipmentModifier(
  sourceModifierId: string,
  kind: string,
  stat: string,
  value: number,
  valueMin: number | null = null,
  valueMax: number | null = null,
  sourceText = ""
): FrontendEquipmentStatModifier {
  return {
    source_modifier_id: sourceModifierId,
    kind,
    stat,
    value,
    value_min: valueMin,
    value_max: valueMax,
    source_text: sourceText,
    reason_key: "modifier.equipment_affix",
  };
}

function addFrontendDerivedStat(
  stats: FrontendMutableStatMap,
  stat: string,
  value: number
) {
  if (!value) return;
  const current = stats[stat] ?? { label_text: stat, value: 0, trace: {} };
  stats[stat] = {
    ...current,
    value: frontendStatValue(current) + value,
    trace: {
      ...(current.trace ?? {}),
      primary_attribute: Number((current.trace?.primary_attribute ?? 0) + value),
    },
  };
}

function frontendStatValue(stat: { value?: unknown } | undefined) {
  return typeof stat?.value === "number" ? stat.value : 0;
}

function randomGenerationOptions(item: FrontendEquipmentItem) {
  const capacity = prefixSuffixCapacity(item.level);
  const options: { library: string; gen: string; candidates: FrontendEquipmentAffixDefinition[] }[] = [];
  for (const gen of ["prefix", "suffix"]) {
    if (gen === "prefix" && item.prefix_affixes.length >= capacity.prefix) continue;
    if (gen === "suffix" && item.suffix_affixes.length >= capacity.suffix) continue;
    for (const library of ["initial", "advanced"]) {
      if (library === "advanced" && countLibrary(item, "advanced") >= 2) continue;
      const candidates = affixCandidates(item.source, item.level, library, gen, item);
      if (candidates.length > 0) options.push({ library, gen, candidates });
    }
  }
  return options;
}

function affixCandidates(source: string, level: number, library: string, gen: string, existingItem?: FrontendEquipmentItem) {
  const usedFamilies = new Set(existingItem ? [...existingItem.prefix_affixes, ...existingItem.suffix_affixes].map((affix) => affix.family_id) : []);
  return frontendEquipmentDefinitions().filter((definition) =>
    definition.source === source
    && definition.library === library
    && definition.gen === gen
    && definition.enabled
    && definition.required_level <= level
    && !usedFamilies.has(definition.family_id)
  );
}

function baseCandidates(source: string) {
  const candidates = frontendEquipmentDefinitions().filter((definition) => definition.source === source && definition.library === "base" && definition.enabled);
  if (candidates.length === 0) throw new Error(`装备基础词缀池不存在：${source}`);
  return candidates;
}

function validateCanAdd(item: FrontendEquipmentItem, library: string, gen: string) {
  const capacity = prefixSuffixCapacity(item.level);
  if (gen === "prefix" && item.prefix_affixes.length >= capacity.prefix) throw new Error("装备前缀已满。");
  if (gen === "suffix" && item.suffix_affixes.length >= capacity.suffix) throw new Error("装备后缀已满。");
  if (library === "advanced" && countLibrary(item, "advanced") >= 2) throw new Error("装备进阶词缀已达上限。");
  if (library === "pinnacle") {
    if (item.level < 100) throw new Error("只有 100 级装备才能打造至臻词缀。");
    if (countLibrary(item, "pinnacle") >= 2) throw new Error("装备至臻词缀已达上限。");
  }
}

function validateCanReplace(itemWithoutSelectedAffix: FrontendEquipmentItem, library: string) {
  if (library === "advanced" && countLibrary(itemWithoutSelectedAffix, "advanced") >= 2) throw new Error("装备进阶词缀已达上限。");
  if (library === "pinnacle") {
    if (itemWithoutSelectedAffix.level < 100) throw new Error("只有 100 级装备才能打造至臻词缀。");
    if (countLibrary(itemWithoutSelectedAffix, "pinnacle") >= 2) throw new Error("装备至臻词缀已达上限。");
  }
}

function addAffixRoll(item: FrontendEquipmentItem, roll: FrontendEquipmentAffixRoll): FrontendEquipmentItem {
  if (roll.gen === "prefix") return { ...item, prefix_affixes: [...item.prefix_affixes, roll] };
  if (roll.gen === "suffix") return { ...item, suffix_affixes: [...item.suffix_affixes, roll] };
  throw new Error(`不支持的装备词缀类型：${roll.gen}`);
}

function countLibrary(item: FrontendEquipmentItem, library: string) {
  return [...item.prefix_affixes, ...item.suffix_affixes].filter((affix) => affix.library === library).length;
}

function weightedChoice(candidates: FrontendEquipmentAffixDefinition[], rng: FrontendSeedRandom) {
  const total = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  let pick = rng.nextFloat() * total;
  for (const candidate of candidates) {
    pick -= candidate.weight;
    if (pick <= 0) return candidate;
  }
  return candidates[candidates.length - 1];
}

function rollDefinition(definition: FrontendEquipmentAffixDefinition, rng: FrontendSeedRandom): FrontendEquipmentAffixRoll {
  const rolledEffect = rollEffect(definition.effect, rng);
  return {
    affix_id: definition.affix_id,
    source_modifier_id: definition.source_modifier_id,
    library: definition.library,
    gen: definition.gen,
    tier: definition.tier,
    effect: rolledEffect.text,
    family_id: definition.family_id,
    operations: rollEffectOperations(definition.effect, definition.operations ?? [], rolledEffect.ranges),
  };
}

type RolledEffectRange = {
  index: number;
  value: number;
};

const EFFECT_RANGE_PATTERN = /\((-?\d+(?:\.\d+)?)\s*[\u2013\u2014-]\s*(-?\d+(?:\.\d+)?)\)|(?<![\d.])(-?\d+(?:\.\d+)?)\s*[\u2013\u2014-]\s*(-?\d+(?:\.\d+)?)(?![\d.])/g;

function rollEffect(effect: string, rng: FrontendSeedRandom) {
  const ranges: RolledEffectRange[] = [];
  const text = effect.replace(
    EFFECT_RANGE_PATTERN,
    (match, groupMin, groupMax, plainMin, plainMax, offset) => {
      const rolled = rollRangeNumberText(groupMin ?? plainMin, groupMax ?? plainMax, rng);
      ranges.push({ index: Number(offset), value: rolled.value });
      return rolled.text;
    }
  );
  return { text, ranges };
}

function rollEffectOperations(
  effect: string,
  operations: FrontendEquipmentEffectOperation[],
  ranges: RolledEffectRange[]
): FrontendEquipmentEffectOperation[] {
  if (ranges.length === 0) return operations;
  return operations.map((operation) => {
    if (operation.value_min === null && operation.value_max === null) return operation;
    const values = rolledValuesForSourceText(effect, ranges, operation.source_text);
    if (values.length === 0) return operation;
    if (values.length === 1) {
      return {
        ...operation,
        value: values[0],
        value_min: values[0],
        value_max: values[0],
      };
    }
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    return {
      ...operation,
      value: (minimum + maximum) / 2,
      value_min: minimum,
      value_max: maximum,
    };
  });
}

function rolledValuesForSourceText(effect: string, ranges: RolledEffectRange[], sourceText: string) {
  const sourceIndex = sourceText ? effect.indexOf(sourceText) : -1;
  if (sourceIndex < 0) return ranges.map((range) => range.value);
  const sourceEnd = sourceIndex + sourceText.length;
  return ranges
    .filter((range) => range.index >= sourceIndex && range.index < sourceEnd)
    .map((range) => range.value);
}

function rolledValuesFromRenderedSourceText(effect: string, sourceText: string) {
  EFFECT_RANGE_PATTERN.lastIndex = 0;
  const hasRange = Boolean(sourceText) && EFFECT_RANGE_PATTERN.test(sourceText);
  EFFECT_RANGE_PATTERN.lastIndex = 0;
  if (!hasRange) return [];
  EFFECT_RANGE_PATTERN.lastIndex = 0;
  const pattern = renderedSourceTextPattern(sourceText);
  const match = pattern.exec(effect);
  if (!match) return [];
  return match.slice(1).map(Number).filter(Number.isFinite);
}

function renderedSourceTextPattern(sourceText: string) {
  let cursor = 0;
  let pattern = "";
  EFFECT_RANGE_PATTERN.lastIndex = 0;
  for (const match of sourceText.matchAll(EFFECT_RANGE_PATTERN)) {
    pattern += escapeRegExp(sourceText.slice(cursor, match.index));
    pattern += "\\(?(-?\\d+(?:\\.\\d+)?)\\)?";
    cursor = Number(match.index) + match[0].length;
  }
  pattern += escapeRegExp(sourceText.slice(cursor));
  return new RegExp(pattern);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");
}

function rollRangeNumberText(minimumText: string, maximumText: string, rng: FrontendSeedRandom) {
  let minimum = Number(minimumText);
  let maximum = Number(maximumText);
  if (minimum > maximum) [minimum, maximum] = [maximum, minimum];
  const decimalPlaces = Math.max(countDecimalPlaces(minimumText), countDecimalPlaces(maximumText));
  const value = decimalPlaces === 0 ? rng.nextInt(Math.round(minimum), Math.round(maximum)) : minimum + rng.nextFloat() * (maximum - minimum);
  return {
    text: decimalPlaces === 0 ? String(Math.round(value)) : value.toFixed(decimalPlaces),
    value: decimalPlaces === 0 ? Math.round(value) : Number(value.toFixed(decimalPlaces)),
  };
}

function countDecimalPlaces(value: string) {
  return value.includes(".") ? value.split(".")[1].length : 0;
}

function frontendEquipmentAffixDefinitionText(definition: FrontendEquipmentAffixDefinition) {
  if (definition.library === "base") return `基础 T${definition.tier}：${definition.effect}`;
  return `${libraryText(definition.library)}${genText(definition.gen)} T${definition.tier}：${definition.effect}`;
}

function frontendEquipmentAffixRollText(affix: FrontendEquipmentAffixRoll) {
  if (affix.library === "base") return affix.effect;
  return `${libraryText(affix.library)}${genText(affix.gen)} T${affix.tier}：${affix.effect}`;
}

function isWeaponEquipmentSource(source: string) {
  return WEAPON_EQUIPMENT_SOURCE_KEYWORDS.some((keyword) => source.includes(keyword));
}

function libraryText(library: string) {
  return ({ initial: "初阶", advanced: "进阶", pinnacle: "至臻", base: "基础" } as Record<string, string>)[library] ?? library;
}

function genText(gen: string) {
  return ({ prefix: "前缀", suffix: "后缀", base: "" } as Record<string, string>)[gen] ?? gen;
}

function clampInt(value: number, minimum: number, maximum: number) {
  if (!Number.isFinite(value)) return minimum;
  return Math.max(minimum, Math.min(maximum, Math.round(value)));
}

type FrontendSeedRandom = ReturnType<typeof seedRandom>;

function seedRandom(seed: number) {
  let state = (Math.floor(seed) >>> 0) || 0x9e3779b9;
  return {
    nextFloat() {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    },
    nextInt(minimum: number, maximum: number) {
      return Math.floor(this.nextFloat() * (maximum - minimum + 1)) + minimum;
    },
  };
}
