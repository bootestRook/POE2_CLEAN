import { resolveDirection } from "../unitAnimation";
import type { UnitAnimationState, UnitDirection } from "../unitAssets";

export function playerInputVector(keys: Set<string>) {
  let x = 0;
  let y = 0;
  if (keys.has("a")) x -= 1;
  if (keys.has("d")) x += 1;
  if (keys.has("w")) y -= 1;
  if (keys.has("s")) y += 1;
  return { x, y };
}

export function resolveAnimationDirection(vector: { x: number; y: number }, fallbackDirection: UnitDirection) {
  return resolveDirection(vector, fallbackDirection);
}

export function projectMovementVectorForAnimation(vector: { x: number; y: number }) {
  return {
    x: vector.x - vector.y,
    y: vector.x + vector.y
  };
}

export function unitMovementState(moving: boolean, baseMoveSpeed: number, currentMoveSpeed: number): UnitAnimationState {
  void baseMoveSpeed;
  void currentMoveSpeed;
  if (!moving) return "idle";
  return "walk";
}
