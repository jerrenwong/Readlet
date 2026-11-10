import Link from "next/link";
import { ButtonLink } from "@/components/Button";
import { Cat } from "@/components/Cat";
import { PublicPage } from "@/components/PublicPage";
import { LockIcon } from "@/components/ui";

export default function Welcome() {
  return (
    <PublicPage>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <Cat state="waving" size={220} />
        <div>
          <h1 className="text-4xl text-primary-edge">Readlet</h1>
          <p className="mt-2 text-lg">Read a little every day, keep your streak, and see what your friends are reading.</p>
        </div>
        <ButtonLink href="/signup" className="w-full max-w-xs text-xl">
          Start reading
        </ButtonLink>
        <Link href="/signin" className="min-h-11 font-extrabold text-accent-text underline underline-offset-4">
          I already have an account
        </Link>
      </div>
      <p className="mt-6 text-center text-xs text-text-muted">
        <LockIcon /> What you read is encrypted on your device. Only you and your friends can see it.
      </p>
    </PublicPage>
  );
}
