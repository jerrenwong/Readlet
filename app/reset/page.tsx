"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PublicShell } from "@/components/Brand";
import { Button } from "@/components/Button";
import { Field, Input, Spinner } from "@/components/ui";
import { FriendlyError, setPassword } from "@/lib/session/auth";
import { useSession } from "@/lib/session/SessionProvider";

/** Landing page of the reset email: Supabase signs the user in from the link, then they set a new password. */
export default function ResetPage() {
  const session = useSession();
  const router = useRouter();
  const [password, setPw] = useState("");
  const [state, setState] = useState<{ busy?: boolean; error?: string }>({});

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState({ busy: true });
    try {
      await setPassword(password);
      router.replace("/today");
    } catch (err) {
      setState({ error: err instanceof FriendlyError ? err.message : "Min. 10 characters" });
    }
  }

  return (
    <PublicShell>
      <h1 className="mb-6 text-5xl text-flame">New password</h1>
      {session.status === "loading" ? (
        <Spinner />
      ) : session.status === "signedOut" ? (
        <p role="alert">Link expired. Request a new one.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
          <Field label="New password" error={state.error} hint="10–72 characters">
            <Input type="password" value={password} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          </Field>
          <Button type="submit" disabled={state.busy}>
            Save
          </Button>
        </form>
      )}
    </PublicShell>
  );
}
