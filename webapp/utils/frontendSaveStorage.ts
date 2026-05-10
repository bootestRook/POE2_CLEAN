import { localize, localizeTemplate } from "../localization";

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

export type FrontendSaveStoragePayload = {
  version: number;
  saved_at?: string;
  player_name?: string;
  [key: string]: unknown;
};

export type FrontendSaveStorageResult<TSave> = {
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

export function loadFrontendAutosaveResult<TSave extends FrontendSaveStoragePayload>(
  storage: Storage = window.localStorage
): FrontendSaveStorageResult<TSave> {
  try {
    const raw = storage.getItem(FRONTEND_AUTOSAVE_STORAGE_KEY);
    if (!raw) return { save: null, errorText: "" };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { save: null, errorText: localize("ui.save.autosave_invalid_format") };
    }
    const save = parsed as TSave;
    if (save.version !== FRONTEND_SAVE_VERSION) {
      return { save: null, errorText: localize("ui.save.autosave_version_mismatch") };
    }
    return { save, errorText: "" };
  } catch {
    return { save: null, errorText: localize("ui.save.autosave_read_failed") };
  }
}

export function loadFrontendSaveSlotResult<TSave extends FrontendSaveStoragePayload>(
  slotId: number,
  storage: Storage = window.localStorage
): FrontendSaveStorageResult<TSave> {
  try {
    const raw = storage.getItem(frontendSaveSlotKey(slotId));
    if (!raw) return { save: null, errorText: "" };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { save: null, errorText: localizeTemplate("ui.save.slot_invalid_format", { slotId }) };
    }
    const save = parsed as TSave;
    if (save.version !== FRONTEND_SAVE_VERSION) {
      return { save: null, errorText: localizeTemplate("ui.save.slot_version_mismatch", { slotId }) };
    }
    return { save, errorText: "" };
  } catch {
    return { save: null, errorText: localizeTemplate("ui.save.slot_read_failed", { slotId }) };
  }
}

export function migrateLegacyFrontendAutosaveToSaveSlots<TSave extends FrontendSaveStoragePayload>(
  storage: Storage = window.localStorage
) {
  try {
    const anySlotUsed = Array.from({ length: FRONTEND_SAVE_SLOT_COUNT }, (_, index) => index + 1)
      .some((slotId) => Boolean(storage.getItem(frontendSaveSlotKey(slotId))));
    if (anySlotUsed) return;
    const legacy = loadFrontendAutosaveResult<TSave>(storage).save;
    if (!legacy) return;
    storage.setItem(frontendSaveSlotKey(1), JSON.stringify({ ...legacy, saved_at: legacy.saved_at ?? new Date().toISOString() }));
    storage.setItem(FRONTEND_ACTIVE_SAVE_SLOT_STORAGE_KEY, "1");
  } catch {
    // Ignore migration errors; the save menu can still create fresh client-side slots.
  }
}

export function loadFrontendSaveSlotSummaries<TSave extends FrontendSaveStoragePayload>(
  storage: Storage = window.localStorage
): FrontendSaveSlotSummary<TSave>[] {
  migrateLegacyFrontendAutosaveToSaveSlots<TSave>(storage);
  return Array.from({ length: FRONTEND_SAVE_SLOT_COUNT }, (_, index) => {
    const id = index + 1;
    const result = loadFrontendSaveSlotResult<TSave>(id, storage);
    return { id, save: result.save, errorText: result.errorText };
  });
}

export function clearFrontendSaveSlot(slotId: number, storage: Storage = window.localStorage) {
  const activeSlotId = loadActiveFrontendSaveSlotId(storage);
  storage.removeItem(frontendSaveSlotKey(slotId));
  if (activeSlotId === slotId) saveActiveFrontendSaveSlotId(null, storage);
  if (activeSlotId === slotId || slotId === 1) storage.removeItem(FRONTEND_AUTOSAVE_STORAGE_KEY);
}

export function saveFrontendAutosavePayload<TSave extends FrontendSaveStoragePayload>(
  payload: TSave,
  storage: Storage = window.localStorage
) {
  storage.setItem(FRONTEND_AUTOSAVE_STORAGE_KEY, JSON.stringify(payload));
  const activeSlotId = loadActiveFrontendSaveSlotId(storage);
  if (activeSlotId !== null) {
    storage.setItem(frontendSaveSlotKey(activeSlotId), JSON.stringify(payload));
  }
}

export function clearFrontendAutosave(storage: Storage = window.localStorage) {
  storage.removeItem(FRONTEND_AUTOSAVE_STORAGE_KEY);
}

export function frontendSavePayloadFromSanitizedState<TState extends Record<string, unknown>, TPayload extends FrontendSaveStoragePayload>(
  state: TState,
  normalizePlayerName: (value: unknown) => string
): TPayload {
  return {
    version: FRONTEND_SAVE_VERSION,
    saved_at: new Date().toISOString(),
    player_name: normalizePlayerName(state.player_name),
    inventory: state.inventory,
    stash_pages: state.stash_pages,
    board: state.board,
    skill_preview: state.skill_preview,
    skill_error: state.skill_error,
    drops: state.drops,
    logs: state.logs,
    player_stats: state.player_stats,
    character_panel: state.character_panel,
    equipment_slots: state.equipment_slots,
    map_progression: state.map_progression,
    ui_text: state.ui_text
  } as TPayload;
}

export function frontendStateCandidateFromSave<
  TState extends Record<string, any>,
  TPayload extends FrontendSaveStoragePayload & { app_state?: unknown }
>(
  save: TPayload | null,
  createInitialState: () => TState,
  normalizePlayerName: (value: unknown) => string,
  normalizeStashPages: (value: unknown, state?: Pick<TState, "inventory" | "equipment_slots" | "board">) => TState["stash_pages"]
): TState | null {
  if (!save || Number(save.version) !== FRONTEND_SAVE_VERSION) return null;
  const legacyState = save.app_state;
  if (legacyState && typeof legacyState === "object") return legacyState as TState;

  const initial = createInitialState();
  const inventory = Array.isArray(save.inventory) ? save.inventory : initial.inventory;
  const equipmentSlots = Array.isArray(save.equipment_slots) ? save.equipment_slots : initial.equipment_slots;
  const board = save.board ?? initial.board;
  return {
    ...initial,
    player_name: normalizePlayerName(save.player_name ?? initial.player_name),
    inventory,
    stash_pages: normalizeStashPages(save.stash_pages, {
      ...initial,
      inventory,
      board,
      equipment_slots: equipmentSlots
    }),
    board,
    skill_preview: Array.isArray(save.skill_preview) ? save.skill_preview : initial.skill_preview,
    skill_error: save.skill_error ?? null,
    drops: Array.isArray(save.drops) ? save.drops : [],
    logs: Array.isArray(save.logs) ? save.logs : initial.logs,
    player_stats: save.player_stats ?? initial.player_stats,
    character_panel: save.character_panel ?? initial.character_panel,
    equipment_slots: equipmentSlots,
    map_progression: save.map_progression ?? initial.map_progression,
    current_map_run: null,
    autosave: initial.autosave,
    ui_text: save.ui_text ?? initial.ui_text
  } as TState;
}
