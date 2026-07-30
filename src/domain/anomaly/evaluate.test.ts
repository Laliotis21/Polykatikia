import { describe, it, expect } from "vitest";
import {
  DEFAULT_ANOMALY_MARGIN_BPS,
  evaluateExpenseAnomaly,
} from "./evaluate";
import { trailingAverageCents } from "./trailingAverage";

describe("trailingAverageCents", () => {
  it("computes integer mean", () => {
    expect(trailingAverageCents([10000, 10000, 10000])).toBe(10000);
    expect(trailingAverageCents([10000, 11000, 9000])).toBe(10000);
  });

  it("truncates toward zero", () => {
    expect(trailingAverageCents([100, 101, 102])).toBe(101);
  });
});

describe("evaluateExpenseAnomaly", () => {
  const prior = [10000, 10000, 10000];

  it("defaults marginBps to 3000", () => {
    const r = evaluateExpenseAnomaly({
      amountCents: 14000,
      priorAmountCents: prior,
    });
    expect(r.marginBps).toBe(DEFAULT_ANOMALY_MARGIN_BPS);
    expect(r.isAnomaly).toBe(true);
  });

  it("flags when amountCents > avg + 30%", () => {
    // avg 10000; threshold 13000; 14000 > 13000
    const r = evaluateExpenseAnomaly({
      amountCents: 14000,
      priorAmountCents: prior,
      marginBps: 3000,
    });
    expect(r).toMatchObject({
      isAnomaly: true,
      avgCents: 10000,
      amountCents: 14000,
      marginBps: 3000,
    });
  });

  it("does not flag at boundary (strict >)", () => {
    // 13000 is not > 13000
    const r = evaluateExpenseAnomaly({
      amountCents: 13000,
      priorAmountCents: prior,
      marginBps: 3000,
    });
    expect(r.isAnomaly).toBe(false);
  });

  it("does not flag just under threshold", () => {
    const r = evaluateExpenseAnomaly({
      amountCents: 12999,
      priorAmountCents: prior,
      marginBps: 3000,
    });
    expect(r.isAnomaly).toBe(false);
  });

  it("skips when sampleCount < 3", () => {
    const r = evaluateExpenseAnomaly({
      amountCents: 99999,
      priorAmountCents: [10000, 10000],
      marginBps: 3000,
    });
    expect(r.isAnomaly).toBe(false);
    expect(r.reason).toBe("insufficient_history");
    expect(r.sampleCount).toBe(2);
  });

  it("rejects float amountCents", () => {
    expect(() =>
      evaluateExpenseAnomaly({
        amountCents: 12.5,
        priorAmountCents: prior,
      }),
    ).toThrow(/cents/i);
  });
});
