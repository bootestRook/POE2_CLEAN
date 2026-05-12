import { TOPOLOGY_PRESETS } from "./mapGenerationConfig";
import type { MapTopologyPreset } from "./mapGenerationTypes";

export type SeededRandom = {
  next: () => number;
  int: (min: number, max: number) => number;
  pick: <T>(items: T[]) => T;
  chance: (probability: number) => boolean;
  fork: (salt: string) => SeededRandom;
};

export function createSeededRandom(seedText: string): SeededRandom {
  let seed = 2166136261;
  for (let index = 0; index < seedText.length; index += 1) {
    seed ^= seedText.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }
  const next = () => {
    seed += 0x6D2B79F5;
    let value = seed;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.min(items.length - 1, Math.floor(next() * items.length))],
    chance: (probability) => next() < probability,
    fork: (salt) => createSeededRandom(`${seedText}:${salt}`)
  };
}

export function chooseTopologyPreset(seed: string, explicit?: MapTopologyPreset): MapTopologyPreset {
  if (explicit) return explicit;
  return createSeededRandom(`${seed}:topology`).pick(TOPOLOGY_PRESETS);
}
