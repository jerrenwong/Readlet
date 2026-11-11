"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Field, Input } from "@/components/ui";
import { FriendlyError, sendPasswordReset } from "@/lib/session/auth";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ busy?: boolean; sent?: boolean; error?: string }>({});

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState({ busy: true });
    try {
      await sendPasswordReset(email);
      setState({ sent: true });
    } catch (err) {
      setState({ error: err instanceof FriendlyError ? err.message : "Invalid email" });
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-4 py-8">
      <Link href="/signin" className="mb-4 min-h-11 self-start font-extrabold text-text-muted">
        ← Back
      </Link>
      <h1 className="mb-6 text-3xl">Reset password</h1>
      {state.sent ? (
        <p role="status">Check your email for a reset link.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
          <Field label="Email" error={state.error}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
          </Field>
          <Button type="submit" disabled={state.busy}>
            Send link
          </Button>
        </form>
      )}
    </main>
  );
}
