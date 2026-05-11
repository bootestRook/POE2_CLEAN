import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { frontendEquipmentAffixOptions, frontendEquipmentSourceForAffixRoll, preloadFrontendEquipmentData } from "../../frontendEquipmentRuntime";
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
  onCraftAffix: (slotId: string, library: ForgeLibrary) => boolean;
}) {
  const [selectedLibrary, setSelectedLibrary] = useState<ForgeLibrary>("initial");
  const [autoCrafting, setAutoCrafting] = useState(false);
  const [equipmentDataReady, setEquipmentDataReady] = useState(false);
  const affixGroups = item ? forgeAffixGroups(item) : null;
  const hasSelectedAffix = selectedAffixSlots.size > 0;
  const selectedSlotId = Array.from(selectedAffixSlots)[0] ?? "";

  useEffect(() => {
    let cancelled = false;
    preloadFrontendEquipmentData()
      .then(() => {
        if (!cancelled) setEquipmentDataReady(true);
      })
      .catch(() => {
        if (!cancelled) setEquipmentDataReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!item) setAutoCrafting(false);
  }, [item]);

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
              selectionLocked={autoCrafting}
              onToggleAffixSlot={onToggleAffixSlot}
            />
            <ForgeAffixList
              title={`后缀 (${affixGroups.suffix.filled.length}/${FORGE_SUFFIX_CAPACITY})`}
              slots={affixGroups.suffix.slots}
              selectedAffixSlots={selectedAffixSlots}
              selectionLocked={autoCrafting}
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
              <ForgeCraftOptions
                item={item}
                selectedSlotId={selectedSlotId}
                selectedLibrary={selectedLibrary}
                equipmentDataReady={equipmentDataReady}
                autoCrafting={autoCrafting}
                setAutoCrafting={setAutoCrafting}
                onCraftAffix={onCraftAffix}
              />
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
  selectionLocked,
  onToggleAffixSlot
}: {
  title: string;
  slots: ForgeAffixSlot[];
  selectedAffixSlots: Set<string>;
  selectionLocked: boolean;
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
            disabled={selectionLocked}
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

function ForgeCraftOptions({ item, selectedSlotId, selectedLibrary, equipmentDataReady, autoCrafting, setAutoCrafting, onCraftAffix }: {
  item: ForgeItem;
  selectedSlotId: string;
  selectedLibrary: ForgeLibrary;
  equipmentDataReady: boolean;
  autoCrafting: boolean;
  setAutoCrafting: Dispatch<SetStateAction<boolean>>;
  onCraftAffix: (slotId: string, library: ForgeLibrary) => boolean;
}) {
  const [autoCraftEnabled, setAutoCraftEnabled] = useState(false);
  const [targetTiers, setTargetTiers] = useState<Record<string, number>>({});
  const [openTargetFamilyId, setOpenTargetFamilyId] = useState<string | null>(null);
  const onCraftAffixRef = useRef(onCraftAffix);
  const selectedGen = forgeSelectedSlotGen(selectedSlotId);
  const options = useMemo(
    () => equipmentDataReady ? forgeCraftOptions(item, selectedLibrary, selectedGen, selectedSlotId) : [],
    [equipmentDataReady, item, selectedGen, selectedLibrary, selectedSlotId]
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
    onCraftAffixRef.current = onCraftAffix;
  }, [onCraftAffix]);

  useEffect(() => {
    setAutoCrafting(false);
    setOpenTargetFamilyId(null);
  }, [selectedLibrary, selectedSlotId]);

  useEffect(() => {
    if (autoCrafting) setOpenTargetFamilyId(null);
  }, [autoCrafting]);

  useEffect(() => {
    if (!autoCrafting) return;
    if (!autoCraftEnabled || targetMatched || !canStartAutoCraft) {
      setAutoCrafting(false);
      return;
    }
    const timerId = window.setInterval(() => {
      const crafted = onCraftAffixRef.current(selectedSlotId, selectedLibrary);
      if (!crafted) setAutoCrafting(false);
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [autoCraftEnabled, autoCrafting, canStartAutoCraft, selectedLibrary, selectedSlotId, targetMatched]);

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
    if (autoCrafting) {
      setAutoCrafting(false);
      return;
    }
    const crafted = onCraftAffix(selectedSlotId, selectedLibrary);
    if (crafted) setAutoCrafting(true);
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
      <div className={`forge-craft-list${openTargetFamilyId ? " has-open-target-tier" : ""}`}>
        {options.map((option) => (
          <div key={option.familyId} className={`forge-craft-row${option.disabled ? " disabled" : ""}`}>
            <span className="forge-info-icon">i</span>
            <span>
              {option.effect}
              {option.disabled && <b>（已有同类型词缀）</b>}
            </span>
            {autoCraftEnabled ? (
              <TargetTierDropdown
                effect={option.effect}
                familyId={option.familyId}
                tiers={option.targetTiers}
                value={targetTiers[option.familyId] ?? ""}
                disabled={option.disabled || autoCrafting}
                open={openTargetFamilyId === option.familyId}
                onOpenChange={(open) => setOpenTargetFamilyId(open ? option.familyId : null)}
                onChange={(value) => setTargetTier(option.familyId, value)}
              />
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

function TargetTierDropdown({
  effect,
  familyId,
  tiers,
  value,
  disabled,
  open,
  onOpenChange,
  onChange
}: {
  effect: string;
  familyId: string;
  tiers: number[];
  value: number | "";
  disabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (value: string) => void;
}) {
  const displayText = value ? `T${value}` : "无";
  const menuId = `forge-target-tier-menu-${familyId}`;
  const choices = [{ value: "", label: "无" }, ...tiers.map((tier) => ({ value: String(tier), label: `T${tier}` }))];

  function choose(nextValue: string) {
    onChange(nextValue);
    onOpenChange(false);
  }

  return (
    <div className={`forge-target-tier-dropdown${open ? " open" : ""}${disabled ? " disabled" : ""}`}>
      <button
        className="forge-target-tier-button"
        type="button"
        disabled={disabled}
        aria-label={`${effect} 目标T级`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => onOpenChange(!open)}
      >
        <span>{displayText}</span>
        <span className="forge-target-tier-arrow" aria-hidden="true" />
      </button>
      {open && !disabled && (
        <div className="forge-target-tier-menu" id={menuId} role="listbox" aria-label={`${effect} 目标T级`}>
          {choices.map((choice) => (
            <button
              key={choice.value || "none"}
              className={String(value) === choice.value ? "active" : ""}
              type="button"
              role="option"
              aria-selected={String(value) === choice.value}
              onClick={() => choose(choice.value)}
            >
              {choice.label}
            </button>
          ))}
        </div>
      )}
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
  targetTiers: number[];
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

function forgeCraftOptions(item: ForgeItem, library: ForgeLibrary, gen: string, selectedSlotId: string): ForgeCraftOption[] {
  const source = forgeEquipmentSource(item);
  const level = Math.max(1, Math.floor(Number(item.level ?? 1)));
  const selectedAffix = forgeSelectedAffix(item, selectedSlotId);
  const existingFamilyIds = new Set(
    (item.equipment_affixes ?? [])
      .filter((affix) => affix !== selectedAffix)
      .map((affix) => affix.family_id)
      .filter(Boolean)
  );
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
    if (current) {
      if (!current.targetTiers.includes(option.tier)) current.targetTiers.push(option.tier);
      if (current.tier <= option.tier) continue;
    }
    byFamily.set(option.family_id, {
      familyId: option.family_id,
      effect: option.effect_text,
      tier: option.tier,
      targetTiers: current?.targetTiers ?? [option.tier],
      disabled: existingFamilyIds.has(option.family_id)
    });
  }
  return Array.from(byFamily.values()).map((option) => ({
    ...option,
    targetTiers: option.targetTiers.sort((left, right) => left - right)
  }));
}

function forgeEquipmentSource(item: ForgeItem) {
  const level = Math.max(1, Math.floor(Number(item.level ?? 1)));
  const nameSource = item.name_text.replace(/^Lv\d+\s+/, "");
  const directSources = [
    item.gem_type?.identity_text,
    item.gem_type?.display_text,
    nameSource,
    item.category_text
  ].filter((source): source is string => Boolean(source));

  for (const source of directSources) {
    if (forgeSourceHasAffixOptions(source, level)) return source;
  }

  for (const affix of item.equipment_affixes ?? []) {
    const source = frontendEquipmentSourceForAffixRoll(affix);
    if (source) return source;
  }

  return directSources[0] ?? item.category_text;
}

function forgeSourceHasAffixOptions(source: string, level: number) {
  try {
    return frontendEquipmentAffixOptions(source, level).some((option) => option.library !== "base");
  } catch {
    return false;
  }
}
