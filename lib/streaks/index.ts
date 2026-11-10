// Client-side copies of the SQL streak rules (spec: "Streak and leaderboard rules"), for optimistic UI.
// Dates are ISO "YYYY-MM-DD" strings in the user's profile timezone.

/** Today's date in an IANA timezone. */
export function localDate(timeZone: string, now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** Monday of the week containing `date`. */
export function weekStart(date: string): string {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(date, -((dow + 6) % 7));
}

export type Streak = {
  current: number;
  longest: number;
  /** today has at least one entry */
  today: boolean;
  /** current > 0 but today not yet logged ("Log today to keep it") */
  atRisk: boolean;
};

export function computeStreak(dates: Iterable<string>, today: string): Streak {
  const days = [...new Set(dates)].filter((d) => d <= today).sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev !== null && daysBetween(prev, d) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  const set = new Set(days);
  const todayCounts = set.has(today);
  let current = 0;
  let cursor = todayCounts ? today : addDays(today, -1);
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, longest, today: todayCounts, atRisk: !todayCounts && current > 0 };
}

const MILESTONES = [3, 7, 14, 30, 50, 100, 365];

/** 3, 7, 14, 30, 50, 100, 365, then every 100 days (400, 500, …). */
export function isMilestone(n: number): boolean {
  return MILESTONES.includes(n) || (n > 365 && n % 100 === 0);
}

export const DAILY_CAP = 3;

/** Weekly score: entries this week (Monday..today), at most 3 per day. */
export function weeklyScore(entryDates: readonly string[], today: string): number {
  const start = weekStart(today);
  const perDay = new Map<string, number>();
  for (const d of entryDates) if (d >= start && d <= today) perDay.set(d, (perDay.get(d) ?? 0) + 1);
  let score = 0;
  for (const n of perDay.values()) score += Math.min(n, DAILY_CAP);
  return score;
}

export type LeaderRow = { id: string; display_name: string; score: number; streak: number };

/** Score desc, then current streak desc, then display name A→Z. */
export function rankLeaderboard<T extends LeaderRow>(rows: readonly T[]): (T & { rank: number })[] {
  return [...rows]
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.streak - a.streak ||
        a.display_name.localeCompare(b.display_name, "en", { sensitivity: "base" }),
    )
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

/** "Today", "Yesterday", or e.g. "Sat, 8 Nov". */
export function dayLabel(date: string, today: string): string {
  const diff = daysBetween(date, today);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
