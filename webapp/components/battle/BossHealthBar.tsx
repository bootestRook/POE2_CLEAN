import { isNemesisRarity } from "../../mapSpawnRuntime";
import type { ProceduralSpawnRarity } from "../../mapSpawnRuntime";
import { MONSTER_RARITY_VISUALS, resolveMonsterGeometryVisual } from "../../monsterGeometryVisuals";
import { clampNumber } from "../../utils/number";

type BossHealthEnemyView = {
  hp: number;
  maxHp: number;
  monsterId?: string;
  spawnRarity?: ProceduralSpawnRarity;
};

export function BossHealthBar({ enemy }: { enemy: BossHealthEnemyView }) {
  const ratio = clampNumber(enemy.hp / Math.max(1, enemy.maxHp), 0, 1);
  const rarity = isNemesisRarity(enemy.spawnRarity) ? enemy.spawnRarity : "legendary_boss";
  const rarityVisual = MONSTER_RARITY_VISUALS[rarity];
  return (
    <section className={`boss-health-bar ${rarityVisual.healthClass}`} aria-label={`${bossHealthName(enemy)}生命值`}>
      <div className="boss-health-frame">
        <span className="boss-health-title">{bossHealthName(enemy)}</span>
        <span className="boss-health-level">{rarityVisual.labelText}</span>
        <div className="boss-health-track">
          <span style={{ width: `${ratio * 100}%` }} />
        </div>
      </div>
    </section>
  );
}

function bossHealthName(enemy: BossHealthEnemyView) {
  const visual = resolveMonsterGeometryVisual(enemy.monsterId);
  const rarity = isNemesisRarity(enemy.spawnRarity) ? enemy.spawnRarity : visual?.tier;
  const baseName = rarity === "supreme_boss" ? "至高首领" : "传奇首领";
  const marker = bossMarkerLabel(enemy.monsterId);
  return marker ? `${baseName} ${marker}` : baseName;
}

function bossMarkerLabel(monsterId?: string) {
  const match = monsterId?.match(/^mon_(400|500)0(\d{2})$/);
  if (!match) return "";
  return `${match[1] === "500" ? "S" : "B"}-${match[2]}`;
}
