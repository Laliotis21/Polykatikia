"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LoaderCircle, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  fetchBuildings,
  saveReceiptDraft,
  uploadReceipt,
  type ApiResult,
} from "@/components/api/operator-api";
import type { BuildingSummary } from "@/lib/api-types";

const ACCEPT = "image/jpeg,image/png,application/pdf";

export default function ReceiptUploadPage() {
  const router = useRouter();
  const inputId = useId();
  const buildingIdLabel = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [buildings, setBuildings] = useState<BuildingSummary[]>([]);
  const [buildingsMeta, setBuildingsMeta] = useState<{
    pending: boolean;
    message?: string;
  }>({ pending: false });
  const [loadingBuildings, setLoadingBuildings] = useState(true);
  const [buildingId, setBuildingId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingBuildings(true);
      const result: ApiResult<BuildingSummary[]> = await fetchBuildings();
      if (cancelled) return;
      setBuildings(result.data);
      setBuildingId(result.data[0]?.id ?? "");
      setBuildingsMeta({
        pending: !result.ok && Boolean(result.pending),
        message: !result.ok ? result.message : undefined,
      });
      setLoadingBuildings(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onFiles = useCallback((list: FileList | null) => {
    const next = list?.[0] ?? null;
    if (!next) return;
    setFile(next);
    setError(null);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file || !buildingId) {
      setError("Select a building and a receipt file.");
      return;
    }
    setUploading(true);
    const result = await uploadReceipt({ file, buildingId });
    setUploading(false);

    if (!result.ok) {
      setError(
        result.pending
          ? "API pending — receipt upload endpoint is not available yet."
          : result.message,
      );
      return;
    }

    if (!result.data) {
      setError("Upload returned no receipt.");
      return;
    }

    saveReceiptDraft({
      ...result.data,
      id: result.data.id ?? result.data.receiptId,
      receiptId: result.data.receiptId ?? result.data.id,
      buildingId: result.data.buildingId ?? buildingId,
      fileName: file.name,
    });
    router.push(
      `/receipts/${result.data.id ?? result.data.receiptId}/review`,
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Receipt upload"
        description="Drop a PDF or image, pick the building, then run OCR review."
      />

      {loadingBuildings ? (
        <LoadingState label="Loading buildings…" />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor={buildingIdLabel}
              className="block text-sm font-medium text-[var(--ink)]"
            >
              Building
            </label>
            <select
              id={buildingIdLabel}
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              className="min-h-11 w-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
              required
            >
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.address ? ` — ${b.address}` : ""}
                </option>
              ))}
            </select>
            {buildingsMeta.pending ? (
              <p className="text-xs text-[var(--warning)]">
                API pending — using seed building list.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <span className="block text-sm font-medium text-[var(--ink)]" id={inputId}>
              Receipt file
            </span>
            <div
              role="button"
              tabIndex={0}
              aria-labelledby={inputId}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                onFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed px-4 py-6 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)] ${
                dragOver
                  ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,var(--surface))]"
                  : "border-[var(--border)] bg-[var(--surface-2)]"
              }`}
            >
              <Upload
                className="size-6 text-[var(--primary)]"
                aria-hidden
                strokeWidth={1.75}
              />
              <p className="text-sm text-[var(--ink)]">
                Drag and drop, or click to choose
              </p>
              <p className="text-xs text-[var(--ink-muted)]">
                PDF, JPEG, or PNG
              </p>
              {file ? (
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-[var(--primary)]">
                  <FileUp className="size-4" aria-hidden />
                  {file.name}
                </p>
              ) : null}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              aria-labelledby={inputId}
              onChange={(e) => onFiles(e.target.files)}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={uploading || !file || !buildingId}
            className="inline-flex min-h-11 min-w-[11rem] items-center justify-center gap-2 bg-[var(--primary)] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          >
            {uploading ? (
              <>
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
                Processing…
              </>
            ) : (
              "Upload & process"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
