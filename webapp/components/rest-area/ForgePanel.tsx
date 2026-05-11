import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { frontendEquipmentAffixOptions, frontendEquipmentSourceForAffixRoll } from "../../frontendEquipmentRuntime";
import { equipmentSourceSlotId } from "../inventory/equipmentRules";

type ForgeAffix = {
  affix_id: string;
  effect: string;
  tier: number;
  family_id?: string;
  gen?: string;
};

type ForgeItem = {
  instance_id: string;
  name_text: string;
  category_text: string;
  level?: number;
  gem_type?: { id?: string; display_text?: string; identity_text?: string };
  equipment_slot_id?: string;
  equipment_affixes?: ForgeAffix[];
};

const FORGE_PREFIX_CAPACITY = 3;
const FORGE_SUFFIX_CAPACITY = 3;
const FORGE_LIBRARIES = [
  { id: "initial", label: "初阶词缀" },
  { id: "advanced", label: "进阶词缀" },
  { id: "pinnacle", label: "至臻词缀" }
] as const;
type ForgeLibrary = typeof FORGE_LIBRARIES[number]["id"];

export function ForgePanel<TItem extends ForgeItem>({
  item,
  selectedAffixSlots,
  renderItem,
  onToggleAffixSlot,
  onCraftAffix
}: {
  item: TItem | null;
  selectedAffixSlots: Set<string>;
  renderItem: (item: TItem) => ReactNode;
  onToggleAffixSlot: (slotId: string) => void;
  onCraftAffix: (slotId: string, library: ForgeLibrary) => void;
}) {
  const [selectedLibrary, setSelectedLibrary] = useState<ForgeLibrary>("initial");
  const affixGroups = item ? forgeAffixGroups(item) : null;
  const hasSelectedAffix = selectedAffixSlots.size > 0;
  const selectedSlotId = Array.from(selectedAffixSlots)[0] ?? "";

  return (
    <section className={`forge-panel${item ? " has-item" : ""}`} aria-label="锻造台">
      {!item ? (
        <>
          <div className="forge-empty-panel">
            <p>重新随机装备上的词缀</p>
            <div className="forge-empty-sigil" data-forge-drop-target="true" aria-label="放入装备">
              <span>...</span>
            </div>
          </div>
          <div className="forge-black-board" aria-hidden="true" />
        </>
      ) : (
        <>
          <div className="forge-item-card">
            <div className="forge-item-header">
              <div className="forge-item-icon">{renderItem(item)}</div>
              <div>
                <h2>{item.name_text}</h2>
                <p>物品等级:{forgeItemLevelText(item)}</p>
                <p>部位: {forgeItemSlotText(item)}</p>
              </div>
            </div>
            <ForgeAffixList
              title={`前缀 (${affixGroups.prefix.filled.length}/${FORGE_PREFIX_CAPACITY})`}
              slots={affixGroups.prefix.slots}
              selectedAffixSlots={selectedAffixSlots}
              onToggleAffixSlot={onToggleAffixSlot}
            />
            <ForgeAffixList
              title={`后缀 (${affixGroups.suffix.filled.length}/${FORGE_SUFFIX_CAPACITY})`}
              slots={affixGroups.suffix.slots}
              selectedAffixSlots={selectedAffixSlots}
              onToggleAffixSlot={onToggleAffixSlot}
            />
            <button className="forge-affix-list-button" type="button">词缀列表</button>
          </div>

          <div className="forge-craft-board">
            <div className="forge-tier-tabs" aria-label="词缀等级">
              {FORGE_LIBRARIES.map((library) => (
                <button
                  key={library.id}
                  className={selectedLibrary === library.id ? "active" : ""}
                  type="button"
                  onClick={() => setSelectedLibrary(library.id)}
                >
                  {library.label}
                </button>
              ))}
            </div>
            {!hasSelectedAffix ? (
              <div className="forge-select-hint">请选中要打造的词缀位置</div>
            ) : (
              <ForgeCraftOptions item={item} selectedSlotId={selectedSlotId} selectedLibrary={selectedLibrary} onCraftAffix={onCraftAffix} />
            )}
          </div>
        </>
      )}
    </section>
  );
}

function ForgeAffixList({
  title,
  slots,
  selectedAffixSlots,
  onToggleAffixSlot
}: {
  title: string;
  slots: ForgeAffixSlot[];
  selectedAffixSlots: Set<string>;
  onToggleAffixSlot: (slotId: string) => void;
}) {
  return (
    <section className="forge-affix-section">
      <h3>{title}</h3>
      <div className="forge-affix-slots">
        {slots.map((slot) => (
          <button
            key={slot.id}
            className={`forge-affix-row${selectedAffixSlots.has(slot.id) ? " selected" : ""}${slot.empty ? " empty" : ""}`}
            type="button"
            aria-pressed={selectedAffixSlots.has(slot.id)}
            onClick={() => onToggleAffixSlot(slot.id)}
          >
            <span className="forge-tier-badge">{slot.tierText}</span>
            <span className="forge-affix-text">{slot.text}</span>
            <span className="forge-affix-check" aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}

function ForgeCraftOptions({ item, selectedSlotId, selectedLibrary, onCraftAffix }: {
  item: ForgeItem;
  selectedSlotId: string;
  selectedLibrary: ForgeLibrary;
  onCraftAffix: (slotId: string, library: ForgeLibrary) => void;
}) {
  const [autoCraftEnabled, setAutoCraftEnabled] = useState(false);
  const [autoCrafting, setAutoCrafting] = useState(false);
  const [targetTiers, setTargetTiers] = useState<Record<string, number>>({});
  const selectedGen = forgeSelectedSlotGen(selectedSlotId);
  const options = useMemo(
    () => forgeCraftOptions(item, selectedLibrary, selectedGen),
    [item, selectedGen, selectedLibrary]
  );
  const canCraft = options.some((option) => !option.disabled);
  const selectedAffix = forgeSelectedAffix(item, selectedSlotId);
  const hasAutoTarget = options.some((option) => targetTiers[option.familyId] && !option.disabled);
  const targetMatched = Boolean(
    selectedAffix?.family_id
    && selectedAffix.tier > 0
    && targetTiers[selectedAffix.family_id]
    && selectedAffix.tier <= targetTiers[selectedAffix.family_id]
  );
  const canStartAutoCraft = canCraft && hasAutoTarget && !targetMatched;

  useEffect(() => {
    setAutoCrafting(false);
  }, [selectedLibrary, selectedSlotId]);

  useEffect(() => {
    if (!autoCrafting) return;
    if (!autoCraftEnabled || targetMatched || !canStartAutoCraft) {
      setAutoCrafting(false);
      return;
    }
    const timerId = window.setInterval(() => {
      onCraftAffix(selectedSlotId, selectedLibrary);
    }, 1500);
    return () => window.clearInterval(timerId);
  }, [autoCraftEnabled, autoCrafting, canStartAutoCraft, onCraftAffix, selectedLibrary, selectedSlotId, targetMatched]);

  function setTargetTier(familyId: string, value: string) {
    setTargetTiers((current) => {
      const next = { ...current };
      if (!value) delete next[familyId];
      else next[familyId] = Number(value);
      return next;
    });
  }

  function handleCraftClick() {
    if (!autoCraftEnabled) {
      onCraftAffix(selectedSlotId, selectedLibrary);
      return;
    }
    setAutoCrafting((current) => !current);
  }

  function handleAutoCraftEnabled(checked: boolean) {
    setAutoCraftEnabled(checked);
    if (!checked) setAutoCrafting(false);
  }

  const craftButtonText = autoCraftEnabled ? (autoCrafting ? "停止自动打造" : "开始自动打造") : "打造";
  const craftButtonDisabled = autoCraftEnabled ? !canStartAutoCraft && !autoCrafting : !canCraft;
  return (
    <div className="forge-craft-options">
      <p className="forge-craft-description">用1条随机词缀替换该位置的上的词缀</p>
      <div className="forge-craft-heading">
        <span>可能出现的词缀</span>
        <span>{autoCraftEnabled ? "目标T级" : "最高T级"}</span>
      </div>
      <div className="forge-craft-list">
        {options.map((option) => (
          <div key={option.familyId} className={`forge-craft-row${option.disabled ? " disabled" : ""}`}>
            <span className="forge-info-icon">i</span>
            <span>
              {option.effect}
              {option.disabled && <b>（已有同类型词缀）</b>}
            </span>
            {autoCraftEnabled ? (
              <select
                className="forge-target-tier-select"
                value={targetTiers[option.familyId] ?? ""}
                disabled={option.disabled}
                aria-label={`${option.effect} 目标T级`}
                onChange={(event) => setTargetTier(option.familyId, event.currentTarget.value)}
              >
                <option value="">无</option>
                {forgeTargetTierOptions(option.tier).map((tier) => (
                  <option key={tier} value={tier}>T{tier}</option>
                ))}
              </select>
            ) : (
              <span className="forge-tier-outline">T{option.tier}</span>
            )}
          </div>
        ))}
        {options.length === 0 && <div className="forge-craft-empty">当前装备等级、部位和词缀位置无可用词缀</div>}
      </div>
      <div className="forge-cost-box">
        <h3>消耗</h3>
        <div className="forge-cost-empty" aria-label="消耗物品栏暂空" />
      </div>
      <div className="forge-action-row">
        <label className="forge-auto-toggle">
          <input
            type="checkbox"
            checked={autoCraftEnabled}
            onChange={(event) => handleAutoCraftEnabled(event.currentTarget.checked)}
          />
          <span />
          自动打造
        </label>
        <strong>成功率：<b>100.00%</b></strong>
      </div>
      <button
        className="forge-craft-button"
        type="button"
        disabled={craftButtonDisabled}
        onClick={handleCraftClick}
      >
        {craftButtonText}
      </button>
    </div>
  );
}

type ForgeAffixSlot = {
  id: string;
  text: string;
  tierText: string;
  empty: boolean;
};

type ForgeCraftOption = {
  familyId: string;
  effect: string;
  tier: number;
  disabled: boolean;
};

function forgeAffixGroups(item: ForgeItem) {
  const affixes = item.equipment_affixes ?? [];
  const prefix = affixes.filter((affix) => affix.gen === "prefix");
  const suffix = affixes.filter((affix) => affix.gen === "suffix");
  const fallback = affixes.filter((affix) => affix.gen !== "prefix" && affix.gen !== "suffix");
  const prefixFilled = prefix.length > 0 ? prefix : fallback.slice(0, FORGE_PREFIX_CAPACITY);
  const suffixFilled = suffix.length > 0 ? suffix : fallback.slice(FORGE_PREFIX_CAPACITY, FORGE_PREFIX_CAPACITY + FORGE_SUFFIX_CAPACITY);
  return {
    prefix: { filled: prefixFilled, slots: forgeSlots("prefix", prefixFilled, FORGE_PREFIX_CAPACITY) },
    suffix: { filled: suffixFilled, slots: forgeSlots("suffix", suffixFilled, FORGE_SUFFIX_CAPACITY) }
  };
}

function forgeSlots(kind: "prefix" | "suffix", affixes: ForgeAffix[], capacity: number): ForgeAffixSlot[] {
  return Array.from({ length: capacity }, (_, index) => {
    const affix = affixes[index];
    return {
      id: `${kind}-${index}`,
      text: affix?.effect ?? "空词缀",
      tierText: affix ? `T${affix.tier}` : "-",
      empty: !affix
    };
  });
}

function forgeItemSlotText(item: ForgeItem) {
  const source = forgeEquipmentSource(item);
  if (source.includes("头部")) return "头部";
  if (source.includes("胸甲")) return "胸甲";
  if (source.includes("手套")) return "手套";
  if (source.includes("鞋子")) return "鞋子";
  if (source.includes("腰带")) return "腰带";
  if (source.includes("项链")) return "项链";
  if (source.includes("戒指") || source.includes("灵戒")) return "戒指";
  if (source.includes("盾牌")) return "盾牌";
  const slotId = equipmentSourceSlotId(item);
  return ({
    head: "头部",
    chest: "胸甲",
    gloves: "手套",
    boots: "鞋子",
    belt: "腰带",
    amulet: "项链",
    ring: "戒指",
    ring_1: "戒指",
    ring_2: "戒指",
    weapon: "武器",
    main_weapon: "武器",
    off_weapon: "武器"
  } as Record<string, string>)[slotId] ?? item.category_text;
}

function forgeItemLevelText(item: ForgeItem) {
  const level = Math.floor(Number(item.level));
  return Number.isFinite(level) && level > 0 ? String(level) : "-";
}

function forgeSelectedSlotGen(slotId: string) {
  return slotId.startsWith("suffix-") ? "suffix" : "prefix";
}

function forgeSelectedAffix(item: ForgeItem, slotId: string) {
  const match = /^(prefix|suffix)-(\d+)$/.exec(slotId);
  if (!match) return null;
  const [, kind, indexText] = match;
  const index = Number(indexText);
  const affixGroups = forgeAffixGroups(item);
  return kind === "suffix" ? affixGroups.suffix.filled[index] ?? null : affixGroups.prefix.filled[index] ?? null;
}

function forgeTargetTierOptions(highestTier: number) {
  const normalizedTier = Math.max(1, Math.floor(Number(highestTier)));
  return Array.from({ length: normalizedTier }, (_, index) => index + 1);
}

function forgeCraftOptions(item: ForgeItem, library: ForgeLibrary, gen: string): ForgeCraftOption[] {
  const source = forgeEquipmentSource(item);
  const level = Math.max(1, Math.floor(Number(item.level ?? 1)));
  const existingFamilyIds = new Set((item.equipment_affixes ?? []).map((affix) => affix.family_id).filter(Boolean));
  const byFamily = new Map<string, ForgeCraftOption>();
  let affixOptions: ReturnType<typeof frontendEquipmentAffixOptions> = [];
  try {
    affixOptions = frontendEquipmentAffixOptions(source, level);
  } catch {
    return [];
  }
  for (const option of affixOptions) {
    if (option.library !== library || option.gen !== gen) continue;
    const current = byFamily.get(option.family_id);
    if (current && current.tier <= option.tier) continue;
    byFamily.set(option.family_id, {
      familyId: option.family_id,
      effect: option.effect_text,
      tier: option.tier,
      disabled: existingFamilyIds.has(option.family_id)
    });
  }
  return Array.from(byFamily.values());
}

function forgeEquipmentSource(item: ForgeItem) {
  for (const affix of item.equipment_affixes ?? []) {
    const source = frontendEquipmentSourceForAffixRoll(affix);
    if (source) return source;
  }
  const nameSource = item.name_text.replace(/^Lv\d+\s+/, "");
  return item.gem_type?.identity_text || item.gem_type?.display_text || nameSource || item.category_text;
}
