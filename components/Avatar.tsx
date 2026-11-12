/** First letter of the display name on orange (white on #B9520F is 4.9:1). */
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const letter = (name.trim().match(/\p{L}|\p{N}/u)?.[0] ?? "?").toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 select-none items-center justify-center rounded-full bg-primary-edge font-extrabold text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
    >
      {letter}
    </span>
  );
}
