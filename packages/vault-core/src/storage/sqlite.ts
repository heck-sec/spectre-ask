import type { StorageAdapter, StorageScope, StoredBlob } from "./adapter.js";

/**
 * Local/offline SQLite adapter stub for vault-cli.
 * Uses an in-process Map until better-sqlite3 (or similar) is added intentionally.
 */
export type SqliteAdapterOptions = {
  /** Path to .sqlite file — reserved for real driver */
  path?: string;
};

export function createSqliteAdapter(_opts: SqliteAdapterOptions = {}): StorageAdapter {
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
