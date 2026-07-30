import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { AuthError, getSessionUser, requireOperator } from "@/lib/auth";
import { createOcrProvider } from "@/domain/ocr";
import {
  assertSafeBuildingId,
  MAX_RECEIPT_BYTES,
  uploadReceiptFile,
  validateReceiptBytes,
} from "@/lib/storage";
import type { CreateReceiptResponse } from "@/lib/api-types";

export const runtime = "nodejs";

const buildingIdSchema = z.string().min(1);

/**
 * POST /api/receipts
 * Multipart: `file` + `buildingId` → storage → OCR → Receipt READY draft.
 * OPERATOR+.
 * Rejects before storage: size cap (10MB) + magic-byte mime (pdf/jpeg/png/webp).
 */
export async function POST(request: Request) {
  try {
    const user = requireOperator(await getSessionUser());

    const form = await request.formData();
    const buildingIdRaw = form.get("buildingId");
    const file = form.get("file");

    const buildingIdParsed = buildingIdSchema.safeParse(buildingIdRaw);
    if (!buildingIdParsed.success) {
      return NextResponse.json(
        { error: "buildingId is required" },
        { status: 400 },
      );
    }

    let buildingId: string;
    try {
      buildingId = assertSafeBuildingId(buildingIdParsed.data);
    } catch {
      return NextResponse.json(
        { error: "Invalid buildingId" },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "file is required (multipart)" },
        { status: 400 },
      );
    }

    if (file.size > MAX_RECEIPT_BYTES) {
      return NextResponse.json(
        { error: `File exceeds ${MAX_RECEIPT_BYTES / (1024 * 1024)}MB limit` },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    let mimeType: string;
    try {
      mimeType = validateReceiptBytes(bytes).mimeType;
    } catch (validationErr) {
      return NextResponse.json(
        {
          error:
            validationErr instanceof Error
              ? validationErr.message
              : "Invalid receipt file",
        },
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

    const uploaded = await uploadReceiptFile({
      buildingId,
      mimeType,
      bytes,
      originalName: file.name,
    });

    const receipt = await prisma.receipt.create({
      data: {
        buildingId,
        storagePath: uploaded.storagePath,
        mimeType,
        status: "UPLOADED",
        createdById: user.id,
      },
    });

    try {
      await prisma.receipt.update({
        where: { id: receipt.id },
        data: { status: "PROCESSING" },
      });

      const ocr = createOcrProvider();
      const extracted = await ocr.extract({
        storagePath: uploaded.storagePath,
        mimeType,
      });

      const ocrRaw = {
        ...(extracted.raw && typeof extracted.raw === "object"
          ? (extracted.raw as Record<string, unknown>)
          : { value: extracted.raw }),
        date: extracted.date,
        confidence: extracted.confidence,
      };

      const ready = await prisma.receipt.update({
        where: { id: receipt.id },
        data: {
          status: "READY",
          ocrAmountCents: extracted.amountCents,
          ocrVendor: extracted.vendor,
          ocrRaw: ocrRaw as Prisma.InputJsonValue,
        },
      });

      const body: CreateReceiptResponse = {
        receiptId: ready.id,
        id: ready.id,
        buildingId: ready.buildingId,
        ocrAmountCents: ready.ocrAmountCents,
        ocrVendor: ready.ocrVendor,
        ocrDate: extracted.date,
        confidence: extracted.confidence,
        status: ready.status,
        storagePath: ready.storagePath,
      };
      return NextResponse.json(body, { status: 201 });
    } catch (ocrErr) {
      await prisma.receipt.update({
        where: { id: receipt.id },
        data: {
          status: "FAILED",
          ocrRaw: {
            error:
              ocrErr instanceof Error ? ocrErr.message : "OCR failed",
          },
        },
      });
      return NextResponse.json(
        {
          error: "OCR failed",
          receiptId: receipt.id,
          status: "FAILED",
        },
        { status: 502 },
      );
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
