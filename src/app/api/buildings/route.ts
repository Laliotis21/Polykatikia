import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, getSessionUser, requireViewer } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/buildings
 * List buildings for operator select. VIEWER+.
 */
export async function GET() {
  try {
    requireViewer(await getSessionUser());
    const buildings = await prisma.building.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, address: true },
    });
    return NextResponse.json({ buildings });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
