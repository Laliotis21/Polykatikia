"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, LoaderCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlertBadge } from "@/components/alerts/AlertBadge";
import {
  fetchAlerts,
  patchAlert,
  severityRank,
} from "@/components/api/operator-api";
import type { AlertListItem } from "@/lib/api-types";

function formatCreatedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("el-GR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function relatedHref(alert: AlertListItem): string | null {
  if (alert.buildingId && alert.transactionId) {
    return `/buildings/${alert.buildingId}/expenses#tx-${alert.transactionId}`;
  }
  if (alert.buildingId) {
    return `/buildings/${alert.buildingId}/expenses`;
  }
  return null;
}

export default function AlertsInboxPage() {
  const [alerts, setAlerts] = useState<AlertListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchAlerts();
    const sorted = [...result.data].sort((a, b) => {
      const sev = severityRank(a.severity) - severityRank(b.severity);
      if (sev !== 0) return sev;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    setAlerts(sorted);
    setPending(!result.ok && Boolean(result.pending));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(id: string, status: "ACKED" | "RESOLVED") {
    setError(null);
    setActionId(id);
    const result = await patchAlert(id, { status });
    setActionId(null);
    if (!result.ok) {
      setError(
        result.pending
          ? "API pending — alert PATCH is not available yet."
          : result.message,
      );
      return;
    }
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a)),
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Alerts inbox"
        description="Severity-sorted integrity alerts. ADMIN can acknowledge or resolve."
      />

      {error ? (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <LoadingState label="Loading alerts…" />
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No alerts"
          description="OCR mismatches and spend anomalies will appear here when APIs are live."
          pending={pending}
        />
      ) : (
        <ul className="divide-y divide-[var(--border)] border border-[var(--border)]">
          {alerts.map((alert) => {
            const href = relatedHref(alert);
            const isMismatch = alert.type === "OCR_MISMATCH";
            return (
              <li key={alert.id} className="space-y-3 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-1.5">
                      <AlertBadge
                        kind={isMismatch ? "mismatch" : "anomaly"}
                        label={alert.type.replace("_", " ")}
                      />
                      <AlertBadge kind="high" label={alert.severity} />
                      <AlertBadge
                        kind={
                          alert.status === "OPEN"
                            ? "open"
                            : alert.status === "ACKED"
                              ? "acked"
                              : "resolved"
                        }
                      />
                    </div>
                    <h2 className="text-sm font-semibold text-[var(--ink)]">
                      {alert.title}
                    </h2>
                    {alert.body ? (
                      <p className="text-sm text-[var(--ink-muted)]">
                        {alert.body}
                      </p>
                    ) : null}
                    <p className="font-mono-amounts text-xs text-[var(--ink-muted)]">
                      {formatCreatedAt(alert.createdAt)}
                      {alert.transactionId
                        ? ` · tx ${alert.transactionId}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {href ? (
                    <Link
                      href={href}
                      className="inline-flex min-h-11 items-center border border-[var(--border)] px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                    >
                      Related ledger
                    </Link>
                  ) : null}
                  {alert.status === "OPEN" ? (
                    <button
                      type="button"
                      disabled={actionId === alert.id}
                      onClick={() => void updateStatus(alert.id, "ACKED")}
                      className="inline-flex min-h-11 items-center gap-2 border border-[var(--primary)] px-3 text-sm text-[var(--primary)] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                    >
                      {actionId === alert.id ? (
                        <LoaderCircle className="size-4 animate-spin" aria-hidden />
                      ) : null}
                      Acknowledge
                    </button>
                  ) : null}
                  {alert.status !== "RESOLVED" ? (
                    <button
                      type="button"
                      disabled={actionId === alert.id}
                      onClick={() => void updateStatus(alert.id, "RESOLVED")}
                      className="inline-flex min-h-11 items-center gap-2 bg-[var(--primary)] px-3 text-sm text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                    >
                      Resolve
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
