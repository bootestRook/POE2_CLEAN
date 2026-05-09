import type { CSSProperties } from "react";
import { fallbackUnitVisualForMonster } from "../../monsterGeometryVisuals";
import { selectEnemyUnitType } from "../../unitAssets";
import { resolveUnitAnimation } from "../../unitAnimation";
import type { UnitAnimationFrame } from "../../unitAnimation";
import { FireBoltView } from "./ProjectileBodyViews";
import type { ProjectileBodyViewModel } from "./ProjectileBodyViews";
import { HitVfxView } from "./HitAndBuffViews";
import type { HitVfxViewModel } from "./HitAndBuffViews";
import { UnitAnimationSprite } from "./UnitAnimationSprite";
import { enemyHitFlashAmount } from "./battleRenderState";
import type { BattleAnimationContexts, BattleRenderEntity, BattleRenderItem } from "./battleRenderState";

type Point = { x: number; y: number };
type ShapeEffect = { id: string; text: string };

export type BattleRenderPresentationHelpers = {
  projectBattleWorldToScreen: (worldX: number, worldY: number) => Point;
  normalizedWorldDirection: (direction: Point) => Point;
  worldDirectionToBattleScreenAngle: (direction: Point, origin: Point) => number;
  hasShapeEffect: (effects: readonly ShapeEffect[] | undefined, id: string) => boolean;
  clamp: (value: number, min: number, max: number) => number;
  zIndexBase: number;
  unitRenderScale: number;
  enemyHealthVisibleSeconds: number;
  enemyDamageFlashSeconds: number;
};

export type BattlePresentationRenderItem = BattleRenderItem<ProjectileBodyViewModel, HitVfxViewModel>;

export function renderBattleRenderItem(
  item: BattlePresentationRenderItem,
  depthIndex: number,
  animationContexts: BattleAnimationContexts,
  helpers: BattleRenderPresentationHelpers
) {
  if (item.kind === "fire-bolt") {
    return (
      <FireBoltView
        key={`fire-bolt-${item.id}`}
        bolt={item.bolt}
        depthIndex={depthIndex}
        projectBattleWorldToScreen={helpers.projectBattleWorldToScreen}
        normalizedWorldDirection={helpers.normalizedWorldDirection}
        worldDirectionToBattleScreenAngle={helpers.worldDirectionToBattleScreenAngle}
        zIndexBase={helpers.zIndexBase}
      />
    );
  }
  if (item.kind === "hit-vfx") {
    return (
      <HitVfxView
        key={`hit-vfx-${item.id}`}
        vfx={item.vfx}
        depthIndex={depthIndex}
        projectBattleWorldToScreen={helpers.projectBattleWorldToScreen}
        hasShapeEffect={helpers.hasShapeEffect}
        zIndexBase={helpers.zIndexBase}
      />
    );
  }
  return renderBattleEntity(item, depthIndex, animationContexts, helpers);
}

export function renderBattleEntity(
  entity: BattleRenderEntity,
  depthIndex: number,
  animationContexts: BattleAnimationContexts,
  helpers: BattleRenderPresentationHelpers
) {
  if (entity.kind === "player") {
    const animationFrame = resolveUnitAnimation(animationContexts.player);
    return (
      <div
        key="player"
        className={`player unit-visual unit-visual-player${entity.guardActive ? " unit-visual-player-guarded" : ""}`}
        style={battleUnitStyle(entity, animationFrame, depthIndex, helpers, entity.renderScale)}
        data-animation-state={animationFrame.animation.state}
        data-animation-direction={animationFrame.animation.direction}
        data-animation-playback-rate={animationFrame.playbackRate}
        aria-hidden="true"
      >
        <UnitAnimationSprite frame={animationFrame} />
      </div>
    );
  }

  const context = animationContexts.enemies.get(entity.id) ?? {
    unitId: fallbackUnitVisualForMonster(entity.monsterId ?? selectEnemyUnitType(entity.id)),
    requestedState: "idle" as const,
    movementVector: { x: 0, y: 0 },
    fallbackDirection: "down" as const,
    elapsedMs: 0,
    baseMoveSpeed: 58,
    currentMoveSpeed: 0
  };
  const animationFrame = resolveUnitAnimation(context);
  const healthVisible = entity.lastDamagedAt !== undefined
    && animationContexts.player.elapsedMs / 1000 - entity.lastDamagedAt <= helpers.enemyHealthVisibleSeconds;
  const hitFlash = enemyHitFlashAmount(entity.lastDamagedAt, animationContexts.player.elapsedMs / 1000, helpers.enemyDamageFlashSeconds, helpers.clamp);
  return (
    <div
      key={`enemy-${entity.id}`}
      className={`enemy unit-visual unit-visual-${animationFrame.animation.unitId}`}
      style={battleUnitStyle(entity, animationFrame, depthIndex, helpers, entity.renderScale)}
      data-enemy-id={entity.id}
      data-animation-state={animationFrame.animation.state}
      data-animation-direction={animationFrame.animation.direction}
      data-animation-playback-rate={animationFrame.playbackRate}
    >
      {healthVisible && (
        <div className="enemy-health" aria-hidden="true">
          <span style={{ width: `${Math.max(0, entity.hp / entity.maxHp) * 100}%` }} />
        </div>
      )}
      <UnitAnimationSprite frame={animationFrame} hitFlash={hitFlash} />
    </div>
  );
}

export function battleUnitStyle(
  entity: { x: number; y: number },
  frame: UnitAnimationFrame,
  depthIndex: number,
  helpers: Pick<BattleRenderPresentationHelpers, "projectBattleWorldToScreen" | "zIndexBase" | "unitRenderScale">,
  renderScale = helpers.unitRenderScale
): CSSProperties {
  const visualPoint = helpers.projectBattleWorldToScreen(entity.x, entity.y);
  const asset = frame.animation;
  return {
    left: visualPoint.x,
    top: visualPoint.y,
    width: asset.frameWidth,
    height: asset.frameHeight,
    zIndex: helpers.zIndexBase + depthIndex,
    "--unit-anchor-x": asset.anchorX,
    "--unit-anchor-y": asset.anchorY,
    "--unit-render-scale": renderScale * asset.scale
  } as CSSProperties;
}
