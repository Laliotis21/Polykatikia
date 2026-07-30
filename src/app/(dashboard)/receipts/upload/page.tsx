"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileCheck2, UploadCloud, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/Button";
import { Field, controlStyles } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { ReceiptSteps } from "@/components/receipts/ReceiptSteps";
import {
  fetchBuildings,
  saveReceiptDraft,
  uploadReceipt,
  type ApiResult,
} from "@/components/api/operator-api";
import type { BuildingSummary } from "@/lib/api-types";
import { cn } from "@/lib/cn";

const ACCEPT = "image/jpeg,image/png,application/pdf";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ReceiptUploadPage() {
  const router = useRouter();
  const dropzoneLabelId = useId();
  const buildingSelectId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [buildings, setBuildings] = useState<BuildingSummary[]>([]);
  const [buildingsPending, setBuildingsPending] = useState(false);
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
      setBuildingsPending(!result.ok && Boolean(result.pending));
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
      setError("Επιλέξτε κτίριο και αρχείο απόδειξης.");
      return;
    }
    setUploading(true);
    const result = await uploadReceipt({ file, buildingId });
    setUploading(false);

    if (!result.ok) {
      setError(
        result.pending
          ? "Το API ανεβάσματος αποδείξεων δεν είναι ακόμη διαθέσιμο."
          : result.message,
      );
      return;
    }

    if (!result.data) {
      setError("Το ανέβασμα δεν επέστρεψε απόδειξη.");
      return;
    }

    saveReceiptDraft({
      ...result.data,
      id: result.data.id ?? result.data.receiptId,
      receiptId: result.data.receiptId ?? result.data.id,
      buildingId: result.data.buildingId ?? buildingId,
      fileName: file.name,
    });
    router.push(`/receipts/${result.data.id ?? result.data.receiptId}/review`);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <PageHeader
        eyebrow="Καταχώριση δαπάνης"
        title="Νέα απόδειξη"
        description="Ανεβάστε PDF ή φωτογραφία, επιλέξτε κτίριο και συνεχίστε στον έλεγχο OCR."
      />

      <ReceiptSteps current={0} />

      {loadingBuildings ? (
        <LoadingState label="Φόρτωση κτιρίων…" />
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rise flex flex-col gap-7"
          style={{ "--rise-delay": "80ms" } as React.CSSProperties}
        >
          <Field
            htmlFor={buildingSelectId}
            label="Κτίριο"
            hint={
              buildingsPending
                ? "Χρησιμοποιείται η λίστα seed έως ότου ενεργοποιηθεί το API."
                : undefined
            }
          >
            <select
              id={buildingSelectId}
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              className={cn(controlStyles, "min-h-11 cursor-pointer text-base")}
              required
            >
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                  {b.address ? ` — ${b.address}` : ""}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex flex-col gap-2">
            <span
              id={dropzoneLabelId}
              className="font-display text-sm font-semibold text-ink"
            >
              Αρχείο απόδειξης
            </span>

            {file ? (
              <div className="flex items-center gap-4 rounded-lg border border-aegean-200 bg-aegean-50 p-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white text-aegean-600 ring-1 ring-aegean-100">
                  <FileCheck2 className="size-5" aria-hidden strokeWidth={1.9} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-ink">
                    {file.name}
                  </span>
                  <span className="font-mono-amounts text-xs text-ink-muted">
                    {formatBytes(file.size)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="ml-auto flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-ink-muted transition-colors duration-200 hover:bg-white hover:text-[var(--danger)]"
                  aria-label={`Αφαίρεση αρχείου ${file.name}`}
                >
                  <X className="size-4.5" aria-hidden strokeWidth={2} />
                </button>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                aria-labelledby={dropzoneLabelId}
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
                className={cn(
                  "flex min-h-52 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors duration-200 ease-out",
                  dragOver
                    ? "ring-pulse border-aegean-500 bg-aegean-50"
                    : "border-marble-300 bg-white/60 hover:border-aegean-400 hover:bg-aegean-50/50",
                )}
              >
                <span
                  className={cn(
                    "flex size-14 items-center justify-center rounded-full transition-transform duration-200 ease-out",
                    dragOver
                      ? "-translate-y-1 bg-aegean-600 text-white"
                      : "bg-aegean-50 text-aegean-600 ring-1 ring-aegean-100",
                  )}
                >
                  <UploadCloud
                    className="size-6"
                    aria-hidden
                    strokeWidth={1.9}
                  />
                </span>
                <span className="font-display font-bold text-ink">
                  Σύρετε το αρχείο εδώ
                </span>
                <span className="text-sm text-ink-muted">
                  ή πατήστε για επιλογή από τη συσκευή σας
                </span>
                <Badge tone="neutral">PDF · JPEG · PNG</Badge>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              className="sr-only"
              aria-labelledby={dropzoneLabelId}
              onChange={(e) => onFiles(e.target.files)}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-md border border-[color-mix(in_srgb,var(--danger)_30%,white)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]"
            >
              {error}
            </p>
          ) : null}

          <div className="flex items-center gap-4">
            <Button
              type="submit"
              size="lg"
              disabled={!file || !buildingId}
              loading={uploading}
              loadingLabel="Επεξεργασία…"
            >
              Ανέβασμα και έλεγχος
            </Button>
            <p className="text-xs text-ink-muted">
              Το ποσό θα επιβεβαιωθεί από εσάς στο επόμενο βήμα.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
