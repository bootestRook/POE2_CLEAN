import { localize, localizeTemplate } from "../../localization";

type MapSelectionStage = {
  id: string;
  display_name: string;
  enterable: boolean;
  selected?: boolean;
  map_level_text: string;
  monster_level: number;
  free_entry: boolean;
  entry_count: number;
  entry_cost: number;
  boss_stage?: boolean;
};

export function MapSelectionPanel<TStage extends MapSelectionStage>({
  battleMapReady,
  progression,
  stageScopeText,
  stageBossPoolText,
  onStart,
  onClose
}: {
  battleMapReady: boolean;
  progression?: { stages: TStage[] };
  stageScopeText: (stage: TStage) => string;
  stageBossPoolText: (stage: TStage) => string;
  onStart: (stageId: string) => void;
  onClose?: () => void;
}) {
  const stages = progression?.stages ?? [];
  const selectedStage = stages.find((stage) => stage.selected) ?? stages.find((stage) => stage.enterable) ?? stages[0];
  return (
    <section className="map-selection-panel" aria-label={localize("ui.map_selection.header")}>
      <header className="map-selection-header">
        <div>
          <h2>{localize("ui.map_selection.header")}</h2>
          <span>{localize("ui.map_selection.notice")}</span>
        </div>
        {onClose && <button type="button" onClick={onClose}>{localize("ui.map_selection.return_rest")}</button>}
      </header>
      <div className="map-selection-list">
        {stages.map((stage) => {
          const selected = selectedStage?.id === stage.id;
          return (
            <button
              key={stage.id}
              type="button"
              className={`${selected ? "map-selection-card selected" : "map-selection-card"}${!stage.enterable ? " locked" : ""}`}
              disabled={!stage.enterable}
              onClick={() => onStart(stage.id)}
            >
              <strong>{stage.display_name}</strong>
              <span>{localizeTemplate("ui.map_selection.map_level", { level: stage.map_level_text })} · {localizeTemplate("ui.map_selection.monster_level", { level: stage.monster_level })}</span>
              <span>{stage.free_entry ? localize("ui.map_selection.free_entry") : localizeTemplate("ui.map_selection.entry_cost", { count: stage.entry_count, cost: stage.entry_cost })}{stage.boss_stage ? ` · ${localize("ui.map_selection.boss_reward")}` : ""} · {stageScopeText(stage)} · {stageBossPoolText(stage)}</span>
            </button>
          );
        })}
      </div>
      <button className="start-button" type="button" disabled={!battleMapReady || !selectedStage?.enterable} onClick={() => selectedStage && onStart(selectedStage.id)}>
        {battleMapReady ? localize("ui.map_selection.enter_selected") : localize("ui.map_selection.loading")}
      </button>
    </section>
  );
}
