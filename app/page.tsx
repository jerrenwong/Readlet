import { Button } from "@/components/Button";
import { StreakFlame } from "@/components/StreakFlame";
import { WeekStrip } from "@/components/WeekStrip";

// Phase 0 placeholder of the Today screen: static data, no accounts yet.
export default function TodayPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col gap-5 px-4 pt-8 pb-28">
      <header className="flex items-center gap-4 rounded-[var(--radius-card)] bg-surface p-5 shadow-sm">
        <StreakFlame lit={false} />
        <div>
          <p className="num text-4xl leading-none">0</p>
          <p className="text-text-muted">day streak</p>
        </div>
      </header>

      <section className="rounded-[var(--radius-card)] bg-surface p-4 shadow-sm">
        <WeekStrip done={[false, false, false, false, false, false, false]} />
      </section>

      <section className="rounded-[var(--radius-card)] bg-surface p-5 text-center shadow-sm">
        <h1 className="text-xl">Today</h1>
        <p className="mt-1 text-text-muted">Nothing logged yet. Your first read starts the streak.</p>
      </section>

      <Button disabled className="w-full" title="Coming in Phase 2">
        Log a read
      </Button>
      <p className="text-center text-sm text-text-muted">Readlet is being built. Accounts arrive in Phase 1.</p>

      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 border-t border-flame-off bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto grid max-w-[640px] grid-cols-4 text-center text-sm">
          {["Today", "Feed", "Leaderboard", "Me"].map((s) => (
            <li key={s}>
              <span
                className={`flex min-h-14 items-center justify-center ${s === "Today" ? "font-extrabold text-primary-edge" : "text-text-muted"}`}
                aria-current={s === "Today" ? "page" : undefined}
              >
                {s}
              </span>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
