import { describe, it, expect } from "vitest";
import {
  assertMismatchJustification,
  needsMismatchJustification,
  MISMATCH_JUSTIFICATION_MIN_LENGTH,
} from "./mismatch";

describe("needsMismatchJustification", () => {
  it("is false when amounts match", () => {
    expect(
      needsMismatchJustification({ amountCents: 1000, ocrAmountCents: 1000 }),
    ).toBe(false);
  });

  it("is true when amounts differ", () => {
    expect(
      needsMismatchJustification({ amountCents: 1000, ocrAmountCents: 900 }),
    ).toBe(true);
  });

  it("is false when OCR amount is null", () => {
    expect(
      needsMismatchJustification({ amountCents: 1000, ocrAmountCents: null }),
    ).toBe(false);
  });
});

describe("assertMismatchJustification", () => {
  it("allows equal amounts without justification", () => {
    expect(() =>
      assertMismatchJustification({
        amountCents: 1000,
        ocrAmountCents: 1000,
        justification: null,
      }),
    ).not.toThrow();
  });

  it("rejects mismatch without justification", () => {
    expect(() =>
      assertMismatchJustification({
        amountCents: 1000,
        ocrAmountCents: 900,
        justification: null,
      }),
    ).toThrow(/justification/i);
  });

  it("rejects short justification", () => {
    expect(() =>
      assertMismatchJustification({
        amountCents: 1000,
        ocrAmountCents: 900,
        justification: "too short",
      }),
    ).toThrow(new RegExp(String(MISMATCH_JUSTIFICATION_MIN_LENGTH)));
  });

  it("accepts justification >= 20 chars on mismatch", () => {
    expect(() =>
      assertMismatchJustification({
        amountCents: 1000,
        ocrAmountCents: 900,
        justification: "Vendor invoice differed after discount applied",
      }),
    ).not.toThrow();
  });

  it("skips when ocrAmountCents is null", () => {
    expect(() =>
      assertMismatchJustification({
        amountCents: 1000,
        ocrAmountCents: null,
        justification: null,
      }),
    ).not.toThrow();
  });
});
