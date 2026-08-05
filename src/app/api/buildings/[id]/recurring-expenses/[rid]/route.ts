import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  AuthError,
  getSessionUser,
  requireOperator,
} from "@/lib/auth";
import { assertCents } from "@/domain/money";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; rid: string }>;
};

const adminPatchSchema = z
  .object({
    active: z.boolean().optional(),
    amountCents: z.number().int().positive().optional(),
    label: z.string().min(1).max(200).optional(),
    dayOfMonth: z.number().int().min(1).max(28).optional(),
    categoryId: z.string().min(1).optional(),
  })
  .refine(
    (v) =>
      v.active !== undefined ||
      v.amountCents !== undefined ||
      v.label !== undefined ||
      v.dayOfMonth !== undefined ||
      v.categoryId !== undefined,
    { message: "At least one field required" },
  );

const operatorPatchSchema = z.object({
  active: z.boolean(),
});

/**
 * PATCH /api/buildings/:id/recurring-expenses/:rid
 * ADMIN: amount/label/day/category/active.
 * OPERATOR: active only — amount change → 403.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = requireOperator(await getSessionUser());
    const { id: buildingId, rid } = await context.params;

    const existing = await prisma.recurringExpense.findFirst({
      where: { id: rid, buildingId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Recurring expense not found" },
        { status: 404 },
      );
    }

    const json: unknown = await request.json();

    if (user.role !== "ADMIN") {
      // OPERATOR: only { active }
      if (
        json &&
        typeof json === "object" &&
        ("amountCents" in json ||
          "label" in json ||
          "dayOfMonth" in json ||
          "categoryId" in json)
      ) {
        return NextResponse.json(
          { error: "Forbidden: OPERATOR cannot change πάγιο amount or config" },
          { status: 403 },
        );
      }
      const parsed = operatorPatchSchema.safeParse(json);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", issues: parsed.error.issues },
          { status: 400 },
        );
      }
      const row = await prisma.recurringExpense.update({
        where: { id: rid },
        data: { active: parsed.data.active },
        include: {
          category: { select: { id: true, name: true, code: true } },
        },
      });
      return NextResponse.json({
        recurringExpense: {
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
          category: row.category,
        },
      });
    }

    const parsed = adminPatchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const body = parsed.data;
    if (body.amountCents != null) {
      assertCents(body.amountCents);
    }
    if (body.categoryId) {
      const category = await prisma.expenseCategory.findUnique({
        where: { id: body.categoryId },
        select: { id: true },
      });
      if (!category) {
        return NextResponse.json(
          { error: "Category not found" },
          { status: 400 },
        );
      }
    }

    const row = await prisma.recurringExpense.update({
      where: { id: rid },
      data: {
        ...(body.active !== undefined ? { active: body.active } : {}),
        ...(body.amountCents !== undefined
          ? { amountCents: body.amountCents }
          : {}),
        ...(body.label !== undefined ? { label: body.label.trim() } : {}),
        ...(body.dayOfMonth !== undefined
          ? { dayOfMonth: body.dayOfMonth }
          : {}),
        ...(body.categoryId !== undefined
          ? { categoryId: body.categoryId }
          : {}),
      },
      include: {
        category: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({
      recurringExpense: {
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
        category: row.category,
      },
    });
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
