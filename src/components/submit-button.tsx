"use client";

import { useFormStatus } from "react-dom";

/** A submit button that disables itself while its form's server action runs. */
export function SubmitButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  return <button {...props} disabled={props.disabled || pending} data-pending={pending || undefined} />;
}
