import type { SkillEvent } from "../types/combatRuntimeTypes";
import type { Enemy } from "../types/enemyTypes";
import type { RuntimeRef, RuntimeStateSetter } from "./skillEventConsumerRuntime";

export type DamageApplicationRuntimeDeps = {
  [key: string]: any;
  enemiesStateRef: RuntimeRef<Enemy[]>;
  setEnemies: RuntimeStateSetter<Enemy[]>;
  setRuntimePlayer: RuntimeStateSetter<any>;
  setKills: RuntimeStateSetter<number>;
  setCombatLogs: RuntimeStateSetter<string[]>;
  consumeSkillEventBatch(events: SkillEvent[]): void;
};

export type DamageApplicationRuntime = {
  applyDamageEventBatch(events: SkillEvent[]): void;
};

export function createDamageApplicationRuntime(deps: DamageApplicationRuntimeDeps): DamageApplicationRuntime {
  const {
    applyDamageToEnemyResources,
    consumeSkillEventBatch,
    damageEventAmountAgainstEnemy,
    elapsedRef,
    frontendSkillEvent,
    frontendUniqueTargetsByDistance,
    gainWarIntentPoint,
    onKillRecastCounts,
    recoverFrontendPlayerOnHit,
    shouldRetainEnemyForGameplayOrDamageFlash,
    spawnFrontendDrops,
    stablePercent,
    enemiesStateRef,
    setCombatLogs,
    setEnemies,
    setKills,
    setRuntimePlayer
  } = deps;

  function applyDamageEventBatch(events: SkillEvent[]) {
    const damageByTarget = new Map<number, number>();
    const enemyById = new Map(enemiesStateRef.current.map((enemy) => [enemy.id, enemy]));
    const remainingHp = new Map(enemiesStateRef.current.map((enemy) => [enemy.id, enemy.hp]));
    const remainingShield = new Map(enemiesStateRef.current.map((enemy) => [enemy.id, Math.max(0, Number(enemy.currentEnergyShield ?? 0))]));
    const killedTriggers: { event: SkillEvent; enemy: Enemy }[] = [];
    for (const event of events) {
      const targetId = Number(event.target_entity);
      if (!Number.isFinite(targetId)) continue;
      const enemy = enemyById.get(targetId);
      const damage = enemy ? damageEventAmountAgainstEnemy(event, enemy, stablePercent) : Number(event.amount ?? 0);
      damageByTarget.set(targetId, (damageByTarget.get(targetId) ?? 0) + damage);
      if (!enemy || damage <= 0) continue;
      if (enemy.boss || enemy.spawnRarity === "rare") gainWarIntentPoint();
      const before = remainingHp.get(targetId) ?? enemy.hp;
      const resourceResult = applyDamageToEnemyResources({
        ...enemy,
        hp: before,
        currentEnergyShield: remainingShield.get(targetId) ?? enemy.currentEnergyShield
      }, damage);
      let after = resourceResult.hp;
      remainingShield.set(targetId, Math.max(0, Number(resourceResult.currentEnergyShield ?? 0)));
      const cullThresholdPercent = Math.max(0, Number(event.payload?.cull_threshold_percent ?? 0));
      if (cullThresholdPercent > 0 && enemy.maxHp > 0 && after > 0 && after / enemy.maxHp * 100 <= cullThresholdPercent) {
        after = 0;
      }
      if (before > 0 && after <= 0) {
        killedTriggers.push({ event, enemy });
      }
      remainingHp.set(targetId, after);
    }
    if (damageByTarget.size === 0) return;
    setRuntimePlayer((current: any) => recoverFrontendPlayerOnHit(current));
    const liveEnemiesAfterDamage = enemiesStateRef.current
      .map((enemy) => {
        const hp = remainingHp.get(enemy.id) ?? enemy.hp;
        const currentEnergyShield = remainingShield.has(enemy.id) ? remainingShield.get(enemy.id) : enemy.currentEnergyShield;
        return { ...enemy, hp, currentEnergyShield, lastDamagedAt: hp < enemy.hp ? elapsedRef.current : enemy.lastDamagedAt };
      })
      .filter((enemy) => shouldRetainEnemyForGameplayOrDamageFlash(enemy, elapsedRef.current));
    let killed = 0;
    const killedEnemies: Enemy[] = [];
    for (const enemy of enemiesStateRef.current) {
      const before = enemy.hp;
      const after = remainingHp.get(enemy.id) ?? before;
      if (before > 0 && after <= 0) {
        killed += 1;
        killedEnemies.push(enemy);
        gainWarIntentPoint();
      }
    }
    const onKillEvents: SkillEvent[] = [];
    for (const trigger of killedTriggers) {
      const event = trigger.event;
      const payload = event.payload ?? {};
      const chromaticChance = Number(payload.on_kill_explosion_chance_percent ?? 0);
      const chromaticRadius = Number(payload.on_kill_explosion_radius ?? 0);
      const chromaticPercent = Number(payload.on_kill_explosion_max_life_percent ?? 0);
      if (chromaticChance > 0 && chromaticRadius > 0 && chromaticPercent > 0) {
        const roll = stablePercent(`${event.event_id}:on_kill_explosion`);
        if (roll <= chromaticChance) {
          const amount = trigger.enemy.maxHp * chromaticPercent / 100;
          const targets = frontendUniqueTargetsByDistance(enemiesStateRef.current, trigger.enemy, chromaticRadius, 8);
          onKillEvents.push(frontendSkillEvent({
            active_gem_instance_id: event.skill_instance_id,
            name_text: String(payload.skill_name ?? "五彩魔矢"),
            skill_template_id: String(payload.skill_id ?? event.skill_instance_id),
            template_text: String(payload.skill_name ?? "五彩魔矢"),
            damage_type: "true",
            behavior_type: "damage_zone",
            visual_effect: event.vfx_key,
            shape_effects: [],
            final_damage: amount,
            final_cooldown_ms: 0,
            projectile_count: 1,
            area_multiplier: 1,
            speed_multiplier: 1,
            applied_modifiers: []
          }, "damage_zone", null, { x: trigger.enemy.x, y: trigger.enemy.y }, event.direction, amount, "true", {
            secondary_hit_id: "on_kill_explosion",
            radius: chromaticRadius,
            hit_target_count: targets.length,
            trigger_event_type: "unit_killed"
          }, 240));
          for (const target of targets) {
            if (target.id === trigger.enemy.id) continue;
            onKillEvents.push({
              ...event,
              event_id: `${event.event_id}.on_kill.${target.id}`,
              type: "damage",
              target_entity: String(target.id),
              position: { x: target.x, y: target.y },
              amount,
              damage_type: "true",
              payload: {
                ...payload,
                secondary_hit_id: "on_kill_explosion",
                damage_components: { true: amount },
                trigger_event_type: "unit_killed"
              }
            });
            onKillEvents.push({
              ...event,
              event_id: `${event.event_id}.on_kill_text.${target.id}`,
              type: "floating_text",
              target_entity: String(target.id),
              position: { x: target.x, y: target.y - 28 },
              amount,
              damage_type: "true",
              duration_ms: 800,
              payload: {
                ...payload,
                secondary_hit_id: "on_kill_explosion",
                damage_components: { true: amount },
                trigger_event_type: "unit_killed"
              }
            });
          }
        }
      }
      const recastChance = Number(payload.on_kill_recast_chance_percent ?? 0);
      const areaId = typeof payload.area_id === "string" ? payload.area_id : "";
      if (recastChance > 0 && areaId) {
        const maxRecasts = Math.max(1, Number(payload.on_kill_recast_max_per_area ?? 1));
        const currentCount = onKillRecastCounts.current.get(areaId) ?? 0;
        if (currentCount < maxRecasts && stablePercent(`${event.event_id}:on_kill_recast:${currentCount + 1}`) <= recastChance) {
          onKillRecastCounts.current.set(areaId, currentCount + 1);
          const radius = Number(payload.radius ?? 118);
          const targets = frontendUniqueTargetsByDistance(enemiesStateRef.current, trigger.enemy, radius, 8, new Set([trigger.enemy.id]));
          onKillEvents.push({
            ...event,
            event_id: `${event.event_id}.recast_area`,
            type: "area_spawn",
            target_entity: "",
            position: { x: trigger.enemy.x, y: trigger.enemy.y },
            amount: null,
            payload: {
              ...payload,
              area_id: `${areaId}.recast.${currentCount + 1}`,
              center_world_position: { x: trigger.enemy.x, y: trigger.enemy.y },
              trigger_event_type: "unit_killed"
            }
          });
          for (const target of targets) {
            onKillEvents.push({
              ...event,
              event_id: `${event.event_id}.recast_damage.${target.id}`,
              target_entity: String(target.id),
              position: { x: target.x, y: target.y },
              payload: {
                ...payload,
                area_id: `${areaId}.recast.${currentCount + 1}`,
                damage_components: { [event.damage_type]: Number(event.amount ?? 0) },
                trigger_event_type: "unit_killed"
              }
            });
          }
        }
      }
    }
    enemiesStateRef.current = liveEnemiesAfterDamage;
    setEnemies(liveEnemiesAfterDamage);
    if (killed > 0) {
      const skillName = events.find((event) => typeof event.payload?.skill_name === "string")?.payload?.skill_name ?? "技能";
      setKills((value) => value + killed);
      void spawnFrontendDrops(killedEnemies);
      setCombatLogs((logs) => [`${skillName} 击杀 ${killed} 个怪物。`, ...logs].slice(0, 8));
    }
    if (onKillEvents.length > 0) consumeSkillEventBatch(onKillEvents);
  }

  return {
    applyDamageEventBatch
  };
}
