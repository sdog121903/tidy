import { getCurrentUser, getLang } from "@/lib/current-user";
import { getWeeklyReportData, renderPdf } from "@/lib/weekly-report";
import { weekOf } from "@/lib/week";

export const runtime = "nodejs";
export const maxDuration = 60;

const isWeek = (v: string | null): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** The week's report as an A4 PDF, in the tidy design. Admin only. */
export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (me?.id !== "admin") return new Response("Not found", { status: 404 });

  const requested = new URL(request.url).searchParams.get("week");
  const week = isWeek(requested) ? requested : weekOf();
  const raw = await getWeeklyReportData(week, { locale: await getLang() });
  const pdf = await renderPdf(raw);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="tidy-weekly-report-${week}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
