import { NextResponse } from "next/server";
import { z } from "zod";
import { canView, getSessionUser } from "@/lib/auth";
import { listOpenAlerts } from "@/domain/alerts";

const querySchema = z.object({
  buildingId: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

/** GET /api/alerts — list OPEN alerts (VIEWER+) */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canView(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    buildingId: url.searchParams.get("buildingId") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const alerts = await listOpenAlerts(null, {
    buildingId: parsed.data.buildingId,
    limit: parsed.data.limit,
  });

  return NextResponse.json({
    alerts: alerts.map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      status: a.status,
      title: a.title,
      body: a.body,
      buildingId: a.buildingId,
      transactionId: a.transactionId,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}
