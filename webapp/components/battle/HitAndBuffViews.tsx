import type { CSSProperties } from "react";
import { cssToken, visualTone } from "../../utils/vfxTone";
import { LegacyHitVfxView } from "./LegacyProjectileHitVfxViews";
import { normalizedVfxScale, projectileVfxKind } from "./projectileVfxPresentation";

type Point = { x: number; y: number };

type ShapeEffect = { id: string; text: string };

export type HitVfxViewModel = {
  x: number;
  y: number;
  ttl: number;
  duration: number;
  damageType?: string;
  vfxKey?: string;
  skillTemplateId?: string;
  targetId?: number;
  shapeEffects: readonly ShapeEffect[];
  vfxScale?: unknown;
  projectileId?: string;
  impactRadius?: number;
};

export type PlayerBuffViewModel = {
  buffType: string;
  remaining: number;
  duration: number;
  remainingAmount: number;
  vfxKey?: string;
  moveSpeedMultiplier?: number;
};

export function HitVfxView({
  vfx,
  depthIndex,
  projectBattleWorldToScreen,
  hasShapeEffect,
  zIndexBase
}: {
  vfx: HitVfxViewModel;
  depthIndex: number;
  projectBattleWorldToScreen: (worldX: number, worldY: number) => Point;
  hasShapeEffect: (effects: readonly ShapeEffect[] | undefined, id: string) => boolean;
  zIndexBase: number;
}) {
  const vfxKind = projectileVfxKind(vfx.vfxKey) ?? projectileVfxKind(vfx.skillTemplateId);
  if (vfxKind === "sparkle") {
    return (
      <SparkleHitVfxView
        vfx={vfx}
        depthIndex={depthIndex}
        projectBattleWorldToScreen={projectBattleWorldToScreen}
        zIndexBase={zIndexBase}
      />
    );
  }
  return (
    <LegacyHitVfxView
      vfx={vfx}
      depthIndex={depthIndex}
      projectBattleWorldToScreen={projectBattleWorldToScreen}
      normalizedVfxScale={normalizedVfxScale}
      cssToken={cssToken}
      visualTone={visualTone}
      hasShapeEffect={hasShapeEffect}
      zIndexBase={zIndexBase}
    />
  );
}

function SparkleHitVfxView({
  vfx,
  depthIndex,
  projectBattleWorldToScreen,
  zIndexBase
}: {
  vfx: HitVfxViewModel;
  depthIndex: number;
  projectBattleWorldToScreen: (worldX: number, worldY: number) => Point;
  zIndexBase: number;
}) {
  const duration = Math.max(0.001, vfx.duration);
  const opacity = Math.max(0, vfx.ttl / duration);
  const vfxScale = normalizedVfxScale(vfx.vfxScale);
  const point = projectBattleWorldToScreen(vfx.x, vfx.y);
  const size = Math.max(28, Number(vfx.impactRadius ?? 20) * 2.1) * vfxScale;
  const style: CSSProperties = {
    left: point.x,
    top: point.y - 12,
    width: size,
    height: size,
    opacity,
    zIndex: zIndexBase + depthIndex + 1,
    transform: `translate(-50%, -50%) scale(${1 + (1 - opacity) * 0.35})`
  };
  return (
    <span
      className="sparkle-hit-vfx"
      style={style}
      data-skill-event="hit_vfx"
      data-vfx-key={vfx.vfxKey}
      data-projectile-id={vfx.projectileId}
      aria-hidden="true"
    >
      <span className="sparkle-hit-vfx__ring" />
      <span className="sparkle-hit-vfx__arc sparkle-hit-vfx__arc-a" />
      <span className="sparkle-hit-vfx__arc sparkle-hit-vfx__arc-b" />
    </span>
  );
}

export function PlayerBuffLayer({
  buffs,
  player,
  projectBattleWorldToScreen
}: {
  buffs: PlayerBuffViewModel[];
  player: { x: number; y: number };
  projectBattleWorldToScreen: (worldX: number, worldY: number) => Point;
}) {
  const guard = buffs.find((buff) => buff.buffType === "guard");
  const channelMove = buffs.find((buff) => buff.buffType === "channel_move_speed");
  if (!guard && !channelMove) return null;
  const visualPoint = projectBattleWorldToScreen(player.x, player.y);
  const guardProgress = guard ? clamp(1 - guard.remaining / Math.max(0.001, guard.duration), 0, 1) : 0;
  const guardOpacity = guard ? clamp(0.38 + guard.remaining / Math.max(0.001, guard.duration) * 0.44, 0.25, 0.88) : 0;
  const guardAmountScale = guard ? clamp(guard.remainingAmount / Math.max(1, guard.remainingAmount + 60), 0.55, 1) : 1;
  const guardLabelOpacity = guardProgress < 0.24 ? clamp(1 - guardProgress / 0.24, 0, 1) : 0;
  const channelProgress = channelMove ? clamp(1 - channelMove.remaining / Math.max(0.001, channelMove.duration), 0, 1) : 0;
  return (
    <>
      {channelMove && (
        <div
          className="player-buff-channel-move-speed"
          style={{
            left: visualPoint.x,
            top: visualPoint.y + 12,
            opacity: clamp(0.25 + channelMove.remaining / Math.max(0.001, channelMove.duration) * 0.48, 0.2, 0.72),
            transform: `translate(-50%, -50%) rotate(${channelProgress * 260}deg) scale(${0.92 + Math.sin(channelProgress * Math.PI * 2) * 0.04})`
          }}
          data-skill-event="buff_apply"
          data-buff-type={channelMove.buffType}
          data-vfx-key={channelMove.vfxKey}
          data-move-speed-multiplier={channelMove.moveSpeedMultiplier}
          aria-hidden="true"
        />
      )}
      {guard && (
        <div
          className="player-buff-shield player-buff-shield-guard"
          style={{
            left: visualPoint.x,
            top: visualPoint.y - 24,
            opacity: guardOpacity,
            transform: `translate(-50%, -50%) scale(${guardAmountScale + Math.sin(guardProgress * Math.PI * 4) * 0.035})`
          }}
          data-skill-event="buff_apply"
          data-buff-type={guard.buffType}
          data-vfx-key={guard.vfxKey}
          data-remaining-amount={Math.round(guard.remainingAmount)}
          aria-hidden="true"
        >
          <span className="player-buff-label" style={{ opacity: guardLabelOpacity }}>石肤术</span>
        </div>
      )}
    </>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
