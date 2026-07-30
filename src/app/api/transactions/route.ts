import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AuthError, getSessionUser, requireOperator } from "@/lib/auth";
import { assertCents } from "@/domain/money";
import {
  createTransactionWithIntegrity,
  MismatchJustificationError,
} from "@/domain/transactions";
import type { CreateTransactionResponse } from "@/lib/api-types";

export const runtime = "nodejs";

const createTransactionSchema = z.object({
  buildingId: z.string().min(1),
  type: z.enum(["EXPENSE", "INCOME", "CHARGE"]),
  amountCents: z.number().int().positive(),
  occurredAt: z.string().datetime({ offset: true }).or(z.string().datetime()),
  categoryId: z.string().min(1).optional(),
  apartmentId: z.string().min(1).optional(),
  receiptId: z.string().min(1).optional(),
  description: z.string().max(2000).optional(),
  mismatchJustification: z.string().max(4000).optional(),
});

/**
 * POST /api/transactions
 * Validate → mismatch gate → create Transaction (+ Receipt link) + audit/alerts.
 * OPERATOR+.
 */
export async function POST(request: Request) {
  try {
    const user = requireOperator(await getSessionUser());
    const json: unknown = await request.json();
    const parsed = createTransactionSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const body = parsed.data;
    assertCents(body.amountCents);

    const building = await prisma.building.findUnique({
      where: { id: body.buildingId },
      select: { id: true },
    });
    if (!building) {
      return NextResponse.json({ error: "Building not found" }, { status: 404 });
    }

    const result = await createTransactionWithIntegrity(prisma, {
      buildingId: body.buildingId,
      type: body.type,
      amountCents: body.amountCents,
      occurredAt: new Date(body.occurredAt),
      categoryId: body.categoryId,
      apartmentId: body.apartmentId,
      receiptId: body.receiptId,
      description: body.description,
      mismatchJustification: body.mismatchJustification,
      createdById: user.id,
    });

    const response: CreateTransactionResponse = {
      transaction: {
        id: result.transaction.id,
        amountCents: result.transaction.amountCents,
        type: result.transaction.type,
        buildingId: result.transaction.buildingId,
        receiptId: result.transaction.receiptId,
        mismatchJustification: result.transaction.mismatchJustification,
        occurredAt: result.transaction.occurredAt.toISOString(),
      },
      alerts: result.alerts,
      anomalyFired: result.anomalyFired,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof MismatchJustificationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof Error) {
      if (
        /Receipt not found|does not belong|already linked|positive integer|Money must be integer/i.test(
          err.message,
        )
      ) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
