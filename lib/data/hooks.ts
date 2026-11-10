"use client";

import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSodium, type Sodium } from "@/lib/crypto/sodium";
import { decryptEntry, encryptEntry, type EntryContent } from "@/lib/crypto/entry";
import { must, supabase } from "@/lib/supabase/client";
import { localDate } from "@/lib/streaks";
import { useReady, type Profile } from "@/lib/session/SessionProvider";
import { fetchKeyMap, keyId, myWritingKey, syncKeys, type KeyMap } from "./keys";

export type EntryRow = {
  id: string;
  user_id: string;
  log_date: string;
  key_version: number;
  nonce: string;
  ciphertext: string;
  created_at: string;
};
export type Entry = Omit<EntryRow, "nonce" | "ciphertext"> & { content: EntryContent | null };

const ENTRY_COLS = "id, user_id, log_date, key_version, nonce, ciphertext, created_at";

export const qk = {
  keys: ["keys"] as const,
  entries: (uid: string) => ["entries", uid] as const,
  feed: ["feed"] as const,
  friends: ["friends"] as const,
  requests: ["requests"] as const,
  leaderboard: ["leaderboard"] as const,
  stats: (uid: string) => ["stats", uid] as const,
  user: (username: string) => ["user", username] as const,
};

function useSodium() {
  return useQuery({ queryKey: ["sodium"], queryFn: getSodium, staleTime: Infinity });
}

export function useKeyMap() {
  const { userId, identity } = useReady();
  return useQuery({ queryKey: qk.keys, queryFn: () => fetchKeyMap(userId, identity), staleTime: 60_000 });
}

function decryptAll(s: Sodium | undefined, keys: KeyMap | undefined, rows: EntryRow[] | undefined): Entry[] | undefined {
  if (!rows) return undefined;
  return rows.map(({ nonce, ciphertext, ...meta }) => ({
    ...meta,
    content:
      s && keys
        ? decryptEntry(
            s,
            { nonce, ciphertext },
            { userId: meta.user_id, logDate: meta.log_date, keyVersion: meta.key_version },
            keys.get(keyId(meta.user_id, meta.key_version)),
          )
        : null,
  }));
}

/** All entries by one user (self or a friend), newest first, decrypted. */
export function useUserEntries(userId: string | undefined) {
  const s = useSodium().data;
  const keys = useKeyMap();
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
      ) as EntryRow[],
  });
  const entries = useMemo(() => decryptAll(s, keys.data, q.data), [s, keys.data, q.data]);
  return { ...q, entries, decrypting: !s || keys.isLoading };
}

export type FeedItem = Entry & { author: Pick<Profile, "id" | "username" | "display_name"> | null };

const PAGE = 30;

/** Friends' entries, newest first, 30 per page. */
export function useFeed() {
  const { userId } = useReady();
  const s = useSodium().data;
  const keys = useKeyMap();
  const q = useInfiniteQuery({
    queryKey: qk.feed,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      must(
        await supabase()
          .from("entries")
          .select(`${ENTRY_COLS}, author:profiles!entries_user_id_fkey(id, username, display_name)`)
          .neq("user_id", userId)
          .order("created_at", { ascending: false })
          .range(pageParam * PAGE, pageParam * PAGE + PAGE - 1),
      ) as unknown as (EntryRow & { author: FeedItem["author"] })[],
    getNextPageParam: (last, all) => (last.length === PAGE ? all.length : undefined),
  });
  const items = useMemo<FeedItem[] | undefined>(() => {
    const rows = q.data?.pages.flat();
    if (!rows) return undefined;
    const dec = decryptAll(s, keys.data, rows)!;
    return dec.map((e, i) => ({ ...e, author: rows[i].author }));
  }, [s, keys.data, q.data]);
  return { ...q, items };
}

export type FriendStat = Pick<Profile, "id" | "username" | "display_name" | "public_key"> & {
  current_streak: number;
  logged_today: boolean;
};

export function useFriends() {
  return useQuery({
    queryKey: qk.friends,
    queryFn: async () => must(await supabase().rpc("friends_with_stats")) as FriendStat[],
  });
}

export type PublicUser = Pick<Profile, "id" | "username" | "display_name" | "public_key">;
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
      const profiles = must(
        await sb.from("profiles").select("id, username, display_name, public_key").in("id", ids),
      ) as PublicUser[];
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
  score: number;
  current_streak: number;
  rank: number;
};

export function useLeaderboard() {
  return useQuery({
    queryKey: qk.leaderboard,
    queryFn: async () => must(await supabase().rpc("weekly_leaderboard")) as LeaderRow[],
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

/** Runs key sync on load and whenever the friends list changes. */
export function useKeySync() {
  const { userId, identity } = useReady();
  const qc = useQueryClient();
  const friends = useFriends();
  const friendIds = friends.data?.map((f) => f.id).join(",");
  useEffect(() => {
    if (friendIds === undefined) return;
    let alive = true;
    syncKeys(userId, identity)
      .then((changed) => {
        if (alive && changed) qc.invalidateQueries({ queryKey: qk.keys });
      })
      .catch(() => {
        /* retried on the next load or friend change */
      });
    return () => {
      alive = false;
    };
  }, [friendIds, userId, identity, qc]);
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

export function useSaveEntry() {
  const { userId, identity, profile } = useReady();
  const invalidate = useInvalidateMine();
  return useMutation({
    mutationFn: async ({ id, content }: { id?: string; content: EntryContent }) => {
      const s = await getSodium();
      const { version, key } = await myWritingKey(userId, identity);
      const sb = supabase();
      if (id) {
        const row = must(await sb.from("entries").select("log_date").eq("id", id).single()) as { log_date: string };
        const enc = encryptEntry(s, content, { userId, logDate: row.log_date, keyVersion: version }, key);
        const updated = must(await sb.from("entries").update(enc).eq("id", id).select("id")) as unknown[];
        if (!updated.length) throw new Error("Only today's reads can be edited.");
        return { created: false };
      }
      const logDate = localDate(profile.timezone);
      const enc = encryptEntry(s, content, { userId, logDate, keyVersion: version }, key);
      must(await sb.from("entries").insert({ user_id: userId, log_date: logDate, ...enc }));
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
    for (const key of [qk.requests, qk.friends, qk.feed, qk.leaderboard, qk.keys]) qc.invalidateQueries({ queryKey: key });
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
  /** Decline, cancel or unfriend. */
  const remove = useMutation({
    mutationFn: async (otherId: string) => {
      must(await supabase().from("friendships").delete().match(pair(userId, otherId)));
    },
    onSuccess: invalidate,
  });
  return { send, accept, remove };
}
