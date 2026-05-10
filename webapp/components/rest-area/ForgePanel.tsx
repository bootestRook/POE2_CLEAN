import type { ReactNode } from "react";
import { equipmentSourceSlotId } from "../inventory/equipmentRules";

type ForgeAffix = {
  affix_id: string;
  effect: string;
  tier: number;
  gen?: string;
};

type ForgeItem = {
  instance_id: string;
  name_text: string;
  category_text: string;
  gem_type?: { id?: string; display_text?: string; identity_text?: string };
  equipment_slot_id?: string;
  equipment_affixes?: ForgeAffix[];
};

const FORGE_PREFIX_CAPACITY = 3;
const FORGE_SUFFIX_CAPACITY = 3;

export function ForgePanel<TItem extends ForgeItem>({
  item,
  selectedAffixSlots,
  renderItem,
  onToggleAffixSlot
}: {
  item: TItem | null;
  selectedAffixSlots: Set<string>;
  renderItem: (item: TItem) => ReactNode;
  onToggleAffixSlot: (slotId: string) => void;
}) {
  const affixGroups = item ? forgeAffixGroups(item) : null;
  const hasSelectedAffix = selectedAffixSlots.size > 0;

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
                <p>物品等级:100</p>
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
              <button className="active" type="button">初阶词缀</button>
              <button type="button">进阶词缀</button>
              <button type="button">至臻词缀</button>
            </div>
            {!hasSelectedAffix ? (
              <div className="forge-select-hint">请选择要打造的词缀位置</div>
            ) : (
              <ForgeCraftOptions />
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

function ForgeCraftOptions() {
  const options = [
    "+(37-220) 最大生命",
    "+(433-2880) 该装备护甲值",
    "+(12-72)% 伤害",
    "+(12-72)% 召唤物伤害",
    "+(19-120) 最大魔力\n(已有同类型词缀)"
  ];
  return (
    <div className="forge-craft-options">
      <p className="forge-craft-description">用1条随机词缀替换该位置的上的词缀</p>
      <div className="forge-craft-heading">
        <span>可能出现的词缀</span>
        <span>最高T级</span>
      </div>
      <div className="forge-craft-list">
        {options.map((option, index) => (
          <div key={option} className={`forge-craft-row${index === options.length - 1 ? " disabled" : ""}`}>
            <span className="forge-info-icon">i</span>
            <span>{option}</span>
            <span className="forge-tier-outline">T1</span>
          </div>
        ))}
      </div>
      <div className="forge-cost-box">
        <h3>消耗</h3>
        <div className="forge-cost-empty" aria-label="消耗物品栏暂空" />
      </div>
      <div className="forge-action-row">
        <label className="forge-auto-toggle">
          <input type="checkbox" />
          <span />
          自动打造
        </label>
        <strong>成功率：<b>100.00%</b></strong>
      </div>
      <button className="forge-craft-button" type="button">打造</button>
    </div>
  );
}

type ForgeAffixSlot = {
  id: string;
  text: string;
  tierText: string;
  empty: boolean;
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
  return item.gem_type?.identity_text || item.gem_type?.display_text || item.equipment_slot_id || equipmentSourceSlotId(item) || item.category_text;
}
