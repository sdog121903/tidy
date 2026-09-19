import Link from "next/link";
import { leave } from "@/app/actions";
import type { User } from "@/lib/users";
import { weekLabel } from "@/lib/week";
import { NavMenu, type NavItem } from "./nav-menu";
import { SubmitButton } from "./submit-button";

export function Footer() {
  return <footer className="t-footer">made by laura</footer>;
}

/** Yellow app shell: wordmark, menu + Switch, greeting, week line, tab bar. */
export function Shell({
  me,
  week,
  nav,
  children,
}: {
  me: User;
  week: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="t-shell">
        <header className="t-header">
          <span className="t-wordmark">tidy</span>
          <div className="t-row">
            <NavMenu items={nav} />
            <form action={leave}>
              <SubmitButton className="t-pill t-pill--sm">Switch</SubmitButton>
            </form>
          </div>
        </header>
        <p className="t-greet">
          Hi <strong>{me.id === "admin" ? "Admin" : me.name}</strong>
          {me.id === "admin" && " · you're in charge"}
        </p>
        <p className="t-week">Week of {weekLabel(week)} · checkmarks wipe Sunday 23:59</p>
        <nav aria-label="Sections" className="t-tabs">
          {nav.map((t) => (
            <Link key={t.href} href={t.href} className="t-tab" aria-current={t.current ? "page" : undefined}>
              {t.label}
            </Link>
          ))}
        </nav>
        {children}
      </main>
      <Footer />
    </>
  );
}
