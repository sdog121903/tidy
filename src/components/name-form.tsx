"use client";

import { useActionState } from "react";
import { enterName } from "@/app/actions";
import { messages, type Lang } from "@/lib/i18n";

export function NameForm({ lang }: { lang: Lang }) {
  const t = messages(lang);
  const [error, action, pending] = useActionState(enterName, null);
  return (
    <form action={action} className="t-login-form">
      <label htmlFor="name">{t.whatsYourName}</label>
      <input id="name" name="name" type="text" autoFocus autoComplete="given-name" placeholder={t.typeYourName} />
      <button disabled={pending} data-pending={pending || undefined}>
        {t.letsGo}
      </button>
      {error && (
        <p role="alert" className="t-login-error">
          {error}
        </p>
      )}
    </form>
  );
}
