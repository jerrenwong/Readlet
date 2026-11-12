// GET /api/title?url=… → { title } from the page's og:title or <title>. Signed-in users only.
import { createClient } from "@supabase/supabase-js";
import { fetchTitle, safeUrl } from "@/lib/server/title";

export async function GET(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return Response.json({ title: null }, { status: 401 });
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await sb.auth.getUser(token);
  if (!data.user) return Response.json({ title: null }, { status: 401 });
  const raw = new URL(req.url).searchParams.get("url") ?? "";
  if (!(await safeUrl(raw))) return Response.json({ title: null }, { status: 400 });
  return Response.json({ title: await fetchTitle(raw) }, { headers: { "cache-control": "private, max-age=86400" } });
}
