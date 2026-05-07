export function initialSkillEditorOpen() {
  return false;
}

export function initialSkillEditorMode() {
  return false;
}

export function initialSpriteTestMode() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname.replace(/\/+$/, "");
  return path === "/sprite-test" || params.get("mode") === "sprite-test";
}

export function initialMapEditorMode() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname.replace(/\/+$/, "");
  return path === "/map-editor" || params.get("mode") === "map-editor";
}

export function initialMonsterTestMode() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname.replace(/\/+$/, "");
  return path === "/monster-test" || params.get("mode") === "monster-test";
}
