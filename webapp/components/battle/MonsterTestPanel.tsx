type MonsterTestOption = {
  id: string;
  label: string;
};

type MonsterTestPanelProps = {
  playerLifeText: string;
  liveMonsterCount: number;
  selectedMonsterId: string;
  monsterOptions: MonsterTestOption[];
  onSelectMonster: (monsterId: string) => void;
  onSpawn: () => void;
  onDestroyAll: () => void;
};

export function MonsterTestPanel({
  playerLifeText,
  liveMonsterCount,
  selectedMonsterId,
  monsterOptions,
  onSelectMonster,
  onSpawn,
  onDestroyAll
}: MonsterTestPanelProps) {
  return (
    <section className="monster-test-panel" aria-label="怪物测试控制">
      <header>
        <strong>怪物测试场景</strong>
        <span>玩家生命 {playerLifeText}，存活怪物 {liveMonsterCount}</span>
      </header>
      <label>
        <span>怪物</span>
        <select value={selectedMonsterId} onChange={(event) => onSelectMonster(event.currentTarget.value)}>
          {monsterOptions.map((monster) => (
            <option key={monster.id} value={monster.id}>{monster.label}</option>
          ))}
        </select>
      </label>
      <div className="monster-test-actions">
        <button type="button" onClick={onSpawn}>生成</button>
        <button type="button" onClick={onDestroyAll}>全部销毁</button>
      </div>
    </section>
  );
}
