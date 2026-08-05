import { describe, it, expect } from "vitest";
import {
  assertReceiptAmountMatchesOcr,
  assertReceiptOcrLinkable,
  ReceiptAmountMismatchError,
} from "./mismatch";

describe("assertReceiptAmountMatchesOcr", () => {
  it("accepts equal amounts", () => {
    expect(() =>
      assertReceiptAmountMatchesOcr({
        amountCents: 4520,
        ocrAmountCents: 4520,
      }),
    ).not.toThrow();
  });

  it("rejects unequal amounts", () => {
    expect(() =>
      assertReceiptAmountMatchesOcr({
        amountCents: 4500,
        ocrAmountCents: 4520,
      }),
    ).toThrow(ReceiptAmountMismatchError);
  });
});

describe("assertReceiptOcrLinkable", () => {
  it("requires READY status", () => {
    expect(() =>
      assertReceiptOcrLinkable({
        receiptStatus: "PROCESSING",
        ocrAmountCents: 1000,
      }),
    ).toThrow(/READY/);
  });

  it("rejects null OCR amount even when READY", () => {
    expect(() =>
      assertReceiptOcrLinkable({
        receiptStatus: "READY",
        ocrAmountCents: null,
      }),
    ).toThrow(/OCR amount is required/);
  });

  it("accepts READY + non-null ocrAmountCents", () => {
    expect(() =>
      assertReceiptOcrLinkable({
        receiptStatus: "READY",
        ocrAmountCents: 4520,
      }),
    ).not.toThrow();
  });
});
