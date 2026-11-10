// Entry encryption: JSON → pad to 256 bytes → XChaCha20-Poly1305 with AD binding author, date and key version.
import { z } from "zod";
import { b64, type Sodium } from "./sodium";

export const PAD_BLOCK = 256;

export const entryContent = z.object({
  v: z.literal(1),
  title: z.string().min(1).max(200),
  url: z
    .string()
    .max(2000)
    .url()
    .refine((u) => /^https?:\/\//i.test(u), "Must be an http(s) link")
    .optional(),
  notes: z.string().max(500).optional(),
});

export type EntryContent = z.infer<typeof entryContent>;

export type EntryMeta = { userId: string; logDate: string; keyVersion: number };

export const entryAD = (m: EntryMeta) => `entry:${m.userId}:${m.logDate}:${m.keyVersion}`;

export function encryptEntry(s: Sodium, content: EntryContent, meta: EntryMeta, feedKey: Uint8Array) {
  const parsed = entryContent.parse(content);
  const padded = s.pad(s.from_string(JSON.stringify(parsed)), PAD_BLOCK);
  const nonce = s.randombytes_buf(s.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ct = s.crypto_aead_xchacha20poly1305_ietf_encrypt(padded, entryAD(meta), null, nonce, feedKey);
  return { ciphertext: b64.enc(s, ct), nonce: b64.enc(s, nonce), key_version: meta.keyVersion };
}

/** Returns null when the entry can't be unlocked (wrong key, tampered, moved, or malformed). */
export function decryptEntry(
  s: Sodium,
  row: { ciphertext: string; nonce: string },
  meta: EntryMeta,
  feedKey: Uint8Array | undefined,
): EntryContent | null {
  if (!feedKey) return null;
  try {
    const padded = s.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      b64.dec(s, row.ciphertext),
      entryAD(meta),
      b64.dec(s, row.nonce),
      feedKey,
    );
    const json = JSON.parse(s.to_string(s.unpad(padded, PAD_BLOCK)));
    const result = entryContent.safeParse(json);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
