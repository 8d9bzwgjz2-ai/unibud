/** Ink pill like Ask Bud. Designed + is the action. */

export function DropTrigger({ onClick, open }: { onClick: () => void; open?: boolean }) {
  return (
    <button
      type="button"
      className="drop-trigger"
      aria-label="Drop"
      aria-haspopup="dialog"
      aria-expanded={open ? true : false}
      onClick={onClick}
    >
      <span className="drop-trigger__word">Drop</span>
      <span className="drop-trigger__plus" aria-hidden>
        +
      </span>
    </button>
  );
}
