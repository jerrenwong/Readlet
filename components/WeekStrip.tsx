import { addDays, weekStart } from "@/lib/streaks";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Mon–Sun strip for the week containing `today`, with a checkmark on days that have a read. */
export function WeekStrip({ days, today }: { days: ReadonlySet<string>; today: string }) {
  const start = weekStart(today);
  return (
    <ol className="grid grid-cols-7 gap-1 text-center" aria-label="This week">
      {DAYS.map((d, i) => {
        const date = addDays(start, i);
        const done = days.has(date);
        const isToday = date === today;
        const future = date > today;
        return (
          <li key={d} className="flex flex-col items-center gap-1">
            <span className={`text-xs uppercase tracking-wider ${isToday ? "font-semibold text-text" : "text-text-muted"}`}>{d}</span>
            <span
              role="img"
              className={`flex size-9 items-center justify-center rounded-full text-lg font-semibold ${
                done ? "bg-accent text-white" : future ? "border border-dashed border-field" : "bg-flame-off/60"
              } ${isToday ? "ring-2 ring-primary-edge ring-offset-2 ring-offset-surface" : ""}`}
              aria-label={`${d}: ${done ? "read" : future ? "upcoming" : "no read"}`}
            >
              {done ? "✓" : ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
