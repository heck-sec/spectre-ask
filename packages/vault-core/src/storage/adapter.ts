import type { ScopeLevel } from "@spectre-ask/access-contract";

export type StorageScope = {
  level: ScopeLevel;
  refId: string;
  tenantId: string;
};

export type StoredBlob = {
  key: string;
  ciphertext: Uint8Array;
  metadata: Record<string, unknown>;
  updatedAt: string;
};

/**
 * Persistence contract — vault engine never talks to a DB driver directly.
 * Default hosted: Postgres (Supabase). Local CLI: SQLite.
 */
export interface StorageAdapter {
  get(scope: StorageScope, key: string): Promise<StoredBlob | null>;
  put(scope: StorageScope, key: string, blob: Omit<StoredBlob, "key" | "updatedAt">): Promise<StoredBlob>;
  list(scope: StorageScope, prefix?: string): Promise<StoredBlob[]>;
  delete(scope: StorageScope, key: string): Promise<boolean>;
}
