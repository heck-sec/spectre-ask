import type { FeatureMap, FeatureValue } from "@spectre-ask/access-contract";

/**
 * Entitlement resolution (locked):
 * feature defaults → tier entitlements → scoped grant overrides → parent/tenant ceiling
 *
 * `rank` is NEVER used here.
 * Child grants must clamp to ≤ parent (booleans AND, integers MIN, enums ⊆).
 */

export type FeatureDef = {
  key: string;
  valueType: "boolean" | "integer" | "string" | "enum";
  defaultValue: FeatureValue;
  /** For enum: allowed values ordered most → least permissive (optional) */
  enumValues?: string[];
};

export type ResolveInput = {
  featureDefs: FeatureDef[];
  /** tier_features for the grant's tier (may be empty) */
  tierFeatures: FeatureMap;
  /** access_grants.feature_overrides */
  grantOverrides?: FeatureMap;
  /**
   * Parent partner / tenant capability ceiling.
   * If omitted, no clamp (platform root grant).
   */
  tenantCeiling?: FeatureMap;
};

function isBool(v: FeatureValue): v is { bool: boolean } {
  return "bool" in v;
}
function isInt(v: FeatureValue): v is { int: number } {
  return "int" in v;
}
function isEnum(v: FeatureValue): v is { enum: string } {
  return "enum" in v;
}
function isString(v: FeatureValue): v is { string: string } {
  return "string" in v;
}

/** Unlimited sentinel for integer quotas */
export const UNLIMITED = -1;

export function mergeDefaultsThenTierThenOverrides(
  defs: FeatureDef[],
  tierFeatures: FeatureMap,
  overrides: FeatureMap = {}
): FeatureMap {
  const out: FeatureMap = {};
  for (const def of defs) {
    out[def.key] =
      overrides[def.key] ?? tierFeatures[def.key] ?? def.defaultValue;
  }
  // Allow override-only keys not in catalog? No — stick to catalog for safety.
  return out;
}

/**
 * Clamp child so it cannot exceed parent.
 * - bool: AND
 * - int: MIN (treat -1 as unlimited on parent only; child -1 becomes parent cap if parent finite)
 * - enum: pick more restrictive if enumValues ordered; else require equality with parent
 * - string: child must equal parent unless parent allows any (not modeled yet) — require equality
 */
export function clampToCeiling(child: FeatureMap, ceiling: FeatureMap, defs: FeatureDef[]): FeatureMap {
  const byKey = new Map(defs.map((d) => [d.key, d]));
  const out: FeatureMap = { ...child };

  for (const [key, parentVal] of Object.entries(ceiling)) {
    const childVal = out[key];
    if (childVal == null) {
      out[key] = parentVal;
      continue;
    }
    const def = byKey.get(key);

    if (isBool(parentVal) && isBool(childVal)) {
      out[key] = { bool: parentVal.bool && childVal.bool };
      continue;
    }
    if (isInt(parentVal) && isInt(childVal)) {
      out[key] = { int: minQuota(childVal.int, parentVal.int) };
      continue;
    }
    if (isEnum(parentVal) && isEnum(childVal)) {
      out[key] = {
        enum: moreRestrictiveEnum(childVal.enum, parentVal.enum, def?.enumValues),
      };
      continue;
    }
    if (isString(parentVal) && isString(childVal)) {
      // Child cannot invent a different string capability than parent allows
      out[key] = childVal.string === parentVal.string ? childVal : parentVal;
      continue;
    }
    // Type mismatch → fail closed to parent
    out[key] = parentVal;
  }

  return out;
}

function minQuota(child: number, parent: number): number {
  if (parent === UNLIMITED) return child;
  if (child === UNLIMITED) return parent;
  return Math.min(child, parent);
}

function moreRestrictiveEnum(
  child: string,
  parent: string,
  order?: string[]
): string {
  if (!order?.length) {
    return child === parent ? child : parent;
  }
  const ci = order.indexOf(child);
  const pi = order.indexOf(parent);
  if (ci < 0) return parent;
  if (pi < 0) return child;
  // Lower index = more permissive → pick higher index (more restrictive), but not beyond parent
  return order[Math.max(ci, pi)]!;
}

export function resolveFeatures(input: ResolveInput): FeatureMap {
  const merged = mergeDefaultsThenTierThenOverrides(
    input.featureDefs,
    input.tierFeatures,
    input.grantOverrides ?? {}
  );
  if (!input.tenantCeiling) return merged;
  return clampToCeiling(merged, input.tenantCeiling, input.featureDefs);
}
