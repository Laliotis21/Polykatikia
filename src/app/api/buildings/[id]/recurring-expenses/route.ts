import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  AuthError,
  getSessionUser,
  requireAdmin,
  requireViewer,
} from "@/lib/auth";
import { assertCents } from "@/domain/money";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const createSchema = z.object({
  categoryId: z.string().min(1),
  label: z.string().min(1).max(200),
  amountCents: z.number().int().positive(),
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  active: z.boolean().optional(),
});

function serializeRecurring(row: {
  id: string;
  buildingId: string;
  categoryId: string;
  label: string;
  amountCents: number;
  dayOfMonth: number;
  active: boolean;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  category?: { id: string; name: string; code: string | null } | null;
}) {
  return {
    id: row.id,
    buildingId: row.buildingId,
    categoryId: row.categoryId,
    label: row.label,
    amountCents: row.amountCents,
    dayOfMonth: row.dayOfMonth,
    active: row.active,
    createdById: row.createdById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    category: row.category ?? null,
  };
}

/**
 * GET /api/buildings/:id/recurring-expenses
 * List πάγια templates. VIEWER+.
 */
export async function GET(_request: Request, context: RouteContext) {
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

    const rows = await prisma.recurringExpense.findMany({
      where: { buildingId },
      orderBy: [{ active: "desc" }, { label: "asc" }],
      include: {
        category: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({
      recurringExpenses: rows.map(serializeRecurring),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/buildings/:id/recurring-expenses
 * Create πάγιο template. ADMIN only (amount is config).
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const user = requireAdmin(await getSessionUser());
    const { id: buildingId } = await context.params;

    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      select: { id: true },
    });
    if (!building) {
      return NextResponse.json({ error: "Building not found" }, { status: 404 });
    }

    const json: unknown = await request.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const body = parsed.data;
    assertCents(body.amountCents);

    const category = await prisma.expenseCategory.findUnique({
      where: { id: body.categoryId },
      select: { id: true },
    });
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 400 });
    }

    const row = await prisma.recurringExpense.create({
      data: {
        buildingId,
        categoryId: body.categoryId,
        label: body.label.trim(),
        amountCents: body.amountCents,
        dayOfMonth: body.dayOfMonth ?? 1,
        active: body.active ?? true,
        createdById: user.id,
      },
      include: {
        category: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json(
      { recurringExpense: serializeRecurring(row) },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof Error && /Money must be integer|positive/i.test(err.message)) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
