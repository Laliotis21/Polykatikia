import { describe, it, expect } from "vitest";
import { isChargePaid } from "./pay";

describe("isChargePaid", () => {
  it("false when no payment", () => {
    expect(isChargePaid({ id: "c1", payment: null })).toBe(false);
  });
  it("true when payment present", () => {
    expect(isChargePaid({ id: "c1", payment: { id: "i1" } })).toBe(true);
  });
});
