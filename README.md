# TIDY 🧹

A tiny shared chore checklist for Admin, Laura, Anna and Noemie. No accounts: type your name on the first screen and the device remembers you.

- **Weeks run Monday → Sunday (Europe/Madrid).** Every chore is on Laura's, Anna's and Noemie's own list. After Sunday 23:59 all checkmarks are wiped for everyone (history is kept for reports and "last cleaned").
- **Tabs:** *My chores* (your own checklist) · *Everyone* (table: chores × people) · *Reports* (per week: who did what, what's left / missed).
- **Admin** (type `admin`): sees the table and each person's list, can tick any cell, comment to a person on a chore, and in *Manage* add / edit / reorder / deactivate / delete chores, set emails, wipe the week early, or send the report now.
- **Emails** (via a free Gmail account): when someone checks off a chore, everyone else gets an email. Every Sunday night a weekly report goes to everyone (Vercel Cron → `/api/cron/weekly-report`, see `vercel.json`).
- Pages refresh every 5 seconds so everyone sees updates.
## Stack

Next.js 16 · Postgres (Neon via Vercel Marketplace) · `postgres` driver · Tailwind. Tables are created automatically on first request (`src/lib/db.ts`).

## Env vars

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (set by the Neon integration) |
| `GMAIL_USER` | Gmail address the app sends from |
| `GMAIL_APP_PASSWORD` | Google app password for that account (myaccount.google.com/apppasswords). Without these, emails are skipped. |
| `CRON_SECRET` | Protects the weekly-report cron endpoint |
| `APP_TIMEZONE` | Optional, defaults to `Europe/Madrid` |

## Local dev

```bash
docker run -d --name tidy-pg -e POSTGRES_PASSWORD=tidy -e POSTGRES_DB=tidy -p 54329:5432 postgres:17-alpine
echo 'DATABASE_URL=postgres://postgres:tidy@localhost:54329/tidy' >> .env.local
npm run dev
```

Date style (DD/MM/YYYY vs MM/DD/YYYY) is set in `src/lib/relative-day.ts`.
