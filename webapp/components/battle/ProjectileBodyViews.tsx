import type { CSSProperties } from "react";
import { cssToken, visualTone } from "../../utils/vfxTone";
import { LegacyFireBoltView } from "./LegacyProjectileHitVfxViews";
import {
  FIRE_BOLT_FAKE_Z,
  ballisticArcVisualLift,
  ballisticShadowStyle,
  fireBoltAliveRemaining,
  fireBoltTravel,
  fireBoltWorldPoint,
  normalizedVfxScale,
  projectileBodyOpacity,
  projectileVfxKind
} from "./projectileVfxPresentation";

type Point = { x: number; y: number };

type ShapeEffect = { id: string; text: string };

export type ProjectileBodyViewModel = {
  id: number | string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  ttl: number;
  duration: number;
  areaScale: number;
  directionX: number;
  directionY: number;
  velocityX?: number;
  velocityY?: number;
  fadeDuration?: number;
  behaviorType?: string;
  vfxKey?: string;
  visualEffect?: string;
  damageType?: string;
  skillTemplateId?: string;
  skillId?: string;
  trajectory?: string;
  arcHeight?: number;
  sineAmplitude?: number;
  sineFrequency?: number;
  projectileVisualMode?: string;
  shapeEffects: readonly ShapeEffect[];
  projectileId?: string;
  projectileSpeed?: number;
  projectileWidth?: number;
  projectileHeight?: number;
  vfxScale?: unknown;
};

export function FireBoltView({
  bolt,
  depthIndex,
  projectBattleWorldToScreen,
  normalizedWorldDirection,
  worldDirectionToBattleScreenAngle,
  zIndexBase
}: {
  bolt: ProjectileBodyViewModel;
  depthIndex: number;
  projectBattleWorldToScreen: (worldX: number, worldY: number) => Point;
  normalizedWorldDirection: (direction: Point) => Point;
  worldDirectionToBattleScreenAngle: (direction: Point, origin: Point) => number;
  zIndexBase: number;
}) {
  const vfxKind = projectileVfxKind(bolt.vfxKey) ?? projectileVfxKind(bolt.visualEffect) ?? projectileVfxKind(bolt.skillTemplateId);
  if (vfxKind === "sparkle") {
    return (
      <SparkleProjectileView
        bolt={bolt}
        depthIndex={depthIndex}
        projectBattleWorldToScreen={projectBattleWorldToScreen}
        normalizedWorldDirection={normalizedWorldDirection}
        worldDirectionToBattleScreenAngle={worldDirectionToBattleScreenAngle}
        zIndexBase={zIndexBase}
      />
    );
  }
  if (vfxKind === "burning_shot") {
    return (
      <BurningShotProjectileView
        bolt={bolt}
        depthIndex={depthIndex}
        projectBattleWorldToScreen={projectBattleWorldToScreen}
        normalizedWorldDirection={normalizedWorldDirection}
        worldDirectionToBattleScreenAngle={worldDirectionToBattleScreenAngle}
        zIndexBase={zIndexBase}
      />
    );
  }
  return (
    <LegacyFireBoltView
      bolt={bolt}
      depthIndex={depthIndex}
      projectBattleWorldToScreen={projectBattleWorldToScreen}
      normalizedVfxScale={normalizedVfxScale}
      projectileBodyOpacity={projectileBodyOpacity}
      fireBoltTravel={fireBoltTravel}
      fireBoltWorldPoint={fireBoltWorldPoint}
      ballisticArcVisualLift={ballisticArcVisualLift}
      ballisticShadowStyle={(legacyBolt, point, legacyDepthIndex, opacity, travel) => (
        ballisticShadowStyle(legacyBolt, point, legacyDepthIndex, opacity, projectBattleWorldToScreen, zIndexBase, travel)
      )}
      cssToken={cssToken}
      visualTone={visualTone}
      zIndexBase={zIndexBase}
      fakeZ={FIRE_BOLT_FAKE_Z}
    />
  );
}

function BurningShotProjectileView({
  bolt,
  depthIndex,
  projectBattleWorldToScreen,
  normalizedWorldDirection,
  worldDirectionToBattleScreenAngle,
  zIndexBase
}: {
  bolt: ProjectileBodyViewModel;
  depthIndex: number;
  projectBattleWorldToScreen: (worldX: number, worldY: number) => Point;
  normalizedWorldDirection: (direction: Point) => Point;
  worldDirectionToBattleScreenAngle: (direction: Point, origin: Point) => number;
  zIndexBase: number;
}) {
  const duration = Math.max(0.001, bolt.duration);
  const aliveRemaining = fireBoltAliveRemaining(bolt);
  const opacity = projectileBodyOpacity(bolt);
  const travel = fireBoltTravel(bolt);
  const point = fireBoltWorldPoint(bolt, travel);
  const visualPoint = projectBattleWorldToScreen(point.x, point.y);
  const visualLift = ballisticArcVisualLift(bolt, travel);
  const direction = normalizedWorldDirection({
    x: typeof bolt.velocityX === "number" ? bolt.velocityX : bolt.directionX,
    y: typeof bolt.velocityY === "number" ? bolt.velocityY : bolt.directionY
  });
  const angle = worldDirectionToBattleScreenAngle(direction, point);
  const speedScale = clamp((bolt.projectileSpeed ?? 620) / 620, 0.82, 1.36);
  const length = Math.max(34, Number(bolt.projectileWidth ?? 50) * 1.18) * speedScale;
  const height = Math.max(18, Number(bolt.projectileHeight ?? 30) * 0.72);
  const pulseScale = 0.96 + pulse(aliveRemaining * 2.1) * 0.09;
  const transform = `translate(-50%, -50%) rotate(${angle}rad) scale(${pulseScale})`;

  return (
    <span
      className="burning-shot-projectile-vfx"
      style={{
        left: visualPoint.x,
        top: visualPoint.y - visualLift,
        width: length,
        height,
        opacity,
        zIndex: zIndexBase + depthIndex,
        transform
      }}
      data-skill-template={bolt.skillTemplateId}
      data-skill-event="projectile_spawn"
      data-vfx-key={bolt.vfxKey}
      data-projectile-id={bolt.projectileId}
      data-skill-id={bolt.skillId ?? bolt.skillTemplateId}
      data-spawn-world-x={bolt.x}
      data-spawn-world-y={bolt.y}
      data-current-world-x={point.x}
      data-current-world-y={point.y}
      data-direction-world-x={direction.x}
      data-direction-world-y={direction.y}
      data-velocity-world-x={bolt.velocityX ?? direction.x}
      data-velocity-world-y={bolt.velocityY ?? direction.y}
      data-impact-world-x={bolt.targetX}
      data-impact-world-y={bolt.targetY}
      data-projectile-speed={bolt.projectileSpeed}
      data-projectile-trajectory={bolt.trajectory}
      data-projectile-alive-remaining={aliveRemaining}
      aria-hidden="true"
    >
      <span className="burning-shot-projectile-vfx__trail burning-shot-projectile-vfx__trail-a" />
      <span className="burning-shot-projectile-vfx__trail burning-shot-projectile-vfx__trail-b" />
      <span className="burning-shot-projectile-vfx__shaft" />
      <span className="burning-shot-projectile-vfx__head" />
      <span className="burning-shot-projectile-vfx__core" />
    </span>
  );
}

function SparkleProjectileView({
  bolt,
  depthIndex,
  projectBattleWorldToScreen,
  normalizedWorldDirection,
  worldDirectionToBattleScreenAngle,
  zIndexBase
}: {
  bolt: ProjectileBodyViewModel;
  depthIndex: number;
  projectBattleWorldToScreen: (worldX: number, worldY: number) => Point;
  normalizedWorldDirection: (direction: Point) => Point;
  worldDirectionToBattleScreenAngle: (direction: Point, origin: Point) => number;
  zIndexBase: number;
}) {
  const vfxScale = normalizedVfxScale(bolt.vfxScale);
  const duration = Math.max(0.001, bolt.duration);
  const aliveRemaining = fireBoltAliveRemaining(bolt);
  const opacity = projectileBodyOpacity(bolt);
  const travel = fireBoltTravel(bolt);
  const point = fireBoltWorldPoint(bolt, travel);
  const visualPoint = projectBattleWorldToScreen(point.x, point.y);
  const direction = normalizedWorldDirection({
    x: typeof bolt.velocityX === "number" ? bolt.velocityX : bolt.directionX,
    y: typeof bolt.velocityY === "number" ? bolt.velocityY : bolt.directionY
  });
  const angle = worldDirectionToBattleScreenAngle(direction, point);
  const speedScale = clamp((bolt.projectileSpeed ?? 520) / 520, 0.72, 1.28);
  const size = Math.max(18, Math.max(Number(bolt.projectileWidth ?? 36), Number(bolt.projectileHeight ?? 26)) * 0.86) * vfxScale;
  const style: CSSProperties = {
    left: visualPoint.x,
    top: visualPoint.y - 12,
    width: size,
    height: size,
    opacity,
    zIndex: zIndexBase + depthIndex,
    transform: `translate(-50%, -50%) rotate(${angle}rad) scale(${0.9 + Math.sin((duration - aliveRemaining) * 38) * 0.05})`
  };
  return (
    <span
      className="sparkle-projectile-vfx"
      style={style}
      data-skill-template={bolt.skillTemplateId}
      data-skill-event="projectile_spawn"
      data-vfx-key={bolt.vfxKey}
      data-projectile-id={bolt.projectileId}
      data-skill-id={bolt.skillId ?? bolt.skillTemplateId}
      data-current-world-x={point.x}
      data-current-world-y={point.y}
      data-direction-world-x={direction.x}
      data-direction-world-y={direction.y}
      data-projectile-speed={bolt.projectileSpeed}
      aria-hidden="true"
    >
      <span className="sparkle-projectile-vfx__trail" style={{ transform: `translate(-50%, -50%) scaleX(${speedScale})` }} />
      <span className="sparkle-projectile-vfx__arc sparkle-projectile-vfx__arc-a" />
      <span className="sparkle-projectile-vfx__arc sparkle-projectile-vfx__arc-b" />
      <span className="sparkle-projectile-vfx__core" />
    </span>
  );
}

function pulse(value: number) {
  return (Math.sin(value * Math.PI * 2) + 1) / 2;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
