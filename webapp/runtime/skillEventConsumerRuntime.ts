import type {
  ActiveDamageZoneRuntime,
  AreaNova,
  ChainSegmentVfx,
  DamageZoneVfx,
  FireBolt,
  FloatingText,
  HitVfx,
  MeleeArcVfx,
  PlayerBuff,
  PlayerRuntimeState,
  ScheduledSkillEvent,
  SkillEvent
} from "../types/combatRuntimeTypes";
import type { Enemy } from "../types/enemyTypes";

export type RuntimeRef<T> = {
  current: T;
};

export type RuntimeStateSetter<T> = (value: T | ((current: T) => T)) => void;

export type SkillEventConsumerRefs = {
  scheduledSkillEvents: RuntimeRef<ScheduledSkillEvent[]>;
  activeDamageZones: RuntimeRef<ActiveDamageZoneRuntime[]>;
  enemiesStateRef: RuntimeRef<Enemy[]>;
  playerStateRef: RuntimeRef<PlayerRuntimeState>;
  activePlayerBuffsRef: RuntimeRef<PlayerBuff[]>;
};

export type SkillEventConsumerVisualSetters = {
  setChainSegments: RuntimeStateSetter<ChainSegmentVfx[]>;
  setDamageZones: RuntimeStateSetter<DamageZoneVfx[]>;
  setHitVfxs: RuntimeStateSetter<HitVfx[]>;
  setAreaNovas: RuntimeStateSetter<AreaNova[]>;
  setMeleeArcs: RuntimeStateSetter<MeleeArcVfx[]>;
  setBolts: RuntimeStateSetter<FireBolt[]>;
  setTexts: RuntimeStateSetter<FloatingText[]>;
};

export type SkillEventConsumerRuntime = {
  consumeSkillEventTimeline(events: SkillEvent[]): void;
  consumeImmediateSkillEvents(events: SkillEvent[]): void;
  consumeScheduledSkillEvents(dt: number): number;
  updateActiveDamageZones(dt: number): number;
  consumeSkillEvent(event: SkillEvent): void;
  consumeSkillEventBatch(events: SkillEvent[]): void;
};

export type SkillEventConsumerRuntimeDeps = {
  [key: string]: any;
  refs: SkillEventConsumerRefs;
  visualSetters: SkillEventConsumerVisualSetters;
  consumeSkillEventBatch(events: SkillEvent[]): void;
  updateActiveDamageZones(dt: number): number;
};

export function createSkillEventConsumerRuntime(deps: SkillEventConsumerRuntimeDeps): SkillEventConsumerRuntime {
  const {
    applyChannelMovementBuff,
    applyDamageEventBatch,
    applyEnemyBuffApplyEvent,
    applyEnemyStatusBuff,
    applyForcedMovementEvent,
    applyPlayerStatusBuffEvent,
    capRuntimeVisualBudget,
    clamp,
    damageDisplayKey,
    damageEventAmountAgainstEnemy,
    damageNumberText,
    finishCompletedProjectileBody,
    floatingTextDamageComponents,
    hitVfxTargetId,
    isFrontendPlayerStatusTarget,
    isProjectileTickFollowup,
    liveMonsterProjectileTrajectoryForEvent,
    liveOrbitCenter,
    liveOrbitPosition,
    normalizedVfxScale,
    normalizedWorldDirection,
    playerAttachedAreaKey,
    playerAttachedAreaPosition,
    pointFromUnknown,
    projectileFollowupKey,
    projectileIdFromEvent,
    projectileSpawnPositionForEvent,
    projectileTargetFollowupKey,
    projectileVfxKind,
    registerActiveDamageZone,
    shapeEffectsFromUnknown,
    shouldSuppressProjectileFollowup,
    stablePercent,
    targetedEnemyForEvent,
    uniqueDamageZonesByZoneId,
    MAX_RUNTIME_AREA_VFX,
    MAX_RUNTIME_FLOATING_TEXT,
    MAX_RUNTIME_HIT_VFX,
    MAX_RUNTIME_PROJECTILE_VISUALS,
    PENETRATING_SHOT_IMPACT_DURATION_MS,
    PROJECTILE_BODY_EXIT_FADE_DURATION,
    nextAreaNovaId,
    nextBoltId,
    nextChainSegmentId,
    nextDamageZoneId,
    nextHitVfxId,
    nextMeleeArcId,
    nextPlayerBuffId,
    nextTextId,
    setRuntimePlayerBuffs
  } = deps;
  const {
    activeDamageZones,
    activePlayerBuffsRef,
    enemiesStateRef,
    playerStateRef,
    scheduledSkillEvents
  } = deps.refs;
  const {
    setAreaNovas,
    setBolts,
    setChainSegments,
    setDamageZones,
    setHitVfxs,
    setMeleeArcs,
    setTexts
  } = deps.visualSetters;
  function consumeSkillEventTimeline(events: SkillEvent[]) {
    if (events.length === 0) return;
    const immediate: SkillEvent[] = [];
    for (const event of events) {
      const delaySeconds = Math.max(0, Number(event.delay_ms ?? 0)) / 1000;
      if (delaySeconds <= 0) {
        immediate.push(event);
      } else {
        scheduledSkillEvents.current.push({ event, remaining: delaySeconds });
      }
    }
    if (immediate.length > 0) consumeSkillEventBatch(immediate);
  }

  function consumeImmediateSkillEvents(events: SkillEvent[]) {
    consumeSkillEventBatch(events.filter((event) => event.delay_ms === 0));
  }

  function consumeScheduledSkillEvents(dt: number) {
    const ready: SkillEvent[] = [];
    const pending: ScheduledSkillEvent[] = [];
    for (const scheduled of scheduledSkillEvents.current) {
      const remaining = scheduled.remaining - dt;
      if (remaining <= 0) {
        ready.push(scheduled.event);
      } else {
        pending.push({ ...scheduled, remaining });
      }
    }
    scheduledSkillEvents.current = pending;
    consumeSkillEventBatch(ready);
    return ready.length;
  }

  function updateActiveDamageZones(dt: number) {
    return deps.updateActiveDamageZones(dt);
  }

  function consumeSkillEvent(event: SkillEvent) {
    consumeSkillEventBatch([event]);
  }

function consumeSkillEventBatch(events: SkillEvent[]) {
    if (events.length === 0) return;
    const nextChainSegments: ChainSegmentVfx[] = [];
    const nextDamageZones: DamageZoneVfx[] = [];
    const replaceDamageZoneIds = new Set<string>();
    const nextHitVfxs: HitVfx[] = [];
    const nextAreaNovas: AreaNova[] = [];
    const nextMeleeArcs: MeleeArcVfx[] = [];
    const nextBolts: FireBolt[] = [];
    const nextTexts: FloatingText[] = [];
    const damageEvents: SkillEvent[] = [];
    const projectedEnemyHp = new Map(enemiesStateRef.current.map((enemy) => [enemy.id, enemy.hp]));
    const projectedEnemyById = new Map(enemiesStateRef.current.map((enemy) => [enemy.id, enemy]));
    const liveProjectileHits = new Set<string>();
    const deadProjectileHits = new Set<string>();
    const acceptedProjectileDamageTicks = new Set<string>();
    const acceptedDamageDisplayKeys = new Set<string>();
    const completedProjectileHits = new Map<string, { x: number; y: number }>();

    for (const event of events) {
      if (event.type === "buff_apply") {
        const payload = event.payload ?? {};
        if (Number.isFinite(Number(event.target_entity))) {
          applyEnemyBuffApplyEvent(event);
          continue;
        }
        const buffType = String(payload.buff_type ?? "");
        if (buffType) {
          const duration = Math.max(0.3, event.duration_ms / 1000);
          const skillId = String(payload.skill_id ?? event.skill_instance_id);
          const nextBuff: PlayerBuff = {
            id: nextPlayerBuffId.current++,
            buffType,
            skillId,
            remaining: duration,
            duration,
            remainingAmount: Math.max(0, Number(event.amount ?? payload.absorb_amount ?? 0)),
            absorbPercent: Math.max(0, Number(payload.absorb_percent ?? 0)),
            excludeDamageOverTime: Boolean(payload.exclude_damage_over_time ?? false),
            moveSpeedMultiplier: Number.isFinite(Number(payload.move_speed_multiplier))
              ? Math.max(0, Number(payload.move_speed_multiplier))
              : undefined,
            vfxKey: event.vfx_key
          };
          setRuntimePlayerBuffs([
            ...activePlayerBuffsRef.current.filter((buff) => !(buff.buffType === nextBuff.buffType && buff.skillId === nextBuff.skillId)),
            nextBuff
          ]);
          nextTexts.push({
            id: nextTextId.current++,
            x: playerStateRef.current.x,
            y: playerStateRef.current.y - 52,
            text: buffType === "guard" ? "石肤术" : "增益",
            damageType: "guard",
            ttl: 0.9,
            duration: 0.9
          });
        }
        continue;
      }
      if (event.type === "chain_segment") {
        const payload = event.payload ?? {};
        const start = (payload.start_position ?? event.position) as { x?: number; y?: number };
        const end = (payload.end_position ?? payload.target_world_position ?? event.position) as { x?: number; y?: number };
        const duration = Math.max(0.16, event.duration_ms / 1000);
        nextChainSegments.push({
          id: nextChainSegmentId.current++,
          startX: Number(start.x ?? event.position.x),
          startY: Number(start.y ?? event.position.y),
          endX: Number(end.x ?? event.position.x),
          endY: Number(end.y ?? event.position.y),
          ttl: duration,
          duration,
          hitAtMs: Math.max(0, Math.round(Number(payload.hit_at_ms ?? 0))),
          damageType: event.damage_type,
          vfxKey: event.vfx_key,
          segmentIndex: Number(payload.segment_index ?? 0),
          segmentId: typeof payload.segment_id === "string" ? payload.segment_id : event.event_id,
          skillId: typeof payload.skill_id === "string" ? payload.skill_id : event.skill_instance_id,
          vfxScale: normalizedVfxScale(payload.vfx_scale)
        });
        continue;
      }
      if (event.type === "damage_zone_prime" || event.type === "damage_zone") {
        const payload = event.payload ?? {};
        if (event.type === "damage_zone") applyChannelMovementBuff(event);
        const followedOrbitPosition = typeof payload.orbit_id === "string" ? liveOrbitPosition(payload, event.position) : null;
        const playerAttachedPosition = playerAttachedAreaPosition(event);
        const origin = playerAttachedPosition ?? followedOrbitPosition ?? ((payload.origin_world_position ?? payload.origin ?? event.position) as { x?: number; y?: number });
        const direction = (payload.direction_world ?? payload.facing_direction ?? event.direction) as { x?: number; y?: number };
        const shape = String(payload.shape ?? "circle") === "rectangle" ? "rectangle" : "circle";
        const duration = Math.max(0.18, event.duration_ms / 1000);
        const zoneId = playerAttachedAreaKey(event) ?? (typeof payload.zone_id === "string" ? payload.zone_id : event.event_id);
        const radius = Math.max(1, Number(payload.radius ?? 120));
        if (event.type === "damage_zone") replaceDamageZoneIds.add(zoneId);
        nextDamageZones.push({
          id: nextDamageZoneId.current++,
          x: Number(origin.x ?? event.position.x),
          y: Number(origin.y ?? event.position.y),
          shape,
          radius,
          length: Math.max(1, Number(payload.length ?? 160)),
          width: Math.max(1, Number(payload.width ?? 80)),
          directionX: Number(direction.x ?? event.direction.x),
          directionY: Number(direction.y ?? event.direction.y),
          ttl: duration,
          duration,
          damageType: event.damage_type,
          vfxKey: event.vfx_key,
          zoneId,
          skillId: typeof payload.skill_id === "string" ? payload.skill_id : event.skill_instance_id,
          warning: event.type === "damage_zone_prime",
          followPlayer: Boolean(playerAttachedPosition),
          vfxScale: normalizedVfxScale(payload.vfx_scale),
          tickProgress: 0
        });
        registerActiveDamageZone(
          event,
          zoneId,
          { x: Number(origin.x ?? event.position.x), y: Number(origin.y ?? event.position.y) },
          { x: Number(direction.x ?? event.direction.x), y: Number(direction.y ?? event.direction.y) },
          shape
        );
        continue;
      }
      if (event.type === "orbit_spawn" || event.type === "orbit_tick") {
        const payload = event.payload ?? {};
        const rawPosition = event.type === "orbit_spawn"
          ? liveOrbitCenter(payload, event.position)
          : liveOrbitPosition(payload, event.position);
        const visualDuration = event.type === "orbit_spawn"
          ? Math.max(0.3, Math.min(1.0, event.duration_ms / 1000))
          : 0.18;
        nextHitVfxs.push({
          id: nextHitVfxId.current++,
          x: Number(rawPosition.x ?? event.position.x),
          y: Number(rawPosition.y ?? event.position.y),
          projectileId: typeof payload.orbit_id === "string" ? payload.orbit_id : event.event_id,
          projectileIndex: Number(payload.orb_index ?? 0) + 1,
          projectileCount: Number(payload.orb_count ?? 1),
          impactKind: event.type,
          ttl: visualDuration,
          duration: visualDuration,
          damageType: event.damage_type,
          vfxKey: event.vfx_key,
          skillTemplateId: event.skill_instance_id,
          shapeEffects: shapeEffectsFromUnknown(payload.shape_effects),
          vfxScale: normalizedVfxScale(payload.vfx_scale)
        });
        continue;
      }
      if (event.type === "projectile_impact") {
        const payload = event.payload ?? {};
        const impact = (payload.impact_position ?? event.position) as { x?: number; y?: number };
        nextHitVfxs.push({
          id: nextHitVfxId.current++,
          x: Number(impact.x ?? event.position.x),
          y: Number(impact.y ?? event.position.y),
          targetId: hitVfxTargetId(event),
          projectileId: typeof payload.projectile_id === "string" ? payload.projectile_id : undefined,
          ttl: 0.18,
          duration: 0.18,
          damageType: event.damage_type,
          vfxKey: event.vfx_key,
          skillTemplateId: event.skill_instance_id,
          shapeEffects: shapeEffectsFromUnknown(payload.shape_effects),
          vfxScale: normalizedVfxScale(payload.vfx_scale)
        });
        continue;
      }
      if (event.type === "melee_arc") {
        const payload = event.payload ?? {};
        const origin = (payload.origin_world_position ?? payload.origin ?? event.position) as { x?: number; y?: number };
        const direction = (payload.direction_world ?? payload.facing_direction ?? event.direction) as { x?: number; y?: number };
        const duration = Math.max(0.18, event.duration_ms / 1000);
        nextMeleeArcs.push({
          id: nextMeleeArcId.current++,
          x: Number(origin.x ?? event.position.x),
          y: Number(origin.y ?? event.position.y),
          radius: Math.max(1, Number(payload.arc_radius ?? 160)),
          arcAngle: clamp(Number(payload.arc_angle ?? 70), 1, 180),
          directionX: Number(direction.x ?? event.direction.x),
          directionY: Number(direction.y ?? event.direction.y),
          ttl: duration,
          duration,
          damageType: event.damage_type,
          vfxKey: event.vfx_key,
          arcId: typeof payload.arc_id === "string" ? payload.arc_id : event.event_id,
          skillId: typeof payload.skill_id === "string" ? payload.skill_id : event.skill_instance_id,
          vfxScale: normalizedVfxScale(payload.vfx_scale)
        });
        continue;
      }
      if (event.type === "area_spawn") {
        const payload = event.payload ?? {};
        const center = (payload.center_world_position ?? payload.center ?? event.position) as { x?: number; y?: number };
        const duration = Math.max(0.25, event.duration_ms / 1000);
        nextAreaNovas.push({
          id: nextAreaNovaId.current++,
          x: Number(center.x ?? event.position.x),
          y: Number(center.y ?? event.position.y),
          radius: Math.max(1, Number(payload.radius ?? 120)),
          ringWidth: Math.max(1, Number(payload.ring_width ?? 48)),
          ttl: duration,
          duration,
          damageType: event.damage_type,
          vfxKey: event.vfx_key,
          areaId: typeof payload.area_id === "string" ? payload.area_id : event.event_id,
          skillId: typeof payload.skill_id === "string" ? payload.skill_id : event.skill_instance_id,
          followPlayer: payload.center_policy === "player_center" && event.source_entity === "player",
          vfxScale: normalizedVfxScale(payload.vfx_scale)
        });
        continue;
      }
      if (event.type === "projectile_spawn") {
        const spawnPosition = projectileSpawnPositionForEvent(event);
        const targetPosition = pointFromUnknown(event.payload?.target_world_position);
        const payloadDirection = pointFromUnknown(event.payload?.direction_world);
        const velocityPayload = event.payload?.velocity_world as { x?: number; y?: number } | undefined;
        const velocityLength = Math.hypot(Number(velocityPayload?.x ?? 0), Number(velocityPayload?.y ?? 0));
        const projectileSpeed = Number(event.payload?.projectile_speed ?? velocityLength);
        const liveMonsterTrajectory = liveMonsterProjectileTrajectoryForEvent(event, spawnPosition, projectileSpeed);
        const directionWorld = liveMonsterTrajectory?.direction ?? (velocityLength > 0
          ? normalizedWorldDirection({ x: Number(velocityPayload?.x ?? 0), y: Number(velocityPayload?.y ?? 0) })
          : payloadDirection
            ? normalizedWorldDirection(payloadDirection)
            : normalizedWorldDirection(event.direction));
        const velocityWorld = liveMonsterTrajectory?.velocity ?? (velocityLength > 0
          ? { x: Number(velocityPayload?.x ?? 0), y: Number(velocityPayload?.y ?? 0) }
          : {
              x: directionWorld.x * projectileSpeed,
              y: directionWorld.y * projectileSpeed
            });
        const payloadEndPosition = event.payload?.expire_world_position ?? event.payload?.end_position;
        const endPosition = liveMonsterTrajectory?.target ?? targetPosition ?? pointFromUnknown(payloadEndPosition) ?? event.position;
        const lifetimeMs = Number(event.payload?.lifetime_ms ?? event.duration_ms);
        const aliveDuration = Math.max(0.001, lifetimeMs / 1000);
        const runtimeProjectileVfxKind = projectileVfxKind(event.vfx_key) ?? projectileVfxKind(event.skill_instance_id);
        const projectileExitFadeDuration = runtimeProjectileVfxKind === "burning_shot" ? 0 : PROJECTILE_BODY_EXIT_FADE_DURATION;
        nextBolts.push({
          id: nextBoltId.current++,
          x: spawnPosition.x,
          y: spawnPosition.y,
          targetX: endPosition.x,
          targetY: endPosition.y,
          directionX: directionWorld.x,
          directionY: directionWorld.y,
          velocityX: velocityWorld?.x,
          velocityY: velocityWorld?.y,
          projectileId: typeof event.payload?.projectile_id === "string" ? event.payload.projectile_id : event.event_id,
          skillId: typeof event.payload?.skill_id === "string" ? event.payload.skill_id : event.skill_instance_id,
          projectileIndex: Number(event.payload?.projectile_index ?? 1),
          projectileCount: Number(event.payload?.projectile_count ?? 1),
          fanAngle: Number(event.payload?.fan_angle ?? event.payload?.spread_angle_deg ?? 0),
          localSpreadAngle: Number(event.payload?.local_spread_angle ?? 0),
          pierceRemaining: Number(event.payload?.pierce_remaining ?? 0),
          projectileSpeed: Number(event.payload?.projectile_speed ?? Math.hypot(velocityWorld?.x ?? 0, velocityWorld?.y ?? 0)),
          projectileWidth: Number(event.payload?.projectile_width ?? 38),
          projectileHeight: Number(event.payload?.projectile_height ?? 24),
          splitProjectile: Boolean(event.payload?.split_projectile),
          impactRadius: Number(event.payload?.impact_radius ?? 18),
          trajectory: String(event.payload?.trajectory ?? "linear"),
          arcHeight: Number(event.payload?.arc_height ?? 0),
          sineAmplitude: Number(event.payload?.sine_amplitude ?? 0),
          sineFrequency: Number(event.payload?.sine_frequency ?? 0),
          projectileVisualMode: String(event.payload?.projectile_visual_mode ?? "standard"),
          targetId: Number.isFinite(Number(event.target_entity)) ? Number(event.target_entity) : undefined,
          ttl: aliveDuration + projectileExitFadeDuration,
          duration: aliveDuration,
          fadeDuration: projectileExitFadeDuration,
          skillTemplateId: event.skill_instance_id,
          behaviorType: "projectile",
          damageType: event.damage_type,
          visualEffect: event.vfx_key,
          vfxKey: event.vfx_key,
          shapeEffects: [],
          areaScale: Number(event.payload?.area_scale ?? 1),
          vfxScale: normalizedVfxScale(event.payload?.vfx_scale),
          sourceEntity: event.source_entity === "boss" ? "boss" : "player",
          sourceEnemyId: Number.isFinite(Number(event.payload?.source_enemy_id)) ? Number(event.payload?.source_enemy_id) : undefined,
          canHitPlayer: event.source_entity === "boss" && event.payload?.can_hit_player === true,
          playerDamageMultiplier: Number(event.payload?.player_damage_multiplier ?? 1),
          playerHitKind: event.payload?.player_hit_kind === "spell" ? "spell" : "attack",
          playerLeashRange: Number.isFinite(Number(event.payload?.player_leash_range)) ? Number(event.payload?.player_leash_range) : undefined,
          playerHitMarkerId: typeof event.payload?.hit_marker_id === "string" ? event.payload.hit_marker_id : undefined,
          suppressHitVfx: event.payload?.suppress_hit_vfx === true,
          collisionRadius: Number(event.payload?.collision_radius ?? event.payload?.projectile_radius ?? event.payload?.impact_radius ?? 18),
          sourceSkillName: typeof event.payload?.skill_name === "string" ? event.payload.skill_name : undefined
        });
        continue;
      }
      if (event.type === "projectile_hit") {
        const projectileId = projectileIdFromEvent(event);
        if (projectileId && event.payload?.projectile_continues !== true) {
          completedProjectileHits.set(
            projectileId,
            pointFromUnknown(event.payload?.hit_world_position)
              ?? pointFromUnknown(event.payload?.impact_world_position)
              ?? pointFromUnknown(event.position)
              ?? event.position
          );
        }
        const targetId = Number(event.target_entity);
        const hitTargetKey = projectileTargetFollowupKey(event);
        if (hitTargetKey && Number.isFinite(targetId) && (projectedEnemyHp.get(targetId) ?? 0) <= 0) {
          deadProjectileHits.add(hitTargetKey);
        } else if (hitTargetKey) {
          liveProjectileHits.add(hitTargetKey);
        }
        continue;
      }
      if (event.type === "damage") {
        const targetId = Number(event.target_entity);
        const projectileId = projectileIdFromEvent(event);
        const hitTargetKey = projectileTargetFollowupKey(event);
        if (hitTargetKey && deadProjectileHits.has(hitTargetKey)) continue;
        if (Number.isFinite(targetId)) {
          const currentHp = projectedEnemyHp.get(targetId);
          if (currentHp === undefined || currentHp <= 0) continue;
          const enemy = projectedEnemyById.get(targetId);
          const damage = enemy ? damageEventAmountAgainstEnemy(event, enemy, stablePercent) : Number(event.amount ?? 0);
          if (damage <= 0) continue;
          const nextHp = currentHp - damage;
          if (projectileId && isProjectileTickFollowup(event)) {
            acceptedProjectileDamageTicks.add(projectileFollowupKey(event));
          }
          acceptedDamageDisplayKeys.add(damageDisplayKey(event));
          projectedEnemyHp.set(targetId, nextHp);
        }
        damageEvents.push(event);
        continue;
      }
      if (event.type === "status_apply") {
        if (isFrontendPlayerStatusTarget(event)) {
          applyPlayerStatusBuffEvent(event);
          continue;
        }
        const targetId = Number(event.target_entity);
        if (Number.isFinite(targetId) && (projectedEnemyHp.get(targetId) ?? 0) <= 0) continue;
        applyEnemyStatusBuff(event);
        continue;
      }
      if (event.type === "forced_movement") {
        applyForcedMovementEvent(event);
        continue;
      }
      if (event.type === "hit_vfx") {
        const projectileId = projectileIdFromEvent(event);
        if (projectileId && shouldSuppressProjectileFollowup(event, projectedEnemyHp, liveProjectileHits, deadProjectileHits, acceptedProjectileDamageTicks)) continue;
        const eventVfxKind = projectileVfxKind(event.vfx_key) ?? projectileVfxKind(event.skill_instance_id);
        const visualDuration = eventVfxKind === "penetrating_shot" ? PENETRATING_SHOT_IMPACT_DURATION_MS / 1000 : Math.max(0.12, event.duration_ms / 1000);
        const targetEnemy = targetedEnemyForEvent(event, projectedEnemyById);
        const impact = targetEnemy
          ?? pointFromUnknown(event.payload?.hit_world_position)
          ?? pointFromUnknown(event.payload?.impact_world_position)
          ?? pointFromUnknown(event.position)
          ?? event.position;
        nextHitVfxs.push({
          id: nextHitVfxId.current++,
          x: impact.x,
          y: impact.y,
          targetId: hitVfxTargetId(event),
          projectileId: typeof event.payload?.projectile_id === "string" ? event.payload.projectile_id : undefined,
          projectileIndex: Number(event.payload?.projectile_index ?? 1),
          projectileCount: Number(event.payload?.projectile_count ?? 1),
          pierceRemaining: Number(event.payload?.pierce_remaining ?? 0),
          impactKind: typeof event.payload?.impact_kind === "string" ? event.payload.impact_kind : undefined,
          projectileWidth: Number(event.payload?.projectile_width ?? 38),
          projectileHeight: Number(event.payload?.projectile_height ?? 24),
          impactRadius: Number(event.payload?.impact_radius ?? 18),
          ttl: visualDuration,
          duration: visualDuration,
          damageType: event.damage_type,
          vfxKey: event.vfx_key,
          skillTemplateId: event.skill_instance_id,
          shapeEffects: shapeEffectsFromUnknown(event.payload?.shape_effects),
          vfxScale: normalizedVfxScale(event.payload?.vfx_scale)
        });
        continue;
      }
      if (event.type === "floating_text") {
        const projectileId = projectileIdFromEvent(event);
        if (projectileId && shouldSuppressProjectileFollowup(event, projectedEnemyHp, liveProjectileHits, deadProjectileHits, acceptedProjectileDamageTicks)) continue;
        const targetId = Number(event.target_entity);
        const displayKey = damageDisplayKey(event);
        const hasAcceptedDamage = acceptedDamageDisplayKeys.has(displayKey);
        if (Number.isFinite(targetId) && (projectedEnemyHp.get(targetId) ?? 0) <= 0 && !hasAcceptedDamage) continue;
        if (hasAcceptedDamage) acceptedDamageDisplayKeys.delete(displayKey);
        const targetEnemy = targetedEnemyForEvent(event, projectedEnemyById);
        const textPosition = targetEnemy ? { x: targetEnemy.x, y: targetEnemy.y - 28 } : event.position;
        const explicitText = typeof event.payload?.text === "string" ? event.payload.text : typeof event.payload?.floating_text === "string" ? event.payload.floating_text : "";
        if (explicitText) {
          nextTexts.push({
            id: nextTextId.current++,
            x: textPosition.x,
            y: textPosition.y,
            text: explicitText,
            damageType: event.damage_type,
            ttl: Math.max(0.3, event.duration_ms / 1000),
            duration: Math.max(0.3, event.duration_ms / 1000)
          });
          continue;
        }
        const floatingComponents = floatingTextDamageComponents(event);
        floatingComponents.forEach(([damageType, amount], index) => {
          nextTexts.push({
            id: nextTextId.current++,
            x: textPosition.x + (index - (floatingComponents.length - 1) / 2) * 18,
            y: textPosition.y - index * 14,
            text: damageNumberText(amount),
            damageType,
            ttl: Math.max(0.3, event.duration_ms / 1000),
            duration: Math.max(0.3, event.duration_ms / 1000)
          });
        });
      }
    }

    if (nextChainSegments.length > 0) {
      setChainSegments((items) => capRuntimeVisualBudget([...items, ...nextChainSegments], MAX_RUNTIME_AREA_VFX));
    }
    if (nextDamageZones.length > 0) {
      const uniqueNextDamageZones = uniqueDamageZonesByZoneId(nextDamageZones);
      setDamageZones((items) => capRuntimeVisualBudget(
        [
          ...uniqueDamageZonesByZoneId(items).filter((zone) => !zone.zoneId || !replaceDamageZoneIds.has(zone.zoneId)),
          ...uniqueNextDamageZones
        ],
        MAX_RUNTIME_AREA_VFX
      ));
    }
    if (nextHitVfxs.length > 0) {
      setHitVfxs((items) => capRuntimeVisualBudget([...items, ...nextHitVfxs], MAX_RUNTIME_HIT_VFX));
    }
    if (nextAreaNovas.length > 0) {
      setAreaNovas((items) => capRuntimeVisualBudget([...items, ...nextAreaNovas], MAX_RUNTIME_AREA_VFX));
    }
    if (nextMeleeArcs.length > 0) {
      setMeleeArcs((items) => capRuntimeVisualBudget([...items, ...nextMeleeArcs], MAX_RUNTIME_AREA_VFX));
    }
    if (nextBolts.length > 0 || completedProjectileHits.size > 0) {
      const completedNextBolts = nextBolts.map((bolt) => finishCompletedProjectileBody(bolt, completedProjectileHits, PROJECTILE_BODY_EXIT_FADE_DURATION));
      setBolts((items) => capRuntimeVisualBudget(
        [
          ...items.map((bolt) => finishCompletedProjectileBody(bolt, completedProjectileHits, PROJECTILE_BODY_EXIT_FADE_DURATION)),
          ...completedNextBolts
        ],
        MAX_RUNTIME_PROJECTILE_VISUALS
      ));
    }
    if (nextTexts.length > 0) {
      setTexts((items) => capRuntimeVisualBudget([...items, ...nextTexts], MAX_RUNTIME_FLOATING_TEXT));
    }
    if (damageEvents.length > 0) {
      applyDamageEventBatch(damageEvents);
    }
  }

  return {
    consumeSkillEventTimeline,
    consumeImmediateSkillEvents,
    consumeScheduledSkillEvents,
    updateActiveDamageZones,
    consumeSkillEvent,
    consumeSkillEventBatch
  };
}
