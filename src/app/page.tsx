import { setChoreDone } from "@/app/actions";
import { AutoRefresh } from "@/components/auto-refresh";
import { ChoreComments } from "@/components/chore-comments";
import { EveryoneTable } from "@/components/everyone-table";
import { ManageView } from "@/components/manage-view";
import { NameForm } from "@/components/name-form";
import { NavMenu } from "@/components/nav-menu";
import { ReportsView } from "@/components/reports-view";
import { Footer, Shell } from "@/components/shell";
import { TidyChecklist } from "@/components/tidy-checklist";
import { When } from "@/components/when";
import { getCurrentUser } from "@/lib/current-user";
import { loadBoard, loadReports, recentWeeks } from "@/lib/data";
import { CLEANERS, findCleaner } from "@/lib/users";
import { weekOf } from "@/lib/week";

export default async function Home({ searchParams }: PageProps<"/">) {
  const me = await getCurrentUser();

  if (!me) {
    return (
      <main className="t-login">
        <div className="t-login-circle">
          <h1 className="t-login-title">tidy</h1>
          <p className="t-login-sub">Our weekly chore checklist</p>
        </div>
        <NameForm />
      </main>
    );
  }

  const isAdmin = me.id === "admin";
  const tabs = isAdmin
    ? [
        { id: "everyone", label: "Everyone" },
        ...CLEANERS.map((p) => ({ id: p.id, label: p.name })),
        { id: "reports", label: "Reports" },
        { id: "manage", label: "Manage" },
      ]
    : [
        { id: me.id, label: "My chores" },
        { id: "everyone", label: "Everyone" },
        { id: "reports", label: "Reports" },
      ];
  const requested = (await searchParams).tab;
  const tab = tabs.find((t) => t.id === requested)?.id ?? tabs[0].id;
  const nav = tabs.map((t) => ({ href: `/?tab=${t.id}`, label: t.label, current: t.id === tab }));

  const week = weekOf();
  const { chores, emails } = await loadBoard(week);
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
                  Done · <When iso={doneAt} />
                </>
              ) : lastAt ? (
                <>
                  Last cleaned by {person.name} · <When iso={lastAt} />
                </>
              ) : (
                "Not cleaned yet"
              ),
              comments: <ChoreComments choreId={c.id} comments={comments} person={person} me={me} />,
              commentCount: comments.length,
              commentLabel: isAdmin ? `Comment to ${person.name}` : "Comments",
            };
          })}
          onToggle={setChoreDone.bind(null, person.id)}
          autoCheckOnScroll={false}
          menu={<NavMenu items={nav} />}
        />
        <Footer />
      </>
    );
  }

  return (
    <>
      <AutoRefresh />
      <Shell me={me} week={week} nav={nav}>
        {tab === "everyone" && <EveryoneTable chores={active} me={me} />}
        {tab === "reports" && <ReportsView reports={await loadReports(await recentWeeks(8))} currentWeek={week} />}
        {tab === "manage" && <ManageView chores={chores} emails={emails} />}
      </Shell>
    </>
  );
}
