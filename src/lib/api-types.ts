/**
 * Shared API request/response contract sketches for Agents 2–4.
 * Agents own route Zod schemas; keep these in sync with design §5.
 */

export type Role = "ADMIN" | "OPERATOR" | "VIEWER";

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
  id: string;
  ocrAmountCents: number | null;
  status: "UPLOADED" | "PROCESSING" | "READY" | "FAILED";
  storagePath: string;
};

export type CreateTransactionResponse = {
  transaction: { id: string; amountCents: number; type: string };
  alerts: Array<{ id: string; type: string; severity: string }>;
  anomalyFired: boolean;
};
