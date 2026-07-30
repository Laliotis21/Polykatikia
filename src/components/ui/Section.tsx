import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SectionProps = {
  /** One job per section — this states it. */
  title: string;
  description?: string;
  action?: ReactNode;
  /** Stagger index for the entry animation. */
  order?: number;
  children: ReactNode;
  className?: string;
};

export function Section({
  title,
  description,
  action,
  order = 0,
  children,
  className,
}: SectionProps) {
  return (
    <section
      className={cn("rise flex flex-col gap-4", className)}
      style={{ "--rise-delay": `${order * 70}ms` } as React.CSSProperties}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          {description ? (
            <p className="max-w-prose text-sm text-ink-muted">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
