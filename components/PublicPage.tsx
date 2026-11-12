"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useSession } from "@/lib/session/SessionProvider";
import { PublicShell } from "./Brand";

/** Pages for signed-out visitors; signed-in users go to Today. */
export function PublicPage({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (status === "ready") router.replace("/today");
  }, [status, router]);
  return <PublicShell>{children}</PublicShell>;
}
