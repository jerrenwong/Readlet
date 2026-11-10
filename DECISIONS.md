# Decisions

Choices made where the spec was open or needed adjusting. Newest first.

| Date | Decision | Why |
| --- | --- | --- |
| 2026-11-10 | App name is **Readlet** (repo `jerrenwong/Readlet`), replacing the spec's `reading-app` placeholder. The cat's name is still open. | The owner created the repo under this name. |
| 2026-11-10 | Added two text-only tokens: `accent-text` #197E70 (links) and `danger-text` #DC2114 (error text). `accent` and `danger` stay for fills, icons and checkmarks. Active tab text uses `primary-edge`. | As text, `accent` is 3.1–3.3:1 and `danger` 3.4:1, below WCAG AA's 4.5:1; `primary` on white is 3.1:1, fine for 18px/800 labels but not small tab text. Checked in `tests/unit/contrast.test.ts`. |
| 2026-11-10 | Development uses the hosted Supabase project; migrations are applied with the Supabase CLI/API. `supabase start` (Docker) runs in CI and on any machine with Docker for RLS tests. | The build machine has no Docker. |
| 2026-11-10 | Work lands on phase branches (`phase-0`, …); `main` is merged by the owner after review. Vercel gives each branch a preview URL. | Spec: stop for review after each phase. |
| 2026-11-10 | Open questions use the spec defaults: leaderboard = entries capped at 3/day; new friends see full history; avatars = 8 cat colorways. | Spec "current default". |
