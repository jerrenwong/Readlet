"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/Button";
import { Cat, type CatState } from "@/components/Cat";
import { confettiBurst, MilestoneCard } from "@/components/Celebrate";
import { EntryCard } from "@/components/EntryCard";
import { InstallHint } from "@/components/InstallHint";
import { PendingInvite } from "@/components/InviteCard";
import { LogSheet } from "@/components/LogSheet";
import { StreakFlame } from "@/components/StreakFlame";
import { Card, Spinner } from "@/components/ui";
import { WeekStrip } from "@/components/WeekStrip";
import { useFriends, useUserEntries, type Entry } from "@/lib/data/hooks";
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
  const friends = useFriends();
  const [sheet, setSheet] = useState<{ open: boolean; editing: Entry | null }>({ open: false, editing: null });
  const [celebrating, setCelebrating] = useState(false);
  const [milestone, setMilestone] = useState<number | null>(null);

  const days = useMemo(() => new Set(entries?.map((e) => e.log_date)), [entries]);
  const streak = computeStreak(days, today);
  const todays = entries?.filter((e) => e.log_date === today) ?? [];

  const catState: CatState = celebrating
    ? "celebrating"
    : streak.today
      ? "reading"
      : streak.atRisk
        ? "sleepy"
        : days.size > 0
          ? "sad"
          : "waving";

  const line = streak.today
    ? todays.length === 1
      ? `Nice! Day ${streak.current}.`
      : "Your streak is safe for today."
    : streak.atRisk
      ? "Log today to keep it."
      : days.size > 0
        ? "Fresh start! One read gets the flame going again."
        : "Log your first read to start a streak.";

  function onSaved(created: boolean) {
    if (!created || streak.today) return;
    const next = computeStreak([...days, today], today).current;
    setCelebrating(true);
    void confettiBurst();
    setTimeout(() => setCelebrating(false), 2000);
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
          <Cat state={catState} avatar={profile.avatar} size={96} className="-my-4 -mr-2 shrink-0" />
        </div>
        <p className="mt-2 text-lg font-extrabold">{line}</p>
      </Card>

      <Card className="!p-4">
        <WeekStrip days={days} today={today} />
      </Card>

      <Button className="w-full text-xl" onClick={() => setSheet({ open: true, editing: null })}>
        + Log a read
      </Button>

      <section aria-labelledby="today-h" className="flex flex-col gap-3">
        <h1 id="today-h" className="text-xl">
          Today
        </h1>
        {todays.length ? (
          todays.map((e) => <EntryCard key={e.id} entry={e} onEdit={() => setSheet({ open: true, editing: e })} />)
        ) : (
          <p className="text-text-muted">Nothing logged yet today.</p>
        )}
      </section>

      {friends.data && friends.data.length === 0 && (
        <Card className="flex items-center gap-4">
          <Cat state="waving" size={72} />
          <div className="flex-1">
            <p className="font-extrabold">Reading is better with friends.</p>
            <Link href="/friends" className="font-extrabold text-accent-text underline">
              Find friends by username
            </Link>
          </div>
        </Card>
      )}

      <LogSheet
        open={sheet.open}
        editing={sheet.editing}
        onClose={() => setSheet({ open: false, editing: sheet.editing })}
        onSaved={onSaved}
      />
      <MilestoneCard days={milestone} avatar={profile.avatar} onClose={() => setMilestone(null)} />
    </div>
  );
}
