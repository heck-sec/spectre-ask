import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { health } from "@spectre-ask/vault-api";
import { cryptoCapabilities } from "@spectre-ask/vault-core";
import { activeTenantAccess } from "@spectre-ask/vault-api";

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
    actor: {
      userId,
      tenantAccessCount: tenantAccess.length,
      authProvider: "clerk",
    },
  });
}
