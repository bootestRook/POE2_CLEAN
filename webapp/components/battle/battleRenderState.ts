import { compareDimetricDepth, dimetricDepth } from "../../isoDepth";
import { fallbackUnitVisualForMonster, resolveMonsterGeometryVisual } from "../../monsterGeometryVisuals";
import { selectEnemyUnitType } from "../../unitAssets";
import type { UnitAnimationContext } from "../../unitAnimation";
import type { Enemy } from "../../types/enemyTypes";
import { distance } from "../../utils/math2d";
import { unitMovementState } from "../../utils/runtimeMotion";
import { fireBoltWorldPoint, usesCanvasHitVfx, usesCanvasProjectileVfx } from "./projectileVfxPresentation";

type BattleRenderPlayer = {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
};

export type BattleRenderProjectile = {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  ttl: number;
  duration: number;
  fadeDuration?: number;
  projectileVisualMode?: string;
  trajectory?: string;
  arcHeight?: unknown;
  sineAmplitude?: unknown;
  sineFrequency?: unknown;
  vfxKey?: string;
  visualEffect?: string;
  skillTemplateId?: string;
};

export type BattleRenderHitVfx = {
  id: number;
  x: number;
  y: number;
  vfxKey?: string;
  skillTemplateId?: string;
};

export type BattleUnitVisualRuntime = {
  direction: "up" | "down" | "left" | "right";
  movementVector: { x: number; y: number };
  attackStartedAtMs?: number;
  attackUntilMs?: number;
};

export type BattleEnemyVisualRuntime = BattleUnitVisualRuntime;

export type BattleRenderEnemyEntity = Enemy & {
  kind: "enemy";
  playerDistance: number;
  renderScale: number;
};

export type BattleRenderPlayerEntity = BattleRenderPlayer & {
  kind: "player";
  id: "player";
  renderScale: number;
  guardActive: boolean;
};

export type BattleRenderEntity = BattleRenderEnemyEntity | BattleRenderPlayerEntity;

export type BattleRenderItem<
  TBolt extends BattleRenderProjectile = BattleRenderProjectile,
  THitVfx extends BattleRenderHitVfx = BattleRenderHitVfx
> =
  | BattleRenderEntity
  | { kind: "fire-bolt"; id: number; x: number; y: number; bolt: TBolt }
  | { kind: "hit-vfx"; id: number; x: number; y: number; vfx: THitVfx };

export type BattleAnimationContexts = {
  player: UnitAnimationContext;
  enemies: Map<number, UnitAnimationContext>;
};

export function createBattleRenderEntities(player: BattleRenderPlayer, enemies: Enemy[], renderScale: number): BattleRenderEntity[] {
  return [
    ...enemies.map((enemy) => ({
      kind: "enemy" as const,
      ...enemy,
      playerDistance: distance(enemy, player),
      renderScale
    })),
    { kind: "player" as const, id: "player" as const, x: player.x, y: player.y, hp: player.hp, maxHp: player.maxHp, renderScale, guardActive: false }
  ].sort(compareBattleRenderEntities);
}

export function createBattleRenderItems<
  TBolt extends BattleRenderProjectile,
  THitVfx extends BattleRenderHitVfx
>(
  player: BattleRenderPlayer,
  enemies: Enemy[],
  bolts: TBolt[],
  hitVfxs: THitVfx[],
  renderScale: number,
  guardActive = false
): BattleRenderItem<TBolt, THitVfx>[] {
  return [
    ...createBattleRenderEntities(player, enemies, renderScale).map((entity) => entity.kind === "player" ? { ...entity, guardActive } : entity),
    ...bolts
      .filter((bolt) => !usesCanvasProjectileVfx(bolt))
      .map((bolt) => {
        const point = fireBoltWorldPoint(bolt);
        return { kind: "fire-bolt" as const, id: bolt.id, x: point.x, y: point.y, bolt };
      }),
    ...hitVfxs
      .filter((vfx) => !usesCanvasHitVfx(vfx))
      .map((vfx) => ({ kind: "hit-vfx" as const, id: vfx.id, x: vfx.x, y: vfx.y, vfx }))
  ].sort(compareBattleRenderItems);
}

export function compareBattleRenderItems(left: BattleRenderItem, right: BattleRenderItem) {
  if (isBattleRenderEntity(left) && isBattleRenderEntity(right)) return compareBattleRenderEntities(left, right);
  return dimetricDepth(left.x, left.y) - dimetricDepth(right.x, right.y);
}

export function compareBattleRenderEntities(left: BattleRenderEntity, right: BattleRenderEntity) {
  const depth = compareDimetricDepth(left, right);
  if (left.kind === "enemy" && right.kind === "enemy") {
    const rarity = enemyBattleRenderRarityRank(left) - enemyBattleRenderRarityRank(right);
    if (rarity !== 0) return rarity;
    return depth || left.id - right.id;
  }
  if (Math.abs(depth) > 28) return depth;
  return battleRenderEntityRarityRank(left) - battleRenderEntityRarityRank(right);
}

export function isBattleRenderEntity(item: BattleRenderItem): item is BattleRenderEntity {
  return item.kind === "enemy" || item.kind === "player";
}

export function battleRenderEntityRarityRank(entity: BattleRenderEntity) {
  if (entity.kind === "player") return 2;
  return enemyBattleRenderRarityRank(entity);
}

export function enemyBattleRenderRarityRank(enemy: BattleRenderEnemyEntity) {
  const visual = resolveMonsterGeometryVisual(enemy.monsterId);
  const tier = enemy.spawnRarity ?? visual?.tier ?? (enemy.monsterId === "enemy_brute" ? "rare" : "normal");
  if (tier === "legendary_boss" || tier === "supreme_boss") return 4;
  if (tier === "rare") return 3;
  if (tier === "magic") return 1;
  return 0;
}

export function createBattleAnimationContexts(
  playerVisual: BattleUnitVisualRuntime,
  enemyVisuals: Map<number, BattleEnemyVisualRuntime>,
  enemies: Enemy[],
  player: { x: number; y: number },
  elapsedMs: number,
  playerMoveSpeed: number,
  basePlayerMoveSpeed: number
): BattleAnimationContexts {
  const playerMoving = Math.hypot(playerVisual.movementVector.x, playerVisual.movementVector.y) > 0.001;
  const enemyContexts = new Map<number, UnitAnimationContext>();
  enemies.forEach((enemy) => {
    const unitId = fallbackUnitVisualForMonster(enemy.monsterId ?? selectEnemyUnitType(enemy.id));
    const visual = enemyVisuals.get(enemy.id);
    const attackActive = visual?.attackUntilMs !== undefined && elapsedMs < visual.attackUntilMs;
    const movementVector = visual?.movementVector ?? { x: player.x - enemy.x, y: player.y - enemy.y };
    const moving = Math.hypot(movementVector.x, movementVector.y) > 0.001;
    const enemyMoveSpeed = moving ? 58 : 0;
    enemyContexts.set(enemy.id, {
      unitId,
      requestedState: attackActive ? "attack" : unitMovementState(moving, 58, enemyMoveSpeed),
      movementVector,
      fallbackDirection: visual?.direction ?? "down",
      elapsedMs,
      baseMoveSpeed: 58,
      currentMoveSpeed: enemyMoveSpeed,
      attackStartedAtMs: visual?.attackStartedAtMs,
      attackUntilMs: visual?.attackUntilMs
    });
  });

  return {
    player: {
      unitId: "player_adventurer",
      requestedState: unitMovementState(playerMoving, basePlayerMoveSpeed, playerMoveSpeed),
      movementVector: playerVisual.movementVector,
      fallbackDirection: playerVisual.direction,
      elapsedMs,
      baseMoveSpeed: basePlayerMoveSpeed,
      currentMoveSpeed: playerMoveSpeed
    },
    enemies: enemyContexts
  };
}

export function shouldRenderLegacyBattleItem(item: BattleRenderItem, canvasGeometryBattleObjects: boolean, canvasGeometrySkillEffects: boolean) {
  if (!canvasGeometryBattleObjects) return true;
  return item.kind === "hit-vfx" && !canvasGeometrySkillEffects;
}

export function enemyHitFlashAmount(lastDamagedAt: number | undefined, elapsedSeconds: number, flashSeconds: number, clampValue: (value: number, min: number, max: number) => number) {
  if (lastDamagedAt === undefined) return 0;
  const age = elapsedSeconds - lastDamagedAt;
  if (age < 0 || age > flashSeconds) return 0;
  return 1 - clampValue(age / flashSeconds, 0, 1);
}
