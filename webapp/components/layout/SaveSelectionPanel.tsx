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
    <section className="save-selection-panel" aria-label="瀛樻。閫夋嫨">
      <div className="save-selection-shell">
        <header className="save-selection-header">
          <div>
            <h2>閫夋嫨瀛樻。</h2>
            <span>鏆傚畾 5 涓湰鍦板瓨妗ｆ爮浣嶏紝鏁版嵁鍙繚瀛樺湪褰撳墠娴忚鍣ㄣ€?</span>
          </div>
          <button type="button" onClick={onBack}>杩斿洖</button>
        </header>
        <div className="save-mode-actions" role="group" aria-label="娓告垙妯″紡">
          <button type="button" className={mode === "new" ? "active" : ""} onClick={onNewGame}>鏂板缓娓告垙</button>
          <button type="button" className={mode === "continue" ? "active" : ""} onClick={onContinue}>缁х画娓告垙</button>
        </div>
        {mode === "new" && (
          <label className="save-player-name-field">
            <span>鐜╁鍚嶇О</span>
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
                  <strong>瀛樻。 {slot.id}</strong>
                  {hasSave ? (
                    <>
                      <span>{slotMainText(slot)}</span>
                      <span>{slotProgressText(slot)}</span>
                    </>
                  ) : (
                    <span>绌烘爮浣?</span>
                  )}
                  {slotErrorText(slot) && <span className="save-slot-error">{slotErrorText(slot)}</span>}
                </button>
                <button
                  type="button"
                  className="save-slot-delete"
                  disabled={!hasSave}
                  onClick={() => onDelete(slot.id)}
                  aria-label={`鍒犻櫎瀛樻。 ${slot.id}`}
                >
                  鍒犻櫎
                </button>
              </article>
            );
          })}
        </div>
        <footer className="save-selection-footer">
          <span>{footerText}</span>
          <button className="entry-primary-button" type="button" disabled={!canStart} onClick={onStart}>
            寮€濮?
          </button>
        </footer>
      </div>
    </section>
  );
}
