import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  pending?: boolean;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  pending = false,
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-start gap-3 border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-5 py-8"
      role="status"
    >
      <Icon
        className="size-6 text-[var(--ink-muted)]"
        aria-hidden
        strokeWidth={1.5}
      />
      <div className="space-y-1">
        <p className="font-medium text-[var(--ink)]">{title}</p>
        <p className="max-w-md text-sm text-[var(--ink-muted)]">{description}</p>
        {pending ? (
          <p className="pt-1 text-xs font-medium tracking-wide text-[var(--warning)] uppercase">
            API pending
          </p>
        ) : null}
      </div>
    </div>
  );
}
