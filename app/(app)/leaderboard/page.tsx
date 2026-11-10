"use client";

import Link from "next/link";
import { StreakBadge } from "@/components/StreakFlame";
import { ErrorNote, Spinner } from "@/components/ui";
import { useLeaderboard } from "@/lib/data/hooks";
import { useReady } from "@/lib/session/SessionProvider";
import { daysBetween, localDate, weekStart, addDays } from "@/lib/streaks";

const RING = ["ring-[#E2A500]", "ring-[#9AA3AD]", "ring-[#C27C3A]"]; // gold, silver, bronze

export default function LeaderboardPage() {
  const { userId, profile } = useReady();
  const board = useLeaderboard();
  const today = localDate(profile.timezone);
  const left = daysBetween(today, addDays(weekStart(today), 7));

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl">This week</h1>
        <p className="text-text-muted">
          Resets in {left} {left === 1 ? "day" : "days"}
        </p>
      </header>
      {board.isLoading && <Spinner />}
      {board.error && <ErrorNote>Couldn&apos;t load.</ErrorNote>}
      {board.data && (
        <ol className="flex flex-col gap-2">
          {board.data.map((r) => {
            const me = r.user_id === userId;
            return (
              <li key={r.user_id}>
                <Link
                  href={me ? "/me" : `/u/${r.username}`}
                  className={`flex min-h-16 items-center gap-3 rounded-[var(--radius-card)] p-3 shadow-sm ${
                    me ? "bg-primary/15 outline-2 outline-primary" : "bg-surface"
                  }`}
                  aria-current={me ? "true" : undefined}
                >
                  <span
                    className={`num flex size-10 shrink-0 items-center justify-center rounded-full text-xl ${
                      r.rank <= 3 ? `ring-4 ${RING[r.rank - 1]}` : ""
                    }`}
                  >
                    {r.rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-extrabold">
                    {r.display_name}
                    {me && <span className="font-semibold"> (you)</span>}
                  </span>
                  <StreakBadge n={r.current_streak} />
                  <span className="num w-10 text-right text-2xl" aria-label={`${r.score} points`}>
                    {r.score}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
