import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createMemoryAdapter, createPostgresAdapter, type StorageAdapter } from "@spectre-ask/vault-core";

export function supabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getServiceSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Postgres when configured; otherwise in-memory (local/dev without DB). */
export function getVaultStorage(): StorageAdapter {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return createPostgresAdapter({ url, serviceRoleKey: key });
  return createMemoryAdapter();
}
