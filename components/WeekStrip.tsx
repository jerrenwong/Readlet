"use client";

import { useSyncExternalStore } from "react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const noop = () => () => {};
// Local weekday, Monday = 0. Read in the browser only: "today" is the user's local day.
const localWeekday = () => (new Date().getDay() + 6) % 7;

/** Mon–Sun strip; `done` marks days with a read. */
export function WeekStrip({ done }: { done: boolean[] }) {
  const today = useSyncExternalStore(noop, localWeekday, () => -1);
  return (
    <ol className="grid grid-cols-7 gap-1 text-center" aria-label="This week">
      {DAYS.map((d, i) => (
        <li key={d} className="flex flex-col items-center gap-1">
          <span className={`text-xs ${i === today ? "text-text" : "text-text-muted"}`}>{d}</span>
          <span
            className={`flex size-9 items-center justify-center rounded-full ${
              done[i] ? "bg-accent text-white" : "bg-flame-off/50"
            } ${i === today ? "ring-2 ring-primary ring-offset-2 ring-offset-surface" : ""}`}
            aria-label={done[i] ? `${d}: read` : `${d}: not yet`}
          >
            {done[i] ? "✓" : ""}
          </span>
        </li>
      ))}
    </ol>
  );
}
