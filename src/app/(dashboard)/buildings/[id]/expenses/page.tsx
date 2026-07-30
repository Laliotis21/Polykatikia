"use client";

import { use, useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Receipt } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { MoneyText } from "@/components/money/MoneyText";
import { AlertBadge } from "@/components/alerts/AlertBadge";
import {
  fetchBuildingTransactions,
  SEED_BUILDINGS,
  txHasAnomaly,
  txHasMismatch,
} from "@/components/api/operator-api";
import type { TransactionListItem } from "@/lib/api-types";

function formatOccurredAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("el-GR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function BuildingExpensesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const typeFilterId = useId();

  const [rows, setRows] = useState<TransactionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const buildingName =
    SEED_BUILDINGS.find((b) => b.id === id)?.name ?? id;

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

  const filtered = useMemo(() => {
    if (typeFilter === "ALL") return rows;
    return rows.filter((r) => r.type === typeFilter);
  }, [rows, typeFilter]);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        title="Building expenses"
        description={`${buildingName} · ledger of shared expenses and related alerts`}
      />

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label
            htmlFor={typeFilterId}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--ink-muted)]"
          >
            <Filter className="size-3.5" aria-hidden />
            Type filter (stub)
          </label>
          <select
            id={typeFilterId}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="min-h-11 border border-[var(--border)] bg-[var(--surface)] px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          >
            <option value="ALL">All types</option>
            <option value="EXPENSE">EXPENSE</option>
            <option value="INCOME">INCOME</option>
            <option value="CHARGE">CHARGE</option>
          </select>
        </div>
        <Link
          href="/receipts/upload"
          className="inline-flex min-h-11 items-center border border-[var(--border)] px-3 text-sm text-[var(--ink)] hover:bg-[var(--surface-2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
        >
          Upload receipt
        </Link>
      </div>

      {loading ? (
        <LoadingState label="Loading transactions…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No transactions yet"
          description="Post an expense from OCR review, or wait until the building transactions API is live."
          pending={pending}
        />
      ) : (
        <div className="overflow-x-auto border border-[var(--border)]">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <thead className="bg-[var(--surface-2)] text-xs tracking-wide text-[var(--ink-muted)] uppercase">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Date
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Type
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Category
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Description
                </th>
                <th scope="col" className="px-3 py-2 font-medium text-right">
                  Amount
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Flags
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-t border-[var(--border)] hover:bg-[var(--surface-2)]"
                >
                  <td className="px-3 py-2.5 whitespace-nowrap text-[var(--ink)]">
                    {formatOccurredAt(tx.occurredAt)}
                  </td>
                  <td className="px-3 py-2.5 font-mono-amounts text-xs">
                    {tx.type}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--ink-muted)]">
                    {tx.category?.name ?? tx.categoryId ?? "—"}
                  </td>
                  <td className="max-w-[14rem] truncate px-3 py-2.5">
                    {tx.description ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <MoneyText cents={tx.amountCents} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {txHasMismatch(tx) ? (
                        <AlertBadge kind="mismatch" />
                      ) : null}
                      {txHasAnomaly(tx) ? (
                        <AlertBadge kind="anomaly" />
                      ) : null}
                      {tx.receiptId ? (
                        <Link
                          href={`/receipts/${tx.receiptId}/review`}
                          className="text-xs text-[var(--primary)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
                        >
                          Receipt
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
