import { addChore, saveEmails, sendReportNow } from "@/app/actions";
import type { BoardChore } from "@/lib/data";
import { USERS } from "@/lib/users";
import { Icon } from "./icons";
import { ManageChores, WipeWeek } from "./manage-chores";
import { SubmitButton } from "./submit-button";

export function ManageView({ chores, emails }: { chores: BoardChore[]; emails: Record<string, string> }) {
  return (
    <>
      <section aria-labelledby="add-chore" className="t-add t-on-ink">
        <h2 id="add-chore">Add a chore</h2>
        <p>Every chore goes on Laura, Anna and Noemie&apos;s lists.</p>
        <form action={addChore}>
          <label htmlFor="new-chore" className="t-sr">
            Chore name
          </label>
          <input id="new-chore" name="title" required maxLength={200} placeholder="e.g. Clean the bathroom" className="t-input t-input--dark" />
          <label htmlFor="new-notes" className="t-sr">
            Notes
          </label>
          <input id="new-notes" name="notes" maxLength={1000} placeholder="Notes (optional)" className="t-input t-input--dark" />
          <SubmitButton className="t-pill t-pill--accent">+ Add chore</SubmitButton>
        </form>
      </section>

      <h2 className="t-h2">Chores</h2>
      <ManageChores chores={chores.map(({ id, title, notes, active }) => ({ id, title, notes, active }))} />

      <section aria-labelledby="emails" className="t-emails">
        <h2 id="emails">
          <Icon name="mail" />
          Emails
        </h2>
        <p>
          People with an email get notified when someone checks off a chore, and get the weekly report every Sunday night.
          Leave blank to skip.
        </p>
        <form action={saveEmails}>
          {USERS.map((u) => (
            <div key={u.id} className="t-email-row">
              <label htmlFor={`email-${u.id}`}>{u.name}</label>
              <input
                id={`email-${u.id}`}
                type="email"
                name={`email_${u.id}`}
                defaultValue={emails[u.id] ?? ""}
                placeholder="name@example.com"
                className="t-input"
              />
            </div>
          ))}
          <div className="t-row" style={{ marginTop: 4 }}>
            <SubmitButton className="t-pill">Save emails</SubmitButton>
            <SubmitButton className="t-pill" formAction={sendReportNow} formNoValidate>
              Send this week&apos;s report now
            </SubmitButton>
          </div>
        </form>
      </section>

      <WipeWeek />
    </>
  );
}
