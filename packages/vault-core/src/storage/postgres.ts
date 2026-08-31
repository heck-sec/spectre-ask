import type { StorageAdapter, StorageScope, StoredBlob } from "./adapter.js";

/**
 * Supabase/Postgres adapter stub.
 * Wire `@supabase/supabase-js` (or pg) in a follow-up — interface is locked.
 */
export type PostgresAdapterOptions = {
  /** Connection string or Supabase URL — unused until wired */
  connectionString?: string;
  tableName?: string;
};

export function createPostgresAdapter(_opts: PostgresAdapterOptions = {}): StorageAdapter {
  const notReady = (op: string): never => {
    throw new Error(
      `Postgres StorageAdapter.${op} not wired yet — migration lives in supabase/migrations; wire supabase-js next.`
    );
  };

  return {
    get: async () => notReady("get"),
    put: async () => notReady("put"),
    list: async () => notReady("list"),
    delete: async () => notReady("delete"),
  };
}

/** In-memory stand-in for unit tests / early integration. */
export function createMemoryAdapter(): StorageAdapter {
  const store = new Map<string, StoredBlob>();

  const id = (scope: StorageScope, key: string) =>
    `${scope.tenantId}:${scope.level}:${scope.refId}:${key}`;

  return {
    async get(scope, key) {
      return store.get(id(scope, key)) ?? null;
    },
    async put(scope, key, blob) {
      const row: StoredBlob = {
        key,
        ciphertext: blob.ciphertext,
        metadata: blob.metadata,
        updatedAt: new Date().toISOString(),
      };
      store.set(id(scope, key), row);
      return row;
    },
    async list(scope, prefix) {
      const p = `${scope.tenantId}:${scope.level}:${scope.refId}:`;
      const out: StoredBlob[] = [];
      for (const [k, v] of store) {
        if (!k.startsWith(p)) continue;
        if (prefix && !v.key.startsWith(prefix)) continue;
        out.push(v);
      }
      return out;
    },
    async delete(scope, key) {
      return store.delete(id(scope, key));
    },
  };
}
