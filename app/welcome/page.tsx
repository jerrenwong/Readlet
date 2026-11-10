import Link from "next/link";
import { ButtonLink } from "@/components/Button";
import { PublicPage } from "@/components/PublicPage";

export default function Welcome() {
  return (
    <PublicPage>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div>
          <h1 className="text-4xl text-primary-edge">Readlet</h1>
          <p className="mt-2 text-lg">Daily reading streaks with friends.</p>
        </div>
        <ButtonLink href="/signup" className="w-full max-w-xs text-xl">
          Start reading
        </ButtonLink>
        <Link href="/signin" className="min-h-11 font-extrabold text-accent-text underline underline-offset-4">
          I already have an account
        </Link>
      </div>
    </PublicPage>
  );
}
