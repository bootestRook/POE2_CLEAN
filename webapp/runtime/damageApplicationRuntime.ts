import type { SkillEvent } from "../types/combatRuntimeTypes";
import type { Enemy } from "../types/enemyTypes";
import type { RuntimeRef, RuntimeStateSetter } from "./skillEventConsumerRuntime";

export type DamageApplicationRuntimeDeps = {
  [key: string]: any;
  enemiesStateRef: RuntimeRef<Enemy[]>;
  setEnemies: RuntimeStateSetter<Enemy[]>;
  setRuntimePlayer: RuntimeStateSetter<unknown>;
  setKills: RuntimeStateSetter<number>;
  setCombatLogs: RuntimeStateSetter<string[]>;
  consumeSkillEventBatch(events: SkillEvent[]): void;
};

export type DamageApplicationRuntime = {
  applyDamageEventBatch(events: SkillEvent[]): void;
};

export function createDamageApplicationRuntime(deps: DamageApplicationRuntimeDeps): DamageApplicationRuntime {
  function applyDamageEventBatch(events: SkillEvent[]) {
    deps.applyDamageEventBatch(events);
  }

  return {
    applyDamageEventBatch
  };
}
