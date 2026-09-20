import "server-only";
import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

declare global {
  var __tidySql: Sql | undefined;
  var __tidySchema: Promise<void> | undefined;
}

async function migrate(sql: Sql) {
  await sql`create table if not exists people (
    id text primary key,
    email text not null default ''
  )`;
  await sql`create table if not exists chores (
    id serial primary key,
    title text not null,
    notes text not null default '',
    active boolean not null default true,
    position integer not null default 0,
    created_at timestamptz not null default now()
  )`;
  // Optional chore-name translations; blank means "use the main title".
  for (const lang of ["en", "fr", "es"]) {
    await sql.unsafe(`alter table chores add column if not exists title_${lang} text not null default ''`);
  }
  // One row per chore, per person, per week. A new week simply has no rows yet,
  // which is how every checkmark gets wiped after Sunday 23:59.
  await sql`create table if not exists completions (
    id serial primary key,
    chore_id integer not null references chores(id) on delete cascade,
    person text not null,
    week text not null,
    done_at timestamptz not null default now(),
    unique (chore_id, person, week)
  )`;
  await sql`create table if not exists comments (
    id serial primary key,
    chore_id integer not null references chores(id) on delete cascade,
    person text not null,
    author text not null,
    body text not null,
    week text not null,
    created_at timestamptz not null default now()
  )`;
  await sql`create table if not exists reports_sent (
    week text primary key,
    sent_at timestamptz not null default now()
  )`;
}

/** Returns the shared SQL client, creating the tables on first use. */
export async function db(): Promise<Sql> {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const sql = (globalThis.__tidySql ??= postgres(url, { prepare: false, max: 5, idle_timeout: 20 }));
  globalThis.__tidySchema ??= migrate(sql).catch((err) => {
    globalThis.__tidySchema = undefined;
    throw err;
  });
  await globalThis.__tidySchema;
  return sql;
}
