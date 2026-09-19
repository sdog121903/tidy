import Link from "next/link";
import { toggleDone } from "@/app/actions";
import type { BoardChore } from "@/lib/data";
import { CLEANERS, userName, type User } from "@/lib/users";
import { RingCheck } from "./ring-check";
import { When } from "./when";

/** Chores as rows, people as columns, for the current week. */
export function EveryoneTable({ chores, me }: { chores: BoardChore[]; me: User }) {
  const isAdmin = me.id === "admin";
  if (chores.length === 0) return <p className="t-empty">No chores yet.</p>;

  return (
    <section aria-label="Everyone" className="t-ev">
      <div className="t-ev-row t-ev-head">
        <span className="t-ev-label">Chore</span>
        {CLEANERS.map((p) => {
          const label = (
            <>
              <b>{p.name}</b>
              <span>
                {chores.filter((c) => c.done[p.id]).length}/{chores.length}
              </span>
            </>
          );
          return isAdmin ? (
            <Link key={p.id} href={`/?tab=${p.id}`} className="t-ev-person">
              {label}
            </Link>
          ) : (
            <div key={p.id} className="t-ev-person" data-own={p.id === me.id}>
              {label}
            </div>
          );
        })}
      </div>

      {chores.map((c) => (
        <div key={c.id} className="t-ev-row">
          <div className="t-ev-chore">
            <b>{c.title}</b>
            {c.last && (
              <span className="t-caption">
                Last cleaned · {userName(c.last.by)} · <When iso={c.last.at} />
              </span>
            )}
          </div>
          {CLEANERS.map((p) => {
            const on = !!c.done[p.id];
            const label = `${p.name}: ${c.title}`;
            const own = !isAdmin && p.id === me.id;
            return (
              <div key={p.id} className="t-ev-cell" data-own={own}>
                {isAdmin || own ? (
                  <form action={toggleDone}>
                    <input type="hidden" name="choreId" value={c.id} />
                    <input type="hidden" name="person" value={p.id} />
                    <RingCheck on={on} label={label} />
                  </form>
                ) : (
                  <RingCheck on={on} label={label} interactive={false} />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
