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
  refs: SkillEventConsumerRefs;
  visualSetters: SkillEventConsumerVisualSetters;
  consumeSkillEventBatch(events: SkillEvent[]): void;
  updateActiveDamageZones(dt: number): number;
};

export function createSkillEventConsumerRuntime(deps: SkillEventConsumerRuntimeDeps): SkillEventConsumerRuntime {
  function consumeSkillEventTimeline(events: SkillEvent[]) {
    if (events.length === 0) return;
    const immediate: SkillEvent[] = [];
    for (const event of events) {
      const delaySeconds = Math.max(0, Number(event.delay_ms ?? 0)) / 1000;
      if (delaySeconds <= 0) {
        immediate.push(event);
      } else {
        deps.refs.scheduledSkillEvents.current.push({ event, remaining: delaySeconds });
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
    for (const scheduled of deps.refs.scheduledSkillEvents.current) {
      const remaining = scheduled.remaining - dt;
      if (remaining <= 0) {
        ready.push(scheduled.event);
      } else {
        pending.push({ ...scheduled, remaining });
      }
    }
    deps.refs.scheduledSkillEvents.current = pending;
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
    deps.consumeSkillEventBatch(events);
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
