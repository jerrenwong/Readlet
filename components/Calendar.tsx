import { addDays, weekStart } from "@/lib/streaks";

/** Days logged over the last 12 weeks: columns are weeks (oldest left), rows Mon–Sun. */
export function Calendar12({ days, today }: { days: ReadonlySet<string>; today: string }) {
  const first = addDays(weekStart(today), -7 * 11);
  const weeks = Array.from({ length: 12 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(first, w * 7 + d)));
  const count = weeks.flat().filter((d) => days.has(d)).length;
  return (
    <figure>
      <div className="grid grid-flow-col grid-rows-7 gap-1" role="img" aria-label={`${count} ${count === 1 ? "day" : "days"} read in the last 12 weeks`}>
        {weeks.flat().map((d) => (
          <span
            key={d}
            title={d}
            className={`aspect-square rounded-[4px] ${
              d > today ? "bg-transparent" : days.has(d) ? "bg-accent" : "bg-flame-off/45"
            } ${d === today ? "ring-2 ring-primary" : ""}`}
          />
        ))}
      </div>
      <figcaption className="mt-2 text-sm text-text-muted">
        {count} {count === 1 ? "day" : "days"} read in the last 12 weeks
      </figcaption>
    </figure>
  );
}
