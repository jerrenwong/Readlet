"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useKeySync, useRequests } from "@/lib/data/hooks";
import { useSession } from "@/lib/session/SessionProvider";
import { Spinner } from "./ui";
import { SideColumn } from "./SideColumn";

const TABS = [
  { href: "/today", label: "Today", icon: "M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.6 7.1 18.2 8 12.7 4 8.8l5.5-.8z" },
  { href: "/feed", label: "Feed", icon: "M4 5h16v4H4zM4 11h16v4H4zM4 17h10v2H4z" },
  { href: "/leaderboard", label: "Leaderboard", icon: "M4 20V11h4v9zM10 20V5h4v15zM16 20v-6h4v6z" },
  { href: "/me", label: "Me", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 8c0-4 4-6 8-6s8 2 8 6z" },
];

function isActive(path: string, href: string) {
  if (href === "/me") return ["/me", "/friends", "/settings"].some((p) => path.startsWith(p));
  return path.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const session = useSession();
  const router = useRouter();
  useEffect(() => {
    if (session.status === "signedOut") router.replace("/welcome");
  }, [session.status, router]);
  if (session.status !== "ready") return <Spinner label="Unlocking" />;
  return <Shell>{children}</Shell>;
}

function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  useKeySync();
  const requests = useRequests();
  const pending = requests.data?.some((r) => r.incoming) ?? false;
  const wide = path.startsWith("/today") || path.startsWith("/feed");

  const nav = (
    <ul className="grid grid-cols-4 lg:flex lg:flex-col lg:gap-1">
      {TABS.map((t) => {
        const active = isActive(path, t.href);
        return (
          <li key={t.href}>
            <Link
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-2xl lg:px-4 lg:text-base ${
                active ? "font-extrabold text-primary-edge lg:bg-surface lg:shadow-sm" : "text-text-muted hover:text-text"
              }`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" className="fill-current">
                <path d={t.icon} />
              </svg>
              {t.label}
              {t.href === "/me" && pending && (
                <span
                  className="absolute top-2 right-[calc(50%-18px)] size-2.5 rounded-full bg-danger lg:static lg:ml-auto"
                  aria-label="Pending friend requests"
                />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[1200px] lg:gap-8 lg:px-6">
      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-flame-off bg-surface pb-[env(safe-area-inset-bottom)] lg:sticky lg:top-0 lg:h-dvh lg:w-56 lg:shrink-0 lg:border-t-0 lg:bg-transparent lg:pt-8 lg:pb-0"
      >
        <Link href="/today" className="mb-6 hidden items-center gap-2 px-4 text-2xl font-extrabold text-primary-edge lg:flex">
          Readlet
        </Link>
        <div className="mx-auto max-w-[640px] lg:max-w-none">{nav}</div>
      </nav>
      <main className="mx-auto w-full max-w-[640px] flex-1 px-4 pt-6 pb-28 lg:mx-0 lg:pt-8 lg:pb-12">{children}</main>
      {wide && (
        <aside className="hidden w-72 shrink-0 pt-8 lg:block" aria-label="Friends this week">
          <SideColumn />
        </aside>
      )}
    </div>
  );
}
