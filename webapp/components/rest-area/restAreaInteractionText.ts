import type { RestAreaInteractionKind } from "./RestAreaScene";

export function restAreaInteractionNotice(kind: RestAreaInteractionKind) {
  if (kind === "stage") return "王阳正在整理关卡情报。";
  if (kind === "stash") return "仓库已打开。";
  return "锻造台已打开。";
}

export function restAreaApproachNotice(kind: RestAreaInteractionKind) {
  if (kind === "stage") return "正在走向王阳。";
  if (kind === "stash") return "正在走向仓库。";
  return "正在走向锻造台。";
}
