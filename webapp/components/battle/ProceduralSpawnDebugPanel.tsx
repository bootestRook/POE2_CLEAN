import type { ProceduralSpawnDebugSummary } from "../../mapSpawnRuntime";

export function ProceduralSpawnDebugPanel({ debug }: { debug: ProceduralSpawnDebugSummary | null }) {
  if (!debug) return null;
  const accepted = debug.spawn_points.filter((point) => point.accepted).slice(0, 8);
  const filtered = debug.filtered_points.slice(0, 5);
  return (
    <aside className="procedural-spawn-debug-panel" aria-label="程序化生怪调试">
      <strong>程序化生怪调试</strong>
      <span>当前地图类型：{debug.map_type}</span>
      <span>总生怪预算：{debug.spent_pack_budget} / {debug.base_pack_budget}</span>
      <span>已生成怪物包数量：{debug.generated_pack_count}</span>
      <span>普通 {debug.normal_monster_count}，魔法 {debug.magic_monster_count}，稀有 {debug.rare_monster_count}，传奇 {debug.boss_monster_count}</span>
      {accepted.length > 0 && (
        <div className="procedural-spawn-debug-list">
          <span>刷怪点</span>
          {accepted.map((point) => (
            <code key={`spawn-${point.gridX}-${point.gridY}`}>
              {point.zone_type} / {point.monster_pack_id ?? "无"}
            </code>
          ))}
        </div>
      )}
      {filtered.length > 0 && (
        <div className="procedural-spawn-debug-list">
          <span>过滤原因</span>
          {filtered.map((point, index) => (
            <code key={`filtered-${point.gridX}-${point.gridY}-${index}`}>
              {point.zone_type} / {point.filter_reason ?? "未知原因"}
            </code>
          ))}
        </div>
      )}
    </aside>
  );
}
