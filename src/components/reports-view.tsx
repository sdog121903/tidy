import type { WeekReport } from "@/lib/data";
import { Icon } from "./icons";
import { messages, type Lang } from "@/lib/i18n";
import { userName } from "@/lib/users";
import { weekLabel } from "@/lib/week";

export function ReportsView({
  reports,
  currentWeek,
  lang,
  isAdmin = false,
}: {
  reports: WeekReport[];
  currentWeek: string;
  lang: Lang;
  isAdmin?: boolean;
}) {
  const t = messages(lang);
  if (reports.length === 0) return <p className="t-empty">{t.noReportsYet}</p>;

  return (
    <>
      {reports.map((r) => {
        const current = r.week === currentWeek;
        return (
          <section key={r.week} className="t-rp" aria-labelledby={`wk-${r.week}`}>
            <div className="t-rp-head">
              <h2 id={`wk-${r.week}`}>{weekLabel(r.week, lang)}</h2>
              <div className="t-rp-actions">
                <span>{current ? t.thisWeekSoFar : t.final}</span>
                {isAdmin && (
                  <a className="t-pill t-pill--sm" href={`/api/reports/weekly/pdf?week=${r.week}`}>
                    <Icon name="printer" />
                    {t.printPdf}
                  </a>
                )}
              </div>
            </div>
            <div className="t-rp-grid">
              {r.people.map((p) => (
                <article key={p.person} className="t-rp-card">
                  <header>
                    <h3>{userName(p.person)}</h3>
                    <span>
                      {p.done.length}/{r.total}
                    </span>
                  </header>
                  <div
                    className="t-bar"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={r.total}
                    aria-valuenow={p.done.length}
                    aria-label={t.progressOf(userName(p.person))}
                  >
                    <span style={{ width: `${r.total ? (p.done.length / r.total) * 100 : 0}%` }} />
                  </div>
                  {p.items.length > 0 && (
                    <ul className="t-rp-list">
                      {p.items.map((it, i) => (
                        <li key={i} data-done={it.done}>
                          {it.title}
                          <span className="t-sr">{" "}
                            {it.done ? t.itemDone : current ? t.itemToDo : t.itemMissed}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="t-rp-foot">
                    {p.missed.length === 0
                      ? t.everythingDone
                      : current
                        ? t.leftToDo(p.missed.length)
                        : t.missedCount(p.missed.length)}
                  </p>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
