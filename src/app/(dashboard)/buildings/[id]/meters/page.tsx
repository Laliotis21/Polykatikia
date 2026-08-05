"use client";

import { use, useEffect, useId, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Calculator, Gauge, Save, Scale } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import { Button, buttonStyles } from "@/components/ui/Button";
import { Field, controlStyles } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import {
  fetchMeterReadings,
  putMeterReadings,
  SEED_BUILDINGS,
} from "@/components/api/operator-api";
import type { MeterReadingRow } from "@/lib/api-types";
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

const numberCellStyles = cn(
  controlStyles,
  "font-mono-amounts min-h-11 w-28 px-2.5 text-sm",
);

function periodDefaults(): { year: number; month: number } {
  // Demo: Jan 2026 has seeded meter readings + heating expense.
  return { year: 2026, month: 1 };
}

export default function MetersPage({
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
  const [rows, setRows] = useState<MeterReadingRow[]>([]);
  const [draftUnits, setDraftUnits] = useState<Record<string, string>>({});
  const [hasAnyReading, setHasAnyReading] = useState(false);
  const [usesMeters, setUsesMeters] = useState(true);
  const [missingLabels, setMissingLabels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const buildingName = SEED_BUILDINGS.find((b) => b.id === id)?.name ?? id;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setStatus(null);
      const result = await fetchMeterReadings(id, year, month);
      if (cancelled) return;
      if (!result.ok && !result.pending) {
        setError(result.message);
        setRows([]);
        setDraftUnits({});
        setHasAnyReading(false);
        setUsesMeters(false);
        setMissingLabels([]);
      } else if (result.data) {
        setRows(result.data.rows);
        setHasAnyReading(result.data.hasAnyReading);
        setUsesMeters(result.data.usesMeters ?? true);
        setMissingLabels(result.data.missingLabels);
        setDraftUnits(
          Object.fromEntries(
            result.data.rows.map((r) => [
              r.apartmentId,
              r.units != null ? String(r.units) : "",
            ]),
          ),
        );
        setPending(Boolean(result.pending));
      } else {
        setPending(true);
        setRows([]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, year, month]);

  function onSave() {
    setError(null);
    setStatus(null);
    const readings: Array<{ apartmentId: string; units: number }> = [];
    for (const row of rows) {
      const raw = (draftUnits[row.apartmentId] ?? "").trim();
      if (raw === "") continue;
      const units = Number(raw);
      if (!Number.isInteger(units) || units < 0) {
        setError(`Μη έγκυρη ένδειξη για ${row.label} (ακέραιος ≥ 0).`);
        return;
      }
      readings.push({ apartmentId: row.apartmentId, units });
    }
    if (readings.length === 0) {
      setError("Συμπλήρωσε τουλάχιστον μία ένδειξη.");
      return;
    }

    startTransition(async () => {
      const result = await putMeterReadings(id, year, month, readings);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setStatus(`Αποθηκεύτηκαν ${result.data?.count ?? readings.length} ενδείξεις.`);
      const refreshed = await fetchMeterReadings(id, year, month);
      if (refreshed.data) {
        setRows(refreshed.data.rows);
        setHasAnyReading(refreshed.data.hasAnyReading);
        setMissingLabels(refreshed.data.missingLabels);
        setDraftUnits(
          Object.fromEntries(
            refreshed.data.rows.map((r) => [
              r.apartmentId,
              r.units != null ? String(r.units) : "",
            ]),
          ),
        );
      }
    });
  }

  const totalUnits = rows.reduce((sum, row) => {
    const raw = (draftUnits[row.apartmentId] ?? "").trim();
    const n = Number(raw);
    return sum + (Number.isInteger(n) && n >= 0 ? n : 0);
  }, 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={buildingName}
        title="Ενδείξεις θέρμανσης"
        description={
          usesMeters
            ? "Κατανάλωση ανά διαμέρισμα για την περίοδο. Το κτίριο είναι ρυθμισμένο σε κατανομή με μετρητές — τα κοινόχρηστα θέρμανσης μοιράζονται με βάρη ενδείξεων."
            : "Αυτό το κτίριο χρησιμοποιεί σταθερά χιλιοστά θέρμανσης. Οι ενδείξεις δεν χρησιμοποιούνται στην κατανομή — αλλάξτε τη ρύθμιση στα Κτίρια αν χρειάζεται αυτονομία."
        }
        actions={
          <>
            <Link
              href={`/buildings/${id}/koinoxrista`}
              className={buttonStyles("secondary")}
            >
              <Calculator className="size-4" aria-hidden strokeWidth={2} />
              Κοινόχρηστα
            </Link>
            <Link
              href={`/buildings/${id}/shares`}
              className={buttonStyles("secondary")}
            >
              <Scale className="size-4" aria-hidden strokeWidth={2} />
              Χιλιοστά
            </Link>
            <Button
              onClick={onSave}
              loading={isPending}
              loadingLabel="Αποθήκευση…"
              disabled={loading || rows.length === 0 || !usesMeters}
            >
              <Save className="size-4" aria-hidden strokeWidth={2} />
              Αποθήκευση
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
            className={controlStyles}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        <Field htmlFor={yearId} label="Έτος" className="min-w-28">
          <input
            id={yearId}
            type="number"
            className={controlStyles}
            value={year}
            min={2000}
            max={2100}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-3 pb-1">
          <Badge tone={usesMeters ? (hasAnyReading ? "success" : "warning") : "neutral"}>
            {usesMeters
              ? hasAnyReading
                ? "Κατανομή: ενδείξεις"
                : "Λείπουν ενδείξεις"
              : "Κτίριο: σταθερά χιλιοστά"}
          </Badge>
          <span className="text-sm text-ink-muted">
            Σύνολο μονάδων:{" "}
            <span className="font-mono-amounts text-ink">{totalUnits}</span>
          </span>
        </div>
      </section>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-[color-mix(in_srgb,var(--danger)_30%,white)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]"
        >
          {error}
        </p>
      ) : null}
      {status ? (
        <p
          role="status"
          className="rounded-md border border-[color-mix(in_srgb,var(--success)_30%,white)] bg-[var(--success-soft)] px-3 py-2.5 text-sm font-medium text-[var(--success)]"
        >
          {status}
        </p>
      ) : null}
      {usesMeters && !hasAnyReading ? (
        <p
          role="status"
          className="rounded-md border border-brass-200 bg-[var(--warning-soft)] px-3 py-2.5 text-sm text-[var(--warning)]"
        >
          Δεν υπάρχουν ενδείξεις για αυτή την περίοδο. Η οριστικοποίηση
          κοινοχρήστων με έξοδα θέρμανσης θα απορριφθεί μέχρι να καταχωρηθούν.
        </p>
      ) : null}
      {usesMeters && hasAnyReading && missingLabels.length > 0 ? (
        <p
          role="status"
          className="rounded-md border border-brass-200 bg-[var(--warning-soft)] px-3 py-2.5 text-sm text-[var(--warning)]"
        >
          Προειδοποίηση: χωρίς ένδειξη (λογίζονται ως 0):{" "}
          {missingLabels.join(", ")}
        </p>
      ) : null}

      {loading ? (
        <LoadingState label="Φόρτωση ενδείξεων…" />
      ) : pending ? (
        <EmptyState
          icon={Gauge}
          title="API ενδείξεων μη διαθέσιμο"
          description="Το endpoint δεν απάντησε. Έλεγξε σύνδεση / deployment."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Χωρίς διαμερίσματα"
          description="Πρόσθεσε διαμερίσματα στα Χιλιοστά πριν καταχωρήσεις ενδείξεις."
        />
      ) : (
        <Section
          title="Ενδείξεις ανά διαμέρισμα"
          description="Ακέραιες μονάδες κατανάλωσης (ώρες / ticks / demo units). Κενό = χωρίς εγγραφή· σε λειτουργία ενδείξεων μετράει ως 0."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-edge text-ink-muted">
                  <th className="px-3 py-2 font-medium">Διαμέρισμα</th>
                  <th className="px-3 py-2 font-medium">Χιλιοστά θέρμανσης</th>
                  <th className="px-3 py-2 font-medium">Ένδειξη (μονάδες)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.apartmentId}
                    className="border-b border-edge/60"
                  >
                    <td className="px-3 py-2.5 font-medium">{row.label}</td>
                    <td className="px-3 py-2.5 font-mono-amounts text-ink-muted">
                      {row.heatingShareBps}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        className={numberCellStyles}
                        aria-label={`Ένδειξη ${row.label}`}
                        value={draftUnits[row.apartmentId] ?? ""}
                        placeholder="—"
                        onChange={(e) =>
                          setDraftUnits((prev) => ({
                            ...prev,
                            [row.apartmentId]: e.target.value,
                          }))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 flex items-start gap-2 text-sm text-ink-muted">
            <Gauge className="mt-0.5 size-4 shrink-0" aria-hidden strokeWidth={2} />
            Demo: Ιανουάριος 2026 στο Κολωνάκι έχει seed ενδείξεις 5 / 20 / 50 / 10.
            Ξαναφόρτωσε Κοινόχρηστα 01/2026 για γραμμές Θέρμανσης με βάρη κατανάλωσης.
          </p>
        </Section>
      )}
    </div>
  );
}
