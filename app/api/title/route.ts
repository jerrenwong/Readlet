// GET /api/title?url=… → { title } from the page's og:title or <title>. Signed-in users only.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { createClient } from "@supabase/supabase-js";

const MAX_BYTES = 256 * 1024;
const TIMEOUT_MS = 5000;

function privateIp(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return privateIp(v.slice(7));
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80");
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  );
}

async function safeUrl(raw: string): Promise<URL | null> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password) return null;
  if (u.port && !["80", "443"].includes(u.port)) return null;
  try {
    const addrs = await lookup(u.hostname, { all: true });
    if (!addrs.length || addrs.some((a) => privateIp(a.address))) return null;
  } catch {
    return null;
  }
  return u;
}

const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

function extractTitle(html: string): string | null {
  const og =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  const t = og?.[1] ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (!t) return null;
  const clean = decode(t).replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, 200) : null;
}

export async function GET(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return Response.json({ title: null }, { status: 401 });
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data } = await sb.auth.getUser(token);
  if (!data.user) return Response.json({ title: null }, { status: 401 });

  let url = await safeUrl(new URL(req.url).searchParams.get("url") ?? "");
  if (!url) return Response.json({ title: null }, { status: 400 });

  try {
    for (let hop = 0; hop < 4; hop++) {
      const res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "user-agent": "Mozilla/5.0 (compatible; ReadletTitleBot/1.0)", accept: "text/html" },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        url = await safeUrl(new URL(res.headers.get("location")!, url).toString());
        if (!url) break;
        continue;
      }
      if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html") || !res.body) break;
      const reader = res.body.getReader();
      let html = "";
      let bytes = 0;
      const dec = new TextDecoder();
      while (bytes < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
        html += dec.decode(value, { stream: true });
        if (/<\/head>/i.test(html)) break;
      }
      await reader.cancel().catch(() => {});
      return Response.json({ title: extractTitle(html) }, { headers: { "cache-control": "private, max-age=86400" } });
    }
  } catch {
    /* timeout or network error */
  }
  return Response.json({ title: null });
}
