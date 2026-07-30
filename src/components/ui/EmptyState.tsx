import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** The one thing the user should do next. */
  action?: ReactNode;
  /** Marks data that is unavailable because its API is not live yet. */
  pending?: boolean;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  pending = false,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className="rise flex flex-col items-center gap-4 rounded-xl border border-dashed border-marble-300 bg-white/55 px-6 py-14 text-center"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-aegean-50 text-aegean-600 ring-1 ring-aegean-100">
        <Icon className="size-6" aria-hidden strokeWidth={1.75} />
      </span>
      <div className="flex flex-col items-center gap-1.5">
        <p className="font-display text-lg font-bold text-ink">{title}</p>
        <p className="max-w-sm text-sm text-ink-muted">{description}</p>
      </div>
      {action}
      {pending ? (
        <Badge tone="warning">Το API δεν είναι ακόμη διαθέσιμο</Badge>
      ) : null}
    </div>
  );
}
