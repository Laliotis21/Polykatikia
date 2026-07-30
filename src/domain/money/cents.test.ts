import { describe, it, expect } from "vitest";
import { assertCents, addCents, mulBps } from "./cents";

describe("assertCents", () => {
  it("accepts integers", () => {
    expect(assertCents(1250)).toBe(1250);
  });
  it("rejects floats", () => {
    expect(() => assertCents(12.5)).toThrow(/cents/i);
  });
  it("rejects non-finite", () => {
    expect(() => assertCents(NaN)).toThrow();
  });
});

describe("addCents", () => {
  it("sums without float", () => {
    expect(addCents(199, 1)).toBe(200);
  });
});

describe("mulBps", () => {
  it("applies basis points to cents", () => {
    // 10000 cents * 3000 bps = 30% → 3000
    expect(mulBps(10000, 3000)).toBe(3000);
  });
});
