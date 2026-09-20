import { setChoreDone } from "@/app/actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { ChoreComments } from "@/components/chore-comments";
import { EveryoneTable } from "@/components/everyone-table";
import { ManageView } from "@/components/manage-view";
import { NameForm } from "@/components/name-form";
import { NavMenu } from "@/components/nav-menu";
import { ReportsView } from "@/components/reports-view";
import { SettingsView } from "@/components/settings-view";
import { Footer, Shell } from "@/components/shell";
import { TidyChecklist } from "@/components/tidy-checklist";
import { When } from "@/components/when";
import { getCurrentUser, getLang } from "@/lib/current-user";
import { loadBoard, loadReports, recentWeeks } from "@/lib/data";
import { messages } from "@/lib/i18n";
import { CLEANERS, findCleaner } from "@/lib/users";
import { weekOf } from "@/lib/week";

export default async function Home({ searchParams }: PageProps<"/">) {
  const [me, lang] = await Promise.all([getCurrentUser(), getLang()]);
  const t = messages(lang);

  if (!me) {
    return (
      <main className="t-login">
        <div className="t-login-circle">
          <h1 className="t-login-title">tidy</h1>
          <p className="t-login-sub">{t.tagline}</p>
        </div>
        <NameForm lang={lang} />
      </main>
    );
  }

  const isAdmin = me.id === "admin";
  const tabs = isAdmin
    ? [
        { id: "everyone", label: t.tabEveryone },
        ...CLEANERS.map((p) => ({ id: p.id, label: p.name })),
        { id: "reports", label: t.tabReports },
        { id: "manage", label: t.tabManage },
        { id: "settings", label: t.tabSettings },
      ]
    : [
        { id: me.id, label: t.tabMyChores },
        { id: "everyone", label: t.tabEveryone },
        { id: "reports", label: t.tabReports },
        { id: "settings", label: t.tabSettings },
      ];
  const requested = (await searchParams).tab;
  const tab = tabs.find((t) => t.id === requested)?.id ?? tabs[0].id;
  const nav = tabs.map((t) => ({ href: `/?tab=${t.id}`, label: t.label, current: t.id === tab }));

  const week = weekOf();
  const { chores, emails } = await loadBoard(week, lang);
  const active = chores.filter((c) => c.active);
  const person = findCleaner(tab);

  // A person's list (your own, or any of them for the admin) is the full-screen checklist.
  if (person) {
    return (
      <>
        <AutoRefresh />
        <TidyChecklist
          items={active.map((c) => {
            const doneAt = c.done[person.id];
            const lastAt = c.lastBy[person.id];
            const comments = c.comments.filter((m) => m.person === person.id);
            return {
              id: c.id,
              label: c.title,
              checked: !!doneAt,
              caption: doneAt ? (
                <>
                  {t.done} · <When iso={doneAt} lang={lang} />
                </>
              ) : lastAt ? (
                <>
                  {t.lastCleanedBy(person.name)} · <When iso={lastAt} lang={lang} />
                </>
              ) : (
                t.notCleanedYet
              ),
              comments: <ChoreComments choreId={c.id} comments={comments} person={person} me={me} lang={lang} />,
              commentCount: comments.length,
              commentLabel: isAdmin ? t.commentTo(person.name) : t.comments,
            };
          })}
          onToggle={setChoreDone.bind(null, person.id)}
          autoCheckOnScroll={false}
          menu={<NavMenu items={nav} lang={lang} />}
          lang={lang}
        />
        <Footer lang={lang} />
      </>
    );
  }

  return (
    <>
      <AutoRefresh />
      <Shell me={me} week={week} nav={nav} lang={lang}>
        {tab === "everyone" && <EveryoneTable chores={active} me={me} lang={lang} />}
        {tab === "reports" && (
          <ReportsView
            reports={await loadReports(await recentWeeks(8), lang)}
            currentWeek={week}
            lang={lang}
            isAdmin={isAdmin}
          />
        )}
        {tab === "manage" && <ManageView chores={chores} emails={emails} lang={lang} />}
        {tab === "settings" && <SettingsView lang={lang} />}
      </Shell>
    </>
  );
}
