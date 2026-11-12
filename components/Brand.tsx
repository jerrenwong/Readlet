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

/** Layout for signed-out pages: the AIST wordmark on top, a narrow column below. */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-4 pt-6 pb-8">
      <header className="mb-8 flex items-center">
        {/* Wordmark is 640×315; clear space around it is at least the hourglass width. */}
        <Image src="/brand/aist-wordmark-teal.png" alt="AI Safety Team" width={61} height={30} loading="eager" />
      </header>
      {children}
    </main>
  );
}
