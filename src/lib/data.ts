import "server-only";
import { db } from "./db";
import { CLEANERS } from "./users";
import { addWeeks, weekOf } from "./week";

export type Comment = { id: number; person: string; author: string; body: string; at: string };

export type BoardChore = {
  id: number;
  title: string;
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

export async function loadBoard(week: string) {
  const sql = await db();
  const [chores, thisWeek, lasts, comments, people] = await Promise.all([
    sql<{ id: number; title: string; notes: string; active: boolean }[]>`
      select id, title, notes, active from chores order by position, id`,
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
      title: c.title,
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
export async function loadReports(weeks: string[]): Promise<WeekReport[]> {
  if (weeks.length === 0) return [];
  const sql = await db();
  const [chores, completions] = await Promise.all([
    sql<{ id: number; title: string; active: boolean; created_at: Date }[]>`
      select id, title, active, created_at from chores order by position, id`,
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
            return hit ? [{ title: c.title, at: hit.done_at.toISOString() }] : [];
          }),
          missed: counted.filter((c) => !mine.some((x) => x.chore_id === c.id)).map((c) => c.title),
          items: counted.map((c) => ({ title: c.title, done: mine.some((x) => x.chore_id === c.id) })),
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
