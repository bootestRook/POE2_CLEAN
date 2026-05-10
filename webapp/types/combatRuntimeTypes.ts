import type { UnitDirection } from "../unitAssets";
import type { MonsterDamageForm } from "../monsterSkillRuntime";
import type { MonsterHitKind, Enemy } from "./enemyTypes";
import type { SkillEvent } from "./skillEventTypes";
import type { ShapeEffectPreview, SkillPreview } from "./skillPreviewTypes";

export type { ActiveDamageZoneRuntime } from "./damageZoneRuntimeTypes";
export type { SkillEvent } from "./skillEventTypes";

export type PlayerRuntimeState = {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  currentMana: number;
  maxMana: number;
  currentEnergyShield: number;
  maxEnergyShield: number;
};

export type FloatingText = {
  id: number;
  x: number;
  y: number;
  text: string;
  damageType: string;
  ttl: number;
  duration: number;
};

export type PlayerBuff = {
  id: number;
  buffType: string;
  skillId: string;
  remaining: number;
  duration: number;
  remainingAmount: number;
  absorbPercent: number;
  excludeDamageOverTime: boolean;
  moveSpeedMultiplier?: number;
  vfxKey: string;
};

export type FireBolt = {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  directionX: number;
  directionY: number;
  velocityX?: number;
  velocityY?: number;
  trajectory?: string;
  arcHeight?: number;
  sineAmplitude?: number;
  sineFrequency?: number;
  projectileVisualMode?: string;
  targetId?: number;
  projectileId?: string;
  skillId?: string;
  projectileIndex?: number;
  projectileCount?: number;
  fanAngle?: number;
  localSpreadAngle?: number;
  pierceRemaining?: number;
  projectileSpeed?: number;
  projectileWidth?: number;
  projectileHeight?: number;
  splitProjectile?: boolean;
  impactRadius?: number;
  ttl: number;
  duration: number;
  fadeDuration: number;
  skillTemplateId: string;
  behaviorType: string;
  damageType: string;
  visualEffect: string;
  vfxKey: string;
  shapeEffects: readonly ShapeEffectPreview[];
  areaScale: number;
  vfxScale?: number;
  pendingDamage?: boolean;
  damageAmount?: number;
  sourceSkillName?: string;
  sourceSkillInstanceId?: string;
  sourceEntity?: "player" | "boss";
  sourceEnemyId?: number;
  canHitPlayer?: boolean;
  playerDamageMultiplier?: number;
  playerHitKind?: MonsterHitKind;
  playerLeashRange?: number;
  playerHitMarkerId?: string;
  suppressHitVfx?: boolean;
  collisionRadius?: number;
};

export type PendingBossDamageZoneHit = {
  id: string;
  boss: Enemy;
  zones: {
    x: number;
    y: number;
    radius: number;
    shape?: "circle" | "rectangle" | "sector";
    length?: number;
    width?: number;
    directionX?: number;
    directionY?: number;
    safeDirectionX?: number;
    safeDirectionY?: number;
    safeAngleDeg?: number;
  }[];
  remainingMs: number;
  damageMultiplier: number;
  hitKind: MonsterHitKind;
  damageType: string;
  damageForm?: MonsterDamageForm;
  leashRange?: number;
  sourceText?: string;
  hitMarkerId?: string;
  suppressHitVfx?: boolean;
};

export type BossSkillTimers = {
  basicReadyMs: number;
  areaReadyMs: number;
  barrageReadyMs: number;
  basicSeq: number;
  areaSeq: number;
  barrageSeq: number;
};

export type SupremeBossSkillTimer = {
  readyAtMs: number;
  sequence: number;
  activeSkillId?: string;
  activeUntilMs?: number;
};

export type HitVfx = {
  id: number;
  x: number;
  y: number;
  targetId?: number;
  projectileId?: string;
  projectileIndex?: number;
  projectileCount?: number;
  pierceRemaining?: number;
  impactKind?: string;
  projectileWidth?: number;
  projectileHeight?: number;
  impactRadius?: number;
  ttl: number;
  duration: number;
  hitAtMs?: number;
  damageType: string;
  vfxKey: string;
  skillTemplateId?: string;
  shapeEffects: readonly ShapeEffectPreview[];
  vfxScale?: number;
};

export type AreaNova = {
  id: number;
  x: number;
  y: number;
  radius: number;
  ringWidth: number;
  ttl: number;
  duration: number;
  damageType: string;
  vfxKey: string;
  areaId?: string;
  skillId?: string;
  followPlayer?: boolean;
  vfxScale?: number;
};

export type MeleeArcVfx = {
  id: number;
  x: number;
  y: number;
  radius: number;
  arcAngle: number;
  directionX: number;
  directionY: number;
  ttl: number;
  duration: number;
  damageType: string;
  vfxKey: string;
  arcId?: string;
  skillId?: string;
  vfxScale?: number;
};

export type ChainSegmentVfx = {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  ttl: number;
  duration: number;
  hitAtMs?: number;
  damageType: string;
  vfxKey: string;
  segmentIndex: number;
  segmentId?: string;
  skillId?: string;
  vfxScale?: number;
};

export type DamageZoneVfx = {
  id: number;
  x: number;
  y: number;
  shape: "circle" | "rectangle";
  radius: number;
  length: number;
  width: number;
  directionX: number;
  directionY: number;
  ttl: number;
  duration: number;
  hitAtMs?: number;
  damageType: string;
  vfxKey: string;
  zoneId?: string;
  skillId?: string;
  warning?: boolean;
  followPlayer?: boolean;
  vfxScale?: number;
  tickProgress?: number;
};

export type ThundercloudChannelRuntime = {
  stacks: number;
  progressMs: number;
  noChannelMs: number;
  lockedMs: number;
  releaseCooldownMs?: number;
};

export type ScheduledSkillEvent = {
  event: SkillEvent;
  remaining: number;
};

export type ContinuousAttackRuntime = {
  skillId: string;
  skill: SkillPreview;
  repeatsRemaining: number;
  nextRepeatIndex: number;
  remainingSeconds: number;
};

export type RuntimeSkillEventsResponse = {
  ok: boolean;
  message_text: string;
  events: SkillEvent[];
};

export type RuntimePerfSummary = {
  frame_ms: number;
  logic_ms: number;
  active_projectiles: number;
  active_hit_vfx: number;
  active_area_vfx: number;
  active_floating_text: number;
  active_enemies: number;
  scheduled_events: number;
  consumed_events_this_frame: number;
  dropped_frame_count: number;
};

export type Camera2D = {
  screenX: number;
  screenY: number;
  zoom: number;
};

export type UnitVisualRuntime = {
  direction: UnitDirection;
  movementVector: { x: number; y: number };
  attackStartedAtMs?: number;
  attackUntilMs?: number;
};

export type EnemyVisualRuntime = UnitVisualRuntime & {
  lastX: number;
  lastY: number;
};
