"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Spinner } from "@/components/ui";
import { useSession } from "@/lib/session/SessionProvider";

export default function Home() {
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (status === "ready") router.replace("/today");
    if (status === "signedOut") router.replace("/welcome");
  }, [status, router]);
  return <Spinner />;
}
