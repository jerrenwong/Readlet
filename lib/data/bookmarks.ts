"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { must, supabase } from "@/lib/supabase/client";
import { useReady } from "@/lib/session/SessionProvider";
import { qk } from "./hooks";

export type Bookmark = { id: string; url: string; title: string | null; created_at: string };
export type ApiToken = { id: string; name: string; created_at: string; last_used_at: string | null };

const bq = { bookmarks: ["bookmarks"] as const, tokens: ["api-tokens"] as const };

export function useBookmarks() {
  return useQuery({
    queryKey: bq.bookmarks,
    queryFn: async () =>
      must(
        await supabase().from("bookmarks").select("id, url, title, created_at").order("created_at", { ascending: false }),
      ) as Bookmark[],
  });
}

/** Adds links through /api/bookmarks so the server fills in titles. */
export function useAddBookmarks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (urls: string[]) => {
      const { data } = await supabase().auth.getSession();
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
        body: JSON.stringify({ urls }),
      });
      const body = (await res.json().catch(() => ({}))) as { added?: Bookmark[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Couldn't add.");
      return body.added ?? [];
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: bq.bookmarks }),
  });
}

export function useBookmarkActions() {
  const qc = useQueryClient();
  const { userId } = useReady();
  const read = useMutation({
    mutationFn: async (id: string) => must(await supabase().rpc("read_bookmark", { bookmark_id: id })),
    onSuccess: () => {
      for (const key of [bq.bookmarks, qk.entries(userId), qk.leaderboard, qk.stats(userId)])
        qc.invalidateQueries({ queryKey: key });
    },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      must(await supabase().from("bookmarks").delete().eq("id", id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: bq.bookmarks }),
  });
  return { read, remove };
}

export function useApiTokens() {
  return useQuery({
    queryKey: bq.tokens,
    queryFn: async () =>
      must(
        await supabase().from("api_tokens").select("id, name, created_at, last_used_at").order("created_at", { ascending: false }),
      ) as ApiToken[],
  });
}

export function useApiTokenActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: bq.tokens });
  const create = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase().rpc("create_api_token", { name });
      if (error) throw new Error(error.message.includes("token_limit") ? "Max. 10 tokens." : error.message);
      return data as string;
    },
    onSuccess: invalidate,
  });
  const revoke = useMutation({
    mutationFn: async (id: string) => {
      must(await supabase().from("api_tokens").delete().eq("id", id));
    },
    onSuccess: invalidate,
  });
  return { create, revoke };
}
