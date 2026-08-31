/**
 * Shared Clerk / tenant access contract for Spectre Ask secrets & projects.
 * Operators (super/admin) are NOT represented here — see spectre_ask_operators.
 *
 * See: _DOCS/_PLANS/LUMINO/SPECTRE_ASK_V1/SECRETS_AND_ACCESS_TIERS_PLAN.md §4
 */

export type TenantAccessType = "partner" | "premium" | "user" | "custom";

/** Fine-grained role within a tenant/org/project scope. */
export type TenantScopeRole =
  | "admin"
  | "member"
  | "read_only"
  | "write"
  | (string & {});

/**
 * One entry in Clerk `publicMetadata.tenant_access[]`.
 * Shape aligned with Lumino partner service `{ type, roles[], id }` dialect.
 */
export type TenantAccessEntry = {
  type: TenantAccessType;
  /** FK to access_tiers.key — e.g. 'partner' | 'premium_2' | 'user' | 'custom:<slug>' */
  tier_key: string;
  /** org / tenant / project id this grant applies to */
  scope_ref_id: string;
  /** Roles within that scope */
  roles: TenantScopeRole[];
  /** ISO 8601; null = no expiry */
  expires_at: string | null;
};

export type OperatorRole = "super" | "admin";

export type GrantedByKind = "operator" | "partner_admin";

export type ScopeLevel = "user" | "org" | "tenant" | "project";

export type FeatureValueType = "boolean" | "integer" | "string" | "enum";

/** Normalized feature value stored in tier_features / overrides */
export type FeatureValue =
  | { bool: boolean }
  | { int: number }
  | { string: string }
  | { enum: string };

export type FeatureMap = Record<string, FeatureValue>;
