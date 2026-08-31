import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { activeTenantAccess, health } from "@spectre-ask/vault-api";
import { cryptoCapabilities } from "@spectre-ask/vault-core";
import { supabaseConfigured } from "@/lib/vault/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  const tenantAccess = activeTenantAccess({
    clerkUserId: userId,
    tenantAccessRaw: user?.publicMetadata?.tenant_access,
  });

  return NextResponse.json({
    ...health(),
    crypto: cryptoCapabilities(),
    supabase: supabaseConfigured(),
    supabase_project: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    actor: {
      userId,
      tenantAccessCount: tenantAccess.length,
      authProvider: "clerk",
    },
  });
}
