import type { StorageAdapter, StorageScope, StoredBlob } from "./adapter.js";

/**
 * Minimal contract checks for third-party StorageAdapter implementations.
 * Run against any adapter before shipping a BYO database.
 */
export async function runAdapterTestKit(adapter: StorageAdapter): Promise<void> {
  const scope: StorageScope = {
    level: "project",
    refId: "proj_test",
    tenantId: "tenant_test",
  };
  const key = "secrets/demo";

  const put = await adapter.put(scope, key, {
    ciphertext: new TextEncoder().encode("cipher"),
    metadata: { label: "demo" },
  });
  if (put.key !== key) throw new Error("put: key mismatch");

  const got = await adapter.get(scope, key);
  if (!got) throw new Error("get: missing after put");

  const listed = await adapter.list(scope, "secrets/");
  if (!listed.some((b: StoredBlob) => b.key === key)) {
    throw new Error("list: missing key");
  }

  const deleted = await adapter.delete(scope, key);
  if (!deleted) throw new Error("delete: expected true");

  const after = await adapter.get(scope, key);
  if (after) throw new Error("get: expected null after delete");
}
