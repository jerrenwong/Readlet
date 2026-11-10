// Sign-up, sign-in and password change (spec: "Signing up, signing in and changing the password").
// The password never leaves the browser: Supabase only sees the derived login key.
import { z } from "zod";
import { b64, getSodium } from "@/lib/crypto/sodium";
import { identityFromSecret, newPwParams, newSecretKey, passwordKeys, unwrapSecret, wrapSecret } from "@/lib/crypto/keys";
import { loginEmail, must, supabase } from "@/lib/supabase/client";
import { deviceTimeZone } from "@/lib/streaks";
import { clearSecretKeys, saveSecretKey } from "./keystore";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "3–20 characters: a–z, 0–9, _");
export const displayNameSchema = z.string().trim().min(1, "Required").max(40, "Max. 40 characters");
export const passwordSchema = z.string().min(10, "Min. 10 characters");

export class FriendlyError extends Error {}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  return must(await supabase().rpc("username_available", { username })) as boolean;
}

export async function signUp(input: { username: string; displayName: string; password: string }) {
  const s = await getSodium();
  const username = usernameSchema.parse(input.username);
  const displayName = displayNameSchema.parse(input.displayName);
  passwordSchema.parse(input.password);
  if (!(await isUsernameAvailable(username))) throw new FriendlyError("Username taken.");

  const secret = newSecretKey(s);
  const identity = identityFromSecret(s, secret);
  const params = newPwParams(s);
  const { loginPassword, wrapKey } = passwordKeys(s, input.password, params);
  const wrapped = wrapSecret(s, secret, wrapKey);
  const loginId = crypto.randomUUID();

  const sb = supabase();
  const { data, error } = await sb.auth.signUp({ email: loginEmail(loginId), password: loginPassword });
  if (error || !data.session) throw new FriendlyError(error?.message ?? "Sign-up failed.");
  const userId = data.session.user.id;

  const { error: e2 } = await sb.rpc("create_account", {
    p_username: username,
    p_display_name: displayName,
    p_avatar: null,
    p_timezone: deviceTimeZone(),
    p_public_key: b64.enc(s, identity.publicKey),
    p_login_id: loginId,
    p_pw_salt: b64.enc(s, params.salt),
    p_pw_ops: params.ops,
    p_pw_mem: params.mem,
    p_wrapped_secret: wrapped.wrapped,
    p_wrapped_nonce: wrapped.nonce,
  });
  if (e2) {
    await sb.auth.signOut();
    throw new FriendlyError(e2.message.includes("profiles_username_key") ? "Username taken." : e2.message);
  }
  await saveSecretKey(userId, secret);
  return userId;
}

export async function signIn(rawUsername: string, password: string) {
  const s = await getSodium();
  const username = rawUsername.trim().toLowerCase();
  const sb = supabase();
  const info = (must(await sb.rpc("login_info", { username })) as
    | { login_id: string; pw_salt: string; pw_ops: number; pw_mem: number }[]
    | null)?.[0];
  if (!info) throw new FriendlyError("Wrong username or password.");

  const { loginPassword, wrapKey } = passwordKeys(s, password, {
    salt: b64.dec(s, info.pw_salt),
    ops: info.pw_ops,
    mem: info.pw_mem,
  });
  const { data, error } = await sb.auth.signInWithPassword({ email: loginEmail(info.login_id), password: loginPassword });
  if (error || !data.session) {
    if (error?.status === 429) throw new FriendlyError("Too many attempts. Try later.");
    throw new FriendlyError("Wrong username or password.");
  }
  const acct = must(
    await sb.from("accounts").select("wrapped_secret, wrapped_nonce").eq("user_id", data.session.user.id).single(),
  );
  const secret = unwrapSecret(s, acct.wrapped_secret, acct.wrapped_nonce, wrapKey);
  await saveSecretKey(data.session.user.id, secret);
  return data.session.user.id;
}

/** Re-locks the same secret key under the new password, so friends' shared keys keep working. */
export async function changePassword(userId: string, current: string, next: string) {
  const s = await getSodium();
  passwordSchema.parse(next);
  const sb = supabase();
  const acct = must(
    await sb.from("accounts").select("pw_salt, pw_ops, pw_mem, wrapped_secret, wrapped_nonce").eq("user_id", userId).single(),
  );
  let secret: Uint8Array;
  try {
    const { wrapKey } = passwordKeys(s, current, { salt: b64.dec(s, acct.pw_salt), ops: acct.pw_ops, mem: acct.pw_mem });
    secret = unwrapSecret(s, acct.wrapped_secret, acct.wrapped_nonce, wrapKey);
  } catch {
    throw new FriendlyError("Wrong current password.");
  }
  const params = newPwParams(s);
  const { loginPassword, wrapKey } = passwordKeys(s, next, params);
  const wrapped = wrapSecret(s, secret, wrapKey);
  const { error } = await sb.auth.updateUser({ password: loginPassword });
  if (error) throw new FriendlyError(error.message);
  must(
    await sb
      .from("accounts")
      .update({
        pw_salt: b64.enc(s, params.salt),
        pw_ops: params.ops,
        pw_mem: params.mem,
        wrapped_secret: wrapped.wrapped,
        wrapped_nonce: wrapped.nonce,
      })
      .eq("user_id", userId),
  );
}

export async function signOut(scope: "global" | "local" = "global") {
  await clearSecretKeys();
  await supabase().auth.signOut({ scope });
}

export async function deleteAccount() {
  must(await supabase().rpc("delete_account"));
  // The server session is already gone with the account; just clear this device.
  await signOut("local");
}
