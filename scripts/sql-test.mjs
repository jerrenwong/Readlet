#!/usr/bin/env node
// Runs supabase/tests/*.sql against the hosted project inside a transaction that is always rolled back.
// Env: SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF. (CI runs the same files with psql against local Supabase.)
import { readdirSync, readFileSync } from "node:fs";

const { SUPABASE_ACCESS_TOKEN: token, SUPABASE_PROJECT_REF: ref } = process.env;
if (!token || !ref) throw new Error("Set SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF");

let failed = false;
for (const f of readdirSync("supabase/tests").filter((x) => x.endsWith(".sql")).sort()) {
  const sql = readFileSync(`supabase/tests/${f}`, "utf8");
  // The final select's result is returned; any FAIL aborts with an error. Nothing is kept.
  const wrapped = `begin;\n${sql}\ncreate temp table _result as select 'PASSED'::text as r;\nselect r from _result;\nrollback;`;
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: wrapped }),
  });
  const body = await res.text();
  const ok = res.ok && body.includes("PASSED");
  console.log(`${ok ? "ok  " : "FAIL"} ${f}${ok ? "" : `\n${body}`}`);
  failed ||= !ok;
}
process.exit(failed ? 1 : 0);
