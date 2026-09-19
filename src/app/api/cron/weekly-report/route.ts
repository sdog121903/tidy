import { db } from "@/lib/db";
import { sendWeeklyReport } from "@/lib/email";
import { weekOf } from "@/lib/week";

/**
 * Runs Sunday night (see vercel.json). Reports on the week that is ending/just ended:
 * looking 6 hours back lands in that week whether the cron fires just before or just after midnight.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const week = weekOf(new Date(Date.now() - 6 * 60 * 60 * 1000));
  const sql = await db();
  const [claimed] = await sql`insert into reports_sent (week) values (${week}) on conflict do nothing returning week`;
  if (!claimed) return Response.json({ week, sent: false, reason: "already sent" });
  await sendWeeklyReport(week);
  return Response.json({ week, sent: true });
}
