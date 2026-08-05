"use client";

import { use, useEffect, useId, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Calculator, Check, Scale, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/ui/StatTile";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Field, controlStyles } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { MoneyText } from "@/components/money/MoneyText";
import {
  ALLOCATION_METHOD_LABELS,
  fetchKoinoxristaPreview,
  finalizeKoinoxrista,
  SEED_BUILDINGS,
} from "@/components/api/operator-api";
import type { KoinoxristaPreview } from "@/lib/api-types";
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

export default function KoinoxristaPage({
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
  const [preview, setPreview] = useState<KoinoxristaPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const buildingName = SEED_BUILDINGS.find((b) => b.id === id)?.name ?? id;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const result = await fetchKoinoxristaPreview(id, year, month);
      if (cancelled) return;
      setPreview(result.data);
      setPending(!result.ok && Boolean(result.pending));
      if (!result.ok && !result.pending) {
        setError(result.message);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, year, month]);

  function onFinalize() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await finalizeKoinoxrista(id, year, month);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (!result.data) {
        setError("Η οριστικοποίηση δεν επέστρεψε αποτέλεσμα.");
        return;
      }
      setSuccess(
        `Οριστικοποιήθηκε · ${result.data.chargeTransactionIds.length} χρεώσεις · ειδοποιήσεις σε ουρά`,
      );
      const refreshed = await fetchKoinoxristaPreview(id, year, month);
      setPreview(refreshed.data);
    });
  }

  const finalized = preview?.existingSettlement?.status === "FINALIZED";
  const statements = preview?.statement.apartmentStatements ?? [];
  const allocatableTotal = statements.reduce((s, a) => s + a.totalCents, 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={buildingName}
        title="Κοινόχρηστα"
        description="Κατανομή δαπανών περιόδου στα διαμερίσματα, βάσει των χιλιοστών κάθε κατηγορίας."
        actions={
          <>
            <Link
              href={`/buildings/${id}/shares`}
              className={buttonStyles("secondary")}
            >
              <Scale className="size-4" aria-hidden strokeWidth={2} />
              Χιλιοστά
            </Link>
            <Button
              onClick={onFinalize}
              loading={isPending}
              loadingLabel="Οριστικοποίηση…"
              disabled={finalized || loading || allocatableTotal <= 0}
            >
              {finalized ? (
                <>
                  <Check className="size-4" aria-hidden strokeWidth={2.5} />
                  Οριστικοποιημένο
                </>
              ) : (
                <>
                  <Calculator className="size-4" aria-hidden strokeWidth={2} />
                  Οριστικοποίηση χρεώσεων
                </>
              )}
            </Button>
          </>
        }
      />

      <section
        className="rise panel flex flex-wrap items-end gap-5 p-5"
        style={{ "--rise-delay": "60ms" } as React.CSSProperties}
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
        {finalized ? (
          <Badge tone="success" className="mb-3">
            Περίοδος οριστικοποιημένη
          </Badge>
        ) : null}
      </section>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-[color-mix(in_srgb,var(--danger)_30%,white)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]"
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          role="status"
          className="rounded-md border border-[color-mix(in_srgb,var(--success)_30%,white)] bg-[var(--success-soft)] px-3 py-2.5 text-sm font-medium text-[var(--success)]"
        >
          {success}
        </p>
      ) : null}

      {loading ? (
        <LoadingState label="Υπολογισμός κοινοχρήστων…" />
      ) : !preview ? (
        <EmptyState
          icon={Calculator}
          title="Δεν υπάρχει προεπισκόπηση"
          description="Ελέγξτε ότι το κτίριο έχει διαμερίσματα και ότι υπάρχουν δαπάνες για την επιλεγμένη περίοδο."
          pending={pending}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatTile
              label="Σύνολο δαπανών"
              icon={Wallet}
              value={<MoneyText cents={preview.statement.totalExpenseCents} />}
              hint={`${MONTH_NAMES[month - 1]} ${year}`}
            />
            <StatTile
              label="Προς κατανομή"
              icon={Calculator}
              value={<MoneyText cents={allocatableTotal} />}
              hint={`${statements.length} διαμερίσματα`}
            />
            <StatTile
              label="Εκτός κατανομής"
              icon={Scale}
              value={
                <MoneyText
                  cents={
                    preview.statement.skippedManualCents +
                    preview.statement.skippedUncategorizedCents
                  }
                />
              }
              hint="Χειροκίνητα ή χωρίς κατηγορία"
            />
          </div>

          {statements.length === 0 || allocatableTotal === 0 ? (
            <EmptyState
              icon={Calculator}
              title="Καμία κατανομή για την περίοδο"
              description="Προσθέστε δαπάνες με κατηγορία που διαθέτει κλειδί χιλιοστών, ώστε να υπολογιστεί η κατανομή."
              action={
                <Link
                  href={`/buildings/${id}/shares`}
                  className={buttonStyles("primary", "sm")}
                >
                  Ρύθμιση κλειδιών
                </Link>
              }
            />
          ) : (
            <div
              className="rise panel overflow-hidden"
              style={{ "--rise-delay": "120ms" } as React.CSSProperties}
            >
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">
                  Κατανομή κοινοχρήστων ανά διαμέρισμα
                </caption>
                <thead>
                  <tr className="border-b border-border-soft bg-marble-100/70">
                    <th scope="col" className="eyebrow px-5 py-3">
                      Διαμέρισμα
                    </th>
                    <th scope="col" className="eyebrow px-5 py-3">
                      Ανάλυση
                    </th>
                    <th scope="col" className="eyebrow px-5 py-3 text-right">
                      Σύνολο
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {statements.map((stmt) => (
                    <tr
                      key={stmt.apartmentId}
                      className="border-b border-border-soft align-top transition-colors duration-150 last:border-b-0 hover:bg-aegean-50/50"
                    >
                      <th
                        scope="row"
                        className="px-5 py-4 text-left font-display font-bold whitespace-nowrap text-ink"
                      >
                        {stmt.apartmentLabel}
                      </th>
                      <td className="px-5 py-4">
                        {stmt.lines.length === 0 ? (
                          <span className="text-ink-subtle">—</span>
                        ) : (
                          <ul className="flex flex-col gap-1.5">
                            {stmt.lines.map((line, idx) => (
                              <li
                                key={`${line.categoryId}-${idx}`}
                                className="flex flex-wrap items-center gap-2 text-ink-muted"
                              >
                                <span className="text-ink">
                                  {line.categoryName ?? "Κατηγορία"}
                                </span>
                                <Badge tone="neutral">
                                  {ALLOCATION_METHOD_LABELS[
                                    line.allocationMethod
                                  ]}
                                </Badge>
                                <MoneyText
                                  cents={line.amountCents}
                                  className="text-xs"
                                />
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <MoneyText
                          cents={stmt.totalCents}
                          className="text-base font-semibold"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-aegean-600 bg-aegean-50/60">
                    <th
                      scope="row"
                      colSpan={2}
                      className="px-5 py-4 text-left font-display font-bold text-ink"
                    >
                      Σύνολο κατανομής
                    </th>
                    <td className="px-5 py-4 text-right">
                      <MoneyText
                        cents={allocatableTotal}
                        className="text-base font-bold"
                      />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
