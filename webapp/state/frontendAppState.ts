import { clearFrontendAutosave, clearFrontendSaveSlot, frontendSavePayloadFromSanitizedState, frontendStateCandidateFromSave, saveFrontendAutosavePayload, type FrontendSaveStoragePayload } from "../utils/frontendSaveStorage";
import { DEFAULT_PLAYER_NAME, normalizePlayerName } from "../utils/frontendSaveFormatting";

type FrontendStateGem = {
  instance_id: string;
  base_gem_id?: string;
  gem_kind?: string;
  level?: number;
  locked?: boolean;
  board_position?: { row: number; column: number } | null;
};

type FrontendStateCell<TGem extends FrontendStateGem> = {
  gem?: TGem | null;
};

type FrontendStateBoard<TGem extends FrontendStateGem> = {
  cells: FrontendStateCell<TGem>[][];
};

type FrontendStatePlayerStats = Record<string, { value?: unknown } & Record<string, unknown>>;

type FrontendState<TGem extends FrontendStateGem> = Record<string, any> & {
  player_name: string;
  inventory: TGem[];
  stash_pages?: (string | null)[][];
  skill_preview: unknown[];
  drops: unknown[];
  equipment_slots?: (string | null)[];
  board: FrontendStateBoard<TGem> & Record<string, unknown>;
  player_stats?: FrontendStatePlayerStats;
};

type FrontendAppStateHelperDeps<
  TState extends FrontendState<TGem>,
  TPayload extends FrontendSaveStoragePayload,
  TGem extends FrontendStateGem
> = {
  cloneFrontendData: <T>(value: T) => T;
  cloneFrontendInitialAppStateSeed: () => TState;
  frontendGemDropPool: () => readonly TGem[];
  createEmptyStashPages: () => (string | null)[][];
  normalizeStashPages: (value: unknown, state?: Pick<TState, "inventory" | "equipment_slots" | "board">) => TState["stash_pages"];
  sanitizeFrontendStorageState: (state: TState) => TState;
  recalculateFrontendSkillPreview: (state: TState) => TState;
  recalculateFrontendEquipmentState: (state: TState) => TState;
  starterGemBoardPosition: { row: number; column: number };
  excludedStarterBaseGemIds: Set<string>;
  monsterTestPlayerLife: number;
  equipmentSlotCount: number;
};

export function createFrontendAppStateHelpers<
  TState extends FrontendState<TGem>,
  TPayload extends FrontendSaveStoragePayload,
  TGem extends FrontendStateGem
>({
  cloneFrontendData,
  cloneFrontendInitialAppStateSeed,
  frontendGemDropPool,
  createEmptyStashPages,
  normalizeStashPages,
  sanitizeFrontendStorageState,
  recalculateFrontendSkillPreview,
  recalculateFrontendEquipmentState,
  starterGemBoardPosition,
  excludedStarterBaseGemIds,
  monsterTestPlayerLife,
  equipmentSlotCount
}: FrontendAppStateHelperDeps<TState, TPayload, TGem>) {
  function createFrontendInitialAppState(): TState {
    return sanitizeFrontendStorageState(recalculateFrontendSkillPreview(cloneFrontendInitialAppStateSeed()));
  }

  function createMonsterTestAppState(): TState {
    const state = cloneFrontendInitialAppStateSeed();
    state.player_name = "怪物测试";
    state.inventory = [];
    state.stash_pages = createEmptyStashPages();
    state.drops = [];
    state.skill_preview = [];
    state.equipment_slots = Array(equipmentSlotCount).fill(null);
    state.board = {
      ...state.board,
      cells: state.board.cells.map((row) => row.map((cell) => ({ ...cell, gem: null })))
    };
    if (state.player_stats?.max_life) state.player_stats.max_life.value = monsterTestPlayerLife;
    return sanitizeFrontendStorageState(recalculateFrontendEquipmentState(recalculateFrontendSkillPreview(state)));
  }

  function createFrontendNewGameState(slotId?: number, playerName = DEFAULT_PLAYER_NAME): TState {
    if (slotId) clearFrontendSaveSlot(slotId);
    else clearFrontendAutosave();
    return createFrontendNewSaveStarterState(slotId, playerName);
  }

  function createFrontendNewSaveStarterState(slotId?: number, playerName = DEFAULT_PLAYER_NAME): TState {
    const state = cloneFrontendInitialAppStateSeed();
    state.player_name = normalizePlayerName(playerName);
    state.inventory = [];
    state.stash_pages = createEmptyStashPages();
    state.drops = [];
    state.equipment_slots = Array(equipmentSlotCount).fill(null);
    state.board = {
      ...state.board,
      cells: state.board.cells.map((row) => row.map((cell) => ({ ...cell, gem: null })))
    };
    const starterGem = createRandomNewSaveStarterGem(slotId);
    if (starterGem) {
      state.inventory = [starterGem];
      const cell = state.board.cells[starterGemBoardPosition.row]?.[starterGemBoardPosition.column];
      if (cell) cell.gem = starterGem;
    }
    return sanitizeFrontendStorageState(recalculateFrontendEquipmentState(recalculateFrontendSkillPreview(state)));
  }

  function createRandomNewSaveStarterGem(slotId?: number): TGem | null {
    const activeGems = frontendGemDropPool()
      .filter((gem) => (
        gem.gem_kind === "active_skill"
        && Number(gem.level ?? 1) === 1
        && !excludedStarterBaseGemIds.has(String(gem.base_gem_id ?? gem.instance_id))
      ));
    if (activeGems.length === 0) return null;
    const seed = Date.now() + Math.floor(Math.random() * 1_000_000) + (slotId ?? 0) * 9973;
    const template = activeGems[seed % activeGems.length];
    const baseId = String(template.base_gem_id ?? template.instance_id);
    return {
      ...cloneFrontendData(template),
      instance_id: `new_save_starter_${seed}_${baseId}`,
      level: 1,
      locked: false,
      board_position: { ...starterGemBoardPosition }
    };
  }

  function appStateFromFrontendSave(save: TPayload | null): TState | null {
    const candidate = frontendStateCandidateFromSave<TState, TPayload>(
      save,
      createFrontendInitialAppState,
      normalizePlayerName,
      normalizeStashPages
    );
    return candidate ? recalculateFrontendSkillPreview(recalculateFrontendEquipmentState(sanitizeFrontendStorageState(candidate))) : null;
  }

  function frontendSavePayloadFromState(state: TState): TPayload {
    const sanitized = sanitizeFrontendStorageState(state);
    return frontendSavePayloadFromSanitizedState<TState, TPayload>(sanitized, normalizePlayerName);
  }

  function saveFrontendAutosave(state: TState) {
    saveFrontendAutosavePayload(frontendSavePayloadFromState(state));
  }

  return {
    createFrontendInitialAppState,
    createMonsterTestAppState,
    createFrontendNewGameState,
    createFrontendNewSaveStarterState,
    createRandomNewSaveStarterGem,
    appStateFromFrontendSave,
    frontendSavePayloadFromState,
    saveFrontendAutosave
  };
}
