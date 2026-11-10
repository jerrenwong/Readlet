"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Cat } from "@/components/Cat";
import { PublicPage } from "@/components/PublicPage";
import { Field, Input } from "@/components/ui";
import { FriendlyError, signIn } from "@/lib/session/auth";
import { useSession } from "@/lib/session/SessionProvider";

export default function SignInPage() {
  const router = useRouter();
  const { reload } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return setError("Enter your username and password.");
    setBusy(true);
    setError(null);
    try {
      await signIn(username, password);
      await reload();
      router.replace("/today");
    } catch (err) {
      setError(err instanceof FriendlyError ? err.message : "Couldn't sign in. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <PublicPage>
      <Link href="/welcome" className="mb-4 min-h-11 self-start font-extrabold text-text-muted">
        ← Back
      </Link>
      <div className="mb-4 flex items-center gap-3">
        <Cat state="reading" size={80} />
        <h1 className="text-3xl">Welcome back</h1>
      </div>
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <Field label="Username">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
          />
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
          {busy ? "Unlocking…" : "Sign in"}
        </Button>
        <p className="text-center text-sm text-text-muted">Forgotten passwords can&apos;t be reset, because only you hold the key.</p>
      </form>
    </PublicPage>
  );
}
