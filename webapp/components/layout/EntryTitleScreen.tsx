export function EntryTitleScreen({
  title,
  onStart
}: {
  title: string;
  onStart: () => void;
}) {
  return (
    <section className="entry-title-screen" aria-label="寮€濮嬫父鎴?>
      <div className="entry-title-copy">
        <h2>{title}</h2>
      </div>
      <button
        className="entry-primary-button"
        type="button"
        onClick={onStart}
      >
        寮€濮嬫父鎴?      </button>
    </section>
  );
}
