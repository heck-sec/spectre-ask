import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createGrant, isOperator, resolveScopeFeatures } from "@/lib/vault/access";
import { supabaseConfigured } from "@/lib/vault/supabase";
import type { FeatureMap } from "@spectre-ask/access-contract";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenant_id");
  if (!tenantId) return NextResponse.json({ error: "tenant_id required" }, { status: 400 });

  const { features, grant } = await resolveScopeFeatures({
    tenantId,
    scopeLevel: url.searchParams.get("scope_level") || "user",
    scopeRefId: url.searchParams.get("scope_ref_id") || userId,
  });

  return NextResponse.json({ ok: true, features, grant });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!supabaseConfigured()) {
    return NextResponse.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const body = (await req.json()) as {
    tenant_id: string;
    scope_level: string;
    scope_ref_id: string;
    tier_key: string;
    feature_overrides?: FeatureMap;
    reason?: string;
    expires_at?: string | null;
  };

  if (!body.tenant_id || !body.scope_level || !body.scope_ref_id || !body.tier_key) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const op = await isOperator(userId);
  const grantedByKind = op.isOperator ? "operator" : "partner_admin";

  try {
    const grant = await createGrant({
      tenantId: body.tenant_id,
      scopeLevel: body.scope_level,
      scopeRefId: body.scope_ref_id,
      tierKey: body.tier_key,
      featureOverrides: body.feature_overrides,
      grantedBy: userId,
      grantedByKind,
      reason: body.reason,
      expiresAt: body.expires_at,
    });
    return NextResponse.json({ ok: true, grant }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.startsWith("FORBIDDEN") ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
