"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { PublicShell } from "@/components/Brand";
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
    <PublicShell>
      <Link href="/signin" className="mb-4 inline-flex min-h-11 items-center self-start font-semibold text-text-muted hover:text-text">
        ← Back
      </Link>
      <h1 className="mb-6 text-5xl text-flame">Reset password</h1>
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
    </PublicShell>
  );
}
