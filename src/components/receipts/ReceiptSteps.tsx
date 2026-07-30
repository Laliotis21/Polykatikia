import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

const STEPS = ["Ανέβασμα", "Έλεγχος OCR", "Καταχώριση"] as const;

type ReceiptStepsProps = {
  /** Zero-based index of the step currently in progress. */
  current: 0 | 1 | 2;
};

/** Progress through the upload → review → post journey. */
export function ReceiptSteps({ current }: ReceiptStepsProps) {
  return (
    <nav aria-label="Στάδια καταχώρισης" className="rise">
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {STEPS.map((label, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={label} className="flex items-center gap-3">
              <span
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors duration-200",
                  active && "border-aegean-600 bg-aegean-600 text-white",
                  done && "border-aegean-200 bg-aegean-50 text-aegean-700",
                  !active &&
                    !done &&
                    "border-marble-300 bg-white/70 text-ink-subtle",
                )}
                aria-current={active ? "step" : undefined}
              >
                {done ? (
                  <Check className="size-3.5" aria-hidden strokeWidth={3} />
                ) : (
                  <span className="font-mono-amounts">{index + 1}</span>
                )}
                {label}
              </span>
              {index < STEPS.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "hidden h-px w-8 sm:block",
                    done ? "bg-aegean-300" : "bg-marble-300",
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
