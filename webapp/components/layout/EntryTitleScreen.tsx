export function EntryTitleScreen({
  title,
  onStart
}: {
  title: string;
  onStart: () => void;
}) {
  return (
    <section className="entry-title-screen" aria-label="开始游戏">
      <div className="entry-title-copy">
        <h2>{title}</h2>
      </div>
      <button
        className="entry-primary-button"
        type="button"
        onClick={onStart}
      >
        开始游戏
      </button>
    </section>
  );
}
