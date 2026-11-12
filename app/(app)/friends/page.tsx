"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Avatar } from "@/components/Avatar";
import { EmptyState } from "@/components/Brand";
import { Button } from "@/components/Button";
import { UserCard } from "@/components/InviteCard";
import { StreakBadge } from "@/components/StreakFlame";
import { Card, Input, Spinner } from "@/components/ui";
import { useFriendActions, useFriends, useRequests, type Request } from "@/lib/data/hooks";
import { useReady } from "@/lib/session/SessionProvider";

export default function FriendsPage() {
  const { profile } = useReady();
  const friends = useFriends();
  const requests = useRequests();
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/invite/${profile.username}`;

  const incoming = requests.data?.filter((r) => r.incoming) ?? [];
  const outgoing = requests.data?.filter((r) => !r.incoming) ?? [];

  function search(e: FormEvent) {
    e.preventDefault();
    const u = query.trim().toLowerCase().replace(/^@/, "");
    setSearched(u || null);
  }

  async function copy() {
    try {
      if (navigator.share && /Mobi|Android|iPhone/.test(navigator.userAgent)) {
        await navigator.share({ title: "Readlet", url: link });
      } else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* share cancelled */
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-5xl text-flame">Friends</h1>

      <Card>
        <form onSubmit={search} className="flex gap-2" role="search">
          <label className="sr-only" htmlFor="find">
            Exact username
          </label>
          <Input
            id="find"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Exact username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <Button type="submit" size="sm" className="!min-h-12 !px-5">
            Find
          </Button>
        </form>
        {searched && (
          <div className="mt-3">
            <UserCard username={searched} />
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-2xl">Invite link</h2>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate border border-flame-off bg-background px-3 py-2.5 text-sm">{link}</code>
          <Button variant="secondary" size="sm" onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </Card>

      {incoming.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-2xl">Requests</h2>
          {incoming.map((r) => (
            <RequestRow key={r.other.id} r={r} />
          ))}
        </section>
      )}
      {outgoing.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-2xl">Sent</h2>
          {outgoing.map((r) => (
            <RequestRow key={r.other.id} r={r} />
          ))}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-2xl">Friends</h2>
        {friends.isLoading && <Spinner />}
        {friends.data?.length === 0 && (
          <EmptyState art="building">
            <p className="text-text-muted">None yet</p>
          </EmptyState>
        )}
        {friends.data?.map((f) => (
          <Link
            key={f.id}
            href={`/u/${f.username}`}
            className="flex min-h-16 items-center gap-3 border border-flame-off bg-surface p-3 hover:border-field"
          >
            <Avatar name={f.display_name} size={44} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{f.display_name}</span>
              {f.logged_today && <span className="block text-sm text-accent-text">✓ Today</span>}
            </span>
            <StreakBadge n={f.current_streak} lit={f.logged_today} />
          </Link>
        ))}
      </section>
    </div>
  );
}

function RequestRow({ r }: { r: Request }) {
  const { accept, remove } = useFriendActions();
  const busy = accept.isPending || remove.isPending;
  return (
    <div className="flex items-center gap-3 border border-flame-off bg-surface p-3">
      <Avatar name={r.other.display_name} size={44} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{r.other.display_name}</span>
        <span className="block truncate text-sm text-text-muted">@{r.other.username}</span>
      </span>
      {r.incoming ? (
        <>
          <Button size="sm" disabled={busy} onClick={() => accept.mutate(r.other.id)}>
            Accept
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => remove.mutate(r.other.id)}
          >
            Decline
          </Button>
        </>
      ) : (
        <button
          type="button"
          className="min-h-11 px-3 text-text-muted hover:bg-background hover:text-text"
          disabled={busy}
          onClick={() => remove.mutate(r.other.id)}
        >
          Cancel
        </button>
      )}
    </div>
  );
}
