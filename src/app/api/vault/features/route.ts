import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { resolveScopeFeatures } from "@/lib/vault/access";
import { supabaseConfigured } from "@/lib/vault/supabase";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenant_id") || userId;
  const scopeLevel = url.searchParams.get("scope_level") || "user";
  const scopeRefId = url.searchParams.get("scope_ref_id") || userId;

  const user = await currentUser();
  const { features, grant, db } = await resolveScopeFeatures({
    tenantId,
    scopeLevel,
    scopeRefId,
  });

  return NextResponse.json({
    ok: true,
    db,
    actor: userId,
    tenant_id: tenantId,
    scope_level: scopeLevel,
    scope_ref_id: scopeRefId,
    features,
    grant_id: grant?.id ?? null,
    tenant_access: user?.publicMetadata?.tenant_access ?? [],
  });
}
