import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, getSessionUser, requireViewer } from "@/lib/auth";

export const runtime = "nodejs";

const querySchema = z.object({
  type: z.enum(["EXPENSE", "INCOME", "CHARGE"]).optional(),
  categoryId: z.string().min(1).optional(),
  from: z.string().datetime({ offset: true }).or(z.string().datetime()).optional(),
  to: z.string().datetime({ offset: true }).or(z.string().datetime()).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/buildings/:id/transactions
 * List building transactions (filters: type, category, date range). VIEWER+.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    requireViewer(await getSessionUser());
    const { id: buildingId } = await context.params;

    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      select: { id: true },
    });
    if (!building) {
      return NextResponse.json({ error: "Building not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      type: url.searchParams.get("type") ?? undefined,
      categoryId: url.searchParams.get("categoryId") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { type, categoryId, from, to } = parsed.data;

    const rows = await prisma.transaction.findMany({
      where: {
        buildingId,
        ...(type ? { type } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(from || to
          ? {
              occurredAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { occurredAt: "desc" },
      include: {
        category: { select: { id: true, name: true, code: true } },
        receipt: {
          select: {
            id: true,
            ocrAmountCents: true,
            ocrVendor: true,
            status: true,
          },
        },
        alerts: {
          select: { id: true, type: true, severity: true, status: true },
        },
      },
    });

    const transactions = rows.map((tx) => ({
      ...tx,
      occurredAt: tx.occurredAt.toISOString(),
      createdAt: tx.createdAt.toISOString(),
      updatedAt: tx.updatedAt.toISOString(),
      categoryName: tx.category?.name ?? null,
      hasMismatchAlert: tx.alerts.some((a) => a.type === "OCR_MISMATCH"),
      hasAnomalyAlert: tx.alerts.some((a) => a.type === "ANOMALY"),
    }));

    return NextResponse.json({ transactions });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
