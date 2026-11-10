// Feed keys: key sync (spec "Key sync") and the map of keys I can open.
import { b64, getSodium } from "@/lib/crypto/sodium";
import { newFeedKey, openFeedKey, sealFeedKey, type IdentityKeys } from "@/lib/crypto/keys";
import { currentVersion, planKeySync } from "@/lib/crypto/keysync";
import { must, supabase } from "@/lib/supabase/client";

export type KeyMap = Map<string, Uint8Array>; // `${owner}:${version}` → feed key
export const keyId = (owner: string, version: number) => `${owner}:${version}`;

/** Every feed key wrapped for me (mine and friends'), opened. */
export async function fetchKeyMap(me: string, identity: IdentityKeys): Promise<KeyMap> {
  const s = await getSodium();
  const rows = must(
    await supabase().from("feed_keys").select("owner_id, key_version, wrapped_key").eq("recipient_id", me),
  ) as { owner_id: string; key_version: number; wrapped_key: string }[];
  const map: KeyMap = new Map();
  for (const r of rows) {
    try {
      map.set(keyId(r.owner_id, r.key_version), openFeedKey(s, r.wrapped_key, identity));
    } catch {
      /* a key we can't open is skipped; its entries show "Couldn't unlock this entry" */
    }
  }
  return map;
}

export async function acceptedFriends(me: string): Promise<{ id: string; public_key: string }[]> {
  const sb = supabase();
  const fs = must(
    await sb.from("friendships").select("user_a, user_b").eq("status", "accepted").or(`user_a.eq.${me},user_b.eq.${me}`),
  ) as { user_a: string; user_b: string }[];
  const ids = fs.map((f) => (f.user_a === me ? f.user_b : f.user_a));
  if (!ids.length) return [];
  return must(await sb.from("profiles").select("id, public_key").in("id", ids)) as { id: string; public_key: string }[];
}

/**
 * Makes sure my key versions are wrapped for me and every friend; rotates after an unfriend.
 * Returns true if anything changed.
 */
export async function syncKeys(me: string, identity: IdentityKeys): Promise<boolean> {
  const s = await getSodium();
  const sb = supabase();
  const friends = await acceptedFriends(me);
  const owned = must(
    await sb.from("feed_keys").select("recipient_id, key_version, wrapped_key").eq("owner_id", me),
  ) as { recipient_id: string; key_version: number; wrapped_key: string }[];
  const plan = planKeySync(
    me,
    friends.map((f) => f.id),
    owned,
  );
  if (!plan.createVersion && !plan.shares.length && !plan.revoke.length) return false;

  const pk = new Map<string, Uint8Array>(friends.map((f) => [f.id, b64.dec(s, f.public_key)]));
  pk.set(me, identity.publicKey);
  const plain = new Map<number, Uint8Array>();
  for (const r of owned) {
    if (r.recipient_id !== me) continue;
    try {
      plain.set(r.key_version, openFeedKey(s, r.wrapped_key, identity));
    } catch {
      /* unreadable self copy: that version can't be re-shared */
    }
  }

  // A new version is inserted in one statement (self row included), so two devices can't both create it.
  if (plan.createVersion) {
    const key = newFeedKey(s);
    const rows = plan.shares
      .filter((x) => x.version === plan.createVersion)
      .map((x) => ({
        owner_id: me,
        recipient_id: x.recipient,
        key_version: x.version,
        wrapped_key: sealFeedKey(s, key, pk.get(x.recipient)!),
      }));
    const { error } = await sb.from("feed_keys").insert(rows);
    if (error && error.code !== "23505") throw new Error(error.message);
  }
  const older = plan.shares
    .filter((x) => x.version !== plan.createVersion && plain.has(x.version) && pk.has(x.recipient))
    .map((x) => ({
      owner_id: me,
      recipient_id: x.recipient,
      key_version: x.version,
      wrapped_key: sealFeedKey(s, plain.get(x.version)!, pk.get(x.recipient)!),
    }));
  if (older.length) {
    const { error } = await sb.from("feed_keys").upsert(older, { ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }
  if (plan.revoke.length) {
    must(await sb.from("feed_keys").delete().eq("owner_id", me).in("recipient_id", plan.revoke));
  }
  return true;
}

/** The key and version my new entries use (creating version 1 on first use). */
export async function myWritingKey(me: string, identity: IdentityKeys): Promise<{ version: number; key: Uint8Array }> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const s = await getSodium();
    const rows = must(
      await supabase().from("feed_keys").select("recipient_id, key_version, wrapped_key").eq("owner_id", me).eq("recipient_id", me),
    ) as { recipient_id: string; key_version: number; wrapped_key: string }[];
    const v = currentVersion(rows, me);
    if (v !== null) {
      const row = rows.find((r) => r.key_version === v)!;
      return { version: v, key: openFeedKey(s, row.wrapped_key, identity) };
    }
    await syncKeys(me, identity);
  }
  throw new Error("Key setup failed. Reload.");
}
