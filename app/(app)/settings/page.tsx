"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Card, Field, Input } from "@/components/ui";
import {
  changeEmail,
  changePassword,
  deleteAccount,
  displayNameSchema,
  FriendlyError,
  usernameSchema,
} from "@/lib/session/auth";
import { useReady } from "@/lib/session/SessionProvider";
import { supabase } from "@/lib/supabase/client";

const msg = (e: unknown) =>
  e instanceof FriendlyError ? e.message : e instanceof Error ? e.message : "Failed.";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl">Settings</h1>
      <ProfileForm />
      <EmailForm />
      <PasswordForm />
      <Danger />
    </div>
  );
}

function ProfileForm() {
  const { profile, setProfile } = useReady();
  const [username, setUsername] = useState(profile.username);
  const [name, setName] = useState(profile.display_name);
  const [state, setState] = useState<{ busy?: boolean; error?: string; ok?: boolean }>({});

  async function save(e: FormEvent) {
    e.preventDefault();
    const u = usernameSchema.safeParse(username);
    const n = displayNameSchema.safeParse(name);
    if (!u.success || !n.success) {
      setState({ error: (!u.success ? u.error.issues[0].message : n.error!.issues[0].message) as string });
      return;
    }
    setState({ busy: true });
    const { error } = await supabase()
      .from("profiles")
      .update({ username: u.data, display_name: n.data })
      .eq("id", profile.id);
    if (error) {
      setState({ error: error.code === "23505" ? "Username taken." : error.message });
      return;
    }
    setProfile({ ...profile, username: u.data, display_name: n.data });
    setState({ ok: true });
  }

  return (
    <Card>
      <form onSubmit={save} className="flex flex-col gap-4">
        <h2 className="text-lg">Profile</h2>
        <Field label="Username">
          <Input value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" spellCheck={false} />
        </Field>
        <Field label="Display name">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </Field>
        {state.error && <p className="text-danger-text" role="alert">{state.error}</p>}
        {state.ok && <p className="text-accent-text" role="status">Saved</p>}
        <Button type="submit" disabled={state.busy}>
          Save profile
        </Button>
      </form>
    </Card>
  );
}

function EmailForm() {
  const { email } = useReady();
  const [value, setValue] = useState(email);
  const [state, setState] = useState<{ busy?: boolean; error?: string; ok?: boolean }>({});

  async function save(e: FormEvent) {
    e.preventDefault();
    setState({ busy: true });
    try {
      await changeEmail(value);
      setState({ ok: true });
    } catch (err) {
      setState({ error: msg(err) });
    }
  }

  return (
    <Card>
      <form onSubmit={save} className="flex flex-col gap-4">
        <h2 className="text-lg">Email</h2>
        <Field label="Email" error={state.error}>
          <Input type="email" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="email" />
        </Field>
        {state.ok && <p className="text-accent-text" role="status">Confirm via the link sent to the new address.</p>}
        <Button type="submit" disabled={state.busy || value.trim().toLowerCase() === email}>
          Save email
        </Button>
      </form>
    </Card>
  );
}

function PasswordForm() {
  const { email } = useReady();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [state, setState] = useState<{ busy?: boolean; error?: string; ok?: boolean }>({});

  async function save(e: FormEvent) {
    e.preventDefault();
    if (next.length < 10) return setState({ error: "Min. 10 characters." });
    if (next !== confirm) return setState({ error: "Passwords don't match." });
    setState({ busy: true });
    try {
      await changePassword(email, current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setState({ ok: true });
    } catch (err) {
      setState({ error: msg(err) });
    }
  }

  return (
    <Card>
      <form onSubmit={save} className="flex flex-col gap-4">
        <h2 className="text-lg">Change password</h2>
        <Field label="Current password">
          <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        </Field>
        <Field label="New password" hint="Min. 10 characters">
          <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label="Repeat new password">
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </Field>
        {state.error && <p className="text-danger-text" role="alert">{state.error}</p>}
        {state.ok && <p className="text-accent-text" role="status">Password changed</p>}
        <Button type="submit" disabled={state.busy}>
          Change password
        </Button>
      </form>
    </Card>
  );
}

function Danger() {
  const { profile, signOut } = useReady();
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [state, setState] = useState<{ busy?: boolean; error?: string }>({});

  return (
    <Card className="flex flex-col gap-4">
      <Button
        variant="secondary"
        onClick={async () => {
          await signOut();
          router.replace("/welcome");
        }}
      >
        Sign out
      </Button>
      <hr className="border-flame-off" />
      <h2 className="text-lg text-danger-text">Delete account</h2>
      <p className="text-sm text-text-muted">Permanent. Deletes all your data.</p>
      <Field label={`Type ${profile.username} to confirm`}>
        <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="none" spellCheck={false} />
      </Field>
      {state.error && <p className="text-danger-text" role="alert">{state.error}</p>}
      <Button
        variant="danger"
        disabled={typed !== profile.username || state.busy}
        onClick={async () => {
          setState({ busy: true });
          try {
            await deleteAccount();
            window.location.replace("/welcome");
          } catch (err) {
            setState({ error: msg(err) });
          }
        }}
      >
        Delete account
      </Button>
    </Card>
  );
}
