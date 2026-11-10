"use client";

import Link from "next/link";
import { useFriends, useLeaderboard } from "@/lib/data/hooks";
import { useReady } from "@/lib/session/SessionProvider";
import { CatAvatar } from "./Cat";
import { StreakBadge } from "./StreakFlame";
import { Card } from "./ui";

/** Right column on computers (Today and Feed): friends' streaks and this week's top 5. */
export function SideColumn() {
  const { userId } = useReady();
  const friends = useFriends();
  const board = useLeaderboard();
  return (
    <div className="sticky top-8 flex flex-col gap-4">
      <Card>
        <h2 className="mb-3 text-lg">This week</h2>
        <ol className="flex flex-col gap-2">
          {board.data?.slice(0, 5).map((r) => (
            <li key={r.user_id} className={`flex items-center gap-2 ${r.user_id === userId ? "font-extrabold" : ""}`}>
              <span className="w-5 text-text-muted">{r.rank}</span>
              <CatAvatar avatar={r.avatar} size={28} />
              <span className="flex-1 truncate">{r.display_name}</span>
              <span className="num">{r.score}</span>
            </li>
          ))}
        </ol>
        <Link href="/leaderboard" className="mt-3 inline-block font-extrabold text-accent-text">
          All
        </Link>
      </Card>
      <Card>
        <h2 className="mb-3 text-lg">Friends</h2>
        {friends.data?.length ? (
          <ul className="flex flex-col gap-2">
            {friends.data.map((f) => (
              <li key={f.id}>
                <Link href={`/u/${f.username}`} className="flex items-center gap-2">
                  <CatAvatar avatar={f.avatar} size={28} />
                  <span className="flex-1 truncate">{f.display_name}</span>
                  {f.logged_today && <span className="text-accent-text" aria-label="read today">✓</span>}
                  <StreakBadge n={f.current_streak} lit={f.logged_today} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Link href="/friends" className="font-extrabold text-accent-text">
            Add friends
          </Link>
        )}
      </Card>
    </div>
  );
}
