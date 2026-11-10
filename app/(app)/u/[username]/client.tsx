"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { UserCard } from "@/components/InviteCard";
import { ProfileView } from "@/components/Profile";
import { Spinner } from "@/components/ui";
import { useFindUser, useFriendActions, useFriends, useUserEntries, useUserStats } from "@/lib/data/hooks";
import { useReady } from "@/lib/session/SessionProvider";
import { localDate } from "@/lib/streaks";

export function FriendProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { userId, profile } = useReady();
  const router = useRouter();
  const user = useFindUser(username);
  const friends = useFriends();
  const isFriend = !!user.data && !!friends.data?.some((f) => f.id === user.data!.id);
  const { entries } = useUserEntries(isFriend ? user.data!.id : undefined);
  const stats = useUserStats(isFriend ? user.data!.id : undefined);
  const { remove } = useFriendActions();
  const [confirm, setConfirm] = useState(false);

  const isMe = user.data?.id === userId;
  useEffect(() => {
    if (isMe) router.replace("/me");
  }, [isMe, router]);
  if (user.isLoading || friends.isLoading) return <Spinner />;
  if (!user.data || !isFriend) return <UserCard username={username} />;
  if (!entries) return <Spinner />;

  const s = stats.data;
  return (
    <ProfileView
      user={user.data}
      entries={entries}
      today={localDate(profile.timezone)}
      stats={s ? { current: s.current_streak, longest: s.longest_streak, total: s.total_reads } : undefined}
      actions={
        <div className="flex justify-end">
          {confirm ? (
            <div className="flex items-center gap-2">
              <span className="text-sm">Remove {user.data.display_name}?</span>
              <Button
                variant="danger"
                size="sm"
                onClick={() => remove.mutate(user.data!.id, { onSuccess: () => router.push("/friends") })}
              >
                Remove
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setConfirm(false)}>
                Keep
              </Button>
            </div>
          ) : (
            <button
              type="button"
              className="min-h-11 rounded-xl px-3 text-text-muted hover:bg-surface"
              onClick={() => setConfirm(true)}
            >
              Remove friend
            </button>
          )}
        </div>
      }
    />
  );
}
