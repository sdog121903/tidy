"use client";

import { useActionState } from "react";
import { enterName } from "@/app/actions";

export function NameForm() {
  const [error, action, pending] = useActionState(enterName, null);
  return (
    <form action={action} className="t-login-form">
      <label htmlFor="name">What&apos;s your name?</label>
      <input id="name" name="name" type="text" autoFocus autoComplete="given-name" placeholder="Type your name" />
      <button disabled={pending} data-pending={pending || undefined}>
        Let&apos;s go
      </button>
      {error && (
        <p role="alert" className="t-login-error">
          {error}
        </p>
      )}
    </form>
  );
}
