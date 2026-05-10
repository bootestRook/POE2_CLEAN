import type { RestAreaInteractionKind } from "./RestAreaScene";

export const REST_AREA_INTERACTION_KINDS: readonly RestAreaInteractionKind[] = ["stage", "stash", "forge"];

export function restAreaInteractionOpensInventory(kind: RestAreaInteractionKind) {
  return kind === "stash" || kind === "forge";
}

export function restAreaInteractionUsesForge(kind: RestAreaInteractionKind) {
  return kind === "forge";
}
