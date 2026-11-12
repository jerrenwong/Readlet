"use client";

import { useState, useSyncExternalStore } from "react";
import { useFindUser, useFriendActions, useFriends, useRequests } from "@/lib/data/hooks";
import { useReady } from "@/lib/session/SessionProvider";
import { Avatar } from "./Avatar";
import { Button } from "./Button";

export const INVITE_KEY = "readlet:invite";
const noop = () => () => {};
const readInvite = () => {
  try {
    return localStorage.getItem(INVITE_KEY);
  } catch {
    return null;
  }
};

/** After arriving through someone's invite link, show their card with "Send friend request". */
export function PendingInvite() {
  const username = useSyncExternalStore(noop, readInvite, () => null);
  const [dismissed, setDismissed] = useState(false);
  if (!username || dismissed) return null;
  return (
    <UserCard
      username={username}
      onDone={() => {
        try {
          localStorage.removeItem(INVITE_KEY);
        } catch {}
        setDismissed(true);
      }}
    />
  );
}

/** A person's card with the right action: send request, pending, accept, or already friends. */
export function UserCard({ username, onDone }: { username: string; onDone?: () => void }) {
  const { userId } = useReady();
  const user = useFindUser(username);
  const friends = useFriends();
  const requests = useRequests();
  const { send, accept } = useFriendActions();
  const [error, setError] = useState<string | null>(null);

  if (user.isLoading) return null;
  if (!user.data)
    return (
      <p className="rounded-[var(--radius-card)] bg-surface p-4 text-text-muted">
        No user @{username}
      </p>
    );
  const u = user.data;
  const isMe = u.id === userId;
  const isFriend = friends.data?.some((f) => f.id === u.id);
  const req = requests.data?.find((r) => r.other.id === u.id);

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-card)] bg-surface p-4 shadow-sm">
      <Avatar name={u.display_name} color={u.color} size={48} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-extrabold">{u.display_name}</p>
        <p className="truncate text-text-muted">@{u.username}</p>
        {error && (
          <p className="text-sm text-danger-text" role="alert">
            {error}
          </p>
        )}
      </div>
      {isMe ? (
        <span className="text-text-muted">You</span>
      ) : isFriend ? (
        <span className="font-extrabold text-accent-text">Friends</span>
      ) : req?.incoming ? (
        <Button
          size="sm"
          disabled={accept.isPending}
          onClick={() => accept.mutate(u.id, { onSuccess: onDone, onError: (e) => setError(e.message) })}
        >
          Accept
        </Button>
      ) : req ? (
        <span className="text-text-muted">Sent</span>
      ) : (
        <Button
          size="sm"
          disabled={send.isPending}
          onClick={() => send.mutate(u.id, { onSuccess: onDone, onError: (e) => setError(e.message) })}
        >
          Add friend
        </Button>
      )}
    </div>
  );
}
