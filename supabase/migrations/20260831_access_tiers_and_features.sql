-- Spectre Ask — access tiers + feature entitlements
-- See: SECRETS_AND_ACCESS_TIERS_PLAN.md §2
-- Default hosted DB: Supabase Postgres

create extension if not exists pgcrypto;

-- Axis B: named tiers (rank = display/sort only — never used in resolution)
create table if not exists access_tiers (
  id                 uuid primary key default gen_random_uuid(),
  key                text unique not null,
  name               text not null,
  rank               int not null,
  kind               text not null default 'standard'
                       check (kind in ('standard', 'partner', 'custom')),
  description        text,
  is_assignable      boolean not null default true,
  owner_scope_level  text,
  owner_scope_ref_id text,
  created_at         timestamptz not null default now(),
  check (
    (owner_scope_level is null and owner_scope_ref_id is null)
    or (owner_scope_level is not null and owner_scope_ref_id is not null)
  )
);

create table if not exists features (
  id            uuid primary key default gen_random_uuid(),
  key           text unique not null,
  name          text not null,
  group_name    text not null,
  description   text,
  value_type    text not null
                  check (value_type in ('boolean', 'integer', 'string', 'enum')),
  enum_values   jsonb,
  default_value jsonb not null,
  created_at    timestamptz not null default now()
);

create table if not exists tier_features (
  tier_id    uuid not null references access_tiers(id) on delete cascade,
  feature_id uuid not null references features(id) on delete cascade,
  value      jsonb not null,
  primary key (tier_id, feature_id)
);

create table if not exists access_grants (
  id                uuid primary key default gen_random_uuid(),
  scope_level       text not null
                      check (scope_level in ('user', 'org', 'tenant', 'project')),
  scope_ref_id      text not null,
  tenant_id         text not null,
  tier_id           uuid references access_tiers(id),
  feature_overrides jsonb not null default '{}'::jsonb,
  granted_by        text not null,
  granted_by_kind   text not null
                      check (granted_by_kind in ('operator', 'partner_admin')),
  reason            text,
  expires_at        timestamptz,
  revoked_at        timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists access_grants_scope_live_idx
  on access_grants (scope_level, scope_ref_id)
  where revoked_at is null;

create index if not exists access_grants_tenant_live_idx
  on access_grants (tenant_id)
  where revoked_at is null;

create index if not exists access_grants_expires_live_idx
  on access_grants (expires_at)
  where revoked_at is null and expires_at is not null;

-- Axis A: product operators (NOT tenant_access)
create table if not exists spectre_ask_operators (
  clerk_user_id text primary key,
  role          text not null check (role in ('super', 'admin')),
  added_by      text,
  created_at    timestamptz not null default now()
);

-- Seed platform tiers (rank = UI order only)
insert into access_tiers (key, name, rank, kind, description)
values
  ('user', 'User (free)', 10, 'standard', 'Free tier'),
  ('premium_1', 'Premium', 20, 'standard', 'Paid subscriber'),
  ('premium_2', 'Premium Plus', 30, 'standard', 'Higher storage and API limits'),
  ('partner', 'Partner', 100, 'partner', 'Isolated delegated tenant / mini studio')
on conflict (key) do nothing;

-- Seed feature catalog
insert into features (key, name, group_name, description, value_type, default_value)
values
  ('secrets.max_count', 'Max secrets', 'Secrets', 'Quota; -1 = unlimited', 'integer', '{"int":25}'::jsonb),
  ('projects.max_count', 'Max projects', 'Projects', 'Quota; -1 = unlimited', 'integer', '{"int":1}'::jsonb),
  ('api.rate_limit_rpm', 'API rate limit (rpm)', 'API', 'Requests per minute', 'integer', '{"int":20}'::jsonb),
  ('api.custom_endpoints', 'Custom API endpoints', 'API', 'Partner/premium custom routes', 'boolean', '{"bool":false}'::jsonb),
  ('storage.custom_database', 'Custom database', 'Storage', 'BYO StorageAdapter / external DB', 'boolean', '{"bool":false}'::jsonb),
  ('tenants.delegate_grants', 'Delegate grants', 'Tenants', 'Partner may grant within own tenant', 'boolean', '{"bool":false}'::jsonb),
  ('support.priority', 'Priority support', 'Support', 'Priority queue', 'boolean', '{"bool":false}'::jsonb)
on conflict (key) do nothing;

-- Helper: upsert tier_feature by keys
create or replace function seed_tier_feature(p_tier text, p_feature text, p_value jsonb)
returns void
language plpgsql
as $$
declare
  tid uuid;
  fid uuid;
begin
  select id into tid from access_tiers where key = p_tier;
  select id into fid from features where key = p_feature;
  if tid is null or fid is null then
    raise exception 'missing tier % or feature %', p_tier, p_feature;
  end if;
  insert into tier_features (tier_id, feature_id, value)
  values (tid, fid, p_value)
  on conflict (tier_id, feature_id) do update set value = excluded.value;
end;
$$;

-- user
select seed_tier_feature('user', 'secrets.max_count', '{"int":25}');
select seed_tier_feature('user', 'projects.max_count', '{"int":1}');
select seed_tier_feature('user', 'api.rate_limit_rpm', '{"int":20}');
select seed_tier_feature('user', 'api.custom_endpoints', '{"bool":false}');
select seed_tier_feature('user', 'storage.custom_database', '{"bool":false}');
select seed_tier_feature('user', 'tenants.delegate_grants', '{"bool":false}');
select seed_tier_feature('user', 'support.priority', '{"bool":false}');

-- premium_1
select seed_tier_feature('premium_1', 'secrets.max_count', '{"int":500}');
select seed_tier_feature('premium_1', 'projects.max_count', '{"int":10}');
select seed_tier_feature('premium_1', 'api.rate_limit_rpm', '{"int":120}');
select seed_tier_feature('premium_1', 'api.custom_endpoints', '{"bool":false}');
select seed_tier_feature('premium_1', 'storage.custom_database', '{"bool":false}');
select seed_tier_feature('premium_1', 'tenants.delegate_grants', '{"bool":false}');
select seed_tier_feature('premium_1', 'support.priority', '{"bool":false}');

-- premium_2
select seed_tier_feature('premium_2', 'secrets.max_count', '{"int":5000}');
select seed_tier_feature('premium_2', 'projects.max_count', '{"int":50}');
select seed_tier_feature('premium_2', 'api.rate_limit_rpm', '{"int":600}');
select seed_tier_feature('premium_2', 'api.custom_endpoints', '{"bool":true}');
select seed_tier_feature('premium_2', 'storage.custom_database', '{"bool":false}');
select seed_tier_feature('premium_2', 'tenants.delegate_grants', '{"bool":false}');
select seed_tier_feature('premium_2', 'support.priority', '{"bool":true}');

-- partner (ceiling for child grants)
select seed_tier_feature('partner', 'secrets.max_count', '{"int":-1}');
select seed_tier_feature('partner', 'projects.max_count', '{"int":-1}');
select seed_tier_feature('partner', 'api.rate_limit_rpm', '{"int":2000}');
select seed_tier_feature('partner', 'api.custom_endpoints', '{"bool":true}');
select seed_tier_feature('partner', 'storage.custom_database', '{"bool":true}');
select seed_tier_feature('partner', 'tenants.delegate_grants', '{"bool":true}');
select seed_tier_feature('partner', 'support.priority', '{"bool":true}');
