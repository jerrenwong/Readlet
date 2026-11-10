"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "@/lib/session/SessionProvider";

/** Pages for signed-out visitors; signed-in users go to Today. */
export function PublicPage({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (status === "ready") router.replace("/today");
  }, [status, router]);
  return <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-4 py-8">{children}</main>;
}
