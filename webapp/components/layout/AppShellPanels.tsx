type MapDebugToggleProps = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
};

export function MapDebugToggle({ enabled, onChange }: MapDebugToggleProps) {
  return (
    <label className="map-debug-toggle">
      <input type="checkbox" checked={enabled} onChange={(event) => onChange(event.target.checked)} />
      <span>地图调试：{enabled ? "开" : "关"}</span>
    </label>
  );
}

type SpawnPlanWarningPanelProps = {
  warnings: string[];
};

export function SpawnPlanWarningPanel({ warnings }: SpawnPlanWarningPanelProps) {
  return (
    <aside className="spawnPlan-warning-panel" aria-label="遭遇点警告">
      {warnings.slice(0, 3).map((warning) => <span key={warning}>{warning}</span>)}
    </aside>
  );
}

export function HelpText() {
  return (
    <div className="help-text">
      <p>Esc：返回/暂停菜单</p>
      <p>C：打开/关闭背包</p>
      <p>M：打开/关闭小地图</p>
      <p>WASD：移动</p>
      <p>拖拽：放置宝石</p>
      <p>左键/F：拾取/交互</p>
    </div>
  );
}

type CombatFeedProps = {
  runtimeBoundaryScanLine: string | null;
  runtimeDebugCornerSummary: string | null;
  combatLogs: string[];
};

export function CombatFeed({ runtimeBoundaryScanLine, runtimeDebugCornerSummary, combatLogs }: CombatFeedProps) {
  return (
    <section className="combat-feed" aria-label="战斗日志">
      {runtimeBoundaryScanLine && <p>{runtimeBoundaryScanLine}</p>}
      {runtimeDebugCornerSummary && <p>{runtimeDebugCornerSummary}</p>}
      {combatLogs.map((log, index) => <p key={index}>{log}</p>)}
    </section>
  );
}
