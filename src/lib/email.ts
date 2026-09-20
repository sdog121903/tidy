import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { db } from "./db";
import { DEFAULT_LANG, type Lang } from "./i18n";
import { getWeeklyReportData, renderEmail, renderPdf } from "./weekly-report";

declare global {
  var __tidyMailer: Transporter | undefined;
}

type Attachment = { filename: string; content: Buffer; contentType: string };

/** Sends through a regular Gmail account using a Google "app password" (free, ~500 emails/day). */
async function send(to: string[], subject: string, text: string, html: string, attachments: Attachment[] = []) {
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
  // html + text together make this a multipart/alternative message.
  await Promise.all(
    to.map((email) =>
      mailer
        .sendMail({ from: `tidy <${user}>`, to: email, subject, text, html, attachments })
        .catch((err) => console.error(`[tidy] email to ${email} failed:`, err)),
    ),
  );
}

/** Everyone who has given us an email address. */
async function reportRecipients() {
  const sql = await db();
  const rows = await sql<{ email: string }[]>`select email from people where email <> ''`;
  return rows.map((r) => r.email);
}

/**
 * Emails everyone the week's report in the tidy design (/report-kit), with the A4 PDF attached.
 * If Chromium is unavailable the email still goes out, without the attachment.
 */
export async function sendWeeklyReport(week: string, lang: Lang = DEFAULT_LANG) {
  const to = await reportRecipients();
  if (to.length === 0) return;

  let pdf: Buffer | null = null;
  try {
    pdf = await renderPdf(await getWeeklyReportData(week, { locale: lang, pdfAttached: true }));
  } catch (err) {
    console.error("[tidy] weekly report PDF failed, sending the email without it:", err);
  }

  const raw = await getWeeklyReportData(week, { locale: lang, pdfAttached: !!pdf });
  const email = renderEmail(raw);
  await send(
    to,
    email.subject,
    email.text,
    email.html,
    pdf ? [{ filename: `tidy-weekly-report-${week}.pdf`, content: pdf, contentType: "application/pdf" }] : [],
  );
}
