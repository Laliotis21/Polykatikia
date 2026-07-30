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
  owner?: { id: string; name: string; email: string | null } | null;
};

export type ExpenseCategoryItem = {
  id: string;
  name: string;
  code: string | null;
  allocationMethod: AllocationMethod;
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
  };
};
