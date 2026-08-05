"use client";

import { use, useEffect, useId, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Banknote,
  Check,
  CircleDollarSign,
  ExternalLink,
  Hash,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/ui/StatTile";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Field, controlStyles } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { MoneyText } from "@/components/money/MoneyText";
import {
  fetchCollections,
  operatorPayCharge,
  SEED_BUILDINGS,
} from "@/components/api/operator-api";
import type { CollectionsResponse } from "@/lib/api-types";
import { cn } from "@/lib/cn";

const MONTH_NAMES = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
];

function periodDefaults(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export default function CollectionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const yearId = useId();
  const monthId = useId();
  const defaults = useMemo(() => periodDefaults(), []);

  const [year, setYear] = useState(defaults.year);
  const [month, setMonth] = useState(defaults.month);
  const [data, setData] = useState<CollectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const buildingName =
    data?.building.name ??
    SEED_BUILDINGS.find((b) => b.id === id)?.name ??
    id;

  async function reload() {
    setLoading(true);
    setError(null);
    const result = await fetchCollections(id, year, month);
    setData(result.data);
    if (!result.ok) setError(result.message);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const result = await fetchCollections(id, year, month);
      if (cancelled) return;
      setData(result.data);
      if (!result.ok) setError(result.message);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, year, month]);

  function onPay(chargeId: string) {
    setError(null);
    setPayingId(chargeId);
    startTransition(async () => {
      const result = await operatorPayCharge(id, chargeId);
      setPayingId(null);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await reload();
    });
  }

  const rows = data?.rows ?? [];
  const totals = data?.totals;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={buildingName}
        title="Εισπράξεις"
        description="Ποιος πλήρωσε / ποιος χρωστάει για την οριστικοποιημένη περίοδο."
        actions={
          <Link
            href={`/buildings/${id}/koinoxrista`}
            className={buttonStyles("secondary")}
          >
            Κοινόχρηστα
            <ExternalLink className="size-4" aria-hidden />
          </Link>
        }
      />

      <section
        className="rise panel flex flex-wrap items-end gap-5 p-5"
        aria-label="Επιλογή περιόδου"
      >
        <Field htmlFor={monthId} label="Μήνας" className="min-w-44">
          <select
            id={monthId}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className={cn(controlStyles, "min-h-11 cursor-pointer text-base")}
          >
            {MONTH_NAMES.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        <Field htmlFor={yearId} label="Έτος" className="w-32">
          <input
            id={yearId}
            type="number"
            min={2000}
            max={2100}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className={cn(controlStyles, "font-mono-amounts min-h-11 text-base")}
          />
        </Field>
      </section>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-[color-mix(in_srgb,var(--danger)_30%,white)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <LoadingState label="Φόρτωση εισπράξεων…" />
      ) : !data || rows.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Καμία χρέωση"
          description="Οριστικοποιήστε κοινόχρηστα για αυτόν τον μήνα πρώτα."
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile
              icon={Hash}
              label="Χρεώσεις"
              value={String(totals?.chargeCount ?? 0)}
            />
            <StatTile
              icon={CircleDollarSign}
              label="Εισπραγμένα"
              value={<MoneyText cents={totals?.paidCents ?? 0} />}
            />
            <StatTile
              icon={Banknote}
              label="Ανοιχτά"
              value={<MoneyText cents={totals?.openCents ?? 0} />}
              tone={(totals?.openCents ?? 0) > 0 ? "alert" : "neutral"}
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Διαμέρισμα</th>
                  <th className="px-3 py-2 font-medium">Ιδιοκτήτης</th>
                  <th className="px-3 py-2 font-medium">Ποσό</th>
                  <th className="px-3 py-2 font-medium">Κατάσταση</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.chargeId}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-3 py-2.5 font-medium text-slate-900">
                      {row.apartmentLabel ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {row.ownerName ?? "—"}
                      {row.ownerEmail ? (
                        <span className="mt-0.5 block text-xs text-slate-400">
                          {row.ownerEmail}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 font-mono-amounts">
                      <MoneyText cents={row.amountCents} />
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge
                        tone={row.status === "PAID" ? "success" : "warning"}
                      >
                        {row.status === "PAID" ? "Πληρωμένο" : "Ανοιχτό"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {row.status === "OPEN" ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={payingId === row.chargeId}
                          onClick={() => onPay(row.chargeId)}
                        >
                          <Banknote className="size-3.5" aria-hidden />
                          {payingId === row.chargeId
                            ? "…"
                            : "Πληρωμή (demo)"}
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                          <Check className="size-3.5" aria-hidden />
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
