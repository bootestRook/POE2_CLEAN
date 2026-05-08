type SaveSelectionMode = "continue" | "new";

export function SaveSelectionPanel<TSlot extends { id: number }>({
  slots,
  selectedSlotId,
  mode,
  newPlayerName,
  canStart,
  slotHasSave,
  slotMainText,
  slotProgressText,
  slotErrorText,
  footerText,
  onSelectSlot,
  onNewGame,
  onContinue,
  onDelete,
  onBack,
  onNewPlayerNameChange,
  onStart
}: {
  slots: TSlot[];
  selectedSlotId: number;
  mode: SaveSelectionMode;
  newPlayerName: string;
  canStart: boolean;
  slotHasSave: (slot: TSlot) => boolean;
  slotMainText: (slot: TSlot) => string | null;
  slotProgressText: (slot: TSlot) => string;
  slotErrorText: (slot: TSlot) => string | undefined;
  footerText: string;
  onSelectSlot: (slotId: number) => void;
  onNewGame: () => void;
  onContinue: () => void;
  onDelete: (slotId: number) => void;
  onBack: () => void;
  onNewPlayerNameChange: (name: string) => void;
  onStart: () => void;
}) {
  return (
    <section className="save-selection-panel" aria-label="存档选择">
      <div className="save-selection-shell">
        <header className="save-selection-header">
          <div>
            <h2>选择存档</h2>
            <span>暂定 5 个本地存档栏位，数据只保存在当前浏览器。</span>
          </div>
          <button type="button" onClick={onBack}>返回</button>
        </header>
        <div className="save-mode-actions" role="group" aria-label="游戏模式">
          <button type="button" className={mode === "new" ? "active" : ""} onClick={onNewGame}>新建游戏</button>
          <button type="button" className={mode === "continue" ? "active" : ""} onClick={onContinue}>继续游戏</button>
        </div>
        {mode === "new" && (
          <label className="save-player-name-field">
            <span>玩家名称</span>
            <input
              type="text"
              value={newPlayerName}
              maxLength={18}
              autoComplete="off"
              onChange={(event) => onNewPlayerNameChange(event.currentTarget.value)}
            />
          </label>
        )}
        <div className="save-slot-list">
          {slots.map((slot) => {
            const selected = slot.id === selectedSlotId;
            const hasSave = slotHasSave(slot);
            return (
              <article key={slot.id} className={`${selected ? "save-slot-card selected" : "save-slot-card"}${hasSave ? "" : " empty"}`}>
                <button type="button" className="save-slot-main" onClick={() => onSelectSlot(slot.id)}>
                  <strong>存档 {slot.id}</strong>
                  {hasSave ? (
                    <>
                      <span>{slotMainText(slot)}</span>
                      <span>{slotProgressText(slot)}</span>
                    </>
                  ) : (
                    <span>空栏位</span>
                  )}
                  {slotErrorText(slot) && <span className="save-slot-error">{slotErrorText(slot)}</span>}
                </button>
                <button
                  type="button"
                  className="save-slot-delete"
                  disabled={!hasSave}
                  onClick={() => onDelete(slot.id)}
                  aria-label={`删除存档 ${slot.id}`}
                >
                  删除
                </button>
              </article>
            );
          })}
        </div>
        <footer className="save-selection-footer">
          <span>{footerText}</span>
          <button className="entry-primary-button" type="button" disabled={!canStart} onClick={onStart}>
            开始
          </button>
        </footer>
      </div>
    </section>
  );
}
