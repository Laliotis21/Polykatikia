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

type RouteContext = {
  params: Promise<{ id: string }>;
};

const emptyToNull = (v: unknown) => (v === "" ? null : v);

const ownerPatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.preprocess(
    emptyToNull,
    z.string().email().max(160).nullable().optional(),
  ),
  phone: z.preprocess(
    emptyToNull,
    z.string().trim().max(40).nullable().optional(),
  ),
});

const patchBodySchema = z.object({
  apartmentId: z.string().min(1),
  shareBps: z.number().int().min(0).max(10000).optional(),
  elevatorShareBps: z.number().int().min(0).max(10000).optional(),
  heatingShareBps: z.number().int().min(0).max(10000).optional(),
  floor: z.number().int().min(-5).max(100).nullable().optional(),
  label: z.string().min(1).max(64).optional(),
  owner: ownerPatchSchema.optional(),
});

const createBodySchema = z.object({
  label: z.string().trim().min(1).max(64),
  shareBps: z.number().int().min(0).max(10000).default(0),
  elevatorShareBps: z.number().int().min(0).max(10000).default(0),
  heatingShareBps: z.number().int().min(0).max(10000).default(0),
  floor: z.number().int().min(-5).max(100).nullable().optional(),
  owner: ownerPatchSchema.optional(),
});

/**
 * GET /api/buildings/:id/apartments
 * List apartments with χιλιοστά. VIEWER+.
 */
export async function GET(_request: Request, context: RouteContext) {
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

    const apartments = await prisma.apartment.findMany({
      where: { buildingId },
      orderBy: { label: "asc" },
      select: {
        id: true,
        label: true,
        shareBps: true,
        elevatorShareBps: true,
        heatingShareBps: true,
        floor: true,
        owners: {
          where: { toDate: null },
          take: 1,
          include: {
            owner: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      building,
      apartments: apartments.map((a) => ({
        id: a.id,
        label: a.label,
        shareBps: a.shareBps,
        elevatorShareBps: a.elevatorShareBps,
        heatingShareBps: a.heatingShareBps,
        floor: a.floor,
        owner: a.owners[0]?.owner ?? null,
      })),
      totals: {
        shareBps: apartments.reduce((s, a) => s + a.shareBps, 0),
        elevatorShareBps: apartments.reduce((s, a) => s + a.elevatorShareBps, 0),
        heatingShareBps: apartments.reduce((s, a) => s + a.heatingShareBps, 0),
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

/**
 * POST /api/buildings/:id/apartments
 * Create apartment with χιλιοστά (+ optional owner). OPERATOR+.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const user = requireOperator(await getSessionUser());
    const { id: buildingId } = await context.params;
    const json: unknown = await request.json();
    const parsed = createBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      select: { id: true },
    });
    if (!building) {
      return NextResponse.json({ error: "Building not found" }, { status: 404 });
    }

    const existingLabel = await prisma.apartment.findFirst({
      where: { buildingId, label: parsed.data.label },
      select: { id: true },
    });
    if (existingLabel) {
      return NextResponse.json(
        { error: `Υπάρχει ήδη διαμέρισμα «${parsed.data.label}»` },
        { status: 409 },
      );
    }

    const apartment = await prisma.apartment.create({
      data: {
        buildingId,
        label: parsed.data.label,
        shareBps: parsed.data.shareBps,
        elevatorShareBps: parsed.data.elevatorShareBps,
        heatingShareBps: parsed.data.heatingShareBps,
        floor: parsed.data.floor ?? null,
      },
    });

    let ownerPayload: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
    } | null = null;

    if (parsed.data.owner?.name?.trim()) {
      const owner = await prisma.owner.create({
        data: {
          name: parsed.data.owner.name.trim(),
          email: parsed.data.owner.email ?? null,
          phone: parsed.data.owner.phone ?? null,
        },
        select: { id: true, name: true, email: true, phone: true },
      });
      await prisma.apartmentOwner.create({
        data: {
          apartmentId: apartment.id,
          ownerId: owner.id,
          fromDate: new Date(),
        },
      });
      ownerPayload = owner;
    }

    await appendAuditLog({
      actorId: user.id,
      action: "APARTMENT_CREATED",
      entityType: "Apartment",
      entityId: apartment.id,
      after: {
        label: apartment.label,
        shareBps: apartment.shareBps,
        elevatorShareBps: apartment.elevatorShareBps,
        heatingShareBps: apartment.heatingShareBps,
        floor: apartment.floor,
        ownerId: ownerPayload?.id ?? null,
      },
    });

    return NextResponse.json(
      {
        apartment: {
          id: apartment.id,
          label: apartment.label,
          shareBps: apartment.shareBps,
          elevatorShareBps: apartment.elevatorShareBps,
          heatingShareBps: apartment.heatingShareBps,
          floor: apartment.floor,
          owner: ownerPayload,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/buildings/:id/apartments
 * Update χιλιοστά / floor / owner contact for one apartment. OPERATOR+.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = requireOperator(await getSessionUser());
    const { id: buildingId } = await context.params;
    const json: unknown = await request.json();
    const parsed = patchBodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const apt = await prisma.apartment.findFirst({
      where: { id: parsed.data.apartmentId, buildingId },
    });
    if (!apt) {
      return NextResponse.json({ error: "Apartment not found" }, { status: 404 });
    }

    const data = {
      ...(parsed.data.shareBps !== undefined
        ? { shareBps: parsed.data.shareBps }
        : {}),
      ...(parsed.data.elevatorShareBps !== undefined
        ? { elevatorShareBps: parsed.data.elevatorShareBps }
        : {}),
      ...(parsed.data.heatingShareBps !== undefined
        ? { heatingShareBps: parsed.data.heatingShareBps }
        : {}),
      ...(parsed.data.floor !== undefined ? { floor: parsed.data.floor } : {}),
      ...(parsed.data.label !== undefined ? { label: parsed.data.label } : {}),
    };

    const updated =
      Object.keys(data).length > 0
        ? await prisma.apartment.update({
            where: { id: apt.id },
            data,
          })
        : apt;

    let ownerPayload: {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
    } | null = null;

    if (parsed.data.owner) {
      const ownerPatch = parsed.data.owner;
      const link = await prisma.apartmentOwner.findFirst({
        where: { apartmentId: apt.id, toDate: null },
        include: {
          owner: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
      });

      if (link) {
        const before = link.owner;
        const owner = await prisma.owner.update({
          where: { id: link.ownerId },
          data: {
            ...(ownerPatch.name !== undefined ? { name: ownerPatch.name } : {}),
            ...(ownerPatch.email !== undefined
              ? { email: ownerPatch.email }
              : {}),
            ...(ownerPatch.phone !== undefined
              ? { phone: ownerPatch.phone }
              : {}),
          },
          select: { id: true, name: true, email: true, phone: true },
        });
        ownerPayload = owner;
        await appendAuditLog({
          actorId: user.id,
          action: "OWNER_CONTACT_UPDATED",
          entityType: "Owner",
          entityId: owner.id,
          before,
          after: owner,
        });
      } else {
        const name =
          ownerPatch.name?.trim() ||
          `Ιδιοκτήτης ${updated.label}`;
        const owner = await prisma.owner.create({
          data: {
            name,
            email: ownerPatch.email ?? null,
            phone: ownerPatch.phone ?? null,
          },
          select: { id: true, name: true, email: true, phone: true },
        });
        await prisma.apartmentOwner.create({
          data: {
            apartmentId: apt.id,
            ownerId: owner.id,
            fromDate: new Date(),
          },
        });
        ownerPayload = owner;
        await appendAuditLog({
          actorId: user.id,
          action: "OWNER_CONTACT_CREATED",
          entityType: "Owner",
          entityId: owner.id,
          after: { ...owner, apartmentId: apt.id },
        });
      }
    } else {
      const link = await prisma.apartmentOwner.findFirst({
        where: { apartmentId: apt.id, toDate: null },
        include: {
          owner: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
      });
      ownerPayload = link?.owner ?? null;
    }

    if (Object.keys(data).length > 0) {
      await appendAuditLog({
        actorId: user.id,
        action: "APARTMENT_SHARES_UPDATED",
        entityType: "Apartment",
        entityId: apt.id,
        before: {
          shareBps: apt.shareBps,
          elevatorShareBps: apt.elevatorShareBps,
          heatingShareBps: apt.heatingShareBps,
          floor: apt.floor,
        },
        after: {
          shareBps: updated.shareBps,
          elevatorShareBps: updated.elevatorShareBps,
          heatingShareBps: updated.heatingShareBps,
          floor: updated.floor,
        },
      });
    }

    return NextResponse.json({
      apartment: {
        id: updated.id,
        label: updated.label,
        shareBps: updated.shareBps,
        elevatorShareBps: updated.elevatorShareBps,
        heatingShareBps: updated.heatingShareBps,
        floor: updated.floor,
        owner: ownerPayload,
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
