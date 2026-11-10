"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSodium } from "@/lib/crypto/sodium";
import { identityFromSecret, type IdentityKeys } from "@/lib/crypto/keys";
import { supabase } from "@/lib/supabase/client";
import { deviceTimeZone } from "@/lib/streaks";
import { loadSecretKey } from "./keystore";
import { signOut as doSignOut } from "./auth";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar: string;
  timezone: string;
  public_key: string;
};

type Ready = { status: "ready"; userId: string; profile: Profile; identity: IdentityKeys };
type State = { status: "loading" } | { status: "signedOut" } | Ready;

type Ctx = State & {
  /** Re-reads the session and key (after sign-up or sign-in). */
  reload: () => Promise<void>;
  setProfile: (p: Profile) => void;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

async function resolve(): Promise<State> {
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  const user = data.session?.user;
  if (!user) return { status: "signedOut" };
  const secret = await loadSecretKey(user.id);
  if (!secret) {
    // Signed in to Supabase but this device has no key: start over with a fresh sign-in.
    await doSignOut();
    return { status: "signedOut" };
  }
  const { data: profile } = await sb
    .from("profiles")
    .select("id, username, display_name, avatar, timezone, public_key")
    .eq("id", user.id)
    .maybeSingle<Profile>();
  if (!profile) {
    await doSignOut();
    return { status: "signedOut" };
  }
  const s = await getSodium();
  const identity = identityFromSecret(s, secret);
  // The profile timezone follows the device.
  const tz = deviceTimeZone();
  if (tz !== profile.timezone) {
    const { error } = await sb.from("profiles").update({ timezone: tz }).eq("id", user.id);
    if (!error) profile.timezone = tz;
  }
  return { status: "ready", userId: user.id, profile, identity };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const qc = useQueryClient();

  const reload = useCallback(async () => {
    setState(await resolve());
  }, []);

  useEffect(() => {
    let alive = true;
    resolve().then((s) => alive && setState(s));
    const { data } = supabase().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        qc.clear();
        setState({ status: "signedOut" });
      }
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [qc]);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      reload,
      setProfile: (p) => setState((s) => (s.status === "ready" ? { ...s, profile: p } : s)),
      signOut: async () => {
        await doSignOut();
        qc.clear();
        setState({ status: "signedOut" });
      },
    }),
    [state, reload, qc],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Ctx {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession outside SessionProvider");
  return ctx;
}

/** For pages inside the signed-in shell, which only renders when ready. */
export function useReady(): Ready & Ctx {
  const ctx = useSession();
  if (ctx.status !== "ready") throw new Error("useReady before the session is ready");
  return ctx as Ready & Ctx;
}
