import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { db } from "./db";
import { loadReports } from "./data";
import { userName } from "./users";
import { weekLabel } from "./week";

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function appLink() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return host ? `https://${host}` : null;
}

declare global {
  var __tidyMailer: Transporter | undefined;
}

/** Sends through a regular Gmail account using a Google "app password" (free, ~500 emails/day). */
async function send(to: string[], subject: string, text: string, html: string) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.warn(`[tidy] GMAIL_USER / GMAIL_APP_PASSWORD not set, skipping email "${subject}"`);
    return;
  }
  const mailer = (globalThis.__tidyMailer ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: pass.replace(/\s+/g, "") },
  }));
  await Promise.all(
    to.map((email) =>
      mailer
        .sendMail({ from: `tidy <${user}>`, to: email, subject, text, html })
        .catch((err) => console.error(`[tidy] email to ${email} failed:`, err)),
    ),
  );
}

async function emailsExcept(except?: string) {
  const sql = await db();
  const rows = await sql<{ email: string }[]>`
    select email from people where email <> '' and id <> ${except ?? ""}`;
  return rows.map((r) => r.email);
}

/** Emails everyone (except the person who did it) that a chore was checked off. */
export async function sendChoreDoneEmails(person: string, choreTitle: string) {
  const to = await emailsExcept(person);
  if (to.length === 0) return;
  const who = userName(person);
  const link = appLink();
  await send(
    to,
    `✅ ${who} did "${choreTitle}"`,
    `${who} just checked off "${choreTitle}".${link ? `\n\n${link}` : ""}`,
    `<p style="font-size:16px"><strong>${escape(who)}</strong> just checked off <strong>${escape(choreTitle)}</strong>.</p>${
      link ? `<p><a href="${link}">Open tidy</a></p>` : ""
    }`,
  );
}

/** Emails everyone the summary of who did what (and what was missed) for a week. */
export async function sendWeeklyReport(week: string) {
  const to = await emailsExcept();
  if (to.length === 0) return;
  const [report] = await loadReports([week]);
  const link = appLink();

  const text = [
    `tidy weekly report · ${weekLabel(week)}`,
    "",
    ...report.people.flatMap((p) => [
      `${userName(p.person)}: ${p.done.length}/${report.total} done`,
      p.missed.length ? `  Missed: ${p.missed.join(", ")}` : "  Did everything 🎉",
      "",
    ]),
    link ?? "",
  ].join("\n");

  const html = `
    <h2 style="margin:0 0 4px">tidy weekly report</h2>
    <p style="margin:0 0 16px;color:#78716c">${escape(weekLabel(week))}</p>
    ${report.people
      .map(
        (p) => `
      <div style="margin:0 0 16px;padding:12px 16px;border:1px solid #e7e5e4;border-radius:12px">
        <p style="margin:0 0 6px;font-size:16px"><strong>${escape(userName(p.person))}</strong>: ${p.done.length}/${report.total} done</p>
        ${p.done.length ? `<p style="margin:0 0 4px;color:#047857">✓ ${p.done.map((d) => escape(d.title)).join(" · ")}</p>` : ""}
        ${
          p.missed.length
            ? `<p style="margin:0;color:#b91c1c">✗ Missed: ${p.missed.map(escape).join(" · ")}</p>`
            : `<p style="margin:0">Did everything 🎉</p>`
        }
      </div>`,
      )
      .join("")}
    ${link ? `<p><a href="${link}?tab=reports">See all reports</a></p>` : ""}`;

  await send(to, `tidy weekly report · ${weekLabel(week)}`, text, html);
}
