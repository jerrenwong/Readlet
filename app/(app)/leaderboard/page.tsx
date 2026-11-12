"use client";

import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { FLAME_PATH } from "@/components/StreakFlame";
import { ErrorNote, Spinner } from "@/components/ui";
import { useLeaderboard } from "@/lib/data/hooks";
import { useReady } from "@/lib/session/SessionProvider";
import { colors } from "@/lib/theme/tokens";

// Top three on the brand palette instead of gold/silver/bronze: filled, ring, faded ring.
const TOP = ["bg-primary text-white", "ring-2 ring-inset ring-primary text-accent-text", "ring-2 ring-inset ring-primary/40 text-accent-text"];

function Flame({ lit }: { lit: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 64 64" aria-hidden="true">
      <path d={FLAME_PATH} fill={lit ? colors.flame : colors.flameOff} />
    </svg>
  );
}

export default function LeaderboardPage() {
  const { userId } = useReady();
  const board = useLeaderboard();

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-5xl text-flame">Leaderboard</h1>
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
                  className={`flex min-h-16 items-center gap-3 border p-3 ${
                    me ? "border-accent bg-accent/10 shadow-[inset_4px_0_0_var(--color-accent)]" : "border-flame-off bg-surface hover:border-field"
                  }`}
                  aria-current={me ? "true" : undefined}
                >
                  <span
                    className={`num flex size-9 shrink-0 items-center justify-center rounded-full text-xl ${
                      r.rank <= 3 ? TOP[r.rank - 1] : "text-text-muted"
                    }`}
                  >
                    {r.rank}
                  </span>
                  <Avatar name={r.display_name} size={40} />
                  <span className="min-w-0 flex-1 truncate font-semibold">
                    {r.display_name}
                    {me && <span className="font-normal text-text-muted"> (you)</span>}
                  </span>
                  <span className="flex items-center gap-1" aria-label={`${r.current_streak} day streak`}>
                    <Flame lit={r.current_streak > 0} />
                    <span className="num text-3xl">{r.current_streak}</span>
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
