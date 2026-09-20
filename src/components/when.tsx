"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n";
import { relativeDay, shortWeekday } from "@/lib/relative-day";

const subscribe = () => () => {};

/** Renders a date in the viewer's own timezone (client-only to avoid server/browser mismatch). */
export function When({ iso, weekday = false, lang = DEFAULT_LANG }: { iso: string; weekday?: boolean; lang?: Lang }) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  if (!isClient) return <span className="invisible">…</span>;
  const date = new Date(iso);
  return (
    <time dateTime={iso} title={date.toLocaleString(lang)}>
      {weekday ? shortWeekday(date, lang) : relativeDay(date, new Date(), lang)}
    </time>
  );
}
