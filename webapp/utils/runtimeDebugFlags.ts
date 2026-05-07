export type RuntimeDebugMapInstanceRotation = 0 | 90 | 180 | 270;

export function runtimeDebugMonsterCornerTestEnabled() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debugMonsterCorner") === "1";
}

export function runtimeDebugMonsterBoundaryTestEnabled() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debugMonsterBoundary") === "1";
}

export function runtimeDebugMapInstanceSeed() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("debugMapSeed") ?? "";
}

export function runtimeDebugMapInstanceRotation(): RuntimeDebugMapInstanceRotation | null {
  if (typeof window === "undefined") return null;
  const rawValue = new URLSearchParams(window.location.search).get("debugMapRotation");
  if (rawValue === null) return null;
  const value = Number(rawValue);
  return value === 0 || value === 90 || value === 180 || value === 270 ? value : null;
}
