import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const RECEIPTS_BUCKET = "receipts";
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

export function isAllowedReceiptMime(mimeType: string): boolean {
  return ALLOWED_MIME.has(mimeType.toLowerCase());
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
  if (!isAllowedReceiptMime(input.mimeType)) {
    throw new Error(
      "Unsupported mime type. Allowed: application/pdf, image/jpeg, image/png",
    );
  }

  const ext =
    input.mimeType === "application/pdf"
      ? "pdf"
      : input.mimeType.includes("png")
        ? "png"
        : "jpg";
  const storagePath = `${input.buildingId}/${randomUUID()}.${ext}`;

  if (hasServiceRoleStorageConfig()) {
    const supabase = createServiceClient();
    const { error } = await supabase.storage
      .from(RECEIPTS_BUCKET)
      .upload(storagePath, input.bytes, {
        contentType: input.mimeType,
        upsert: false,
      });
    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }
    return { storagePath, backend: "supabase" };
  }

  const root = path.join(process.cwd(), ".data", "receipts");
  const fullPath = path.join(root, storagePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, input.bytes);
  return { storagePath, backend: "local" };
}
