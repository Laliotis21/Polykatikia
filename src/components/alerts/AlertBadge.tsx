type AlertBadgeProps = {
  kind: "mismatch" | "anomaly" | "high" | "open" | "acked" | "resolved";
  label?: string;
};

const STYLES: Record<AlertBadgeProps["kind"], string> = {
  mismatch:
    "border-[var(--danger)] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]",
  anomaly:
    "border-[var(--warning)] bg-[color-mix(in_srgb,var(--warning)_12%,transparent)] text-[var(--warning)]",
  high: "border-[var(--danger)] text-[var(--danger)]",
  open: "border-[var(--primary)] text-[var(--primary)]",
  acked: "border-[var(--ink-muted)] text-[var(--ink-muted)]",
  resolved: "border-[var(--border)] text-[var(--ink-muted)]",
};

const DEFAULT_LABEL: Record<AlertBadgeProps["kind"], string> = {
  mismatch: "OCR mismatch",
  anomaly: "Anomaly",
  high: "HIGH",
  open: "OPEN",
  acked: "ACKED",
  resolved: "RESOLVED",
};

export function AlertBadge({ kind, label }: AlertBadgeProps) {
  return (
    <span
      className={`inline-flex min-h-7 items-center border px-2 text-xs font-medium tracking-wide uppercase ${STYLES[kind]}`}
    >
      {label ?? DEFAULT_LABEL[kind]}
    </span>
  );
}
