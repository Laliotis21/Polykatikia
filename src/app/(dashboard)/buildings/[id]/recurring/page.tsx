"use client";

import { use, useEffect, useId, useState } from "react";
import { Repeat } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, inputStyles } from "@/components/ui/Field";
import { MoneyText } from "@/components/money/MoneyText";
import { parseEurInputToCents } from "@/components/money/parseEurInput";
import {
  createRecurringExpense,
  fetchExpenseCategories,
  fetchRecurringExpenses,
  patchRecurringExpense,
  SEED_BUILDINGS,
} from "@/components/api/operator-api";
import type {
  ExpenseCategoryItem,
  RecurringExpenseItem,
  Role,
} from "@/lib/api-types";

export default function BuildingRecurringPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const labelId = useId();
  const amountId = useId();
  const categoryId = useId();

  const [rows, setRows] = useState<RecurringExpenseItem[]>([]);
  const [categories, setCategories] = useState<ExpenseCategoryItem[]>([]);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [amountEuro, setAmountEuro] = useState("");
  const [category, setCategory] = useState("");
  const [creating, setCreating] = useState(false);

  const buildingName = SEED_BUILDINGS.find((b) => b.id === id)?.name ?? id;
  const isAdmin = role === "ADMIN";
  const canToggle = role === "ADMIN" || role === "OPERATOR";

  async function reload() {
    const [list, cats] = await Promise.all([
      fetchRecurringExpenses(id),
      fetchExpenseCategories(),
    ]);
    if (list.ok && list.data) {
      setRows(list.data.recurringExpenses);
      setRole(list.data.role);
      setPending(false);
    } else if (!list.ok && list.pending) {
      setPending(true);
      setRows([]);
    } else if (!list.ok) {
      setError(list.message);
    }
    if (cats.ok) {
      setCategories(cats.data);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      await reload();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on building id only
  }, [id]);

  async function toggleActive(row: RecurringExpenseItem) {
    if (!canToggle) return;
    setTogglingId(row.id);
    setError(null);
    const result = await patchRecurringExpense(id, row.id, {
      active: !row.active,
    });
    setTogglingId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (result.data) {
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? result.data! : r)),
      );
    }
  }

  async function onCreate() {
    setError(null);
    const amountCents = parseEurInputToCents(amountEuro);
    if (!label.trim()) {
      setError("Συμπληρώστε ετικέτα πάγιου.");
      return;
    }
    if (amountCents == null || amountCents <= 0) {
      setError("Καταχωρίστε έγκυρο ποσό σε ευρώ.");
      return;
    }
    if (!category) {
      setError("Επιλέξτε κατηγορία.");
      return;
    }
    setCreating(true);
    const result = await createRecurringExpense(id, {
      label: label.trim(),
      amountCents,
      categoryId: category,
    });
    setCreating(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setLabel("");
    setAmountEuro("");
    setCategory("");
    await reload();
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <PageHeader
        eyebrow={buildingName}
        title="Πάγια"
        description="Μηνιαίες δαπάνες με ποσό από ADMIN. Ο χειριστής μόνο ενεργοποιεί / παύει."
      />

      {loading ? <SkeletonRows rows={4} /> : null}

      {!loading && pending ? (
        <EmptyState
          icon={Repeat}
          title="API πάγιων μη διαθέσιμο"
          description="Το endpoint πάγιων δεν απάντησε. Ελέγξτε τη σύνδεση."
          pending
        />
      ) : null}

      {!loading && !pending && rows.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="Δεν υπάρχουν πάγια"
          description={
            isAdmin
              ? "Δημιουργήστε το πρώτο πάγιο παρακάτω (π.χ. Κηπουρός)."
              : "Ζητήστε από ADMIN να ορίσει ποσά πάγιων. Ως χειριστής μπορείτε μόνο να ενεργοποιείτε/παύετε."
          }
        />
      ) : null}

      {!loading && rows.length > 0 ? (
        <section className="rise panel overflow-hidden" aria-label="Λίστα πάγιων">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border-soft bg-marble-50 text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Ετικέτα</th>
                <th className="px-4 py-3 font-semibold">Κατηγορία</th>
                <th className="px-4 py-3 font-semibold">Ποσό</th>
                <th className="px-4 py-3 font-semibold">Κατάσταση</th>
                <th className="px-4 py-3 font-semibold">Ενέργεια</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border-soft last:border-0"
                >
                  <td className="px-4 py-3 font-medium text-ink">{row.label}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {row.category?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <MoneyText cents={row.amountCents} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={row.active ? "success" : "neutral"}>
                      {row.active ? "Ενεργό" : "Σε παύση"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {canToggle ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        loading={togglingId === row.id}
                        onClick={() => toggleActive(row)}
                      >
                        {row.active ? "Παύση" : "Ενεργοποίηση"}
                      </Button>
                    ) : (
                      <span className="text-ink-subtle">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {isAdmin ? (
        <section
          className="rise flex flex-col gap-5 panel p-6"
          style={{ "--rise-delay": "80ms" } as React.CSSProperties}
          aria-labelledby="create-heading"
        >
          <h2
            id="create-heading"
            className="font-display text-lg font-bold text-ink"
          >
            Νέο πάγιο (ADMIN)
          </h2>
          <Field htmlFor={labelId} label="Ετικέτα">
            <input
              id={labelId}
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className={inputStyles}
              placeholder="Κηπουρός"
            />
          </Field>
          <Field
            htmlFor={amountId}
            label="Ποσό (EUR)"
            hint="Μόνο ADMIN ορίζει ποσό — ο χειριστής δεν πληκτρολογεί χρήματα."
          >
            <input
              id={amountId}
              type="text"
              inputMode="decimal"
              value={amountEuro}
              onChange={(e) => setAmountEuro(e.target.value)}
              className={`${inputStyles} font-mono-amounts max-w-xs`}
            />
          </Field>
          <Field htmlFor={categoryId} label="Κατηγορία">
            <select
              id={categoryId}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputStyles}
            >
              <option value="">— Επιλογή —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <div>
            <Button
              type="button"
              loading={creating}
              loadingLabel="Δημιουργία…"
              onClick={onCreate}
            >
              Δημιουργία πάγιου
            </Button>
          </div>
        </section>
      ) : role != null ? (
        <p className="text-sm text-ink-muted">
          Τα ποσά πάγιων ορίζονται μόνο από ADMIN. Εσείς ({role}) μπορείτε να
          ενεργοποιείτε ή να παύετε υπάρχοντα πάγια.
        </p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-[color-mix(in_srgb,var(--danger)_30%,white)] bg-[var(--danger-soft)] px-3 py-2.5 text-sm text-[var(--danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
