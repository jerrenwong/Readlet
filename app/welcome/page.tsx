import Link from "next/link";
import { Art } from "@/components/Brand";
import { ButtonLink } from "@/components/Button";
import { PublicPage } from "@/components/PublicPage";

export default function Welcome() {
  return (
    <PublicPage>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 pb-12 text-center">
        <Art name="reading" height={176} hero />
        <div>
          <h1 className="text-7xl text-flame">Readlet</h1>
          <p className="mt-3 text-lg">Daily reading streaks with friends.</p>
        </div>
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
    </PublicPage>
  );
}
