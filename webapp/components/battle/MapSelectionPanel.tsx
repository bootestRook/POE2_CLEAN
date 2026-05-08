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
    <section className="map-selection-panel" aria-label="地图选择">
      <header className="map-selection-header">
        <div>
          <h2>选择战斗地图</h2>
          <span>自动存档已启用，起始区域 I 可无限免费刷。</span>
        </div>
        {onClose && <button type="button" onClick={onClose}>返回休息区</button>}
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
              <span>地图等级：{stage.map_level_text} · 怪物等级：{stage.monster_level}</span>
              <span>{stage.free_entry ? "无限免费" : `门票 ${stage.entry_count}/${stage.entry_cost}`}{stage.boss_stage ? " · Boss奖励" : ""} · {stageScopeText(stage)} · {stageBossPoolText(stage)}</span>
            </button>
          );
        })}
      </div>
      <button className="start-button" type="button" disabled={!battleMapReady || !selectedStage?.enterable} onClick={() => selectedStage && onStart(selectedStage.id)}>
        {battleMapReady ? "进入选中地图" : "地图加载中"}
      </button>
    </section>
  );
}
