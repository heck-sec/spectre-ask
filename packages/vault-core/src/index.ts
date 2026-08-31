export {
  SECRET_ENVELOPE_FORMAT,
  SECRET_ENVELOPE_VERSION,
  createEnvelopeStub,
  type SecretEnvelopeMeta,
} from "./crypto.js";

export type { StorageAdapter, StorageScope, StoredBlob } from "./storage/adapter.js";
export { createPostgresAdapter, createMemoryAdapter } from "./storage/postgres.js";
export { createSqliteAdapter } from "./storage/sqlite.js";
export { runAdapterTestKit } from "./storage/adapter-test-kit.js";

export {
  UNLIMITED,
  clampToCeiling,
  mergeDefaultsThenTierThenOverrides,
  resolveFeatures,
  type FeatureDef,
  type ResolveInput,
} from "./access/resolve.js";

export {
  canUseSecretsFeature,
  createRequireApprovalDecryptGate,
  type DecryptDecision,
  type DecryptGate,
  type DecryptRequest,
} from "./access/decrypt-gate.js";

export { listProjects, putProject, type ProjectRecord } from "./project.js";
