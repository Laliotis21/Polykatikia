import { cn } from "@/lib/cn";

/**
 * Brand mark: a stacked building elevation. The lit window in brass reads as
 * the "occupied unit" the product is ultimately accounting for.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-8", className)}
      role="img"
      aria-label="Πολυκατοικία"
    >
      <rect
        x="3"
        y="6"
        width="26"
        height="23"
        rx="3"
        fill="var(--aegean-600)"
      />
      <rect x="3" y="6" width="26" height="6" rx="3" fill="var(--aegean-800)" />
      <g fill="var(--aegean-200)">
        <rect x="7.5" y="15" width="4" height="4" rx="1" />
        <rect x="14" y="15" width="4" height="4" rx="1" />
        <rect x="7.5" y="21.5" width="4" height="4" rx="1" />
        <rect x="20.5" y="21.5" width="4" height="4" rx="1" />
      </g>
      <rect
        x="20.5"
        y="15"
        width="4"
        height="4"
        rx="1"
        fill="var(--brass-400)"
      />
      <rect x="14" y="21.5" width="4" height="4" rx="1" fill="var(--brass-300)" />
    </svg>
  );
}

export function BrandLockup({ subtitle }: { subtitle?: string }) {
  return (
    <span className="flex items-center gap-3">
      <BrandMark />
      <span className="flex min-w-0 flex-col leading-none">
        <span className="font-display text-base font-extrabold tracking-tight text-ink">
          Πολυκατοικία
        </span>
        {subtitle ? (
          <span className="mt-1 truncate text-xs text-ink-muted">
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
