// Bookmarks API.
//   Authorization: Bearer rl_…        personal API token (Settings → API tokens), for agents and scripts
//   Authorization: Bearer <session>   the app's own Supabase session
// GET               → { bookmarks: Bookmark[] }
// POST { url, title? } | { urls: string[] } | { items: { url, title? }[] }   (≤ 100; missing titles are fetched)
//                   → { added: Bookmark[] }   duplicates are skipped
// DELETE ?id=<uuid> → { deleted: boolean }
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fetchTitle } from "@/lib/server/title";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const MAX_ITEMS = 100;

type Caller = { kind: "token"; token: string; sb: SupabaseClient } | { kind: "session"; sb: SupabaseClient };

async function caller(req: Request): Promise<Caller | null> {
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!bearer) return null;
  if (bearer.startsWith("rl_")) return { kind: "token", token: bearer, sb: createClient(URL_, ANON) };
  const sb = createClient(URL_, ANON, { global: { headers: { Authorization: `Bearer ${bearer}` } } });
  const { data } = await sb.auth.getUser(bearer);
  return data.user ? { kind: "session", sb } : null;
}

const json = (body: unknown, status = 200) => Response.json(body, { status });
const unauthorized = () => json({ error: "Missing or invalid token" }, 401);
const dbError = (e: { message: string }) =>
  /invalid_token/.test(e.message) ? unauthorized() : json({ error: e.message }, 400);

function parseItems(body: unknown): { url: string; title?: string }[] | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const raw: unknown[] = Array.isArray(b.items) ? b.items : Array.isArray(b.urls) ? b.urls : b.url ? [b] : [];
  const items = raw.map((x) =>
    typeof x === "string"
      ? { url: x.trim() }
      : x && typeof x === "object" && typeof (x as { url?: unknown }).url === "string"
        ? {
            url: ((x as { url: string }).url).trim(),
            title: typeof (x as { title?: unknown }).title === "string" ? (x as { title: string }).title.trim() || undefined : undefined,
          }
        : null,
  );
  if (!items.length || items.length > MAX_ITEMS || items.some((i) => !i || !/^https?:\/\/\S+$/i.test(i.url) || i.url.length > 2000))
    return null;
  return items as { url: string; title?: string }[];
}

/** Fill missing titles, 5 at a time. */
async function withTitles(items: { url: string; title?: string }[]) {
  const out = [...items];
  for (let i = 0; i < out.length; i += 5) {
    await Promise.all(
      out.slice(i, i + 5).map(async (it, j) => {
        if (!it.title) out[i + j] = { ...it, title: (await fetchTitle(it.url)) ?? undefined };
      }),
    );
  }
  return out.map((it) => ({ url: it.url, title: it.title?.slice(0, 200) || null }));
}

export async function GET(req: Request) {
  const c = await caller(req);
  if (!c) return unauthorized();
  const r =
    c.kind === "token"
      ? await c.sb.rpc("api_list_bookmarks", { token: c.token })
      : await c.sb.from("bookmarks").select("*").order("created_at", { ascending: false });
  return r.error ? dbError(r.error) : json({ bookmarks: r.data });
}

export async function POST(req: Request) {
  const c = await caller(req);
  if (!c) return unauthorized();
  if (c.kind === "token") {
    // Check the token before fetching any titles.
    const check = await c.sb.rpc("api_list_bookmarks", { token: c.token }).limit(1);
    if (check.error) return dbError(check.error);
  }
  const items = parseItems(await req.json().catch(() => null));
  if (!items) return json({ error: `Send { url } or { urls: [...] } (1–${MAX_ITEMS} http(s) links)` }, 400);
  const rows = await withTitles(items);
  const r =
    c.kind === "token"
      ? await c.sb.rpc("api_add_bookmarks", { token: c.token, items: rows })
      : await c.sb.from("bookmarks").upsert(rows, { onConflict: "user_id,url", ignoreDuplicates: true }).select("*");
  return r.error ? dbError(r.error) : json({ added: r.data }, 201);
}

export async function DELETE(req: Request) {
  const c = await caller(req);
  if (!c) return unauthorized();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Missing ?id=" }, 400);
  const r =
    c.kind === "token"
      ? await c.sb.rpc("api_delete_bookmark", { token: c.token, bookmark_id: id })
      : await c.sb.from("bookmarks").delete().eq("id", id).select("id");
  if (r.error) return dbError(r.error);
  return json({ deleted: c.kind === "token" ? r.data === true : (r.data as unknown[]).length > 0 });
}
