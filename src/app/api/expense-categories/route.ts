import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  AuthError,
  getSessionUser,
  requireOperator,
  requireViewer,
} from "@/lib/auth";
import { appendAuditLog } from "@/domain/audit";

export const runtime = "nodejs";

const allocationMethods = [
  "GENERAL_SHARES",
  "ELEVATOR_SHARES",
  "HEATING_SHARES",
  "EQUAL",
  "MANUAL",
] as const;

const patchSchema = z.object({
  id: z.string().min(1),
  allocationMethod: z.enum(allocationMethods),
});

/**
 * GET /api/expense-categories
 * List categories with allocation methods. VIEWER+.
 */
export async function GET() {
  try {
    requireViewer(await getSessionUser());
    const categories = await prisma.expenseCategory.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        allocationMethod: true,
      },
    });
    return NextResponse.json({ categories });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/expense-categories
 * Update allocation method for a category. OPERATOR+.
 */
export async function PATCH(request: Request) {
  try {
    const user = requireOperator(await getSessionUser());
    const json: unknown = await request.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const existing = await prisma.expenseCategory.findUnique({
      where: { id: parsed.data.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const updated = await prisma.expenseCategory.update({
      where: { id: existing.id },
      data: { allocationMethod: parsed.data.allocationMethod },
    });

    await appendAuditLog({
      actorId: user.id,
      action: "CATEGORY_ALLOCATION_UPDATED",
      entityType: "ExpenseCategory",
      entityId: existing.id,
      before: { allocationMethod: existing.allocationMethod },
      after: { allocationMethod: updated.allocationMethod },
    });

    return NextResponse.json({
      category: {
        id: updated.id,
        name: updated.name,
        code: updated.code,
        allocationMethod: updated.allocationMethod,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
