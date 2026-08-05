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

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().max(240).nullable().optional(),
});

const patchSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().trim().min(1).max(120).optional(),
    address: z.string().trim().max(240).nullable().optional(),
  })
  .refine((b) => b.name !== undefined || b.address !== undefined, {
    message: "At least one of name or address is required",
  });

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

/**
 * POST /api/buildings
 * Create building (name + optional address). OPERATOR+.
 */
export async function POST(request: Request) {
  try {
    const user = requireOperator(await getSessionUser());
    const json: unknown = await request.json();
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const building = await prisma.building.create({
      data: {
        name: parsed.data.name,
        address: parsed.data.address ?? null,
      },
      select: { id: true, name: true, address: true },
    });

    await appendAuditLog({
      actorId: user.id,
      action: "BUILDING_CREATED",
      entityType: "Building",
      entityId: building.id,
      after: building,
    });

    return NextResponse.json({ building }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/buildings
 * Update building name/address. OPERATOR+.
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

    const existing = await prisma.building.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, name: true, address: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Building not found" }, { status: 404 });
    }

    const building = await prisma.building.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.address !== undefined
          ? { address: parsed.data.address }
          : {}),
      },
      select: { id: true, name: true, address: true },
    });

    await appendAuditLog({
      actorId: user.id,
      action: "BUILDING_UPDATED",
      entityType: "Building",
      entityId: building.id,
      before: existing,
      after: building,
    });

    return NextResponse.json({ building });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
