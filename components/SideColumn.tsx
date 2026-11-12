"use client";

import Link from "next/link";
import { useLeaderboard } from "@/lib/data/hooks";
import { useReady } from "@/lib/session/SessionProvider";
import { Avatar } from "./Avatar";
import { StreakBadge } from "./StreakFlame";
import { Card } from "./ui";

/** Right column on computers (Today and Feed): top 5 streaks. */
export function SideColumn() {
  const { userId } = useReady();
  const board = useLeaderboard();
  if (!board.data || board.data.length < 2) return null;
  return (
    <div className="sticky top-24">
      <Card>
        <h2 className="mb-3 text-lg">Leaderboard</h2>
        <ol className="flex flex-col gap-2">
          {board.data.slice(0, 5).map((r) => (
            <li key={r.user_id}>
              <Link
                href={r.user_id === userId ? "/me" : `/u/${r.username}`}
                className={`flex min-h-9 items-center gap-2 ${r.user_id === userId ? "font-extrabold" : ""}`}
              >
                <span className="w-5 text-text-muted">{r.rank}</span>
                <Avatar name={r.display_name} color={r.color} size={28} />
                <span className="flex-1 truncate">{r.display_name}</span>
                <StreakBadge n={r.current_streak} />
              </Link>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
