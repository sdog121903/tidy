"use client";

import { useSyncExternalStore } from "react";
import { relativeDay, shortWeekday } from "@/lib/relative-day";

const subscribe = () => () => {};

/** Renders a date in the viewer's own timezone (client-only to avoid server/browser mismatch). */
export function When({ iso, weekday = false }: { iso: string; weekday?: boolean }) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  if (!isClient) return <span className="invisible">today</span>;
  const date = new Date(iso);
  return (
    <time dateTime={iso} title={date.toLocaleString()}>
      {weekday ? shortWeekday(date) : relativeDay(date)}
    </time>
  );
}
