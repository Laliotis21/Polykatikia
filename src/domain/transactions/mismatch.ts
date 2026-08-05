import { assertCents } from "@/domain/money";

/**
 * When a receipt is linked to a transaction, require OCR READY + non-null
 * `ocrAmountCents`. Null OCR must not bypass integrity gates.
 */
export function assertReceiptOcrLinkable(input: {
  receiptStatus: string;
  ocrAmountCents: number | null | undefined;
}): void {
  if (input.receiptStatus !== "READY") {
    throw new ReceiptAmountMismatchError(
      "Receipt OCR must be READY before linking to a transaction",
    );
  }
  if (input.ocrAmountCents == null) {
    throw new ReceiptAmountMismatchError(
      "Receipt OCR amount is required before linking to a transaction",
    );
  }
  assertCents(input.ocrAmountCents);
}

export class ReceiptAmountMismatchError extends Error {
  readonly status = 400;

  constructor(message = "amountCents must equal receipt OCR amount") {
    super(message);
    this.name = "ReceiptAmountMismatchError";
  }
}

/** Receipt-linked EXPENSE amount must equal OCR — no operator override. */
export function assertReceiptAmountMatchesOcr(input: {
  amountCents: number;
  ocrAmountCents: number;
}): void {
  assertCents(input.amountCents);
  assertCents(input.ocrAmountCents);
  if (input.amountCents !== input.ocrAmountCents) {
    throw new ReceiptAmountMismatchError();
  }
}
