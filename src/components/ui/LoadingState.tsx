import { Skeleton } from "@/components/ui/Skeleton";

/** Ragged widths so the placeholder reads as prose rather than as bars. */
const LINE_WIDTHS = ["w-full", "w-11/12", "w-2/3"];

type LoadingStateProps = {
  label?: string;
  /** Number of placeholder lines to reserve, preventing layout jump. */
  lines?: number;
};

/**
 * Skeleton-first loading. The visible placeholder conveys the shape of the
 * incoming content; the label is announced to assistive tech only.
 */
export function LoadingState({
  label = "Φόρτωση…",
  lines = 3,
}: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="rise">
      <span className="sr-only">{label}</span>
      <div className="flex flex-col gap-4 rounded-lg border border-border-soft bg-white/60 p-5">
        <Skeleton className="h-4 w-40" />
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} className={`h-3 ${LINE_WIDTHS[i % 3]}`} />
        ))}
      </div>
    </div>
  );
}
