import { describe, expect, it } from "vitest";
import {
  allocateByWeights,
  athensLocalToUtc,
  buildKoinoxristaStatement,
  monthAthensRange,
  sharesForMethod,
} from "./allocate";
import { KoinoxristaError, MSG_ZERO_WEIGHTS } from "./errors";

describe("allocateByWeights", () => {
  it("splits evenly with equal weights", () => {
    expect(allocateByWeights(100, [1, 1, 1, 1])).toEqual([25, 25, 25, 25]);
  });

  it("assigns leftover cents by largest remainder (integer rem)", () => {
    // 100 cents * [1,1,1] → floors 33,33,33 + 1 leftover → highest rem, tie→index 0
    expect(allocateByWeights(100, [1, 1, 1])).toEqual([34, 33, 33]);
  });

  it("matches general χιλιοστά bps proportions", () => {
    const parts = allocateByWeights(10000, [2500, 2500, 3000, 2000]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10000);
    expect(parts).toEqual([2500, 2500, 3000, 2000]);
  });

  it("uses integer remainders for Hamilton ordering (no float drift)", () => {
    // amount*w % total must decide order; classic awkward floats: 10 across [1,1,1]
    expect(allocateByWeights(10, [1, 1, 1])).toEqual([4, 3, 3]);
    // 1 cent across unequal weights — remainder goes to larger weight
    expect(allocateByWeights(1, [2, 1])).toEqual([1, 0]);
    // Another uneven split that float division can mis-order near ties
    const parts = allocateByWeights(100, [1, 2, 3]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
    expect(parts).toEqual([17, 33, 50]);
  });

  it("rejects all-zero weights when amount > 0 with typed 400 error", () => {
    expect(() => allocateByWeights(100, [0, 0])).toThrow(KoinoxristaError);
    try {
      allocateByWeights(100, [0, 0]);
    } catch (err) {
      expect(err).toBeInstanceOf(KoinoxristaError);
      expect((err as KoinoxristaError).status).toBe(400);
      expect((err as KoinoxristaError).message).toBe(MSG_ZERO_WEIGHTS);
    }
  });

  it("allows zero amount with zero weights", () => {
    expect(allocateByWeights(0, [0, 0])).toEqual([0, 0]);
  });
});

describe("sharesForMethod", () => {
  const apt = {
    id: "a",
    label: "Α1",
    shareBps: 2500,
    elevatorShareBps: 0,
    heatingShareBps: 3000,
  };

  it("returns the correct share column", () => {
    expect(sharesForMethod(apt, "GENERAL_SHARES", 4)).toBe(2500);
    expect(sharesForMethod(apt, "ELEVATOR_SHARES", 4)).toBe(0);
    expect(sharesForMethod(apt, "HEATING_SHARES", 4)).toBe(3000);
    expect(sharesForMethod(apt, "EQUAL", 4)).toBe(1);
    expect(sharesForMethod(apt, "MANUAL", 4)).toBe(0);
  });
});

describe("buildKoinoxristaStatement", () => {
  const apartments = [
    {
      id: "a1",
      label: "Α1",
      shareBps: 2500,
      elevatorShareBps: 1500,
      heatingShareBps: 2500,
    },
    {
      id: "a2",
      label: "Α2",
      shareBps: 2500,
      elevatorShareBps: 1500,
      heatingShareBps: 2500,
    },
    {
      id: "b1",
      label: "Β1",
      shareBps: 3000,
      elevatorShareBps: 3500,
      heatingShareBps: 3000,
    },
    {
      id: "b2",
      label: "Β2",
      shareBps: 2000,
      elevatorShareBps: 3500,
      heatingShareBps: 2000,
    },
  ];

  it("allocates cleaning by general shares and elevator by elevator shares", () => {
    const statement = buildKoinoxristaStatement({
      apartments,
      expenses: [
        {
          id: "e1",
          amountCents: 10000,
          categoryId: "cat-clean",
          allocationMethod: "GENERAL_SHARES",
          categoryName: "Καθαριότητα",
          categoryCode: "CLEANING",
        },
        {
          id: "e2",
          amountCents: 10000,
          categoryId: "cat-elev",
          allocationMethod: "ELEVATOR_SHARES",
          categoryName: "Ανελκυστήρας",
          categoryCode: "ELEVATOR",
        },
      ],
    });

    expect(statement.totalExpenseCents).toBe(20000);
    expect(statement.skippedManualCents).toBe(0);

    const a1 = statement.apartmentStatements.find((s) => s.apartmentId === "a1")!;
    expect(a1.totalCents).toBe(4000);

    const b1 = statement.apartmentStatements.find((s) => s.apartmentId === "b1")!;
    expect(b1.totalCents).toBe(6500);

    const sum = statement.apartmentStatements.reduce((a, s) => a + s.totalCents, 0);
    expect(sum).toBe(20000);
  });

  it("skips MANUAL and uncategorized expenses", () => {
    const statement = buildKoinoxristaStatement({
      apartments,
      expenses: [
        {
          id: "m1",
          amountCents: 500,
          categoryId: "cat-m",
          allocationMethod: "MANUAL",
          categoryName: "Ειδικό",
          categoryCode: "SPECIAL",
        },
        {
          id: "u1",
          amountCents: 300,
          categoryId: null,
          allocationMethod: "GENERAL_SHARES",
          categoryName: null,
          categoryCode: null,
        },
      ],
    });
    expect(statement.skippedManualCents).toBe(500);
    expect(statement.skippedUncategorizedCents).toBe(300);
    expect(statement.lines).toEqual([]);
  });

  it("surfaces zero-weight allocation as KoinoxristaError", () => {
    const zeroElevator = apartments.map((a) => ({
      ...a,
      elevatorShareBps: 0,
    }));
    expect(() =>
      buildKoinoxristaStatement({
        apartments: zeroElevator,
        expenses: [
          {
            id: "e1",
            amountCents: 5000,
            categoryId: "cat-elev",
            allocationMethod: "ELEVATOR_SHARES",
            categoryName: "Ανελκυστήρας",
            categoryCode: "ELEVATOR",
          },
        ],
      }),
    ).toThrow(KoinoxristaError);
  });
});

describe("monthAthensRange", () => {
  it("uses Europe/Athens midnight for July (EEST, UTC+3)", () => {
    const { from, to } = monthAthensRange(2026, 7);
    expect(from.toISOString()).toBe("2026-06-30T21:00:00.000Z");
    expect(to.toISOString()).toBe("2026-07-31T21:00:00.000Z");
  });

  it("uses Europe/Athens midnight for January (EET, UTC+2)", () => {
    const { from, to } = monthAthensRange(2026, 1);
    expect(from.toISOString()).toBe("2025-12-31T22:00:00.000Z");
    expect(to.toISOString()).toBe("2026-01-31T22:00:00.000Z");
  });

  it("includes late-evening Athens expense on last day of month", () => {
    const { from, to } = monthAthensRange(2026, 7);
    // 31 Jul 2026 23:30 Athens = 20:30 UTC — still inside July Athens month
    const late = athensLocalToUtc(2026, 7, 31, 23, 30, 0);
    expect(late.getTime()).toBeGreaterThanOrEqual(from.getTime());
    expect(late.getTime()).toBeLessThan(to.getTime());
  });
});
