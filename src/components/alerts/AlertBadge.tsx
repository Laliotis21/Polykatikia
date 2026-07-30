import { Badge, type BadgeTone } from "@/components/ui/Badge";

type AlertBadgeKind =
  | "mismatch"
  | "anomaly"
  | "high"
  | "medium"
  | "low"
  | "open"
  | "acked"
  | "resolved";

type AlertBadgeProps = {
  kind: AlertBadgeKind;
  label?: string;
};

const TONES: Record<AlertBadgeKind, BadgeTone> = {
  mismatch: "danger",
  anomaly: "warning",
  high: "danger",
  medium: "warning",
  low: "neutral",
  open: "primary",
  acked: "neutral",
  resolved: "success",
};

const LABELS: Record<AlertBadgeKind, string> = {
  mismatch: "Απόκλιση OCR",
  anomaly: "Ανωμαλία",
  high: "Υψηλή",
  medium: "Μεσαία",
  low: "Χαμηλή",
  open: "Ανοιχτή",
  acked: "Σε γνώση",
  resolved: "Επιλύθηκε",
};

/** Maps an alert's severity string onto a badge kind. */
export function severityKind(severity: string): AlertBadgeKind {
  if (severity === "HIGH") return "high";
  if (severity === "MEDIUM") return "medium";
  return "low";
}

/** Maps an alert's status string onto a badge kind. */
export function statusKind(status: string): AlertBadgeKind {
  if (status === "OPEN") return "open";
  if (status === "ACKED") return "acked";
  return "resolved";
}

export function AlertBadge({ kind, label }: AlertBadgeProps) {
  return (
    <Badge tone={TONES[kind]} dot={kind === "open"}>
      {label ?? LABELS[kind]}
    </Badge>
  );
}
