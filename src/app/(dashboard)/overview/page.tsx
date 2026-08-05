"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Calculator,
  FileUp,
  ReceiptText,
  Scale,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/ui/StatTile";
import { Skeleton } from "@/components/ui/Skeleton";
import { MoneyText } from "@/components/money/MoneyText";
import { AlertBadge, severityKind } from "@/components/alerts/AlertBadge";
import { buttonStyles } from "@/components/ui/Button";
import {
  DEFAULT_BUILDING_ID,
  resolveBuildingId,
  writeStoredBuildingId,
} from "@/components/shell/nav";
import {
  fetchAlerts,
  fetchBuildingTransactions,
  fetchBuildings,
  SEED_BUILDINGS,
  severityRank,
  txHasMismatch,
} from "@/components/api/operator-api";
import type { AlertListItem, TransactionListItem } from "@/lib/api-types";

function quickActions(buildingId: string) {
  return [
    {
      href: "/receipts/upload",
      icon: FileUp,
      title: "Νέα απόδειξη",
      body: "Ανέβασμα και έλεγχος OCR",
    },
    {
      href: `/buildings/${buildingId}/koinoxrista`,
      icon: Calculator,
      title: "Κοινόχρηστα",
      body: "Κατανομή περιόδου σε διαμερίσματα",
    },
    {
      href: `/buildings/${buildingId}/shares`,
      icon: Scale,
      title: "Χιλιοστά",
      body: "Κλειδιά κατανομής ανά κατηγορία",
    },
  ];
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("el-GR", { dateStyle: "medium" }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

function isCurrentMonth(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

export default function OverviewPage() {
  const [buildingId, setBuildingId] = useState(DEFAULT_BUILDING_ID);
  const [buildingName, setBuildingName] = useState(
    () =>
      SEED_BUILDINGS.find((b) => b.id === DEFAULT_BUILDING_ID)?.name ??
      DEFAULT_BUILDING_ID,
  );

  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [alerts, setAlerts] = useState<AlertListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const id = resolveBuildingId("/overview");
    setBuildingId(id);
    writeStoredBuildingId(id);
    void (async () => {
      const result = await fetchBuildings();
      const match = result.data.find((b) => b.id === id);
      if (match) setBuildingName(match.name);
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [txResult, alertResult] = await Promise.all([
        fetchBuildingTransactions(buildingId),
        fetchAlerts(),
      ]);
      if (cancelled) return;
      setTransactions(txResult.data);
      setAlerts(alertResult.data);
      setPending(
        (!txResult.ok && Boolean(txResult.pending)) ||
          (!alertResult.ok && Boolean(alertResult.pending)),
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [buildingId]);

  const stats = useMemo(() => {
    const expensesThisMonth = transactions
      .filter((t) => t.type === "EXPENSE" && isCurrentMonth(t.occurredAt))
      .reduce((sum, t) => sum + t.amountCents, 0);
    return {
      expensesThisMonth,
      openAlerts: alerts.filter((a) => a.status === "OPEN").length,
      mismatches: transactions.filter(txHasMismatch).length,
      entries: transactions.length,
    };
  }, [transactions, alerts]);

  const recentTransactions = useMemo(
    () =>
      [...transactions]
        .sort(
          (a, b) =>
            new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
        )
        .slice(0, 5),
    [transactions],
  );

  const openAlerts = useMemo(
    () =>
      alerts
        .filter((a) => a.status === "OPEN")
        .sort((a, b) => severityRank(a.severity) - severityRank(b.severity))
        .slice(0, 3),
    [alerts],
  );

  const monthLabel = new Intl.DateTimeFormat("el-GR", {
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow={buildingName}
        title="Επισκόπηση"
        description={`Κατάσταση κτιρίου για ${monthLabel}.`}
        actions={
          <Link href="/receipts/upload" className={buttonStyles("primary")}>
            <FileUp className="size-4" aria-hidden strokeWidth={2.2} />
            Νέα απόδειξη
          </Link>
        }
      />

      <Section
        title="Δείκτες περιόδου"
        description="Σύνοψη δαπανών και εκκρεμοτήτων ακεραιότητας."
        order={0}
      >
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="panel flex flex-col gap-4 p-5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-28" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              label="Έξοδα μήνα"
              icon={Wallet}
              value={<MoneyText cents={stats.expensesThisMonth} />}
              hint={monthLabel}
            />
            <StatTile
              label="Ανοιχτές ειδοποιήσεις"
              icon={Bell}
              tone={stats.openAlerts > 0 ? "alert" : "neutral"}
              value={stats.openAlerts}
              hint="Απαιτούν ενέργεια διαχειριστή"
              href="/alerts"
            />
            <StatTile
              label="Αποκλίσεις OCR"
              icon={TriangleAlert}
              tone={stats.mismatches > 0 ? "alert" : "neutral"}
              value={stats.mismatches}
              hint="Καταχωρήσεις με αιτιολόγηση"
            />
            <StatTile
              label="Καταχωρήσεις"
              icon={ReceiptText}
              value={stats.entries}
              hint="Σύνολο κινήσεων κτιρίου"
              href={`/buildings/${buildingId}/expenses`}
            />
          </div>
        )}
      </Section>

      <Section
        title="Γρήγορες ενέργειες"
        description="Οι τρεις εργασίες που εκτελούνται πιο συχνά."
        order={1}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {quickActions(buildingId).map(({ href, icon: Icon, title, body }) => (
            <Link key={href} href={href} className="card-interactive group p-5">
              <span className="flex size-10 items-center justify-center rounded-lg bg-aegean-50 text-aegean-600 ring-1 ring-aegean-100">
                <Icon className="size-5" aria-hidden strokeWidth={1.9} />
              </span>
              <p className="mt-4 flex items-center gap-1.5 font-display font-bold text-ink">
                {title}
                <ArrowRight
                  className="size-4 text-aegean-600 transition-transform duration-200 ease-out group-hover:translate-x-1"
                  aria-hidden
                  strokeWidth={2.2}
                />
              </p>
              <p className="mt-1 text-sm text-ink-muted">{body}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section
        title="Ειδοποιήσεις που χρειάζονται προσοχή"
        description="Ταξινομημένες κατά σοβαρότητα."
        order={2}
        action={
          <Link
            href="/alerts"
            className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-aegean-700 transition-colors duration-200 hover:text-aegean-800"
          >
            Όλες οι ειδοποιήσεις
            <ArrowRight className="size-4" aria-hidden strokeWidth={2.2} />
          </Link>
        }
      >
        {loading ? (
          <Skeleton className="h-28 w-full rounded-lg" />
        ) : openAlerts.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Καμία ανοιχτή ειδοποίηση"
            description="Δεν υπάρχουν εκκρεμείς αποκλίσεις ή ανωμαλίες δαπανών για αυτό το κτίριο."
            pending={pending}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {openAlerts.map((alert) => (
              <li key={alert.id}>
                <Link
                  href="/alerts"
                  className="card-interactive flex items-start gap-4 p-4"
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--danger-soft)] text-[var(--danger)]">
                    <TriangleAlert
                      className="size-4.5"
                      aria-hidden
                      strokeWidth={2}
                    />
                  </span>
                  <span className="flex min-w-0 flex-col gap-1.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <AlertBadge kind={severityKind(alert.severity)} />
                      <span className="font-display font-semibold text-ink">
                        {alert.title}
                      </span>
                    </span>
                    {alert.body ? (
                      <span className="line-clamp-2 text-sm text-ink-muted">
                        {alert.body}
                      </span>
                    ) : null}
                    <span className="font-mono-amounts text-xs text-ink-subtle">
                      {formatDate(alert.createdAt)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Πρόσφατες κινήσεις"
        description={`Οι τελευταίες καταχωρήσεις για ${buildingName}.`}
        order={3}
        action={
          <Link
            href={`/buildings/${buildingId}/expenses`}
            className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-aegean-700 transition-colors duration-200 hover:text-aegean-800"
          >
            Πλήρες καθολικό
            <ArrowRight className="size-4" aria-hidden strokeWidth={2.2} />
          </Link>
        }
      >
        {loading ? (
          <Skeleton className="h-40 w-full rounded-lg" />
        ) : recentTransactions.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="Καμία κίνηση ακόμη"
            description="Ανεβάστε μια απόδειξη για να καταχωριστεί η πρώτη δαπάνη του κτιρίου."
            action={
              <Link
                href="/receipts/upload"
                className={buttonStyles("primary", "sm")}
              >
                Ανέβασμα απόδειξης
              </Link>
            }
            pending={pending}
          />
        ) : (
          <ul className="panel divide-y divide-[var(--border-soft)] overflow-hidden">
            {recentTransactions.map((tx) => (
              <li
                key={tx.id}
                className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate font-medium text-ink">
                    {tx.description ?? tx.category?.name ?? "Δαπάνη"}
                  </p>
                  <p className="font-mono-amounts text-xs text-ink-subtle">
                    {formatDate(tx.occurredAt)}
                    {tx.category?.name ? ` · ${tx.category.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {txHasMismatch(tx) ? <AlertBadge kind="mismatch" /> : null}
                  <MoneyText
                    cents={tx.amountCents}
                    className="text-base font-medium"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
