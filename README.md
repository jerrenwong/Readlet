# Readlet

A small, private reading-streak app for friends: log what you read each day, keep a strict daily streak,
and see your friends' reads. Entries are end-to-end encrypted in the browser. Built with Next.js,
Supabase and libsodium; deployed on Vercel.

Status: **Phase 0 (setup)**. See `DECISIONS.md` for choices made along the way.

## Run it locally

Needs Node 22+.

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL and anon key
npm run dev                  # http://localhost:3000
```

Optional fully-local backend (needs Docker): `npm run db:start` prints a local URL and anon key for `.env.local`.

## Checks

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

CI runs the same on every push.

## Deploy

Import the repo in Vercel and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
`main` deploys to production; other branches get preview URLs.

## Layout

```
app/                 routes
components/          Button, StreakFlame, WeekStrip, …
lib/theme/           color tokens (tested for contrast)
lib/crypto/          (Phase 1) keys and entry encryption
lib/supabase/        (Phase 1) client and queries
supabase/migrations/ schema, RLS, SQL functions
tests/               unit, rls, e2e
```
