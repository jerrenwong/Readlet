"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ButtonLink } from "@/components/Button";
import { Cat } from "@/components/Cat";
import { INVITE_KEY } from "@/components/InviteCard";
import { Spinner } from "@/components/ui";
import { useSession } from "@/lib/session/SessionProvider";

/** /invite/<username>: remembers the inviter, then Today shows their card with "Send friend request". */
export function InvitePage() {
  const { username } = useParams<{ username: string }>();
  const { status } = useSession();
  const router = useRouter();
  const name = decodeURIComponent(username).toLowerCase();

  useEffect(() => {
    try {
      localStorage.setItem(INVITE_KEY, name);
    } catch {}
    if (status === "ready") router.replace("/today");
  }, [name, status, router]);

  if (status !== "signedOut") return <Spinner />;
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center gap-5 px-4 text-center">
      <Cat state="waving" size={180} />
      <h1 className="text-3xl">
        <span className="text-primary-edge">@{name}</span> invited you to Readlet
      </h1>
      <p className="text-lg">Log what you read each day, keep a streak, and see each other&apos;s reads.</p>
      <ButtonLink href="/signup" className="w-full max-w-xs text-xl">
        Start reading
      </ButtonLink>
      <Link href="/signin" className="min-h-11 font-extrabold text-accent-text underline underline-offset-4">
        I already have an account
      </Link>
    </main>
  );
}
