/**
 * Envelope format constants — aligned with vault-v2 secret-envelope-contract.
 * Real Argon2id + AES-256-GCM lives in runtime later; this package owns the contract.
 */

export const SECRET_ENVELOPE_FORMAT = "hecksec.vault.secret" as const;
export const SECRET_ENVELOPE_VERSION = 1 as const;

export type SecretEnvelopeMeta = {
  format: typeof SECRET_ENVELOPE_FORMAT;
  version: typeof SECRET_ENVELOPE_VERSION;
  label: string;
  type: string;
  project?: string;
  tags?: string[];
};

/** Placeholder — full crypto port from vault-v2/runtime comes next. */
export function createEnvelopeStub(meta: Omit<SecretEnvelopeMeta, "format" | "version">): SecretEnvelopeMeta {
  return {
    format: SECRET_ENVELOPE_FORMAT,
    version: SECRET_ENVELOPE_VERSION,
    ...meta,
  };
}
