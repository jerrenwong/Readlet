"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useRequests } from "@/lib/data/hooks";
import { useSession } from "@/lib/session/SessionProvider";
import { Spinner } from "./ui";
import { Avatar } from "./Avatar";
import { useReady } from "@/lib/session/SessionProvider";

const TABS = [
  { href: "/today", label: "Today", icon: "M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.6 7.1 18.2 8 12.7 4 8.8l5.5-.8z" },
  { href: "/feed", label: "Feed", icon: "M4 5h16v4H4zM4 11h16v4H4zM4 17h10v2H4z" },
  { href: "/leaderboard", label: "Leaderboard", icon: "M4 20V11h4v9zM10 20V5h4v15zM16 20v-6h4v6z" },
  {
    href: "/friends",
    label: "Friends",
    icon: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm7.5 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3.5 3.2-5.5 7-5.5s7 2 7 5.5zm15.5 0c0-1.9-.7-3.5-1.9-4.7 3.2.1 6.4 1.7 6.4 4.7z",
  },
];

function isActive(path: string, href: string) {
  if (href === "/friends") return ["/friends", "/u/"].some((p) => path.startsWith(p));
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
  const requests = useRequests();
  const pending = requests.data?.some((r) => r.incoming) ?? false;

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
              {t.href === "/friends" && pending && (
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
    <div className="min-h-dvh lg:grid lg:grid-cols-[12rem_minmax(0,640px)_12rem] lg:justify-center lg:gap-8 lg:px-6 xl:grid-cols-[15rem_minmax(0,640px)_15rem] xl:gap-10">
      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-flame-off bg-surface pb-[env(safe-area-inset-bottom)] lg:sticky lg:top-0 lg:h-dvh lg:border-t-0 lg:bg-transparent lg:pt-8 lg:pb-0"
      >
        <Link href="/today" className="mb-6 hidden h-10 items-center px-4 text-2xl font-extrabold text-primary-edge lg:flex">
          Readlet
        </Link>
        <div className="mx-auto max-w-[640px] lg:max-w-none">{nav}</div>
      </nav>
      <main className="mx-auto w-full max-w-[640px] px-4 pt-4 pb-28 lg:px-0 lg:pt-8 lg:pb-12">
        <div className="mb-2 flex h-10 items-center justify-between lg:mb-4">
          <Link href="/today" className="text-xl font-extrabold text-primary-edge lg:invisible">
            Readlet
          </Link>
          <MeLink />
        </div>
        {children}
      </main>
      {/* Empty right column of the same width as the sidebar keeps the content centered. */}
      <div className="hidden lg:block" aria-hidden="true" />
    </div>
  );
}

function MeLink() {
  const { profile } = useReady();
  const path = usePathname();
  const active = path.startsWith("/me") || path.startsWith("/settings");
  return (
    <Link
      href="/me"
      aria-label="Me"
      aria-current={active ? "page" : undefined}
      className={`rounded-full ${active ? "ring-3 ring-primary ring-offset-2 ring-offset-background" : ""}`}
    >
      <Avatar name={profile.display_name} color={profile.color} size={40} />
    </Link>
  );
}
