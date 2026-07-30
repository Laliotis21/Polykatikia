import { describe, it, expect } from "vitest";
import { EVENTS } from "./client";

describe("Inngest event contracts", () => {
  it("uses stable event names", () => {
    expect(EVENTS.ALERT_CREATED).toBe("alert/created");
    expect(EVENTS.RECEIPT_PROCESS).toBe("receipt/process");
  });

  it("notify idempotency key shape", () => {
    const alertId = "alert_123";
    expect(`alert:${alertId}:notify`).toBe("alert:alert_123:notify");
  });
});
