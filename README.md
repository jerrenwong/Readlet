# Readlet

A small, private reading-streak app for friends: log what you read each day, keep a strict daily streak,
see your friends' reads and a weekly leaderboard. Titles, links and notes are end-to-end encrypted in the
browser with libsodium; the database only stores ciphertext. Next.js 16 + Supabase, deployed on Vercel.

See `DECISIONS.md` for choices made where the spec was open.

## Run it locally

Needs Node 22+.

```bash
npm install
cp .env.example .env.local   # Supabase URL + anon key
npm run dev                  # http://localhost:3000
```

## Database

Migrations live in `supabase/migrations/` (RLS is enabled in the same migration as each table).

```bash
# apply new migrations to the hosted project (needs SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF)
npm run db:push
# run the RLS tests against it, inside a transaction that is rolled back
npm run test:sql
```

With Docker and the Supabase CLI you can instead run `supabase start`, which applies the migrations locally.

## Tests

```bash
npm run lint && npm run typecheck && npm test   # unit: crypto, key sync, streaks, contrast
npm run test:e2e                                # Playwright, against local Supabase (CI does this)
```

CI (`.github/workflows/ci.yml`) runs lint, types, unit tests and a build on every push, and a second job
that starts local Supabase, runs the RLS tests and the Playwright flow.

## Deploy

Vercel builds every branch (preview URL) and `main` (production). Set `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` in the Vercel project. The app never uses the service role key.

## Layout

```
app/                 routes: welcome, signup, signin, invite/[username], (app)/today|feed|leaderboard|me|friends|settings|u/[username]
components/          Button, Sheet, LogSheet, EntryCard, StreakFlame, WeekStrip, Calendar, Cat, AppShell, …
lib/crypto/          keys, entry encryption, key-sync planner (pure functions + tests)
lib/session/         sign-up/in, password change, device key store, session provider
lib/data/            queries and mutations (TanStack Query), key sync I/O
lib/streaks/         client copies of the streak and leaderboard rules
supabase/migrations/ schema, RLS policies, SQL functions
supabase/tests/      RLS tests (SQL)
tests/               unit (Vitest), e2e (Playwright)
```
