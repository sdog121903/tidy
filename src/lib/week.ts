/**
 * Weeks run Monday 00:00 → Sunday 23:59 in the house's timezone.
 * A week is identified by its Monday as "YYYY-MM-DD".
 */
export const TIMEZONE = process.env.APP_TIMEZONE ?? "Europe/Madrid";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Calendar date (y, m, d) of an instant, as seen in the house's timezone. */
function localDate(at: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const parse = (week: string) => new Date(`${week}T00:00:00Z`);

export function weekOf(at: Date = new Date()): string {
  const d = localDate(at);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return iso(d);
}

export function addWeeks(week: string, n: number): string {
  const d = parse(week);
  d.setUTCDate(d.getUTCDate() + 7 * n);
  return iso(d);
}

/** "15 – 21 Sep 2026" */
export function weekLabel(week: string): string {
  const start = parse(week);
  const end = parse(week);
  end.setUTCDate(end.getUTCDate() + 6);
  const s = `${start.getUTCDate()}${start.getUTCMonth() === end.getUTCMonth() ? "" : ` ${MONTHS[start.getUTCMonth()]}`}`;
  return `${s} – ${end.getUTCDate()} ${MONTHS[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
}
