"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Art, PublicShell } from "@/components/Brand";
import { ButtonLink } from "@/components/Button";
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
    <PublicShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 pb-12 text-center">
        <Art name="reading" height={144} hero />
        <h1 className="text-5xl leading-tight">
          <span className="text-flame">@{name}</span> invited you to Readlet
        </h1>
        <ButtonLink href="/signup" className="w-full max-w-xs">
          Start reading
        </ButtonLink>
        <Link
          href="/signin"
          className="inline-flex min-h-11 items-center font-semibold text-accent-text underline decoration-accent/40 decoration-2 underline-offset-4 hover:decoration-accent"
        >
          I already have an account
        </Link>
      </div>
    </PublicShell>
  );
}
