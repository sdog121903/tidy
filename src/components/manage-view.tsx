import { addChore, saveEmails, sendReportNow } from "@/app/actions";
import type { BoardChore } from "@/lib/data";
import { messages, type Lang } from "@/lib/i18n";
import { USERS } from "@/lib/users";
import { ChoreTranslations } from "./chore-translations";
import { Icon } from "./icons";
import { ManageChores, WipeWeek } from "./manage-chores";
import { SubmitButton } from "./submit-button";

export function ManageView({
  chores,
  emails,
  lang,
}: {
  chores: BoardChore[];
  emails: Record<string, string>;
  lang: Lang;
}) {
  const t = messages(lang);
  return (
    <>
      <section aria-labelledby="add-chore" className="t-add t-on-ink">
        <h2 id="add-chore">{t.addChore}</h2>
        <p>{t.addChoreHint}</p>
        <form action={addChore}>
          <label htmlFor="new-chore" className="t-sr">
            {t.choreName}
          </label>
          <input id="new-chore" name="title" required maxLength={200} placeholder={t.choreNamePlaceholder} className="t-input t-input--dark" />
          <label htmlFor="new-notes" className="t-sr">
            {t.notes}
          </label>
          <input id="new-notes" name="notes" maxLength={1000} placeholder={t.notesPlaceholder} className="t-input t-input--dark" />
          <ChoreTranslations idPrefix="new-title" lang={lang} dark />
          <SubmitButton className="t-pill t-pill--accent">{t.addChoreButton}</SubmitButton>
        </form>
      </section>

      <h2 className="t-h2">{t.choresHeading}</h2>
      <ManageChores
        chores={chores.map(({ id, title, titles, notes, active }) => ({ id, title, titles, notes, active }))}
        lang={lang}
      />

      <section aria-labelledby="emails" className="t-emails">
        <h2 id="emails">
          <Icon name="mail" />
          {t.emails}
        </h2>
        <p>{t.emailsHint}</p>
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
            <SubmitButton className="t-pill">{t.saveEmails}</SubmitButton>
            <SubmitButton className="t-pill" formAction={sendReportNow} formNoValidate>
              {t.sendReportNow}
            </SubmitButton>
          </div>
        </form>
      </section>

      <WipeWeek lang={lang} />
    </>
  );
}
