import { beforeAll, describe, expect, it } from "vitest";
import { getSodium, type Sodium } from "@/lib/crypto/sodium";
import {
  identityFromSecret,
  newFeedKey,
  newPwParams,
  newSecretKey,
  openFeedKey,
  passwordKeys,
  sealFeedKey,
  unwrapSecret,
  wrapSecret,
} from "@/lib/crypto/keys";
import { decryptEntry, encryptEntry, PAD_BLOCK } from "@/lib/crypto/entry";

let s: Sodium;
beforeAll(async () => {
  s = await getSodium();
});

// Argon2 INTERACTIVE uses 64 MB; tests use the same limits as the app.
describe("password keys", () => {
  it("are deterministic for the same password and salt, and differ otherwise", () => {
    const p = newPwParams(s);
    const a = passwordKeys(s, "correct horse battery", p);
    const b = passwordKeys(s, "correct horse battery", p);
    const c = passwordKeys(s, "correct horse battery!", p);
    expect(a.loginPassword).toBe(b.loginPassword);
    expect(a.loginPassword).not.toBe(c.loginPassword);
    expect(s.to_hex(a.wrapKey)).not.toBe(s.to_hex(c.wrapKey));
    // the login key and wrap key are independent
    expect(a.loginPassword).not.toBe(s.to_base64(a.wrapKey, s.base64_variants.ORIGINAL));
  });

  it("wrap and unwrap the secret key; a wrong password fails", () => {
    const secret = newSecretKey(s);
    const p = newPwParams(s);
    const { wrapKey } = passwordKeys(s, "first password!", p);
    const w = wrapSecret(s, secret, wrapKey);
    expect(s.to_hex(unwrapSecret(s, w.wrapped, w.nonce, wrapKey))).toBe(s.to_hex(secret));
    const wrong = passwordKeys(s, "second password", p).wrapKey;
    expect(() => unwrapSecret(s, w.wrapped, w.nonce, wrong)).toThrow();
  });

  it("re-wrapping under a new password keeps the same identity", () => {
    const secret = newSecretKey(s);
    const pk1 = identityFromSecret(s, secret).publicKey;
    const p2 = newPwParams(s);
    const k2 = passwordKeys(s, "a brand new password", p2).wrapKey;
    const w2 = wrapSecret(s, secret, k2);
    const pk2 = identityFromSecret(s, unwrapSecret(s, w2.wrapped, w2.nonce, k2)).publicKey;
    expect(s.to_hex(pk2)).toBe(s.to_hex(pk1));
  });
});

describe("feed keys", () => {
  it("seal to a recipient and only they can open", () => {
    const alice = identityFromSecret(s, newSecretKey(s));
    const bob = identityFromSecret(s, newSecretKey(s));
    const fk = newFeedKey(s);
    const sealed = sealFeedKey(s, fk, bob.publicKey);
    expect(s.to_hex(openFeedKey(s, sealed, bob))).toBe(s.to_hex(fk));
    expect(() => openFeedKey(s, sealed, alice)).toThrow();
  });
});

describe("entries", () => {
  const meta = { userId: "11111111-1111-1111-1111-111111111111", logDate: "2026-11-10", keyVersion: 1 };

  it("round-trip and hide the title length (multiple of the pad block)", () => {
    const fk = newFeedKey(s);
    const short = encryptEntry(s, { v: 1, title: "A" }, meta, fk);
    const long = encryptEntry(s, { v: 1, title: "A".repeat(150), notes: "n" }, meta, fk);
    expect(s.from_base64(short.ciphertext, s.base64_variants.ORIGINAL).length).toBe(PAD_BLOCK + 16);
    expect(s.from_base64(long.ciphertext, s.base64_variants.ORIGINAL).length).toBe(PAD_BLOCK + 16);
    expect(decryptEntry(s, long, meta, fk)).toEqual({ v: 1, title: "A".repeat(150), notes: "n" });
  });

  it("never contains plaintext", () => {
    const fk = newFeedKey(s);
    const e = encryptEntry(s, { v: 1, title: "SecretTitleXYZ", url: "https://example.com/x" }, meta, fk);
    expect(e.ciphertext).not.toContain("SecretTitle");
    const raw = Buffer.from(s.from_base64(e.ciphertext, s.base64_variants.ORIGINAL)).toString("latin1");
    expect(raw.includes("SecretTitleXYZ")).toBe(false);
  });

  it("fails when moved to another user, date or key version, or with the wrong key", () => {
    const fk = newFeedKey(s);
    const e = encryptEntry(s, { v: 1, title: "Dune" }, meta, fk);
    expect(decryptEntry(s, e, { ...meta, userId: "22222222-2222-2222-2222-222222222222" }, fk)).toBeNull();
    expect(decryptEntry(s, e, { ...meta, logDate: "2026-11-09" }, fk)).toBeNull();
    expect(decryptEntry(s, e, { ...meta, keyVersion: 2 }, fk)).toBeNull();
    expect(decryptEntry(s, e, meta, newFeedKey(s))).toBeNull();
    expect(decryptEntry(s, e, meta, undefined)).toBeNull();
  });

  it("rejects invalid content", () => {
    const fk = newFeedKey(s);
    expect(() => encryptEntry(s, { v: 1, title: "" }, meta, fk)).toThrow();
    expect(() => encryptEntry(s, { v: 1, title: "x", url: "javascript:alert(1)" }, meta, fk)).toThrow();
    expect(() => encryptEntry(s, { v: 1, title: "x".repeat(201) }, meta, fk)).toThrow();
    expect(() => encryptEntry(s, { v: 1, title: "x", notes: "n".repeat(501) }, meta, fk)).toThrow();
  });
});
