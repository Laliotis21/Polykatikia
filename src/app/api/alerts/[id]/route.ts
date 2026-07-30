import { NextResponse } from "next/server";
import { z } from "zod";
import { canAckAlerts, getSessionUser } from "@/lib/auth";
import { ackOrResolveAlert } from "@/domain/alerts";

const bodySchema = z.object({
  status: z.enum(["ACKED", "RESOLVED"]),
});

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH /api/alerts/[id] — ADMIN ack/resolve */
export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAckAlerts(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const alert = await ackOrResolveAlert({
      alertId: id,
      actorId: user.id,
      status: parsed.data.status,
    });

    return NextResponse.json({
      alert: {
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        status: alert.status,
        title: alert.title,
        body: alert.body,
        resolvedAt: alert.resolvedAt?.toISOString() ?? null,
        resolvedById: alert.resolvedById,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "Alert not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
