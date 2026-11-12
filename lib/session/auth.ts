import { z } from "zod";
import { supabase } from "@/lib/supabase/client";
import { deviceTimeZone } from "@/lib/streaks";

export const emailSchema = z.string().trim().toLowerCase().email("Invalid email");
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "3–20 characters: a–z, 0–9, _");
export const displayNameSchema = z.string().trim().min(1, "Required").max(40, "Max. 40 characters");
// Supabase hashes passwords with bcrypt, which accepts at most 72 bytes.
export const passwordSchema = z
  .string()
  .min(10, "Min. 10 characters")
  .refine((p) => new TextEncoder().encode(p).length <= 72, "Max. 72 characters");

export function passwordError(p: string): string | null {
  const r = passwordSchema.safeParse(p);
  return r.success ? null : r.error.issues[0].message;
}

export class FriendlyError extends Error {}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase().rpc("username_available", { username });
  if (error) throw new Error(error.message);
  return data as boolean;
}

export async function signUp(input: { email: string; username: string; displayName: string; password: string }) {
  const email = emailSchema.parse(input.email);
  const username = usernameSchema.parse(input.username);
  if (!(await isUsernameAvailable(username))) throw new FriendlyError("Username taken.");
  const { data, error } = await supabase().auth.signUp({
    email,
    password: input.password,
    options: {
      data: { username, display_name: displayNameSchema.parse(input.displayName), timezone: deviceTimeZone() },
    },
  });
  if (error) {
    if (/already registered|already exists/i.test(error.message)) throw new FriendlyError("Email already in use.");
    if (/database error/i.test(error.message)) throw new FriendlyError("Username taken.");
    throw new FriendlyError(error.message);
  }
  if (!data.session) throw new FriendlyError("Check your email to confirm, then sign in.");
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) {
    if (error.status === 429) throw new FriendlyError("Too many attempts. Try later.");
    throw new FriendlyError("Wrong email or password.");
  }
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase().auth.resetPasswordForEmail(emailSchema.parse(email), {
    redirectTo: `${window.location.origin}/reset`,
  });
  if (error) throw new FriendlyError(error.status === 429 ? "Too many requests. Try later." : error.message);
}

export async function setPassword(password: string) {
  const invalid = passwordError(password);
  if (invalid) throw new FriendlyError(invalid);
  const { error } = await supabase().auth.updateUser({ password });
  if (error) throw new FriendlyError(error.message);
}

/** Checks the current password first, so an unattended signed-in device can't change it. */
export async function changePassword(email: string, current: string, next: string) {
  const { error } = await supabase().auth.signInWithPassword({ email, password: current });
  if (error) throw new FriendlyError("Wrong current password.");
  await setPassword(next);
}

export async function changeEmail(email: string) {
  const { error } = await supabase().auth.updateUser({ email: emailSchema.parse(email) });
  if (error) throw new FriendlyError(error.message);
}

export async function signOut(scope: "global" | "local" = "global") {
  await supabase().auth.signOut({ scope });
}

export async function deleteAccount() {
  const { error } = await supabase().rpc("delete_account");
  if (error) throw new FriendlyError(error.message);
  await signOut("local");
}
