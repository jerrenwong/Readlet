// Account keys. Only libsodium calls named in the spec are used.
import { b64, type Sodium } from "./sodium";

/** KDF contexts are exactly 8 bytes. */
const CTX_IDENTITY = "rl_ident";
const CTX_PASSWORD = "rl_passw";
const SUBKEY_LOGIN = 1;
const SUBKEY_WRAP = 2;

export type PwParams = { salt: Uint8Array; ops: number; mem: number };

export type IdentityKeys = { publicKey: Uint8Array; privateKey: Uint8Array };

/** 32 random bytes created at sign-up: the root of the account; never changes. */
export function newSecretKey(s: Sodium): Uint8Array {
  return s.randombytes_buf(32);
}

/** secret key → seed (crypto_kdf_derive_from_key) → X25519 identity key pair (crypto_box_seed_keypair). */
export function identityFromSecret(s: Sodium, secretKey: Uint8Array): IdentityKeys {
  const seed = s.crypto_kdf_derive_from_key(s.crypto_box_SEEDBYTES, 1, CTX_IDENTITY, secretKey);
  const kp = s.crypto_box_seed_keypair(seed);
  return { publicKey: kp.publicKey, privateKey: kp.privateKey };
}

export function newPwParams(s: Sodium): PwParams {
  return {
    salt: s.randombytes_buf(s.crypto_pwhash_SALTBYTES),
    ops: s.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    mem: s.crypto_pwhash_MEMLIMIT_INTERACTIVE,
  };
}

/**
 * Argon2id(password) → master key → login key (sent to Supabase as the account password, base64)
 * and wrap key (locks the secret key). The password itself never leaves the browser.
 */
export function passwordKeys(s: Sodium, password: string, p: PwParams) {
  const master = s.crypto_pwhash(32, password, p.salt, p.ops, p.mem, s.crypto_pwhash_ALG_ARGON2ID13);
  const loginKey = s.crypto_kdf_derive_from_key(32, SUBKEY_LOGIN, CTX_PASSWORD, master);
  const wrapKey = s.crypto_kdf_derive_from_key(32, SUBKEY_WRAP, CTX_PASSWORD, master);
  s.memzero(master);
  return { loginPassword: b64.enc(s, loginKey), wrapKey };
}

const WRAP_AD = "readlet:secret-key:v1";

/** Locks the secret key under the wrap key (XChaCha20-Poly1305, random nonce). */
export function wrapSecret(s: Sodium, secretKey: Uint8Array, wrapKey: Uint8Array) {
  const nonce = s.randombytes_buf(s.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ct = s.crypto_aead_xchacha20poly1305_ietf_encrypt(secretKey, WRAP_AD, null, nonce, wrapKey);
  return { wrapped: b64.enc(s, ct), nonce: b64.enc(s, nonce) };
}

/** Throws if the wrap key (i.e. the password) is wrong. */
export function unwrapSecret(s: Sodium, wrapped: string, nonce: string, wrapKey: Uint8Array): Uint8Array {
  return s.crypto_aead_xchacha20poly1305_ietf_decrypt(null, b64.dec(s, wrapped), WRAP_AD, b64.dec(s, nonce), wrapKey);
}

/** A new symmetric feed key (one per version). */
export function newFeedKey(s: Sodium): Uint8Array {
  return s.crypto_aead_xchacha20poly1305_ietf_keygen();
}

/** Wraps a feed key for a recipient's public key with crypto_box_seal. */
export function sealFeedKey(s: Sodium, feedKey: Uint8Array, recipientPublicKey: Uint8Array): string {
  return b64.enc(s, s.crypto_box_seal(feedKey, recipientPublicKey));
}

export function openFeedKey(s: Sodium, wrapped: string, me: IdentityKeys): Uint8Array {
  return s.crypto_box_seal_open(b64.dec(s, wrapped), me.publicKey, me.privateKey);
}
