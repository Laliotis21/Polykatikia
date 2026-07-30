import { TriangleAlert } from "lucide-react";
import { MoneyText } from "@/components/money/MoneyText";
import { formatEurFromCents } from "@/domain/money";

type MismatchBannerProps = {
  ocrAmountCents: number | null;
  operatorAmountCents: number;
};

export function MismatchBanner({
  ocrAmountCents,
  operatorAmountCents,
}: MismatchBannerProps) {
  if (ocrAmountCents == null || ocrAmountCents === operatorAmountCents) {
    return null;
  }

  const deltaCents = operatorAmountCents - ocrAmountCents;
  const sign = deltaCents > 0 ? "+" : "−";

  return (
    <div
      role="alert"
      className="rise flex gap-4 rounded-lg border border-[color-mix(in_srgb,var(--danger)_35%,white)] bg-[var(--danger-soft)] p-5"
    >
      <TriangleAlert
        className="mt-0.5 size-5 shrink-0 text-[var(--danger)]"
        aria-hidden
        strokeWidth={2}
      />
      <div className="flex min-w-0 flex-col gap-3">
        <p className="font-display font-bold text-[var(--danger)]">
          Το ποσό OCR διαφέρει από το ποσό του χειριστή
        </p>
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div className="flex flex-col gap-0.5">
            <dt className="eyebrow">OCR</dt>
            <dd>
              <MoneyText cents={ocrAmountCents} className="text-base" />
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="eyebrow">Χειριστής</dt>
            <dd>
              <MoneyText cents={operatorAmountCents} className="text-base" />
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="eyebrow">Διαφορά</dt>
            <dd className="font-mono-amounts text-base font-semibold text-[var(--danger)]">
              {sign} {formatEurFromCents(Math.abs(deltaCents))}
            </dd>
          </div>
        </dl>
        <p className="text-sm text-ink-muted">
          Απαιτείται γραπτή αιτιολόγηση τουλάχιστον 20 χαρακτήρων πριν την
          καταχώριση.
        </p>
      </div>
    </div>
  );
}
