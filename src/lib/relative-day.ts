import { DEFAULT_LANG, messages, type Lang } from "./i18n";

/** Change to "MM/DD/YYYY" for US-style dates. */
export const DATE_FORMAT: "DD/MM/YYYY" | "MM/DD/YYYY" = "DD/MM/YYYY";

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * "today", "yesterday", "this Tuesday", "last Tuesday" within the past week (in the chosen language),
 * otherwise the full date, e.g. 03/09/2026.
 */
export function relativeDay(date: Date, now = new Date(), lang: Lang = DEFAULT_LANG): string {
  const t = messages(lang);
  const today = startOfDay(now);
  const day = startOfDay(date);
  const daysAgo = Math.round((today.getTime() - day.getTime()) / 86_400_000);

  if (daysAgo <= 0) return t.today;
  if (daysAgo === 1) return t.yesterday;
  if (daysAgo < 7) {
    // Weeks start on Monday.
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const name = t.weekdays[day.getDay()];
    return day >= weekStart ? t.thisWeekday(name) : t.lastWeekday(name);
  }
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return DATE_FORMAT === "DD/MM/YYYY" ? `${dd}/${mm}/${yyyy}` : `${mm}/${dd}/${yyyy}`;
}

/** "Mon", "lun.", "lun", … */
export function shortWeekday(date: Date, lang: Lang = DEFAULT_LANG): string {
  return messages(lang).weekdaysShort[date.getDay()];
}
