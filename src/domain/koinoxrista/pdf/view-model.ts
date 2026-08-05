import { formatEurFromCents } from "@/domain/money";
import type { AllocationMethod } from "../allocate";
import type { PreviewKoinoxristaResult } from "../settle";

export const MONTH_NAMES_EL = [
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
] as const;

export const ALLOCATION_METHOD_LABELS_EL: Record<AllocationMethod, string> = {
  GENERAL_SHARES: "Γενικά χιλιοστά",
  ELEVATOR_SHARES: "Χιλιοστά ανελκυστήρα",
  HEATING_SHARES: "Χιλιοστά θέρμανσης",
  EQUAL: "Ισόποσα",
  MANUAL: "Χειροκίνητα",
};

export type KoinoxristaPdfBuilding = {
  name: string;
  address: string | null;
};

export type KoinoxristaPdfInput = {
  building: KoinoxristaPdfBuilding;
  preview: PreviewKoinoxristaResult;
  /** Current owner display name keyed by apartmentId. */
  ownersByApartmentId: Record<string, string | null>;
  printedAt?: Date;
};

export type PdfCategoryRow = {
  key: string;
  categoryName: string;
  methodLabel: string;
  amountCents: number;
  amountLabel: string;
};

export type PdfApartmentLine = {
  categoryName: string;
  methodLabel: string;
  shareLabel: string;
  amountCents: number;
  amountLabel: string;
};

export type PdfApartmentPage = {
  apartmentId: string;
  label: string;
  ownerName: string | null;
  totalCents: number;
  totalLabel: string;
  lines: PdfApartmentLine[];
};

export type PdfApartmentSummaryRow = {
  label: string;
  ownerName: string | null;
  totalCents: number;
  totalLabel: string;
};

export type KoinoxristaPdfViewModel = {
  buildingName: string;
  buildingAddress: string | null;
  periodLabel: string;
  year: number;
  month: number;
  fromLabel: string;
  toLabel: string;
  printedAtLabel: string;
  isDraft: boolean;
  heatingModeLabel: string;
  totalExpenseCents: number;
  totalExpenseLabel: string;
  allocatableTotalCents: number;
  allocatableTotalLabel: string;
  skippedCents: number;
  skippedLabel: string;
  categoryRows: PdfCategoryRow[];
  apartments: PdfApartmentPage[];
  apartmentSummaryRows: PdfApartmentSummaryRow[];
};

/** Convert shareUsedBps (10_000 = 1000‰) to Greek χιλιοστά label. */
export function formatSharesLabel(shareUsedBps: number): string {
  if (!Number.isFinite(shareUsedBps) || shareUsedBps < 0) return "—";
  const chiliosta = Math.round(shareUsedBps / 10);
  return `${chiliosta}‰`;
}

function formatDateEl(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Athens",
  }).format(d);
}

function aggregateCategoryRows(
  preview: PreviewKoinoxristaResult,
): PdfCategoryRow[] {
  const map = new Map<
    string,
    { categoryName: string; method: AllocationMethod; amountCents: number }
  >();

  for (const line of preview.statement.lines) {
    const key = `${line.categoryId ?? "none"}|${line.allocationMethod}`;
    const existing = map.get(key);
    const categoryName = line.categoryName?.trim() || "Κατηγορία";
    if (existing) {
      existing.amountCents += line.amountCents;
    } else {
      map.set(key, {
        categoryName,
        method: line.allocationMethod,
        amountCents: line.amountCents,
      });
    }
  }

  return [...map.entries()]
    .map(([key, row]) => ({
      key,
      categoryName: row.categoryName,
      methodLabel: ALLOCATION_METHOD_LABELS_EL[row.method],
      amountCents: row.amountCents,
      amountLabel: formatEurFromCents(row.amountCents),
    }))
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName, "el"));
}

/**
 * Flat DTO for PDF templates. Pure mapping — no I/O.
 */
export function buildKoinoxristaPdfViewModel(
  input: KoinoxristaPdfInput,
): KoinoxristaPdfViewModel {
  const { building, preview, ownersByApartmentId } = input;
  const printedAt = input.printedAt ?? new Date();
  const { year, month, statement } = preview;

  const monthName = MONTH_NAMES_EL[month - 1] ?? String(month);
  const periodLabel = `${monthName} ${year}`;

  const isDraft = preview.existingSettlement?.status !== "FINALIZED";

  const heatingModeLabel =
    preview.heatingAllocation === "METER_READINGS" ||
    statement.heatingAllocationMode === "METER_READINGS"
      ? "Θέρμανση: ενδείξεις"
      : "Θέρμανση: χιλιοστά";

  const apartments: PdfApartmentPage[] = statement.apartmentStatements.map(
    (apt) => ({
      apartmentId: apt.apartmentId,
      label: apt.apartmentLabel,
      ownerName: ownersByApartmentId[apt.apartmentId] ?? null,
      totalCents: apt.totalCents,
      totalLabel: formatEurFromCents(apt.totalCents),
      lines: apt.lines.map((line) => ({
        categoryName: line.categoryName?.trim() || "Κατηγορία",
        methodLabel: ALLOCATION_METHOD_LABELS_EL[line.allocationMethod],
        shareLabel: formatSharesLabel(line.shareUsedBps),
        amountCents: line.amountCents,
        amountLabel: formatEurFromCents(line.amountCents),
      })),
    }),
  );

  const allocatableTotalCents = apartments.reduce(
    (sum, a) => sum + a.totalCents,
    0,
  );
  const skippedCents =
    statement.skippedManualCents + statement.skippedUncategorizedCents;

  return {
    buildingName: building.name,
    buildingAddress: building.address,
    periodLabel,
    year,
    month,
    fromLabel: formatDateEl(preview.from),
    toLabel: formatDateEl(preview.to),
    printedAtLabel: formatDateEl(printedAt),
    isDraft,
    heatingModeLabel,
    totalExpenseCents: statement.totalExpenseCents,
    totalExpenseLabel: formatEurFromCents(statement.totalExpenseCents),
    allocatableTotalCents,
    allocatableTotalLabel: formatEurFromCents(allocatableTotalCents),
    skippedCents,
    skippedLabel: formatEurFromCents(skippedCents),
    categoryRows: aggregateCategoryRows(preview),
    apartments,
    apartmentSummaryRows: apartments.map((a) => ({
      label: a.label,
      ownerName: a.ownerName,
      totalCents: a.totalCents,
      totalLabel: a.totalLabel,
    })),
  };
}
