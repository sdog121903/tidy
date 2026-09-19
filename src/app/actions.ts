"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { after } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/current-user";
import { sendChoreDoneEmails, sendWeeklyReport } from "@/lib/email";
import { USERS, USER_COOKIE, findCleaner, matchName } from "@/lib/users";
import { weekOf } from "@/lib/week";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const num = (fd: FormData, key: string) => Number(fd.get(key));

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Enter your name first");
  return user;
}

async function requireAdmin() {
  const user = await requireUser();
  if (user.id !== "admin") throw new Error("Only the admin can do that");
  return user;
}

/** The cleaner a form is acting for: yourself, or anyone if you're the admin. */
async function requirePersonFrom(fd: FormData) {
  const user = await requireUser();
  const person = findCleaner(str(fd, "person"));
  if (!person || (user.id !== "admin" && user.id !== person.id)) throw new Error("You can only change your own chores");
  return { user, person };
}

// ---------- name entry ----------

export async function enterName(_prev: string | null, fd: FormData): Promise<string | null> {
  const user = matchName(str(fd, "name"));
  if (!user) return "Hmm, I don't know that name. Try Laura, Anna or Noemie.";
  (await cookies()).set(USER_COOKIE, user.id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return null;
}

export async function leave() {
  (await cookies()).delete(USER_COOKIE);
}

// ---------- checkmarks & comments ----------

async function setDone(person: string, choreId: number, done: boolean) {
  const week = weekOf();
  const sql = await db();
  if (!done) {
    await sql`delete from completions where chore_id = ${choreId} and person = ${person} and week = ${week}`;
    return;
  }
  const [row] = await sql<{ title: string }[]>`
    insert into completions (chore_id, person, week)
    select id, ${person}, ${week} from chores where id = ${choreId} and active
    on conflict do nothing
    returning (select title from chores where id = ${choreId}) as title`;
  if (row) after(() => sendChoreDoneEmails(person, row.title));
}

/** Checks or unchecks one chore for one person, for the current week. */
export async function toggleDone(fd: FormData) {
  const { person } = await requirePersonFrom(fd);
  const choreId = num(fd, "choreId");
  const sql = await db();
  const [existing] = await sql`
    select 1 from completions where chore_id = ${choreId} and person = ${person.id} and week = ${weekOf()}`;
  await setDone(person.id, choreId, !existing);
  refresh();
}

/** Sets one chore's checkmark to an explicit state (used by the tidy checklist screen). */
export async function setChoreDone(personId: string, choreId: number, done: boolean) {
  const user = await requireUser();
  const person = findCleaner(personId);
  if (!person || (user.id !== "admin" && user.id !== person.id)) throw new Error("You can only change your own chores");
  await setDone(person.id, Number(choreId), Boolean(done));
  refresh();
}

export async function addComment(fd: FormData) {
  const { user, person } = await requirePersonFrom(fd);
  const body = str(fd, "body").slice(0, 1000);
  if (!body) return;
  const sql = await db();
  await sql`insert into comments (chore_id, person, author, body, week)
    values (${num(fd, "choreId")}, ${person.id}, ${user.id}, ${body}, ${weekOf()})`;
  refresh();
}

export async function deleteComment(fd: FormData) {
  const user = await requireUser();
  const sql = await db();
  await sql`delete from comments where id = ${num(fd, "commentId")}
    and (${user.id === "admin"} or author = ${user.id})`;
  refresh();
}

// ---------- admin ----------

export async function addChore(fd: FormData) {
  await requireAdmin();
  const title = str(fd, "title").slice(0, 200);
  if (!title) return;
  const sql = await db();
  await sql`insert into chores (title, notes, position)
    values (${title}, ${str(fd, "notes").slice(0, 1000)},
      (select coalesce(max(position), 0) + 1 from chores))`;
  refresh();
}

export async function updateChore(fd: FormData) {
  await requireAdmin();
  const title = str(fd, "title").slice(0, 200);
  if (!title) return;
  const sql = await db();
  await sql`update chores set title = ${title}, notes = ${str(fd, "notes").slice(0, 1000)}
    where id = ${num(fd, "choreId")}`;
  refresh();
}

export async function setActive(fd: FormData) {
  await requireAdmin();
  const sql = await db();
  await sql`update chores set active = ${str(fd, "active") === "true"} where id = ${num(fd, "choreId")}`;
  refresh();
}

export async function deleteChore(fd: FormData) {
  await requireAdmin();
  const sql = await db();
  await sql`delete from chores where id = ${num(fd, "choreId")}`;
  refresh();
}

export async function moveChore(fd: FormData) {
  await requireAdmin();
  const sql = await db();
  const ids = (await sql<{ id: number }[]>`select id from chores order by position, id`).map((r) => r.id);
  const i = ids.indexOf(num(fd, "choreId"));
  const j = i + (str(fd, "dir") === "up" ? -1 : 1);
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await sql.begin(async (tx) => {
    for (const [position, id] of ids.entries()) {
      await tx`update chores set position = ${position} where id = ${id}`;
    }
  });
  refresh();
}

/** Wipes this week's checkmarks for everyone early (the Sunday-night wipe happens on its own). */
export async function resetThisWeek() {
  await requireAdmin();
  const sql = await db();
  await sql`delete from completions where week = ${weekOf()}`;
  refresh();
}

export async function sendReportNow() {
  await requireAdmin();
  await sendWeeklyReport(weekOf());
}

export async function saveEmails(fd: FormData) {
  await requireAdmin();
  const sql = await db();
  for (const u of USERS) {
    const email = str(fd, `email_${u.id}`).slice(0, 254);
    await sql`insert into people (id, email) values (${u.id}, ${email})
      on conflict (id) do update set email = excluded.email`;
  }
  refresh();
}
