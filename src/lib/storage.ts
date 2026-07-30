import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const RECEIPTS_BUCKET = "receipts";

/** Design §11 — large receipt uploads capped at 10MB. */
export const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

/** Prisma `@default(cuid())` shape — refuse path segments / traversal. */
const BUILDING_ID_RE = /^c[a-z0-9]{8,64}$/i;

export function isAllowedReceiptMime(mimeType: string): boolean {
  return ALLOWED_MIME.has(mimeType.toLowerCase());
}

/**
 * Sanitize buildingId for storage path segments.
 * Accepts cuid-like ids only; rejects `/`, `..`, `\0`, `\`.
 */
export function assertSafeBuildingId(buildingId: string): string {
  const id = buildingId?.trim() ?? "";
  if (
    !id ||
    id.includes("/") ||
    id.includes("\\") ||
    id.includes("\0") ||
    id.includes("..") ||
    !BUILDING_ID_RE.test(id)
  ) {
    throw new Error("Invalid buildingId for storage path");
  }
  return id;
}

/** Magic-byte sniff for pdf / jpeg / png / webp. Returns canonical mime or null. */
export function sniffReceiptMime(bytes: Buffer): string | null {
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    // %PDF-
    return "application/pdf";
  }
  // Some PDFs omit the version hyphen immediately; still require %PDF
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return "application/pdf";
  }
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * Reject before storage: size cap + magic-byte mime (ignore client Content-Type).
 */
export function validateReceiptBytes(bytes: Buffer): { mimeType: string } {
  if (!bytes.length) {
    throw new Error("Empty file");
  }
  if (bytes.length > MAX_RECEIPT_BYTES) {
    throw new Error(
      `File exceeds ${MAX_RECEIPT_BYTES / (1024 * 1024)}MB limit`,
    );
  }
  const mimeType = sniffReceiptMime(bytes);
  if (!mimeType || !isAllowedReceiptMime(mimeType)) {
    throw new Error(
      "Unrecognized or unsupported file type. Allowed: PDF, JPEG, PNG, WebP",
    );
  }
  return { mimeType };
}

function hasServiceRoleStorageConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function createServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export type UploadReceiptResult = {
  storagePath: string;
  backend: "supabase" | "local";
};

/**
 * Upload receipt bytes to Supabase Storage when service role is configured;
 * otherwise write under `.data/receipts/` and return a mock `storagePath`.
 */
export async function uploadReceiptFile(input: {
  buildingId: string;
  mimeType: string;
  bytes: Buffer;
  originalName?: string;
}): Promise<UploadReceiptResult> {
  const buildingId = assertSafeBuildingId(input.buildingId);
  const { mimeType } = validateReceiptBytes(input.bytes);

  // Prefer sniffed mime over client-claimed type.
  if (!isAllowedReceiptMime(mimeType)) {
    throw new Error(
      "Unsupported mime type. Allowed: application/pdf, image/jpeg, image/png, image/webp",
    );
  }

  const ext =
    mimeType === "application/pdf"
      ? "pdf"
      : mimeType === "image/png"
        ? "png"
        : mimeType === "image/webp"
          ? "webp"
          : "jpg";
  const storagePath = `${buildingId}/${randomUUID()}.${ext}`;

  if (hasServiceRoleStorageConfig()) {
    const supabase = createServiceClient();
    const { error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .upload(storagePath, input.bytes, {
        contentType: mimeType,
        upsert: false,
      });
    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }
    return { storagePath, backend: "supabase" };
  }

  const root = path.resolve(process.cwd(), ".data", "receipts");
  const fullPath = path.resolve(root, storagePath);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (!fullPath.startsWith(rootWithSep) && fullPath !== root) {
    throw new Error("Invalid storage path");
  }
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, input.bytes);
  return { storagePath, backend: "local" };
}
