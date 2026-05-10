import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { clampNumber } from "../../utils/number";

type GmOptions = {
  gems: Array<{ id: string; name_text: string; kind: string; sudoku_digit: number | string }>;
  equipment_sources: Array<{ id: string; name_text: string }>;
  equipment_rarities: Array<{ id: string; name_text: string; affix_count: number }>;
};

type GmEquipmentAffixResponse = {
  capacity: { prefix: number; suffix: number };
  affixes: Array<{ id: string; name_text: string; library: string; gen: string }>;
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
  const [mode, setMode] = useState<"gem" | "specific" | "random">("gem");
  const [selectedGemSudokuDigit, setSelectedGemSudokuDigit] = useState("all");
  const [selectedGemId, setSelectedGemId] = useState("");
  const [gemLevel, setGemLevel] = useState(1);
  const [gemQuantity, setGemQuantity] = useState(1);
  const [source, setSource] = useState("");
  const [equipmentLevel, setEquipmentLevel] = useState(86);
  const [selectedBaseAffixId, setSelectedBaseAffixId] = useState("");
  const [selectedAffixIds, setSelectedAffixIds] = useState<string[]>([]);
  const [randomRarity, setRandomRarity] = useState("purple");
  const [busy, setBusy] = useState(false);
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
    if (!source) return;
    setSelectedBaseAffixId("");
    setSelectedAffixIds([]);
    onLoadAffixes(source, equipmentLevel).catch((error: Error) => setMessage(error.message));
  }, [source, equipmentLevel]);

  async function submit() {
    setBusy(true);
    setMessage("");
      try {
        if (mode === "gem") {
        await onSubmit("gm-add-gem", { base_gem_id: selectedGemId, level: gemLevel, quantity: gemQuantity }, "GM 已添加宝石。");
        } else if (mode === "specific") {
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

  function updateSelectedAffixes(event: ChangeEvent<HTMLSelectElement>) {
    const ids = Array.from(event.currentTarget.selectedOptions).map((option) => option.value);
    setSelectedAffixIds(ids);
  }

  const baseAffixes = affixes?.affixes.filter((affix) => affix.library === "base") ?? [];
  const ordinaryAffixes = affixes?.affixes.filter((affix) => affix.library !== "base") ?? [];
  const selectedAffixes = ordinaryAffixes.filter((affix) => selectedAffixIds.includes(affix.id));
  const prefixCount = selectedAffixes.filter((affix) => affix.gen === "prefix").length;
  const suffixCount = selectedAffixes.filter((affix) => affix.gen === "suffix").length;
  const qualityPreview = equipmentQualityByAffixCount(selectedAffixes.length);

  return (
    <section className="gm-tool-panel" aria-label="GM工具">
      <header className="gm-tool-header">
        <strong>GM工具</strong>
        <button type="button" onClick={onClose} aria-label="关闭GM工具">×</button>
      </header>
      <div className="gm-tool-tabs">
        <button type="button" className={mode === "gem" ? "active" : ""} onClick={() => setMode("gem")}>宝石</button>
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
          {mode !== "gem" && (
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
                  <label>
                    <span>词缀</span>
                    <select multiple value={selectedAffixIds} onChange={updateSelectedAffixes} className="gm-affix-select">
                      {ordinaryAffixes.map((affix) => (
                        <option key={affix.id} value={affix.id}>{affix.name_text}</option>
                      ))}
                    </select>
                  </label>
                  <div className="gm-tool-summary">
                    <span>{qualityPreview}装备</span>
                    <span>基础 {selectedBaseAffixId ? 1 : 0}/1</span>
                    <span>前缀 {prefixCount}/{affixes?.capacity.prefix ?? 0}</span>
                    <span>后缀 {suffixCount}/{affixes?.capacity.suffix ?? 0}</span>
                  </div>
                </>
              ) : (
                <label>
                  <span>品质</span>
                  <select value={randomRarity} onChange={(event) => setRandomRarity(event.currentTarget.value)}>
                    {options.equipment_rarities.map((rarity) => (
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

function equipmentQualityByAffixCount(count: number) {
  if (count <= 0) return "白色";
  if (count <= 2) return "蓝色";
  if (count <= 5) return "紫色";
  return "粉色";
}
