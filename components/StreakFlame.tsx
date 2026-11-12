"use client";

import { motion } from "motion/react";
import { colors } from "@/lib/theme/tokens";

export const FLAME_PATH = "M32 4c4 10 16 16 16 32a16 16 0 0 1-32 0c0-8 4-13 8-17 0 6 3 9 6 10-2-9 0-18 2-25z";

/** Streak flame. Lit = teal with a cream core, unlit = flame-off; grows and lights up (~400 ms) when it turns on. */
export function StreakFlame({ lit, size = 56 }: { lit: boolean; size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      initial={false}
      animate={lit ? { scale: [1, 1.35, 1] } : { scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <motion.path
        d={FLAME_PATH}
        initial={false}
        animate={{ fill: lit ? colors.flame : colors.flameOff }}
        transition={{ duration: 0.4 }}
      />
      <path
        d="M32 34c3 4 7 6 7 12a7 7 0 0 1-14 0c0-4 3-7 7-12z"
        fill={lit ? colors.background : "#FFFFFF"}
        opacity={lit ? 1 : 0.7}
      />
    </motion.svg>
  );
}

/** A small flame + number, for cards and rows. */
export function StreakBadge({ n, lit = n > 0 }: { n: number; lit?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 bg-background px-2 py-0.5 font-display text-lg leading-6 font-bold"
      aria-label={`${n} day streak`}
    >
      <svg width="14" height="14" viewBox="0 0 64 64" aria-hidden="true">
        <path d={FLAME_PATH} fill={lit ? colors.flame : colors.flameOff} />
      </svg>
      {n}
    </span>
  );
}
