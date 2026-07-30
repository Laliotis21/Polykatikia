import { formatEurFromCents } from "@/domain/money";
import { cn } from "@/lib/cn";

type MoneyTextProps = {
  cents: number | null | undefined;
  className?: string;
  fallback?: string;
  /** Colours negative-signed intent without relying on colour alone. */
  tone?: "default" | "danger" | "success";
};

const TONES = {
  default: "text-ink",
  danger: "text-[var(--danger)]",
  success: "text-[var(--success)]",
} as const;

/** Displays EUR from integer cents via the domain formatter, in tabular figures. */
export function MoneyText({
  cents,
  className = "",
  fallback = "—",
  tone = "default",
}: MoneyTextProps) {
  if (cents == null || !Number.isInteger(cents)) {
    return (
      <span className={cn("font-mono-amounts text-ink-subtle", className)}>
        {fallback}
      </span>
    );
  }

  return (
    <span className={cn("font-mono-amounts", TONES[tone], className)}>
      {formatEurFromCents(cents)}
    </span>
  );
}
