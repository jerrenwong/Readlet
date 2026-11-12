"use client";

import { useMemo } from "react";
import type { Entry } from "@/lib/data/hooks";
import { computeStreak, dayLabel } from "@/lib/streaks";
import { Avatar } from "./Avatar";
import { Calendar12 } from "./Calendar";
import { EntryCard } from "./EntryCard";
import { Card } from "./ui";

export function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-background px-2 py-3">
      <span className="num text-3xl">{n}</span>
      <span className="text-sm text-text-muted">{label}</span>
    </div>
  );
}

/** Profile header + stats + 12-week calendar + entries by day. Used for Me and friends. */
export function ProfileView({
  user,
  entries,
  today,
  stats,
  actions,
  onEdit,
}: {
  user: { display_name: string; username: string; color?: string | null };
  entries: Entry[];
  today: string;
  /** Server stats for friends (their timezone); computed locally for me. */
  stats?: { current: number; longest: number; total: number };
  actions?: React.ReactNode;
  onEdit?: (e: Entry) => void;
}) {
  const days = useMemo(() => new Set(entries.map((e) => e.log_date)), [entries]);
  const local = computeStreak(days, today);
  const s = stats ?? { current: local.current, longest: local.longest, total: entries.length };
  const byDay = useMemo(() => {
    const m = new Map<string, Entry[]>();
    for (const e of entries) m.set(e.log_date, [...(m.get(e.log_date) ?? []), e]);
    return [...m.entries()];
  }, [entries]);

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex items-center gap-4">
        <Avatar name={user.display_name} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl">{user.display_name}</h1>
          <p className="truncate text-text-muted">@{user.username}</p>
        </div>
      </Card>
      {actions}
      <div className="grid grid-cols-3 gap-3">
        <Stat n={s.current} label="current" />
        <Stat n={s.longest} label="longest" />
        <Stat n={s.total} label="total reads" />
      </div>
      <Card>
        <h2 className="mb-3 text-lg">Last 12 weeks</h2>
        <Calendar12 days={days} today={today} />
      </Card>
      <section className="flex flex-col gap-3" aria-label="History">
        <h2 className="text-lg">History</h2>
        {byDay.length === 0 && <p className="text-text-muted">None yet</p>}
        {byDay.map(([date, list]) => (
          <div key={date} className="flex flex-col gap-2">
            <h3 className="text-sm text-text-muted">{dayLabel(date, today)}</h3>
            {list.map((e) => (
              <EntryCard key={e.id} entry={e} onEdit={onEdit && date === today ? () => onEdit(e) : undefined} />
            ))}
          </div>
        ))}
      </section>
    </div>
  );
}
