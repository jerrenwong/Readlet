"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { deviceTimeZone } from "@/lib/streaks";
import { signOut as doSignOut } from "./auth";

export type Profile = { id: string; username: string; display_name: string; timezone: string; color: string };

type Ready = { status: "ready"; userId: string; email: string; profile: Profile };
type State = { status: "loading" } | { status: "signedOut" } | Ready;

type Ctx = State & {
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
  const { data: profile } = await sb
    .from("profiles")
    .select("id, username, display_name, timezone, color")
    .eq("id", user.id)
    .maybeSingle<Profile>();
  if (!profile) {
    await doSignOut("local");
    return { status: "signedOut" };
  }
  const tz = deviceTimeZone();
  if (tz !== profile.timezone) {
    const { error } = await sb.from("profiles").update({ timezone: tz }).eq("id", user.id);
    if (!error) profile.timezone = tz;
  }
  return { status: "ready", userId: user.id, email: user.email ?? "", profile };
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

export function useReady(): Ready & Ctx {
  const ctx = useSession();
  if (ctx.status !== "ready") throw new Error("useReady before the session is ready");
  return ctx as Ready & Ctx;
}
