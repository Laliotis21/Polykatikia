import { describe, it, expect } from "vitest";
import { auditPayloadShape } from "./write";

describe("auditPayloadShape", () => {
  it("returns undefined when before/after omitted", () => {
    expect(auditPayloadShape({})).toBeUndefined();
  });

  it("includes before and after", () => {
    expect(
      auditPayloadShape({
        before: { status: "OPEN" },
        after: { status: "ACKED" },
      }),
    ).toEqual({
      before: { status: "OPEN" },
      after: { status: "ACKED" },
    });
  });

  it("includes only before when after omitted", () => {
    expect(auditPayloadShape({ before: { amountCents: 100 } })).toEqual({
      before: { amountCents: 100 },
    });
  });

  it("includes only after when before omitted", () => {
    expect(auditPayloadShape({ after: { amountCents: 200 } })).toEqual({
      after: { amountCents: 200 },
    });
  });
});
