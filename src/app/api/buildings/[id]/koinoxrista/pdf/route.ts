import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  getSessionUser,
  requireViewer,
  AuthError,
} from "@/lib/auth";
import { previewKoinoxrista } from "@/domain/koinoxrista";
import { mapKoinoxristaHttpError } from "@/domain/koinoxrista/http";
import {
  koinoxristaPdfFilename,
  renderKoinoxristaPdf,
} from "@/domain/koinoxrista/pdf";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const periodSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

/**
 * GET /api/buildings/:id/koinoxrista/pdf?year=&month=
 * Multi-page PDF: building summary + one page per apartment. VIEWER+.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    requireViewer(await getSessionUser());
    const { id: buildingId } = await context.params;

    const building = await prisma.building.findUnique({
      where: { id: buildingId },
      select: { id: true, name: true, address: true },
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
        {
          error: "year and month query params required",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const { year, month } = parsed.data;

    const [preview, apartments] = await Promise.all([
      previewKoinoxrista(prisma, { buildingId, year, month }),
      prisma.apartment.findMany({
        where: { buildingId },
        select: {
          id: true,
          owners: {
            where: { toDate: null },
            take: 1,
            select: { owner: { select: { name: true } } },
          },
        },
      }),
    ]);

    const ownersByApartmentId: Record<string, string | null> = {};
    for (const apt of apartments) {
      ownersByApartmentId[apt.id] = apt.owners[0]?.owner.name ?? null;
    }

    const pdfBuffer = await renderKoinoxristaPdf({
      building: { name: building.name, address: building.address },
      preview,
      ownersByApartmentId,
    });

    const filename = koinoxristaPdfFilename({ year, month });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const mapped = mapKoinoxristaHttpError(err);
    if (mapped) {
      return NextResponse.json({ error: mapped.error }, { status: mapped.status });
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    console.error("[koinoxrista/pdf]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
