"use client";

import { Suspense, use, useId, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { MoneyText } from "@/components/money/MoneyText";
import { MismatchBanner } from "@/components/receipts/MismatchBanner";
import { createTransaction } from "@/components/api/operator-api";

const MIN_JUSTIFICATION = 20;

function JustifyForm({ receiptId }: { receiptId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reasonId = useId();

  const amountCents = Number(searchParams.get("amountCents"));
  const ocrRaw = searchParams.get("ocrAmountCents");
  const ocrAmountCents =
    ocrRaw != null && ocrRaw !== "" ? Number(ocrRaw) : null;
  const buildingId =
    searchParams.get("buildingId") ?? "seed-building-kolonaki";
  const description = searchParams.get("description") ?? "";
  const matched = searchParams.get("matched") === "1";

  const amountsDiffer =
    !matched &&
    ocrAmountCents != null &&
    Number.isInteger(ocrAmountCents) &&
    Number.isInteger(amountCents) &&
    ocrAmountCents !== amountCents;

  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = useMemo(() => {
    if (!Number.isInteger(amountCents) || amountCents <= 0) return false;
    if (!amountsDiffer) return true;
    return reason.trim().length >= MIN_JUSTIFICATION;
  }, [amountCents, amountsDiffer, reason]);

  async function submit() {
    setError(null);
    if (!valid) return;
    setSubmitting(true);
    const result = await createTransaction({
      buildingId,
      type: "EXPENSE",
      amountCents,
      occurredAt: new Date().toISOString(),
      receiptId,
      description: description || undefined,
      mismatchJustification: amountsDiffer ? reason.trim() : undefined,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(
        result.pending
          ? "API pending — transaction endpoint is not available yet."
          : result.message,
      );
      return;
    }

    router.push(`/buildings/${buildingId}/expenses`);
  }

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return (
      <div className="space-y-3">
        <PageHeader title="Mismatch justification" />
        <p className="text-sm text-[var(--danger)]" role="alert">
          Missing operator amount. Return to OCR review and continue again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={
          amountsDiffer ? "Mismatch justification" : "Confirm expense post"
        }
        description={
          amountsDiffer
            ? "Operator amount differs from OCR. Provide a written reason (≥20 characters)."
            : "Amounts match (or OCR missing). Post the expense transaction."
        }
      />

      {amountsDiffer ? (
        <MismatchBanner
          ocrAmountCents={ocrAmountCents}
          operatorAmountCents={amountCents}
        />
      ) : null}

      <dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-[var(--ink-muted)]">Operator amount</dt>
        <dd>
          <MoneyText cents={amountCents} className="text-base" />
        </dd>
        <dt className="text-[var(--ink-muted)]">OCR amount</dt>
        <dd>
          <MoneyText cents={ocrAmountCents} className="text-base" />
        </dd>
        <dt className="text-[var(--ink-muted)]">Receipt</dt>
        <dd className="font-mono-amounts break-all text-xs">{receiptId}</dd>
      </dl>

      {amountsDiffer ? (
        <div className="space-y-2">
          <label
            htmlFor={reasonId}
            className="block text-sm font-medium text-[var(--danger)]"
          >
            Justification (required, ≥{MIN_JUSTIFICATION} characters)
          </label>
          <textarea
            id={reasonId}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="min-h-[7rem] w-full border border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_5%,var(--surface))] px-3 py-2 text-sm text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--danger)]"
            aria-invalid={reason.trim().length > 0 && !valid}
            aria-describedby={`${reasonId}-count`}
          />
          <p
            id={`${reasonId}-count`}
            className={`text-xs ${
              reason.trim().length >= MIN_JUSTIFICATION
                ? "text-[var(--ink-muted)]"
                : "text-[var(--danger)]"
            }`}
          >
            {reason.trim().length} / {MIN_JUSTIFICATION} characters
          </p>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={!valid || submitting}
        onClick={submit}
        className={`inline-flex min-h-11 min-w-[12rem] items-center justify-center gap-2 px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          amountsDiffer
            ? "bg-[var(--danger)] focus-visible:outline-[var(--danger)]"
            : "bg-[var(--primary)] focus-visible:outline-[var(--primary)]"
        }`}
      >
        {submitting ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
            Posting…
          </>
        ) : (
          "Post expense"
        )}
      </button>
    </div>
  );
}

export default function MismatchJustifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="mx-auto max-w-2xl">
      <Suspense fallback={<LoadingState label="Loading justification…" />}>
        <JustifyForm receiptId={id} />
      </Suspense>
    </div>
  );
}
