import type { FeatureMap, FeatureValue, GrantedByKind } from "@spectre-ask/access-contract";
import { resolveFeatures, type FeatureDef } from "@spectre-ask/vault-core";
import { getServiceSupabase, supabaseConfigured } from "./supabase";

export type AccessGrantRow = {
  id: string;
  scope_level: string;
  scope_ref_id: string;
  tenant_id: string;
  tier_id: string | null;
  feature_overrides: FeatureMap;
  granted_by: string;
  granted_by_kind: GrantedByKind;
  reason: string | null;
  expires_at: string | null;
  revoked_at: string | null;
};

const FALLBACK_DEFS: FeatureDef[] = [
  { key: "secrets.max_count", valueType: "integer", defaultValue: { int: 25 } },
  { key: "projects.max_count", valueType: "integer", defaultValue: { int: 1 } },
  { key: "api.rate_limit_rpm", valueType: "integer", defaultValue: { int: 20 } },
  { key: "api.custom_endpoints", valueType: "boolean", defaultValue: { bool: false } },
  { key: "storage.custom_database", valueType: "boolean", defaultValue: { bool: false } },
  { key: "tenants.delegate_grants", valueType: "boolean", defaultValue: { bool: false } },
  { key: "support.priority", valueType: "boolean", defaultValue: { bool: false } },
];

function asFeatureValue(raw: unknown): FeatureValue | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.bool === "boolean") return { bool: o.bool };
  if (typeof o.int === "number") return { int: o.int };
  if (typeof o.string === "string") return { string: o.string };
  if (typeof o.enum === "string") return { enum: o.enum };
  return null;
}

export async function isOperator(clerkUserId: string): Promise<{
  isOperator: boolean;
  role?: "super" | "admin";
}> {
  const sb = getServiceSupabase();
  if (!sb) return { isOperator: false };
  const { data } = await sb
    .from("spectre_ask_operators")
    .select("role")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();
  if (!data?.role) return { isOperator: false };
  return { isOperator: true, role: data.role as "super" | "admin" };
}

export async function loadFeatureDefs(): Promise<FeatureDef[]> {
  const sb = getServiceSupabase();
  if (!sb) return FALLBACK_DEFS;
  const { data, error } = await sb.from("features").select("key,value_type,default_value,enum_values");
  if (error || !data?.length) return FALLBACK_DEFS;
  return data.map((row) => ({
    key: row.key as string,
    valueType: row.value_type as FeatureDef["valueType"],
    defaultValue: asFeatureValue(row.default_value) ?? { bool: false },
    enumValues: Array.isArray(row.enum_values) ? (row.enum_values as string[]) : undefined,
  }));
}

async function loadTierFeatures(tierId: string): Promise<FeatureMap> {
  const sb = getServiceSupabase();
  if (!sb) return {};
  const { data } = await sb
    .from("tier_features")
    .select("value, features!inner(key)")
    .eq("tier_id", tierId);
  const out: FeatureMap = {};
  for (const row of data ?? []) {
    const key = (row as { features?: { key?: string } }).features?.key;
    const val = asFeatureValue(row.value);
    if (key && val) out[key] = val;
  }
  return out;
}

async function loadTierByKey(key: string): Promise<{ id: string } | null> {
  const sb = getServiceSupabase();
  if (!sb) return null;
  const { data } = await sb.from("access_tiers").select("id").eq("key", key).maybeSingle();
  return data?.id ? { id: data.id as string } : null;
}

export async function findActiveGrant(input: {
  tenantId: string;
  scopeLevel: string;
  scopeRefId: string;
}): Promise<AccessGrantRow | null> {
  const sb = getServiceSupabase();
  if (!sb) return null;
  const now = new Date().toISOString();
  const { data } = await sb
    .from("access_grants")
    .select("*")
    .eq("tenant_id", input.tenantId)
    .eq("scope_level", input.scopeLevel)
    .eq("scope_ref_id", input.scopeRefId)
    .is("revoked_at", null)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as AccessGrantRow) ?? null;
}

/** Partner tenant ceiling = features for the partner tier grant on that tenant. */
export async function resolveTenantCeiling(tenantId: string): Promise<FeatureMap | undefined> {
  const grant = await findActiveGrant({
    tenantId,
    scopeLevel: "tenant",
    scopeRefId: tenantId,
  });
  if (!grant?.tier_id) return undefined;
  const defs = await loadFeatureDefs();
  const tierFeatures = await loadTierFeatures(grant.tier_id);
  return resolveFeatures({
    featureDefs: defs,
    tierFeatures,
    grantOverrides: grant.feature_overrides ?? {},
  });
}

export async function resolveScopeFeatures(input: {
  tenantId: string;
  scopeLevel: string;
  scopeRefId: string;
  /** When no DB grant, use this tier key (default user) */
  fallbackTierKey?: string;
}): Promise<{ features: FeatureMap; grant: AccessGrantRow | null; db: boolean }> {
  const defs = await loadFeatureDefs();
  const grant = await findActiveGrant(input);
  let tierFeatures: FeatureMap = {};
  if (grant?.tier_id) {
    tierFeatures = await loadTierFeatures(grant.tier_id);
  } else if (supabaseConfigured()) {
    const tier = await loadTierByKey(input.fallbackTierKey ?? "user");
    if (tier) tierFeatures = await loadTierFeatures(tier.id);
  }
  const ceiling = await resolveTenantCeiling(input.tenantId);
  const features = resolveFeatures({
    featureDefs: defs,
    tierFeatures,
    grantOverrides: grant?.feature_overrides ?? {},
    tenantCeiling: ceiling,
  });
  return { features, grant, db: supabaseConfigured() };
}

export async function createGrant(input: {
  tenantId: string;
  scopeLevel: string;
  scopeRefId: string;
  tierKey: string;
  featureOverrides?: FeatureMap;
  grantedBy: string;
  grantedByKind: GrantedByKind;
  reason?: string;
  expiresAt?: string | null;
}): Promise<AccessGrantRow> {
  const sb = getServiceSupabase();
  if (!sb) throw new Error("Supabase not configured");

  if (input.grantedByKind === "partner_admin") {
    const { features: actorFeatures } = await resolveScopeFeatures({
      tenantId: input.tenantId,
      scopeLevel: "tenant",
      scopeRefId: input.tenantId,
    });
    const dg = actorFeatures["tenants.delegate_grants"];
    if (!dg || !("bool" in dg) || !dg.bool) {
      throw new Error("FORBIDDEN: partner cannot delegate grants");
    }
  }

  const tier = await loadTierByKey(input.tierKey);
  if (!tier) throw new Error(`Unknown tier: ${input.tierKey}`);

  const row = {
    scope_level: input.scopeLevel,
    scope_ref_id: input.scopeRefId,
    tenant_id: input.tenantId,
    tier_id: tier.id,
    feature_overrides: input.featureOverrides ?? {},
    granted_by: input.grantedBy,
    granted_by_kind: input.grantedByKind,
    reason: input.reason ?? null,
    expires_at: input.expiresAt ?? null,
  };

  const { data, error } = await sb.from("access_grants").insert(row).select("*").single();
  if (error) throw new Error(`createGrant: ${error.message}`);
  return data as AccessGrantRow;
}
