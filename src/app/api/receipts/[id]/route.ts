import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, getSessionUser, requireViewer } from "@/lib/auth";
import type { ReceiptDetail } from "@/lib/api-types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function readOcrMeta(ocrRaw: unknown): {
  ocrDate: string | null;
  confidence: number | null;
} {
  if (!ocrRaw || typeof ocrRaw !== "object") {
    return { ocrDate: null, confidence: null };
  }
  const raw = ocrRaw as Record<string, unknown>;
  const date =
    typeof raw.date === "string"
      ? raw.date
      : typeof raw.ocrDate === "string"
        ? raw.ocrDate
        : null;
  const confidence =
    typeof raw.confidence === "number" && Number.isFinite(raw.confidence)
      ? raw.confidence
      : null;
  return { ocrDate: date, confidence };
}

/**
 * GET /api/receipts/:id
 * Receipt detail for OCR review refresh. VIEWER+.
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    requireViewer(await getSessionUser());
    const { id } = await context.params;

    const receipt = await prisma.receipt.findUnique({
      where: { id },
      select: {
        id: true,
        buildingId: true,
        storagePath: true,
        mimeType: true,
        ocrAmountCents: true,
        ocrVendor: true,
        ocrRaw: true,
        status: true,
        createdAt: true,
      },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    const { ocrDate, confidence } = readOcrMeta(receipt.ocrRaw);

    const body: ReceiptDetail = {
      receiptId: receipt.id,
      id: receipt.id,
      buildingId: receipt.buildingId,
      ocrAmountCents: receipt.ocrAmountCents,
      ocrVendor: receipt.ocrVendor,
      ocrDate,
      confidence,
      status: receipt.status,
      storagePath: receipt.storagePath,
      mimeType: receipt.mimeType,
      createdAt: receipt.createdAt.toISOString(),
    };

    return NextResponse.json(body);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
