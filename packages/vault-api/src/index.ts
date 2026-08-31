import {
  isTenantAccessExpired,
  parseTenantAccess,
  type TenantAccessEntry,
} from "@spectre-ask/access-contract";
import {
  canUseSecretsFeature,
  createRequireApprovalDecryptGate,
  resolveFeatures,
  type DecryptDecision,
  type FeatureDef,
  type DecryptRequest,
} from "@spectre-ask/vault-core";
import type { FeatureMap } from "@spectre-ask/access-contract";

/**
 * Thin HTTP-facing helpers for Spectre Ask routes.
 * Clerk auth stays in the Next.js app (auth()); this package stays framework-light.
 */

export type ActorContext = {
  clerkUserId: string;
  /** Raw Clerk publicMetadata.tenant_access */
  tenantAccessRaw?: unknown;
  /** True if row exists in spectre_ask_operators */
  isOperator?: boolean;
  operatorRole?: "super" | "admin";
};

export function activeTenantAccess(
  ctx: ActorContext,
  now: Date = new Date()
): TenantAccessEntry[] {
  return parseTenantAccess(ctx.tenantAccessRaw).filter(
    (e) => !isTenantAccessExpired(e, now)
  );
}

/** Resolve effective features for a grant snapshot (caller loads tier/ceiling from DB). */
export function resolveActorFeatures(input: {
  featureDefs: FeatureDef[];
  tierFeatures: FeatureMap;
  grantOverrides?: FeatureMap;
  tenantCeiling?: FeatureMap;
}): FeatureMap {
  return resolveFeatures(input);
}

export function assertSecretsFeatureAllowed(features: FeatureMap): void {
  if (!canUseSecretsFeature(features as Record<string, { bool?: boolean; int?: number }>)) {
    throw new Error("FORBIDDEN: secrets feature not entitled");
  }
}

const decryptGate = createRequireApprovalDecryptGate();

export async function evaluateDecrypt(req: DecryptRequest): Promise<DecryptDecision> {
  return decryptGate.evaluate(req);
}

export type HealthPayload = {
  service: "spectre-ask-vault-api";
  version: string;
  ok: true;
};

export function health(): HealthPayload {
  return {
    service: "spectre-ask-vault-api",
    version: "0.1.0",
    ok: true,
  };
}
