import { formatEurFromCents } from "@/domain/money";

type MoneyTextProps = {
  cents: number | null | undefined;
  className?: string;
  fallback?: string;
};

/** Displays EUR from integer cents via domain formatter (Fira Code). */
export function MoneyText({
  cents,
  className = "",
  fallback = "—",
}: MoneyTextProps) {
  if (cents == null || !Number.isInteger(cents)) {
    return (
      <span className={`font-mono-amounts text-[var(--ink-muted)] ${className}`}>
        {fallback}
      </span>
    );
  }

  return (
    <span className={`font-mono-amounts tabular-nums ${className}`}>
      {formatEurFromCents(cents)}
    </span>
  );
}
