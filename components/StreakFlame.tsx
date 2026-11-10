/** Placeholder flame (Phase 0). Lit = flame token, unlit = flame-off. */
export function StreakFlame({ lit, size = 56 }: { lit: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path
        d="M32 4c4 10 16 16 16 32a16 16 0 0 1-32 0c0-8 4-13 8-17 0 6 3 9 6 10-2-9 0-18 2-25z"
        className={lit ? "fill-flame" : "fill-flame-off"}
      />
      <path d="M32 34c3 4 7 6 7 12a7 7 0 0 1-14 0c0-4 3-7 7-12z" className="fill-white/70" />
    </svg>
  );
}
