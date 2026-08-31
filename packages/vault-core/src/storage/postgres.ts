import type { StorageAdapter, StorageScope, StoredBlob } from "./adapter.js";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase Postgres StorageAdapter.
 * Table: vault_blobs (see supabase/migrations/20260831_vault_blobs.sql)
 */

export type PostgresAdapterOptions = {
  url: string;
  serviceRoleKey: string;
  tableName?: string;
};

type BlobRow = {
  tenant_id: string;
  scope_level: string;
  scope_ref_id: string;
  blob_key: string;
  ciphertext: string; // base64
  metadata: Record<string, unknown>;
  updated_at: string;
};

function toBlob(row: BlobRow): StoredBlob {
  return {
    key: row.blob_key,
    ciphertext: new Uint8Array(Buffer.from(row.ciphertext, "base64")),
    metadata: row.metadata ?? {},
    updatedAt: row.updated_at,
  };
}

export function createPostgresAdapter(opts: PostgresAdapterOptions): StorageAdapter {
  const table = opts.tableName ?? "vault_blobs";
  const sb: SupabaseClient = createClient(opts.url, opts.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async get(scope, key) {
      const { data, error } = await sb
        .from(table)
        .select("*")
        .eq("tenant_id", scope.tenantId)
        .eq("scope_level", scope.level)
        .eq("scope_ref_id", scope.refId)
        .eq("blob_key", key)
        .maybeSingle();
      if (error) throw new Error(`postgres get: ${error.message}`);
      if (!data) return null;
      return toBlob(data as BlobRow);
    },

    async put(scope, key, blob) {
      const updatedAt = new Date().toISOString();
      const row = {
        tenant_id: scope.tenantId,
        scope_level: scope.level,
        scope_ref_id: scope.refId,
        blob_key: key,
        ciphertext: Buffer.from(blob.ciphertext).toString("base64"),
        metadata: blob.metadata,
        updated_at: updatedAt,
      };
      const { data, error } = await sb
        .from(table)
        .upsert(row, { onConflict: "tenant_id,scope_level,scope_ref_id,blob_key" })
        .select("*")
        .single();
      if (error) throw new Error(`postgres put: ${error.message}`);
      return toBlob(data as BlobRow);
    },

    async list(scope, prefix) {
      let q = sb
        .from(table)
        .select("*")
        .eq("tenant_id", scope.tenantId)
        .eq("scope_level", scope.level)
        .eq("scope_ref_id", scope.refId);
      if (prefix) q = q.like("blob_key", `${prefix}%`);
      const { data, error } = await q;
      if (error) throw new Error(`postgres list: ${error.message}`);
      return ((data as BlobRow[]) ?? []).map(toBlob);
    },

    async delete(scope, key) {
      const { error, count } = await sb
        .from(table)
        .delete({ count: "exact" })
        .eq("tenant_id", scope.tenantId)
        .eq("scope_level", scope.level)
        .eq("scope_ref_id", scope.refId)
        .eq("blob_key", key);
      if (error) throw new Error(`postgres delete: ${error.message}`);
      return (count ?? 0) > 0;
    },
  };
}

/** @deprecated use createPostgresAdapter — kept for earlier stubs */
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
