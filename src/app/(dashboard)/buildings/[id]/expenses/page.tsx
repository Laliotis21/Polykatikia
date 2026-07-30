"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileUp, ReceiptText } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { buttonStyles } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MoneyText } from "@/components/money/MoneyText";
import { AlertBadge } from "@/components/alerts/AlertBadge";
import {
  fetchBuildingTransactions,
  SEED_BUILDINGS,
  txHasAnomaly,
  txHasMismatch,
} from "@/components/api/operator-api";
import type { TransactionListItem } from "@/lib/api-types";
import { cn } from "@/lib/cn";

const TYPE_FILTERS = [
  { value: "ALL", label: "Όλα" },
  { value: "EXPENSE", label: "Δαπάνες" },
  { value: "INCOME", label: "Έσοδα" },
  { value: "CHARGE", label: "Χρεώσεις" },
] as const;

const TYPE_LABELS: Record<string, string> = {
  EXPENSE: "Δαπάνη",
  INCOME: "Έσοδο",
  CHARGE: "Χρέωση",
};

function formatOccurredAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("el-GR", { dateStyle: "medium" }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

function Flags({ tx }: { tx: TransactionListItem }) {
  const mismatch = txHasMismatch(tx);
  const anomaly = txHasAnomaly(tx);
  if (!mismatch && !anomaly && !tx.receiptId) {
    return <span className="text-ink-subtle">—</span>;
  }
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {mismatch ? <AlertBadge kind="mismatch" /> : null}
      {anomaly ? <AlertBadge kind="anomaly" /> : null}
      {tx.receiptId ? (
        <Link
          href={`/receipts/${tx.receiptId}/review`}
          className="rounded-md text-xs font-semibold text-aegean-700 underline-offset-2 transition-colors duration-200 hover:text-aegean-800 hover:underline"
        >
          Απόδειξη
        </Link>
      ) : null}
    </span>
  );
}

export default function BuildingExpensesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [rows, setRows] = useState<TransactionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const buildingName = SEED_BUILDINGS.find((b) => b.id === id)?.name ?? id;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const result = await fetchBuildingTransactions(id);
      if (cancelled) return;
      setRows(result.data);
      setPending(!result.ok && Boolean(result.pending));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const filtered = useMemo(
    () => (typeFilter === "ALL" ? rows : rows.filter((r) => r.type === typeFilter)),
    [rows, typeFilter],
  );

  const total = useMemo(
    () => filtered.reduce((sum, r) => sum + r.amountCents, 0),
    [filtered],
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={buildingName}
        title="Έξοδα κτιρίου"
        description="Καθολικό κοινόχρηστων δαπανών, εσόδων και χρεώσεων."
        actions={
          <Link href="/receipts/upload" className={buttonStyles("primary")}>
            <FileUp className="size-4" aria-hidden strokeWidth={2.2} />
            Νέα απόδειξη
          </Link>
        }
      />

      <div
        className="rise flex flex-wrap items-center justify-between gap-4"
        style={{ "--rise-delay": "60ms" } as React.CSSProperties}
      >
        <div
          role="group"
          aria-label="Φίλτρο τύπου κίνησης"
          className="flex flex-wrap gap-1 rounded-lg border border-border-soft bg-white/70 p-1"
        >
          {TYPE_FILTERS.map((filter) => {
            const active = typeFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                aria-pressed={active}
                onClick={() => setTypeFilter(filter.value)}
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

        {!loading && filtered.length > 0 ? (
          <p className="flex items-baseline gap-2 text-sm text-ink-muted">
            <span>{filtered.length} κινήσεις ·</span>
            <MoneyText
              cents={total}
              className="text-base font-semibold text-ink"
            />
          </p>
        ) : null}
      </div>

      {loading ? (
        <SkeletonRows rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Καμία κίνηση"
          description="Δεν υπάρχουν καταχωρήσεις για το επιλεγμένο φίλτρο. Ανεβάστε μια απόδειξη για να καταχωρίσετε δαπάνη."
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
        <>
          {/* Desktop: scannable table. */}
          <div
            className="rise panel hidden overflow-hidden md:block"
            style={{ "--rise-delay": "120ms" } as React.CSSProperties}
          >
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">
                Κινήσεις κτιρίου {buildingName}
              </caption>
              <thead>
                <tr className="border-b border-border-soft bg-marble-100/70">
                  <th scope="col" className="eyebrow px-5 py-3">
                    Ημερομηνία
                  </th>
                  <th scope="col" className="eyebrow px-5 py-3">
                    Τύπος
                  </th>
                  <th scope="col" className="eyebrow px-5 py-3">
                    Κατηγορία
                  </th>
                  <th scope="col" className="eyebrow px-5 py-3">
                    Περιγραφή
                  </th>
                  <th scope="col" className="eyebrow px-5 py-3 text-right">
                    Ποσό
                  </th>
                  <th scope="col" className="eyebrow px-5 py-3">
                    Σημάνσεις
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <tr
                    key={tx.id}
                    id={`tx-${tx.id}`}
                    className="border-b border-border-soft transition-colors duration-150 last:border-b-0 hover:bg-aegean-50/50"
                  >
                    <td className="px-5 py-4 font-mono-amounts text-xs whitespace-nowrap text-ink-muted">
                      {formatOccurredAt(tx.occurredAt)}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        tone={tx.type === "INCOME" ? "success" : "neutral"}
                      >
                        {TYPE_LABELS[tx.type] ?? tx.type}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-ink-muted">
                      {tx.category?.name ?? tx.categoryName ?? "—"}
                    </td>
                    <td className="max-w-64 truncate px-5 py-4 text-ink">
                      {tx.description ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <MoneyText
                        cents={tx.amountCents}
                        className="font-medium"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <Flags tx={tx} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: one record per row, no horizontal scrolling. */}
          <ul className="rise flex flex-col gap-3 md:hidden">
            {filtered.map((tx) => (
              <li key={tx.id} id={`tx-m-${tx.id}`} className="panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="truncate font-medium text-ink">
                      {tx.description ?? tx.category?.name ?? "Δαπάνη"}
                    </p>
                    <p className="font-mono-amounts text-xs text-ink-subtle">
                      {formatOccurredAt(tx.occurredAt)}
                    </p>
                  </div>
                  <MoneyText
                    cents={tx.amountCents}
                    className="shrink-0 font-semibold"
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge tone={tx.type === "INCOME" ? "success" : "neutral"}>
                    {TYPE_LABELS[tx.type] ?? tx.type}
                  </Badge>
                  <Flags tx={tx} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
