import Image from "next/image";
import type { ReactNode } from "react";

/** AIST cut-paper illustrations (aist.now/graphics), resized for the web. */
const ART = {
  reading: { src: "/art/reading.png", width: 477, height: 480 },
  pouring: { src: "/art/hourglass-pouring.png", width: 198, height: 360 },
  building: { src: "/art/building-together.png", width: 300, height: 360 },
  grains: { src: "/art/pile-of-grains.png", width: 360, height: 339 },
} as const;

export type ArtName = keyof typeof ART;

/** A decorative illustration drawn `height` px tall. Every use is above the fold, so it loads eagerly. */
export function Art({ name, height, className = "", hero }: { name: ArtName; height: number; className?: string; hero?: boolean }) {
  const a = ART[name];
  return (
    <Image
      src={a.src}
      alt=""
      height={height}
      width={Math.round((height * a.width) / a.height)}
      className={`select-none ${className}`}
      style={{ height, width: "auto" }}
      loading="eager"
      fetchPriority={hero ? "high" : undefined}
      draggable={false}
    />
  );
}

/** Empty list: a small illustration above the message. */
export function EmptyState({ art, children }: { art: ArtName; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 border border-flame-off bg-surface px-5 py-8 text-center">
      <Art name={art} height={96} />
      {children}
    </div>
  );
}

// Both logo files are cropped to their ink, so equal heights mean equal letter heights.
// 28px on phones, 32px from 640px, 36px from 1024px.
const LOGO_H = "h-7 w-auto shrink-0 sm:h-8 lg:h-9";

/**
 * Layout for signed-out pages: the AIST × MAIA lockup at the left edge of a full-width header
 * (inside the notch/rounded-corner safe area), then a narrow centered column. Every gap around the
 * AIST wordmark stays above its required clear space, the hourglass width (~0.4× its height).
 */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3.5 pt-[max(1.5rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:gap-4 sm:pl-[max(1.5rem,env(safe-area-inset-left))] lg:gap-5 lg:pl-[max(2rem,env(safe-area-inset-left))]">
        <Image
          src="/brand/aist-wordmark-teal-trim.png"
          alt="AI Safety Team"
          width={616}
          height={293}
          sizes="(min-width: 1024px) 76px, (min-width: 640px) 68px, 59px"
          loading="eager"
          className={LOGO_H}
        />
        <span aria-hidden="true" className="text-base leading-none text-text-muted sm:text-lg lg:text-xl">
          ×
        </span>
        <Image
          src="/brand/maia-light.svg"
          alt="MIT AI Alignment"
          width={611}
          height={175}
          loading="eager"
          unoptimized
          className={LOGO_H}
        />
      </header>
      <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col px-4 pt-8 pb-8">{children}</main>
    </div>
  );
}
