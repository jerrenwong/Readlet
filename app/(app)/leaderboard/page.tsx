"use client";

import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { ErrorNote, Spinner } from "@/components/ui";
import { useLeaderboard } from "@/lib/data/hooks";
import { useReady } from "@/lib/session/SessionProvider";

const RING = ["ring-[#E2A500]", "ring-[#9AA3AD]", "ring-[#C27C3A]"]; // gold, silver, bronze

function Flame({ lit }: { lit: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M32 4c4 10 16 16 16 32a16 16 0 0 1-32 0c0-8 4-13 8-17 0 6 3 9 6 10-2-9 0-18 2-25z"
        fill={lit ? "#FF6B2C" : "#D8D0C9"}
      />
    </svg>
  );
}

export default function LeaderboardPage() {
  const { userId } = useReady();
  const board = useLeaderboard();

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Leaderboard</h1>
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
                    className={`num flex size-9 shrink-0 items-center justify-center rounded-full text-lg ${
                      r.rank <= 3 ? `ring-4 ${RING[r.rank - 1]}` : ""
                    }`}
                  >
                    {r.rank}
                  </span>
                  <Avatar name={r.display_name} color={r.color} size={40} />
                  <span className="min-w-0 flex-1 truncate font-extrabold">
                    {r.display_name}
                    {me && <span className="font-semibold"> (you)</span>}
                  </span>
                  <span className="flex items-center gap-1" aria-label={`${r.current_streak} day streak`}>
                    <Flame lit={r.current_streak > 0} />
                    <span className="num text-2xl">{r.current_streak}</span>
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
