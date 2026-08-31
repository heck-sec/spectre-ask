import type { StorageAdapter, StorageScope } from "./storage/adapter.js";

export type ProjectRecord = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  createdAt: string;
};

const PREFIX = "projects/";

export async function listProjects(
  adapter: StorageAdapter,
  tenantId: string
): Promise<ProjectRecord[]> {
  const scope: StorageScope = {
    level: "tenant",
    refId: tenantId,
    tenantId,
  };
  const blobs = await adapter.list(scope, PREFIX);
  return blobs.map((b) => b.metadata as unknown as ProjectRecord);
}

export async function putProject(
  adapter: StorageAdapter,
  project: Omit<ProjectRecord, "createdAt"> & { createdAt?: string }
): Promise<ProjectRecord> {
  const scope: StorageScope = {
    level: "tenant",
    refId: project.tenantId,
    tenantId: project.tenantId,
  };
  const record: ProjectRecord = {
    ...project,
    createdAt: project.createdAt ?? new Date().toISOString(),
  };
  await adapter.put(scope, `${PREFIX}${project.id}`, {
    ciphertext: new Uint8Array(0),
    metadata: record as unknown as Record<string, unknown>,
  });
  return record;
}
