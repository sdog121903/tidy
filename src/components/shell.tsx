import Link from "next/link";
import { leave } from "@/app/actions";
import { messages, type Lang } from "@/lib/i18n";
import type { User } from "@/lib/users";
import { weekLabel } from "@/lib/week";
import { NavMenu, type NavItem } from "./nav-menu";
import { SubmitButton } from "./submit-button";

export function Footer({ lang }: { lang: Lang }) {
  return <footer className="t-footer">{messages(lang).madeBy}</footer>;
}

/** Yellow app shell: wordmark, menu + Switch, greeting, week line, tab bar. */
export function Shell({
  me,
  week,
  nav,
  lang,
  children,
}: {
  me: User;
  week: string;
  nav: NavItem[];
  lang: Lang;
  children: React.ReactNode;
}) {
  const t = messages(lang);
  return (
    <>
      <main className="t-shell">
        <header className="t-header">
          <span className="t-wordmark">tidy</span>
          <div className="t-row">
            <NavMenu items={nav} lang={lang} />
            <form action={leave}>
              <SubmitButton className="t-pill t-pill--sm">{t.switchUser}</SubmitButton>
            </form>
          </div>
        </header>
        <p className="t-greet">
          {t.hi} <strong>{me.name}</strong>
          {me.id === "admin" && ` · ${t.inCharge}`}
        </p>
        <p className="t-week">{t.weekLine(weekLabel(week, lang))}</p>
        <nav aria-label={t.sections} className="t-tabs">
          {nav.map((it) => (
            <Link key={it.href} href={it.href} className="t-tab" aria-current={it.current ? "page" : undefined}>
              {it.label}
            </Link>
          ))}
        </nav>
        {children}
      </main>
      <Footer lang={lang} />
    </>
  );
}
