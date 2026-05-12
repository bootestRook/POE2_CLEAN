import { useEffect, useMemo, useState } from "react";
import { clampNumber } from "../../utils/number";
import { prefixSuffixCapacity } from "../../frontendEquipmentRuntime";

type GmOptions = {
  gems: Array<{ id: string; name_text: string; kind: string; sudoku_digit: number | string }>;
  ordinary_items: Array<{ id: string; name_text: string; max_stack_count: number }>;
  equipment_sources: Array<{ id: string; name_text: string }>;
  equipment_rarities: Array<{ id: string; name_text: string; affix_count: number }>;
};

type GmEquipmentAffixResponse = {
  source: string;
  level: number;
  capacity: { prefix: number; suffix: number };
  affixes: Array<{ id: string; name_text: string; library: string; gen: string; family_id: string }>;
};

export function GmToolPanel({
  options,
  affixes,
  onLoadAffixes,
  onSubmit,
  onClose
}: {
  options: GmOptions | null;
  affixes: GmEquipmentAffixResponse | null;
  onLoadAffixes: (source: string, level: number) => Promise<GmEquipmentAffixResponse>;
  onSubmit: (path: string, body: unknown, successText: string) => Promise<void>;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"gem" | "ordinary" | "specific" | "random">("gem");
  const [selectedGemSudokuDigit, setSelectedGemSudokuDigit] = useState("all");
  const [selectedGemId, setSelectedGemId] = useState("");
  const [gemLevel, setGemLevel] = useState(1);
  const [gemQuantity, setGemQuantity] = useState(1);
  const [selectedOrdinaryItemId, setSelectedOrdinaryItemId] = useState("");
  const [ordinaryStackCount, setOrdinaryStackCount] = useState(1);
  const [source, setSource] = useState("");
  const [equipmentLevel, setEquipmentLevel] = useState(86);
  const [selectedBaseAffixId, setSelectedBaseAffixId] = useState("");
  const [selectedAffixIds, setSelectedAffixIds] = useState<string[]>([]);
  const [randomRarity, setRandomRarity] = useState("purple");
  const [busy, setBusy] = useState(false);
  const [affixesLoading, setAffixesLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!options) return;
    setSource((current) => current || options.equipment_sources[0]?.id || "");
    setRandomRarity((current) => current || options.equipment_rarities[2]?.id || "purple");
  }, [options]);

  const gemSudokuDigits = useMemo(() => {
    const digits = new Set((options?.gems ?? []).map((gem) => String(gem.sudoku_digit)));
    return Array.from(digits).sort((left, right) => Number(left) - Number(right));
  }, [options]);

  const filteredGems = useMemo(() => {
    const gems = options?.gems ?? [];
    if (selectedGemSudokuDigit === "all") return gems;
    return gems.filter((gem) => String(gem.sudoku_digit) === selectedGemSudokuDigit);
  }, [options, selectedGemSudokuDigit]);

  useEffect(() => {
    setSelectedGemId((current) => (
      filteredGems.some((gem) => gem.id === current) ? current : filteredGems[0]?.id ?? ""
    ));
  }, [filteredGems]);

  useEffect(() => {
    const ordinaryItems = options?.ordinary_items ?? [];
    setSelectedOrdinaryItemId((current) => (
      ordinaryItems.some((item) => item.id === current) ? current : ordinaryItems[0]?.id ?? ""
    ));
  }, [options]);

  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    setSelectedBaseAffixId("");
    setSelectedAffixIds([]);
    setAffixesLoading(true);
    onLoadAffixes(source, equipmentLevel)
      .catch((error: Error) => setMessage(error.message))
      .finally(() => {
        if (!cancelled) setAffixesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [source, equipmentLevel]);

  async function submit() {
    setBusy(true);
    setMessage("");
      try {
        if (mode === "gem") {
        await onSubmit("gm-add-gem", { base_gem_id: selectedGemId, level: gemLevel, quantity: gemQuantity }, "GM 已添加宝石。");
        } else if (mode === "ordinary") {
        await onSubmit("gm-add-ordinary", { ordinary_item_id: selectedOrdinaryItemId, stack_count: ordinaryStackCount }, "GM 已添加材料道具。");
        } else if (mode === "specific") {
        if (!affixResponseMatches) {
          setMessage("正在读取当前装备类型词缀。");
          return;
        }
        const invalidSelectionMessage = gmAffixSelectionInvalidMessage(selectedAffixes, activeCapacity);
        if (invalidSelectionMessage) {
          setMessage(invalidSelectionMessage);
          return;
        }
        const affixIds = selectedBaseAffixId ? [selectedBaseAffixId, ...selectedAffixIds] : selectedAffixIds;
        await onSubmit("gm-add-equipment", { source, level: equipmentLevel, affix_ids: affixIds }, "GM 已添加指定装备。");
        } else {
        await onSubmit("gm-add-equipment", { source, level: equipmentLevel, random_rarity: randomRarity }, "GM 已添加随机装备。");
      }
      setMessage("已添加到物品栏。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "GM 操作失败。");
    } finally {
      setBusy(false);
    }
  }

  function toggleSelectedAffix(affixId: string) {
    const affix = ordinaryAffixes.find((item) => item.id === affixId);
    if (affix && isAffixDisabled(affix)) return;
    setSelectedAffixIds((current) => (
      current.includes(affixId)
        ? current.filter((id) => id !== affixId)
        : [...current.filter((id) => {
          const currentAffix = ordinaryAffixes.find((item) => item.id === id);
          return !affix || !currentAffix || currentAffix.family_id !== affix.family_id;
        }), affixId]
    ));
  }

  const affixResponseMatches = Boolean(affixes && affixes.source === source && Number(affixes.level) === equipmentLevel);
  const activeAffixes = affixResponseMatches ? affixes?.affixes ?? [] : [];
  const activeCapacity = affixResponseMatches ? affixes?.capacity ?? { prefix: 0, suffix: 0 } : { prefix: 0, suffix: 0 };
  const baseAffixes = activeAffixes.filter((affix) => affix.library === "base");
  const ordinaryAffixes = activeAffixes.filter((affix) => affix.library !== "base");
  const prefixAffixes = ordinaryAffixes.filter((affix) => affix.gen === "prefix");
  const suffixAffixes = ordinaryAffixes.filter((affix) => affix.gen === "suffix");
  const selectedAffixes = ordinaryAffixes.filter((affix) => selectedAffixIds.includes(affix.id));
  const prefixCount = selectedAffixes.filter((affix) => affix.gen === "prefix").length;
  const suffixCount = selectedAffixes.filter((affix) => affix.gen === "suffix").length;
  const selectedFamilyIds = new Set(selectedAffixes.map((affix) => affix.family_id));
  const prefixCapacity = activeCapacity.prefix;
  const suffixCapacity = activeCapacity.suffix;
  const qualityPreview = equipmentQualityByAffixCount(selectedAffixes.length);
  const randomRarityCapacity = prefixSuffixCapacity(equipmentLevel);
  const randomRarityAffixCapacity = randomRarityCapacity.prefix + randomRarityCapacity.suffix;
  const randomRarityOptions = useMemo(
    () => (options?.equipment_rarities ?? []).filter((rarity) => canRandomRarityFitLevel(rarity.id, randomRarityAffixCapacity)),
    [options, randomRarityAffixCapacity]
  );

  useEffect(() => {
    if (randomRarityOptions.length === 0) return;
    if (randomRarityOptions.some((rarity) => rarity.id === randomRarity)) return;
    setRandomRarity(randomRarityOptions[randomRarityOptions.length - 1]?.id ?? "white");
  }, [randomRarity, randomRarityOptions]);

  function isAffixDisabled(affix: { id: string; gen: string; family_id: string }) {
    if (selectedAffixIds.includes(affix.id)) return false;
    if (selectedFamilyIds.has(affix.family_id)) return true;
    if (affix.gen === "prefix" && prefixCount >= prefixCapacity) return true;
    if (affix.gen === "suffix" && suffixCount >= suffixCapacity) return true;
    return false;
  }

  return (
    <section className="gm-tool-panel" aria-label="GM工具">
      <header className="gm-tool-header">
        <strong>GM工具</strong>
        <button type="button" onClick={onClose} aria-label="关闭GM工具">×</button>
      </header>
      <div className="gm-tool-tabs">
        <button type="button" className={mode === "gem" ? "active" : ""} onClick={() => setMode("gem")}>宝石</button>
        <button type="button" className={mode === "ordinary" ? "active" : ""} onClick={() => setMode("ordinary")}>材料</button>
        <button type="button" className={mode === "specific" ? "active" : ""} onClick={() => setMode("specific")}>指定装备</button>
        <button type="button" className={mode === "random" ? "active" : ""} onClick={() => setMode("random")}>随机装备</button>
      </div>
      {!options ? (
        <div className="gm-tool-loading">正在读取合法物品...</div>
      ) : (
        <div className="gm-tool-body">
          {mode === "gem" && (
            <>
              <label>
                <span>数独类型</span>
                <select value={selectedGemSudokuDigit} onChange={(event) => setSelectedGemSudokuDigit(event.currentTarget.value)}>
                  <option value="all">全部</option>
                  {gemSudokuDigits.map((digit) => (
                    <option key={digit} value={digit}>数独 {digit}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>宝石</span>
                <select value={selectedGemId} onChange={(event) => setSelectedGemId(event.currentTarget.value)}>
                  {filteredGems.map((gem) => (
                    <option key={gem.id} value={gem.id}>{gem.name_text} · {gem.kind} · {gem.sudoku_digit}</option>
                  ))}
                </select>
              </label>
              <div className="gm-tool-row">
                <label>
                  <span>等级</span>
                  <input type="number" min={1} max={20} value={gemLevel} onChange={(event) => setGemLevel(clampNumber(Number(event.currentTarget.value), 1, 20))} />
                </label>
                <label>
                  <span>个数</span>
                  <input type="number" min={1} max={60} value={gemQuantity} onChange={(event) => setGemQuantity(clampNumber(Number(event.currentTarget.value), 1, 60))} />
                </label>
              </div>
            </>
          )}
          {mode === "ordinary" && (
            <>
              <label>
                <span>材料</span>
                <select value={selectedOrdinaryItemId} onChange={(event) => setSelectedOrdinaryItemId(event.currentTarget.value)}>
                  {(options.ordinary_items ?? []).map((item) => (
                    <option key={item.id} value={item.id}>{item.name_text} · 堆叠上限 {item.max_stack_count}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>数量</span>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, Number(options.ordinary_items.find((item) => item.id === selectedOrdinaryItemId)?.max_stack_count ?? 999))}
                  value={ordinaryStackCount}
                  onChange={(event) => {
                    const maxStackCount = Math.max(1, Number(options.ordinary_items.find((item) => item.id === selectedOrdinaryItemId)?.max_stack_count ?? 999));
                    setOrdinaryStackCount(clampNumber(Number(event.currentTarget.value), 1, maxStackCount));
                  }}
                />
              </label>
            </>
          )}
          {mode !== "gem" && mode !== "ordinary" && (
            <>
              <div className="gm-tool-row">
                <label>
                  <span>装备类型</span>
                  <select value={source} onChange={(event) => setSource(event.currentTarget.value)}>
                    {options.equipment_sources.map((item) => (
                      <option key={item.id} value={item.id}>{item.name_text}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>等级</span>
                  <input type="number" min={1} max={100} value={equipmentLevel} onChange={(event) => setEquipmentLevel(clampNumber(Number(event.currentTarget.value), 1, 100))} />
                </label>
              </div>
              {mode === "specific" ? (
                <>
                  <label>
                    <span>装备基础</span>
                    <select value={selectedBaseAffixId} onChange={(event) => setSelectedBaseAffixId(event.currentTarget.value)}>
                      <option value="">随机基础</option>
                      {baseAffixes.map((affix) => (
                        <option key={affix.id} value={affix.id}>{affix.name_text}</option>
                      ))}
                    </select>
                  </label>
                  <div className="gm-affix-columns" aria-label="装备前后词缀">
                    {affixesLoading && !affixResponseMatches && (
                      <div className="gm-affix-loading">正在读取当前装备类型词缀...</div>
                    )}
                    <GmAffixCheckboxGroup
                      title={`前缀 ${prefixCount}/${prefixCapacity}`}
                      affixes={prefixAffixes}
                      selectedAffixIds={selectedAffixIds}
                      isDisabled={isAffixDisabled}
                      onToggle={toggleSelectedAffix}
                    />
                    <GmAffixCheckboxGroup
                      title={`后缀 ${suffixCount}/${suffixCapacity}`}
                      affixes={suffixAffixes}
                      selectedAffixIds={selectedAffixIds}
                      isDisabled={isAffixDisabled}
                      onToggle={toggleSelectedAffix}
                    />
                  </div>
                  <div className="gm-tool-summary">
                    <span>{qualityPreview}装备</span>
                    <span>基础 {selectedBaseAffixId ? 1 : 0}/1</span>
                    <span>前缀 {prefixCount}/{prefixCapacity}</span>
                    <span>后缀 {suffixCount}/{suffixCapacity}</span>
                  </div>
                </>
              ) : (
                <label>
                  <span>品质</span>
                  <select value={randomRarity} onChange={(event) => setRandomRarity(event.currentTarget.value)}>
                    {randomRarityOptions.map((rarity) => (
                      <option key={rarity.id} value={rarity.id}>{rarity.name_text} · {rarity.affix_count}词缀</option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}
        </div>
      )}
      <footer className="gm-tool-footer">
        {message && <span>{message}</span>}
        <button type="button" disabled={busy || !options} onClick={submit}>{busy ? "添加中..." : "添加到物品栏"}</button>
      </footer>
    </section>
  );
}

function GmAffixCheckboxGroup({
  title,
  affixes,
  selectedAffixIds,
  isDisabled,
  onToggle
}: {
  title: string;
  affixes: Array<{ id: string; name_text: string; gen: string; family_id: string }>;
  selectedAffixIds: string[];
  isDisabled: (affix: { id: string; gen: string; family_id: string }) => boolean;
  onToggle: (affixId: string) => void;
}) {
  return (
    <section className="gm-affix-group">
      <h4>{title}</h4>
      <div className="gm-affix-list">
        {affixes.map((affix) => (
          <label key={affix.id} className={`gm-affix-option${isDisabled(affix) ? " disabled" : ""}`}>
            <input
              type="checkbox"
              checked={selectedAffixIds.includes(affix.id)}
              disabled={isDisabled(affix)}
              onChange={() => onToggle(affix.id)}
            />
            <span>{affix.name_text}</span>
          </label>
        ))}
        {affixes.length === 0 && <span className="gm-affix-empty">当前等级无可用词缀</span>}
      </div>
    </section>
  );
}

function gmAffixSelectionInvalidMessage(
  selectedAffixes: Array<{ gen: string; family_id: string }>,
  capacity: { prefix: number; suffix: number }
) {
  const selectedFamilyIds = new Set<string>();
  let prefixCount = 0;
  let suffixCount = 0;
  for (const affix of selectedAffixes) {
    if (selectedFamilyIds.has(affix.family_id)) return "同一词缀不同 T 级只能选择一个。";
    selectedFamilyIds.add(affix.family_id);
    if (affix.gen === "prefix") prefixCount += 1;
    if (affix.gen === "suffix") suffixCount += 1;
  }
  if (prefixCount > capacity.prefix) return "前缀数量超过当前等级上限。";
  if (suffixCount > capacity.suffix) return "后缀数量超过当前等级上限。";
  return "";
}

function equipmentQualityByAffixCount(count: number) {
  if (count <= 0) return "白色";
  if (count <= 2) return "蓝色";
  if (count <= 5) return "紫色";
  return "粉色";
}

function canRandomRarityFitLevel(rarityId: string, ordinaryAffixCapacity: number) {
  return ordinaryAffixCapacity >= randomRarityMinimumAffixCount(rarityId);
}

function randomRarityMinimumAffixCount(rarityId: string) {
  if (rarityId === "blue") return 1;
  if (rarityId === "purple") return 3;
  if (rarityId === "pink") return 6;
  return 0;
}
