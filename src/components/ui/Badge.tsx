import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "danger"
  | "warning"
  | "success";

const TONES: Record<BadgeTone, string> = {
  neutral: "border-marble-300 bg-marble-100 text-marble-700",
  primary: "border-aegean-200 bg-aegean-50 text-aegean-700",
  danger:
    "border-[color-mix(in_srgb,var(--danger)_28%,white)] bg-[var(--danger-soft)] text-[var(--danger)]",
  warning:
    "border-brass-200 bg-[var(--warning-soft)] text-[var(--warning)]",
  success:
    "border-[color-mix(in_srgb,var(--success)_25%,white)] bg-[var(--success-soft)] text-[var(--success)]",
};

type BadgeProps = {
  tone?: BadgeTone;
  /** Renders a leading dot — use for live/status semantics. */
  dot?: boolean;
  children: ReactNode;
  className?: string;
};

export function Badge({
  tone = "neutral",
  dot = false,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-2xs font-semibold tracking-wide uppercase",
        TONES[tone],
        className,
      )}
    >
      {dot ? (
        <span
          className="size-1.5 rounded-full bg-current"
          aria-hidden
        />
      ) : null}
      {children}
    </span>
  );
}
