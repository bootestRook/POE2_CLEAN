import { CSSProperties } from "react";
import { clampNumber } from "../../utils/number";
import phaseDashCooldownIconUrl from "../../assets/gems/phase-dash-cooldown-icon.png";

type PlayerResourceView = {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  currentMana: number;
  maxMana: number;
  currentEnergyShield: number;
  maxEnergyShield: number;
};

type PlayerOverheadResourceBarsProps = {
  player: PlayerResourceView;
  projectPosition: (worldPosition: { x: number; y: number }) => { x: number; y: number };
  displacementSkillCooldown?: PlayerDisplacementSkillCooldownView | null;
};

export type PlayerDisplacementSkillCooldownView = {
  ready: boolean;
  cooldownProgress: number;
};

export function PlayerOverheadResourceBars({ player, projectPosition, displacementSkillCooldown }: PlayerOverheadResourceBarsProps) {
  const maxLife = Math.max(0, player.maxHp);
  const currentLife = clampNumber(player.hp, 0, maxLife);
  const maxMana = Math.max(0, player.maxMana);
  const currentMana = clampNumber(player.currentMana, 0, maxMana);
  const maxEnergyShield = Math.max(0, player.maxEnergyShield);
  const currentEnergyShield = clampNumber(player.currentEnergyShield, 0, maxEnergyShield);
  const style = playerOverheadResourceStyle(player, projectPosition);

  return (
    <aside className="player-overhead-resource-bars" style={style} aria-label="玩家资源">
      <span className="player-overhead-bar player-overhead-bar-life">
        <span style={{ width: `${resourcePercent(currentLife, maxLife)}%` }} />
        {maxEnergyShield > 0 ? (
          <span className="player-overhead-bar-energy-shield" style={{ width: `${resourcePercent(currentEnergyShield, maxEnergyShield)}%` }} />
        ) : null}
      </span>
      <span className="player-overhead-bar player-overhead-bar-mana">
        <span style={{ width: `${resourcePercent(currentMana, maxMana)}%` }} />
      </span>
      {displacementSkillCooldown ? (
        <span
          className={`player-overhead-displacement-skill${displacementSkillCooldown.ready ? " ready" : " cooldown"}`}
          style={{ "--displacement-cooldown-progress": clampNumber(displacementSkillCooldown.cooldownProgress, 0, 1) } as CSSProperties}
          aria-label={displacementSkillCooldown.ready ? "位移技能可用" : "位移技能冷却中"}
        >
          <img src={phaseDashCooldownIconUrl} alt="" draggable={false} />
        </span>
      ) : null}
    </aside>
  );
}

function playerOverheadResourceStyle(
  player: { x: number; y: number },
  projectPosition: (worldPosition: { x: number; y: number }) => { x: number; y: number }
): CSSProperties {
  const position = projectPosition(player);
  return {
    left: position.x,
    top: position.y - 82
  };
}

function resourcePercent(current: number, max: number) {
  if (max <= 0) return 0;
  return clampNumber((current / max) * 100, 0, 100);
}
