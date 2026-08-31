import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampToCeiling,
  mergeDefaultsThenTierThenOverrides,
  resolveFeatures,
  type FeatureDef,
} from "./resolve.ts";
import type { FeatureMap } from "@spectre-ask/access-contract";

const defs: FeatureDef[] = [
  { key: "api.custom_endpoints", valueType: "boolean", defaultValue: { bool: false } },
  { key: "secrets.max_count", valueType: "integer", defaultValue: { int: 25 } },
  {
    key: "secrets.access",
    valueType: "enum",
    defaultValue: { enum: "read" },
    enumValues: ["read_write", "read", "none"],
  },
];

describe("resolveFeatures", () => {
  it("applies defaults then tier then overrides", () => {
    const tier: FeatureMap = {
      "api.custom_endpoints": { bool: true },
      "secrets.max_count": { int: 500 },
    };
    const overrides: FeatureMap = {
      "secrets.max_count": { int: 100 },
    };
    const out = mergeDefaultsThenTierThenOverrides(defs, tier, overrides);
    assert.deepEqual(out["api.custom_endpoints"], { bool: true });
    assert.deepEqual(out["secrets.max_count"], { int: 100 });
    assert.deepEqual(out["secrets.access"], { enum: "read" });
  });

  it("clamps child to parent ceiling (bool AND, int MIN)", () => {
    const child: FeatureMap = {
      "api.custom_endpoints": { bool: true },
      "secrets.max_count": { int: 5000 },
    };
    const ceiling: FeatureMap = {
      "api.custom_endpoints": { bool: false },
      "secrets.max_count": { int: 500 },
    };
    const clamped = clampToCeiling(child, ceiling, defs);
    assert.deepEqual(clamped["api.custom_endpoints"], { bool: false });
    assert.deepEqual(clamped["secrets.max_count"], { int: 500 });
  });

  it("resolveFeatures applies ceiling after overrides", () => {
    const out = resolveFeatures({
      featureDefs: defs,
      tierFeatures: {
        "api.custom_endpoints": { bool: true },
        "secrets.max_count": { int: 5000 },
      },
      grantOverrides: { "secrets.max_count": { int: 9000 } },
      tenantCeiling: {
        "api.custom_endpoints": { bool: true },
        "secrets.max_count": { int: 500 },
      },
    });
    assert.deepEqual(out["secrets.max_count"], { int: 500 });
    assert.deepEqual(out["api.custom_endpoints"], { bool: true });
  });

  it("does not use rank (no rank field in API)", () => {
    // Structural lock: ResolveInput has no rank — compile-time + runtime shape check
    const input = {
      featureDefs: defs,
      tierFeatures: {},
    };
    assert.equal("rank" in input, false);
    resolveFeatures(input);
  });
});
