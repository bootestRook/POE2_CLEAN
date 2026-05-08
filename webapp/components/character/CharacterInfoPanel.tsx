import { resolveUnitAnimation } from "../../unitAnimation";
import { UnitAnimationSprite } from "../battle/UnitAnimationSprite";

export type CharacterPanelRowView = {
  id: string;
  stat_id: string;
  label_text: string;
  value: number | boolean;
  value_type: string;
  formatter: string;
  icon_text: string;
  tone: string;
  v1_status: string;
};

export type CharacterPanelSectionView = {
  id: string;
  title_text: string;
  layout: "attributes" | "core" | "resistance" | "detail";
  rows: readonly CharacterPanelRowView[];
};

export type CharacterPanelView = {
  sections: readonly CharacterPanelSectionView[];
};

export type CharacterPanelRuntimeResources = {
  hp: number;
  maxHp: number;
  currentMana: number;
  maxMana: number;
  currentEnergyShield: number;
  maxEnergyShield: number;
};

export function CharacterInfoPanel({
  panel,
  playerName,
  player,
  baseMoveSpeed
}: {
  panel: CharacterPanelView | undefined;
  playerName: string;
  player: CharacterPanelRuntimeResources;
  baseMoveSpeed: number;
}) {
  const avatarFrame = resolveUnitAnimation({
    unitId: "player_adventurer",
    requestedState: "idle",
    movementVector: { x: 0, y: 0 },
    fallbackDirection: "right",
    elapsedMs: 0,
    baseMoveSpeed,
    currentMoveSpeed: 0
  });
  const attributeRows = panelRows(panel, "attributes");
  const coreRows = panelRows(panel, "core");
  const resistanceRows = panelRows(panel, "resistance");
  const detailSections = panel?.sections.filter((section) => section.layout === "detail") ?? [];

  return (
    <aside className="character-info-panel" aria-label="角色信息">
      <header className="character-info-header">
        <div className="character-meta">
          <strong>等级 1</strong>
          <span>洞穴</span>
          <span>第 1 赛季</span>
        </div>
        <div className="character-identity">
          <strong>{playerName}</strong>
          <div className="character-avatar" aria-hidden="true">
            <UnitAnimationSprite frame={avatarFrame} />
          </div>
        </div>
        <dl className="character-attributes">
          {attributeRows.map((row) => (
            <div key={row.id}><dt>{row.label_text}</dt><dd>{formatCharacterPanelValue(row, player)}</dd></div>
          ))}
        </dl>
      </header>

      <section className="character-core-grid" aria-label="核心属性">
        {coreRows.map((row) => (
          <article key={row.id} className="character-core-card">
            <span className={`character-stat-icon character-stat-${row.tone}`}>{row.icon_text}</span>
            <strong>{row.label_text}</strong>
            <span>{formatCharacterPanelValue(row, player)}</span>
          </article>
        ))}
      </section>

      <section className="character-resistance-section" aria-label="抗性">
        <h2>{panel?.sections.find((section) => section.layout === "resistance")?.title_text ?? "抗性"}</h2>
        <div className="character-resistance-grid">
          {resistanceRows.map((row) => (
            <div key={row.id} className="character-resistance-row">
              <span className={`character-stat-icon character-stat-${row.tone}`}>{row.icon_text}</span>
              <span>{row.label_text}</span>
              <strong>{formatCharacterPanelValue(row, player)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="character-detail-list" aria-label="角色属性明细">
        {detailSections.map((section) => (
          <article key={section.id} className="character-detail-group">
            <h2>{section.title_text}</h2>
            <dl>
              {section.rows.map((row) => (
                <div key={row.id}>
                  <dt>{row.label_text}</dt>
                  <dd>{formatCharacterPanelValue(row, player)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </section>
    </aside>
  );
}

function panelRows(panel: CharacterPanelView | undefined, layout: CharacterPanelSectionView["layout"]) {
  return panel?.sections.find((section) => section.layout === layout)?.rows ?? [];
}

function formatCharacterPanelValue(row: CharacterPanelRowView, player: CharacterPanelRuntimeResources) {
  const runtimeResourceValue = currentRuntimeResourcePanelValue(row.stat_id, player);
  const rawValue = runtimeResourceValue ?? row.value;
  if (typeof rawValue === "boolean") return rawValue ? "是" : "否";
  const value = Number(rawValue);
  if (!Number.isFinite(value)) return "0";
  if (row.formatter === "integer") return String(Math.round(value));
  if (row.formatter === "rating") return String(Math.round(value));
  if (row.formatter === "percent") return `${formatPreviewNumber(value)}%`;
  if (row.formatter === "multiplier") return `${formatPreviewNumber(value)} 倍`;
  if (row.formatter === "seconds_from_ms") return `${formatPreviewNumber(value / 1000)} 秒`;
  return formatPreviewNumber(value);
}

function currentRuntimeResourcePanelValue(statId: string, player: CharacterPanelRuntimeResources) {
  if (statId === "current_life") return Math.min(Math.round(player.maxHp), Math.round(player.hp));
  if (statId === "current_mana") return Math.min(Math.round(player.maxMana), Math.round(player.currentMana));
  if (statId === "current_energy_shield") return Math.min(Math.round(player.maxEnergyShield), Math.round(player.currentEnergyShield));
  return null;
}

function formatPreviewNumber(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, "");
}
