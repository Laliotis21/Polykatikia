import { cn } from "@/lib/cn";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return <span className={cn("skeleton block", className)} aria-hidden />;
}

/** Placeholder rows that mirror the ledger table's column rhythm. */
export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-px overflow-hidden rounded-lg border border-border-soft bg-marble-200">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_1fr_2fr_auto] items-center gap-4 bg-white/80 px-4 py-4"
        >
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-full max-w-56" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
