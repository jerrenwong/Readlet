"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AvatarPicker } from "@/components/AvatarPicker";
import { Button } from "@/components/Button";
import { PublicPage } from "@/components/PublicPage";
import { Field, Input } from "@/components/ui";
import { DEFAULT_AVATAR } from "@/lib/avatars";
import { displayNameSchema, FriendlyError, isUsernameAvailable, passwordSchema, signUp, usernameSchema } from "@/lib/session/auth";
import { useSession } from "@/lib/session/SessionProvider";

type Errors = Partial<Record<"username" | "displayName" | "password" | "form", string>>;

export default function SignUpPage() {
  const router = useRouter();
  const { reload } = useSession();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatar, setAvatar] = useState<string>(DEFAULT_AVATAR);
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  async function checkUsername() {
    const u = usernameSchema.safeParse(username);
    if (!u.success) return;
    try {
      if (!(await isUsernameAvailable(u.data))) setErrors((e) => ({ ...e, username: "That username is taken." }));
    } catch {}
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    const u = usernameSchema.safeParse(username);
    if (!u.success) next.username = u.error.issues[0].message;
    const d = displayNameSchema.safeParse(displayName);
    if (!d.success) next.displayName = d.error.issues[0].message;
    if (!passwordSchema.safeParse(password).success) next.password = "At least 10 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await signUp({ username, displayName, avatar, password });
      await reload();
      router.replace("/today");
    } catch (err) {
      setErrors({
        form:
          err instanceof FriendlyError
            ? err.message
            : "Couldn't create your account. Check your connection and try again.",
      });
      setBusy(false);
    }
  }

  return (
    <PublicPage>
      <Link href="/welcome" className="mb-4 min-h-11 self-start font-extrabold text-text-muted">
        ← Back
      </Link>
      <h1 className="mb-6 text-3xl">Make your account</h1>
      <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
        <Field label="Username" error={errors.username} hint="3–20 lowercase letters, digits or _. Friends find you by it.">
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
        <AvatarPicker value={avatar} onChange={setAvatar} />
        <Field label="Password" error={errors.password} hint="At least 10 characters. A long passphrase is safest.">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        <p className="rounded-2xl bg-primary/10 px-4 py-3 text-sm">
          <strong className="font-extrabold">Keep your password safe.</strong> It protects your encryption key, so a
          forgotten password can&apos;t be reset.
        </p>
        {errors.form && (
          <p className="text-danger-text" role="alert">
            {errors.form}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? "Creating your keys…" : "Create account"}
        </Button>
      </form>
    </PublicPage>
  );
}
