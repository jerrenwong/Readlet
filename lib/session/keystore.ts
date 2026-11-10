// The secret key lives in IndexedDB so each device unlocks once. Signing out deletes it.
const DB = "readlet";
const STORE = "keys";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).finally(() => db.close()) as Promise<T>;
}

export async function saveSecretKey(userId: string, key: Uint8Array): Promise<void> {
  await tx("readwrite", (s) => s.put(key, userId));
  // Ask the browser not to evict our storage (Safari may clear sites left unopened).
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* not supported */
  }
}

export async function loadSecretKey(userId: string): Promise<Uint8Array | null> {
  try {
    const v = await tx<unknown>("readonly", (s) => s.get(userId));
    return v instanceof Uint8Array ? v : null;
  } catch {
    return null;
  }
}

export async function clearSecretKeys(): Promise<void> {
  try {
    await tx("readwrite", (s) => s.clear());
  } catch {
    /* nothing stored */
  }
}
