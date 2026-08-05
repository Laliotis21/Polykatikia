"use client";

import { use, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Field, inputStyles } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { MoneyText } from "@/components/money/MoneyText";
import { ReceiptSteps } from "@/components/receipts/ReceiptSteps";
import {
  createTransaction,
  fetchExpenseCategories,
  fetchReceipt,
  loadReceiptDraft,
  saveReceiptDraft,
  type ReceiptDraft,
} from "@/components/api/operator-api";
import type { ExpenseCategoryItem } from "@/lib/api-types";

const STATUS_LABELS: Record<string, string> = {
  UPLOADED: "Ανέβηκε",
  PROCESSING: "Σε επεξεργασία",
  READY: "Έτοιμη",
  FAILED: "Απέτυχε",
};

function ConfidenceMeter({ confidence }: { confidence: number | null }) {
  if (confidence == null) {
    return <span className="font-mono-amounts text-ink-subtle">—</span>;
  }
  const percent = Math.round(confidence * 100);
  const low = percent < 80;
  return (
    <span className="flex items-center gap-3">
      <span
        className="h-1.5 w-24 overflow-hidden rounded-full bg-marble-200"
        role="img"
        aria-label={`Βεβαιότητα OCR ${percent}%`}
      >
        <span
          className={`block h-full rounded-full ${low ? "bg-[var(--warning)]" : "bg-[var(--success)]"}`}
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className="font-mono-amounts text-sm text-ink">{percent}%</span>
    </span>
  );
}

export default function OcrReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const categoryId = useId();
  const descId = useId();

  const [draft, setDraft] = useState<ReceiptDraft | null>(null);
  const [categories, setCategories] = useState<ExpenseCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiPending, setApiPending] = useState(false);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const cached = loadReceiptDraft(id);
      const [remote, cats] = await Promise.all([
        fetchReceipt(id),
        fetchExpenseCategories(),
      ]);
      if (cancelled) return;

      if (cats.ok) {
        setCategories(cats.data);
      }

      const merged: ReceiptDraft | null =
        remote.ok && remote.data
          ? {
              ...remote.data,
              id: remote.data.id ?? remote.data.receiptId,
              receiptId: remote.data.receiptId ?? remote.data.id,
              buildingId:
                remote.data.buildingId ??
                cached?.buildingId ??
                "seed-building-kolonaki",
              fileName: cached?.fileName,
            }
          : cached;

      if (!merged && remote.pending) {
        setApiPending(true);
      }

      if (merged) {
        setDraft(merged);
        saveReceiptDraft(merged);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function confirmExpense() {
    setError(null);
    if (!draft) {
      setError("Δεν βρέθηκε πρόχειρη απόδειξη. Ανεβάστε ξανά.");
      return;
    }
    if (draft.ocrAmountCents == null || draft.ocrAmountCents <= 0) {
      setError("Λείπει ποσό OCR. Ανεβάστε ξανά ή δοκιμάστε νέο ανέβασμα.");
      return;
    }
    if (draft.status !== "READY") {
      setError("Η απόδειξη πρέπει να είναι Έτοιμη πριν την καταχώριση.");
      return;
    }
    if (!category) {
      setError("Επιλέξτε κατηγορία δαπάνης.");
      return;
    }

    setSubmitting(true);
    const result = await createTransaction({
      buildingId: draft.buildingId,
      type: "EXPENSE",
      amountCents: draft.ocrAmountCents,
      occurredAt: new Date().toISOString(),
      receiptId: draft.receiptId ?? draft.id,
      categoryId: category,
      description: description.trim() || undefined,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(
        result.pending
          ? "Το API καταχώρισης κινήσεων δεν είναι ακόμη διαθέσιμο."
          : result.message,
      );
      return;
    }

    router.push(`/buildings/${draft.buildingId}/expenses`);
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <PageHeader eyebrow="Καταχώριση δαπάνης" title="Έλεγχος OCR" />
        <LoadingState label="Φόρτωση δεδομένων OCR…" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <PageHeader eyebrow="Καταχώριση δαπάνης" title="Έλεγχος OCR" />
        <EmptyState
          icon={FileQuestion}
          title="Δεν βρέθηκε απόδειξη"
          description="Δεν υπάρχει πρόχειρη απόδειξη σε αυτή τη συνεδρία. Ανεβάστε μια απόδειξη για να ξεκινήσει ο έλεγχος OCR."
          action={
            <Link
              href="/receipts/upload"
              className={buttonStyles("primary", "sm")}
            >
              Ανέβασμα απόδειξης
            </Link>
          }
          pending={apiPending}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <PageHeader
        eyebrow="Καταχώριση δαπάνης"
        title="Έλεγχος OCR"
        description="Επιβεβαιώστε το ποσό της απόδειξης. Δεν επεξεργάζεστε ποσό — μόνο σωστό / λάθος OCR."
      />

      <ReceiptSteps current={1} />

      <section
        className="rise panel p-6"
        style={{ "--rise-delay": "80ms" } as React.CSSProperties}
        aria-labelledby="ocr-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-soft pb-4">
          <h2
            id="ocr-heading"
            className="font-display text-lg font-bold text-ink"
          >
            Ανάγνωση OCR
          </h2>
          <Badge tone={draft.status === "READY" ? "success" : "neutral"}>
            {STATUS_LABELS[draft.status] ?? draft.status}
          </Badge>
        </div>

        <dl className="grid gap-x-8 gap-y-5 pt-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="eyebrow">Ποσό OCR</dt>
            <dd>
              <MoneyText
                cents={draft.ocrAmountCents}
                className="text-xl font-semibold"
              />
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="eyebrow">Βεβαιότητα</dt>
            <dd className="pt-1">
              <ConfidenceMeter confidence={draft.confidence} />
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="eyebrow">Προμηθευτής</dt>
            <dd className="text-ink">{draft.ocrVendor ?? "—"}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="eyebrow">Ημερομηνία</dt>
            <dd className="font-mono-amounts text-ink">
              {draft.ocrDate ?? "—"}
            </dd>
          </div>
          <div className="flex min-w-0 flex-col gap-1 sm:col-span-2">
            <dt className="eyebrow">Αρχείο</dt>
            <dd className="font-mono-amounts truncate text-xs text-ink-muted">
              {draft.fileName ?? draft.storagePath}
            </dd>
          </div>
        </dl>
      </section>

      <section
        className="rise flex flex-col gap-6"
        style={{ "--rise-delay": "140ms" } as React.CSSProperties}
        aria-labelledby="confirm-heading"
      >
        <h2
          id="confirm-heading"
          className="font-display text-lg font-bold text-ink"
        >
          Καταχώριση δαπάνης
        </h2>

        <Field
          htmlFor={categoryId}
          label="Κατηγορία"
          hint="Επιλέξτε πού θα χρεωθεί η δαπάνη στα κοινόχρηστα."
        >
          <select
            id={categoryId}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputStyles}
          >
            <option value="">— Επιλογή —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          htmlFor={descId}
          label="Περιγραφή"
          aside="προαιρετικό"
          hint="Π.χ. «Συντήρηση ανελκυστήρα — τρίμηνο»."
        >
          <input
            id={descId}
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputStyles}
          />
        </Field>

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-[color-mix(in_srgb,var(--danger)_30%,white)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-4">
          <Button
            type="button"
            size="lg"
            loading={submitting}
            loadingLabel="Καταχώριση…"
            onClick={confirmExpense}
          >
            Επιβεβαίωση &amp; δημιουργία δαπάνης
          </Button>
          <Link
            href="/receipts/upload"
            className={buttonStyles("secondary", "lg")}
          >
            Λάθος OCR — νέο ανέβασμα
          </Link>
        </div>
      </section>
    </div>
  );
}
