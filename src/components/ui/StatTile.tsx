import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type StatTileProps = {
  label: string;
  /** Pre-formatted value — pass `<MoneyText>` for amounts. */
  value: ReactNode;
  hint?: string;
  icon: LucideIcon;
  /** Draws attention when the figure needs action. */
  tone?: "neutral" | "alert";
  /** When set the whole tile becomes a link, so it is styled as a card. */
  href?: string;
};

const TONE_ICON = {
  neutral: "bg-aegean-50 text-aegean-600 ring-aegean-100",
  alert: "bg-[var(--danger-soft)] text-[var(--danger)] ring-[color-mix(in_srgb,var(--danger)_20%,white)]",
} as const;

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  href,
}: StatTileProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow">{label}</p>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1",
            TONE_ICON[tone],
          )}
        >
          <Icon className="size-4.5" aria-hidden strokeWidth={1.9} />
        </span>
      </div>
      <p className="mt-4 font-mono-amounts text-2xl font-semibold text-ink">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="card-interactive block p-5">
        {body}
      </Link>
    );
  }

  return <div className="panel p-5">{body}</div>;
}
