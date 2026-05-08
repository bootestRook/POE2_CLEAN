export const FRONTEND_AUTOSAVE_STORAGE_KEY = "poe2.v1.frontend.autosave";
export const FRONTEND_ACTIVE_SAVE_SLOT_STORAGE_KEY = "poe2.v1.frontend.active_save_slot";
export const FRONTEND_SAVE_SLOT_KEY_PREFIX = "poe2.v1.frontend.save.slot.";
export const FRONTEND_SAVE_SLOT_COUNT = 5;
export const FRONTEND_SAVE_VERSION = 1;

export type FrontendSaveSlotSummary<TSave> = {
  id: number;
  save: TSave | null;
  errorText: string;
};

export function frontendSaveSlotKey(slotId: number) {
  return `${FRONTEND_SAVE_SLOT_KEY_PREFIX}${slotId}`;
}

export function normalizeFrontendSaveSlotId(value: unknown, slotCount = FRONTEND_SAVE_SLOT_COUNT): number | null {
  const slotId = Number(value);
  if (!Number.isInteger(slotId) || slotId < 1 || slotId > slotCount) return null;
  return slotId;
}

export function loadActiveFrontendSaveSlotId(storage: Storage = window.localStorage): number | null {
  try {
    return normalizeFrontendSaveSlotId(storage.getItem(FRONTEND_ACTIVE_SAVE_SLOT_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveActiveFrontendSaveSlotId(slotId: number | null, storage: Storage = window.localStorage) {
  if (slotId === null) {
    storage.removeItem(FRONTEND_ACTIVE_SAVE_SLOT_STORAGE_KEY);
    return;
  }
  storage.setItem(FRONTEND_ACTIVE_SAVE_SLOT_STORAGE_KEY, String(slotId));
}

export function frontendSaveTimestamp(save: { saved_at?: string | null } | null | undefined) {
  const timestamp = Date.parse(save?.saved_at ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function latestFrontendSaveSlotId<TSave extends { saved_at?: string | null }>(
  slots: readonly FrontendSaveSlotSummary<TSave>[]
) {
  const sorted = slots
    .filter((slot) => slot.save)
    .sort((a, b) => frontendSaveTimestamp(b.save) - frontendSaveTimestamp(a.save));
  return sorted[0]?.id ?? null;
}
