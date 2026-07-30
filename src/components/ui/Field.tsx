import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Shared control chrome so inputs, selects and textareas stay identical. */
export const controlStyles =
  "w-full rounded-md border border-marble-300 bg-white/85 px-3 text-ink shadow-sm transition-[border-color,box-shadow,background-color] duration-200 ease-out placeholder:text-ink-subtle hover:border-marble-400 focus:border-aegean-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60";

export const inputStyles = cn(controlStyles, "min-h-11 text-base");

type FieldProps = {
  /** Must match the `id` of the control rendered in `children`. */
  htmlFor: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  /** Rendered next to the label — e.g. "προαιρετικό" or a character counter. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Field({
  htmlFor,
  label,
  hint,
  error,
  aside,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={htmlFor}
          className="font-display text-sm font-semibold text-ink"
        >
          {label}
        </label>
        {aside ? (
          <span className="text-xs text-ink-subtle">{aside}</span>
        ) : null}
      </div>
      {children}
      {hint && !error ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="text-xs font-medium text-[var(--danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
