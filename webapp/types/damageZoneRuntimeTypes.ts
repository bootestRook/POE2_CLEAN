import type { SkillEvent } from "./skillEventTypes";

export type ActiveDamageZoneRuntime = {
  zoneId: string;
  event: SkillEvent;
  payload: NonNullable<SkillEvent["payload"]>;
  origin: { x: number; y: number };
  direction: { x: number; y: number };
  shape: "circle" | "rectangle";
  radius: number;
  length: number;
  width: number;
  followPlayer: boolean;
  remainingMs: number;
  tickIntervalMs: number;
  nextTickMs: number;
  tickIndex: number;
  maxTargets: number;
  maxHits: number;
  maxHitsPerTarget: number;
  totalHits: number;
  hitCounts: Map<number, number>;
};
