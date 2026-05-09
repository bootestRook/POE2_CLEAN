import type { GameResolutionMode, GameResolutionPreset } from "../../hooks/useGameViewport";
import type { ProceduralSpawnDebugSummary } from "../../mapSpawnRuntime";
import type { SkillEditorCameraSettings, SkillEditorDebugOptions } from "../../types/skillEditorTypes";
import { BattlePauseOverlay, GameFailureOverlay, PortalConfirmOverlay } from "../battle/BattleOverlays";
import { MapSelectionPanel } from "../battle/MapSelectionPanel";
import { ProceduralSpawnDebugPanel } from "../battle/ProceduralSpawnDebugPanel";
import { SkillEditorDebugToggles } from "../../features/disabled-skill-editor/SkillEditorDebugToggles";
import { CombatFeed, HelpText, MapDebugToggle, SpawnPlanWarningPanel } from "./AppShellPanels";

type MapSelectionStage = {
  id: string;
  display_name: string;
  enterable: boolean;
  selected?: boolean;
  map_level_text: string;
  monster_level: number;
  free_entry: boolean;
  entry_count: number;
  entry_cost: number;
  boss_stage?: boolean;
};

export function GameShellOverlays<TStage extends MapSelectionStage>({
  releaseDebugToolsEnabled,
  monsterTestMode,
  skillEditorMode,
  playing,
  restAreaMapActive,
  entryStep,
  restAreaPanel,
  gameFailureOpen,
  battlePauseOpen,
  battlePauseView,
  bossPortalConfirm,
  mapDebugEnabled,
  proceduralSpawnDebug,
  spawnPlanWarnings,
  runtimeBoundaryScanLine,
  runtimeDebugCornerSummary,
  combatLogs,
  skillEditorDebugOptions,
  skillEditorCameraSettings,
  battleMapReady,
  progression,
  resolutionPresets,
  resolutionMode,
  stageScopeText,
  stageBossPoolText,
  onMapDebugChange,
  onGameFailureClose,
  onPauseViewChange,
  onResolutionModeChange,
  onPauseContinue,
  onExitRun,
  onEndGame,
  onPortalConfirm,
  onPortalCancel,
  onSkillEditorDebugOptionsChange,
  onSkillEditorCameraSettingsChange,
  onStartStage,
  onCloseRestAreaPanel
}: {
  releaseDebugToolsEnabled: boolean;
  monsterTestMode: boolean;
  skillEditorMode: boolean;
  playing: boolean;
  restAreaMapActive: boolean;
  entryStep: "title" | "save" | "rest";
  restAreaPanel: "stage" | "stash" | null;
  gameFailureOpen: boolean;
  battlePauseOpen: boolean;
  battlePauseView: "menu" | "settings";
  bossPortalConfirm: unknown;
  mapDebugEnabled: boolean;
  proceduralSpawnDebug: ProceduralSpawnDebugSummary | null;
  spawnPlanWarnings: string[];
  runtimeBoundaryScanLine: string | null;
  runtimeDebugCornerSummary: string | null;
  combatLogs: string[];
  skillEditorDebugOptions: SkillEditorDebugOptions;
  skillEditorCameraSettings: SkillEditorCameraSettings;
  battleMapReady: boolean;
  progression?: { stages: TStage[] };
  resolutionPresets: GameResolutionPreset[];
  resolutionMode: GameResolutionMode;
  stageScopeText: (stage: TStage) => string;
  stageBossPoolText: (stage: TStage) => string;
  onMapDebugChange: (enabled: boolean) => void;
  onGameFailureClose: () => void;
  onPauseViewChange: (view: "menu" | "settings") => void;
  onResolutionModeChange: (mode: GameResolutionMode) => void;
  onPauseContinue: () => void;
  onExitRun: () => void;
  onEndGame: () => void;
  onPortalConfirm: () => void;
  onPortalCancel: () => void;
  onSkillEditorDebugOptionsChange: (options: SkillEditorDebugOptions) => void;
  onSkillEditorCameraSettingsChange: (settings: SkillEditorCameraSettings) => void;
  onStartStage: (stageId: string) => void;
  onCloseRestAreaPanel: () => void;
}) {
  return (
    <>
      {releaseDebugToolsEnabled && (
        <MapDebugToggle enabled={mapDebugEnabled} onChange={onMapDebugChange} />
      )}
      {releaseDebugToolsEnabled && <ProceduralSpawnDebugPanel debug={proceduralSpawnDebug} />}
      {releaseDebugToolsEnabled && spawnPlanWarnings.length > 0 ? (
        <SpawnPlanWarningPanel warnings={spawnPlanWarnings} />
      ) : null}

      {!monsterTestMode && gameFailureOpen && (
        <GameFailureOverlay onClose={onGameFailureClose} />
      )}

      {!monsterTestMode && !skillEditorMode && (playing || restAreaMapActive) && battlePauseOpen && (
        <BattlePauseOverlay
          view={battlePauseView}
          playing={playing}
          resolutionPresets={resolutionPresets}
          resolutionMode={resolutionMode}
          onViewChange={onPauseViewChange}
          onResolutionModeChange={onResolutionModeChange}
          onContinue={onPauseContinue}
          onExitRun={onExitRun}
          onEndGame={onEndGame}
        />
      )}

      {!monsterTestMode && !skillEditorMode && playing && bossPortalConfirm && (
        <PortalConfirmOverlay onConfirm={onPortalConfirm} onCancel={onPortalCancel} />
      )}

      <HelpText />

      {skillEditorMode && (
        <SkillEditorDebugToggles
          options={skillEditorDebugOptions}
          cameraSettings={skillEditorCameraSettings}
          onChange={onSkillEditorDebugOptionsChange}
          onCameraSettingsChange={onSkillEditorCameraSettingsChange}
        />
      )}

      {!monsterTestMode && !playing && !skillEditorMode && entryStep === "rest" && restAreaPanel === "stage" && (
        <MapSelectionPanel
          battleMapReady={battleMapReady}
          progression={progression}
          stageScopeText={stageScopeText}
          stageBossPoolText={stageBossPoolText}
          onStart={onStartStage}
          onClose={onCloseRestAreaPanel}
        />
      )}

      {releaseDebugToolsEnabled && (
        <CombatFeed
          runtimeBoundaryScanLine={runtimeBoundaryScanLine}
          runtimeDebugCornerSummary={runtimeDebugCornerSummary}
          combatLogs={combatLogs}
        />
      )}
    </>
  );
}
