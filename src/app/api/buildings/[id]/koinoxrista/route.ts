import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getSessionUser,
  requireOperator,
  requireViewer,
} from "@/lib/auth";
import {
  finalizeKoinoxristaSettlement,
  previewKoinoxrista,
} from "@/domain/koinoxrista";
import { mapKoinoxristaHttpError } from "@/domain/koinoxrista/http";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const periodSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

/**
 * GET /api/buildings/:id/koinoxrista?year=&month=
 * Preview κοινόχρηστα allocation for a calendar month. VIEWER+.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    requireViewer(await getSessionUser());
    const { id: buildingId } = await context.params;

    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      select: { id: true, name: true },
    });
    if (!building) {
      return NextResponse.json({ error: "Building not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const parsed = periodSchema.safeParse({
      year: url.searchParams.get("year"),
      month: url.searchParams.get("month"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "year and month query params required", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const preview = await previewKoinoxrista(prisma, {
      buildingId,
      year: parsed.data.year,
      month: parsed.data.month,
    });

    return NextResponse.json({ building, ...preview });
  } catch (err) {
    const mapped = mapKoinoxristaHttpError(err);
    if (mapped) {
      return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/buildings/:id/koinoxrista
 * Finalize settlement + create CHARGE txs per apartment. OPERATOR+.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const user = requireOperator(await getSessionUser());
    const { id: buildingId } = await context.params;

    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      select: { id: true },
    });
    if (!building) {
      return NextResponse.json({ error: "Building not found" }, { status: 404 });
    }

    const json: unknown = await request.json();
    const parsed = periodSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const result = await finalizeKoinoxristaSettlement(prisma, {
      buildingId,
      year: parsed.data.year,
      month: parsed.data.month,
      createdById: user.id,
    });

    return NextResponse.json({
      settlementId: result.settlementId,
      totalCents: result.totalCents,
      chargeTransactionIds: result.chargeTransactionIds,
      statement: result.statement,
    });
  } catch (err) {
    const mapped = mapKoinoxristaHttpError(err);
    if (mapped) {
      return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
