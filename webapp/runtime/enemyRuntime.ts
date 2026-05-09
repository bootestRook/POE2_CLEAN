import { isMapPointWalkable, resolveWalkableMove } from "../bakedMapLoader";
import type { BakedBattleMapData } from "../bakedMapLoader";
import { isNemesisRarity } from "../mapSpawnRuntime";
import { MONSTER_GEOMETRY_VISUALS, resolveMonsterGeometryVisual } from "../monsterGeometryVisuals";
import type { Enemy, EnemyRuntimeTier, RuntimeBoundaryScanSummary } from "../types/enemyTypes";
import { clamp, distance, guideDirection, normalizeMoveVector } from "../utils/math2d";

export const ENEMY_SPATIAL_CHUNK_SIZE = 256;
export const ENEMY_AWARE_RANGE = 900;
export const ENEMY_ACTIVE_RANGE = 560;
export const ENEMY_VISIBLE_RANGE = 760;
export const ENEMY_CAMERA_VISIBLE_RANGE = 1180;
export const ENEMY_INDIVIDUAL_AGGRO_RADIUS = 320;
export const ENEMY_LOW_FREQUENCY_THINK_INTERVAL = 0.18;
export const MAX_VISIBLE_ENEMY_DOM_NODES = 180;
export const MAX_RUNTIME_SIMULATED_ENEMIES = 240;
export const MONSTER_CHASE_SPEED = 190;
export const BOSS_CHASE_SPEED = 120;
export const PLAYER_GEOMETRY_RADIUS = 18;
export const ENEMY_MELEE_ATTACK_DISTANCE = 42;
export const ENEMY_MELEE_ATTACK_RANGE_MAX = 120;
export const ENEMY_MELEE_CONTACT_GAP = 4;
export const ENEMY_MELEE_EDGE_CONTACT_TOLERANCE = 14;
export const ENEMY_ATTACK_VISUAL_DURATION_MS = 640;
export const ENEMY_ATTACK_VISUAL_COOLDOWN_MS = 520;
export const ENEMY_WALK_VISUAL_DEADZONE = 0.35;
export const ENEMY_HEALTH_VISIBLE_SECONDS = 5;
export const ENEMY_DAMAGE_FLASH_SECONDS = 0.22;
export const ENEMY_COLLISION_RADIUS = 25;
export const ENEMY_BOSS_COLLISION_RADIUS = 40;
export const ENEMY_COLLISION_MAX_PUSH = 2.2;
export const ENEMY_PLAYER_CONTACT_HOLD_RADIUS = 42;
export const ENEMY_PLAYER_CONTACT_SLOW_RADIUS = 84;
export const ENEMY_PLAYER_BODY_SOFT_RADIUS = 0;
export const ENEMY_PLAYER_BODY_REPEL_FORCE = 2.25;
export const ENEMY_SWARM_INNER_RING_RADIUS = 88;
export const ENEMY_SWARM_RING_SPACING = 30;
export const ENEMY_SWARM_RING_COUNT = 4;
export const ENEMY_SWARM_SEPARATION_RATIO = 1.04;
export const ENEMY_SWARM_SEPARATION_FORCE = 1.2;
export const ENEMY_SWARM_TANGENT_FORCE = 0;
export const ENEMY_DIRECT_CHARGE_TANGENT_FORCE = 0.85;
export const ENEMY_SWARM_MAX_REPEL = 1.35;
export const ENEMY_SWARM_MIN_CHASE_WEIGHT = 0.58;
export const ENEMY_SWARM_VELOCITY_LERP = 0.24;
export const ENEMY_SWARM_DENSE_SLOWDOWN = 0.28;
export const ENEMY_SOFT_OVERLAP_RATIO = 0.84;
export const ENEMY_STEERING_LOOKAHEAD = 96;
export const ENEMY_STEERING_NEIGHBOR_RADIUS = 128;
export const ENEMY_STEERING_COMFORT_GAP = 4;
export const ENEMY_STEERING_MIN_SPEED_SCALE = 0.48;
export const ENEMY_STEERING_ANGLE_OFFSETS = [0, 18, -18, 36, -36, 58, -58, 82, -82, 112, -112].map((degrees) => degrees * Math.PI / 180);
export const ENEMY_APPROACH_RING_RADIUS = 72;
export const ENEMY_APPROACH_SIDE_STEP = 24;
export const ENEMY_APPROACH_MAX_SIDE_OFFSET = 72;
export const ENEMY_MELEE_SLOT_ANGLE_STEP = 22.5 * Math.PI / 180;
export const ENEMY_CROWD_SCORE_RADIUS = 118;
export const ENEMY_CROWD_SLOT_PENALTY = 34;
export const ENEMY_WALL_CLEARANCE_RADIUS = 72;
export const ENEMY_WALL_CLEARANCE_STEP = 24;
export const ENEMY_WALL_COLLISION_PENALTY = 4.8;
export const ENEMY_WALL_CLEARANCE_BONUS = 0.42;
export const ENEMY_NAVIGATION_INF = 1_000_000;
export const ENEMY_NAVIGATION_OCCUPANCY_COST = 8.5;
export const ENEMY_NAVIGATION_WALL_COST = 3.6;
export const ENEMY_NAVIGATION_LOCAL_OCCUPANCY_SCORE = 0.14;
export const ENEMY_NAVIGATION_LOCAL_WALL_SCORE = 0.7;
export const ENEMY_NAVIGATION_SWITCH_MARGIN = 0.72;
export const ENEMY_NAVIGATION_TARGET_RADIUS_CELLS = 3;
export const ENEMY_NAVIGATION_WALL_CHECK_RADIUS_CELLS = 2;
export const ENEMY_NAVIGATION_DIRECTIONS = [
  { x: 1, y: 0, cost: 1 },
  { x: -1, y: 0, cost: 1 },
  { x: 0, y: 1, cost: 1 },
  { x: 0, y: -1, cost: 1 },
  { x: 1, y: 1, cost: Math.SQRT2 },
  { x: -1, y: 1, cost: Math.SQRT2 },
  { x: 1, y: -1, cost: Math.SQRT2 },
  { x: -1, y: -1, cost: Math.SQRT2 }
];
export type EnemySpatialIndex = {
  chunkSize: number;
  chunks: Map<string, Enemy[]>;
};

const ENEMY_SPATIAL_INDEX_CACHE = new WeakMap<Enemy[], EnemySpatialIndex>();

type EnemyNavigationContext = {
  map: BakedBattleMapData;
  width: number;
  height: number;
  cellSize: number;
  field: number[];
  occupancy: number[];
  wallCost: number[];
};

type EnemyNavigationHeapNode = {
  index: number;
  cost: number;
};

export function createEnemySpatialIndex(enemies: Enemy[], chunkSize = ENEMY_SPATIAL_CHUNK_SIZE): EnemySpatialIndex {
  const chunks = new Map<string, Enemy[]>();
  for (const enemy of enemies) {
    if (enemy.hp <= 0 || enemy.runtimeTier === "dead") continue;
    const key = enemySpatialChunkKey(enemy.x, enemy.y, chunkSize);
    const chunk = chunks.get(key);
    if (chunk) chunk.push(enemy);
    else chunks.set(key, [enemy]);
  }
  return { chunkSize, chunks };
}

export function queryEnemySpatialIndex(index: EnemySpatialIndex, center: { x: number; y: number }, radius: number) {
  const minX = Math.floor((center.x - radius) / index.chunkSize);
  const maxX = Math.floor((center.x + radius) / index.chunkSize);
  const minY = Math.floor((center.y - radius) / index.chunkSize);
  const maxY = Math.floor((center.y + radius) / index.chunkSize);
  const result: Enemy[] = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const chunk = index.chunks.get(`${x}:${y}`);
      if (!chunk) continue;
      for (const enemy of chunk) {
        if (distance(enemy, center) <= radius) result.push(enemy);
      }
    }
  }
  return result;
}

export function enemySpatialChunkKey(x: number, y: number, chunkSize: number) {
  return `${Math.floor(x / chunkSize)}:${Math.floor(y / chunkSize)}`;
}

export function candidateEnemiesNear(enemies: Enemy[], center: { x: number; y: number }, radius: number) {
  let spatialIndex = ENEMY_SPATIAL_INDEX_CACHE.get(enemies);
  if (!spatialIndex) {
    spatialIndex = createEnemySpatialIndex(enemies);
    ENEMY_SPATIAL_INDEX_CACHE.set(enemies, spatialIndex);
  }
  return queryEnemySpatialIndex(spatialIndex, center, radius);
}

export function createEnemyNavigationContext(enemies: Enemy[], player: { x: number; y: number }, map: BakedBattleMapData | null): EnemyNavigationContext | null {
  if (!map) return null;
  const width = map.gridWidth;
  const height = map.gridHeight;
  const cellSize = map.meta.grid_size;
  const size = width * height;
  const context: EnemyNavigationContext = {
    map,
    width,
    height,
    cellSize,
    field: Array(size).fill(ENEMY_NAVIGATION_INF),
    occupancy: Array(size).fill(0),
    wallCost: Array(size).fill(0)
  };

  for (let gridY = 0; gridY < height; gridY += 1) {
    for (let gridX = 0; gridX < width; gridX += 1) {
      const index = enemyGridIndex(context, gridX, gridY);
      context.wallCost[index] = enemyGridWallCost(map, gridX, gridY);
    }
  }

  for (const enemy of enemies) {
    if (enemy.hp <= 0 || enemy.runtimeTier === "dead") continue;
    const cell = enemyWorldToGrid(map, enemy);
    addEnemyNavigationOccupancy(context, cell.gridX, cell.gridY, 1);
    for (const direction of ENEMY_NAVIGATION_DIRECTIONS) {
      addEnemyNavigationOccupancy(context, cell.gridX + direction.x, cell.gridY + direction.y, 0.28);
    }
  }

  const targets = enemyNavigationTargetCells(map, player);
  if (targets.length === 0) return null;

  const heap: EnemyNavigationHeapNode[] = [];
  for (const target of targets) {
    const index = enemyGridIndex(context, target.gridX, target.gridY);
    const initialCost = context.wallCost[index] * ENEMY_NAVIGATION_WALL_COST;
    if (initialCost >= context.field[index]) continue;
    context.field[index] = initialCost;
    enemyNavigationHeapPush(heap, { index, cost: initialCost });
  }

  while (heap.length > 0) {
    const current = enemyNavigationHeapPop(heap)!;
    if (current.cost !== context.field[current.index]) continue;
    const gridX = current.index % width;
    const gridY = Math.floor(current.index / width);
    for (const direction of ENEMY_NAVIGATION_DIRECTIONS) {
      const nextX = gridX + direction.x;
      const nextY = gridY + direction.y;
      if (!enemyCanStepGrid(map, gridX, gridY, nextX, nextY)) continue;
      const nextIndex = enemyGridIndex(context, nextX, nextY);
      const nextCost = current.cost
        + direction.cost
        + context.wallCost[nextIndex] * ENEMY_NAVIGATION_WALL_COST;
      if (nextCost >= context.field[nextIndex]) continue;
      context.field[nextIndex] = nextCost;
      enemyNavigationHeapPush(heap, { index: nextIndex, cost: nextCost });
    }
  }

  return context;
}

export function createRuntimeEnemyNavigationContext(enemies: Enemy[], player: { x: number; y: number }, map: BakedBattleMapData | null) {
  return createEnemyNavigationContext(enemies, player, map);
}

export function enemyNavigationTargetCells(map: BakedBattleMapData, player: { x: number; y: number }) {
  const center = enemyWorldToGrid(map, player);
  const result: { gridX: number; gridY: number }[] = [];
  if (enemyGridWalkable(map, center.gridX, center.gridY)) return [center];
  for (let y = -ENEMY_NAVIGATION_TARGET_RADIUS_CELLS; y <= ENEMY_NAVIGATION_TARGET_RADIUS_CELLS; y += 1) {
    for (let x = -ENEMY_NAVIGATION_TARGET_RADIUS_CELLS; x <= ENEMY_NAVIGATION_TARGET_RADIUS_CELLS; x += 1) {
      const distanceCells = Math.hypot(x, y);
      if (distanceCells < 1 || distanceCells > ENEMY_NAVIGATION_TARGET_RADIUS_CELLS) continue;
      const gridX = center.gridX + x;
      const gridY = center.gridY + y;
      if (!enemyGridWalkable(map, gridX, gridY)) continue;
      result.push({ gridX, gridY });
    }
  }
  return result;
}

export function addEnemyNavigationOccupancy(context: EnemyNavigationContext, gridX: number, gridY: number, amount: number) {
  if (!enemyGridInBounds(context, gridX, gridY)) return;
  context.occupancy[enemyGridIndex(context, gridX, gridY)] += amount;
}

export function enemyGridWallCost(map: BakedBattleMapData, gridX: number, gridY: number) {
  if (!enemyGridWalkable(map, gridX, gridY)) return ENEMY_NAVIGATION_INF;
  let nearestBlocked = ENEMY_NAVIGATION_WALL_CHECK_RADIUS_CELLS + 1;
  for (let y = -ENEMY_NAVIGATION_WALL_CHECK_RADIUS_CELLS; y <= ENEMY_NAVIGATION_WALL_CHECK_RADIUS_CELLS; y += 1) {
    for (let x = -ENEMY_NAVIGATION_WALL_CHECK_RADIUS_CELLS; x <= ENEMY_NAVIGATION_WALL_CHECK_RADIUS_CELLS; x += 1) {
      if (x === 0 && y === 0) continue;
      const distanceCells = Math.hypot(x, y);
      if (distanceCells > ENEMY_NAVIGATION_WALL_CHECK_RADIUS_CELLS || distanceCells >= nearestBlocked) continue;
      if (!enemyGridWalkable(map, gridX + x, gridY + y)) nearestBlocked = distanceCells;
    }
  }
  if (nearestBlocked > ENEMY_NAVIGATION_WALL_CHECK_RADIUS_CELLS) return 0;
  return (ENEMY_NAVIGATION_WALL_CHECK_RADIUS_CELLS + 1 - nearestBlocked) / ENEMY_NAVIGATION_WALL_CHECK_RADIUS_CELLS;
}

export function enemyWorldToGrid(map: BakedBattleMapData, point: { x: number; y: number }) {
  return {
    gridX: clamp(Math.floor(point.x / map.meta.grid_size), 0, map.gridWidth - 1),
    gridY: clamp(Math.floor(point.y / map.meta.grid_size), 0, map.gridHeight - 1)
  };
}

export function enemyGridCenter(map: BakedBattleMapData, gridX: number, gridY: number) {
  return {
    x: gridX * map.meta.grid_size + map.meta.grid_size / 2,
    y: gridY * map.meta.grid_size + map.meta.grid_size / 2
  };
}

export function enemyGridIndex(context: Pick<EnemyNavigationContext, "width">, gridX: number, gridY: number) {
  return gridY * context.width + gridX;
}

export function enemyGridInBounds(context: Pick<EnemyNavigationContext, "width" | "height">, gridX: number, gridY: number) {
  return gridX >= 0 && gridY >= 0 && gridX < context.width && gridY < context.height;
}

export function enemyGridWalkable(map: BakedBattleMapData, gridX: number, gridY: number) {
  return Boolean(map.walkableGrid[gridY]?.[gridX]);
}

export function enemyCanStepGrid(map: BakedBattleMapData, fromX: number, fromY: number, toX: number, toY: number) {
  if (!enemyGridWalkable(map, toX, toY)) return false;
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (Math.abs(dx) + Math.abs(dy) <= 1) return true;
  return enemyGridWalkable(map, fromX + dx, fromY) && enemyGridWalkable(map, fromX, fromY + dy);
}

export function enemyNavigationHeapPush(heap: EnemyNavigationHeapNode[], node: EnemyNavigationHeapNode) {
  heap.push(node);
  let index = heap.length - 1;
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2);
    if (heap[parent].cost <= node.cost) break;
    heap[index] = heap[parent];
    index = parent;
  }
  heap[index] = node;
}

export function enemyNavigationHeapPop(heap: EnemyNavigationHeapNode[]) {
  if (heap.length === 0) return null;
  const result = heap[0];
  const last = heap.pop()!;
  if (heap.length === 0) return result;
  let index = 0;
  while (true) {
    const left = index * 2 + 1;
    const right = left + 1;
    if (left >= heap.length) break;
    const child = right < heap.length && heap[right].cost < heap[left].cost ? right : left;
    if (heap[child].cost >= last.cost) break;
    heap[index] = heap[child];
    index = child;
  }
  heap[index] = last;
  return result;
}

export function updateRuntimeEnemies(
  current: Enemy[],
  player: { x: number; y: number },
  map: BakedBattleMapData | null,
  dt: number,
  elapsedSeconds: number,
  authoredSpawnPlanActive: boolean,
  aggroSources: RuntimeEncounterAggroSource[] = [],
  triggeredSourceIds: Set<string> = new Set(),
  attackLockedEnemyIds: Set<number> = new Set()
) {
  const movingCurrent = current
    .filter((enemy) => shouldRetainEnemyForGameplayOrDamageFlash(enemy, elapsedSeconds))
    .map((enemy) => resetEnemyEngagement(enemy));
  if (!authoredSpawnPlanActive) {
    const spatialIndex = createEnemySpatialIndex(movingCurrent);
    const navigation = createRuntimeEnemyNavigationContext(movingCurrent, player, map);
    return separateOverlappingEnemies(
      movingCurrent.map((enemy) => {
        if (enemy.hp <= 0) return { ...enemy, velocityX: 0, velocityY: 0, runtimeTier: "dead" as const };
        const survivalEnemy = { ...enemy, aggroLocked: true };
        if (isEnemyKnockbackLocked(survivalEnemy, elapsedSeconds)) return freezeAttackingEnemy(survivalEnemy, "active");
        return attackLockedEnemyIds.has(enemy.id)
          ? freezeAttackingEnemy(survivalEnemy, "active")
          : moveEnemyTowardPlayer(survivalEnemy, player, map, dt, "active", spatialIndex, navigation);
      }),
      map,
      attackLockedEnemyIds,
      player
    );
  }
  const spatialIndex = createEnemySpatialIndex(movingCurrent);
  const nearbyEnemyAggroSourceIds = new Set(
    queryEnemySpatialIndex(spatialIndex, player, ENEMY_INDIVIDUAL_AGGRO_RADIUS)
      .flatMap((enemy) => enemy.spawnPlanSourceId ? [enemy.spawnPlanSourceId] : [])
  );
  for (const source of aggroSources) {
    if (!triggeredSourceIds.has(source.id) && (distance(source, player) <= source.aggroRadius || nearbyEnemyAggroSourceIds.has(source.id))) {
      triggeredSourceIds.add(source.id);
    }
  }
  const navigation = createRuntimeEnemyNavigationContext(movingCurrent, player, map);
  const visibleIds = new Set(queryEnemySpatialIndex(spatialIndex, player, ENEMY_CAMERA_VISIBLE_RANGE).map((enemy) => enemy.id));
  const activeIds = new Set(queryEnemySpatialIndex(spatialIndex, player, ENEMY_ACTIVE_RANGE).map((enemy) => enemy.id));
  const simulationIds = runtimeEnemySimulationIds(movingCurrent, player);
  const movedEnemies = movingCurrent.map((enemy) => {
    if (enemy.hp <= 0) return { ...enemy, runtimeTier: "dead" as const };
    if (!simulationIds.has(enemy.id)) {
      const tier: EnemyRuntimeTier = visibleIds.has(enemy.id) ? "visible" : "dormant";
      return { ...enemy, runtimeTier: tier, velocityX: 0, velocityY: 0 };
    }
    const aggroLocked = Boolean(enemy.aggroLocked || (enemy.spawnPlanSourceId && triggeredSourceIds.has(enemy.spawnPlanSourceId)));
    if (!aggroLocked) {
      const tier: EnemyRuntimeTier = visibleIds.has(enemy.id) ? "visible" : "dormant";
      return { ...enemy, aggroLocked: false, runtimeTier: tier, velocityX: 0, velocityY: 0 };
    }
    const tier: EnemyRuntimeTier = visibleIds.has(enemy.id)
      ? "visible"
      : activeIds.has(enemy.id)
        ? "active"
        : "aware";
    if (attackLockedEnemyIds.has(enemy.id)) {
      return {
        ...freezeAttackingEnemy(enemy, tier),
        aggroLocked,
        nextThinkAt: tier === "aware" ? elapsedSeconds + ENEMY_LOW_FREQUENCY_THINK_INTERVAL : elapsedSeconds
      };
    }
    if (isEnemyKnockbackLocked(enemy, elapsedSeconds)) {
      return {
        ...freezeAttackingEnemy(enemy, tier),
        aggroLocked,
        nextThinkAt: tier === "aware" ? elapsedSeconds + ENEMY_LOW_FREQUENCY_THINK_INTERVAL : elapsedSeconds
      };
    }
    if (tier === "aware" && (enemy.nextThinkAt ?? 0) > elapsedSeconds) return { ...enemy, runtimeTier: tier };
    const moved = moveEnemyTowardPlayer(enemy, player, map, tier === "aware" ? dt * 0.35 : dt, tier, spatialIndex, navigation);
    return {
      ...moved,
      aggroLocked,
      nextThinkAt: tier === "aware" ? elapsedSeconds + ENEMY_LOW_FREQUENCY_THINK_INTERVAL : elapsedSeconds
    };
  }).filter((enemy) => enemy.runtimeTier !== "dead" || shouldRetainEnemyForDamageFlash(enemy, elapsedSeconds));
  return separateOverlappingEnemies(movedEnemies, map, attackLockedEnemyIds, player);
}

export function resetEnemyEngagement(enemy: Enemy): Enemy {
  if (enemy.engagementTier === undefined && enemy.engagementRing === undefined && enemy.engagementSlot === undefined) return enemy;
  return {
    ...enemy,
    engagementTier: undefined,
    engagementRing: undefined,
    engagementSlot: undefined
  };
}

export function isEnemyNemesis(enemy: Enemy) {
  return enemy.nemesis === true || isNemesisRarity(enemy.spawnRarity);
}

export function monsterAttackRange(enemy: Enemy) {
  const configuredRange = Math.max(1, enemy.attackRange ?? ENEMY_MELEE_ATTACK_DISTANCE);
  return Math.max(configuredRange, meleeContactAttackRange(enemy));
}

export function monsterMeleeReachRange(enemy: Enemy) {
  const configuredRange = Math.max(1, enemy.attackRange ?? ENEMY_MELEE_ATTACK_DISTANCE);
  if (configuredRange > ENEMY_MELEE_ATTACK_RANGE_MAX) return monsterAttackRange(enemy);
  return monsterAttackRange(enemy) + ENEMY_MELEE_EDGE_CONTACT_TOLERANCE;
}

export function meleeContactAttackRange(enemy: Enemy) {
  return PLAYER_GEOMETRY_RADIUS + enemyVisualRadius(enemy) + ENEMY_MELEE_CONTACT_GAP;
}

export function enemyVisualRadius(enemy: Enemy) {
  const visual = resolveMonsterGeometryVisual(enemy.monsterId);
  if (visual) return visual.sizePx * 0.5;
  return enemy.boss || enemy.monsterId === "enemy_brute" ? ENEMY_BOSS_COLLISION_RADIUS : ENEMY_COLLISION_RADIUS;
}

export function monsterAttackCadenceMs(enemy: Enemy) {
  return Math.max(120, enemy.attackCadenceMs ?? ENEMY_ATTACK_VISUAL_DURATION_MS + ENEMY_ATTACK_VISUAL_COOLDOWN_MS);
}

export function canEnemyStartRuntimeAttack(
  enemy: Enemy,
  player: { x: number; y: number },
  nowMs: number,
  map?: BakedBattleMapData | null
) {
  const attackActive = enemy.attackUntilMs !== undefined && nowMs < enemy.attackUntilMs;
  if (attackActive || nowMs < (enemy.nextAttackReadyAtMs ?? 0)) return false;
  if (enemy.authored && !enemy.aggroLocked) return false;
  return canEnemyReachPlayerForMelee(enemy, player, map);
}

export function canEnemyReachPlayerForMelee(
  enemy: Enemy,
  player: { x: number; y: number },
  map?: BakedBattleMapData | null
) {
  if (distance(enemy, player) > monsterMeleeReachRange(enemy)) return false;
  if (!map) return true;
  const enemyCell = enemyWorldToGrid(map, enemy);
  const playerCell = enemyWorldToGrid(map, player);
  if (enemyCell.gridX === playerCell.gridX && enemyCell.gridY === playerCell.gridY) return true;
  if (enemyCanStepGrid(map, enemyCell.gridX, enemyCell.gridY, playerCell.gridX, playerCell.gridY)) return true;
  return enemyHasWalkableLine(map, enemy, player);
}

export function freezeAttackingEnemy(enemy: Enemy, runtimeTier: EnemyRuntimeTier): Enemy {
  return {
    ...enemy,
    runtimeTier,
    velocityX: 0,
    velocityY: 0
  };
}

export function isEnemyKnockbackLocked(enemy: Enemy, elapsedSeconds: number) {
  return Number(enemy.knockbackUntilMs ?? 0) > elapsedSeconds * 1000;
}

export function moveEnemyTowardPlayer(
  enemy: Enemy,
  player: { x: number; y: number },
  map: BakedBattleMapData | null,
  dt: number,
  runtimeTier: EnemyRuntimeTier,
  spatialIndex?: EnemySpatialIndex,
  navigation?: EnemyNavigationContext | null
): Enemy {
  const approachTarget = enemyNavigationMoveTarget(enemy, player, map, navigation);
  const dx = approachTarget.x - enemy.x;
  const dy = approachTarget.y - enemy.y;
  const length = Math.hypot(dx, dy);
  const baseSpeed = isEnemyNemesis(enemy) ? BOSS_CHASE_SPEED : MONSTER_CHASE_SPEED;
  const speed = baseSpeed * Math.max(0.1, enemy.movementSpeedMultiplier ?? 1);
  const playerDistance = distance(enemy, player);
  const attackRange = monsterAttackRange(enemy);
  if (playerDistance <= attackRange) {
    return {
      ...enemy,
      velocityX: 0,
      velocityY: 0,
      runtimeTier
    };
  }
  const directCharge = enemy.aggroLocked === true;
  const chaseWeight = directCharge
    ? 1
    : ENEMY_SWARM_MIN_CHASE_WEIGHT * clamp(
      (playerDistance - ENEMY_PLAYER_CONTACT_HOLD_RADIUS) / Math.max(1, ENEMY_PLAYER_CONTACT_SLOW_RADIUS - ENEMY_PLAYER_CONTACT_HOLD_RADIUS),
      0,
      1
    );
  const fallbackAngle = ((enemy.id * 137) % 360) * Math.PI / 180;
  const desired = length > 1
    ? { x: dx / length, y: dy / length }
    : { x: Math.cos(fallbackAngle), y: Math.sin(fallbackAngle) };
  const steering = directCharge
    ? { x: 0, y: 0, speedScale: 1, active: false }
    : steerEnemySwarm(enemy, desired, spatialIndex);
  const playerRepelPressure = !directCharge && playerDistance < ENEMY_PLAYER_BODY_SOFT_RADIUS
    ? (ENEMY_PLAYER_BODY_SOFT_RADIUS - playerDistance) / ENEMY_PLAYER_BODY_SOFT_RADIUS
    : 0;
  const fromPlayer = playerDistance > 0.001
    ? { x: (enemy.x - player.x) / playerDistance, y: (enemy.y - player.y) / playerDistance }
    : { x: -desired.x, y: -desired.y };
  const targetDirection = normalizeMoveVector({
    x: desired.x * chaseWeight + steering.x + fromPlayer.x * playerRepelPressure * ENEMY_PLAYER_BODY_REPEL_FORCE,
    y: desired.y * chaseWeight + steering.y + fromPlayer.y * playerRepelPressure * ENEMY_PLAYER_BODY_REPEL_FORCE
  });
  const previousVelocity = { x: enemy.velocityX ?? 0, y: enemy.velocityY ?? 0 };
  const targetVelocity = {
    x: targetDirection.x * speed * steering.speedScale,
    y: targetDirection.y * speed * steering.speedScale
  };
  const nextVelocity = directCharge
    ? targetVelocity
    : {
      x: previousVelocity.x + (targetVelocity.x - previousVelocity.x) * ENEMY_SWARM_VELOCITY_LERP,
      y: previousVelocity.y + (targetVelocity.y - previousVelocity.y) * ENEMY_SWARM_VELOCITY_LERP
    };
  const velocityLength = Math.hypot(nextVelocity.x, nextVelocity.y);
  const clampedVelocity = velocityLength > speed
    ? { x: nextVelocity.x / velocityLength * speed, y: nextVelocity.y / velocityLength * speed }
    : nextVelocity;
  const approachTargetIsPlayer = distance(approachTarget, player) <= 0.001;
  const remainingApproachDistance = approachTargetIsPlayer
    ? playerDistance - attackRange
    : distance(enemy, approachTarget);
  const stepDistance = Math.min(Math.hypot(clampedVelocity.x, clampedVelocity.y) * dt, Math.max(0, remainingApproachDistance));
  const direction = normalizeMoveVector(clampedVelocity);
  const retreatingFromPlayer = !directCharge && playerRepelPressure > 0.02
    && direction.x * fromPlayer.x + direction.y * fromPlayer.y > 0.25;
  const movementTarget = retreatingFromPlayer
    ? {
      x: enemy.x + fromPlayer.x * ENEMY_PLAYER_BODY_SOFT_RADIUS,
      y: enemy.y + fromPlayer.y * ENEMY_PLAYER_BODY_SOFT_RADIUS
    }
    : approachTarget;
  const nextPosition = directCharge
    ? resolveEnemyDirectChargeMove(map, enemy, movementTarget, direction, stepDistance, spatialIndex)
    : resolveEnemySteeredMove(map, enemy, movementTarget, direction, stepDistance, steering.active, spatialIndex);
  return {
    ...enemy,
    x: nextPosition.x,
    y: nextPosition.y,
    velocityX: clampedVelocity.x,
    velocityY: clampedVelocity.y,
    runtimeTier,
    navTargetGridX: "gridX" in approachTarget ? Number(approachTarget.gridX) : undefined,
    navTargetGridY: "gridY" in approachTarget ? Number(approachTarget.gridY) : undefined
  };
}

export function resolveEnemyDirectChargeMove(
  map: BakedBattleMapData | null,
  enemy: Enemy,
  target: { x: number; y: number },
  direction: { x: number; y: number },
  stepDistance: number,
  spatialIndex?: EnemySpatialIndex
) {
  if (stepDistance <= 0.001) return enemy;
  const directNext = {
    x: enemy.x + direction.x * stepDistance,
    y: enemy.y + direction.y * stepDistance
  };
  if (!map) return directNext;
  const directResolved = resolveWalkableMove(map, enemy, directNext);
  const directMovedDistance = distance(enemy, directResolved);
  const directCrowdPenalty = enemyCrowdMovePenalty(enemy, directResolved, spatialIndex);
  const currentDistance = distance(enemy, target);
  const directProgress = currentDistance - distance(directResolved, target);
  if (directProgress > 0.001 && isMapPointWalkable(map, directNext.x, directNext.y)) {
    return directResolved;
  }
  if (directMovedDistance > stepDistance * 0.75 && directCrowdPenalty <= 0.001 && isMapPointWalkable(map, directNext.x, directNext.y)) {
    return directResolved;
  }

  const baseAngle = Math.atan2(direction.y, direction.x);
  const laneSign = enemyLaneSign(enemy);
  let bestPosition = directResolved;
  let bestScore = directMovedDistance - directCrowdPenalty;

  for (const offset of ENEMY_STEERING_ANGLE_OFFSETS) {
    const angle = baseAngle + offset * laneSign;
    const candidateDirection = { x: Math.cos(angle), y: Math.sin(angle) };
    const rawNext = {
      x: enemy.x + candidateDirection.x * stepDistance,
      y: enemy.y + candidateDirection.y * stepDistance
    };
    const resolved = resolveWalkableMove(map, enemy, rawNext);
    const movedDistance = distance(enemy, resolved);
    if (movedDistance <= 0.001) continue;
    const progress = currentDistance - distance(resolved, target);
    const crowdPenalty = enemyCrowdMovePenalty(enemy, resolved, spatialIndex);
    const wallScore = enemyWallMoveScore(map, rawNext, resolved, stepDistance);
    const turnPenalty = Math.abs(offset) * stepDistance * 0.12;
    const score = progress * 3.2 + movedDistance * 0.5 + wallScore - turnPenalty - crowdPenalty;
    if (score > bestScore) {
      bestScore = score;
      bestPosition = resolved;
    }
  }

  return bestPosition;
}

export function enemyNavigationMoveTarget(
  enemy: Enemy,
  player: { x: number; y: number },
  map: BakedBattleMapData | null,
  navigation?: EnemyNavigationContext | null
) {
  const approachTarget = enemyApproachTarget(enemy, player, map);
  if (!map || !navigation) return approachTarget;
  const playerDistance = distance(enemy, player);
  const directAttackDistance = monsterAttackRange(enemy) + map.meta.grid_size * 0.35;
  if (!enemy.aggroLocked && playerDistance <= ENEMY_APPROACH_RING_RADIUS * 1.8) {
    return approachTarget;
  }
  if (enemy.aggroLocked && playerDistance <= directAttackDistance * 1.35) {
    const occupancyTarget = enemyReachableMeleeOccupancyTarget(map, enemy, player);
    if (occupancyTarget) return occupancyTarget;
    if (enemyHasWalkableLine(map, enemy, approachTarget)) return approachTarget;
    const contactTarget = enemyLineReachablePlayerContactTarget(map, enemy, player);
    if (contactTarget) return contactTarget;
  }

  const cell = enemyWorldToGrid(map, enemy);
  const currentIndex = enemyGridIndex(navigation, cell.gridX, cell.gridY);
  if (navigation.field[currentIndex] >= ENEMY_NAVIGATION_INF) {
    return enemyUnreachableApproachTarget(map, enemy, cell, approachTarget);
  }

  let best = { gridX: cell.gridX, gridY: cell.gridY, score: navigation.field[currentIndex] };
  const laneSign = enemyLaneSign(enemy);
  const currentTargetValid = enemy.navTargetGridX !== undefined
    && enemy.navTargetGridY !== undefined
    && Math.abs(enemy.navTargetGridX - cell.gridX) <= 1
    && Math.abs(enemy.navTargetGridY - cell.gridY) <= 1
    && enemyCanStepGrid(map, cell.gridX, cell.gridY, enemy.navTargetGridX, enemy.navTargetGridY);
  let held = currentTargetValid ? enemyNavigationCandidateScore(navigation, enemy.navTargetGridX!, enemy.navTargetGridY!, laneSign, enemy.navTargetGridX! - cell.gridX, enemy.navTargetGridY! - cell.gridY) : null;

  for (const direction of ENEMY_NAVIGATION_DIRECTIONS) {
    const gridX = cell.gridX + direction.x;
    const gridY = cell.gridY + direction.y;
    if (!enemyCanStepGrid(map, cell.gridX, cell.gridY, gridX, gridY)) continue;
    const candidate = enemyNavigationCandidateScore(navigation, gridX, gridY, laneSign, direction.x, direction.y);
    if (candidate.score >= ENEMY_NAVIGATION_INF) continue;
    if (held !== null && candidate.score + ENEMY_NAVIGATION_SWITCH_MARGIN >= held.score) continue;
    held = null;
    if (candidate.score < best.score) best = candidate;
  }

  if (held !== null) best = held;
  if (best.gridX === cell.gridX && best.gridY === cell.gridY) return approachTarget;
  const center = enemyGridCenter(map, best.gridX, best.gridY);
  const fromPlayer = guideDirection(player, center);
  const perpendicular = { x: -fromPlayer.y, y: fromPlayer.x };
  const sideOffset = enemy.aggroLocked ? 0 : enemyLaneSign(enemy) * Math.min(map.meta.grid_size * 0.28, 10);
  return {
    x: center.x + perpendicular.x * sideOffset,
    y: center.y + perpendicular.y * sideOffset,
    gridX: best.gridX,
    gridY: best.gridY
  };
}

export function enemyUnreachableApproachTarget(
  map: BakedBattleMapData,
  enemy: Enemy,
  cell: { gridX: number; gridY: number },
  approachTarget: { x: number; y: number }
) {
  let best: { gridX: number; gridY: number; score: number } | null = null;
  for (const direction of ENEMY_NAVIGATION_DIRECTIONS) {
    const gridX = cell.gridX + direction.x;
    const gridY = cell.gridY + direction.y;
    if (!enemyCanStepGrid(map, cell.gridX, cell.gridY, gridX, gridY)) continue;
    const center = enemyGridCenter(map, gridX, gridY);
    const score = distance(center, approachTarget) + enemyGridWallCost(map, gridX, gridY) * map.meta.grid_size;
    if (!best || score < best.score) best = { gridX, gridY, score };
  }
  if (!best) return approachTarget;
  const currentScore = distance(enemyGridCenter(map, cell.gridX, cell.gridY), approachTarget);
  if (best.score >= currentScore) return approachTarget;
  return {
    ...enemyGridCenter(map, best.gridX, best.gridY),
    gridX: best.gridX,
    gridY: best.gridY
  };
}

export function enemyHasWalkableLine(map: BakedBattleMapData, from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length <= 0.001) return isMapPointWalkable(map, from.x, from.y);
  const step = Math.max(4, map.meta.grid_size * 0.35);
  const samples = Math.max(1, Math.ceil(length / step));
  for (let index = 1; index <= samples; index += 1) {
    const ratio = index / samples;
    if (!isMapPointWalkable(map, from.x + dx * ratio, from.y + dy * ratio)) return false;
  }
  return true;
}

export function enemyLineReachablePlayerContactTarget(
  map: BakedBattleMapData,
  enemy: Enemy,
  player: { x: number; y: number }
) {
  const center = enemyWorldToGrid(map, player);
  let best: ({ x: number; y: number; gridX: number; gridY: number; score: number } | null) = null;
  const maxCells = Math.max(2, ENEMY_NAVIGATION_TARGET_RADIUS_CELLS);
  for (let y = -maxCells; y <= maxCells; y += 1) {
    for (let x = -maxCells; x <= maxCells; x += 1) {
      const cellDistance = Math.hypot(x, y);
      if (cellDistance < 1 || cellDistance > maxCells) continue;
      const gridX = center.gridX + x;
      const gridY = center.gridY + y;
      if (!enemyGridWalkable(map, gridX, gridY)) continue;
      const target = { ...enemyGridCenter(map, gridX, gridY), gridX, gridY };
      if (!enemyHasWalkableLine(map, enemy, target)) continue;
      const playerDistance = distance(target, player);
      const enemyDistance = distance(enemy, target);
      const score = playerDistance * 1.6 + enemyDistance + enemyGridWallCost(map, gridX, gridY) * map.meta.grid_size * 0.35;
      if (!best || score < best.score) best = { ...target, score };
    }
  }
  return best ? { x: best.x, y: best.y, gridX: best.gridX, gridY: best.gridY } : null;
}

export function enemyNavigationCandidateScore(navigation: EnemyNavigationContext, gridX: number, gridY: number, laneSign: number, directionX: number, directionY: number) {
  if (!enemyGridInBounds(navigation, gridX, gridY)) return { gridX, gridY, score: ENEMY_NAVIGATION_INF };
  const index = enemyGridIndex(navigation, gridX, gridY);
  const fieldCost = navigation.field[index];
  if (fieldCost >= ENEMY_NAVIGATION_INF) return { gridX, gridY, score: ENEMY_NAVIGATION_INF };
  const laneBias = (directionX * laneSign + directionY * laneSign * 0.35) * -0.025;
  const score = fieldCost
    + navigation.occupancy[index] * ENEMY_NAVIGATION_LOCAL_OCCUPANCY_SCORE
    + navigation.wallCost[index] * ENEMY_NAVIGATION_LOCAL_WALL_SCORE
    + laneBias;
  return { gridX, gridY, score };
}

export function enemyApproachTarget(enemy: Enemy, player: { x: number; y: number }, map: BakedBattleMapData | null) {
  if (enemy.aggroLocked) return player;
  if (!map || isMapPointWalkable(map, player.x, player.y)) return player;
  const fromEnemy = guideDirection(enemy, player);
  return nearestWalkableApproachTarget(map, player, fromEnemy, 0, map.meta.grid_size) ?? player;
}

export function nearestWalkableApproachTarget(
  map: BakedBattleMapData,
  player: { x: number; y: number },
  away: { x: number; y: number },
  sideOffset: number,
  ringRadius: number
) {
  const baseAngle = Math.atan2(away.y, away.x);
  const sideSign = sideOffset >= 0 ? 1 : -1;
  let best: { x: number; y: number } | null = null;
  let bestScore = Infinity;
  for (const angleOffset of ENEMY_STEERING_ANGLE_OFFSETS) {
    const angle = baseAngle + angleOffset * sideSign;
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    const perpendicular = { x: -direction.y, y: direction.x };
    const candidate = {
      x: player.x + direction.x * ringRadius + perpendicular.x * sideOffset,
      y: player.y + direction.y * ringRadius + perpendicular.y * sideOffset
    };
    if (!isMapPointWalkable(map, candidate.x, candidate.y)) continue;
    const score = Math.abs(angleOffset) * 100 + distance(candidate, player);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

export function steerEnemySwarm(enemy: Enemy, desired: { x: number; y: number }, spatialIndex?: EnemySpatialIndex) {
  if (!spatialIndex) return { x: 0, y: 0, speedScale: 1, active: false };
  const neighbors = queryEnemySpatialIndex(spatialIndex, enemy, ENEMY_STEERING_NEIGHBOR_RADIUS);
  const perpendicular = { x: -desired.y, y: desired.x };
  const laneSign = enemyLaneSign(enemy);
  let repelX = 0;
  let repelY = 0;
  let tangentPressure = 0;
  let densityPressure = 0;

  for (const neighbor of neighbors) {
    if (neighbor.id === enemy.id || neighbor.hp <= 0 || neighbor.runtimeTier === "dead") continue;
    const fromNeighborX = enemy.x - neighbor.x;
    const fromNeighborY = enemy.y - neighbor.y;
    const gap = Math.hypot(fromNeighborX, fromNeighborY) || 1;
    const combinedRadius = enemyCollisionRadius(enemy) + enemyCollisionRadius(neighbor);
    const comfortDistance = combinedRadius * ENEMY_SWARM_SEPARATION_RATIO + ENEMY_STEERING_COMFORT_GAP;
    if (gap < comfortDistance) {
      const pressure = (comfortDistance - gap) / comfortDistance;
      repelX += (fromNeighborX / gap) * pressure;
      repelY += (fromNeighborY / gap) * pressure;
      densityPressure += pressure;
    }

    const toNeighborX = neighbor.x - enemy.x;
    const toNeighborY = neighbor.y - enemy.y;
    const forward = toNeighborX * desired.x + toNeighborY * desired.y;
    if (forward <= 0 || forward > ENEMY_STEERING_LOOKAHEAD) continue;
    const lateral = toNeighborX * perpendicular.x + toNeighborY * perpendicular.y;
    const laneWidth = combinedRadius * ENEMY_SWARM_SEPARATION_RATIO + ENEMY_STEERING_COMFORT_GAP;
    if (Math.abs(lateral) > laneWidth) continue;
    const forwardPressure = (ENEMY_STEERING_LOOKAHEAD - forward) / ENEMY_STEERING_LOOKAHEAD;
    const lateralPressure = (laneWidth - Math.abs(lateral)) / laneWidth;
    const escapeSign = Math.abs(lateral) < 0.001 ? laneSign : -Math.sign(lateral);
    tangentPressure += escapeSign * forwardPressure * lateralPressure;
    densityPressure += forwardPressure * lateralPressure * 0.42;
  }

  const repel = normalizeMoveVector({ x: repelX, y: repelY });
  const forwardRepel = repel.x * desired.x + repel.y * desired.y;
  const chaseSafeRepel = forwardRepel < -0.001
    ? normalizeMoveVector({
      x: repel.x - desired.x * forwardRepel,
      y: repel.y - desired.y * forwardRepel
    })
    : repel;
  const active = Math.abs(repelX) > 0.001 || Math.abs(repelY) > 0.001 || Math.abs(tangentPressure) > 0.001;
  const speedScale = clamp(1 - densityPressure * ENEMY_SWARM_DENSE_SLOWDOWN, ENEMY_STEERING_MIN_SPEED_SCALE, 1);
  return {
    x: clamp(chaseSafeRepel.x * ENEMY_SWARM_SEPARATION_FORCE, -ENEMY_SWARM_MAX_REPEL, ENEMY_SWARM_MAX_REPEL)
      + perpendicular.x * clamp(tangentPressure, -1, 1) * ENEMY_SWARM_TANGENT_FORCE,
    y: clamp(chaseSafeRepel.y * ENEMY_SWARM_SEPARATION_FORCE, -ENEMY_SWARM_MAX_REPEL, ENEMY_SWARM_MAX_REPEL)
      + perpendicular.y * clamp(tangentPressure, -1, 1) * ENEMY_SWARM_TANGENT_FORCE,
    speedScale,
    active
  };
}

export function steerEnemyDirectChargeCrowd(enemy: Enemy, desired: { x: number; y: number }, spatialIndex?: EnemySpatialIndex) {
  if (!spatialIndex) return { x: 0, y: 0, speedScale: 1, active: false };
  const neighbors = queryEnemySpatialIndex(spatialIndex, enemy, ENEMY_STEERING_NEIGHBOR_RADIUS);
  const perpendicular = { x: -desired.y, y: desired.x };
  const laneSign = enemyLaneSign(enemy);
  let tangentPressure = 0;
  let densityPressure = 0;

  for (const neighbor of neighbors) {
    if (neighbor.id === enemy.id || neighbor.hp <= 0 || neighbor.runtimeTier === "dead") continue;
    const toNeighborX = neighbor.x - enemy.x;
    const toNeighborY = neighbor.y - enemy.y;
    const forward = toNeighborX * desired.x + toNeighborY * desired.y;
    if (forward <= 0 || forward > ENEMY_STEERING_LOOKAHEAD) continue;
    const combinedRadius = enemyCollisionRadius(enemy) + enemyCollisionRadius(neighbor);
    const lateral = toNeighborX * perpendicular.x + toNeighborY * perpendicular.y;
    const laneWidth = combinedRadius * ENEMY_SWARM_SEPARATION_RATIO + ENEMY_STEERING_COMFORT_GAP;
    if (Math.abs(lateral) > laneWidth) continue;
    const forwardPressure = (ENEMY_STEERING_LOOKAHEAD - forward) / ENEMY_STEERING_LOOKAHEAD;
    const lateralPressure = (laneWidth - Math.abs(lateral)) / laneWidth;
    const escapeSign = Math.abs(lateral) < 0.001 ? laneSign : -Math.sign(lateral);
    tangentPressure += escapeSign * forwardPressure * lateralPressure;
    densityPressure += forwardPressure * lateralPressure * 0.32;
  }

  const active = Math.abs(tangentPressure) > 0.001;
  const speedScale = clamp(1 - densityPressure * ENEMY_SWARM_DENSE_SLOWDOWN, ENEMY_STEERING_MIN_SPEED_SCALE, 1);
  return {
    x: perpendicular.x * clamp(tangentPressure, -1, 1) * ENEMY_DIRECT_CHARGE_TANGENT_FORCE,
    y: perpendicular.y * clamp(tangentPressure, -1, 1) * ENEMY_DIRECT_CHARGE_TANGENT_FORCE,
    speedScale,
    active
  };
}

export function resolveEnemySteeredMove(
  map: BakedBattleMapData | null,
  enemy: Enemy,
  target: { x: number; y: number },
  direction: { x: number; y: number },
  stepDistance: number,
  forceSteering: boolean,
  spatialIndex?: EnemySpatialIndex
) {
  if (stepDistance <= 0.001) return enemy;
  if (!map) return { x: enemy.x + direction.x * stepDistance, y: enemy.y + direction.y * stepDistance };

  const directNext = {
    x: enemy.x + direction.x * stepDistance,
    y: enemy.y + direction.y * stepDistance
  };
  const directCrowdPenalty = enemyCrowdMovePenalty(enemy, directNext, spatialIndex);
  if (!forceSteering && directCrowdPenalty <= 0.001 && isMapPointWalkable(map, directNext.x, directNext.y)) {
    return resolveWalkableMove(map, enemy, directNext);
  }

  const currentDistance = distance(enemy, target);
  const baseAngle = Math.atan2(direction.y, direction.x);
  const laneSign = enemyLaneSign(enemy);
  let bestPosition: { x: number; y: number } = enemy;
  let bestScore = -Infinity;

  for (const offset of ENEMY_STEERING_ANGLE_OFFSETS) {
    const angle = baseAngle + offset * laneSign;
    const candidateDirection = { x: Math.cos(angle), y: Math.sin(angle) };
    const rawNext = {
      x: enemy.x + candidateDirection.x * stepDistance,
      y: enemy.y + candidateDirection.y * stepDistance
    };
    const resolved = resolveWalkableMove(map, enemy, rawNext);
    const movedDistance = distance(enemy, resolved);
    if (movedDistance <= 0.001) continue;

    const progress = currentDistance - distance(resolved, target);
    const crowdPenalty = enemyCrowdMovePenalty(enemy, resolved, spatialIndex);
    const wallScore = enemyWallMoveScore(map, rawNext, resolved, stepDistance);
    const turnPenalty = Math.abs(offset) * stepDistance * 0.2;
    const score = progress * 2.4 + movedDistance * 0.65 + wallScore - turnPenalty - crowdPenalty;
    if (score > bestScore) {
      bestScore = score;
      bestPosition = resolved;
    }
  }

  if (bestScore > -Infinity) return bestPosition;
  return resolveWalkableMove(map, enemy, {
    x: enemy.x + direction.x * stepDistance,
    y: enemy.y + direction.y * stepDistance
  });
}

export function enemyCrowdMovePenalty(enemy: Enemy, candidate: { x: number; y: number }, spatialIndex?: EnemySpatialIndex) {
  if (!spatialIndex) return 0;
  const radius = enemyCollisionRadius(enemy);
  let penalty = 0;
  for (const neighbor of queryEnemySpatialIndex(spatialIndex, candidate, ENEMY_CROWD_SCORE_RADIUS)) {
    if (neighbor.id === enemy.id || neighbor.hp <= 0 || neighbor.runtimeTier === "dead") continue;
    const gap = distance(candidate, neighbor);
    const comfortDistance = radius + enemyCollisionRadius(neighbor) + ENEMY_STEERING_COMFORT_GAP;
    if (gap >= comfortDistance) continue;
    const pressure = (comfortDistance - gap) / comfortDistance;
    penalty += pressure * pressure * ENEMY_CROWD_SLOT_PENALTY;
  }
  return penalty;
}

export function enemyWallMoveScore(map: BakedBattleMapData, rawNext: { x: number; y: number }, resolved: { x: number; y: number }, stepDistance: number) {
  const rawWalkable = isMapPointWalkable(map, rawNext.x, rawNext.y);
  const clippedDistance = distance(rawNext, resolved);
  const clipRatio = clamp(clippedDistance / Math.max(1, stepDistance), 0, 2);
  const collisionPenalty = clipRatio * ENEMY_WALL_COLLISION_PENALTY * stepDistance;
  const walkableBonus = rawWalkable ? stepDistance * 0.55 : -stepDistance * 0.95;
  return walkableBonus - collisionPenalty + enemyWallClearanceScore(map, resolved) * ENEMY_WALL_CLEARANCE_BONUS;
}

export function enemyWallClearanceScore(map: BakedBattleMapData, point: { x: number; y: number }) {
  let nearestBlockedDistance = ENEMY_WALL_CLEARANCE_RADIUS;
  for (let y = -ENEMY_WALL_CLEARANCE_RADIUS; y <= ENEMY_WALL_CLEARANCE_RADIUS; y += ENEMY_WALL_CLEARANCE_STEP) {
    for (let x = -ENEMY_WALL_CLEARANCE_RADIUS; x <= ENEMY_WALL_CLEARANCE_RADIUS; x += ENEMY_WALL_CLEARANCE_STEP) {
      if (x === 0 && y === 0) continue;
      const sampleDistance = Math.hypot(x, y);
      if (sampleDistance > ENEMY_WALL_CLEARANCE_RADIUS || sampleDistance >= nearestBlockedDistance) continue;
      const sample = { x: point.x + x, y: point.y + y };
      if (!isMapPointWalkable(map, sample.x, sample.y)) nearestBlockedDistance = sampleDistance;
    }
  }
  return nearestBlockedDistance / ENEMY_WALL_CLEARANCE_RADIUS;
}

export function enemyLaneSign(enemy: Enemy) {
  return enemy.id % 2 === 0 ? 1 : -1;
}

export function resolveEnemyPlayerBodyOccupancyFloor(
  map: BakedBattleMapData | null,
  enemy: Enemy,
  position: { x: number; y: number },
  player: { x: number; y: number }
) {
  const minimumDistance = Math.max(1, PLAYER_GEOMETRY_RADIUS + enemyVisualRadius(enemy) - 2);
  const currentDistance = distance(position, player);
  if (currentDistance >= minimumDistance) return position;
  const angle = currentDistance > 0.001
    ? Math.atan2(position.y - player.y, position.x - player.x)
    : ((enemy.id * 137) % 360) * Math.PI / 180;
  const corrected = {
    x: player.x + Math.cos(angle) * minimumDistance,
    y: player.y + Math.sin(angle) * minimumDistance
  };
  return map && isMapPointWalkable(map, corrected.x, corrected.y) ? corrected : position;
}

export function separateOverlappingEnemies(
  enemies: Enemy[],
  map: BakedBattleMapData | null,
  lockedEnemyIds: Set<number> = new Set(),
  chaseTarget?: { x: number; y: number }
): Enemy[] {
  if (enemies.length <= 1) return enemies;
  const spatialIndex = createEnemySpatialIndex(enemies, ENEMY_SPATIAL_CHUNK_SIZE);
  return enemies.map((enemy) => {
    if (enemy.hp <= 0 || enemy.runtimeTier === "dead") return enemy;
    const attackLocked = lockedEnemyIds.has(enemy.id);
    if (attackLocked && !chaseTarget) return enemy;
    const radius = enemyCollisionRadius(enemy);
    const neighbors = queryEnemySpatialIndex(spatialIndex, enemy, radius + ENEMY_BOSS_COLLISION_RADIUS);
    let pushX = 0;
    let pushY = 0;
    for (const neighbor of neighbors) {
      if (neighbor.id === enemy.id || neighbor.hp <= 0 || neighbor.runtimeTier === "dead") continue;
      const combinedRadius = radius + enemyCollisionRadius(neighbor);
      const dx = enemy.x - neighbor.x;
      const dy = enemy.y - neighbor.y;
      const gap = Math.hypot(dx, dy);
      const softRadius = combinedRadius * ENEMY_SOFT_OVERLAP_RATIO;
      if (gap >= softRadius) continue;
      const fallbackAngle = ((enemy.id * 97 + neighbor.id * 53) % 360) * Math.PI / 180;
      const normalX = gap > 0.001 ? dx / gap : Math.cos(fallbackAngle);
      const normalY = gap > 0.001 ? dy / gap : Math.sin(fallbackAngle);
      const overlap = softRadius - gap;
      pushX += normalX * overlap * 0.35;
      pushY += normalY * overlap * 0.35;
    }
    const pushLength = Math.hypot(pushX, pushY);
    if (pushLength <= 0.001) return enemy;
    if (enemy.aggroLocked && chaseTarget) {
      const toTarget = guideDirection(enemy, chaseTarget);
      const awayFromTarget = pushX * toTarget.x + pushY * toTarget.y;
      if (awayFromTarget < 0) {
        pushX -= toTarget.x * awayFromTarget;
        pushY -= toTarget.y * awayFromTarget;
      }
    }
    const adjustedPushLength = Math.hypot(pushX, pushY);
    if (adjustedPushLength <= 0.001) return enemy;
    const maxPush = attackLocked ? ENEMY_COLLISION_MAX_PUSH * 0.45 : ENEMY_COLLISION_MAX_PUSH;
    const scale = Math.min(maxPush, adjustedPushLength) / adjustedPushLength;
    const nextPosition = resolveWalkableMove(map, enemy, {
      x: enemy.x + pushX * scale,
      y: enemy.y + pushY * scale
    });
    const occupiedPosition = chaseTarget && enemy.aggroLocked
      ? resolveEnemyPlayerBodyOccupancyFloor(map, enemy, nextPosition, chaseTarget)
      : nextPosition;
    return { ...enemy, x: occupiedPosition.x, y: occupiedPosition.y };
  });
}

export function enemyCollisionRadius(enemy: Enemy) {
  return enemyVisualRadius(enemy);
}

export function selectRenderableEnemies(enemies: Enemy[], player: { x: number; y: number }, elapsedSeconds: number) {
  return candidateEnemiesNear(enemies, player, ENEMY_CAMERA_VISIBLE_RANGE)
    .filter((enemy) => enemy.hp > 0 || shouldRetainEnemyForDamageFlash(enemy, elapsedSeconds))
    .sort((left, right) => distance(left, player) - distance(right, player))
    .slice(0, MAX_VISIBLE_ENEMY_DOM_NODES);
}

export function shouldRetainEnemyForGameplayOrDamageFlash(enemy: Enemy, elapsedSeconds: number) {
  return enemy.hp > 0 || shouldRetainEnemyForDamageFlash(enemy, elapsedSeconds);
}

export function shouldRetainEnemyForDamageFlash(enemy: Pick<Enemy, "lastDamagedAt">, elapsedSeconds: number) {
  return enemy.lastDamagedAt !== undefined
    && elapsedSeconds - enemy.lastDamagedAt >= 0
    && elapsedSeconds - enemy.lastDamagedAt <= ENEMY_DAMAGE_FLASH_SECONDS;
}

export function runtimeEnemySimulationIds(enemies: Enemy[], player: { x: number; y: number }) {
  const nearest = candidateEnemiesNear(enemies, player, ENEMY_AWARE_RANGE)
    .filter((enemy) => enemy.hp > 0)
    .sort((left, right) => distance(left, player) - distance(right, player));
  if (nearest.length < MAX_VISIBLE_ENEMY_DOM_NODES) return new Set(nearest.map((enemy) => enemy.id));
  return new Set(nearest.slice(0, MAX_RUNTIME_SIMULATED_ENEMIES).map((enemy) => enemy.id));
}

export function runtimeDebugMonsterCornerSummary(enemies: Enemy[], player: { x: number; y: number }) {
  const alive = enemies.filter((enemy) => enemy.hp > 0);
  const nearest = alive
    .map((enemy) => ({
      monsterId: enemy.monsterId ?? "enemy",
      distance: Math.round(distance(enemy, player)),
      x: Math.round(enemy.x),
      y: Math.round(enemy.y)
    }))
    .sort((left, right) => left.distance - right.distance)
    .slice(0, 6)
    .map((enemy) => `${enemy.monsterId}:${enemy.distance}@${enemy.x},${enemy.y}`);
  return `角落AI调试：玩家 ${Math.round(player.x)},${Math.round(player.y)}；怪物 ${alive.length}，距离 ${nearest.join(" | ") || "无"}`;
}

export function runtimeDebugMonsterDistances(enemies: Enemy[], player: { x: number; y: number }) {
  return enemies
    .filter((enemy) => enemy.hp > 0)
    .map((enemy) => Math.round(distance(enemy, player)))
    .sort((left, right) => left - right)
    .slice(0, 6);
}

export function runtimeBoundaryMonsterScanLine(summary: RuntimeBoundaryScanSummary) {
  if (summary.status === "running") return "前端全边界AI扫描：运行中...";
  const failureText = summary.failures.length > 0 ? `；失败样本 ${summary.failures.slice(0, 3).join(" | ")}` : "";
  return `前端全边界AI扫描：${summary.passed}/${summary.tested} 通过，失败 ${summary.failed}${failureText}`;
}

export function runRuntimeBoundaryMonsterAiScan(map: BakedBattleMapData): RuntimeBoundaryScanSummary {
  const boundaryPoints = map.walkablePoints.filter((point) => runtimeBoundaryPointTouchesWall(map, point.gridX, point.gridY));
  const monsterIds = runtimeBoundaryMonsterIds();
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];
  for (const point of boundaryPoints) {
    const player = { x: point.x, y: point.y };
    const navigation = createEnemyNavigationContext([], player, map);
    const candidates = runtimeBoundaryEnemyCandidates(map, player).slice(0, 12);
    for (const monsterId of monsterIds) {
      const ok = candidates.some((spawn, index) => {
        const enemy: Enemy = {
          id: 810_000 + index,
          x: spawn.x,
          y: spawn.y,
          hp: 32,
          maxHp: 32,
          monsterId,
          ...defaultMonsterOffense(8),
          aggroLocked: true,
          runtimeTier: "active"
        };
        const target = enemyNavigationMoveTarget(enemy, player, map, navigation);
        if (distance(target, player) <= monsterMeleeReachRange(enemy)) {
          const contactEnemy = { ...enemy, x: target.x, y: target.y };
          return enemyHasWalkableLine(map, enemy, target) && canEnemyReachPlayerForMelee(contactEnemy, player, map);
        }
        if ("gridX" in target && "gridY" in target && navigation) {
          const enemyCell = enemyWorldToGrid(map, enemy);
          const currentIndex = enemyGridIndex(navigation, enemyCell.gridX, enemyCell.gridY);
          const targetIndex = enemyGridIndex(navigation, Number(target.gridX), Number(target.gridY));
          return navigation.field[targetIndex] < navigation.field[currentIndex];
        }
        return false;
      });
      if (ok) {
        passed += 1;
      } else {
        failed += 1;
        if (failures.length < 20) failures.push(`${monsterId}@${point.gridX},${point.gridY}`);
      }
    }
  }
  return { status: "done", tested: passed + failed, passed, failed, failures };
}

export function runtimeBoundaryMonsterIds() {
  return ["enemy_imp", "enemy_brute", ...Object.keys(MONSTER_GEOMETRY_VISUALS)];
}

export function runtimeBoundaryPointTouchesWall(map: BakedBattleMapData, gridX: number, gridY: number) {
  if (!enemyGridWalkable(map, gridX, gridY)) return false;
  return [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 }
  ].some((direction) => !enemyGridWalkable(map, gridX + direction.x, gridY + direction.y));
}

export function runtimeBoundaryEnemyCandidates(map: BakedBattleMapData, player: { x: number; y: number }) {
  return map.walkablePoints
    .map((point) => ({ point, distance: distance(point, player) }))
    .filter(({ distance: pointDistance }) => pointDistance >= map.meta.grid_size * 2 && pointDistance <= map.meta.grid_size * 6)
    .sort((left, right) => left.distance - right.distance)
    .map(({ point }) => point);
}

export function nearestRuntimeWalkablePoint(map: BakedBattleMapData, target: { x: number; y: number }) {
  let best = map.walkablePoints[0] ?? { x: target.x, y: target.y, gridX: 0, gridY: 0 };
  let bestDistance = distance(best, target);
  for (const point of map.walkablePoints) {
    const pointDistance = distance(point, target);
    if (pointDistance < bestDistance) {
      best = point;
      bestDistance = pointDistance;
    }
  }
  return best;
}

export function enemyReachableMeleeOccupancyTarget(
  map: BakedBattleMapData,
  enemy: Enemy,
  player: { x: number; y: number }
) {
  const baseAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
  const preferredAngle = baseAngle + ((((enemy.id * 137) % 7) - 3) * ENEMY_MELEE_SLOT_ANGLE_STEP);
  const slotDistance = Math.max(
    PLAYER_GEOMETRY_RADIUS + enemyVisualRadius(enemy) - 2,
    monsterAttackRange(enemy) - ENEMY_MELEE_EDGE_CONTACT_TOLERANCE * 0.5
  );
  let best: ({ x: number; y: number; gridX: number; gridY: number; score: number } | null) = null;
  for (let index = 0; index < 16; index += 1) {
    const angle = baseAngle + (index - 7.5) * ENEMY_MELEE_SLOT_ANGLE_STEP;
    const target = {
      x: player.x + Math.cos(angle) * slotDistance,
      y: player.y + Math.sin(angle) * slotDistance
    };
    if (!isMapPointWalkable(map, target.x, target.y)) continue;
    if (!enemyHasWalkableLine(map, enemy, target)) continue;
    const candidateEnemy = { ...enemy, x: target.x, y: target.y };
    if (!canEnemyReachPlayerForMelee(candidateEnemy, player, map)) continue;
    const grid = enemyWorldToGrid(map, target);
    const enemyDistance = distance(enemy, target);
    const angleDelta = Math.abs(Math.atan2(Math.sin(angle - preferredAngle), Math.cos(angle - preferredAngle)));
    const score = enemyDistance + angleDelta * 18 + enemyGridWallCost(map, grid.gridX, grid.gridY) * map.meta.grid_size * 0.2;
    if (!best || score < best.score) best = { ...target, ...grid, score };
  }
  return best;
}

export function defaultMonsterOffense(baseDamage: number): Pick<Enemy, "baseDamage" | "damageType" | "hitKind" | "attackRange" | "attackCadenceMs" | "offenseModifiers" | "damageMultiplier"> {
  return {
    baseDamage,
    damageType: "physical",
    hitKind: "attack",
    attackRange: ENEMY_MELEE_ATTACK_DISTANCE,
    attackCadenceMs: ENEMY_ATTACK_VISUAL_DURATION_MS + ENEMY_ATTACK_VISUAL_COOLDOWN_MS,
    damageMultiplier: 1,
    offenseModifiers: {
      damage_add_percent: 0,
      physical_damage_add_percent: 0,
      hit_damage_add_percent: 0,
      attack_damage_add_percent: 0,
      melee_damage_add_percent: 0,
      damage_final_percent: 0,
      hit_damage_final_percent: 0,
      resistance_penetration_percent: 0
    }
  };
}
