"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { confettiBurst, MilestoneCard } from "@/components/Celebrate";
import { EntryCard } from "@/components/EntryCard";
import { InstallHint } from "@/components/InstallHint";
import { PendingInvite } from "@/components/InviteCard";
import { LogSheet } from "@/components/LogSheet";
import { StreakFlame } from "@/components/StreakFlame";
import { Card, Spinner } from "@/components/ui";
import { WeekStrip } from "@/components/WeekStrip";
import { useUserEntries, type Entry } from "@/lib/data/hooks";
import { useReady } from "@/lib/session/SessionProvider";
import { computeStreak, isMilestone, localDate } from "@/lib/streaks";

function useToday(timeZone: string) {
  const [today, setToday] = useState(() => localDate(timeZone));
  useEffect(() => {
    const tick = () => setToday(localDate(timeZone));
    const id = setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [timeZone]);
  return today;
}

export default function TodayPage() {
  const { userId, profile } = useReady();
  const today = useToday(profile.timezone);
  const { entries, isLoading } = useUserEntries(userId);
  const [sheet, setSheet] = useState<{ open: boolean; editing: Entry | null }>({ open: false, editing: null });
  const [milestone, setMilestone] = useState<number | null>(null);

  const days = useMemo(() => new Set(entries?.map((e) => e.log_date)), [entries]);
  const streak = computeStreak(days, today);
  const todays = entries?.filter((e) => e.log_date === today) ?? [];


  const line = streak.atRisk ? "Log today to keep it." : null;

  function onSaved(created: boolean) {
    if (!created || streak.today) return;
    const next = computeStreak([...days, today], today).current;
    void confettiBurst();
    if (isMilestone(next)) setTimeout(() => setMilestone(next), 900);
  }

  if (isLoading) return <Spinner />;

  return (
    <div className="flex flex-col gap-5">
      <InstallHint />
      <PendingInvite />

      <Card className="!pb-4">
        <div className="flex items-center gap-3">
          <StreakFlame lit={streak.today} size={60} />
          <div className="flex flex-1 items-baseline gap-2 whitespace-nowrap">
            <span className="relative inline-block h-14 overflow-hidden" aria-live="polite">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={streak.current}
                  className="num block text-6xl leading-[3.5rem]"
                  initial={{ y: "100%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: "-100%", opacity: 0 }}
                  transition={{ type: "spring", damping: 18, stiffness: 260 }}
                >
                  {streak.current}
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="text-lg text-text-muted">day streak</span>
          </div>
        </div>
        {line && <p className="mt-2 text-lg font-extrabold">{line}</p>}
      </Card>

      <Card className="!p-4">
        <WeekStrip days={days} today={today} />
      </Card>

      <Button className="w-full text-xl" onClick={() => setSheet({ open: true, editing: null })}>
        + Log a read
      </Button>

      <h1 className="sr-only">Today</h1>
      <section aria-label="Today's reads" className="flex flex-col gap-3">
        {todays.map((e) => (
          <EntryCard key={e.id} entry={e} onEdit={() => setSheet({ open: true, editing: e })} />
        ))}
      </section>


      <LogSheet
        open={sheet.open}
        editing={sheet.editing}
        onClose={() => setSheet({ open: false, editing: sheet.editing })}
        onSaved={onSaved}
      />
      <MilestoneCard days={milestone} onClose={() => setMilestone(null)} />
    </div>
  );
}
