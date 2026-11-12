"use client";

import { AnimatePresence, motion } from "motion/react";
import { Button } from "./Button";

export async function confettiBurst() {
  const { default: confetti } = await import("canvas-confetti");
  confetti({
    particleCount: 90,
    spread: 75,
    startVelocity: 38,
    origin: { y: 0.35 },
    colors: ["#0F89AB", "#0C6D88", "#0C264D", "#FFFFFF"],
    disableForReducedMotion: true,
  });
}

/** Full-screen milestone card. */
export function MilestoneCard({ days, onClose }: { days: number | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {days !== null && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background p-6 text-center"
          role="dialog"
          aria-modal="true"
          aria-label={`${days} day streak`}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
        >
          <p className="num text-9xl text-flame">{days}</p>
          <h2 className="text-4xl">day streak</h2>
          <Button onClick={onClose} className="mt-2 w-full max-w-xs" autoFocus>
            Continue
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
