/**
 * Almacén local de la tienda en IndexedDB (con respaldo en memoria).
 *
 * Aquí viven los datos del catálogo para que la app funcione SIN conexión:
 * - `kv`: datos del catálogo por clave (productos, categorías, tasa, ...)
 * - `meta`: fecha de guardado por clave (para el aviso "datos del ...")
 * - `queue`: pedidos hechos sin conexión, pendientes de enviar
 *
 * Si IndexedDB no está disponible (modo privado, navegador viejo), se usa
 * un respaldo en memoria: la app sigue funcionando en la sesión actual.
 */

const DB_NAME = "neocharge-offline";
const DB_VERSION = 1;

interface StoredRecord {
  key: string;
  value: unknown;
  savedAt: number;
}

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") {
        resolve(null);
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv", { keyPath: "key" });
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "key" });
        if (!db.objectStoreNames.contains("queue")) db.createObjectStore("queue", { keyPath: "key" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

let dbPromise: Promise<IDBDatabase | null> | null = null;
function getDb(): Promise<IDBDatabase | null> {
  if (!dbPromise) dbPromise = openDb();
  return dbPromise;
}

// Respaldo en memoria (si IndexedDB falla).
const memFallback = new Map<string, Map<string, StoredRecord>>();
function memStore(name: string): Map<string, StoredRecord> {
  let s = memFallback.get(name);
  if (!s) {
    s = new Map();
    memFallback.set(name, s);
  }
  return s;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return getDb().then((db) => {
    if (!db) throw new Error("no-idb");
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(store, mode);
      const objectStore = transaction.objectStore(store);
      const req = fn(objectStore);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("idb-error"));
    });
  });
}

export async function idbSet(store: "kv" | "meta" | "queue", key: string, value: unknown): Promise<void> {
  const record: StoredRecord = { key, value, savedAt: Date.now() };
  try {
    await tx(store, "readwrite", (s) => s.put(record));
  } catch {
    memStore(store).set(key, record);
  }
}

export async function idbGet<T>(store: "kv" | "meta" | "queue", key: string): Promise<{ value: T; savedAt: number } | null> {
  try {
    const rec = await tx<StoredRecord | undefined>(store, "readonly", (s) => s.get(key));
    return rec ? { value: rec.value as T, savedAt: rec.savedAt } : null;
  } catch {
    const rec = memStore(store).get(key);
    return rec ? { value: rec.value as T, savedAt: rec.savedAt } : null;
  }
}

export async function idbDelete(store: "kv" | "meta" | "queue", key: string): Promise<void> {
  try {
    await tx(store, "readwrite", (s) => s.delete(key));
  } catch {
    memStore(store).delete(key);
  }
}

export async function idbKeys(store: "kv" | "meta" | "queue"): Promise<string[]> {
  try {
    return await tx<string[]>(store, "readonly", (s) => s.getAllKeys() as unknown as IDBRequest<string[]>);
  } catch {
    return Array.from(memStore(store).keys());
  }
}

/** Solo para tests: limpia todo el almacén. */
export async function idbClearAll(): Promise<void> {
  for (const store of ["kv", "meta", "queue"] as const) {
    try {
      await tx(store, "readwrite", (s) => s.clear());
    } catch {
      memStore(store).clear();
    }
  }
  memFallback.clear();
}
