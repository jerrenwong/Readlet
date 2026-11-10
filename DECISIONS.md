# Decisions

Choices made where the spec was open or needed adjusting. Newest first.

| Date | Decision | Why |
| --- | --- | --- |
| 2026-11-10 | No profile pictures and no cat mascot. `profiles.avatar` is now nullable and unused (drop later). App icon is the streak flame. | Owner's request. |
| 2026-11-10 | UI copy kept minimal: no taglines, reassurance or hints that restate labels. | Owner's request. |
| 2026-11-10 | Placeholder login email is `<login_id>@readlet.invalid`. | `.invalid` is reserved and can never receive mail; Supabase accepted it in a sign-up test. |
| 2026-11-10 | `libsodium-wrappers-sumo` is used (the standard build lacks `crypto_pwhash`). | Spec allows sumo when pwhash is missing. |
| 2026-11-10 | The secret key is locked with XChaCha20-Poly1305 (random nonce, fixed additional data); KDF contexts are `rl_ident` (identity seed) and `rl_passw` (subkey 1 = login key, 2 = wrap key). | Spec names the derivations but not the wrap cipher; this reuses the spec's AEAD. |
| 2026-11-10 | Sign-up writes `profiles` + `accounts` through one SQL function, `create_account`, which also checks that `login_id` matches the signed-in placeholder email. | One transaction, so no half-created accounts. |
| 2026-11-10 | Column privileges limit updates: profiles (username, display name, avatar, timezone), accounts (password fields), friendships (status), entries (ciphertext, nonce, key version). | Enforces "log_date unchanged" and keeps `public_key` and `requested_by` immutable. |
| 2026-11-10 | The 20-requests-per-day limit counts a private log (`private.friend_request_log`, not exposed by the API), not current rows. | Otherwise cancelling requests would reset the count. |
| 2026-11-10 | Extra SQL function `friends_with_stats()` (friends with current streak and logged-today). | One call for the friends list and side column instead of one `user_stats` per friend. |
| 2026-11-10 | Milestones after 365 are every multiple of 100 (400, 500, …). | "Then every 100 days" was ambiguous. |
| 2026-11-10 | Settings also lets you edit username, display name and avatar. | Spec says the username can be changed in Settings. |
| 2026-11-10 | Password change: verify the current password by unlocking the key, set the new Supabase password, then save the re-locked key. If the last step fails (network drop), the new password can't unlock; the fix is to retry the change with the old password as "current" — accepted risk for v1. | Supabase has no transaction spanning auth and table updates. |
| 2026-11-10 | Hand-written service worker (`public/sw.js`) instead of Serwist. | Next 16 builds with Turbopack; a ~40-line worker avoids a webpack-only dependency. Caches the app shell only. |
| 2026-11-10 | No Supabase CLI devDependency; migrations are pushed with `npm run db:push` (Management API) and CI installs the CLI with `supabase/setup-cli`. | Saves 170 MB and the build machine has no Docker. |
| 2026-11-10 | Delete buttons use `danger-text` (#DC2114) as the fill. | White on `danger` is 3.4:1; on `danger-text` it is 4.9:1. |
| 2026-11-10 | App name is **Readlet** (repo `jerrenwong/Readlet`), replacing the spec's `reading-app` placeholder. The cat's name is still open. | The owner created the repo under this name. |
| 2026-11-10 | Added two text-only tokens: `accent-text` #197E70 (links) and `danger-text` #DC2114 (error text). `accent` and `danger` stay for fills, icons and checkmarks. Active tab text uses `primary-edge`. | As text, `accent` is 3.1–3.3:1 and `danger` 3.4:1, below WCAG AA's 4.5:1; `primary` on white is 3.1:1, fine for 18px/800 labels but not small tab text. Checked in `tests/unit/contrast.test.ts`. |
| 2026-11-10 | Development uses the hosted Supabase project; migrations are applied with the Supabase CLI/API. `supabase start` (Docker) runs in CI and on any machine with Docker for RLS tests. | The build machine has no Docker. |
| 2026-11-10 | Work lands on phase branches (`phase-0`, …); `main` is merged by the owner after review. Vercel gives each branch a preview URL. | Spec: stop for review after each phase. |
| 2026-11-10 | Open questions use the spec defaults: leaderboard = entries capped at 3/day; new friends see full history; avatars = 8 cat colorways. | Spec "current default". |
