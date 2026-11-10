// Pure planner for key sync (spec: "Key sync"). The caller does the I/O.

export type KeyRow = { recipient_id: string; key_version: number };

export type KeySyncPlan = {
  /** Create this new version (first run, or rotation after an unfriend). */
  createVersion: number | null;
  /** Wrap `version` for `recipient`. */
  shares: { recipient: string; version: number }[];
  /** Delete every row I own for these recipients (ex-friends). */
  revoke: string[];
};

export function planKeySync(me: string, friends: readonly string[], rows: readonly KeyRow[]): KeySyncPlan {
  const versions = [...new Set(rows.map((r) => r.key_version))].sort((a, b) => a - b);
  const has = new Set(rows.map((r) => `${r.recipient_id}:${r.key_version}`));
  const friendSet = new Set(friends);
  const revoke = [...new Set(rows.map((r) => r.recipient_id))].filter((id) => id !== me && !friendSet.has(id));
  const audience = [me, ...friendSet];

  let createVersion: number | null = null;
  if (versions.length === 0) createVersion = 1;
  else if (revoke.length > 0) createVersion = versions[versions.length - 1] + 1;

  const shares: KeySyncPlan["shares"] = [];
  for (const v of versions) for (const r of audience) if (!has.has(`${r}:${v}`)) shares.push({ recipient: r, version: v });
  if (createVersion !== null) for (const r of audience) shares.push({ recipient: r, version: createVersion });

  return { createVersion, shares, revoke };
}

/** The version new entries use: the highest one I hold for myself. */
export function currentVersion(rows: readonly KeyRow[], me: string): number | null {
  const mine = rows.filter((r) => r.recipient_id === me).map((r) => r.key_version);
  return mine.length ? Math.max(...mine) : null;
}
