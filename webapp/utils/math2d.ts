export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function guideDirection(source: { x: number; y: number }, target: { x: number; y: number }) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

export function normalizeMoveVector(vector: { x: number; y: number }) {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= 0.001) return { x: 0, y: 0 };
  return { x: vector.x / length, y: vector.y / length };
}
