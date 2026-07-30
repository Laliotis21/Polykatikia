import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md font-display font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out select-none disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-aegean-600 text-white shadow-sm hover:bg-aegean-700 hover:shadow-md active:translate-y-px active:bg-aegean-800",
  secondary:
    "border border-marble-300 bg-white/80 text-ink hover:border-aegean-400 hover:bg-white hover:text-aegean-700 active:translate-y-px",
  ghost:
    "text-ink-muted hover:bg-marble-100 hover:text-ink active:translate-y-px",
  danger:
    "bg-[var(--danger)] text-white shadow-sm hover:bg-[var(--danger-hover)] hover:shadow-md active:translate-y-px",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-6 text-base",
};

/** Shared styling so `<Link>` and `<button>` can present identically. */
export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Announced while `loading`; falls back to the resting label. */
  loadingLabel?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles(variant, size, className)}
    >
      {loading ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
      ) : null}
      {loading ? (loadingLabel ?? children) : children}
    </button>
  );
}
