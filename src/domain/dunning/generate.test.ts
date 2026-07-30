import { describe, it, expect } from "vitest";
import { utcDayKey } from "./generate";

describe("utcDayKey", () => {
  it("formats UTC yyyy-mm-dd", () => {
    expect(utcDayKey(new Date("2026-07-30T15:00:00.000Z"))).toBe("2026-07-30");
  });
});

describe("dunning idempotency key shape", () => {
  it("matches dunning:{chargeId}:{day}", () => {
    const chargeId = "tx_abc";
    const day = "2026-07-30";
    expect(`dunning:${chargeId}:${day}`).toBe("dunning:tx_abc:2026-07-30");
  });
});
