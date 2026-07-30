"use client";

import { Suspense, use, useId, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Field, controlStyles } from "@/components/ui/Field";
import { MoneyText } from "@/components/money/MoneyText";
import { MismatchBanner } from "@/components/receipts/MismatchBanner";
import { ReceiptSteps } from "@/components/receipts/ReceiptSteps";
import { createTransaction } from "@/components/api/operator-api";
import { cn } from "@/lib/cn";

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

  const reasonLength = reason.trim().length;
  const reasonSatisfied = reasonLength >= MIN_JUSTIFICATION;

  const valid = useMemo(() => {
    if (!Number.isInteger(amountCents) || amountCents <= 0) return false;
    if (!amountsDiffer) return true;
    return reasonSatisfied;
  }, [amountCents, amountsDiffer, reasonSatisfied]);

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
          ? "Το API καταχώρισης κινήσεων δεν είναι ακόμη διαθέσιμο."
          : result.message,
      );
      return;
    }

    router.push(`/buildings/${buildingId}/expenses`);
  }

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          eyebrow="Καταχώριση δαπάνης"
          title="Αιτιολόγηση απόκλισης"
        />
        <div
          role="alert"
          className="rise flex flex-col items-start gap-4 rounded-lg border border-[color-mix(in_srgb,var(--danger)_30%,white)] bg-[var(--danger-soft)] p-5"
        >
          <p className="text-sm text-[var(--danger)]">
            Λείπει το ποσό του χειριστή. Επιστρέψτε στον έλεγχο OCR και
            συνεχίστε ξανά.
          </p>
          <Link
            href={`/receipts/${receiptId}/review`}
            className={buttonStyles("secondary", "sm")}
          >
            Επιστροφή στον έλεγχο
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Καταχώριση δαπάνης"
        title={amountsDiffer ? "Αιτιολόγηση απόκλισης" : "Επιβεβαίωση καταχώρισης"}
        description={
          amountsDiffer
            ? "Το ποσό σας διαφέρει από το OCR. Τεκμηριώστε γραπτώς τον λόγο πριν την καταχώριση."
            : "Τα ποσά συμφωνούν. Καταχωρίστε τη δαπάνη στο καθολικό του κτιρίου."
        }
      />

      <ReceiptSteps current={2} />

      {amountsDiffer ? (
        <MismatchBanner
          ocrAmountCents={ocrAmountCents}
          operatorAmountCents={amountCents}
        />
      ) : null}

      <section
        className="rise panel p-6"
        style={{ "--rise-delay": "80ms" } as React.CSSProperties}
        aria-labelledby="summary-heading"
      >
        <h2
          id="summary-heading"
          className="font-display text-lg font-bold text-ink"
        >
          Σύνοψη καταχώρισης
        </h2>
        <dl className="grid gap-x-8 gap-y-5 pt-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="eyebrow">Ποσό χειριστή</dt>
            <dd>
              <MoneyText cents={amountCents} className="text-xl font-semibold" />
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="eyebrow">Ποσό OCR</dt>
            <dd>
              <MoneyText cents={ocrAmountCents} className="text-xl" />
            </dd>
          </div>
          {description ? (
            <div className="flex flex-col gap-1 sm:col-span-2">
              <dt className="eyebrow">Περιγραφή</dt>
              <dd className="text-ink">{description}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {amountsDiffer ? (
        <section
          className="rise"
          style={{ "--rise-delay": "140ms" } as React.CSSProperties}
        >
          <Field
            htmlFor={reasonId}
            label={`Αιτιολόγηση (υποχρεωτική, ≥${MIN_JUSTIFICATION} χαρακτήρες)`}
            aside={
              <span
                className={cn(
                  "font-mono-amounts",
                  reasonSatisfied ? "text-[var(--success)]" : "text-[var(--danger)]",
                )}
              >
                {reasonLength}/{MIN_JUSTIFICATION}
              </span>
            }
            hint="Περιγράψτε γιατί το ποσό διαφέρει — π.χ. έκπτωση, μερική πληρωμή, λάθος ανάγνωση."
          >
            <textarea
              id={reasonId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              aria-invalid={reasonLength > 0 && !reasonSatisfied}
              aria-describedby={`${reasonId}-hint`}
              className={cn(
                controlStyles,
                "min-h-28 resize-y py-2.5 text-base",
                !reasonSatisfied &&
                  "border-[color-mix(in_srgb,var(--danger)_45%,white)] bg-[var(--danger-soft)]",
              )}
            />
          </Field>
        </section>
      ) : null}

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
          variant={amountsDiffer ? "danger" : "primary"}
          disabled={!valid}
          loading={submitting}
          loadingLabel="Καταχώριση…"
          onClick={submit}
        >
          Καταχώριση δαπάνης
        </Button>
        <Link
          href={`/receipts/${receiptId}/review`}
          className={buttonStyles("ghost", "lg")}
        >
          Πίσω στον έλεγχο
        </Link>
      </div>
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
    <div className="mx-auto w-full max-w-3xl">
      <Suspense fallback={<LoadingState label="Φόρτωση αιτιολόγησης…" />}>
        <JustifyForm receiptId={id} />
      </Suspense>
    </div>
  );
}
