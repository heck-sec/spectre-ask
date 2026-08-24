import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "spectre-ask",
    llm: !!process.env.OPENROUTER_API_KEY,
    provider: "openrouter",
    clerk: !!process.env.CLERK_SECRET_KEY,
  });
}
