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

const periodSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

const putBodySchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  readings: z
    .array(
      z.object({
        apartmentId: z.string().min(1),
        units: z.number().int().min(0).max(1_000_000_000),
      }),
    )
    .min(1)
    .max(200),
});

/**
 * GET /api/buildings/:id/meter-readings?year=&month=
 * List apartments + heating meter readings for period. VIEWER+.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    requireViewer(await getSessionUser());
    const { id: buildingId } = await context.params;
    const url = new URL(request.url);
    const parsed = periodSchema.safeParse({
      year: url.searchParams.get("year"),
      month: url.searchParams.get("month"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "year and month query params required (1–12)" },
        { status: 400 },
      );
    }
    const { year, month } = parsed.data;

    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      select: { id: true, name: true, heatingAllocation: true },
    });
    if (!building) {
      return NextResponse.json({ error: "Building not found" }, { status: 404 });
    }

    const usesMeters = building.heatingAllocation === "METER_READINGS";

    const [apartments, readings] = await Promise.all([
      prisma.apartment.findMany({
        where: { buildingId },
        orderBy: { label: "asc" },
        select: {
          id: true,
          label: true,
          heatingShareBps: true,
          floor: true,
        },
      }),
      prisma.heatingMeterReading.findMany({
        where: { buildingId, year, month },
        select: {
          id: true,
          apartmentId: true,
          units: true,
          updatedAt: true,
        },
      }),
    ]);

    const byApt = new Map(readings.map((r) => [r.apartmentId, r]));
    const rows = apartments.map((a) => {
      const reading = byApt.get(a.id);
      return {
        apartmentId: a.id,
        label: a.label,
        heatingShareBps: a.heatingShareBps,
        floor: a.floor,
        units: reading?.units ?? null,
        readingId: reading?.id ?? null,
        updatedAt: reading?.updatedAt?.toISOString() ?? null,
      };
    });

    const missingLabels = usesMeters
      ? rows.filter((r) => r.units === null).map((r) => r.label)
      : [];

    return NextResponse.json({
      building: {
        id: building.id,
        name: building.name,
        heatingAllocation: building.heatingAllocation,
      },
      year,
      month,
      hasAnyReading: readings.length > 0,
      usesMeters,
      missingLabels,
      rows,
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
 * PUT /api/buildings/:id/meter-readings
 * Upsert heating meter units for a period. OPERATOR+.
 * Body: { year, month, readings: [{ apartmentId, units }] }
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const user = requireOperator(await getSessionUser());
    const { id: buildingId } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = putBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const { year, month, readings } = parsed.data;

    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      select: { id: true, heatingAllocation: true },
    });
    if (!building) {
      return NextResponse.json({ error: "Building not found" }, { status: 404 });
    }
    if (building.heatingAllocation !== "METER_READINGS") {
      return NextResponse.json(
        {
          error:
            "Το κτίριο χρησιμοποιεί σταθερά χιλιοστά θέρμανσης· οι ενδείξεις δεν εφαρμόζονται / Building uses fixed heating shares; meter readings are not used",
        },
        { status: 400 },
      );
    }

    const apartmentIds = [...new Set(readings.map((r) => r.apartmentId))];
    const apartments = await prisma.apartment.findMany({
      where: { buildingId, id: { in: apartmentIds } },
      select: { id: true },
    });
    if (apartments.length !== apartmentIds.length) {
      return NextResponse.json(
        { error: "One or more apartments not in this building" },
        { status: 400 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const row of readings) {
        const saved = await tx.heatingMeterReading.upsert({
          where: {
            apartmentId_year_month: {
              apartmentId: row.apartmentId,
              year,
              month,
            },
          },
          update: { units: row.units, buildingId },
          create: {
            buildingId,
            apartmentId: row.apartmentId,
            year,
            month,
            units: row.units,
          },
          select: {
            id: true,
            apartmentId: true,
            units: true,
            year: true,
            month: true,
          },
        });
        results.push(saved);
      }

      await appendAuditLog(
        {
          actorId: user.id,
          action: "HEATING_METER_READINGS_UPSERTED",
          entityType: "Building",
          entityId: buildingId,
          after: {
            year,
            month,
            count: results.length,
            readings: results.map((r) => ({
              apartmentId: r.apartmentId,
              units: r.units,
            })),
          },
        },
        tx,
      );

      return results;
    });

    return NextResponse.json({
      buildingId,
      year,
      month,
      readings: updated,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
