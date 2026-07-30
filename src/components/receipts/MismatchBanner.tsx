import { AlertTriangle } from "lucide-react";
import { MoneyText } from "@/components/money/MoneyText";

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

  return (
    <div
      role="alert"
      className="flex gap-3 border border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_8%,var(--surface))] px-4 py-3 text-[var(--danger)]"
    >
      <AlertTriangle
        className="mt-0.5 size-5 shrink-0"
        aria-hidden
        strokeWidth={1.75}
      />
      <div className="min-w-0 space-y-1 text-sm">
        <p className="font-semibold">OCR amount differs from operator amount</p>
        <p className="text-[var(--ink)]">
          OCR: <MoneyText cents={ocrAmountCents} className="text-[var(--danger)]" />
          {" · "}
          Operator:{" "}
          <MoneyText
            cents={operatorAmountCents}
            className="text-[var(--danger)]"
          />
        </p>
        <p className="text-[var(--ink-muted)]">
          A written justification of at least 20 characters is required before
          posting.
        </p>
      </div>
    </div>
  );
}
