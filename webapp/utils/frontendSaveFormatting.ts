export const DEFAULT_PLAYER_NAME = "玩家";

export function normalizePlayerName(value: unknown) {
  const trimmed = String(value ?? "").trim();
  return trimmed || DEFAULT_PLAYER_NAME;
}

export function formatFrontendSaveTime(value: string | undefined) {
  if (!value) return "保存时间未知";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "保存时间未知";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
