import "server-only";
import { db } from "./db";
import { DEFAULT_LANG, type Lang } from "./i18n";
import { CLEANERS } from "./users";
import { addWeeks, weekOf } from "./week";

type TitledRow = { title: string; title_en: string; title_fr: string; title_es: string };

/** The chore's name in the given language, falling back to its main title. */
export function choreTitle(row: TitledRow, lang: Lang): string {
  return row[`title_${lang}`]?.trim() || row.title;
}

export type Comment = { id: number; person: string; author: string; body: string; at: string };

export type BoardChore = {
  id: number;
  /** Name shown to this viewer (translated when a translation exists). */
  title: string;
  /** Main title plus optional translations, for the admin's edit form. */
  titles: { main: string; en: string; fr: string; es: string };
  notes: string;
  active: boolean;
  /** When each person checked it off this week (null = not yet). */
  done: Record<string, string | null>;
  /** When each person last did it, any week. */
  lastBy: Record<string, string | null>;
  /** Most recent time anyone did it. */
  last: { by: string; at: string } | null;
  /** This week's comments. */
  comments: Comment[];
};

export async function loadBoard(week: string, lang: Lang = DEFAULT_LANG) {
  const sql = await db();
  const [chores, thisWeek, lasts, comments, people] = await Promise.all([
    sql<({ id: number; notes: string; active: boolean } & TitledRow)[]>`
      select id, title, title_en, title_fr, title_es, notes, active from chores order by position, id`,
    sql<{ chore_id: number; person: string; done_at: Date }[]>`
      select chore_id, person, done_at from completions where week = ${week}`,
    sql<{ chore_id: number; person: string; done_at: Date }[]>`
      select distinct on (chore_id, person) chore_id, person, done_at
      from completions order by chore_id, person, done_at desc`,
    sql<{ id: number; chore_id: number; person: string; author: string; body: string; created_at: Date }[]>`
      select id, chore_id, person, author, body, created_at from comments
      where week = ${week} order by created_at`,
    sql<{ id: string; email: string }[]>`select id, email from people`,
  ]);

  const board: BoardChore[] = chores.map((c) => {
    const done: Record<string, string | null> = {};
    const lastBy: Record<string, string | null> = {};
    let last: BoardChore["last"] = null;
    for (const p of CLEANERS) {
      done[p.id] = thisWeek.find((x) => x.chore_id === c.id && x.person === p.id)?.done_at.toISOString() ?? null;
      const l = lasts.find((x) => x.chore_id === c.id && x.person === p.id);
      lastBy[p.id] = l?.done_at.toISOString() ?? null;
      if (l && (!last || l.done_at.toISOString() > last.at)) last = { by: p.id, at: l.done_at.toISOString() };
    }
    return {
      id: c.id,
      title: choreTitle(c, lang),
      titles: { main: c.title, en: c.title_en, fr: c.title_fr, es: c.title_es },
      notes: c.notes,
      active: c.active,
      done,
      lastBy,
      last,
      comments: comments
        .filter((m) => m.chore_id === c.id)
        .map((m) => ({ id: m.id, person: m.person, author: m.author, body: m.body, at: m.created_at.toISOString() })),
    };
  });

  return { chores: board, emails: Object.fromEntries(people.map((p) => [p.id, p.email])) as Record<string, string> };
}

export type PersonReport = {
  person: string;
  done: { title: string; at: string }[];
  missed: string[];
  /** Every chore that counted this week, in list order. */
  items: { title: string; done: boolean }[];
};
export type WeekReport = { week: string; total: number; people: PersonReport[] };

/** Who did what (and what they missed) for each of the given weeks. */
export async function loadReports(weeks: string[], lang: Lang = DEFAULT_LANG): Promise<WeekReport[]> {
  if (weeks.length === 0) return [];
  const sql = await db();
  const [chores, completions] = await Promise.all([
    sql<({ id: number; active: boolean; created_at: Date } & TitledRow)[]>`
      select id, title, title_en, title_fr, title_es, active, created_at from chores order by position, id`,
    sql<{ chore_id: number; person: string; week: string; done_at: Date }[]>`
      select chore_id, person, week, done_at from completions where week in ${sql(weeks)}`,
  ]);

  return weeks.map((week) => {
    const inWeek = completions.filter((c) => c.week === week);
    // A chore counts for a week if it was active and existed by then, or if someone did it that week.
    const counted = chores.filter(
      (c) => (c.active && weekOf(c.created_at) <= week) || inWeek.some((x) => x.chore_id === c.id),
    );
    return {
      week,
      total: counted.length,
      people: CLEANERS.map((p) => {
        const mine = inWeek.filter((x) => x.person === p.id);
        return {
          person: p.id,
          done: counted.flatMap((c) => {
            const hit = mine.find((x) => x.chore_id === c.id);
            return hit ? [{ title: choreTitle(c, lang), at: hit.done_at.toISOString() }] : [];
          }),
          missed: counted.filter((c) => !mine.some((x) => x.chore_id === c.id)).map((c) => choreTitle(c, lang)),
          items: counted.map((c) => ({ title: choreTitle(c, lang), done: mine.some((x) => x.chore_id === c.id) })),
        };
      }),
    };
  });
}

/** The current week plus up to `count - 1` earlier weeks, going back no further than the first chore. */
export async function recentWeeks(count: number): Promise<string[]> {
  const sql = await db();
  const [first] = await sql<{ at: Date | null }[]>`select min(created_at) as at from chores`;
  if (!first?.at) return [];
  const oldest = weekOf(first.at);
  const weeks: string[] = [];
  for (let w = weekOf(); w >= oldest && weeks.length < count; w = addWeeks(w, -1)) weeks.push(w);
  return weeks;
}
