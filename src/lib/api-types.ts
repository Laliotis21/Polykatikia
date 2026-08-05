/**
 * Shared API request/response contracts for Agents 2–4.
 * Keep in sync with design §5 and live route handlers.
 */

export type Role = "ADMIN" | "OPERATOR" | "VIEWER";

export type AlertStatus = "OPEN" | "ACKED" | "RESOLVED";

export type BuildingSummary = {
  id: string;
  name: string;
  address: string | null;
  heatingAllocation: "FIXED_SHARES" | "METER_READINGS";
};

export type CreateTransactionBody = {
  buildingId: string;
  type: "EXPENSE" | "INCOME" | "CHARGE";
  amountCents: number;
  occurredAt: string;
  categoryId?: string;
  apartmentId?: string;
  receiptId?: string;
  description?: string;
  mismatchJustification?: string;
};

export type CreateReceiptResponse = {
  /** Alias of `id` for draft UX */
  receiptId: string;
  id: string;
  buildingId: string;
  ocrAmountCents: number | null;
  ocrVendor: string | null;
  ocrDate: string | null;
  confidence: number | null;
  status: "UPLOADED" | "PROCESSING" | "READY" | "FAILED";
  storagePath: string;
};

export type ReceiptDetail = CreateReceiptResponse & {
  mimeType: string;
  createdAt: string;
};

export type CreateTransactionResponse = {
  transaction: {
    id: string;
    amountCents: number;
    type: string;
    buildingId: string;
    receiptId: string | null;
    mismatchJustification: string | null;
    occurredAt: string;
  };
  alerts: Array<{ id: string; type: string; severity: string }>;
  anomalyFired: boolean;
};

export type TransactionListItem = {
  id: string;
  buildingId: string;
  type: string;
  amountCents: number;
  description: string | null;
  occurredAt: string;
  categoryId: string | null;
  /** Flattened category label for table UIs (optional; prefer `category?.name`) */
  categoryName?: string | null;
  apartmentId: string | null;
  receiptId: string | null;
  mismatchJustification: string | null;
  hasMismatchAlert?: boolean;
  hasAnomalyAlert?: boolean;
  category?: { id: string; name: string; code: string | null } | null;
  receipt?: {
    id: string;
    ocrAmountCents: number | null;
    ocrVendor: string | null;
    status: string;
  } | null;
  alerts?: Array<{
    id: string;
    type: string;
    severity: string;
    status: string;
  }>;
};

export type AlertListItem = {
  id: string;
  buildingId: string | null;
  transactionId: string | null;
  type: string;
  severity: string;
  status: AlertStatus | string;
  title: string;
  body: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
};

export type PatchAlertBody = {
  status: "ACKED" | "RESOLVED";
};

export type AllocationMethod =
  | "GENERAL_SHARES"
  | "ELEVATOR_SHARES"
  | "HEATING_SHARES"
  | "EQUAL"
  | "MANUAL";

export type ApartmentSharesItem = {
  id: string;
  label: string;
  shareBps: number;
  elevatorShareBps: number;
  heatingShareBps: number;
  floor: number | null;
  owner?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
};

export type ExpenseCategoryItem = {
  id: string;
  name: string;
  code: string | null;
  allocationMethod: AllocationMethod;
};

export type RecurringExpenseItem = {
  id: string;
  buildingId: string;
  categoryId: string;
  label: string;
  amountCents: number;
  dayOfMonth: number;
  active: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string; code: string | null } | null;
};

export type RecurringExpensesResponse = {
  role: Role;
  recurringExpenses: RecurringExpenseItem[];
};

export type KoinoxristaLine = {
  apartmentId: string;
  apartmentLabel: string;
  categoryId: string | null;
  categoryName: string | null;
  allocationMethod: AllocationMethod;
  amountCents: number;
  shareUsedBps: number;
  expenseIds: string[];
};

export type KoinoxristaApartmentStatement = {
  apartmentId: string;
  apartmentLabel: string;
  totalCents: number;
  lines: KoinoxristaLine[];
};

export type KoinoxristaPreview = {
  buildingId: string;
  year: number;
  month: number;
  from: string;
  to: string;
  existingSettlement: {
    id: string;
    status: "DRAFT" | "FINALIZED";
    totalCents: number;
    finalizedAt: string | null;
  } | null;
  statement: {
    totalExpenseCents: number;
    skippedManualCents: number;
    skippedUncategorizedCents: number;
    apartmentStatements: KoinoxristaApartmentStatement[];
    lines: KoinoxristaLine[];
    heatingAllocationMode?: "FIXED_SHARES" | "METER_READINGS";
    missingHeatingReadingLabels?: string[];
  };
  heatingAllocation?: "FIXED_SHARES" | "METER_READINGS";
};

export type MeterReadingRow = {
  apartmentId: string;
  label: string;
  heatingShareBps: number;
  floor: number | null;
  units: number | null;
  readingId: string | null;
  updatedAt: string | null;
};

export type MeterReadingsResponse = {
  building: {
    id: string;
    name: string;
    heatingAllocation: "FIXED_SHARES" | "METER_READINGS";
  };
  year: number;
  month: number;
  hasAnyReading: boolean;
  usesMeters: boolean;
  missingLabels: string[];
  rows: MeterReadingRow[];
};

export type CollectionRow = {
  chargeId: string;
  apartmentId: string | null;
  apartmentLabel: string | null;
  amountCents: number;
  description: string | null;
  occurredAt: string;
  status: "PAID" | "OPEN";
  incomeId: string | null;
  paidAt: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
};

export type CollectionsResponse = {
  building: BuildingSummary;
  buildingId: string;
  year: number | null;
  month: number | null;
  settlementId: string | null;
  rows: CollectionRow[];
  totals: { openCents: number; paidCents: number; chargeCount: number };
};

export type PortalChargeRow = {
  chargeId: string;
  buildingId: string;
  buildingName: string;
  apartmentId: string;
  apartmentLabel: string;
  amountCents: number;
  description: string | null;
  occurredAt: string;
  status: "PAID" | "OPEN";
  paidAt: string | null;
  lines: Array<{ categoryName: string | null; amountCents: number }>;
};

export type PortalPayload = {
  owner: { id: string; name: string; email: string | null };
  charges: PortalChargeRow[];
};

export type PayChargeResponse = {
  incomeId: string;
  chargeId: string;
  amountCents: number;
  alreadyPaid: boolean;
};
