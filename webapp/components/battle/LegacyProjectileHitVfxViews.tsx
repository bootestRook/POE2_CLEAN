import type { CSSProperties } from "react";

type ShapeEffect = { id: string; text: string };

type LegacyProjectileViewModel = {
  id: number | string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  ttl: number;
  duration: number;
  areaScale: number;
  behaviorType?: string;
  vfxKey?: string;
  visualEffect?: string;
  damageType?: string;
  skillTemplateId?: string;
  trajectory?: string;
  arcHeight?: number;
  projectileVisualMode?: string;
  shapeEffects: readonly ShapeEffect[];
  projectileId?: string;
  vfxScale?: unknown;
};

type LegacyHitVfxViewModel = {
  x: number;
  y: number;
  ttl: number;
  duration: number;
  damageType?: string;
  vfxKey?: string;
  targetId?: number;
  shapeEffects: readonly ShapeEffect[];
  vfxScale?: unknown;
};

type ProjectPoint = (worldX: number, worldY: number) => { x: number; y: number };

export function LegacyFireBoltView<TBolt extends LegacyProjectileViewModel>({
  bolt,
  depthIndex,
  projectBattleWorldToScreen,
  normalizedVfxScale,
  projectileBodyOpacity,
  fireBoltTravel,
  fireBoltWorldPoint,
  ballisticArcVisualLift,
  ballisticShadowStyle,
  cssToken,
  visualTone,
  zIndexBase,
  fakeZ
}: {
  bolt: TBolt;
  depthIndex: number;
  projectBattleWorldToScreen: ProjectPoint;
  normalizedVfxScale: (value: unknown) => number;
  projectileBodyOpacity: (bolt: TBolt) => number;
  fireBoltTravel: (bolt: TBolt) => number;
  fireBoltWorldPoint: (bolt: TBolt, travel?: number) => { x: number; y: number };
  ballisticArcVisualLift: (bolt: TBolt, travel?: number) => number;
  ballisticShadowStyle: (bolt: TBolt, point: { x: number; y: number }, depthIndex: number, opacity: number, travel?: number) => CSSProperties | null;
  cssToken: (value: string | undefined) => string;
  visualTone: (value: string | undefined) => string;
  zIndexBase: number;
  fakeZ: number;
}) {
  const vfxScale = normalizedVfxScale(bolt.vfxScale);
  const startVisual = projectBattleWorldToScreen(bolt.x, bolt.y);
  const targetVisual = projectBattleWorldToScreen(bolt.targetX, bolt.targetY);
  const length = Math.hypot(targetVisual.x - startVisual.x, targetVisual.y - startVisual.y);
  const angle = Math.atan2(targetVisual.y - startVisual.y, targetVisual.x - startVisual.x);
  const behavior = cssToken(bolt.behaviorType || "projectile");
  const tone = visualTone(bolt.vfxKey || bolt.visualEffect || bolt.damageType);
  const duration = Math.max(0.001, bolt.duration);
  const isBurst = ["area", "melee", "orbit", "trap_or_mine"].includes(behavior);
  const isLine = behavior === "chain";
  const opacity = isBurst ? Math.max(0, Math.min(1, bolt.ttl / duration)) : projectileBodyOpacity(bolt);
  const travel = fireBoltTravel(bolt);
  const projectileX = startVisual.x + (targetVisual.x - startVisual.x) * travel;
  const projectileY = startVisual.y + (targetVisual.y - startVisual.y) * travel;
  const groundPoint = fireBoltWorldPoint(bolt, travel);
  const visualLift = ballisticArcVisualLift(bolt, travel);
  const shadowStyle = ballisticShadowStyle(bolt, groundPoint, depthIndex, opacity, travel);
  const burstSize = Math.max(74, 92 * bolt.areaScale) * vfxScale;
  const burstPoint = behavior === "melee" ? startVisual : targetVisual;
  const style: CSSProperties = isBurst
    ? {
        left: burstPoint.x,
        top: burstPoint.y,
        width: burstSize,
        height: burstSize,
        opacity,
        zIndex: zIndexBase + depthIndex,
        transform: `translate(-50%, -50%) rotate(${angle}rad)`
      }
    : isLine
      ? {
          left: startVisual.x,
          top: startVisual.y,
          width: length,
          opacity,
          zIndex: zIndexBase + depthIndex,
          transform: `rotate(${angle}rad)`
        }
      : {
          left: projectileX,
          top: projectileY - fakeZ - visualLift,
          width: 38,
          height: 24,
          opacity,
          zIndex: zIndexBase + depthIndex,
          transform: `translate(-50%, -50%) rotate(${angle}rad) scale(${vfxScale})`
        };
  return (
    <>
      {shadowStyle && (
        <span
          className="ballistic-projectile-shadow"
          style={shadowStyle}
          data-skill-event="projectile_spawn"
          data-projectile-id={bolt.projectileId}
          aria-hidden="true"
        />
      )}
      <div
        className={`fire-bolt skill-vfx skill-vfx-${behavior} skill-vfx-${tone} skill-vfx-${cssToken(bolt.vfxKey || bolt.visualEffect)}`}
        style={style}
        data-skill-template={bolt.skillTemplateId}
        data-skill-event="projectile_spawn"
        data-vfx-key={bolt.vfxKey}
        data-projectile-trajectory={bolt.trajectory}
        data-projectile-arc-height={bolt.arcHeight}
        data-projectile-visual-mode={bolt.projectileVisualMode}
        data-projectile-visual-lift={visualLift}
        data-shape-effects={bolt.shapeEffects.map((effect) => effect.id).join(",")}
      >
        <span className="skill-vfx-core" />
      </div>
    </>
  );
}

export function LegacyHitVfxView({
  vfx,
  depthIndex,
  projectBattleWorldToScreen,
  normalizedVfxScale,
  cssToken,
  visualTone,
  hasShapeEffect,
  zIndexBase
}: {
  vfx: LegacyHitVfxViewModel;
  depthIndex: number;
  projectBattleWorldToScreen: ProjectPoint;
  normalizedVfxScale: (value: unknown) => number;
  cssToken: (value: string | undefined) => string;
  visualTone: (value: string | undefined) => string;
  hasShapeEffect: (effects: readonly ShapeEffect[] | undefined, id: string) => boolean;
  zIndexBase: number;
}) {
  const duration = Math.max(0.001, vfx.duration);
  const opacity = Math.max(0, vfx.ttl / duration);
  const scale = (1 + (1 - opacity) * 0.55) * normalizedVfxScale(vfx.vfxScale);
  const visualPoint = projectBattleWorldToScreen(vfx.x, vfx.y);
  const hitTone = visualTone(vfx.damageType || vfx.vfxKey);
  const showFireBoltNova = hasShapeEffect(vfx.shapeEffects, "fire_bolt_nova");
  const showFireBoltRain = hasShapeEffect(vfx.shapeEffects, "fire_bolt_rain");
  const showFireBoltFork = hasShapeEffect(vfx.shapeEffects, "fire_bolt_fork");
  const shapeStyle = {
    left: visualPoint.x,
    top: visualPoint.y,
    opacity,
    zIndex: zIndexBase + depthIndex + 1,
    transform: `translate(-50%, -50%) scale(${normalizedVfxScale(vfx.vfxScale)})`
  };
  return (
    <>
      <div
        className={`skill-hit-vfx skill-vfx hit-vfx-tone-${hitTone} skill-vfx-${cssToken(vfx.vfxKey)}`}
        style={{ left: visualPoint.x, top: visualPoint.y, opacity, zIndex: zIndexBase + depthIndex, transform: `translate(-50%, -50%) scale(${scale})` }}
        data-skill-event="hit_vfx"
        data-vfx-key={vfx.vfxKey}
        data-damage-type={vfx.damageType}
        data-target-id={vfx.targetId}
        data-shape-effects={vfx.shapeEffects.map((effect) => effect.id).join(",")}
      />
      {showFireBoltFork && (
        <span
          className="hit-fork-sparks-vfx"
          style={shapeStyle}
          data-skill-event="hit_vfx"
          data-vfx-key={`${vfx.vfxKey}.fire_bolt_fork`}
          data-shape-effects={vfx.shapeEffects.map((effect) => effect.id).join(",")}
          aria-hidden="true"
        >
          {Array.from({ length: 7 }, (_, index) => <span key={index} className={`hit-fork-spark hit-fork-spark-${index + 1}`} />)}
        </span>
      )}
      {showFireBoltNova && (
        <span
          className="hit-nova-ring-vfx"
          style={shapeStyle}
          data-skill-event="hit_vfx"
          data-vfx-key={`${vfx.vfxKey}.fire_bolt_nova`}
          data-shape-effects={vfx.shapeEffects.map((effect) => effect.id).join(",")}
          aria-hidden="true"
        />
      )}
      {showFireBoltRain && (
        <span
          className="hit-meteor-rain-vfx"
          style={shapeStyle}
          data-skill-event="hit_vfx"
          data-vfx-key={`${vfx.vfxKey}.fire_bolt_rain`}
          data-shape-effects={vfx.shapeEffects.map((effect) => effect.id).join(",")}
          aria-hidden="true"
        >
          {Array.from({ length: 6 }, (_, index) => <span key={index} className={`hit-meteor-streak hit-meteor-streak-${index + 1}`} />)}
        </span>
      )}
    </>
  );
}
