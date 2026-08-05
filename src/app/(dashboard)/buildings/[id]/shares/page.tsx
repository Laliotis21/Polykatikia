"use client";

import {
  use,
  useCallback,
  useEffect,
  useId,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { Calculator, Scale } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import { Button, buttonStyles } from "@/components/ui/Button";
import { controlStyles } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import {
  ALLOCATION_METHOD_LABELS,
  fetchBuildingApartments,
  fetchExpenseCategories,
  patchApartmentShares,
  patchExpenseCategory,
  SEED_BUILDINGS,
} from "@/components/api/operator-api";
import type {
  AllocationMethod,
  ApartmentSharesItem,
  ExpenseCategoryItem,
} from "@/lib/api-types";
import { cn } from "@/lib/cn";

const METHOD_OPTIONS = Object.keys(
  ALLOCATION_METHOD_LABELS,
) as AllocationMethod[];

/** Shares are stored in basis points; 10 000 bps = 1000‰ = the whole building. */
const TOTAL_BPS = 10000;

const numberCellStyles = cn(
  controlStyles,
  "font-mono-amounts min-h-11 w-24 px-2.5 text-sm",
);

function TotalBadge({ label, bps }: { label: string; bps: number }) {
  const balanced = bps === TOTAL_BPS;
  return (
    <span className="flex items-center gap-2 text-sm">
      <span className="text-ink-muted">{label}</span>
      <Badge tone={balanced ? "success" : "warning"}>
        {bps.toLocaleString("el-GR")} / {TOTAL_BPS.toLocaleString("el-GR")}
      </Badge>
    </span>
  );
}

export default function SharesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [apartments, setApartments] = useState<ApartmentSharesItem[]>([]);
  const [totals, setTotals] = useState({
    shareBps: 0,
    elevatorShareBps: 0,
    heatingShareBps: 0,
  });
  const [categories, setCategories] = useState<ExpenseCategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = useId();

  const buildingName = SEED_BUILDINGS.find((b) => b.id === id)?.name ?? id;

  const reload = useCallback(async () => {
    const [aptResult, catResult] = await Promise.all([
      fetchBuildingApartments(id),
      fetchExpenseCategories(),
    ]);
    setApartments(aptResult.data.apartments);
    setTotals(aptResult.data.totals);
    setCategories(catResult.data);
    setPending(
      (!aptResult.ok && Boolean(aptResult.pending)) ||
        (!catResult.ok && Boolean(catResult.pending)),
    );
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void (async () => {
      await reload();
    })();
  }, [reload]);

  function saveApartment(apt: ApartmentSharesItem) {
    setError(null);
    setStatus(null);
    setSavingId(apt.id);
    startTransition(async () => {
      const result = await patchApartmentShares(id, {
        apartmentId: apt.id,
        shareBps: apt.shareBps,
        elevatorShareBps: apt.elevatorShareBps,
        heatingShareBps: apt.heatingShareBps,
        floor: apt.floor,
        ...(apt.owner?.id ||
        apt.owner?.name?.trim() ||
        apt.owner?.email?.trim() ||
        apt.owner?.phone?.trim()
          ? {
              owner: {
                name: apt.owner?.name?.trim() || undefined,
                email: apt.owner?.email?.trim() || null,
                phone: apt.owner?.phone?.trim() || null,
              },
            }
          : {}),
      });
      if (!result.ok || !result.data) {
        setError(result.ok ? "Η αποθήκευση δεν επιβεβαιώθηκε." : result.message);
        setSavingId(null);
        return;
      }
      setStatus(`Αποθηκεύτηκε το διαμέρισμα ${apt.label}`);
      await reload();
      setSavingId(null);
    });
  }

  function updateApartment(
    index: number,
    patch: Partial<ApartmentSharesItem>,
  ) {
    setApartments((prev) =>
      prev.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    );
  }

  function updateOwner(
    index: number,
    patch: Partial<NonNullable<ApartmentSharesItem["owner"]>>,
  ) {
    setApartments((prev) =>
      prev.map((a, i) => {
        if (i !== index) return a;
        const current = a.owner ?? {
          id: "",
          name: "",
          email: null,
          phone: null,
        };
        return { ...a, owner: { ...current, ...patch } };
      }),
    );
  }

  function saveCategory(cat: ExpenseCategoryItem, method: AllocationMethod) {
    setError(null);
    setStatus(null);
    startTransition(async () => {
      const result = await patchExpenseCategory({
        id: cat.id,
        allocationMethod: method,
      });
      if (!result.ok || !result.data) {
        setError(
          result.ok ? "Η ενημέρωση δεν επιβεβαιώθηκε." : result.message,
        );
        return;
      }
      setStatus(`Ενημερώθηκε το κλειδί κατανομής: ${cat.name}`);
      await reload();
    });
  }

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow={buildingName}
        title="Χιλιοστά & επαφές"
        description="Χιλιοστά ανά διαμέρισμα, κλειδιά κατανομής, και στοιχεία επικοινωνίας ιδιοκτητών."
        actions={
          <Link
            href={`/buildings/${id}/koinoxrista`}
            className={buttonStyles("secondary")}
          >
            <Calculator className="size-4" aria-hidden strokeWidth={2} />
            Κοινόχρηστα
          </Link>
        }
      />

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

      {loading ? (
        <LoadingState label="Φόρτωση χιλιοστών…" />
      ) : apartments.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Δεν υπάρχουν διαμερίσματα"
          description="Προσθέστε διαμερίσματα στο κτίριο για να ορίσετε χιλιοστά και κλειδιά κατανομής."
          pending={pending}
        />
      ) : (
        <>
          <Section
            title="Διαμερίσματα & επαφές"
            description="Χιλιοστά σε bps (σύνολο 10.000) και στοιχεία επικοινωνίας ιδιοκτήτη."
            order={0}
          >
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <TotalBadge label="Γενικά" bps={totals.shareBps} />
              <TotalBadge label="Ανελκυστήρας" bps={totals.elevatorShareBps} />
              <TotalBadge label="Θέρμανση" bps={totals.heatingShareBps} />
            </div>

            <div className="panel overflow-x-auto">
              <table
                className="w-full min-w-5xl border-collapse text-left text-sm"
                aria-labelledby={`${formId}-apts`}
              >
                <caption id={`${formId}-apts`} className="sr-only">
                  Χιλιοστά και επαφές ανά διαμέρισμα
                </caption>
                <thead>
                  <tr className="border-b border-border-soft bg-marble-100/70">
                    <th scope="col" className="eyebrow px-5 py-3">
                      Διαμ.
                    </th>
                    <th scope="col" className="eyebrow px-5 py-3">
                      Όροφος
                    </th>
                    <th scope="col" className="eyebrow px-5 py-3">
                      Γενικά
                    </th>
                    <th scope="col" className="eyebrow px-5 py-3">
                      Ανελκυστήρας
                    </th>
                    <th scope="col" className="eyebrow px-5 py-3">
                      Θέρμανση
                    </th>
                    <th scope="col" className="eyebrow px-5 py-3">
                      Ιδιοκτήτης
                    </th>
                    <th scope="col" className="eyebrow px-5 py-3">
                      Email
                    </th>
                    <th scope="col" className="eyebrow px-5 py-3">
                      Τηλέφωνο
                    </th>
                    <th scope="col" className="px-5 py-3">
                      <span className="sr-only">Αποθήκευση</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {apartments.map((apt, index) => (
                    <tr
                      key={apt.id}
                      className="border-b border-border-soft last:border-b-0"
                    >
                      <th
                        scope="row"
                        className="px-5 py-3 text-left font-display font-bold text-ink"
                      >
                        {apt.label}
                      </th>
                      <td className="px-5 py-3">
                        <input
                          aria-label={`Όροφος διαμερίσματος ${apt.label}`}
                          type="number"
                          className={cn(numberCellStyles, "w-20")}
                          value={apt.floor ?? ""}
                          onChange={(e) =>
                            updateApartment(index, {
                              floor:
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value),
                            })
                          }
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          aria-label={`Γενικά χιλιοστά ${apt.label}`}
                          type="number"
                          min={0}
                          max={TOTAL_BPS}
                          className={numberCellStyles}
                          value={apt.shareBps}
                          onChange={(e) =>
                            updateApartment(index, {
                              shareBps: Number(e.target.value),
                            })
                          }
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          aria-label={`Χιλιοστά ανελκυστήρα ${apt.label}`}
                          type="number"
                          min={0}
                          max={TOTAL_BPS}
                          className={numberCellStyles}
                          value={apt.elevatorShareBps}
                          onChange={(e) =>
                            updateApartment(index, {
                              elevatorShareBps: Number(e.target.value),
                            })
                          }
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          aria-label={`Χιλιοστά θέρμανσης ${apt.label}`}
                          type="number"
                          min={0}
                          max={TOTAL_BPS}
                          className={numberCellStyles}
                          value={apt.heatingShareBps}
                          onChange={(e) =>
                            updateApartment(index, {
                              heatingShareBps: Number(e.target.value),
                            })
                          }
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          aria-label={`Όνομα ιδιοκτήτη ${apt.label}`}
                          type="text"
                          className={cn(
                            controlStyles,
                            "font-sans min-h-11 w-40 px-2.5 text-sm",
                          )}
                          value={apt.owner?.name ?? ""}
                          placeholder="Ονοματεπώνυμο"
                          onChange={(e) =>
                            updateOwner(index, { name: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          aria-label={`Email ιδιοκτήτη ${apt.label}`}
                          type="email"
                          className={cn(
                            controlStyles,
                            "font-sans min-h-11 w-44 px-2.5 text-sm",
                          )}
                          value={apt.owner?.email ?? ""}
                          placeholder="email@"
                          onChange={(e) =>
                            updateOwner(index, { email: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          aria-label={`Τηλέφωνο ιδιοκτήτη ${apt.label}`}
                          type="tel"
                          className={cn(
                            controlStyles,
                            "font-sans min-h-11 w-32 px-2.5 text-sm",
                          )}
                          value={apt.owner?.phone ?? ""}
                          placeholder="τηλ."
                          onChange={(e) =>
                            updateOwner(index, { phone: e.target.value })
                          }
                        />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={isPending && savingId === apt.id}
                          disabled={isPending && savingId !== apt.id}
                          onClick={() => saveApartment(apt)}
                        >
                          Αποθήκευση
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section
            title="Κατηγορίες δαπανών"
            description="Κάθε κατηγορία επιμερίζεται με το δικό της κλειδί κατανομής."
            order={1}
          >
            <div className="panel overflow-x-auto">
              <table
                className="w-full min-w-2xl border-collapse text-left text-sm"
                aria-labelledby={`${formId}-cats`}
              >
                <caption id={`${formId}-cats`} className="sr-only">
                  Μέθοδος κατανομής ανά κατηγορία δαπάνης
                </caption>
                <thead>
                  <tr className="border-b border-border-soft bg-marble-100/70">
                    <th scope="col" className="eyebrow px-5 py-3">
                      Κατηγορία
                    </th>
                    <th scope="col" className="eyebrow px-5 py-3">
                      Κωδικός
                    </th>
                    <th scope="col" className="eyebrow px-5 py-3">
                      Κλειδί κατανομής
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr
                      key={cat.id}
                      className="border-b border-border-soft last:border-b-0"
                    >
                      <th
                        scope="row"
                        className="px-5 py-3 text-left font-medium text-ink"
                      >
                        {cat.name}
                      </th>
                      <td className="px-5 py-3 font-mono-amounts text-xs text-ink-muted">
                        {cat.code ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <select
                          aria-label={`Μέθοδος κατανομής για ${cat.name}`}
                          className={cn(
                            controlStyles,
                            "min-h-11 w-56 cursor-pointer text-sm",
                          )}
                          value={cat.allocationMethod}
                          disabled={isPending}
                          onChange={(e) =>
                            saveCategory(
                              cat,
                              e.target.value as AllocationMethod,
                            )
                          }
                        >
                          {METHOD_OPTIONS.map((m) => (
                            <option key={m} value={m}>
                              {ALLOCATION_METHOD_LABELS[m]}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
