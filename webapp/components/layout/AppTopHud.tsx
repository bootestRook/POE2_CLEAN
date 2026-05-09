export function AppTopHud({
  title,
  notice,
  skillEditorMode,
  onOpenSkillEditor
}: {
  title: string;
  notice: string;
  skillEditorMode: boolean;
  onOpenSkillEditor: () => void;
}) {
  return (
    <header className="top-hud">
      <div>
        <h1>{title}</h1>
        <span>{notice}</span>
      </div>
      {skillEditorMode && (
        <button className="hud-button" type="button" onClick={onOpenSkillEditor}>
          鎶€鑳界紪杈戝櫒
        </button>
      )}
    </header>
  );
}
