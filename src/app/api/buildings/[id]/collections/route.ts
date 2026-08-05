import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  AuthError,
  getSessionUser,
  requireOperator,
  requireViewer,
} from "@/lib/auth";
import {
  listCollectionsForBuilding,
  payCharge,
  PaymentError,
} from "@/domain/payments";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const periodSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

/**
 * GET /api/buildings/:id/collections?year=&month=
 * Charge payment status for operator aging screen. VIEWER+.
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
      year: url.searchParams.get("year") ?? undefined,
      month: url.searchParams.get("month") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid year/month", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const collections = await listCollectionsForBuilding(prisma, {
      buildingId,
      year: parsed.data.year,
      month: parsed.data.month,
    });

    return NextResponse.json({ building, ...collections });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const payBodySchema = z.object({
  chargeId: z.string().min(1),
});

/**
 * POST /api/buildings/:id/collections
 * Operator demo-pay a charge. OPERATOR+.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const user = requireOperator(await getSessionUser());
    const { id: buildingId } = await context.params;

    const json: unknown = await request.json();
    const parsed = payBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const charge = await prisma.transaction.findFirst({
      where: {
        id: parsed.data.chargeId,
        buildingId,
        type: "CHARGE",
      },
      select: { id: true },
    });
    if (!charge) {
      return NextResponse.json({ error: "Charge not found" }, { status: 404 });
    }

    const result = await payCharge(prisma, {
      chargeId: charge.id,
      createdById: user.id,
      description: undefined,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof PaymentError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
