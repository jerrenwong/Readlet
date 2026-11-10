#!/usr/bin/env node
// Applies supabase/migrations/*.sql to the hosted project through the Supabase Management API,
// recording each in supabase_migrations.schema_migrations (the table `supabase db push` uses).
// Env: SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF. Usage: node scripts/db-push.mjs [--dry-run]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const { SUPABASE_ACCESS_TOKEN: token, SUPABASE_PROJECT_REF: ref } = process.env;
if (!token || !ref) throw new Error("Set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF");
const dry = process.argv.includes("--dry-run");

export async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${body}`);
  return JSON.parse(body);
}

const q = (s) => `'${s.replaceAll("'", "''")}'`;

await query(`create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);`);
const applied = new Set((await query("select version from supabase_migrations.schema_migrations")).map((r) => r.version));

const dir = "supabase/migrations";
for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  const [version, ...rest] = file.replace(/\.sql$/, "").split("_");
  if (applied.has(version)) continue;
  const sql = readFileSync(join(dir, file), "utf8");
  console.log(`${dry ? "would apply" : "applying"} ${file}`);
  if (dry) continue;
  await query(`begin;\n${sql}\ninsert into supabase_migrations.schema_migrations (version, name, statements)
    values (${q(version)}, ${q(rest.join("_"))}, array[${q(sql)}]);\ncommit;`);
}
console.log("migrations up to date");
