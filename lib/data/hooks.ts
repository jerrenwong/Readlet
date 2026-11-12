"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EntryInput } from "@/lib/entry";
import { must, supabase } from "@/lib/supabase/client";
import { localDate } from "@/lib/streaks";
import { useReady, type Profile } from "@/lib/session/SessionProvider";

export type Entry = {
  id: string;
  user_id: string;
  log_date: string;
  title: string;
  url: string | null;
  notes: string | null;
  created_at: string;
};

const ENTRY_COLS = "id, user_id, log_date, title, url, notes, created_at";

export const qk = {
  entries: (uid: string) => ["entries", uid] as const,
  feed: ["feed"] as const,
  friends: ["friends"] as const,
  requests: ["requests"] as const,
  leaderboard: ["leaderboard"] as const,
  stats: (uid: string) => ["stats", uid] as const,
  user: (username: string) => ["user", username] as const,
};

/** All entries by one user (self or a friend), newest first. */
export function useUserEntries(userId: string | undefined) {
  const q = useQuery({
    queryKey: qk.entries(userId ?? "-"),
    enabled: !!userId,
    queryFn: async () =>
      must(
        await supabase()
          .from("entries")
          .select(ENTRY_COLS)
          .eq("user_id", userId!)
          .order("log_date", { ascending: false })
          .order("created_at", { ascending: false }),
      ) as Entry[],
  });
  return { ...q, entries: q.data };
}

export type FeedItem = Entry & { author: Pick<Profile, "id" | "username" | "display_name" | "color"> | null };

const PAGE = 30;

/** Friends' entries, newest first, 30 per page. */
export function useFeed() {
  const { userId } = useReady();
  const q = useInfiniteQuery({
    queryKey: qk.feed,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      must(
        await supabase()
          .from("entries")
          .select(`${ENTRY_COLS}, author:profiles!entries_user_id_fkey(id, username, display_name, color)`)
          .neq("user_id", userId)
          .order("created_at", { ascending: false })
          .range(pageParam * PAGE, pageParam * PAGE + PAGE - 1),
      ) as unknown as FeedItem[],
    getNextPageParam: (last, all) => (last.length === PAGE ? all.length : undefined),
  });
  return { ...q, items: q.data?.pages.flat() };
}

export type FriendStat = Pick<Profile, "id" | "username" | "display_name" | "color"> & {
  current_streak: number;
  logged_today: boolean;
};

export function useFriends() {
  return useQuery({
    queryKey: qk.friends,
    queryFn: async () => must(await supabase().rpc("friends_with_stats")) as FriendStat[],
  });
}

export type PublicUser = Pick<Profile, "id" | "username" | "display_name" | "color">;
export type Request = { other: PublicUser; incoming: boolean; created_at: string };

export function useRequests() {
  const { userId } = useReady();
  return useQuery({
    queryKey: qk.requests,
    refetchInterval: 60_000,
    queryFn: async (): Promise<Request[]> => {
      const sb = supabase();
      const rows = must(
        await sb
          .from("friendships")
          .select("user_a, user_b, requested_by, created_at")
          .eq("status", "pending")
          .or(`user_a.eq.${userId},user_b.eq.${userId}`),
      ) as { user_a: string; user_b: string; requested_by: string; created_at: string }[];
      if (!rows.length) return [];
      const ids = rows.map((r) => (r.user_a === userId ? r.user_b : r.user_a));
      const profiles = must(await sb.from("profiles").select("id, username, display_name, color").in("id", ids)) as PublicUser[];
      const byId = new Map(profiles.map((p) => [p.id, p]));
      return rows
        .map((r) => {
          const other = byId.get(r.user_a === userId ? r.user_b : r.user_a);
          return other ? { other, incoming: r.requested_by !== userId, created_at: r.created_at } : null;
        })
        .filter((x): x is Request => x !== null);
    },
  });
}

export type LeaderRow = {
  user_id: string;
  username: string;
  display_name: string;
  color: string;
  current_streak: number;
  rank: number;
};

export function useLeaderboard() {
  return useQuery({
    queryKey: qk.leaderboard,
    queryFn: async () => must(await supabase().rpc("streak_leaderboard")) as LeaderRow[],
  });
}

export type Stats = { current_streak: number; longest_streak: number; total_reads: number; logged_today: boolean };

export function useUserStats(userId: string | undefined) {
  return useQuery({
    queryKey: qk.stats(userId ?? "-"),
    enabled: !!userId,
    queryFn: async () =>
      ((must(await supabase().rpc("user_stats", { target: userId })) as Stats[])[0] ?? null) as Stats | null,
  });
}

export function useFindUser(username: string | undefined) {
  return useQuery({
    queryKey: qk.user(username ?? "-"),
    enabled: !!username,
    queryFn: async () =>
      ((must(await supabase().rpc("find_user", { username: username!.toLowerCase() })) as PublicUser[])[0] ??
        null) as PublicUser | null,
  });
}

// ------------------------------------------------------------------ mutations

function useInvalidateMine() {
  const qc = useQueryClient();
  const { userId } = useReady();
  return () => {
    qc.invalidateQueries({ queryKey: qk.entries(userId) });
    qc.invalidateQueries({ queryKey: qk.leaderboard });
    qc.invalidateQueries({ queryKey: qk.stats(userId) });
  };
}

const row = (c: EntryInput) => ({ title: c.title, url: c.url ?? null, notes: c.notes ?? null });

export function useSaveEntry() {
  const { userId, profile } = useReady();
  const invalidate = useInvalidateMine();
  return useMutation({
    mutationFn: async ({ id, content }: { id?: string; content: EntryInput }) => {
      const sb = supabase();
      if (id) {
        const updated = must(await sb.from("entries").update(row(content)).eq("id", id).select("id")) as unknown[];
        if (!updated.length) throw new Error("Only today's reads can be edited.");
        return { created: false };
      }
      must(await sb.from("entries").insert({ user_id: userId, log_date: localDate(profile.timezone), ...row(content) }));
      return { created: true };
    },
    onSuccess: invalidate,
  });
}

export function useDeleteEntry() {
  const invalidate = useInvalidateMine();
  return useMutation({
    mutationFn: async (id: string) => {
      const deleted = must(await supabase().from("entries").delete().eq("id", id).select("id")) as unknown[];
      if (!deleted.length) throw new Error("Only today's reads can be deleted.");
    },
    onSuccess: invalidate,
  });
}

const pair = (a: string, b: string) => (a < b ? { user_a: a, user_b: b } : { user_a: b, user_b: a });

function useInvalidateSocial() {
  const qc = useQueryClient();
  return () => {
    for (const key of [qk.requests, qk.friends, qk.feed, qk.leaderboard]) qc.invalidateQueries({ queryKey: key });
  };
}

export function useFriendActions() {
  const { userId } = useReady();
  const invalidate = useInvalidateSocial();
  const send = useMutation({
    mutationFn: async (otherId: string) => {
      const { error } = await supabase()
        .from("friendships")
        .insert({ ...pair(userId, otherId), requested_by: userId, status: "pending" });
      if (error?.message.includes("friend_request_limit")) throw new Error("Daily request limit reached.");
      if (error?.code === "23505") throw new Error("Request already exists.");
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
  });
  const accept = useMutation({
    mutationFn: async (otherId: string) => {
      must(await supabase().from("friendships").update({ status: "accepted" }).match(pair(userId, otherId)));
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (otherId: string) => {
      must(await supabase().from("friendships").delete().match(pair(userId, otherId)));
    },
    onSuccess: invalidate,
  });
  return { send, accept, remove };
}
