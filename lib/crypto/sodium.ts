import _sodium from "libsodium-wrappers-sumo";

export type Sodium = typeof _sodium;

let ready: Promise<Sodium> | null = null;

/** Loads libsodium once. All crypto in the app goes through this module's callers. */
export function getSodium(): Promise<Sodium> {
  ready ??= _sodium.ready.then(() => _sodium);
  return ready;
}

export const b64 = {
  enc: (s: Sodium, bytes: Uint8Array) => s.to_base64(bytes, s.base64_variants.ORIGINAL),
  dec: (s: Sodium, text: string) => s.from_base64(text, s.base64_variants.ORIGINAL),
};
