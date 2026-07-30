"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BellOff, Check, ExternalLink, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button, buttonStyles } from "@/components/ui/Button";
import {
  AlertBadge,
  severityKind,
  statusKind,
} from "@/components/alerts/AlertBadge";
import {
  fetchAlerts,
  patchAlert,
  severityRank,
} from "@/components/api/operator-api";
import type { AlertListItem } from "@/lib/api-types";
import { cn } from "@/lib/cn";

const STATUS_FILTERS = [
  { value: "OPEN", label: "Ανοιχτές" },
  { value: "ALL", label: "Όλες" },
  { value: "RESOLVED", label: "Επιλυμένες" },
] as const;

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
  const [statusFilter, setStatusFilter] = useState<string>("OPEN");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
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
    void (async () => {
      await load();
    })();
  }, [load]);

  const visible = useMemo(() => {
    if (statusFilter === "ALL") return alerts;
    if (statusFilter === "RESOLVED") {
      return alerts.filter((a) => a.status === "RESOLVED");
    }
    return alerts.filter((a) => a.status !== "RESOLVED");
  }, [alerts, statusFilter]);

  const openCount = alerts.filter((a) => a.status === "OPEN").length;

  async function updateStatus(id: string, status: "ACKED" | "RESOLVED") {
    setError(null);
    setActionId(id);
    const result = await patchAlert(id, { status });
    setActionId(null);
    if (!result.ok) {
      setError(
        result.pending
          ? "Η ενημέρωση ειδοποιήσεων δεν είναι ακόμη διαθέσιμη."
          : result.message,
      );
      return;
    }
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <PageHeader
        eyebrow="Ακεραιότητα"
        title="Ειδοποιήσεις"
        description="Αποκλίσεις OCR και ανωμαλίες δαπανών, ταξινομημένες κατά σοβαρότητα."
      />

      <div
        className="rise flex flex-wrap items-center justify-between gap-4"
        style={{ "--rise-delay": "60ms" } as React.CSSProperties}
      >
        <div
          role="group"
          aria-label="Φίλτρο κατάστασης"
          className="flex flex-wrap gap-1 rounded-lg border border-border-soft bg-white/70 p-1"
        >
          {STATUS_FILTERS.map((filter) => {
            const active = statusFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                aria-pressed={active}
                onClick={() => setStatusFilter(filter.value)}
                className={cn(
                  "min-h-9 cursor-pointer rounded-md px-3.5 text-sm font-semibold transition-colors duration-200 ease-out",
                  active
                    ? "bg-aegean-600 text-white shadow-sm"
                    : "text-ink-muted hover:bg-marble-100 hover:text-ink",
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {!loading && openCount > 0 ? (
          <p className="flex items-center gap-2 text-sm font-medium text-ink-muted">
            <span
              className="beacon size-2 rounded-full bg-[var(--danger)]"
              aria-hidden
            />
            {openCount} ανοιχτές ειδοποιήσεις
          </p>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-[color-mix(in_srgb,var(--danger)_30%,white)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-lg" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="Καθαρή εικόνα"
          description="Δεν υπάρχουν ειδοποιήσεις για το επιλεγμένο φίλτρο. Οι αποκλίσεις OCR και οι ανωμαλίες δαπανών εμφανίζονται εδώ."
          pending={pending}
        />
      ) : (
        <ul className="rise flex flex-col gap-4">
          {visible.map((alert) => {
            const href = relatedHref(alert);
            const isMismatch = alert.type === "OCR_MISMATCH";
            const busy = actionId === alert.id;
            return (
              <li key={alert.id} className="card-interactive p-5">
                <div className="flex items-start gap-4">
                  <span
                    className={cn(
                      "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg",
                      isMismatch
                        ? "bg-[var(--danger-soft)] text-[var(--danger)]"
                        : "bg-[var(--warning-soft)] text-[var(--warning)]",
                    )}
                  >
                    <TriangleAlert
                      className="size-5"
                      aria-hidden
                      strokeWidth={2}
                    />
                  </span>

                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <AlertBadge kind={isMismatch ? "mismatch" : "anomaly"} />
                      <AlertBadge kind={severityKind(alert.severity)} />
                      <AlertBadge kind={statusKind(String(alert.status))} />
                    </div>

                    <h2 className="font-display text-base font-bold text-ink">
                      {alert.title}
                    </h2>

                    {alert.body ? (
                      <p className="text-sm text-ink-muted">{alert.body}</p>
                    ) : null}

                    <p className="font-mono-amounts text-xs text-ink-subtle">
                      {formatCreatedAt(alert.createdAt)}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {href ? (
                        <Link
                          href={href}
                          className={buttonStyles("secondary", "sm")}
                        >
                          <ExternalLink
                            className="size-4"
                            aria-hidden
                            strokeWidth={2}
                          />
                          Σχετική κίνηση
                        </Link>
                      ) : null}
                      {alert.status === "OPEN" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={busy}
                          onClick={() => void updateStatus(alert.id, "ACKED")}
                        >
                          Λήψη γνώσης
                        </Button>
                      ) : null}
                      {alert.status !== "RESOLVED" ? (
                        <Button
                          size="sm"
                          loading={busy}
                          onClick={() => void updateStatus(alert.id, "RESOLVED")}
                        >
                          <Check className="size-4" aria-hidden strokeWidth={2.5} />
                          Επίλυση
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
