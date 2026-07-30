import { assertCents } from "@/domain/money";

export const MISMATCH_JUSTIFICATION_MIN_LENGTH = 20;

export type MismatchGateInput = {
  amountCents: number;
  ocrAmountCents: number | null | undefined;
  justification: string | null | undefined;
};

export class MismatchJustificationError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = "MismatchJustificationError";
  }
}

/** True when OCR amount is present and differs from operator amount. */
export function needsMismatchJustification(input: {
  amountCents: number;
  ocrAmountCents: number | null | undefined;
}): boolean {
  assertCents(input.amountCents);
  if (input.ocrAmountCents == null) return false;
  assertCents(input.ocrAmountCents);
  return input.amountCents !== input.ocrAmountCents;
}

/**
 * When a receipt is linked to a transaction, require OCR READY + non-null
 * `ocrAmountCents`. Null OCR must not bypass mismatch / integrity gates.
 */
export function assertReceiptOcrLinkable(input: {
  receiptStatus: string;
  ocrAmountCents: number | null | undefined;
}): void {
  if (input.receiptStatus !== "READY") {
    throw new MismatchJustificationError(
      "Receipt OCR must be READY before linking to a transaction",
    );
  }
  if (input.ocrAmountCents == null) {
    throw new MismatchJustificationError(
      "Receipt OCR amount is required before linking to a transaction",
    );
  }
  assertCents(input.ocrAmountCents);
}

/**
 * OCR mismatch gate (design §4):
 * when operator amount ≠ OCR amount, require justification ≥ 20 chars.
 */
export function assertMismatchJustification(input: MismatchGateInput): void {
  assertCents(input.amountCents);
  if (!needsMismatchJustification(input)) {
    return;
  }

  const text = input.justification?.trim() ?? "";
  if (!text) {
    throw new MismatchJustificationError(
      "Mismatch justification is required when amountCents differs from OCR amount",
    );
  }
  if (text.length < MISMATCH_JUSTIFICATION_MIN_LENGTH) {
    throw new MismatchJustificationError(
      `Mismatch justification must be at least ${MISMATCH_JUSTIFICATION_MIN_LENGTH} characters`,
    );
  }
}
