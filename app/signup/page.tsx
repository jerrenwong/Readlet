"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { PublicPage } from "@/components/PublicPage";
import { Field, Input } from "@/components/ui";
import {
  displayNameSchema,
  emailSchema,
  FriendlyError,
  isUsernameAvailable,
  passwordError,
  signUp,
  usernameSchema,
} from "@/lib/session/auth";
import { useSession } from "@/lib/session/SessionProvider";

type Errors = Partial<Record<"email" | "username" | "displayName" | "password" | "form", string>>;

export default function SignUpPage() {
  const router = useRouter();
  const { reload } = useSession();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  async function checkUsername() {
    const u = usernameSchema.safeParse(username);
    if (!u.success) return;
    try {
      if (!(await isUsernameAvailable(u.data))) setErrors((e) => ({ ...e, username: "Username taken." }));
    } catch {}
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!emailSchema.safeParse(email).success) next.email = "Invalid email";
    const u = usernameSchema.safeParse(username);
    if (!u.success) next.username = u.error.issues[0].message;
    const d = displayNameSchema.safeParse(displayName);
    if (!d.success) next.displayName = d.error.issues[0].message;
    const pwError = passwordError(password);
    if (pwError) next.password = pwError;
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await signUp({ email, username, displayName, password });
      await reload();
      router.replace("/today");
    } catch (err) {
      setErrors({
        form:
          err instanceof FriendlyError
            ? err.message
            : "Sign-up failed.",
      });
      setBusy(false);
    }
  }

  return (
    <PublicPage>
      <Link href="/welcome" className="mb-4 min-h-11 self-start font-extrabold text-text-muted">
        ← Back
      </Link>
      <h1 className="mb-6 text-3xl">Sign up</h1>
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <Field label="Email" error={errors.email}>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
        </Field>
        <Field label="Username" error={errors.username} hint="3–20 characters: a–z, 0–9, _">
          <Input
            value={username}
            onChange={(e) => {
              setUsername(e.target.value.toLowerCase());
              setErrors((x) => ({ ...x, username: undefined }));
            }}
            onBlur={checkUsername}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
            maxLength={20}
          />
        </Field>
        <Field label="Display name" error={errors.displayName}>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={40} autoComplete="nickname" />
        </Field>
        <Field label="Password" error={errors.password} hint="10–72 characters">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        {errors.form && (
          <p className="text-danger-text" role="alert">
            {errors.form}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </Button>
      </form>
    </PublicPage>
  );
}
