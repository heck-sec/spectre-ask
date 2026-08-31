import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  canUseSecretsFeature,
  createRequireApprovalDecryptGate,
  sealSecret,
  type SecretEnvelope,
} from "@spectre-ask/vault-core";
import { resolveScopeFeatures } from "@/lib/vault/access";
import { getVaultStorage } from "@/lib/vault/supabase";

const PREFIX = "secrets/";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenant_id") || userId;
  const projectId = url.searchParams.get("project_id") || "default";

  const { features } = await resolveScopeFeatures({
    tenantId,
    scopeLevel: "project",
    scopeRefId: projectId,
  });

  if (!canUseSecretsFeature(features as Record<string, { bool?: boolean; int?: number }>)) {
    return NextResponse.json({ error: "FORBIDDEN: secrets feature not entitled" }, { status: 403 });
  }

  const storage = getVaultStorage();
  const blobs = await storage.list(
    { tenantId, level: "project", refId: projectId },
    PREFIX
  );

  // Metadata only — never ciphertext or plaintext
  const items = blobs.map((b) => ({
    id: b.key.replace(PREFIX, ""),
    metadata: b.metadata,
    updatedAt: b.updatedAt,
  }));

  return NextResponse.json({ ok: true, items, count: items.length });
}

/**
 * Create a sealed secret. Requires session_vmk_b64 (base64 VMK from unlock session).
 * Decrypt still requires separate reveal gate — this only stores ciphertext.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    tenant_id?: string;
    project_id?: string;
    session_vmk_b64: string;
    metadata: Record<string, unknown>;
    payload: Record<string, unknown>;
    secret_id?: string;
  };

  if (!body.session_vmk_b64 || !body.payload) {
    return NextResponse.json({ error: "session_vmk_b64 and payload required" }, { status: 400 });
  }

  const tenantId = body.tenant_id || userId;
  const projectId = body.project_id || "default";

  const { features } = await resolveScopeFeatures({
    tenantId,
    scopeLevel: "project",
    scopeRefId: projectId,
  });
  if (!canUseSecretsFeature(features as Record<string, { bool?: boolean; int?: number }>)) {
    return NextResponse.json({ error: "FORBIDDEN: secrets feature not entitled" }, { status: 403 });
  }

  const vmk = new Uint8Array(Buffer.from(body.session_vmk_b64, "base64"));
  const sealed: SecretEnvelope = await sealSecret({
    vmk,
    secretId: body.secret_id,
    metadata: body.metadata ?? {},
    payload: body.payload,
  });

  const storage = getVaultStorage();
  await storage.put(
    { tenantId, level: "project", refId: projectId },
    `${PREFIX}${sealed.id}`,
    {
      ciphertext: new TextEncoder().encode(JSON.stringify(sealed.encrypted)),
      metadata: {
        id: sealed.id,
        ...sealed.metadata,
        format: sealed.format,
        encryption_version: sealed.encryption_version,
      },
    }
  );

  // Entitlement to store ≠ permission to reveal
  const gate = createRequireApprovalDecryptGate();
  const decryptHint = await gate.evaluate({
    actorUserId: userId,
    tenantId,
    secretId: sealed.id,
    reason: "created; reveal requires separate approval",
  });

  return NextResponse.json(
    {
      ok: true,
      id: sealed.id,
      metadata: sealed.metadata,
      decrypt_gate: decryptHint,
    },
    { status: 201 }
  );
}
