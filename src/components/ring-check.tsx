/** 48px hit area with a 30px ink ring; checked = ink fill + accent check. */
export function RingCheck({
  on,
  label,
  interactive = true,
  stateText = ["done", "not done"],
}: {
  on: boolean;
  label: string;
  interactive?: boolean;
  /** Spoken state for the read-only version: [done, not done]. */
  stateText?: [string, string];
}) {
  const inner = (
    <span className="t-ring">
      <span className="t-ring-fill" />
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 12.5 L10 17.5 L19 7" />
      </svg>
    </span>
  );
  return interactive ? (
    <button type="submit" className="t-ring-check" aria-pressed={on} aria-label={label} data-on={on}>
      {inner}
    </button>
  ) : (
    <span className="t-ring-check" role="img" aria-label={`${label}: ${on ? stateText[0] : stateText[1]}`} data-on={on}>
      {inner}
    </span>
  );
}
