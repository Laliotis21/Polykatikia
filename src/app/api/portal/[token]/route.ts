import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { listChargesForPortalToken } from "@/domain/payments";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

/**
 * GET /api/portal/[token]
 * Public demo owner portal — charges for apartments linked to portalToken.
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    if (!token || token.length < 8) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const payload = await listChargesForPortalToken(prisma, token);
    if (!payload) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
