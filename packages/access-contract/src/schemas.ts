import { z } from "zod";

export const TenantAccessTypeSchema = z.enum([
  "partner",
  "premium",
  "user",
  "custom",
]);

export const TenantAccessEntrySchema = z.object({
  type: TenantAccessTypeSchema,
  tier_key: z.string().min(1),
  scope_ref_id: z.string().min(1),
  roles: z.array(z.string().min(1)).min(1),
  /** ISO-8601 string or null; keep permissive — Clerk metadata varies */
  expires_at: z.union([z.string().min(1), z.null()]),
});

export const TenantAccessListSchema = z.array(TenantAccessEntrySchema);

export const OperatorRoleSchema = z.enum(["super", "admin"]);

export const GrantedByKindSchema = z.enum(["operator", "partner_admin"]);

export const ScopeLevelSchema = z.enum(["user", "org", "tenant", "project"]);

export const FeatureValueSchema = z.union([
  z.object({ bool: z.boolean() }),
  z.object({ int: z.number().int() }),
  z.object({ string: z.string() }),
  z.object({ enum: z.string() }),
]);

export const FeatureMapSchema = z.record(z.string(), FeatureValueSchema);

/** Parse Clerk publicMetadata.tenant_access; returns [] if missing/invalid shape. */
export function parseTenantAccess(raw: unknown): z.infer<typeof TenantAccessListSchema> {
  const result = TenantAccessListSchema.safeParse(raw ?? []);
  return result.success ? result.data : [];
}

/** True when expires_at is set and already in the past. */
export function isTenantAccessExpired(
  entry: z.infer<typeof TenantAccessEntrySchema>,
  now: Date = new Date()
): boolean {
  if (entry.expires_at == null) return false;
  return Date.parse(entry.expires_at) <= now.getTime();
}
