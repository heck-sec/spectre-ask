-- Blob store for StorageAdapter (Supabase Postgres)
-- See packages/vault-core/src/storage/postgres.ts

create table if not exists vault_blobs (
  tenant_id    text not null,
  scope_level  text not null
                 check (scope_level in ('user', 'org', 'tenant', 'project')),
  scope_ref_id text not null,
  blob_key     text not null,
  ciphertext   text not null, -- base64
  metadata     jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now(),
  primary key (tenant_id, scope_level, scope_ref_id, blob_key)
);

create index if not exists vault_blobs_tenant_prefix_idx
  on vault_blobs (tenant_id, scope_level, scope_ref_id, blob_key);

-- Optional: store unlock envelopes per tenant (ciphertext of wrapped VMK only)
create table if not exists vault_unlock (
  tenant_id  text primary key,
  envelope   jsonb not null,
  updated_at timestamptz not null default now()
);
