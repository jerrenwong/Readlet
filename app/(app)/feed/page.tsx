"use client";

import { useEffect, useMemo, useRef } from "react";
import { EntryCard } from "@/components/EntryCard";
import { Card, ErrorNote, Spinner } from "@/components/ui";
import { useFeed, useFriends, type FeedItem } from "@/lib/data/hooks";
import { useReady } from "@/lib/session/SessionProvider";
import { dayLabel, localDate } from "@/lib/streaks";

export default function FeedPage() {
  const { profile } = useReady();
  const feed = useFeed();
  const friends = useFriends();
  const today = localDate(profile.timezone);
  const streaks = useMemo(() => new Map(friends.data?.map((f) => [f.id, f.current_streak])), [friends.data]);
  const sentinel = useRef<HTMLDivElement>(null);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feed;
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => {
      if (es[0].isIntersecting && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const groups = useMemo(() => {
    const m = new Map<string, FeedItem[]>();
    for (const e of feed.items ?? []) m.set(e.log_date, [...(m.get(e.log_date) ?? []), e]);
    return [...m.entries()];
  }, [feed.items]);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Feed</h1>
      {feed.isLoading && <Spinner />}
      {feed.error && <ErrorNote>Couldn&apos;t load.</ErrorNote>}
      {feed.items && feed.items.length === 0 && (
        <Card className="flex flex-col items-center gap-3 text-center">
          <p className="font-extrabold">No reads yet</p>
        </Card>
      )}
      {groups.map(([date, items]) => (
        <section key={date} className="flex flex-col gap-3">
          <h2 className="text-sm text-text-muted">{dayLabel(date, today)}</h2>
          {items.map((e) => (
            <EntryCard key={e.id} entry={e} author={e.author} streak={streaks.get(e.user_id)} />
          ))}
        </section>
      ))}
      <div ref={sentinel} />
      {isFetchingNextPage && <Spinner label="Loading more" />}
    </div>
  );
}
