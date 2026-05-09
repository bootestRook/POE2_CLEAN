import type { GameResolutionMode, GameResolutionPreset } from "../../hooks/useGameViewport";

type GameFailureOverlayProps = {
  onClose: () => void;
};

export function GameFailureOverlay({ onClose }: GameFailureOverlayProps) {
  return (
    <section className="game-failure-overlay" role="dialog" aria-modal="true" aria-label="游戏失败">
      <div className="game-failure-dialog">
        <span>游戏失败</span>
        <h2>玩家生命已归零</h2>
        <p>本次战斗已经结束。</p>
        <button type="button" onClick={onClose}>返回休息区</button>
      </div>
    </section>
  );
}

type BattlePauseOverlayProps = {
  view: "menu" | "settings";
  playing: boolean;
  resolutionPresets: GameResolutionPreset[];
  resolutionMode: GameResolutionMode;
  onViewChange: (view: "menu" | "settings") => void;
  onResolutionModeChange: (mode: GameResolutionMode) => void;
  onContinue: () => void;
  onExitRun: () => void;
  onEndGame: () => void;
};

export function BattlePauseOverlay({
  view,
  playing,
  resolutionPresets,
  resolutionMode,
  onViewChange,
  onResolutionModeChange,
  onContinue,
  onExitRun,
  onEndGame
}: BattlePauseOverlayProps) {
  return (
    <section className="battle-pause-overlay" role="dialog" aria-modal="true" aria-label="暂停菜单">
      <div className="battle-pause-dialog" data-view={view}>
        {view === "settings" && (
          <div className="battle-settings-panel">
            <span>设置</span>
            <h2>分辨率</h2>
            <div className="battle-resolution-options">
              {resolutionPresets.map((preset) => (
                <button
                  key={preset.mode}
                  type="button"
                  className={preset.mode === resolutionMode ? "selected" : ""}
                  aria-pressed={preset.mode === resolutionMode}
                  onClick={() => void onResolutionModeChange(preset.mode)}
                >
                  <strong>{preset.label}</strong>
                  <small>{preset.width && preset.height ? `${preset.width} x ${preset.height}` : "100vw x 100vh"}</small>
                </button>
              ))}
            </div>
            <div className="battle-pause-actions">
              <button type="button" onClick={() => onViewChange("menu")}>返回</button>
              <button type="button" onClick={onContinue}>继续</button>
            </div>
          </div>
        )}
        <span>暂停菜单</span>
        <h2>{playing ? "游戏已暂停" : "休息区菜单"}</h2>
        <div className="battle-pause-actions">
          <button type="button" onClick={onContinue}>继续</button>
          <button type="button" onClick={() => onViewChange("settings")}>设置</button>
          {playing ? <button type="button" onClick={onExitRun}>退出当前对局</button> : null}
          <button type="button" onClick={onEndGame}>{playing ? "结束游戏" : "退出游戏"}</button>
        </div>
      </div>
    </section>
  );
}

type PortalConfirmOverlayProps = {
  onConfirm: () => void;
  onCancel: () => void;
};

export function PortalConfirmOverlay({ onConfirm, onCancel }: PortalConfirmOverlayProps) {
  return (
    <section className="portal-confirm-overlay" role="dialog" aria-modal="true" aria-label="离开区域确认">
      <div className="portal-confirm-dialog">
        <span>传送门</span>
        <h2>是否离开该区域？</h2>
        <div className="portal-confirm-actions">
          <button type="button" onClick={onConfirm}>离开</button>
          <button type="button" onClick={onCancel}>取消</button>
        </div>
      </div>
    </section>
  );
}
