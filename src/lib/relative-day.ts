const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Change to "MM/DD/YYYY" for US-style dates. */
export const DATE_FORMAT: "DD/MM/YYYY" | "MM/DD/YYYY" = "DD/MM/YYYY";

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * "today", "yesterday", "this Tuesday", "last Tuesday" within the past week,
 * otherwise the full date, e.g. 03/09/2026.
 */
export function relativeDay(date: Date, now = new Date()): string {
  const today = startOfDay(now);
  const day = startOfDay(date);
  const daysAgo = Math.round((today.getTime() - day.getTime()) / 86_400_000);

  if (daysAgo <= 0) return "today";
  if (daysAgo === 1) return "yesterday";
  if (daysAgo < 7) {
    // Weeks start on Monday.
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return `${day >= weekStart ? "this" : "last"} ${WEEKDAYS[day.getDay()]}`;
  }
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return DATE_FORMAT === "DD/MM/YYYY" ? `${dd}/${mm}/${yyyy}` : `${mm}/${dd}/${yyyy}`;
}

/** "Mon", "Tue", … */
export function shortWeekday(date: Date): string {
  return WEEKDAYS[date.getDay()].slice(0, 3);
}
