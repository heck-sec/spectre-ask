export {
  SECRET_ENVELOPE_FORMAT,
  SECRET_ENVELOPE_VERSION,
  UNLOCK_FORMAT,
  UNLOCK_VERSION,
  DEFAULT_MEMORY_KIB,
  DEFAULT_TIME_COST,
  DEFAULT_PARALLELISM,
  SESSION_TTL_SECONDS,
  aesKeyWrap,
  aesKeyUnwrap,
  deriveKek,
  createUnlockEnvelope,
  unwrapVaultMasterKey,
  encryptPayload,
  decryptPayload,
  sealSecret,
  openSecret,
  cryptoCapabilities,
  type UnlockEnvelope,
  type EncryptedBlob,
  type SecretEnvelope,
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
