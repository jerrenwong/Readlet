"use client";

import { AnimatePresence, motion } from "motion/react";
import { Button } from "./Button";
import { Cat } from "./Cat";

export async function confettiBurst() {
  const { default: confetti } = await import("canvas-confetti");
  confetti({
    particleCount: 90,
    spread: 75,
    startVelocity: 38,
    origin: { y: 0.35 },
    colors: ["#E8701F", "#FF6B2C", "#1F9E8C", "#FFD27A", "#FFFFFF"],
    disableForReducedMotion: true,
  });
}

/** Full-screen milestone card. */
export function MilestoneCard({ days, avatar, onClose }: { days: number | null; avatar: string; onClose: () => void }) {
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
          <Cat state="celebrating" avatar={avatar} size={200} />
          <p className="num text-7xl text-primary-edge">{days}</p>
          <h2 className="text-2xl">days in a row!</h2>
          <p className="max-w-xs text-text-muted">That&apos;s a real habit. Keep the pages turning.</p>
          <Button onClick={onClose} className="mt-2 w-full max-w-xs" autoFocus>
            Continue
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
