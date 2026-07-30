"use client";

import { use, useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { MoneyText } from "@/components/money/MoneyText";
import { MismatchBanner } from "@/components/receipts/MismatchBanner";
import {
  fetchReceipt,
  loadReceiptDraft,
  saveReceiptDraft,
  type ReceiptDraft,
} from "@/components/api/operator-api";
import {
  centsToEurInput,
  parseEurInputToCents,
} from "@/components/money/parseEurInput";

export default function OcrReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const amountId = useId();
  const descId = useId();

  const [draft, setDraft] = useState<ReceiptDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiPending, setApiPending] = useState(false);
  const [amountEuro, setAmountEuro] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const cached = loadReceiptDraft(id);
      const remote = await fetchReceipt(id);
      if (cancelled) return;

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
        setAmountEuro(centsToEurInput(merged.ocrAmountCents));
        saveReceiptDraft(merged);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const operatorCents = useMemo(
    () => parseEurInputToCents(amountEuro),
    [amountEuro],
  );

  const amountsDiffer =
    draft?.ocrAmountCents != null &&
    operatorCents != null &&
    draft.ocrAmountCents !== operatorCents;

  function continueNext() {
    setError(null);
    if (!draft) {
      setError("Receipt draft not found. Upload again.");
      return;
    }
    if (operatorCents == null || operatorCents <= 0) {
      setError("Enter a valid operator amount in EUR.");
      return;
    }

    const qs = new URLSearchParams({
      amountCents: String(operatorCents),
      buildingId: draft.buildingId,
      description: description.trim(),
    });
    if (draft.ocrAmountCents != null) {
      qs.set("ocrAmountCents", String(draft.ocrAmountCents));
    }

    if (amountsDiffer) {
      router.push(`/receipts/${id}/justify?${qs.toString()}`);
      return;
    }

    router.push(`/receipts/${id}/justify?${qs.toString()}&matched=1`);
  }

  if (loading) {
    return <LoadingState label="Loading OCR draft…" />;
  }

  if (!draft) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <PageHeader title="OCR review" />
        <p className="text-sm text-[var(--ink-muted)]" role="status">
          {apiPending
            ? "API pending — no receipt draft in session. Upload a receipt first."
            : "Receipt not found. Upload a receipt to start OCR review."}
        </p>
        {apiPending ? (
          <p className="text-xs font-medium tracking-wide text-[var(--warning)] uppercase">
            API pending
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title="OCR review"
        description="Confirm extracted fields. Amounts use Fira Code and el-GR EUR."
      />

      <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-3 border-y border-[var(--border)] py-4 text-sm">
        <dt className="text-[var(--ink-muted)]">Receipt ID</dt>
        <dd className="font-mono-amounts break-all text-[var(--ink)]">
          {draft.id}
        </dd>
        <dt className="text-[var(--ink-muted)]">Status</dt>
        <dd className="font-medium uppercase tracking-wide text-[var(--ink)]">
          {draft.status}
        </dd>
        <dt className="text-[var(--ink-muted)]">Vendor</dt>
        <dd className="text-[var(--ink)]">{draft.ocrVendor ?? "—"}</dd>
        <dt className="text-[var(--ink-muted)]">OCR date</dt>
        <dd className="font-mono-amounts text-[var(--ink)]">
          {draft.ocrDate ?? "—"}
        </dd>
        <dt className="text-[var(--ink-muted)]">Confidence</dt>
        <dd className="font-mono-amounts text-[var(--ink)]">
          {draft.confidence == null ? "—" : draft.confidence.toFixed(2)}
        </dd>
        <dt className="text-[var(--ink-muted)]">OCR amount</dt>
        <dd>
          <MoneyText cents={draft.ocrAmountCents} className="text-base" />
        </dd>
        <dt className="text-[var(--ink-muted)]">Storage</dt>
        <dd className="font-mono-amounts break-all text-xs text-[var(--ink-muted)]">
          {draft.storagePath}
        </dd>
      </dl>

      {operatorCents != null ? (
        <MismatchBanner
          ocrAmountCents={draft.ocrAmountCents}
          operatorAmountCents={operatorCents}
        />
      ) : null}

      <div className="space-y-2">
        <label
          htmlFor={amountId}
          className="block text-sm font-medium text-[var(--ink)]"
        >
          Operator amount (EUR)
        </label>
        <input
          id={amountId}
          type="text"
          inputMode="decimal"
          value={amountEuro}
          onChange={(e) => setAmountEuro(e.target.value)}
          className="font-mono-amounts min-h-11 w-full max-w-xs border border-[var(--border)] bg-[var(--surface)] px-3 text-base text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          aria-describedby={`${amountId}-hint`}
        />
        <p id={`${amountId}-hint`} className="text-xs text-[var(--ink-muted)]">
          Enter euros; stored as integer cents. Preview:{" "}
          <MoneyText cents={operatorCents} />
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor={descId}
          className="block text-sm font-medium text-[var(--ink)]"
        >
          Description (optional)
        </label>
        <input
          id={descId}
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-11 w-full border border-[var(--border)] bg-[var(--surface)] px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={continueNext}
        className="inline-flex min-h-11 items-center bg-[var(--primary)] px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
      >
        {amountsDiffer ? "Continue to justification" : "Continue to post"}
      </button>
    </div>
  );
}
