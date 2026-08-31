/**
 * Feature entitlement ≠ decrypt authorization.
 * Having secrets.max_count / project write does NOT imply plaintext reveal.
 */

export type DecryptRequest = {
  actorUserId: string;
  tenantId: string;
  secretId: string;
  reason: string;
};

export type DecryptDecision =
  | { action: "allow"; approvalToken?: string }
  | { action: "deny"; reason: string }
  | { action: "require_approval"; approvalId: string; deepLink?: string };

export type DecryptGate = {
  /** Evaluate whether plaintext may be returned for this secret now. */
  evaluate(req: DecryptRequest): Promise<DecryptDecision>;
};

/** Stub: always require approval — forces callers to wire a real gate. */
export function createRequireApprovalDecryptGate(): DecryptGate {
  return {
    async evaluate(req) {
      return {
        action: "require_approval",
        approvalId: `pending:${req.tenantId}:${req.secretId}`,
        deepLink: undefined,
      };
    },
  };
}

/**
 * Entitlement check for "may use secrets features" — not decrypt.
 * Call this before list/create/update metadata; never as a substitute for DecryptGate.
 */
export function canUseSecretsFeature(
  features: Record<string, { bool?: boolean; int?: number }>,
  featureKey = "secrets.max_count"
): boolean {
  const v = features[featureKey];
  if (!v) return false;
  if (typeof v.bool === "boolean") return v.bool;
  if (typeof v.int === "number") return v.int === -1 || v.int > 0;
  return false;
}
