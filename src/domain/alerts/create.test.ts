import { describe, it, expect } from "vitest";
import { shouldEnqueueAlertNotify } from "./create";

describe("shouldEnqueueAlertNotify", () => {
  it("defaults enqueueNotify to false", () => {
    expect(
      shouldEnqueueAlertNotify({
        severity: "HIGH",
        type: "OCR_MISMATCH",
        isTxClient: false,
      }),
    ).toBe(false);
  });

  it("never notifies inside a TransactionClient", () => {
    expect(
      shouldEnqueueAlertNotify({
        enqueueNotify: true,
        severity: "HIGH",
        type: "ANOMALY",
        isTxClient: true,
      }),
    ).toBe(false);
  });

  it("notifies when explicitly enabled outside tx", () => {
    expect(
      shouldEnqueueAlertNotify({
        enqueueNotify: true,
        severity: "HIGH",
        type: "OCR_MISMATCH",
        isTxClient: false,
      }),
    ).toBe(true);
  });
});
