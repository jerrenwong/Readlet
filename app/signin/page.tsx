"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { PublicPage } from "@/components/PublicPage";
import { Field, Input } from "@/components/ui";
import { FriendlyError, signIn } from "@/lib/session/auth";
import { useSession } from "@/lib/session/SessionProvider";

export default function SignInPage() {
  const router = useRouter();
  const { reload } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return setError("Enter email and password.");
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      await reload();
      router.replace("/today");
    } catch (err) {
      setError(err instanceof FriendlyError ? err.message : "Sign-in failed.");
      setBusy(false);
    }
  }

  return (
    <PublicPage>
      <Link href="/welcome" className="mb-4 min-h-11 self-start font-extrabold text-text-muted">
        ← Back
      </Link>
      <h1 className="mb-6 text-3xl">Sign in</h1>
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
        </Field>
        <Field label="Password">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </Field>
        {error && (
          <p className="rounded-2xl bg-danger/10 px-4 py-3 text-danger-text" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
        <Link href="/forgot" className="min-h-11 self-center font-extrabold text-accent-text">
          Forgot password?
        </Link>
      </form>
    </PublicPage>
  );
}
