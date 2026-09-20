import "server-only";
import path from "node:path";
import { createRequire } from "node:module";
import { loadReports } from "./data";
import { DEFAULT_LANG, type Lang } from "./i18n";
import { userName } from "./users";
import { TIMEZONE } from "./week";

/**
 * Bridge between tidy's data and /report-kit (the design kit: Handlebars templates + build-view).
 * The kit is plain CommonJS that reads its templates from disk, so it is required at runtime rather
 * than bundled — see `serverExternalPackages` / `outputFileTracingIncludes` in next.config.ts.
 */

/** The kit's data contract (GUIDE.md §2), plus the optional `timeZone` the day/time labels use. */
export type RawReport = {
  locale: Lang;
  weekStart: string;
  weekEnd: string;
  generatedAt: string;
  wipeAt: string;
  timeZone: string;
  appUrl: string;
  pdfAttached: boolean;
  people: { name: string; done: string[]; missed: string[] }[];
};

type Kit = {
  renderEmail(raw: RawReport): { subject: string; html: string; text: string };
  renderPdfHtml(raw: RawReport): string;
  renderPdf(raw: RawReport, browser: Browser): Promise<Buffer>;
};
type Browser = { newPage(): Promise<unknown>; isConnected(): boolean; close(): Promise<void> };

const KIT_ENTRY = path.join(process.cwd(), "report-kit", "src", "render-report.js");

function kit(): Kit {
  return createRequire(KIT_ENTRY)(KIT_ENTRY) as Kit;
}

// ---------- dates ----------

const plusDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** How far the house timezone is from UTC at a given instant, in milliseconds. */
function offsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const n = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return Date.UTC(n("year"), n("month") - 1, n("day"), n("hour") % 24, n("minute"), n("second")) - at.getTime();
}

/** The instant of a wall-clock time in the house timezone, e.g. Sunday 23:59 in Madrid. */
function houseTime(day: string, hour: number, minute: number): Date {
  const wall = Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)), hour, minute);
  let at = new Date(wall);
  // Two passes settle the offset even on a DST changeover day.
  for (let i = 0; i < 2; i++) at = new Date(wall - offsetMs(at));
  return at;
}

/** Where the app lives, for the "Open tidy" button. */
export function appUrl(): string {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return host ? `https://${host}` : (process.env.APP_URL ?? "http://localhost:3000");
}

// ---------- the contract ----------

/** Maps one week of the Reports data to the kit's contract (GUIDE.md §2). No labels or percentages here. */
export async function getWeeklyReportData(
  weekStart: string,
  { locale = DEFAULT_LANG, pdfAttached = false }: { locale?: Lang; pdfAttached?: boolean } = {},
): Promise<RawReport> {
  const [report] = await loadReports([weekStart], locale);
  return {
    locale,
    weekStart,
    weekEnd: plusDays(weekStart, 6),
    generatedAt: new Date().toISOString(),
    wipeAt: houseTime(plusDays(weekStart, 6), 23, 59).toISOString(),
    timeZone: TIMEZONE,
    appUrl: appUrl(),
    pdfAttached,
    people: (report?.people ?? []).map((p) => ({
      name: userName(p.person),
      done: p.done.map((d) => d.title),
      missed: p.missed,
    })),
  };
}

// ---------- rendering ----------

export function renderEmail(raw: RawReport) {
  return kit().renderEmail(raw);
}

export function renderPdfHtml(raw: RawReport) {
  return kit().renderPdfHtml(raw);
}

declare global {
  var __tidyBrowser: Promise<Browser> | undefined;
}

/** One Chromium for the whole process (GUIDE.md §3): slim binary on Vercel, local Chrome in dev. */
async function browser(): Promise<Browser> {
  const existing = await globalThis.__tidyBrowser?.catch(() => undefined);
  if (existing?.isConnected()) return existing;

  globalThis.__tidyBrowser = (async () => {
    const { chromium } = await import("playwright-core");
    if (process.env.VERCEL) {
      const slim = (await import("@sparticuz/chromium")).default;
      return chromium.launch({
        args: slim.args,
        executablePath: await slim.executablePath(),
        headless: true,
      }) as unknown as Browser;
    }
    return chromium.launch({ channel: "chrome" }) as unknown as Browser;
  })();

  return globalThis.__tidyBrowser;
}

export async function renderPdf(raw: RawReport): Promise<Buffer> {
  return kit().renderPdf(raw, await browser());
}
