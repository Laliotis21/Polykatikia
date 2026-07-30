import { LoaderCircle } from "lucide-react";

type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Loading…" }: LoadingStateProps) {
  return (
    <div
      className="flex min-h-[120px] items-center gap-3 text-[var(--ink-muted)]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoaderCircle
        className="size-5 animate-spin text-[var(--primary)]"
        aria-hidden
        strokeWidth={1.75}
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
